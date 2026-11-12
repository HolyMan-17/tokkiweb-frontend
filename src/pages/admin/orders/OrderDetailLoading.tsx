import LoadingSpinner from '../../../components/ui/LoadingSpinner';

/** Pending branch of the admin order detail page. */
export function OrderDetailLoading() {
  return (
    <div className="page order-detail-page">
      <LoadingSpinner fullPage />
    </div>
  );
}

export default OrderDetailLoading;
