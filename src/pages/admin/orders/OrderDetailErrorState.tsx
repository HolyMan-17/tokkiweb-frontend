import ErrorState from '../../../components/ui/ErrorState';

interface OrderDetailErrorStateProps {
  onRetry: () => void;
}

/** Failure branch of the admin order detail page — retryable load error. */
export function OrderDetailErrorState({ onRetry }: OrderDetailErrorStateProps) {
  return (
    <div className="page order-detail-page">
      <ErrorState onRetry={onRetry} />
    </div>
  );
}

export default OrderDetailErrorState;
