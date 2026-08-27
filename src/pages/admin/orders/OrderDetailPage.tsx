import { useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  fetchOrderDetail,
  approveOrder,
  cancelOrder,
  NotFoundError,
} from '../../../api/orders';
import { useAsync } from '../../../hooks/useAsync';
import { useAdminAuth } from '../../../components/auth/useAdminAuth';
import { formatPrice, formatDateTime, getDeliveryLabel, getPaymentLabel } from '../../../constants';
import { getWhatsAppLink } from '../../../utils/whatsapp';
import { ADMIN_ROUTES } from '../../../lib/routes';
import StatusBadge from '../../../components/ui/StatusBadge';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import ErrorState from '../../../components/ui/ErrorState';
import './OrderDetailPage.css';

type PendingAction = 'approve' | 'cancel' | null;

export default function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const isProcessingRef = useRef(false);
  const [toast, setToast] = useState<string | null>(null);
  const { getAdminToken } = useAdminAuth();
  // Stable auth handle for API calls (Bearer via Clerk when mounted)
  const auth = useMemo(
    () => (getAdminToken ? { getToken: getAdminToken } : undefined),
    [getAdminToken],
  );
  const { data: order, isLoading, isError, error, retry } = useAsync(
    () => fetchOrderDetail(Number(id), auth),
    [id, auth]
  );

  const confirmAction = async () => {
    if (!order || !pendingAction || isProcessingRef.current) return;
    isProcessingRef.current = true;
    const action = pendingAction;
    try {
      const result =
        action === 'approve'
          ? await approveOrder(order.order_id, auth)
          : await cancelOrder(order.order_id, auth);
      if (!result.ok) {
        // E.g. "Order has already been processed." / "…only be canceled while
        // pending." — surface the backend message and refresh the real state.
        setToast(result.message);
      } else {
        setToast(action === 'approve' ? 'Pedido aprobado.' : 'Pedido cancelado.');
      }
    } catch (err) {
      console.error('No se pudo actualizar el estado del pedido', err);
      setToast('No se pudo actualizar el pedido. Inténtalo de nuevo.');
    } finally {
      isProcessingRef.current = false;
      setPendingAction(null);
      retry();
    }
  };

  if (isLoading) {
    return (
      <div className="page order-detail-page">
        <LoadingSpinner fullPage />
      </div>
    );
  }

  if (isError) {
    if (error instanceof NotFoundError) {
      return (
        <div className="page product-not-found">
          <h2 className="page-title">Pedido no encontrado</h2>
          <button className="btn btn-primary mt-md" onClick={() => navigate(ADMIN_ROUTES.orders)}>
            Volver a pedidos
          </button>
        </div>
      );
    }
    return (
      <div className="page order-detail-page">
        <ErrorState onRetry={retry} />
      </div>
    );
  }

  if (!order) return null;

  return (
    <div className="page order-detail-page">
      <header className="detail-header">
        <div className="detail-header-left">
          <button className="back-btn" onClick={() => navigate(-1)} aria-label="Volver">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
          <h1 className="page-title font-display">Pedido #{order.order_id}</h1>
        </div>
        <StatusBadge status={order.status} />
      </header>

      <div className="stagger">
        <div className="card summary-card">
          <h2 className="order-id font-display">Pedido #{order.order_id}</h2>
          <div className="card-divider"></div>
          <p className="order-date text-muted">{formatDateTime(order.created_at)}</p>
        </div>

        <div className="card client-card">
          <h3 className="section-label">Cliente</h3>
          <div className="client-info">
            <p className="client-name">{order.client.name} {order.client.last_name}</p>
            {order.client.cedula && (
              <p className="client-phone">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="5" width="20" height="14" rx="2"></rect>
                  <circle cx="8.5" cy="11" r="2"></circle>
                  <path d="M14 10h4M14 14h2"></path>
                </svg>
                {order.client.cedula}
              </p>
            )}
            <p className="client-phone">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
              </svg>
              {order.client.tlf_num}
            </p>
            {order.client.tlf_num && (
              <a
                href={getWhatsAppLink(order.client.tlf_num, order.order_id, order.client.name)}
                target="_blank"
                rel="noopener noreferrer"
                className="whatsapp-btn"
                aria-label="Contactar por WhatsApp"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                </svg>
                Contactar por WhatsApp
              </a>
            )}
          </div>
        </div>

        <div className="card delivery-card">
          <h3 className="section-label">Entrega y pago</h3>
          <div className="delivery-info">
            <p className="delivery-row">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="3" width="15" height="13"></rect>
                <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
                <circle cx="5.5" cy="18.5" r="2.5"></circle>
                <circle cx="18.5" cy="18.5" r="2.5"></circle>
              </svg>
              <span className="delivery-label">Entrega</span>
              <span className="delivery-value">
                {getDeliveryLabel(
                  order.delivery_type ||
                  (order as unknown as Record<string, string>).delivery_method ||
                  (order as unknown as Record<string, string>).delivery ||
                  (order as unknown as Record<string, string>).deliveryType ||
                  (order as unknown as Record<string, string>).metodo_entrega
                )}
              </span>
            </p>
            <p className="delivery-row">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                <line x1="1" y1="10" x2="23" y2="10"></line>
              </svg>
              <span className="delivery-label">Pago</span>
              <span className="delivery-value">
                {getPaymentLabel(
                  order.payment_method ||
                  (order as unknown as Record<string, string>).payment_type ||
                  (order as unknown as Record<string, string>).payment ||
                  (order as unknown as Record<string, string>).paymentMethod ||
                  (order as unknown as Record<string, string>).metodo_pago
                )}
              </span>
            </p>
          </div>
        </div>

        <div className="card items-card">
          <h3 className="section-label">Artículos</h3>
          <div className="items-list">
            {order.items.map((item) => (
              <div key={`${item.product_name}-${item.product_price}`} className="order-item-row">
                <div className="item-info">
                  <span className="item-qty">{item.product_qty}x</span>
                  <div className="item-details">
                    <span className="item-name">{item.product_name}</span>
                    <span className="item-price">{formatPrice(item.product_price)} c/u</span>
                  </div>
                </div>
                <div className="item-totals">
                  <span className="item-line-total">{formatPrice(item.product_total)}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="order-total-section">
            <span>Total</span>
            <span className="total-amount font-display text-primary">{formatPrice(order.total_amount)}</span>
          </div>
        </div>

        {order.status === 'pending' && (
          <div className="action-buttons">
            <button className="btn btn-outline cancel-btn" onClick={() => setPendingAction('cancel')}>
              Cancelar
            </button>
            <button className="btn btn-success" onClick={() => setPendingAction('approve')}>
              Aprobar
            </button>
          </div>
        )}
      </div>

      {toast && (
        <div className="order-detail-toast" role="alert">
          {toast}
        </div>
      )}

      {pendingAction && (
        <ConfirmDialog
          open={pendingAction !== null}
          variant={pendingAction === 'approve' ? 'success' : 'danger'}
          title={pendingAction === 'approve' ? '¿Aprobar este pedido?' : '¿Cancelar este pedido?'}
          message={
            <>
              {pendingAction === 'approve'
                ? 'Al aprobar el pedido se confirma la venta.'
                : 'Al cancelar el pedido se restaurará el stock de los productos.'}
              {' '}Esta acción <strong>no se puede revertir</strong>.
            </>
          }
          confirmLabel={pendingAction === 'approve' ? 'Sí, aprobar' : 'Sí, cancelar'}
          onConfirm={confirmAction}
          onCancel={() => setPendingAction(null)}
        />
      )}
    </div>
  );
}
