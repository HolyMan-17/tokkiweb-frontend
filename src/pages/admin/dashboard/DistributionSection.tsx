import { useState } from 'react';
import type { RechartsModule } from './useRecharts';
import { useDistributionData } from './useDashboardChartData';
import type { OrderSummary } from '../../../types';
import type { DistributionCriteria } from './dashboardChartTypes';
import ChartPillGroup, { type ChartPillOption } from './ChartPillGroup';
import PieTooltip from './PieTooltip';

const DISTRIBUTION_OPTIONS: ChartPillOption<DistributionCriteria>[] = [
  { value: 'status', label: 'Por Estado' },
  { value: 'payment', label: 'Por Pago' },
  { value: 'delivery', label: 'Por Entrega' },
];

interface PieSectorShapeProps {
  cx?: number;
  cy?: number;
  innerRadius?: number;
  outerRadius?: number;
  startAngle?: number;
  endAngle?: number;
  cornerRadius?: number;
  fill?: string;
  isActive?: boolean;
}

interface DistributionSectionProps {
  recharts: RechartsModule;
  orders: OrderSummary[];
  pendingCount: number;
  approvedCount: number;
  canceledCount: number;
}

/**
 * "Distribución de Pedidos" card: pie chart with the breakdown criteria
 * (estado / pago / entrega).
 */
export function DistributionSection({
  recharts,
  orders,
  pendingCount,
  approvedCount,
  canceledCount,
}: DistributionSectionProps) {
  const [distributionType, setDistributionType] = useState<DistributionCriteria>('status');

  const { distributionData, totalDistributionCount } = useDistributionData(
    orders,
    distributionType,
    { pendingCount, approvedCount, canceledCount },
  );

  const {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    ResponsiveContainer,
    Legend,
    Sector,
  } = recharts;

  const renderSlice = (props: PieSectorShapeProps) => {
    const {
      cx = 0,
      cy = 0,
      innerRadius = 0,
      outerRadius = 0,
      startAngle = 0,
      endAngle = 0,
      cornerRadius = 0,
      fill,
      isActive,
    } = props;
    return (
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        cornerRadius={cornerRadius}
        fill={fill}
        className={isActive ? 'pie-sector pie-sector--active' : 'pie-sector'}
      />
    );
  };

  return (
    <section className="dashboard-section chart-card card animate-slideUp">
      <div className="chart-header">
        <div className="chart-header-top">
          <h2 className="section-title">Distribución de Pedidos</h2>
          <div className="chart-controls">
            <ChartPillGroup
              ariaLabel="Criterio de distribución"
              options={DISTRIBUTION_OPTIONS}
              value={distributionType}
              onChange={(criterion) => setDistributionType(criterion)}
            />
          </div>
        </div>

        <div className="chart-summary-chip">
          <span>
            Total registrado: <strong>{totalDistributionCount} pedidos</strong>
          </span>
        </div>
      </div>

      <div className="chart-container">
        <ResponsiveContainer width="100%" height={230}>
          <PieChart>
            <Pie
              data={distributionData}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={4}
              cornerRadius={6}
              dataKey="value"
              shape={renderSlice}
            >
              {distributionData.map((entry) => (
                <Cell key={entry.name} fill={entry.color} stroke="none" />
              ))}
            </Pie>
            <Tooltip content={<PieTooltip />} />
            <Legend
              verticalAlign="bottom"
              height={40}
              iconType="circle"
              wrapperStyle={{ fontSize: '13px', color: 'var(--color-text-secondary)', paddingTop: '10px' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

export default DistributionSection;
