import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { NotFoundError } from '../../../api/orders';
import { useAdminAuth } from '../../../components/auth/useAdminAuth';
import { ADMIN_ROUTES } from '../../../lib/routes';
import { useOrderDetail } from './useOrderDetail';
import { useOrderStatusActions } from './useOrderStatusActions';
import OrderDetailErrorState from './OrderDetailErrorState';
import OrderDetailLoading from './OrderDetailLoading';
import OrderDetailNotFound from './OrderDetailNotFound';
import OrderDetailView from './OrderDetailView';
import './OrderDetailPage.css';

export default function OrderDetailPage() {
  const navigate = useNavigate();
  const { getAdminToken } = useAdminAuth();
  // Stable auth handle for API calls (Bearer via Clerk when mounted)
  const auth = useMemo(
    () => (getAdminToken ? { getToken: getAdminToken } : undefined),
    [getAdminToken],
  );
  const { order, isLoading, isError, error, retry, catalogImageMap } = useOrderDetail(auth);
  const { pendingAction, toast, requestAction, clearPendingAction, confirmAction } =
    useOrderStatusActions({ order, auth, retry });

  if (isLoading) {
    return <OrderDetailLoading />;
  }

  if (isError) {
    if (error instanceof NotFoundError) {
      return <OrderDetailNotFound onBack={() => navigate(ADMIN_ROUTES.orders)} />;
    }
    return <OrderDetailErrorState onRetry={retry} />;
  }

  if (!order) return null;

  return (
    <OrderDetailView
      order={order}
      catalogImageMap={catalogImageMap}
      pendingAction={pendingAction}
      toast={toast}
      onBack={() => navigate(-1)}
      onRequestAction={requestAction}
      onConfirmAction={confirmAction}
      onCancelAction={clearPendingAction}
    />
  );
}
