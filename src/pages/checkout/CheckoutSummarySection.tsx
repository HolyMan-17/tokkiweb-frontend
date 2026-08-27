import type { CartItem } from '../../types';
import { formatPrice } from '../../constants';

interface CheckoutSummarySectionProps {
  items: CartItem[];
  total: number;
}

export function CheckoutSummarySection({ items, total }: CheckoutSummarySectionProps) {
  return (
    <section className="form-section card">
      <h2 className="section-title">Resumen del pedido</h2>
      <div className="order-summary-items">
        {items.map((item) => (
          <div key={item.product.product_id} className="summary-item">
            <span className="summary-item-name">
              {item.quantity}x {item.product.product_name}
            </span>
            <span className="summary-item-price">
              {formatPrice(Number(item.product.product_price) * item.quantity)}
            </span>
          </div>
        ))}
      </div>
      <div className="summary-total mt-md">
        <span>Total</span>
        <span className="text-primary">{formatPrice(total)}</span>
      </div>
    </section>
  );
}

export default CheckoutSummarySection;
