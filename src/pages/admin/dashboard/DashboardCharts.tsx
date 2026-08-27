import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  Sector,
} from 'recharts';
import type { PieSectorShapeProps } from 'recharts';
import { formatPrice } from '../../../constants';

const PIE_COLORS = {
  pending: '#e8a44d', // var(--color-warning)
  approved: '#4caf80', // var(--color-success)
  canceled: '#e06b6b', // var(--color-danger)
};

interface TooltipPayloadItem {
  value?: number | string;
  name?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="chart-tooltip">
        <p className="tooltip-value">{formatPrice(String(payload[0].value ?? 0))}</p>
      </div>
    );
  }
  return null;
}

function PieTooltip({ active, payload }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="chart-tooltip">
        <p className="tooltip-label">{payload[0].name}</p>
        <p className="tooltip-value">{payload[0].value} pedidos</p>
      </div>
    );
  }
  return null;
}

function renderSlice(props: PieSectorShapeProps) {
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
}

export interface DaySales {
  label: string;
  total: number;
}

interface DashboardChartsProps {
  salesByDay: DaySales[];
  pendingCount: number;
  approvedCount: number;
  canceledCount: number;
}

export function DashboardCharts({
  salesByDay,
  pendingCount,
  approvedCount,
  canceledCount,
}: DashboardChartsProps) {
  const pieData = [
    { name: 'Pendientes', value: pendingCount, color: PIE_COLORS.pending },
    { name: 'Aprobados', value: approvedCount, color: PIE_COLORS.approved },
    { name: 'Cancelados', value: canceledCount, color: PIE_COLORS.canceled },
  ];

  return (
    <>
      <section className="dashboard-section chart-card card animate-slideUp">
        <h2 className="section-title">Ventas por Día</h2>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={salesByDay} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
                dy={10}
              />
              <YAxis hide />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--pink-50)' }} />
              <Bar
                dataKey="total"
                fill="var(--color-primary)"
                radius={[8, 8, 0, 0]}
                maxBarSize={40}
                activeBar={{ fill: 'var(--pink-400)', stroke: 'var(--pink-500)', strokeWidth: 2 }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="dashboard-section chart-card card animate-slideUp">
        <h2 className="section-title">Estado de Pedidos</h2>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                cornerRadius={6}
                dataKey="value"
                shape={renderSlice}
              >
                {pieData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} stroke="none" />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip />} />
              <Legend
                verticalAlign="bottom"
                height={36}
                iconType="circle"
                wrapperStyle={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </section>
    </>
  );
}

export default DashboardCharts;
