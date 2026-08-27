import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import './ProductDetailPage.css';
import { fetchAllProducts } from '../../api/products';
import { useAsync } from '../../hooks/useAsync';
import { formatPrice } from '../../constants';
import { useCart } from '../../context/CartContext';
import { ROUTES } from '../../lib/routes';
import QuantitySelector from '../../components/ui/QuantitySelector';
import ErrorState from '../../components/ui/ErrorState';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import beatingHeart from '../../assets/beating_heart.gif';

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { data, isLoading, isError, retry } = useAsync(fetchAllProducts, [id]);
  const products = data ?? [];

  const [quantity, setQuantity] = useState(1);
  const [showToast, setShowToast] = useState(false);
  const toastTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    };
  }, []);

  const product = products.find(p => p.product_id === Number(id));

  if (isLoading) {
    return <LoadingSpinner fullPage />;
  }

  if (isError) {
    return <ErrorState onRetry={retry} />;
  }

  if (!product) {
    return (
      <div className="page product-not-found">
        <h2 className="page-title">Producto no encontrado</h2>
        <button className="btn btn-primary mt-md" onClick={() => navigate(ROUTES.home)}>
          Volver al inicio
        </button>
      </div>
    );
  }

  const handleAddToCart = () => {
    addItem(product, quantity);
    setShowToast(true);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setShowToast(false), 3000);
  };

  return (
    <div className="page product-detail-page animate-fadeIn">
      <nav className="detail-nav">
        <Link to={ROUTES.home} className="back-link text-primary font-semibold">
          ← Volver
        </Link>
      </nav>

      <div className="product-image-container animate-scaleIn">
        {product.product_image_url ? (
          <img
            src={product.product_image_url}
            alt={product.product_name}
            className="product-image"
          />
        ) : (
          <div className="product-image-placeholder">
            {product.product_name.charAt(0)}
          </div>
        )}
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
          <img src={beatingHeart} alt="" className="toast-bag" width={190} height={180} />
          ¡Agregado al carrito!
        </div>
      )}
    </div>
  );
}
