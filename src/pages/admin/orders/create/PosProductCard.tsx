import type { Product } from '../../../../types';
import { formatPrice } from '../../../../constants';

export interface PosProductCardProps {
  product: Product;
  selectedQty: number;
  onAddItem: (product: Product) => void;
  onUpdateQty: (productId: number, qty: number) => void;
  onRemoveItem: (productId: number) => void;
}

export function PosProductCard({
  product,
  selectedQty,
  onAddItem,
  onUpdateQty,
  onRemoveItem,
}: PosProductCardProps) {
  const isOutOfStock = product.qty_available <= 0 || !product.in_stock;
  const isMaxReached = selectedQty >= product.qty_available;

  return (
    <div
      className={`pos-product-card ${selectedQty > 0 ? 'card-selected' : ''} ${
        isOutOfStock ? 'card-out-of-stock' : ''
      }`}
    >
      {/* ── Visual Badge if Added ── */}
      {selectedQty > 0 && (
        <span
          className="pos-selected-badge"
          data-testid={`selected-badge-${product.product_id}`}
        >
          En pedido: {selectedQty}
        </span>
      )}

      {/* ── Thumbnail ── */}
      <div className="pos-product-thumb">
        {product.product_image_url ? (
          <img
            src={product.product_image_url}
            alt={product.product_name}
            loading="lazy"
            className="pos-thumb-img"
          />
        ) : (
          <div className="pos-thumb-placeholder">
            {product.product_name.charAt(0)}
          </div>
        )}
        {isOutOfStock && <span className="pos-sold-out-ribbon">Agotado</span>}
      </div>

      {/* ── Body ── */}
      <div className="pos-product-body">
        <span className="pos-product-category">{product.category}</span>
        <p className="pos-product-name" title={product.product_name}>
          {product.product_name}
        </p>
        <div className="pos-product-meta">
          <span className="pos-product-price">
            {formatPrice(product.product_price)}
          </span>
          <span
            className={`pos-stock-badge ${
              product.qty_available > 0
                ? product.qty_available <= 3
                  ? 'low-stock'
                  : 'in-stock'
                : 'out-of-stock'
            }`}
          >
            {product.qty_available > 0 ? (
              <>
                <span className="pos-stock-full">
                  {`${product.qty_available} ${
                    product.qty_available === 1 ? 'disponible' : 'disponibles'
                  }`}
                </span>
                <span className="pos-stock-short" aria-hidden="true">
                  {`${product.qty_available} disp.`}
                </span>
              </>
            ) : (
              'Agotado'
            )}
          </span>
        </div>
      </div>

      {/* ── Actions ── */}
      <div className="pos-product-actions">
        {selectedQty === 0 ? (
          <button
            type="button"
            className="btn btn-sm btn-primary pos-add-btn"
            disabled={isOutOfStock || isMaxReached}
            onClick={() => onAddItem(product)}
            aria-label={`Agregar ${product.product_name}`}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Agregar
          </button>
        ) : (
          <div className="pos-qty-stepper">
            <div className="pos-qty-controls">
              <button
                type="button"
                className="pos-qty-btn pos-qty-decrease"
                onClick={() => {
                  if (selectedQty <= 1) {
                    onRemoveItem(product.product_id);
                  } else {
                    onUpdateQty(product.product_id, selectedQty - 1);
                  }
                }}
                aria-label={`Disminuir cantidad de ${product.product_name}`}
              >
                &minus;
              </button>
              <span
                className="pos-qty-num"
                data-testid={`selected-qty-${product.product_id}`}
              >
                {selectedQty}
              </span>
              <button
                type="button"
                className="pos-qty-btn pos-qty-increase"
                disabled={isMaxReached}
                onClick={() => onUpdateQty(product.product_id, selectedQty + 1)}
                aria-label={`Aumentar cantidad de ${product.product_name}`}
              >
                +
              </button>
            </div>
            <button
              type="button"
              className="pos-remove-btn"
              onClick={() => onRemoveItem(product.product_id)}
              aria-label={`Quitar ${product.product_name} del pedido`}
              title="Quitar del pedido"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default PosProductCard;
