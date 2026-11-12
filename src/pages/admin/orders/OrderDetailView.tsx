import StatusBadge from '../../../components/ui/StatusBadge';
import { formatDateTime } from '../../../constants';
import type { OrderDetail } from '../../../types';
import type { CatalogImageMap } from './orderDetailHelpers';
import type { PendingAction, PendingOrderAction } from './useOrderStatusActions';
import OrderClientCard from './OrderClientCard';
import OrderDeliveryCard from './OrderDeliveryCard';
import OrderItemsCard from './OrderItemsCard';
import OrderStatusConfirmDialog from './OrderStatusConfirmDialog';

interface OrderDetailViewProps {
  order: OrderDetail;
  catalogImageMap: CatalogImageMap;
  pendingAction: PendingAction;
  toast: string | null;
  onBack: () => void;
  onRequestAction: (action: PendingOrderAction) => void;
  onConfirmAction: () => void;
  onCancelAction: () => void;
}

/** Success branch of the admin order detail page — the full order view. */
export function OrderDetailView({
  order,
  catalogImageMap,
  pendingAction,
  toast,
  onBack,
  onRequestAction,
  onConfirmAction,
  onCancelAction,
}: OrderDetailViewProps) {
  return (
    <div className="page order-detail-page">
      <header className="detail-header">
        <div className="detail-header-left">
          <button className="back-btn" onClick={onBack} aria-label="Volver">
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

        <OrderClientCard order={order} />

        <OrderDeliveryCard order={order} />

        <OrderItemsCard order={order} catalogImageMap={catalogImageMap} />

        {order.status === 'pending' && (
          <div className="action-buttons">
            <button className="btn btn-outline cancel-btn" onClick={() => onRequestAction('cancel')}>
              Cancelar
            </button>
            <button className="btn btn-success" onClick={() => onRequestAction('approve')}>
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
        <OrderStatusConfirmDialog
          action={pendingAction}
          onConfirm={onConfirmAction}
          onCancel={onCancelAction}
        />
      )}
    </div>
  );
}

export default OrderDetailView;
