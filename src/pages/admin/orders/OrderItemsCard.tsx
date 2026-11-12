import { formatPrice } from '../../../constants';
import type { OrderDetail } from '../../../types';
import type { CatalogImageMap } from './orderDetailHelpers';
import OrderItemRow from './OrderItemRow';

interface OrderItemsCardProps {
  order: OrderDetail;
  catalogImageMap: CatalogImageMap;
}

/** Items card of the admin order detail — the bought lines and the total. */
export function OrderItemsCard({ order, catalogImageMap }: OrderItemsCardProps) {
  return (
    <div className="card items-card">
      <h3 className="section-label">Artículos</h3>
      <div className="items-list">
        {order.items.map((item) => (
          <OrderItemRow
            key={`${item.product_name}-${item.product_price}`}
            item={item}
            catalogImageMap={catalogImageMap}
          />
        ))}
      </div>
      <div className="order-total-section">
        <span>Total</span>
        <span className="total-amount font-display text-primary">{formatPrice(order.total_amount)}</span>
      </div>
    </div>
  );
}

export default OrderItemsCard;
