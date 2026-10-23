import { useEffect, useRef, useState, useCallback } from 'react';
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
import sparklesGif from '../../assets/sparkles.gif';

const DEFAULT_DOC_TITLE = 'Tokki Shop — Accesorios y Dulces Coreanos';

interface ToastState {
  message: string;
  icon: string;
}

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { data, isLoading, isError, retry } = useAsync(fetchAllProducts, [id]);
  const products = data ?? [];

  const [quantity, setQuantity] = useState(1);
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    };
  }, []);

  const product = products.find(p => p.product_id === Number(id));

  // Dynamic document title update with cleanup on unmount
  useEffect(() => {
    if (!product) return;
    document.title = `${product.product_name} — ${formatPrice(product.product_price)} | Tokki Shop`;
    return () => {
      document.title = DEFAULT_DOC_TITLE;
    };
  }, [product]);

  const triggerToast = useCallback((message: string, icon = beatingHeart) => {
    setToast({ message, icon });
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 3000);
  }, []);

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
    triggerToast('¡Agregado al carrito!', beatingHeart);
  };

  const handleShare = async () => {
    const formattedPrice = formatPrice(product.product_price);
    const shareTitle = `${product.product_name} — ${formattedPrice} | Tokki Shop`;
    const shareText = `¡Mira este producto en Tokki Shop! 🐰✨\n${product.product_name} — ${formattedPrice}`;
    const shareUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}${ROUTES.product(product.product_id)}`
        : '';

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') {
          return;
        }
      }
    }

    // Fallback for desktop: Copy to clipboard
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        triggerToast('¡Enlace copiado al portapapeles! 🐰', sparklesGif);
        return;
      } catch {
        // Fallback gracefully
      }
    }

    triggerToast('¡Enlace copiado al portapapeles! 🐰', sparklesGif);
  };

  return (
    <div className="page product-detail-page animate-fadeIn">
      <nav className="detail-nav">
        <Link to={ROUTES.home} className="back-link text-primary font-semibold">
          ← Volver
        </Link>
        <button
          type="button"
          className="share-btn text-primary font-semibold"
          onClick={handleShare}
          aria-label={`Compartir ${product.product_name}`}
        >
          <svg
            className="share-icon"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
          <span>Compartir</span>
        </button>
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

      {toast && (
        <div className="toast animate-slideUp">
          <img src={toast.icon} alt="" className="toast-bag" width={190} height={180} />
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
