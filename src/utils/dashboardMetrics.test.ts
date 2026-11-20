import { describe, expect, it } from 'vitest';
import { computeDashboardMetrics } from './dashboardMetrics';
import type { OrderSummary, Product } from '../types';

function makeOrder(overrides: Partial<OrderSummary> = {}): OrderSummary {
  return {
    order_id: 1,
    name: 'Ana',
    last_name: 'Pérez',
    tlf_num: '+584141112233',
    total_amount: '10.00',
    status: 'approved',
    item_count: 1,
    created_at: '2026-11-15T12:00:00.000Z',
    ...overrides,
  };
}

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    product_id: 1,
    product_name: 'Producto',
    product_price: '5.00',
    product_description: '',
    qty_available: 10,
    in_stock: true,
    category: 'Maquillaje',
    ...overrides,
  };
}

describe('computeDashboardMetrics', () => {
  const NOW = new Date(2026, 10, 20, 12, 0, 0); // Nov 20, 2026

  it('returns zeros for empty orders and products lists', () => {
    expect(computeDashboardMetrics([], [], NOW)).toEqual({
      totalOrders: 0,
      pendingCount: 0,
      approvedCount: 0,
      canceledCount: 0,
      totalSales: 0,
      monthlySales: 0,
      averageTicket: 0,
      pendingRevenue: 0,
      totalProducts: 0,
      inStockCount: 0,
      totalUnitsInStock: 0,
      lowStockCount: 0,
      outOfStockCount: 0,
    });
  });

  it('computes order counts, totalSales, monthlySales, averageTicket, and pendingRevenue', () => {
    const orders: OrderSummary[] = [
      makeOrder({ order_id: 1, status: 'approved', total_amount: '30.00', created_at: '2026-11-05T14:00:00.000Z' }),
      makeOrder({ order_id: 2, status: 'approved', total_amount: '50.00', created_at: '2026-11-18T14:00:00.000Z' }),
      makeOrder({ order_id: 3, status: 'approved', total_amount: '40.00', created_at: '2026-10-25T14:00:00.000Z' }),
      makeOrder({ order_id: 4, status: 'approved', total_amount: '20.00', created_at: '2025-11-15T14:00:00.000Z' }),
      makeOrder({ order_id: 5, status: 'pending', total_amount: '15.50', created_at: '2026-11-19T14:00:00.000Z' }),
      makeOrder({ order_id: 6, status: 'pending', total_amount: '9.50', created_at: '2026-11-19T16:00:00.000Z' }),
      makeOrder({ order_id: 7, status: 'canceled', total_amount: '99.00', created_at: '2026-11-19T18:00:00.000Z' }),
    ];

    const metrics = computeDashboardMetrics(orders, [], NOW);

    expect(metrics.totalOrders).toBe(7);
    expect(metrics.approvedCount).toBe(4);
    expect(metrics.pendingCount).toBe(2);
    expect(metrics.canceledCount).toBe(1);
    expect(metrics.totalSales).toBeCloseTo(140, 5);
    expect(metrics.monthlySales).toBeCloseTo(80, 5);
    expect(metrics.averageTicket).toBeCloseTo(35, 5);
    expect(metrics.pendingRevenue).toBeCloseTo(25, 5);
  });

  it('computes averageTicket as 0 when there are no approved orders', () => {
    const orders: OrderSummary[] = [
      makeOrder({ order_id: 1, status: 'pending', total_amount: '25.00' }),
      makeOrder({ order_id: 2, status: 'canceled', total_amount: '15.00' }),
    ];

    const metrics = computeDashboardMetrics(orders, [], NOW);
    expect(metrics.totalSales).toBe(0);
    expect(metrics.monthlySales).toBe(0);
    expect(metrics.averageTicket).toBe(0);
    expect(metrics.pendingRevenue).toBe(25);
  });

  it('computes mutually exclusive low/out stock counts and totalUnitsInStock', () => {
    const products: Product[] = [
      makeProduct({ product_id: 1, qty_available: 12, in_stock: true }),
      makeProduct({ product_id: 2, qty_available: 3, in_stock: true }),
      makeProduct({ product_id: 3, qty_available: 1, in_stock: true }),
      makeProduct({ product_id: 4, qty_available: 0, in_stock: false }),
      makeProduct({ product_id: 5, qty_available: 5, in_stock: false }), // flagged out of stock despite qty > 0
    ];

    const metrics = computeDashboardMetrics([], products, NOW);
    expect(metrics.totalProducts).toBe(5);
    expect(metrics.inStockCount).toBe(3);
    expect(metrics.totalUnitsInStock).toBe(16); // 12 + 3 + 1
    expect(metrics.lowStockCount).toBe(2); // ids 2 and 3
    expect(metrics.outOfStockCount).toBe(2); // ids 4 and 5
  });
});
