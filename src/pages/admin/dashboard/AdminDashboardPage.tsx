import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, Sector } from 'recharts';
import type { PieSectorShapeProps } from 'recharts';
import { Link } from 'react-router-dom';
import { fetchOrderSummaries, fetchProducts } from '../../../store/localStore';
import { useAsync } from '../../../hooks/useAsync';
import StatusBadge from '../../../components/ui/StatusBadge';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import ErrorState from '../../../components/ui/ErrorState';
import { ADMIN_ROUTES } from '../../../lib/routes';
import { formatPrice, formatDate } from '../../../constants';
import './AdminDashboardPage.css';

const MOCK_SALES_DATA = [
  { day: 'Lun', sales: 12 },
  { day: 'Mar', sales: 8.5 },
  { day: 'Mié', sales: 15 },
  { day: 'Jue', sales: 22 },
  { day: 'Vie', sales: 18 },
  { day: 'Sáb', sales: 30 },
  { day: 'Dom', sales: 9 },
];

const PIE_COLORS = {
  pending: '#e8a44d', // var(--color-warning)
  approved: '#4caf80', // var(--color-success)
  canceled: '#e06b6b' // var(--color-danger)
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

export default function AdminDashboardPage() {
  const { data, isLoading, isError, retry } = useAsync(
    () => Promise.all([fetchOrderSummaries(), fetchProducts()]),
    []
  );
  const [orders, products] = data ?? [[], []];

  const pendingCount = orders.filter(o => o.status === 'pending').length;
  const approvedCount = orders.filter(o => o.status === 'approved').length;
  const canceledCount = orders.filter(o => o.status === 'canceled').length;
  const totalOrders = orders.length;
  const totalProducts = products.length;
  const inStockCount = products.filter(p => p.qty_available > 0).length;
  const totalSales = orders
    .filter(o => o.status === 'approved')
    .reduce((s, o) => s + Number(o.total_amount), 0);

  const pieData = [
    { name: 'Pendientes', value: pendingCount, color: PIE_COLORS.pending },
    { name: 'Aprobados', value: approvedCount, color: PIE_COLORS.approved },
    { name: 'Cancelados', value: canceledCount, color: PIE_COLORS.canceled },
  ];

  const renderSlice = (props: PieSectorShapeProps) => {
    const { cx = 0, cy = 0, innerRadius = 0, outerRadius = 0, startAngle = 0, endAngle = 0, cornerRadius = 0, fill, isActive } = props;
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

  const recentOrders = orders.slice(0, 3);

  if (isLoading || isError) {
    return (
      <div className="page admin-dashboard">
        <header className="page-header">
          <h1 className="page-title">Panel de Control 👋</h1>
          <p className="page-subtitle">Un resumen rápido de tu tienda</p>
        </header>
        {isError ? <ErrorState onRetry={retry} /> : <LoadingSpinner fullPage />}
      </div>
    );
  }

  return (
    <div className="page admin-dashboard">
      <header className="page-header">
        <h1 className="page-title">Panel de Control 👋</h1>
        <p className="page-subtitle">Un resumen rápido de tu tienda</p>
      </header>

      <section className="dashboard-section stats-grid stagger">
        <div className="card stat-card animate-slideUp">
          <div className="stat-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="6" width="20" height="12" rx="2.5" />
              <circle cx="12" cy="12" r="2.5" />
              <path d="M6 12h.01" />
              <path d="M18 12h.01" />
            </svg>
          </div>
          <div className="stat-value text-primary font-display">{formatPrice(totalSales.toString())}</div>
          <div className="stat-label text-muted">Ventas Totales</div>
        </div>

        <div className="card stat-card animate-slideUp">
          <div className="stat-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/>
              <path d="M3 6h18"/>
              <path d="M16 10a4 4 0 0 1-8 0"/>
            </svg>
          </div>
          <div className="stat-value font-display">{totalOrders}</div>
          <div className="stat-label text-muted">Pedidos</div>
          <div className="stat-sub">
            <span className="text-warning">{pendingCount}</span> / <span className="text-success">{approvedCount}</span> / <span className="text-danger">{canceledCount}</span>
          </div>
        </div>

        <div className="card stat-card animate-slideUp">
          <div className="stat-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m7.5 4.27 9 5.15"/>
              <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
              <path d="m3.3 7 8.7 5 8.7-5"/>
              <path d="M12 22V12"/>
            </svg>
          </div>
          <div className="stat-value font-display">{totalProducts}</div>
          <div className="stat-label text-muted">Productos</div>
          <div className="stat-sub text-success">{inStockCount} en stock</div>
        </div>
      </section>

      <section className="dashboard-section chart-card card animate-slideUp">
        <h2 className="section-title">Ventas por Día</h2>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={MOCK_SALES_DATA} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} dy={10} />
              <YAxis hide />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--pink-50)' }} />
              <Bar
                dataKey="sales"
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
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
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

      <section className="dashboard-section recent-orders card animate-slideUp">
        <div className="section-header">
          <h2 className="section-title">Pedidos Recientes</h2>
        </div>
        <div className="recent-orders-list">
          {recentOrders.map((order) => (
            <div key={order.order_id} className="recent-order-item">
              <div className="ro-left">
                <span className="ro-id">#{order.order_id}</span>
                <span className="ro-name">{order.name} {order.last_name}</span>
                <span className="ro-date text-muted">{formatDate(order.created_at).split(',')[0]}</span>
              </div>
              <div className="ro-right">
                <StatusBadge status={order.status} />
                <span className="ro-total font-display">{formatPrice(order.total_amount)}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="section-footer">
          <Link to={ADMIN_ROUTES.orders} className="btn btn-outline btn-block">Ver todos</Link>
        </div>
      </section>
    </div>
  );
}
