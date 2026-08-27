import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import DashboardCharts from './DashboardCharts';
import type { OrderSummary } from '../../../types';

// Stub ResizeObserver for recharts ResponsiveContainer
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', ResizeObserverStub);

const ORDERS: OrderSummary[] = [
  {
    order_id: 1,
    name: 'Ana',
    last_name: 'Pérez',
    tlf_num: '+584121112233',
    total_amount: '20.00',
    status: 'approved',
    item_count: 2,
    delivery_type: 'delivery',
    payment_method: 'pago_movil',
    created_at: '2026-08-20T12:00:00.000Z',
  },
  {
    order_id: 2,
    name: 'Luis',
    last_name: 'Gómez',
    tlf_num: '+584124445566',
    total_amount: '35.00',
    status: 'pending',
    item_count: 1,
    delivery_type: 'envio_nacional',
    payment_method: 'binance',
    created_at: '2026-08-25T14:00:00.000Z',
  },
];

describe('DashboardCharts — interactividad de métricas y filtros', { timeout: 20000 }, () => {
  beforeAll(async () => {
    await import('recharts');
  });

  it('renderiza títulos de secciones y botones de filtro', async () => {
    render(
      <DashboardCharts
        orders={ORDERS}
        pendingCount={1}
        approvedCount={1}
        canceledCount={0}
      />,
    );

    expect(await screen.findByText('Análisis de Ventas')).toBeInTheDocument();
    expect(screen.getByText('Distribución de Pedidos')).toBeInTheDocument();

    // Filtros de ventas
    expect(screen.getByRole('button', { name: /ingresos/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /pedidos \(#\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /días/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /semanas/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /meses/i })).toBeInTheDocument();

    // Filtros de distribución
    expect(screen.getByRole('button', { name: /por estado/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /por pago/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /por entrega/i })).toBeInTheDocument();
  });

  it('permite alternar el período de análisis a semanas y meses', async () => {
    render(
      <DashboardCharts
        orders={ORDERS}
        pendingCount={1}
        approvedCount={1}
        canceledCount={0}
      />,
    );

    await screen.findByText('Análisis de Ventas');

    const semanasBtn = screen.getByRole('button', { name: /semanas/i });
    fireEvent.click(semanasBtn);
    expect(semanasBtn).toHaveClass('pill-btn--active');

    const mesesBtn = screen.getByRole('button', { name: /meses/i });
    fireEvent.click(mesesBtn);
    expect(mesesBtn).toHaveClass('pill-btn--active');
  });

  it('permite alternar la métrica a cantidad de pedidos', async () => {
    render(
      <DashboardCharts
        orders={ORDERS}
        pendingCount={1}
        approvedCount={1}
        canceledCount={0}
      />,
    );

    await screen.findByText('Análisis de Ventas');

    const ordersMetricBtn = screen.getByRole('button', { name: /pedidos \(#\)/i });
    fireEvent.click(ordersMetricBtn);
    expect(ordersMetricBtn).toHaveClass('pill-btn--active');
    expect(screen.getByText(/total período:/i)).toHaveTextContent(/pedidos/i);
  });

  it('permite alternar el criterio de distribución a método de pago y entrega', async () => {
    render(
      <DashboardCharts
        orders={ORDERS}
        pendingCount={1}
        approvedCount={1}
        canceledCount={0}
      />,
    );

    await screen.findByText('Distribución de Pedidos');

    const pagoBtn = screen.getByRole('button', { name: /por pago/i });
    fireEvent.click(pagoBtn);
    expect(pagoBtn).toHaveClass('pill-btn--active');

    const entregaBtn = screen.getByRole('button', { name: /por entrega/i });
    fireEvent.click(entregaBtn);
    expect(entregaBtn).toHaveClass('pill-btn--active');
  });
});
