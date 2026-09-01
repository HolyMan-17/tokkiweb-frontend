import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import OrderDetailPage from './OrderDetailPage';
import { fetchOrderDetail, approveOrder, cancelOrder, NotFoundError } from '../../../api/orders';
import { fetchAllProducts } from '../../../api/products';
import { AdminAuthContext } from '../../../components/auth/AdminAuthContext';
import type { OrderDetail } from '../../../types';

vi.mock('../../../api/orders', async importOriginal => ({
  ...(await importOriginal<typeof import('../../../api/orders')>()),
  fetchOrderDetail: vi.fn(),
  approveOrder: vi.fn(),
  cancelOrder: vi.fn(),
}));

vi.mock('../../../api/products', () => ({
  fetchAllProducts: vi.fn().mockResolvedValue([]),
}));

const mockFetchOrderDetail = vi.mocked(fetchOrderDetail);
const mockFetchAllProducts = vi.mocked(fetchAllProducts);
const mockApproveOrder = vi.mocked(approveOrder);
const mockCancelOrder = vi.mocked(cancelOrder);

const ORDER: OrderDetail = {
  order_id: 42,
  status: 'pending',
  client: {
    name: 'María',
    last_name: 'González',
    cedula: 'V-26345678',
    tlf_num: '+584121234567',
  },
  delivery_type: 'envio_nacional',
  payment_method: 'pago_movil',
  total_amount: '18.50',
  created_at: '2026-08-13T14:30:00.000Z',
  items: [
    {
      product_name: 'Bálsamo de Fresa',
      product_qty: 2,
      product_price: '3.50',
      product_total: '7.00',
    },
  ],
};

function renderPage() {
  return render(
    <AdminAuthContext.Provider
      value={{
        configured: true,
        isLoaded: true,
        isSignedIn: true,
        role: 'owner',
        getAdminToken: async () => 'clerk-token',
      }}
    >
      <MemoryRouter initialEntries={['/pedidos/42']}>
        <Routes>
          <Route path="/pedidos/:id" element={<OrderDetailPage />} />
        </Routes>
      </MemoryRouter>
    </AdminAuthContext.Provider>,
  );
}

beforeEach(() => {
  mockFetchOrderDetail.mockReset();
  mockFetchAllProducts.mockReset();
  mockApproveOrder.mockReset();
  mockCancelOrder.mockReset();
  mockFetchOrderDetail.mockResolvedValue(ORDER);
  mockFetchAllProducts.mockResolvedValue([]);
});

