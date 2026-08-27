import type { FormEvent } from 'react';
import type { Product } from '../../../../types';
import { formatPrice } from '../../../../constants';
import sparklesGif from '../../../../assets/sparkles.gif';

export interface SelectedOrderItem {
  product: Product;
  quantity: number;
}

export interface OrderSummaryCardProps {
  selectedItems: SelectedOrderItem[];
  totalAmount: number;
  isFormValid: boolean;
  isSubmitting: boolean;
  onIncrement: (productId: number) => void;
  onDecrement: (productId: number) => void;
  onRemove: (productId: number) => void;
  onSubmit: (e: FormEvent) => void;
}

export function OrderSummaryCard({
  selectedItems,
  totalAmount,
  isFormValid,
  isSubmitting,
  onIncrement,
  onDecrement,
  onRemove,
  onSubmit,
}: OrderSummaryCardProps) {
  const totalItemCount = selectedItems.reduce((acc, i) => acc + i.quantity, 0);

  return (
    <div className="create-order-card summary-section-card">
      <h2 className="section-title font-display">
        Resumen del Pedido ({totalItemCount})
      </h2>

      {selectedItems.length === 0 ? (
        <div className="empty-cart-notice">
          <img
            src={sparklesGif}
            alt=""
            className="empty-sparkles-img"
            width={28}
            height={28}
          />
          <p className="empty-text">No hay productos seleccionados</p>
          <span className="empty-subtext">
            Selecciona artículos del catálogo a la derecha para agregarlos al pedido
          </span>
        </div>
      ) : (
        <div className="selected-items-list">
          {selectedItems.map(({ product, quantity }) => (
            <div
              key={product.product_id}
              className="selected-item-row"
              data-testid={`selected-item-${product.product_id}`}
            >
              <div className="selected-item-thumb">
                {product.product_image_url ? (
                  <img
                    src={product.product_image_url}
                    alt={product.product_name}
                    className="item-thumb-img"
                  />
                ) : (
                  <span className="item-thumb-placeholder">🐰</span>
                )}
              </div>

              <div className="selected-item-details">
                <p className="item-title">{product.product_name}</p>
                <span className="item-unit-price">
                  {formatPrice(product.product_price)} c/u
                </span>
              </div>

              <div className="selected-item-qty-controls">
                <button
                  type="button"
                  className="qty-btn"
                  onClick={() => onDecrement(product.product_id)}
                  aria-label={`Disminuir cantidad de ${product.product_name}`}
                >
                  -
                </button>
                <span className="qty-number">{quantity}</span>
                <button
                  type="button"
                  className="qty-btn"
                  onClick={() => onIncrement(product.product_id)}
                  aria-label={`Aumentar cantidad de ${product.product_name}`}
                >
                  +
                </button>
              </div>

              <div className="selected-item-total">
                <span className="line-total-price">
                  {formatPrice(Number(product.product_price) * quantity)}
                </span>
                <button
                  type="button"
                  className="btn-remove-item"
                  onClick={() => onRemove(product.product_id)}
                  aria-label={`Eliminar ${product.product_name}`}
                  title="Eliminar producto"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="order-total-bar">
        <span className="total-label">Total a Pagar:</span>
        <span className="total-value font-display">
          {formatPrice(totalAmount)}
        </span>
      </div>

      <button
        type="button"
        className="btn btn-primary btn-submit-order"
        disabled={!isFormValid || isSubmitting}
        onClick={onSubmit}
      >
        {isSubmitting
          ? 'Registrando...'
          : `Registrar Pedido (${formatPrice(totalAmount)})`}
      </button>
    </div>
  );
}
