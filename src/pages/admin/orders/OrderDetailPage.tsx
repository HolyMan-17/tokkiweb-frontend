import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useOrders, setOrderStatus } from '../../../store/localStore';
import { formatPrice, formatDateTime } from '../../../constants';
import { ADMIN_ROUTES } from '../../../lib/routes';
import StatusBadge from '../../../components/ui/StatusBadge';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import './OrderDetailPage.css';

type PendingAction = 'approve' | 'cancel' | null;

export default function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const orders = useOrders();
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  const order = orders.find(o => o.order_id === Number(id));

  const confirmAction = () => {
    if (!order || !pendingAction) return;
    setOrderStatus(order.order_id, pendingAction === 'approve' ? 'approved' : 'canceled');
    setPendingAction(null);
  };

  if (!order) {
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
            <p className="client-phone">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
              </svg>
              {order.client.tlf_num}
            </p>
          </div>
        </div>

        <div className="card items-card">
          <h3 className="section-label">Artículos</h3>
          <div className="items-list">
            {order.items.map((item, idx) => (
              <div key={idx} className="order-item-row">
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
