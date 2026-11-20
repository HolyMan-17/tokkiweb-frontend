import { useState } from 'react';
import type { RechartsModule } from './useRecharts';
import { useSalesChartData } from './useDashboardChartData';
import type { OrderSummary } from '../../../types';
import type { ChartMetric, SalesByDayPoint, TimePeriod } from '../../../utils/salesByDay';
import type { DaySales } from './dashboardChartTypes';
import ChartPillGroup, { type ChartPillOption } from './ChartPillGroup';
import SalesSummaryChip from './SalesSummaryChip';
import SalesBarChart from './SalesBarChart';

const METRIC_OPTIONS: ChartPillOption<ChartMetric>[] = [
  { value: 'revenue', label: 'Ingresos ($)' },
  { value: 'orders', label: 'Pedidos (#)' },
];

const PERIOD_OPTIONS: ChartPillOption<TimePeriod>[] = [
  { value: 'day', label: 'Días' },
  { value: 'week', label: 'Semanas' },
  { value: 'month', label: 'Meses' },
];

interface SalesAnalysisSectionProps {
  recharts: RechartsModule;
  orders: OrderSummary[];
  salesByDay?: DaySales[];
}

/**
 * "Análisis de Ventas" card: bar chart with the period and metric filters.
 */
export function SalesAnalysisSection({
  recharts,
  orders,
  salesByDay,
}: SalesAnalysisSectionProps) {
  const [period, setPeriod] = useState<TimePeriod>('day');
  const [metric, setMetric] = useState<ChartMetric>('revenue');
  const [periodOffset, setPeriodOffset] = useState(0);
  const [selectedPoint, setSelectedPoint] = useState<SalesByDayPoint | null>(null);

  const { barData, periodTotal, windowLabel } = useSalesChartData(
    orders,
    salesByDay,
    period,
    metric,
    periodOffset,
  );

  const handleMetricChange = (nextMetric: ChartMetric) => {
    setMetric(nextMetric);
    setSelectedPoint(null);
  };

  const handlePeriodChange = (nextPeriod: TimePeriod) => {
    setPeriod(nextPeriod);
    setPeriodOffset(0);
    setSelectedPoint(null);
  };

  const handlePrevPeriod = () => {
    setPeriodOffset((prev) => prev - 1);
    setSelectedPoint(null);
  };

  const handleNextPeriod = () => {
    setPeriodOffset((prev) => Math.min(0, prev + 1));
    setSelectedPoint(null);
  };

  const handleResetPeriod = () => {
    setPeriodOffset(0);
    setSelectedPoint(null);
  };

  return (
    <section className="dashboard-section chart-card card animate-slideUp">
      <div className="chart-header">
        <div className="chart-header-top">
          <h2 className="section-title">Análisis de Ventas</h2>
          <div className="chart-controls">
            <ChartPillGroup
              ariaLabel="Métrica"
              options={METRIC_OPTIONS}
              value={metric}
              onChange={handleMetricChange}
            />

            <ChartPillGroup
              ariaLabel="Período"
              options={PERIOD_OPTIONS}
              value={period}
              onChange={handlePeriodChange}
            />
          </div>
        </div>

        <div className="chart-subheader-row">
          <SalesSummaryChip
            metric={metric}
            periodTotal={periodTotal}
            selectedPoint={selectedPoint}
            onClearSelection={() => setSelectedPoint(null)}
          />

          <div className="period-nav" aria-label="Navegación de períodos">
            <button
              type="button"
              className="period-nav-btn"
              onClick={handlePrevPeriod}
              aria-label="Período anterior"
              title="Período anterior"
            >
              ‹
            </button>
            <span className="period-nav-label">{windowLabel}</span>
            <button
              type="button"
              className="period-nav-btn"
              onClick={handleNextPeriod}
              disabled={periodOffset >= 0}
              aria-label="Período siguiente"
              title="Período siguiente"
            >
              ›
            </button>
            {periodOffset < 0 && (
              <button
                type="button"
                className="period-reset-btn"
                onClick={handleResetPeriod}
              >
                Actual
              </button>
            )}
          </div>
        </div>
      </div>

      <SalesBarChart
        recharts={recharts}
        barData={barData}
        period={period}
        metric={metric}
        onSelectPoint={(point) => setSelectedPoint(point)}
      />
    </section>
  );
}

export default SalesAnalysisSection;
