import { formatPrice } from '../../../constants';
import type { OrderItem } from '../../../types';
import {
  resolveItemImageUrl,
  resolveItemInitialLetter,
  type CatalogImageMap,
} from './orderDetailHelpers';

interface OrderItemRowProps {
  item: OrderItem;
  catalogImageMap: CatalogImageMap;
}

/** A single line of the order — photo (or placeholder), quantity and prices. */
export function OrderItemRow({ item, catalogImageMap }: OrderItemRowProps) {
  const imageUrl = resolveItemImageUrl(item, catalogImageMap);
  const initialLetter = resolveItemInitialLetter(item.product_name);

  return (
    <div className="order-item-row">
      <div className="item-info">
        <div className="item-image-container">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={item.product_name}
              className="item-image-thumb"
              loading="lazy"
            />
          ) : (
            <div className="item-image-placeholder">
              {initialLetter}
            </div>
          )}
        </div>
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
  );
}

export default OrderItemRow;
