import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import CheckoutPage from './CheckoutPage';
import { CartProvider } from '../../context/CartContext';
import { fetchAllProducts } from '../../api/products';
import { createOrder } from '../../api/orders';
import type { Product } from '../../types';

vi.mock('../../api/products', () => ({
  fetchAllProducts: vi.fn(),
}));

vi.mock('../../api/orders', () => ({
  createOrder: vi.fn(),
}));

const mockFetchAllProducts = vi.mocked(fetchAllProducts);
const mockCreateOrder = vi.mocked(createOrder);

const mockTestProduct: Product = {
  product_id: 1,
  product_name: 'Bálsamo de Fresa',
  product_price: '3.50',
  product_description: 'Bálsamo labial hidratante.',
  qty_available: 45,
  in_stock: true,
  category: 'Maquillaje',
};

function seedCart(quantity: number) {
  window.localStorage.setItem(
    'tokki_cart_v1',
    JSON.stringify([{ product: mockTestProduct, quantity }]),
  );
}

function renderPage() {
  return render(
    <MemoryRouter>
      <CartProvider>
        <Routes>
          <Route path="/" element={<CheckoutPage />} />
          {/* Sonda de navegación: el checkout redirige aquí tras crear el pedido. */}
          <Route path="/confirmation/:orderId" element={<div>PEDIDO CONFIRMADO</div>} />
        </Routes>
      </CartProvider>
    </MemoryRouter>,
  );
}

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Nombre'), 'María');
  await user.type(screen.getByLabelText('Apellido'), 'González');
  await user.type(screen.getByLabelText('Teléfono'), '4121234567');
  await user.type(screen.getByLabelText('Cédula'), '26345678');
}

beforeEach(() => {
  window.localStorage.clear();
  seedCart(1);
  mockFetchAllProducts.mockReset();
  mockCreateOrder.mockReset();
  mockFetchAllProducts.mockResolvedValue([mockTestProduct]);
  mockCreateOrder.mockResolvedValue({
    ok: true,
    data: {
      order_id: 7,
      order_token: '550e8400-e29b-41d4-a716-446655440000',
      delivery_type: 'envio_nacional',
      payment_method: 'pago_movil',
      total_amount: '3.50',
      items: [{ id: 1, name: mockTestProduct.product_name, ordered_qty: 1, price: '3.50' }],
    },
  });
});

describe('CheckoutPage — campo Cédula', () => {
  it('muestra el campo cédula con un selector V, E, J, G (por defecto V)', () => {
    renderPage();
    const select = screen.getByLabelText(/tipo de cédula/i) as HTMLSelectElement;
    const options = Array.from(select.options).map(o => o.value);
    expect(options).toEqual(['V', 'E', 'J', 'G']);
    expect(select.value).toBe('V');
    expect(screen.getByLabelText('Cédula')).toBeInTheDocument();
  });

  it('muestra la vista previa con una cédula válida', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.clear(screen.getByLabelText('Cédula'));
    await user.type(screen.getByLabelText('Cédula'), '26345678');
    expect(screen.getByText('V-26345678')).toBeInTheDocument();
  });

  it('bloquea el envío con una cédula demasiado corta (<6 dígitos) y muestra feedback inmediato', async () => {
    const user = userEvent.setup();
    renderPage();
    await fillValidForm(user);
    await user.clear(screen.getByLabelText('Cédula'));
    await user.type(screen.getByLabelText('Cédula'), '12345'); // 5 dígitos
    await user.click(screen.getByRole('button', { name: /confirmar pedido/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/La cédula de identidad es requerida \(ej\. V-12345678\)/i);
    // El pedido no se creó: seguimos en el checkout.
    expect(mockCreateOrder).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /confirmar pedido/i })).toBeInTheDocument();
  });

  it('bloquea el envío si la cédula está vacía y da feedback', async () => {
    const user = userEvent.setup();
    renderPage();
    await fillValidForm(user);
    await user.clear(screen.getByLabelText('Cédula'));
    await user.click(screen.getByRole('button', { name: /confirmar pedido/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/La cédula de identidad es requerida \(ej\. V-12345678\)/i);
    expect(mockCreateOrder).not.toHaveBeenCalled();
  });

  it('solo acepta hasta 9 dígitos en el campo cédula', async () => {
    const user = userEvent.setup();
    renderPage();
    const input = screen.getByLabelText('Cédula') as HTMLInputElement;
    await user.type(input, 'abc12x345y6789z');
    expect(input.value).toBe('123456789');
    expect(input.value).toMatch(/^\d*$/);
  });

  it('envía la cédula con formato canónico (ej. E-1234567)', async () => {
    const user = userEvent.setup();
    renderPage();
    await fillValidForm(user);
    const select = screen.getByLabelText(/tipo de cédula/i);
    await user.selectOptions(select, 'E');
    await user.clear(screen.getByLabelText('Cédula'));
    await user.type(screen.getByLabelText('Cédula'), '1234567');
    await user.click(screen.getByRole('button', { name: /confirmar pedido/i }));

    expect(await screen.findByText('PEDIDO CONFIRMADO')).toBeInTheDocument();
    expect(mockCreateOrder).toHaveBeenCalledTimes(1);
    const payload = mockCreateOrder.mock.calls[0][0];
    expect(payload.client_info.cedula).toBe('E-1234567');
  });

  it('muestra el hint de WhatsApp en el campo de teléfono', () => {
    renderPage();
    expect(screen.getByText(/Número para coordinar entrega y pago vía WhatsApp/i)).toBeInTheDocument();
  });
});

