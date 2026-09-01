import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import AdminCreateOrderPage from './AdminCreateOrderPage';
import { fetchAllProducts } from '../../../../api/products';
import { createOrder, approveOrder } from '../../../../api/orders';
import { AdminAuthContext } from '../../../../components/auth/AdminAuthContext';
import { ADMIN_ROUTES } from '../../../../lib/routes';
import type { Product, CreatedOrder } from '../../../../types';

vi.mock('../../../../api/products', () => ({
  fetchAllProducts: vi.fn(),
}));

vi.mock('../../../../api/orders', () => ({
  createOrder: vi.fn(),
  approveOrder: vi.fn(),
}));

const mockFetchAllProducts = vi.mocked(fetchAllProducts);
const mockCreateOrder = vi.mocked(createOrder);
const mockApproveOrder = vi.mocked(approveOrder);

const MOCK_PRODUCTS: Product[] = [
  {
    product_id: 101,
    product_name: 'Gloss Kawaii Fresa',
    product_price: '5.50',
    product_description: 'Brillo labial aroma a fresa con empaque de conejito',
    category: 'Maquillaje',
    qty_available: 10,
    in_stock: true,
    product_image_url: '/images/gloss.jpg',
  },
  {
    product_id: 102,
    product_name: 'Mascarilla Té Verde',
    product_price: '3.00',
    product_description: 'Mascarilla hidratante de té verde',
    category: 'Skincare',
    qty_available: 5,
    in_stock: true,
    product_image_url: null,
  },
  {
    product_id: 103,
    product_name: 'Peluche Conejo Pastel',
    product_price: '12.00',
    product_description: 'Peluche suave coleccionable',
    category: 'Peluches',
    qty_available: 0,
    in_stock: false,
  },
];

const MOCK_CREATED_ORDER: CreatedOrder = {
  order_id: 88,
  order_token: 'uuid-tokki-88',
  status: 'pending',
  delivery_type: 'retiro_tienda',
  payment_method: 'cash',
  total_amount: '11.00',
  items: [
    {
      id: 101,
      name: 'Gloss Kawaii Fresa',
      ordered_qty: 2,
      price: '5.50',
    },
  ],
};

function renderCreateOrderPage() {
  return render(
    <AdminAuthContext.Provider
      value={{
        configured: true,
        isLoaded: true,
        isSignedIn: true,
        role: 'owner',
        getAdminToken: async () => 'clerk-admin-token',
      }}
    >
      <MemoryRouter initialEntries={[ADMIN_ROUTES.createOrder]}>
        <Routes>
          <Route path={ADMIN_ROUTES.createOrder} element={<AdminCreateOrderPage />} />
          <Route path={ADMIN_ROUTES.orders} element={<div data-testid="orders-list-page">Pedidos</div>} />
          <Route path={ADMIN_ROUTES.orderDetail(':id' as unknown as number)} element={<div data-testid="order-detail-page">Detalle Pedido</div>} />
        </Routes>
      </MemoryRouter>
    </AdminAuthContext.Provider>,
  );
}

