import StatusBadge from '../../components/ui/StatusBadge';
import { getCustomerOrderWhatsAppLink } from '../../utils/whatsapp';
import { OrderSummaryCard } from './OrderSummaryCard';
import type { OrderDetail } from '../../types';

interface ConfirmationReceiptProps {
  order: OrderDetail;
  onHome: () => void;
}

/** Success branch of the confirmation page — the receipt itself. */
export function ConfirmationReceipt({ order, onHome }: ConfirmationReceiptProps) {
  const orderStatus = order.status || 'pending';
  const whatsappLink = getCustomerOrderWhatsAppLink(order);

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

      <OrderSummaryCard order={order} />

      <div className="confirmation-actions mt-xl">
        <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-whatsapp btn-lg btn-block"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
          Confirmar por WhatsApp
        </a>

        <button className="btn btn-outline btn-lg btn-block" onClick={onHome}>
          Volver al inicio
        </button>
      </div>
    </div>
  );
}

export default ConfirmationReceipt;
