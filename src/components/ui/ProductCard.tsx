import { useState } from 'react';
import { Link } from 'react-router-dom';
import './ProductCard.css';
import type { Product } from '../../types';
import { formatPrice } from '../../constants';
import { useCart } from '../../context/CartContext';
import { ROUTES } from '../../lib/routes';

export function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();
  const [popped, setPopped] = useState(false);

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!product.in_stock) return;
    addItem(product, 1);
    setPopped(true);
    setTimeout(() => setPopped(false), 600);
  };

  return (
    <Link
      to={ROUTES.product(product.product_id)}
      className={`product-card ${!product.in_stock ? 'out-of-stock' : ''} ${popped ? 'popped' : ''}`}
    >
      <div className="card-frame">
        <div className="card-img-wrap">
          <div className="card-img-placeholder">
            {product.product_name.charAt(0)}
          </div>
          {!product.in_stock && (
            <div className="sold-out-ribbon">Agotado</div>
          )}
        </div>
      </div>

      <div className="card-body">
        <p className="card-name">{product.product_name}</p>
        <p className="card-price">{formatPrice(product.product_price)}</p>
      </div>

      <button
        className="card-add-btn"
        onClick={handleAdd}
        disabled={!product.in_stock}
        aria-label={`Agregar ${product.product_name} al carrito`}
      >
        +
      </button>
    </Link>
  );
}

export default ProductCard;
