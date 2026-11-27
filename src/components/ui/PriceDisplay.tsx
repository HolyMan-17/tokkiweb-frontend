import { formatPrice } from '../../constants';
import {
  formatEffectivePrice,
  hasActiveDiscount,
  normalizeDiscountPercent,
  type PriceableProduct,
} from '../../utils/pricing';
import './PriceDisplay.css';

export interface PriceDisplayProps {
  product: PriceableProduct;
  showBadge?: boolean;
  size?: 'card' | 'detail' | 'compact' | 'admin';
  className?: string;
}

export function PriceDisplay({
  product,
  showBadge = false,
  size = 'card',
  className,
}: PriceDisplayProps) {
  const discounted = hasActiveDiscount(product);
  const pct = normalizeDiscountPercent(product.discount_percent);
  const originalFormatted = formatPrice(product.product_price);

  const rootClass = [
    'tokki-price',
    `tokki-price--${size}`,
    discounted ? 'tokki-price--discounted' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  if (!discounted) {
    return (
      <span className={rootClass}>
        <span className="tokki-price__current">{originalFormatted}</span>
      </span>
    );
  }

  return (
    <span className={rootClass}>
      <span className="tokki-price__current tokki-price__current--discounted">
        {formatEffectivePrice(product)}
      </span>
      <del
        className="tokki-price__original"
        aria-label={`Precio original ${originalFormatted}`}
      >
        {originalFormatted}
      </del>
      {showBadge && (
        <span
          className="tokki-price__badge"
          aria-label={`${pct}% de descuento`}
        >
          -{pct}%
        </span>
      )}
    </span>
  );
}

export default PriceDisplay;
