import type { OrderSummary } from '../../../types';
import type { DashboardChartsProps } from './dashboardChartTypes';
import { useRecharts } from './useRecharts';
import SalesAnalysisSection from './SalesAnalysisSection';
import DistributionSection from './DistributionSection';
import DashboardChartsLoading from './DashboardChartsLoading';

export type { DaySales, DashboardChartsProps, DistributionCriteria } from './dashboardChartTypes';

const EMPTY_ORDERS: OrderSummary[] = [];

export function DashboardCharts({
  orders = EMPTY_ORDERS,
  salesByDay,
  pendingCount = 0,
  approvedCount = 0,
  canceledCount = 0,
}: DashboardChartsProps) {
  const recharts = useRecharts();

  if (!recharts) {
    return <DashboardChartsLoading />;
  }

  return (
    <>
      <SalesAnalysisSection recharts={recharts} orders={orders} salesByDay={salesByDay} />

      <DistributionSection
        recharts={recharts}
        orders={orders}
        pendingCount={pendingCount}
        approvedCount={approvedCount}
        canceledCount={canceledCount}
      />
    </>
  );
}

export default DashboardCharts;
