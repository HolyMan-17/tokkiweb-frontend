import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import OrderDetailPage from './OrderDetailPage';
import { fetchOrderDetail, approveOrder, cancelOrder, NotFoundError } from '../../../api/orders';
import { AdminAuthContext } from '../../../components/auth/AdminAuthContext';
import type { OrderDetail } from '../../../types';

vi.mock('../../../api/orders', async importOriginal => ({
  ...(await importOriginal<typeof import('../../../api/orders')>()),
  fetchOrderDetail: vi.fn(),
  approveOrder: vi.fn(),
  cancelOrder: vi.fn(),
}));

const mockFetchOrderDetail = vi.mocked(fetchOrderDetail);
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
  mockApproveOrder.mockReset();
  mockCancelOrder.mockReset();
  mockFetchOrderDetail.mockResolvedValue(ORDER);
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
