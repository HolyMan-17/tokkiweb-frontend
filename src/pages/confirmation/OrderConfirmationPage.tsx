import { useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import './OrderConfirmationPage.css';
import { ErrorState } from '../../components/ui/ErrorState';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import StatusBadge from '../../components/ui/StatusBadge';
import { useCart } from '../../context/CartContext';
import { formatPrice } from '../../constants';
import { ROUTES } from '../../lib/routes';
import { fetchOrderReceipt, NotFoundError } from '../../api/orders';
import { useAsync } from '../../hooks/useAsync';
import type { CreatedOrder, OrderDetail } from '../../types';

export default function OrderConfirmationPage() {
  const { clearCart } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const { orderId: orderToken } = useParams(); // URL param is the order_token UUID

  // Fast-path: the order created at checkout arrives via router state.
  // On refresh the state is gone, so we also fetch it by token from the API.
  const stateOrder = (location.state as { order?: OrderDetail | CreatedOrder } | null)?.order;
  const { data, isLoading, isError, error, retry } = useAsync(
    () => fetchOrderReceipt(String(orderToken)),
    [orderToken],
  );

  const order = stateOrder ?? data;

  useEffect(() => {
    // Clear the cart once the order has been captured.
    if (!order) return;
    clearCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading && !order) {
    return (
      <div className="page confirmation-page">
        <LoadingSpinner fullPage />
      </div>
    );
  }

  if (isError && !order) {
    if (error instanceof NotFoundError) {
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
    return (
      <div className="page confirmation-page animate-fadeIn text-center">
        <ErrorState onRetry={retry} />
        <button className="btn btn-primary btn-lg btn-block mt-xl" onClick={() => navigate(ROUTES.home)}>
          Volver al inicio
        </button>
      </div>
    );
  }

  if (!order) return null;

  const orderStatus = order.status || 'pending';

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
        <StatusBadge status={orderStatus} />
      </div>

      <p className="confirmation-message">
        El vendedor revisará tu pedido pronto. Te contactaremos para coordinar el pago y la entrega.
      </p>

      {order.items && order.items.length > 0 && (
        <div className="order-summary-card card stagger mt-lg text-left">
          <h2 className="section-title">Resumen</h2>
          <div className="summary-list">
            {order.items.map((item) => {
              const name = 'product_name' in item ? item.product_name : item.name;
              const qty = 'product_qty' in item ? item.product_qty : item.ordered_qty;
              const total = 'product_total' in item
                ? item.product_total
                : (Number(item.price) * (item.ordered_qty || 1)).toFixed(2);
              const itemKey = 'product_name' in item ? `${item.product_name}-${item.product_price}` : `${item.id}-${item.price}`;

              return (
                <div key={itemKey} className="summary-row">
                  <span>{qty}x {name}</span>
                  <span>{formatPrice(total)}</span>
                </div>
              );
            })}
          </div>
          <div className="summary-total-row">
            <span>Total</span>
            <span className="text-primary">{formatPrice(order.total_amount)}</span>
          </div>
        </div>
      )}

      <button className="btn btn-primary btn-lg btn-block mt-xl" onClick={() => navigate(ROUTES.home)}>
        Volver al inicio
      </button>
    </div>
  );
}
