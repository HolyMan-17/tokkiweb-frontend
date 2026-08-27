import { useState, useEffect, useMemo } from 'react';
import { formatPrice } from '../../../constants';
import {
  computeSalesByPeriod,
  computePaymentDistribution,
  computeDeliveryDistribution,
  type TimePeriod,
  type ChartMetric,
  type DistributionPoint,
} from '../../../utils/salesByDay';
import type { OrderSummary } from '../../../types';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';

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
  label?: string;
  metric?: ChartMetric;
}

function CustomTooltip({ active, payload, label, metric = 'revenue' }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    const val = Number(payload[0].value ?? 0);
    return (
      <div className="chart-tooltip">
        {label && <p className="tooltip-label">{label}</p>}
        <p className="tooltip-value">
          {metric === 'revenue' ? formatPrice(String(val)) : `${val} ${val === 1 ? 'pedido' : 'pedidos'}`}
        </p>
      </div>
    );
  }
  return null;
}

function PieTooltip({ active, payload }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    const item = payload[0];
    const val = Number(item.value ?? 0);
    return (
      <div className="chart-tooltip">
        <p className="tooltip-label">{item.name}</p>
        <p className="tooltip-value">
          {val} {val === 1 ? 'pedido' : 'pedidos'}
        </p>
      </div>
    );
  }
  return null;
}

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

type RechartsModule = typeof import('recharts');

let rechartsCache: RechartsModule | null = null;
let rechartsPromise: Promise<RechartsModule> | null = null;

function loadRecharts(): Promise<RechartsModule> {
  if (rechartsCache) return Promise.resolve(rechartsCache);
  if (!rechartsPromise) {
    rechartsPromise = import('recharts').then((mod) => {
      rechartsCache = mod;
      return mod;
    });
  }
  return rechartsPromise;
}

export type DistributionCriteria = 'status' | 'payment' | 'delivery';

const EMPTY_ORDERS: OrderSummary[] = [];

export function DashboardCharts({
  orders = EMPTY_ORDERS,
  salesByDay,
  pendingCount = 0,
  approvedCount = 0,
  canceledCount = 0,
}: DashboardChartsProps) {
  const [recharts, setRecharts] = useState<RechartsModule | null>(rechartsCache);
  const [period, setPeriod] = useState<TimePeriod>('day');
  const [metric, setMetric] = useState<ChartMetric>('revenue');
  const [distributionType, setDistributionType] = useState<DistributionCriteria>('status');

  useEffect(() => {
    if (!recharts) {
      loadRecharts().then(setRecharts);
    }
  }, [recharts]);

  const barData = useMemo(() => {
    if (orders && orders.length > 0) {
      return computeSalesByPeriod(orders, { period, metric });
    }
    return salesByDay ?? [];
  }, [orders, period, metric, salesByDay]);

  const periodTotal = useMemo(() => {
    return barData.reduce((acc, p) => acc + p.total, 0);
  }, [barData]);

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

  if (!recharts) {
    return (
      <div className="dashboard-charts-loading" style={{ minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LoadingSpinner />
      </div>
    );
  }

  const {
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
    <>
      <section className="dashboard-section chart-card card animate-slideUp">
        <div className="chart-header">
          <div className="chart-header-top">
            <h2 className="section-title">Análisis de Ventas</h2>
            <div className="chart-controls">
              <div className="pill-group" role="tablist" aria-label="Métrica">
                <button
                  type="button"
                  className={`pill-btn ${metric === 'revenue' ? 'pill-btn--active' : ''}`}
                  onClick={() => setMetric('revenue')}
                >
                  Ingresos ($)
                </button>
                <button
                  type="button"
                  className={`pill-btn ${metric === 'orders' ? 'pill-btn--active' : ''}`}
                  onClick={() => setMetric('orders')}
                >
                  Pedidos (#)
                </button>
              </div>

              <div className="pill-group" role="tablist" aria-label="Período">
                <button
                  type="button"
                  className={`pill-btn ${period === 'day' ? 'pill-btn--active' : ''}`}
                  onClick={() => setPeriod('day')}
                >
                  Días
                </button>
                <button
                  type="button"
                  className={`pill-btn ${period === 'week' ? 'pill-btn--active' : ''}`}
                  onClick={() => setPeriod('week')}
                >
                  Semanas
                </button>
                <button
                  type="button"
                  className={`pill-btn ${period === 'month' ? 'pill-btn--active' : ''}`}
                  onClick={() => setPeriod('month')}
                >
                  Meses
                </button>
              </div>
            </div>
          </div>

          <div className="chart-summary-chip">
            <span>
              Total período:{' '}
              <strong>{metric === 'revenue' ? formatPrice(String(periodTotal)) : `${periodTotal} pedidos`}</strong>
            </span>
          </div>
        </div>

        <div className="chart-container">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
                dy={10}
              />
              <YAxis hide />
              <Tooltip content={<CustomTooltip metric={metric} />} cursor={{ fill: 'var(--pink-50)' }} />
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
        <div className="chart-header">
          <div className="chart-header-top">
            <h2 className="section-title">Distribución de Pedidos</h2>
            <div className="chart-controls">
              <div className="pill-group" role="tablist" aria-label="Criterio de distribución">
                <button
                  type="button"
                  className={`pill-btn ${distributionType === 'status' ? 'pill-btn--active' : ''}`}
                  onClick={() => setDistributionType('status')}
                >
                  Por Estado
                </button>
                <button
                  type="button"
                  className={`pill-btn ${distributionType === 'payment' ? 'pill-btn--active' : ''}`}
                  onClick={() => setDistributionType('payment')}
                >
                  Por Pago
                </button>
                <button
                  type="button"
                  className={`pill-btn ${distributionType === 'delivery' ? 'pill-btn--active' : ''}`}
                  onClick={() => setDistributionType('delivery')}
                >
                  Por Entrega
                </button>
              </div>
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
    </>
  );
}

export default DashboardCharts;
