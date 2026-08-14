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
        <button className="back-btn" onClick={() => navigate(-1)}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        </button>
        <h1 className="page-title">Detalle de Pedido</h1>
      </header>

      <div className="card summary-card animate-slideUp">
        <div className="summary-header">
          <h2 className="order-id">#{order.order_id}</h2>
          <StatusBadge status={order.status} />
        </div>
        <p className="order-date">{formatDateTime(order.created_at)}</p>
      </div>

      <div className="card client-card animate-slideUp" style={{ animationDelay: '0.1s' }}>
        <h3>Información del Cliente</h3>
        <p><strong>Nombre:</strong> {order.client.name} {order.client.last_name}</p>
        <p><strong>Teléfono:</strong> {order.client.tlf_num}</p>
      </div>

      <div className="card items-card animate-slideUp" style={{ animationDelay: '0.2s' }}>
        <h3>Artículos</h3>
        <div className="items-list">
          {order.items.map((item, idx) => (
            <div key={idx} className="order-item-row">
              <div className="item-info">
                <span className="item-qty">{item.product_qty}x</span>
                <span className="item-name">{item.product_name}</span>
              </div>
              <div className="item-totals">
                <span className="item-price">{formatPrice(item.product_price)} c/u</span>
                <span className="item-line-total">{formatPrice(item.product_total)}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="order-total-section">
          <span>Total del Pedido</span>
          <span className="total-amount">{formatPrice(order.total_amount)}</span>
        </div>
      </div>

      {order.status === 'pending' && (
        <div className="action-buttons animate-slideUp" style={{ animationDelay: '0.3s' }}>
          <button className="btn btn-success full-width" onClick={handleApprove}>
            Aprobar pedido
          </button>
          <button className="btn btn-danger-outline full-width" onClick={handleCancel}>
            Cancelar pedido
          </button>
        </div>
      )}
    </div>
  );
}
