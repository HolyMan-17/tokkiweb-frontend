import { memo, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import './ProductCard.css';
import type { Product } from '../../types';
import { formatPrice } from '../../constants';
import { useCartActions } from '../../context/CartContext';
import { ROUTES } from '../../lib/routes';

interface ProductCardProps {
  product: Product;
  deferImage?: boolean;
  priority?: boolean;
}

export const ProductCard = memo(function ProductCard({
  product,
  deferImage = false,
  priority = false,
}: ProductCardProps) {
  const { addItem } = useCartActions();
  const [popped, setPopped] = useState(false);
  const popTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (popTimerRef.current !== null) {
        window.clearTimeout(popTimerRef.current);
      }
    };
  }, []);

  const handleAdd = () => {
    if (!product.in_stock) return;
    addItem(product, 1);
    setPopped(true);
    if (popTimerRef.current !== null) {
      window.clearTimeout(popTimerRef.current);
    }
    popTimerRef.current = window.setTimeout(() => {
      popTimerRef.current = null;
      setPopped(false);
    }, 600);
  };

  return (
    <article
      className={`product-card ${!product.in_stock ? 'out-of-stock' : ''} ${popped ? 'popped' : ''}`}
    >
      <Link to={ROUTES.product(product.product_id)} className="card-link">
        <div className="card-frame">
          <div className="card-img-wrap">
            {product.product_image_url ? (
              deferImage ? (
                <div className="card-img-deferred" aria-hidden="true" />
              ) : (
                <img
                  src={product.product_image_url}
                  alt={product.product_name}
                  loading={priority ? 'eager' : 'lazy'}
                  fetchPriority={priority ? 'high' : undefined}
                  decoding="async"
                  className="card-img"
                />
              )
            ) : (
              <div className="card-img-placeholder">
                {product.product_name.charAt(0).toUpperCase()}
              </div>
            )}
            {!product.in_stock && (
              <div className="sold-out-ribbon">Agotado</div>
            )}
          </div>
        </div>

        <div className="card-body">
          <p className="card-name">{product.product_name}</p>
          <p className="card-price">{formatPrice(product.product_price)}</p>
        </div>
      </Link>

      <button
        type="button"
        className="card-add-btn"
        onClick={handleAdd}
        disabled={!product.in_stock}
        aria-label={`Agregar ${product.product_name} al carrito`}
      >
        +
      </button>
    </article>
  );
});

export default ProductCard;
