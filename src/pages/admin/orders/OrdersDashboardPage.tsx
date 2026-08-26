import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchOrderSummaries } from '../../../api/orders';
import { useAsync } from '../../../hooks/useAsync';
import { useAdminAuth } from '../../../components/auth/useAdminAuth';
import {
  formatPrice,
  formatDate,
  DELIVERY_TYPES,
  PAYMENT_METHODS,
} from '../../../constants';
import { ADMIN_ROUTES } from '../../../lib/routes';
import StatusBadge from '../../../components/ui/StatusBadge';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import ErrorState from '../../../components/ui/ErrorState';
import './OrdersDashboardPage.css';

type FilterStatus = 'all' | 'pending' | 'approved' | 'canceled';

function deliveryLabel(slug: string): string {
  return DELIVERY_TYPES.find(d => d.value === slug)?.label ?? slug;
}

function paymentLabel(slug: string): string {
  return PAYMENT_METHODS.find(m => m.value === slug)?.label ?? slug;
}

export default function OrdersDashboardPage() {
  const [filter, setFilter] = useState<FilterStatus>('all');
  const { getAdminToken } = useAdminAuth();
  // Stable auth handle for API calls (Bearer via Clerk when mounted)
  const auth = useMemo(
    () => (getAdminToken ? { getToken: getAdminToken } : undefined),
    [getAdminToken],
  );
  const { data, isLoading, isError, retry } = useAsync(
    () => fetchOrderSummaries(auth),
    [auth],
  );
  const orders = data ?? [];

  const filteredOrders = orders.filter((order) => {
    if (filter === 'all') return true;
    return order.status === filter;
  });

  if (isLoading || isError) {
    return (
      <div className="page orders-dashboard">
        <header className="page-header">
          <h1 className="page-title">Pedidos <span>({filteredOrders.length})</span></h1>
        </header>
        {isError ? <ErrorState onRetry={retry} /> : <LoadingSpinner fullPage />}
      </div>
    );
  }

  return (
    <div className="page orders-dashboard">
      <header className="page-header">
        <h1 className="page-title">Pedidos <span>({filteredOrders.length})</span></h1>
      </header>

      <div className="filter-tabs-container">
        <div className="filter-tabs">
          <button 
            className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            Todos
          </button>
          <button 
            className={`filter-tab ${filter === 'pending' ? 'active' : ''}`}
            onClick={() => setFilter('pending')}
          >
            Pendientes
          </button>
          <button 
            className={`filter-tab ${filter === 'approved' ? 'active' : ''}`}
            onClick={() => setFilter('approved')}
          >
            Aprobados
          </button>
          <button 
            className={`filter-tab ${filter === 'canceled' ? 'active' : ''}`}
            onClick={() => setFilter('canceled')}
          >
            Cancelados
          </button>
        </div>
      </div>

      <div className="orders-list stagger">
        {filteredOrders.length > 0 ? (
          filteredOrders.map((order, index) => (
            <Link 
              key={order.order_id} 
              to={ADMIN_ROUTES.orderDetail(order.order_id)}
              className="card order-card animate-slideUp"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="order-card-header">
                <span className="order-id">#{order.order_id}</span>
                <StatusBadge status={order.status} />
              </div>
              {(order.delivery_type || order.payment_method) && (
                <div className="order-card-chips">
                  {order.delivery_type && (
                    <span className="order-chip" title="Entrega">
                      {deliveryLabel(order.delivery_type)}
                    </span>
                  )}
                  {order.payment_method && (
                    <span className="order-chip order-chip--payment" title="Pago">
                      {paymentLabel(order.payment_method)}
                    </span>
                  )}
                </div>
              )}
              <div className="order-card-body">
                <p className="customer-name">{order.name} {order.last_name}</p>
                <p className="order-total">{formatPrice(order.total_amount)}</p>
              </div>
              <div className="order-card-footer">
                <span className="item-count">
                  {order.item_count} {order.item_count === 1 ? 'artículo' : 'artículos'}
                </span>
                <span className="order-date">{formatDate(order.created_at)}</span>
              </div>
            </Link>
          ))
        ) : (
          <div className="empty-state">
            <p>No se encontraron pedidos con este filtro.</p>
          </div>
        )}
      </div>
    </div>
  );
}
