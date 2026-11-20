import { useMemo, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { fetchOrderSummaries } from '../../../api/orders';
import { fetchAllProducts } from '../../../api/products';
import { useAsync } from '../../../hooks/useAsync';
import { useAdminAuth } from '../../../components/auth/useAdminAuth';
import StatusBadge from '../../../components/ui/StatusBadge';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import ErrorState from '../../../components/ui/ErrorState';
import TopProductsCard from './TopProductsCard';
import { ADMIN_ROUTES } from '../../../lib/routes';
import { formatPrice, formatDate } from '../../../constants';
import { computeSalesByDay } from '../../../utils/salesByDay';
import bunnyGif from '../../../assets/bunny.gif';
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

  const pendingCount = orders.filter(o => o.status === 'pending').length;
  const approvedCount = orders.filter(o => o.status === 'approved').length;
  const canceledCount = orders.filter(o => o.status === 'canceled').length;
  const totalOrders = orders.length;
  const totalProducts = products.length;
  const inStockCount = products.filter(p => p.qty_available > 0 && p.in_stock).length;
  const outOfStockCount = products.filter(p => p.qty_available === 0 || !p.in_stock).length;
  const lowStockCount = products.filter(p => p.in_stock && p.qty_available > 0 && p.qty_available <= 3).length;
  const totalSales = orders
    .filter(o => o.status === 'approved')
    .reduce((s, o) => s + Number(o.total_amount), 0);

  const salesByDay = computeSalesByDay(orders);
  const recentOrders = orders.slice(0, 5);

  if (isLoading || isError) {
    return (
      <div className="page admin-dashboard">
        <header className="page-header">
          <h1 className="page-title">
            Panel de Control <img src={bunnyGif} alt="Tokki Bunny" className="dashboard-title-bunny" width={32} height={32} />
          </h1>
          <p className="page-subtitle">Un resumen rápido de tu tienda</p>
        </header>
        {isError ? <ErrorState onRetry={retry} /> : <LoadingSpinner fullPage />}
      </div>
    );
  }

  return (
    <div className="page admin-dashboard">
      <header className="page-header">
        <h1 className="page-title">
          Panel de Control <img src={bunnyGif} alt="Tokki Bunny" className="dashboard-title-bunny" width={32} height={32} />
        </h1>
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

        <Link
          to={`${ADMIN_ROUTES.products}?stock=alert`}
          className="card stat-card stat-card-link animate-slideUp"
          aria-label="Ver alertas de stock"
        >
          <div className="stat-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <div className={`stat-value font-display ${lowStockCount + outOfStockCount > 0 ? 'text-warning' : 'text-success'}`}>
            {lowStockCount + outOfStockCount}
          </div>
          <div className="stat-label text-muted">Alertas Stock</div>
          <div className="stat-sub">
            <span className="text-warning">{lowStockCount} bajo</span> • <span className="text-danger">{outOfStockCount} agotado</span>
          </div>
        </Link>
      </section>

      <Suspense fallback={<LoadingSpinner />}>
        <DashboardCharts
          orders={orders}
          salesByDay={salesByDay}
          pendingCount={pendingCount}
          approvedCount={approvedCount}
          canceledCount={canceledCount}
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