describe('CheckoutPage — reconciliación de stock antes de pagar', () => {
  const p1 = mockTestProduct;

  function seedCartFor(quantity: number) {
    window.localStorage.setItem(
      'tokki_cart_v1',
      JSON.stringify([{ product: p1, quantity }]),
    );
  }

  it('bloquea el envío y muestra el aviso cuando el stock bajó', async () => {
    seedCartFor(60);
    mockFetchAllProducts.mockResolvedValue([{ ...p1, qty_available: 10 }]);
    const user = userEvent.setup();
    renderPage();
    await fillValidForm(user);

    await user.click(screen.getByRole('button', { name: /confirmar pedido/i }));

    expect(await screen.findByText(/ahora tiene solo 10 disponibles/i)).toBeInTheDocument();
    expect(screen.getByText(/Ajustamos tu carrito:/i)).toBeInTheDocument();
    // El pedido no se creó: el usuario debe revisar los ajustes primero.
    expect(mockCreateOrder).not.toHaveBeenCalled();
  });

  it('tras confirmar los ajustes permite completar el pedido con las cantidades corregidas', async () => {
    seedCartFor(60);
    mockFetchAllProducts.mockResolvedValue([{ ...p1, qty_available: 10 }]);
    const user = userEvent.setup();
    renderPage();
    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: /confirmar pedido/i }));
    await screen.findByText(/ahora tiene solo 10 disponibles/i);

    await user.click(screen.getByRole('button', { name: /entendido/i }));
    await user.click(screen.getByRole('button', { name: /confirmar pedido/i }));

    expect(await screen.findByText('PEDIDO CONFIRMADO')).toBeInTheDocument();
    expect(mockCreateOrder).toHaveBeenCalledTimes(1);
    const payload = mockCreateOrder.mock.calls[0][0];
    expect(payload.items[0]).toEqual({ product_id: p1.product_id, product_qty: 10 });
    // El carrito quedó vacío tras confirmar la compra.
    expect(JSON.parse(window.localStorage.getItem('tokki_cart_v1') ?? '[]')).toEqual([]);
  });

  it('no bloquea el envío cuando el stock sigue vigente y manda E.164 sin country_code', async () => {
    seedCartFor(2);
    const user = userEvent.setup();
    renderPage();
    await fillValidForm(user);

    await user.click(screen.getByRole('button', { name: /confirmar pedido/i }));

    expect(await screen.findByText('PEDIDO CONFIRMADO')).toBeInTheDocument();
    expect(mockCreateOrder).toHaveBeenCalledTimes(1);
    const payload = mockCreateOrder.mock.calls[0][0];
    expect(payload.items).toEqual([{ product_id: p1.product_id, product_qty: 2 }]);
    expect(payload.client_info.tlf_num).toBe('+584121234567');
    expect(payload.client_info.country_code).toBeUndefined();
    expect(payload.client_info.cedula).toBe('V-26345678');
    expect(payload.delivery_type).toBe('envio_nacional');
    expect(payload.payment_method).toBe('pago_movil');
    expect(screen.queryByText(/Ajustamos tu carrito/i)).not.toBeInTheDocument();
  });

  it('muestra el mensaje del backend en el toast cuando el pedido es rechazado', async () => {
    mockCreateOrder.mockResolvedValue({
      ok: false,
      message: 'Requested quantity is not available in the stock.',
    });
    const user = userEvent.setup();
    renderPage();
    await fillValidForm(user);

    await user.click(screen.getByRole('button', { name: /confirmar pedido/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /Requested quantity is not available in the stock/,
    );
    // isSubmitting se reinicia: el botón vuelve a estar disponible.
    expect(screen.getByRole('button', { name: /confirmar pedido/i })).toBeEnabled();
    expect(screen.queryByText('PEDIDO CONFIRMADO')).not.toBeInTheDocument();
  });
});