describe('OrderDetailPage — datos completos del pedido', () => {
  it('muestra la cédula del cliente', async () => {
    renderPage();
    expect(await screen.findByText('V-26345678')).toBeInTheDocument();
  });

  it('muestra el tipo de entrega con etiqueta legible', async () => {
    renderPage();
    expect(await screen.findByText('Envío Nacional (Zoom)')).toBeInTheDocument();
    expect(screen.getByText('Entrega')).toBeInTheDocument();
  });

  it('muestra el método de pago con etiqueta legible', async () => {
    renderPage();
    expect(await screen.findByText('Pago Móvil')).toBeInTheDocument();
    expect(screen.getByText('Pago')).toBeInTheDocument();
  });

  it('resuelve alias de entrega y pago si el backend usa nombres alternativos', async () => {
    mockFetchOrderDetail.mockResolvedValue({
      ...ORDER,
      delivery_type: undefined as unknown as string,
      payment_method: undefined as unknown as string,
      ...({ delivery_method: 'delivery', payment_type: 'zelle' } as unknown as Partial<OrderDetail>),
    } as OrderDetail);
    renderPage();
    expect(await screen.findByText('Delivery')).toBeInTheDocument();
    expect(screen.getByText('Zelle')).toBeInTheDocument();
  });

  it('muestra "No especificado" cuando el tipo de entrega o método de pago están ausentes', async () => {
    mockFetchOrderDetail.mockResolvedValue({
      ...ORDER,
      delivery_type: '' as unknown as string,
      payment_method: '' as unknown as string,
    });
    renderPage();
    const fallbacks = await screen.findAllByText('No especificado');
    expect(fallbacks).toHaveLength(2);
  });

  it('muestra los datos básicos del pedido', async () => {
    renderPage();
    const headings = await screen.findAllByText(/Pedido #42/);
    expect(headings.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('María González')).toBeInTheDocument();
    expect(screen.getByText('+584121234567')).toBeInTheDocument();
    expect(screen.getByText('$18.50')).toBeInTheDocument();
  });

  it('oculta la fila de cédula cuando el pedido no la tiene', async () => {
    mockFetchOrderDetail.mockResolvedValue({
      ...ORDER,
      client: { name: 'Luis', last_name: 'Pérez', tlf_num: '+584141112222' },
    });
    renderPage();
    expect(await screen.findByText('Luis Pérez')).toBeInTheDocument();
    expect(screen.queryByText(/^V-\d|^E-\d|^J-\d/)).not.toBeInTheDocument();
  });

  it('muestra el enlace directo a WhatsApp para contactar al cliente', async () => {
    renderPage();
    const waLink = await screen.findByRole('link', { name: /contactar por whatsapp/i });
    expect(waLink).toBeInTheDocument();
    expect(waLink).toHaveAttribute(
      'href',
      'https://wa.me/584121234567?text=Hola%20Mar%C3%ADa%2C%20te%20escribimos%20de%20Tokki%20Shop%20sobre%20tu%20pedido%20%2342.',
    );
  });

  it('muestra la imagen del producto comprado cuando tiene product_image_url', async () => {
    mockFetchOrderDetail.mockResolvedValue({
      ...ORDER,
      items: [
        {
          product_name: 'Lip Tint Coreano',
          product_qty: 1,
          product_price: '5.00',
          product_total: '5.00',
          product_image_url: 'https://example.com/liptint.png',
        },
      ],
    });
    renderPage();
    const img = await screen.findByRole('img', { name: 'Lip Tint Coreano' });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/liptint.png');
  });

  it('muestra el placeholder con la inicial cuando el producto no tiene imagen', async () => {
    mockFetchOrderDetail.mockResolvedValue({
      ...ORDER,
      items: [
        {
          product_name: 'Bálsamo de Fresa',
          product_qty: 2,
          product_price: '3.50',
          product_total: '7.00',
          product_image_url: null,
        },
      ],
    });
    renderPage();
    expect(await screen.findByText('Bálsamo de Fresa')).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'Bálsamo de Fresa' })).not.toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
  });

  it('resuelve image_url como alias si el backend envía esa propiedad', async () => {
    mockFetchOrderDetail.mockResolvedValue({
      ...ORDER,
      items: [
        {
          product_name: 'Parche de Ojos',
          product_qty: 3,
          product_price: '2.00',
          product_total: '6.00',
          image_url: 'https://example.com/patch.jpg',
        },
      ],
    });
    renderPage();
    const img = await screen.findByRole('img', { name: 'Parche de Ojos' });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/patch.jpg');
  });

  it('resuelve la imagen buscando el producto en el catálogo cuando el pedido no incluye la foto', async () => {
    mockFetchAllProducts.mockResolvedValue([
      {
        product_id: 99,
        product_name: 'Gloss Kawaii',
        product_price: '4.50',
        product_description: 'Brillo labial coreano',
        qty_available: 5,
        in_stock: true,
        category: 'Maquillaje',
        product_image_url: 'https://example.com/gloss.png',
      },
    ]);
    mockFetchOrderDetail.mockResolvedValue({
      ...ORDER,
      items: [
        {
          product_name: 'Gloss Kawaii',
          product_qty: 1,
          product_price: '4.50',
          product_total: '4.50',
        },
      ],
    });
    renderPage();
    const img = await screen.findByRole('img', { name: 'Gloss Kawaii' });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/gloss.png');
  });

  it('muestra la vista de no encontrado cuando la API responde 404', async () => {
    mockFetchOrderDetail.mockRejectedValue(new NotFoundError("Order doesn't exist."));
    renderPage();
    expect(await screen.findByText('Pedido no encontrado')).toBeInTheDocument();
  });
});

describe('OrderDetailPage — aprobar / cancelar vía API', () => {
  it('cancela el pedido con el token de admin y refresca el detalle', async () => {
    mockCancelOrder.mockResolvedValue({ ok: true, data: undefined, status: 200 });
    const user = userEvent.setup();
    renderPage();
    await screen.findAllByText(/Pedido #42/);

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    await user.click(await screen.findByRole('button', { name: 'Sí, cancelar' }));

    expect(mockCancelOrder).toHaveBeenCalledTimes(1);
    const [orderId, auth] = mockCancelOrder.mock.calls[0];
    expect(orderId).toBe(42);
    expect(await auth?.getToken?.()).toBe('clerk-token');
    // El detalle se vuelve a consultar tras la acción.
    expect(mockFetchOrderDetail).toHaveBeenCalledTimes(2);
  });

  it('aprueba el pedido y actualiza el badge tras refrescar', async () => {
    mockFetchOrderDetail
      .mockResolvedValueOnce(ORDER)
      .mockResolvedValueOnce({ ...ORDER, status: 'approved' });
    mockApproveOrder.mockResolvedValue({
      ok: true,
      data: { order_id: 42, status: 'approved' },
      status: 200,
    });
    const user = userEvent.setup();
    renderPage();
    await screen.findAllByText(/Pedido #42/);

    await user.click(screen.getByRole('button', { name: 'Aprobar' }));
    await user.click(await screen.findByRole('button', { name: 'Sí, aprobar' }));

    expect(mockApproveOrder).toHaveBeenCalledTimes(1);
    expect(mockApproveOrder.mock.calls[0][0]).toBe(42);
    expect(await screen.findByText('Aprobado')).toBeInTheDocument();
  });

  it('avisa con el mensaje del backend cuando el pedido ya fue procesado y refresca', async () => {
    mockApproveOrder.mockResolvedValue({
      ok: false,
      message: 'Order has already been processed.',
      status: 400,
    });
    const user = userEvent.setup();
    renderPage();
    await screen.findAllByText(/Pedido #42/);

    await user.click(screen.getByRole('button', { name: 'Aprobar' }));
    await user.click(await screen.findByRole('button', { name: 'Sí, aprobar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /Order has already been processed/,
    );
    expect(mockFetchOrderDetail).toHaveBeenCalledTimes(2);
    // El badge sigue Pendiente (el detalle refrescado manda el estado real).
    expect(screen.getByText('Pendiente')).toBeInTheDocument();
  });
});
