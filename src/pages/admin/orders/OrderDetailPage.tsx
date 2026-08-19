import { useNavigate } from 'react-router-dom';
import { MOCK_ORDER_DETAIL } from '../../../mock/data';
import { formatPrice, formatDateTime } from '../../../constants';
import StatusBadge from '../../../components/ui/StatusBadge';
import './OrderDetailPage.css';

export default function OrderDetailPage() {
  const navigate = useNavigate();
  
  // In a real app we would fetch by id. Using mock directly for now.
  const order = MOCK_ORDER_DETAIL;

  const handleApprove = () => {
    console.log(`Approving order ${order.order_id}`);
    // mock action
  };

  const handleCancel = () => {
    console.log(`Canceling order ${order.order_id}`);
    // mock action
  };

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
            <button className="btn btn-outline cancel-btn" onClick={handleCancel}>
              Cancelar
            </button>
            <button className="btn btn-success" onClick={handleApprove}>
              Aprobar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
