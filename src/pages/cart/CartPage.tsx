import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './CartPage.css';
import { useCart, type StockAdjustment } from '../../context/CartContext';
import { formatPrice } from '../../constants';
import { ROUTES } from '../../lib/routes';
import QuantitySelector from '../../components/ui/QuantitySelector';
import StockNotice from '../../components/ui/StockNotice';
import { fetchAllProducts } from '../../api/products';
import cartImg from '../../assets/cart.avif';

export default function CartPage() {
  const { items, total, removeItem, updateQuantity, reconcileStock } = useCart();
  const navigate = useNavigate();
  const [stockChanges, setStockChanges] = useState<StockAdjustment[]>([]);
  // reconcileStock changes identity whenever items change — keep the effect
  // one-shot per mount by always calling the latest via a ref.
  const reconcileRef = useRef(reconcileStock);
  useEffect(() => {
    reconcileRef.current = reconcileStock;
  }, [reconcileStock]);

  // Reconcile the persisted snapshots against fresh catalog data on mount.
  // Best-effort: if the API is unreachable we keep the cart as-is (checkout
  // re-checks before submitting and blocks there).
  useEffect(() => {
    let cancelled = false;
    fetchAllProducts()
      .then(products => {
        if (!cancelled) setStockChanges(reconcileRef.current(products));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const notice =
    stockChanges.length > 0 ? (
      <StockNotice changes={stockChanges} />
    ) : null;

  if (items.length === 0) {
    return (
      <div className="page cart-empty-state animate-fadeIn">
        {notice}
        <div className="empty-icon animate-scaleIn">
          <img src={cartImg} alt="Carrito vacío" width={300} height={319} />
        </div>
        <h2 className="empty-title">Tu carrito está vacío</h2>
        <p className="empty-subtitle">¡Explora nuestra tienda y encuentra tus productos favoritos!</p>
        <button className="btn btn-primary mt-lg" onClick={() => navigate(ROUTES.home)}>
          Ver productos
        </button>
      </div>
    );
  }

  return (
    <div className="page cart-page animate-fadeIn">
      <div className="page-header">
        <h1 className="page-title">Mi Carrito</h1>
        <p className="page-subtitle">{items.length} {items.length === 1 ? 'artículo' : 'artículos'}</p>
      </div>

      {notice}

      <div className="cart-items stagger">
        {items.map(item => (
          <div key={item.product.product_id} className="cart-item-card card">
            <div className="item-image-container">
              {item.product.product_image_url ? (
                <img
                  src={item.product.product_image_url}
                  alt={item.product.product_name}
                  className="item-image-thumb"
                  loading="lazy"
                />
              ) : (
                <div className="item-image-placeholder">
                  {item.product.product_name.charAt(0)}
                </div>
              )}
            </div>
            <div className="item-details">
              <h3 className="item-name">{item.product.product_name}</h3>
              <div className="item-price">{formatPrice(item.product.product_price)} c/u</div>
              <div className="item-actions">
                <QuantitySelector
                  value={item.quantity}
                  onChange={(val) => updateQuantity(item.product.product_id, val)}
                  min={1}
                  max={item.product.qty_available}
                />
              </div>
            </div>
            <div className="item-end">
              <button 
                className="btn-remove" 
                onClick={() => removeItem(item.product.product_id)}
                aria-label="Eliminar producto"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
              <div className="item-total-price">
                {formatPrice(Number(item.product.product_price) * item.quantity)}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="cart-summary card animate-slideUp">
        <div className="summary-row">
          <span className="summary-label">Subtotal</span>
          <span className="summary-value">{formatPrice(total)}</span>
        </div>
        <button 
          className="btn btn-primary btn-lg btn-block mt-md" 
          onClick={() => navigate(ROUTES.checkout)}
        >
          Proceder al pago
        </button>
      </div>
    </div>
  );
}
