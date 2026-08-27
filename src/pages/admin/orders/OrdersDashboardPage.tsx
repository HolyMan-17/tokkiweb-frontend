import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchOrderSummaries } from '../../../api/orders';
import { useAsync } from '../../../hooks/useAsync';
import { useAdminAuth } from '../../../components/auth/useAdminAuth';
import {
  formatPrice,
  formatDate,
  getDeliveryLabel,
  getPaymentLabel,
} from '../../../constants';
import { getWhatsAppLink } from '../../../utils/whatsapp';
import { exportOrdersToCsv } from '../../../utils/exportOrders';
import { ADMIN_ROUTES } from '../../../lib/routes';
import StatusBadge from '../../../components/ui/StatusBadge';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import ErrorState from '../../../components/ui/ErrorState';
import './OrdersDashboardPage.css';

type FilterStatus = 'all' | 'pending' | 'approved' | 'canceled';

export default function OrdersDashboardPage() {
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
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
  const orders = useMemo(() => data ?? [], [data]);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (filter !== 'all' && order.status !== filter) return false;
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase().trim();
      const fullName = `${order.name} ${order.last_name}`.toLowerCase();
      const idStr = String(order.order_id);
      const cedulaRaw = (order.cedula ?? '').toLowerCase();
      const cedulaDigits = cedulaRaw.replace(/[-]/g, '');
      const queryDigits = q.replace(/[-]/g, '');
      const phoneRaw = (order.tlf_num ?? '').toLowerCase();
      const phoneDigits = phoneRaw.replace(/\D/g, '');
      const queryPhoneDigits = q.replace(/\D/g, '');

      return (
        fullName.includes(q) ||
        idStr.includes(q) ||
        cedulaRaw.includes(q) ||
        (queryDigits.length > 0 && cedulaDigits.includes(queryDigits)) ||
        phoneRaw.includes(q) ||
        (queryPhoneDigits.length > 0 && phoneDigits.includes(queryPhoneDigits))
      );
    });
  }, [orders, filter, searchQuery]);

  if (isLoading || isError) {
    return (
      <div className="page orders-dashboard">
        <header className="page-header orders-page-header">
          <h1 className="page-title">Pedidos <span>({filteredOrders.length})</span></h1>
          <div className="orders-header-actions">
            <Link
              to={ADMIN_ROUTES.createOrder}
              className="btn btn-create-order"
            >
              + Nuevo Pedido
            </Link>
          </div>
        </header>
        {isError ? <ErrorState onRetry={retry} /> : <LoadingSpinner fullPage />}
      </div>
    );
  }

  return (
    <div className="page orders-dashboard">
      <header className="page-header orders-page-header">
        <h1 className="page-title">Pedidos <span>({filteredOrders.length})</span></h1>
        <div className="orders-header-actions">
          <Link
            to={ADMIN_ROUTES.createOrder}
            className="btn btn-create-order"
          >
            + Nuevo Pedido
          </Link>
          <button
            type="button"
            className="btn btn-export-csv"
            onClick={() => exportOrdersToCsv(filteredOrders)}
            disabled={filteredOrders.length === 0}
            title={filteredOrders.length === 0 ? 'No hay pedidos para exportar' : 'Exportar pedidos a CSV'}
            aria-label="Exportar pedidos a CSV"
          >
            <span className="export-icon" aria-hidden="true">📥</span>
            Exportar CSV
          </button>
        </div>
      </header>

      <div className="orders-toolbar">
        <div className="orders-search-wrapper">
          <svg
            className="orders-search-icon"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="search"
            className="orders-search-input"
            placeholder="Buscar por cédula, cliente o # pedido…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Buscar pedidos"
          />
          {searchQuery && (
            <button
              type="button"
              className="orders-search-clear"
              onClick={() => setSearchQuery('')}
              aria-label="Limpiar búsqueda"
            >
              ×
            </button>
          )}
        </div>

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
      </div>

      <div className="orders-list stagger">
        {filteredOrders.length > 0 ? (
          filteredOrders.map((order, index) => (
            <div 
              key={order.order_id} 
              className="card order-card animate-slideUp"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="order-card-header">
                <Link 
                  to={ADMIN_ROUTES.orderDetail(order.order_id)}
                  className="order-id order-card-stretched-link"
                >
                  #{order.order_id}
                </Link>
                <StatusBadge status={order.status} />
              </div>
              {(() => {
                const raw = order as unknown as Record<string, string>;
                const rawDelivery = order.delivery_type || raw.delivery_method || raw.delivery || raw.deliveryType || raw.metodo_entrega;
                const rawPayment = order.payment_method || raw.payment_type || raw.payment || raw.paymentMethod || raw.metodo_pago;
                if (!rawDelivery && !rawPayment) return null;
                return (
                  <div className="order-card-chips">
                    {rawDelivery && (
                      <span className="order-chip" title="Entrega">
                        {getDeliveryLabel(rawDelivery)}
                      </span>
                    )}
                    {rawPayment && (
                      <span className="order-chip order-chip--payment" title="Pago">
                        {getPaymentLabel(rawPayment)}
                      </span>
                    )}
                  </div>
                );
              })()}
              <div className="order-card-body">
                <div className="order-card-customer">
                  <p className="customer-name">{order.name} {order.last_name}</p>
                  <div className="customer-meta">
                    {order.cedula && (
                      <span className="customer-cedula" title="Cédula">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="2" y="5" width="20" height="14" rx="2"></rect>
                          <circle cx="8.5" cy="11" r="2"></circle>
                          <path d="M14 10h4M14 14h2"></path>
                        </svg>
                        {order.cedula}
                      </span>
                    )}
                    {order.tlf_num && (
                      <span className="customer-phone" title="Teléfono">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                        </svg>
                        {order.tlf_num}
                      </span>
                    )}
                  </div>
                </div>
                <div className="order-card-right">
                  <p className="order-total">{formatPrice(order.total_amount)}</p>
                  {order.tlf_num && (
                    <a
                      href={getWhatsAppLink(order.tlf_num, order.order_id, order.name)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="order-card-whatsapp-btn"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                      title={`Escribir a ${order.name} por WhatsApp`}
                      aria-label={`Contactar a ${order.name} por WhatsApp`}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                      </svg>
                      WhatsApp
                    </a>
                  )}
                </div>
              </div>
              <div className="order-card-footer">
                <span className="item-count">
                  {order.item_count} {order.item_count === 1 ? 'artículo' : 'artículos'}
                </span>
                <span className="order-date">{formatDate(order.created_at)}</span>
              </div>
            </div>
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
