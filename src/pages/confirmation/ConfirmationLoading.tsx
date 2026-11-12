import LoadingSpinner from '../../components/ui/LoadingSpinner';

/** Pending branch of the confirmation page — shown while the receipt loads. */
export function ConfirmationLoading() {
  return (
    <div className="page confirmation-page">
      <LoadingSpinner fullPage />
    </div>
  );
}

export default ConfirmationLoading;
