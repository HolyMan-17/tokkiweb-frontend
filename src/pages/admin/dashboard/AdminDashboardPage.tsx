import { useMemo, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { fetchOrderSummaries } from '../../../api/orders';
import { fetchAllProducts } from '../../../api/products';
import { useAsync } from '../../../hooks/useAsync';
import { useAdminAuth } from '../../../components/auth/useAdminAuth';
import StatusBadge from '../../../components/ui/StatusBadge';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import ErrorState from '../../../components/ui/ErrorState';
import DashboardStatsGrid from './DashboardStatsGrid';
import TopProductsCard from './TopProductsCard';
import { ADMIN_ROUTES } from '../../../lib/routes';
import { formatPrice, formatDate } from '../../../constants';
import { computeSalesByDay } from '../../../utils/salesByDay';
import { computeDashboardMetrics } from '../../../utils/dashboardMetrics';
import bunnyGif from '../../../assets/bunny.webp';
import './AdminDashboardPage.css';

const DashboardCharts = lazy(() => import('./DashboardCharts'));

export default function AdminDashboardPage() {
  const { getAdminToken } = useAdminAuth();
  // Stable auth handle for API calls (Bearer via Clerk when mounted)
  const auth = useMemo(
    () => (getAdminToken ? { getToken: getAdminToken } : undefined),
    [getAdminToken],
  );
  const { data, isLoading, isError, retry } = useAsync(async () => {
    const [orders, products] = await Promise.all([
      fetchOrderSummaries(auth),
      fetchAllProducts(),
    ]);
    return [orders, products] as const;
  }, [auth]);
  const [orders, products] = data ?? [[], []];

  const metrics = useMemo(
    () => computeDashboardMetrics(orders, products),
    [orders, products],
  );
  const salesByDay = useMemo(() => computeSalesByDay(orders), [orders]);
  const recentOrders = orders.slice(0, 5);

  if (isLoading || isError) {
    return (
      <div className="page admin-dashboard">
        <header className="page-header dashboard-header">
          <div className="dashboard-header-info">
            <h1 className="page-title">
              Panel de Control <img src={bunnyGif} alt="Tokki Bunny" className="dashboard-title-bunny" width={32} height={32} />
            </h1>
            <p className="page-subtitle">Un resumen rápido de tu tienda</p>
          </div>
        </header>
        {isError ? <ErrorState onRetry={retry} /> : <LoadingSpinner fullPage />}
      </div>
    );
  }

  return (
    <div className="page admin-dashboard">
      <header className="page-header dashboard-header">
        <div className="dashboard-header-info">
          <h1 className="page-title">
            Panel de Control <img src={bunnyGif} alt="Tokki Bunny" className="dashboard-title-bunny" width={32} height={32} />
          </h1>
          <p className="page-subtitle">Un resumen rápido de tu tienda</p>
        </div>
        <div className="dashboard-quick-actions">
          <Link to={ADMIN_ROUTES.createOrder} className="btn btn-primary btn-sm dashboard-action-btn">
            + Nuevo Pedido
          </Link>
          <Link to={`${ADMIN_ROUTES.products}?new=1`} className="btn btn-outline btn-sm dashboard-action-btn">
            + Agregar Producto
          </Link>
        </div>
      </header>

      {metrics.pendingCount > 0 && (
        <Link
          to={`${ADMIN_ROUTES.orders}?status=pending`}
          className="pending-orders-banner animate-slideUp"
        >
          <div className="pending-banner-left">
            <span className="pending-banner-dot" aria-hidden="true" />
            <span className="pending-banner-text">
              Tienes{' '}
              <strong>
                {metrics.pendingCount}{' '}
                {metrics.pendingCount === 1 ? 'pedido pendiente' : 'pedidos pendientes'}
              </strong>{' '}
              por revisar
              {metrics.pendingRevenue > 0 && (
                <span className="pending-banner-amount">
                  {' '}
                  ({formatPrice(metrics.pendingRevenue.toString())} por cobrar)
                </span>
              )}
            </span>
          </div>
          <span className="pending-banner-cta font-display">Revisar &rarr;</span>
        </Link>
      )}

      <DashboardStatsGrid metrics={metrics} />

      <Suspense fallback={<LoadingSpinner />}>
        <DashboardCharts
          orders={orders}
          salesByDay={salesByDay}
          pendingCount={metrics.pendingCount}
          approvedCount={metrics.approvedCount}
          canceledCount={metrics.canceledCount}
        />
      </Suspense>

      <div className="dashboard-bottom-grid">
        <TopProductsCard auth={auth} />

        {/* Recent Orders */}
        <section className="dashboard-section recent-orders card animate-slideUp">
          <div className="section-header">
            <div className="section-header-title-wrap">
              <h2 className="section-title">Pedidos Recientes</h2>
              <span className="section-subtitle text-muted">Últimas transacciones registradas</span>
            </div>
            <Link to={ADMIN_ROUTES.orders} className="section-link-action">
              Ver pedidos &rarr;
            </Link>
          </div>
          <div className="recent-orders-list">
            {recentOrders.map((order) => (
              <Link
                key={order.order_id}
                to={ADMIN_ROUTES.orderDetail(order.order_id)}
                className="recent-order-item recent-order-link"
              >
                <div className="ro-left">
                  <span className="ro-id">#{order.order_id}</span>
                  <span className="ro-name">{order.name} {order.last_name}</span>
                  <span className="ro-date text-muted">{formatDate(order.created_at).split(',')[0]}</span>
                </div>
                <div className="ro-right">
                  <StatusBadge status={order.status} />
                  <span className="ro-total font-display">{formatPrice(order.total_amount)}</span>
                </div>
              </Link>
            ))}
          </div>
          <div className="section-footer">
            <Link to={ADMIN_ROUTES.orders} className="btn btn-outline btn-block">Ver todos los pedidos</Link>
          </div>
        </section>
      </div>
    </div>
  );
}
