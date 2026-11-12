import { useMemo } from 'react';
import {
  computeSalesByPeriod,
  computePaymentDistribution,
  computeDeliveryDistribution,
  type TimePeriod,
  type ChartMetric,
  type DistributionPoint,
  type SalesByDayPoint,
} from '../../../utils/salesByDay';
import type { OrderSummary } from '../../../types';
import type { DaySales, DistributionCriteria } from './dashboardChartTypes';

const PIE_COLORS = {
  pending: '#e8a44d', // var(--color-warning)
  approved: '#4caf80', // var(--color-success)
  canceled: '#e06b6b', // var(--color-danger)
};

export interface SalesChartData {
  barData: SalesByDayPoint[] | DaySales[];
  periodTotal: number;
}

export interface DistributionChartData {
  distributionData: DistributionPoint[];
  totalDistributionCount: number;
}

/**
 * Derives the bar-chart series (and its period total) from the orders list,
 * falling back to the pre-computed daily sales when no orders are available.
 */
export function useSalesChartData(
  orders: OrderSummary[],
  salesByDay: DaySales[] | undefined,
  period: TimePeriod,
  metric: ChartMetric,
): SalesChartData {
  const barData = useMemo(() => {
    if (orders && orders.length > 0) {
      return computeSalesByPeriod(orders, { period, metric });
    }
    return salesByDay ?? [];
  }, [orders, period, metric, salesByDay]);

  const periodTotal = useMemo(() => {
    return barData.reduce((acc, p) => acc + p.total, 0);
  }, [barData]);

  return { barData, periodTotal };
}

/**
 * Derives the pie-chart slices for the selected breakdown criteria
 * (status / payment / delivery) plus the total amount of recorded orders.
 */
export function useDistributionData(
  orders: OrderSummary[],
  distributionType: DistributionCriteria,
  counts: { pendingCount: number; approvedCount: number; canceledCount: number },
): DistributionChartData {
  const { pendingCount, approvedCount, canceledCount } = counts;

  const distributionData: DistributionPoint[] = useMemo(() => {
    if (distributionType === 'payment') {
      return computePaymentDistribution(orders);
    }
    if (distributionType === 'delivery') {
      return computeDeliveryDistribution(orders);
    }
    return [
      { name: 'Pendientes', value: pendingCount, color: PIE_COLORS.pending },
      { name: 'Aprobados', value: approvedCount, color: PIE_COLORS.approved },
      { name: 'Cancelados', value: canceledCount, color: PIE_COLORS.canceled },
    ];
  }, [distributionType, orders, pendingCount, approvedCount, canceledCount]);

  const totalDistributionCount = useMemo(() => {
    return distributionData.reduce((sum, item) => sum + item.value, 0);
  }, [distributionData]);

  return { distributionData, totalDistributionCount };
}
