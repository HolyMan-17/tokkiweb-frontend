import type { CartItem } from '../../types';
import { formatPrice } from '../../constants';
import {
  getEffectivePriceCents,
  getOriginalPriceCents,
  hasActiveDiscount,
} from '../../utils/pricing';
import ShippingCostNote from '../../components/ui/ShippingCostNote';

interface CheckoutSummarySectionProps {
  items: CartItem[];
  total: number;
}

export function CheckoutSummarySection({ items, total }: CheckoutSummarySectionProps) {
  return (
    <section className="form-section card">
      <h2 className="section-title">Resumen del pedido</h2>
      <div className="order-summary-items">
        {items.map((item) => {
          const discounted = hasActiveDiscount(item.product);
          const effectiveLine = (getEffectivePriceCents(item.product) * item.quantity) / 100;
          const originalLine = (getOriginalPriceCents(item.product) * item.quantity) / 100;
          return (
            <div key={item.product.product_id} className="summary-item">
              <span className="summary-item-name">
                {item.quantity}x{' '}
                <span className="line-item-name">{item.product.product_name}</span>
              </span>
              <span className="summary-item-price">
                {discounted && (
                  <del className="summary-item-original">{formatPrice(originalLine)}</del>
                )}
                <span>{formatPrice(effectiveLine)}</span>
              </span>
            </div>
          );
        })}
      </div>
      <div className="summary-total mt-md">
        <span>Total</span>
        <span className="text-primary">{formatPrice(total)}</span>
      </div>
      <ShippingCostNote className="mt-sm" />
    </section>
  );
}

export default CheckoutSummarySection;
