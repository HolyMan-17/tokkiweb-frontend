import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import OrderConfirmationPage from './OrderConfirmationPage';
import { CartProvider } from '../../context/CartContext';
import { fetchOrderReceipt, NotFoundError } from '../../api/orders';
import type { OrderDetail } from '../../types';

vi.mock('../../api/orders', async importOriginal => ({
  ...(await importOriginal<typeof import('../../api/orders')>()),
  fetchOrderReceipt: vi.fn(),
}));

const mockFetchOrderReceipt = vi.mocked(fetchOrderReceipt);

const ORDER: OrderDetail = {
  order_id: 42,
  order_token: '550e8400-e29b-41d4-a716-446655440000',
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
  mockFetchOrderReceipt.mockReset();
});

describe('OrderConfirmationPage — confirmación por token de recibo', () => {
  it('renderiza el pedido y el badge real desde la API de recibo sin router state (refresh)', async () => {
    mockFetchOrderReceipt.mockResolvedValue(ORDER);
    renderAt('/confirmation/550e8400-e29b-41d4-a716-446655440000');

    expect(await screen.findByText(/Pedido #42/)).toBeInTheDocument();
    expect(await screen.findByText('Pendiente')).toBeInTheDocument();
    expect(screen.getByText(/Bálsamo de Fresa/)).toBeInTheDocument();
    expect(mockFetchOrderReceipt).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440000');
  });

  it('usa el fast-path del router state cuando está presente', async () => {
    mockFetchOrderReceipt.mockResolvedValue(ORDER);
    renderAt('/confirmation/550e8400-e29b-41d4-a716-446655440000', { order: ORDER });

    expect(screen.getByText(/Pedido #42/)).toBeInTheDocument();
    expect(screen.getByText('Pendiente')).toBeInTheDocument();
  });

  it('renderiza correctamente cuando el router state recibe un CreatedOrder sin status explícito', async () => {
    mockFetchOrderReceipt.mockResolvedValue(ORDER);
    const createdOrder = {
      order_id: 101,
      order_token: '550e8400-e29b-41d4-a716-446655440000',
      delivery_type: 'envio_nacional',
      payment_method: 'pago_movil',
      total_amount: '10.00',
      items: [
        { id: 1, name: 'Tokki Sticker Pack', ordered_qty: 2, price: '5.00' },
      ],
    };
    renderAt('/confirmation/550e8400-e29b-41d4-a716-446655440000', { order: createdOrder });

    expect(screen.getByText(/Pedido #101/)).toBeInTheDocument();
    expect(screen.getByText('Pendiente')).toBeInTheDocument();
    expect(screen.getByText(/2x Tokki Sticker Pack/)).toBeInTheDocument();
    expect(screen.getAllByText('$10.00')).toHaveLength(2);
  });

  it('muestra el estado de no encontrado cuando la API responde 404', async () => {
    mockFetchOrderReceipt.mockRejectedValue(new NotFoundError("Receipt doesn't exist."));
    renderAt('/confirmation/invalid-uuid');

    expect(await screen.findByText('Pedido no encontrado')).toBeInTheDocument();
    expect(screen.queryByText(/Pedido #/)).not.toBeInTheDocument();
  });

  it('muestra el error genérico con reintento para fallos de red', async () => {
    mockFetchOrderReceipt.mockRejectedValue(new Error('Network down'));
    renderAt('/confirmation/550e8400-e29b-41d4-a716-446655440000');

    expect(await screen.findByText('¡Ups! Algo salió mal')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reintentar/i })).toBeInTheDocument();
    expect(screen.queryByText(/Pedido no encontrado/)).not.toBeInTheDocument();
  });

  it('muestra el badge Aprobado cuando el pedido está aprobado', async () => {
    mockFetchOrderReceipt.mockResolvedValue({ ...ORDER, status: 'approved' });
    renderAt('/confirmation/550e8400-e29b-41d4-a716-446655440000');

    expect(await screen.findByText('Aprobado')).toBeInTheDocument();
    expect(screen.queryByText('Pendiente')).not.toBeInTheDocument();
  });

  it('muestra el badge Cancelado cuando el pedido está cancelado', async () => {
    mockFetchOrderReceipt.mockResolvedValue({ ...ORDER, status: 'canceled' });
    renderAt('/confirmation/550e8400-e29b-41d4-a716-446655440000');

    expect(await screen.findByText('Cancelado')).toBeInTheDocument();
    expect(screen.queryByText('Pendiente')).not.toBeInTheDocument();
  });
});
