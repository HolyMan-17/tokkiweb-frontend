import { memo, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import './ProductCard.css';
import type { Product } from '../../types';
import { useCartActions } from '../../context/CartContext';
import { ROUTES } from '../../lib/routes';
import { hasActiveDiscount, normalizeDiscountPercent } from '../../utils/pricing';
import { getProductCardImageAttrs } from '../../utils/productImage';
import PriceDisplay from './PriceDisplay';

interface ProductCardProps {
  product: Product;
  deferImage?: boolean;
  priority?: boolean;
  eager?: boolean;
}

function CardMedia({
  product,
  deferImage,
  priority,
  eager,
}: {
  product: Product;
  deferImage: boolean;
  priority: boolean;
  eager: boolean;
}) {
  if (!product.product_image_url) {
    return (
      <div className="card-img-placeholder">
        {product.product_name.charAt(0).toUpperCase()}
      </div>
    );
  }

  if (deferImage) {
    return <div className="card-img-deferred" aria-hidden="true" />;
  }

  const imgAttrs = getProductCardImageAttrs(product.product_image_url);
  return (
    <img
      {...imgAttrs}
      alt={product.product_name}
      width={400}
      height={400}
      loading={priority || eager ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : undefined}
      decoding="async"
      className="card-img"
    />
  );
}

export const ProductCard = memo(function ProductCard({
  product,
  deferImage = false,
  priority = false,
  eager = false,
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

  const discountPercent = normalizeDiscountPercent(product.discount_percent);
  const showDiscountBadge = hasActiveDiscount(product);

  return (
    <article
      className={`product-card ${!product.in_stock ? 'out-of-stock' : ''} ${showDiscountBadge ? 'has-discount' : ''} ${popped ? 'popped' : ''}`}
    >
      <Link to={ROUTES.product(product.product_id)} className="card-link">
        <div className="card-frame">
          <div className="card-img-wrap">
            {showDiscountBadge && (
              <span
                className="card-discount-badge"
                aria-label={`${discountPercent}% de descuento`}
              >
                -{discountPercent}%
              </span>
            )}
            <CardMedia
              product={product}
              deferImage={deferImage}
              priority={priority}
              eager={eager}
            />
            {!product.in_stock && (
              <div className="sold-out-ribbon">Agotado</div>
            )}
          </div>
        </div>

        <div className="card-body">
          <p className="card-name">{product.product_name}</p>
          <div className="card-price">
            <PriceDisplay product={product} showBadge={false} size="card" />
          </div>
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
