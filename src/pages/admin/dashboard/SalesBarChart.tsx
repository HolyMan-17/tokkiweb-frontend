import type { RechartsModule } from './useRecharts';
import type { ChartMetric, TimePeriod, SalesByDayPoint } from '../../../utils/salesByDay';
import type { DaySales } from './dashboardChartTypes';
import CustomTooltip from './CustomTooltip';
import CustomXAxisTick from './CustomXAxisTick';

interface SalesBarChartProps {
  recharts: RechartsModule;
  barData: SalesByDayPoint[] | DaySales[];
  period: TimePeriod;
  metric: ChartMetric;
  onSelectPoint: (point: SalesByDayPoint) => void;
}

/**
 * Bar chart of the "Análisis de Ventas" card. Clicking a bar selects it and
 * surfaces its value in the summary chip.
 */
export function SalesBarChart({
  recharts,
  barData,
  period,
  metric,
  onSelectPoint,
}: SalesBarChartProps) {
  const {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
  } = recharts;

  return (
    <div className="chart-container">
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={barData} margin={{ top: 10, right: 10, left: 0, bottom: 15 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
          <XAxis
            dataKey="label"
            interval={0}
            axisLine={false}
            tickLine={false}
            tick={<CustomXAxisTick period={period} />}
            height={period === 'week' ? 44 : 35}
          />
          <YAxis hide />
          <Tooltip content={<CustomTooltip metric={metric} />} cursor={{ fill: 'var(--pink-50)' }} />
          <Bar
            dataKey="total"
            fill="var(--color-primary)"
            radius={[8, 8, 0, 0]}
            maxBarSize={40}
            activeBar={{ fill: 'var(--pink-400)', stroke: 'var(--pink-500)', strokeWidth: 2 }}
            onClick={(entry) => onSelectPoint(entry as unknown as SalesByDayPoint)}
            style={{ cursor: 'pointer' }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default SalesBarChart;
