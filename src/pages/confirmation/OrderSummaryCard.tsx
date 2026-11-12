import { formatPrice } from '../../constants';
import type { CreatedOrderItem, OrderDetail, OrderItem } from '../../types';

interface OrderSummaryCardProps {
  order: OrderDetail;
}

/** Summary card of the receipt — one row per item plus the order total. */
export function OrderSummaryCard({ order }: OrderSummaryCardProps) {
  if (!order.items || order.items.length === 0) return null;

  return (
    <div className="order-summary-card card stagger mt-lg text-left">
      <h2 className="section-title">Resumen</h2>
      <div className="summary-list">
        {(order.items as Array<OrderItem | CreatedOrderItem>).map((item) => {
          const name = 'product_name' in item ? item.product_name : item.name;
          const qty = 'product_qty' in item ? item.product_qty : item.ordered_qty;
          const total = 'product_total' in item
            ? item.product_total
            : (Number(item.price) * (item.ordered_qty || 1)).toFixed(2);
          const itemKey = 'product_name' in item ? `${item.product_name}-${item.product_price}` : `${item.id}-${item.price}`;

          return (
            <div key={itemKey} className="summary-row">
              <span className="summary-row-label">
                {qty}x <span className="line-item-name">{name}</span>
              </span>
              <span className="summary-row-total">{formatPrice(total)}</span>
            </div>
          );
        })}
      </div>
      <div className="summary-total-row">
        <span>Total</span>
        <span className="text-primary">{formatPrice(order.total_amount)}</span>
      </div>
    </div>
  );
}

export default OrderSummaryCard;
