import { Link } from 'react-router-dom';
import { ADMIN_ROUTES } from '../../../lib/routes';
import { formatPrice } from '../../../constants';
import type { DashboardMetrics } from '../../../utils/dashboardMetrics';

interface DashboardStatsGridProps {
  metrics: DashboardMetrics;
}

export function DashboardStatsGrid({ metrics }: DashboardStatsGridProps) {
  const totalAlerts = metrics.lowStockCount + metrics.outOfStockCount;
  const ordersLink =
    metrics.pendingCount > 0
      ? `${ADMIN_ROUTES.orders}?status=pending`
      : ADMIN_ROUTES.orders;

  return (
    <section className="dashboard-section stats-grid stagger">
      <div className="card stat-card animate-slideUp">
        <div className="stat-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="2" y="6" width="20" height="12" rx="2.5" />
            <circle cx="12" cy="12" r="2.5" />
            <path d="M6 12h.01" />
            <path d="M18 12h.01" />
          </svg>
        </div>
        <div className="stat-value text-primary font-display">
          {formatPrice(metrics.totalSales.toString())}
        </div>
        <div className="stat-label text-muted">Ventas Totales</div>
        <div className="stat-sub stat-sub-stack">
          <span className="text-secondary">
            Este mes: {formatPrice(metrics.monthlySales.toString())}
            {metrics.approvedCount > 0 && ` • Prom.: ${formatPrice(metrics.averageTicket.toString())}`}
          </span>
          {metrics.pendingRevenue > 0 && (
            <span className="stat-pending-revenue">
              +{formatPrice(metrics.pendingRevenue.toString())} por cobrar
            </span>
          )}
        </div>
      </div>

      <Link
        to={ordersLink}
        className="card stat-card stat-card-link animate-slideUp"
        aria-label="Ver pedidos"
      >
        <div className="stat-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
            <path d="M3 6h18" />
            <path d="M16 10a4 4 0 0 1-8 0" />
          </svg>
        </div>
        <div className="stat-value font-display">{metrics.totalOrders}</div>
        <div className="stat-label text-muted">Pedidos</div>
        <div className="stat-sub">
          <span className="text-warning">{metrics.pendingCount}</span> /{' '}
          <span className="text-success">{metrics.approvedCount}</span> /{' '}
          <span className="text-danger">{metrics.canceledCount}</span>
        </div>
      </Link>

      <Link
        to={ADMIN_ROUTES.products}
        className="card stat-card stat-card-link animate-slideUp"
        aria-label="Ver productos"
      >
        <div className="stat-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m7.5 4.27 9 5.15" />
            <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
            <path d="m3.3 7 8.7 5 8.7-5" />
            <path d="M12 22V12" />
          </svg>
        </div>
        <div className="stat-value font-display">{metrics.totalProducts}</div>
        <div className="stat-label text-muted">Productos</div>
        <div className="stat-sub text-success">
          {metrics.inStockCount} en stock • {metrics.totalUnitsInStock} uds.
        </div>
      </Link>

      <Link
        to={`${ADMIN_ROUTES.products}?stock=alert`}
        className="card stat-card stat-card-link animate-slideUp"
        aria-label="Ver alertas de stock"
      >
        <div className="stat-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        <div className={`stat-value font-display ${totalAlerts > 0 ? 'text-warning' : 'text-success'}`}>
          {totalAlerts}
        </div>
        <div className="stat-label text-muted">Alertas Stock</div>
        <div className="stat-sub">
          <span className="text-warning">{metrics.lowStockCount} bajo</span> •{' '}
          <span className="text-danger">{metrics.outOfStockCount} agotado</span>
        </div>
      </Link>
    </section>
  );
}

export default DashboardStatsGrid;
