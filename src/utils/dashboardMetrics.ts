import type { OrderSummary, Product } from '../types';

export interface DashboardMetrics {
  totalOrders: number;
  pendingCount: number;
  approvedCount: number;
  canceledCount: number;
  totalSales: number;
  monthlySales: number;
  averageTicket: number;
  pendingRevenue: number;
  totalProducts: number;
  inStockCount: number;
  totalUnitsInStock: number;
  lowStockCount: number;
  outOfStockCount: number;
}

/**
 * Computes all KPI counts, revenue metrics, and mutually exclusive stock counts
 * for the admin dashboard.
 */
export function computeDashboardMetrics(
  orders: OrderSummary[],
  products: Product[],
  now: Date = new Date(),
): DashboardMetrics {
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  let pendingCount = 0;
  let approvedCount = 0;
  let canceledCount = 0;
  let totalSales = 0;
  let monthlySales = 0;
  let pendingRevenue = 0;

  for (const order of orders) {
    const amount = Number(order.total_amount) || 0;
    if (order.status === 'pending') {
      pendingCount += 1;
      pendingRevenue += amount;
    } else if (order.status === 'approved') {
      approvedCount += 1;
      totalSales += amount;
      const created = new Date(order.created_at);
      if (created.getFullYear() === currentYear && created.getMonth() === currentMonth) {
        monthlySales += amount;
      }
    } else if (order.status === 'canceled') {
      canceledCount += 1;
    }
  }

  let inStockCount = 0;
  let totalUnitsInStock = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;

  for (const product of products) {
    if (product.qty_available === 0 || !product.in_stock) {
      outOfStockCount += 1;
      continue;
    }
    inStockCount += 1;
    totalUnitsInStock += product.qty_available;
    if (product.qty_available <= 3) {
      lowStockCount += 1;
    }
  }

  return {
    totalOrders: orders.length,
    pendingCount,
    approvedCount,
    canceledCount,
    totalSales,
    monthlySales,
    averageTicket: approvedCount > 0 ? totalSales / approvedCount : 0,
    pendingRevenue,
    totalProducts: products.length,
    inStockCount,
    totalUnitsInStock,
    lowStockCount,
    outOfStockCount,
  };
}
