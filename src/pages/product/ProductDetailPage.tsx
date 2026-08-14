import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import './ProductDetailPage.css';
import { MOCK_PRODUCTS } from '../../mock/data';
import { formatPrice } from '../../constants';
import { useCart } from '../../context/CartContext';
import QuantitySelector from '../../components/ui/QuantitySelector';

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  
  const [quantity, setQuantity] = useState(1);
  const [showToast, setShowToast] = useState(false);

  const product = MOCK_PRODUCTS.find(p => p.product_id === Number(id));

  if (!product) {
    return (
      <div className="page product-not-found">
        <h2 className="page-title">Producto no encontrado</h2>
        <button className="btn btn-primary mt-md" onClick={() => navigate('/')}>
          Volver al inicio
        </button>
      </div>
    );
  }

  const handleAddToCart = () => {
    addItem(product, quantity);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  return (
    <div className="page product-detail-page animate-fadeIn">
      <nav className="detail-nav">
        <Link to="/" className="back-link text-primary font-semibold">
          ← Volver
        </Link>
      </nav>

      <div className="product-image-container animate-scaleIn">
        <div className="product-image-placeholder">
          {product.product_name.charAt(0)}
        </div>
      </div>

      <div className="product-info stagger">
        <h1 className="product-name">{product.product_name}</h1>
        <div className="product-price">{formatPrice(product.product_price)}</div>
        
        <div className="product-badges">
          {product.in_stock ? (
            <span className="badge badge-stock">En stock ({product.qty_available})</span>
          ) : (
            <span className="badge badge-out-of-stock">Agotado</span>
          )}
        </div>

        <p className="product-description">
          {product.product_description}
        </p>

        {product.in_stock && (
          <div className="quantity-section">
            <span className="form-label">Cantidad</span>
            <QuantitySelector
              value={quantity}
              onChange={setQuantity}
              min={1}
              max={product.qty_available}
            />
          </div>
        )}

        <div className="action-section">
          <button
            className="btn btn-primary btn-lg btn-block"
            disabled={!product.in_stock}
            onClick={handleAddToCart}
          >
            {product.in_stock ? 'Agregar al carrito' : 'Producto agotado'}
          </button>
        </div>
      </div>

      {showToast && (
        <div className="toast animate-slideUp">
          ¡Agregado al carrito! 🛍️
        </div>
      )}
    </div>
  );
}
