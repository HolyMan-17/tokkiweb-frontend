import type { OrderSummary } from '../../../types';

export interface DaySales {
  label: string;
  total: number;
}

export interface DashboardChartsProps {
  orders?: OrderSummary[];
  salesByDay?: DaySales[];
  pendingCount?: number;
  approvedCount?: number;
  canceledCount?: number;
}

export type DistributionCriteria = 'status' | 'payment' | 'delivery';
