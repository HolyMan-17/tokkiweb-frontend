import { useNavigate } from 'react-router-dom';
import './OrderConfirmationPage.css';
import { ROUTES } from '../../lib/routes';
import { usePageMeta } from '../../hooks/usePageMeta';
import { NotFoundError } from '../../api/orders';
import { useOrderReceipt } from './useOrderReceipt';
import { ConfirmationLoading } from './ConfirmationLoading';
import { ConfirmationErrorState } from './ConfirmationErrorState';
import { ConfirmationReceipt } from './ConfirmationReceipt';

export default function OrderConfirmationPage() {
  usePageMeta({
    title: 'Confirmación de Pedido | Tokki Shop',
    noindex: true,
  });
  const navigate = useNavigate();
  const { order, isLoading, isError, error, retry } = useOrderReceipt();

  if (isLoading && !order) {
    return <ConfirmationLoading />;
  }

  if (isError && !order) {
    return (
      <ConfirmationErrorState
        notFound={error instanceof NotFoundError}
        onRetry={retry}
        onHome={() => navigate(ROUTES.home)}
      />
    );
  }

  if (!order) return null;

  return <ConfirmationReceipt order={order} onHome={() => navigate(ROUTES.home)} />;
}
