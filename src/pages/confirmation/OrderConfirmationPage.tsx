import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './OrderConfirmationPage.css';
import { useCart } from '../../context/CartContext';
import { formatPrice } from '../../constants';

export default function OrderConfirmationPage() {
  const { clearCart, items, total } = useCart();
  const navigate = useNavigate();

  // Save items and total in case we want to display them before clearing
  // For a real app, this would come from a server response state or location.state
  const savedItems = [...items];
  const savedTotal = total;

  useEffect(() => {
    // Clear cart on mount
    clearCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="page confirmation-page animate-fadeIn text-center">
      <div className="success-icon-container animate-scaleIn">
        <div className="success-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
      </div>

      <h1 className="page-title text-primary mt-lg">¡Pedido confirmado!</h1>
      <p className="order-id">Pedido #1001</p>
      
      <div className="status-badge-container mt-md mb-lg">
        <span className="badge badge-pending">Pendiente</span>
      </div>

      <p className="confirmation-message">
        El vendedor revisará tu pedido pronto. Te contactaremos para coordinar el pago y la entrega.
      </p>

      {savedItems.length > 0 && (
        <div className="order-summary-card card stagger mt-lg text-left">
          <h2 className="section-title">Resumen</h2>
          <div className="summary-list">
            {savedItems.map(item => (
              <div key={item.product.product_id} className="summary-row">
                <span>{item.quantity}x {item.product.product_name}</span>
                <span>{formatPrice(Number(item.product.product_price) * item.quantity)}</span>
              </div>
            ))}
          </div>
          <div className="summary-total-row">
            <span>Total</span>
            <span className="text-primary">{formatPrice(savedTotal)}</span>
          </div>
        </div>
      )}

      <button className="btn btn-primary btn-lg btn-block mt-xl" onClick={() => navigate('/')}>
        Volver al inicio
      </button>
    </div>
  );
}
