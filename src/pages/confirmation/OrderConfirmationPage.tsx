import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './OrderConfirmationPage.css';
import { ErrorState } from '../../components/ui/ErrorState';
import { useCart } from '../../context/CartContext';
import { formatPrice } from '../../constants';
import { ROUTES } from '../../lib/routes';
import type { OrderDetail } from '../../types';

export default function OrderConfirmationPage() {
  const { clearCart } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  // Order created at checkout is passed via router state.
  const order = (location.state as { order?: OrderDetail } | null)?.order;

  useEffect(() => {
    // Clear the cart once the order has been captured from state.
    if (!order) return;
    clearCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!order) {
    return (
      <div className="page confirmation-page animate-fadeIn text-center">
        <ErrorState
          title="Pedido no encontrado"
          message="No encontramos los datos de tu pedido. Si acabas de comprar, revisa tu historial o vuelve al inicio."
        />
        <button className="btn btn-primary btn-lg btn-block mt-xl" onClick={() => navigate(ROUTES.home)}>
          Volver al inicio
        </button>
      </div>
    );
  }

  const savedItems = order.items;
  const savedTotal = order.total_amount;

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
      <p className="order-id">Pedido #{order.order_id}</p>

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
            {savedItems.map((item, idx) => (
              <div key={idx} className="summary-row">
                <span>{item.product_qty}x {item.product_name}</span>
                <span>{formatPrice(item.product_total)}</span>
              </div>
            ))}
          </div>
          <div className="summary-total-row">
            <span>Total</span>
            <span className="text-primary">{formatPrice(savedTotal)}</span>
          </div>
        </div>
      )}

      <button className="btn btn-primary btn-lg btn-block mt-xl" onClick={() => navigate(ROUTES.home)}>
        Volver al inicio
      </button>
    </div>
  );
}
