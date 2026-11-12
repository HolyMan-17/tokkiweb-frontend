import { getDeliveryLabel, getPaymentLabel } from '../../../constants';
import type { OrderDetail } from '../../../types';
import { resolveDeliverySlug, resolvePaymentSlug } from './orderDetailHelpers';

interface OrderDeliveryCardProps {
  order: OrderDetail;
}

/** Delivery & payment card of the admin order detail. */
export function OrderDeliveryCard({ order }: OrderDeliveryCardProps) {
  return (
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
            {getDeliveryLabel(resolveDeliverySlug(order))}
          </span>
        </p>
        <p className="delivery-row">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
            <line x1="1" y1="10" x2="23" y2="10"></line>
          </svg>
          <span className="delivery-label">Pago</span>
          <span className="delivery-value">
            {getPaymentLabel(resolvePaymentSlug(order))}
          </span>
        </p>
      </div>
    </div>
  );
}

export default OrderDeliveryCard;