describe('AdminCreateOrderPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchAllProducts.mockResolvedValue(MOCK_PRODUCTS);
    mockCreateOrder.mockResolvedValue({
      ok: true,
      data: MOCK_CREATED_ORDER,
    });
    mockApproveOrder.mockResolvedValue({
      ok: true,
      data: { order_id: 88, status: 'approved' },
    });
  });

  it('carga y renderiza la lista de productos y la cabecera', async () => {
    renderCreateOrderPage();

    expect(await screen.findByText('Gloss Kawaii Fresa')).toBeInTheDocument();
    expect(screen.getByText('Mascarilla Té Verde')).toBeInTheDocument();
    expect(screen.getByText('Peluche Conejo Pastel')).toBeInTheDocument();

    const backLink = screen.getByRole('link', { name: /volver a pedidos/i });
    expect(backLink).toBeInTheDocument();
    expect(backLink).toHaveAttribute('href', ADMIN_ROUTES.orders);
  });

  it('permite auto-llenar los datos de cliente con "⚡ Cliente en Mostrador"', async () => {
    const user = userEvent.setup();
    renderCreateOrderPage();

    await screen.findByText('Gloss Kawaii Fresa');

    const quickFillBtn = screen.getByRole('button', { name: /cliente en mostrador/i });
    await user.click(quickFillBtn);

    expect(screen.getByLabelText(/nombre/i)).toHaveValue('Cliente');
    expect(screen.getByLabelText(/apellido/i)).toHaveValue('Tienda');
    expect(screen.getByLabelText(/cédula/i)).toHaveValue('V-00000000');
    expect(screen.getByLabelText(/teléfono/i)).toHaveValue('+584120000000');
  });

  it('permite ingresar manualmente los datos del cliente y cambiar entrega/pago', async () => {
    const user = userEvent.setup();
    renderCreateOrderPage();

    await screen.findByText('Gloss Kawaii Fresa');

    const nameInput = screen.getByLabelText(/nombre/i);
    const lastNameInput = screen.getByLabelText(/apellido/i);
    const cedulaInput = screen.getByLabelText(/cédula/i);
    const phoneInput = screen.getByLabelText(/teléfono/i);
    const deliverySelect = screen.getByLabelText(/entrega/i);
    const paymentSelect = screen.getByLabelText(/pago/i);

    await user.type(nameInput, 'Valentina');
    await user.type(lastNameInput, 'Rojas');
    await user.type(cedulaInput, 'V-28123456');
    await user.type(phoneInput, '+584141234567');
    await user.selectOptions(deliverySelect, 'delivery');
    await user.selectOptions(paymentSelect, 'pago_movil');

    expect(nameInput).toHaveValue('Valentina');
    expect(lastNameInput).toHaveValue('Rojas');
    expect(cedulaInput).toHaveValue('V-28123456');
    expect(phoneInput).toHaveValue('+584141234567');
    expect(deliverySelect).toHaveValue('delivery');
    expect(paymentSelect).toHaveValue('pago_movil');
  });

  it('permite agregar productos, cambiar cantidad y calcular el total', async () => {
    const user = userEvent.setup();
    renderCreateOrderPage();

    await screen.findByText('Gloss Kawaii Fresa');

    // Botón de submit debe estar deshabilitado inicialmente (sin productos)
    const submitBtn = screen.getByRole('button', { name: /registrar pedido/i });
    expect(submitBtn).toBeDisabled();

    // Agregar "Gloss Kawaii Fresa" ($5.50)
    const addGlossBtn = screen.getByRole('button', { name: /agregar gloss kawaii fresa/i });
    await user.click(addGlossBtn);

    // Verificar que aparece en el resumen
    const selectedItem = screen.getByTestId('selected-item-101');
    expect(selectedItem).toBeInTheDocument();
    expect(within(selectedItem).getByText('Gloss Kawaii Fresa')).toBeInTheDocument();

    // Incrementar cantidad a 2
    const incBtn = within(selectedItem).getByRole('button', { name: /aumentar cantidad de gloss kawaii fresa/i });
    await user.click(incBtn);

    // Total debe ser $11.00
    expect(screen.getAllByText('$11.00').length).toBeGreaterThanOrEqual(1);
    expect(submitBtn).toHaveTextContent(/registrar pedido \(\$11\.00\)/i);

    // Agregar "Mascarilla Té Verde" ($3.00)
    const addMaskBtn = screen.getByRole('button', { name: /agregar mascarilla té verde/i });
    await user.click(addMaskBtn);

    // Total debe ser $14.00 ($11.00 + $3.00)
    expect(screen.getByText('$14.00')).toBeInTheDocument();
    expect(submitBtn).toHaveTextContent(/registrar pedido \(\$14\.00\)/i);

    // Eliminar Mascarilla
    const selectedMaskItem = screen.getByTestId('selected-item-102');
    const removeMaskBtn = within(selectedMaskItem).getByRole('button', { name: /eliminar mascarilla té verde/i });
    await user.click(removeMaskBtn);

    // Total vuelve a $11.00
    expect(screen.getAllByText('$11.00').length).toBeGreaterThanOrEqual(1);
    expect(submitBtn).toHaveTextContent(/registrar pedido \(\$11\.00\)/i);
  });

  it('crea el pedido y lo aprueba inmediatamente por defecto, luego navega al detalle', async () => {
    const user = userEvent.setup();
    renderCreateOrderPage();

    await screen.findByText('Gloss Kawaii Fresa');

    // Llenar datos de cliente rápido
    const quickFillBtn = screen.getByRole('button', { name: /cliente en mostrador/i });
    await user.click(quickFillBtn);

    // Agregar producto
    const addGlossBtn = screen.getByRole('button', { name: /agregar gloss kawaii fresa/i });
    await user.click(addGlossBtn);
    const selectedItem = screen.getByTestId('selected-item-101');
    const incBtn = within(selectedItem).getByRole('button', { name: /aumentar cantidad de gloss kawaii fresa/i });
    await user.click(incBtn);

    // Verificar checkbox de auto-aprobar activo por defecto
    const autoApproveCheckbox = screen.getByLabelText(/marcar como aprobado inmediatamente/i);
    expect(autoApproveCheckbox).toBeChecked();

    const submitBtn = screen.getByRole('button', { name: /registrar pedido \(\$11\.00\)/i });
    expect(submitBtn).toBeEnabled();

    await user.click(submitBtn);

    // Verificar llamada a createOrder
    expect(mockCreateOrder).toHaveBeenCalledWith({
      client_info: {
        name: 'Cliente',
        last_name: 'Tienda',
        cedula: 'V-00000000',
        tlf_num: '+584120000000',
      },
      delivery_type: 'retiro_tienda',
      payment_method: 'cash',
      items: [
        {
          product_id: 101,
          product_qty: 2,
        },
      ],
    });

    // Verificar llamada a approveOrder
    await waitFor(() => {
      expect(mockApproveOrder).toHaveBeenCalledWith(
        88,
        expect.objectContaining({ getToken: expect.any(Function) }),
      );
    });

    // Verificar navegación al detalle del pedido
    expect(await screen.findByTestId('order-detail-page')).toBeInTheDocument();
  });

  it('crea el pedido sin aprobar si el checkbox está desmarcado', async () => {
    const user = userEvent.setup();
    renderCreateOrderPage();

    await screen.findByText('Gloss Kawaii Fresa');

    const quickFillBtn = screen.getByRole('button', { name: /cliente en mostrador/i });
    await user.click(quickFillBtn);

    const addGlossBtn = screen.getByRole('button', { name: /agregar gloss kawaii fresa/i });
    await user.click(addGlossBtn);

    const autoApproveCheckbox = screen.getByLabelText(/marcar como aprobado inmediatamente/i);
    await user.click(autoApproveCheckbox);
    expect(autoApproveCheckbox).not.toBeChecked();

    const submitBtn = screen.getByRole('button', { name: /registrar pedido/i });
    await user.click(submitBtn);

    expect(mockCreateOrder).toHaveBeenCalled();
    expect(mockApproveOrder).not.toHaveBeenCalled();

    expect(await screen.findByTestId('order-detail-page')).toBeInTheDocument();
  });

  it('muestra mensaje de error si falla la creación del pedido', async () => {
    const user = userEvent.setup();
    mockCreateOrder.mockResolvedValue({
      ok: false,
      message: 'Stock insuficiente para el producto Gloss Kawaii Fresa',
    });

    renderCreateOrderPage();

    await screen.findByText('Gloss Kawaii Fresa');

    const quickFillBtn = screen.getByRole('button', { name: /cliente en mostrador/i });
    await user.click(quickFillBtn);

    const addGlossBtn = screen.getByRole('button', { name: /agregar gloss kawaii fresa/i });
    await user.click(addGlossBtn);

    const submitBtn = screen.getByRole('button', { name: /registrar pedido/i });
    await user.click(submitBtn);

    expect(await screen.findByText(/Stock insuficiente para el producto Gloss Kawaii Fresa/i)).toBeInTheDocument();
    expect(screen.queryByTestId('order-detail-page')).not.toBeInTheDocument();
  });

  it('valida campos requeridos y formatos inválidos de cédula y teléfono', async () => {
    const user = userEvent.setup();
    renderCreateOrderPage();

    await screen.findByText('Gloss Kawaii Fresa');

    const nameInput = screen.getByLabelText(/nombre/i);
    const lastNameInput = screen.getByLabelText(/apellido/i);
    const cedulaInput = screen.getByLabelText(/cédula/i);
    const phoneInput = screen.getByLabelText(/teléfono/i);

    // Escribir cédula y teléfono inválidos
    await user.type(nameInput, 'A');
    await user.type(lastNameInput, 'B');
    await user.type(cedulaInput, 'V-123');
    await user.type(phoneInput, '12');

    expect(await screen.findByText(/El nombre debe tener al menos 2 caracteres/i)).toBeInTheDocument();
    expect(await screen.findByText(/El apellido debe tener al menos 2 caracteres/i)).toBeInTheDocument();
    expect(await screen.findByText(/Formato de cédula inválido/i)).toBeInTheDocument();
    expect(await screen.findByText(/Ingresa un número de teléfono válido/i)).toBeInTheDocument();

    // Al pulsar Cliente en Mostrador se resetean todos los errores
    const quickFillBtn = screen.getByRole('button', { name: /cliente en mostrador/i });
    await user.click(quickFillBtn);

    expect(screen.queryByText(/El nombre debe tener al menos 2 caracteres/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/La cédula debe contener entre 6 y 9 dígitos/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Ingresa un número de teléfono válido/i)).not.toBeInTheDocument();
  });
});
