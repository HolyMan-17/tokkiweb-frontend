import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import OrderConfirmationPage from './OrderConfirmationPage';
import { CartProvider } from '../../context/CartContext';
import { fetchOrderDetail, NotFoundError } from '../../api/orders';
import type { OrderDetail } from '../../types';

vi.mock('../../api/orders', async importOriginal => ({
  ...(await importOriginal<typeof import('../../api/orders')>()),
  fetchOrderDetail: vi.fn(),
}));

const mockFetchOrderDetail = vi.mocked(fetchOrderDetail);

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

function renderAt(path: string, state?: unknown) {
  return render(
    <MemoryRouter
      initialEntries={[{ pathname: path, state }]}
    >
      <CartProvider>
        <Routes>
          <Route path="/confirmation/:orderId" element={<OrderConfirmationPage />} />
        </Routes>
      </CartProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mockFetchOrderDetail.mockReset();
});

describe('OrderConfirmationPage — confirmación por id', () => {
  it('renderiza el pedido y el badge real desde la API sin router state (refresh)', async () => {
    mockFetchOrderDetail.mockResolvedValue(ORDER);
    renderAt('/confirmation/42');

    expect(await screen.findByText(/Pedido #42/)).toBeInTheDocument();
    expect(await screen.findByText('Pendiente')).toBeInTheDocument();
    expect(screen.getByText(/Bálsamo de Fresa/)).toBeInTheDocument();
    expect(mockFetchOrderDetail).toHaveBeenCalledWith(42);
  });

  it('usa el fast-path del router state cuando está presente', async () => {
    mockFetchOrderDetail.mockResolvedValue(ORDER);
    renderAt('/confirmation/42', { order: ORDER });

    expect(screen.getByText(/Pedido #42/)).toBeInTheDocument();
    expect(screen.getByText('Pendiente')).toBeInTheDocument();
  });

  it('muestra el estado de no encontrado cuando la API responde 404', async () => {
    mockFetchOrderDetail.mockRejectedValue(new NotFoundError("Order doesn't exist."));
    renderAt('/confirmation/999');

    expect(await screen.findByText('Pedido no encontrado')).toBeInTheDocument();
    expect(screen.queryByText(/Pedido #999/)).not.toBeInTheDocument();
  });

  it('muestra el error genérico con reintento para fallos de red', async () => {
    mockFetchOrderDetail.mockRejectedValue(new Error('Network down'));
    renderAt('/confirmation/42');

    expect(await screen.findByText('¡Ups! Algo salió mal')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reintentar/i })).toBeInTheDocument();
    expect(screen.queryByText(/Pedido no encontrado/)).not.toBeInTheDocument();
  });

  it('muestra el badge Aprobado cuando el pedido está aprobado', async () => {
    mockFetchOrderDetail.mockResolvedValue({ ...ORDER, status: 'approved' });
    renderAt('/confirmation/42');

    expect(await screen.findByText('Aprobado')).toBeInTheDocument();
    expect(screen.queryByText('Pendiente')).not.toBeInTheDocument();
  });

  it('muestra el badge Cancelado cuando el pedido está cancelado', async () => {
    mockFetchOrderDetail.mockResolvedValue({ ...ORDER, status: 'canceled' });
    renderAt('/confirmation/42');

    expect(await screen.findByText('Cancelado')).toBeInTheDocument();
    expect(screen.queryByText('Pendiente')).not.toBeInTheDocument();
  });
});
