import { useCallback, useRef, useState } from 'react';
import { approveOrder, cancelOrder } from '../../../api/orders';
import type { ApiResult } from '../../../api/client';
import type { OrderDetail } from '../../../types';
import type { AdminApiAuth } from './orderDetailHelpers';

export type PendingOrderAction = 'approve' | 'cancel';
export type PendingAction = PendingOrderAction | null;

interface UseOrderStatusActionsParams {
  order: OrderDetail | undefined;
  auth?: AdminApiAuth;
  retry: () => void;
}

export interface OrderStatusActionsState {
  pendingAction: PendingAction;
  toast: string | null;
  requestAction: (action: PendingOrderAction) => void;
  clearPendingAction: () => void;
  confirmAction: () => Promise<void>;
}

/** Approves or cancels the order through the admin API. */
async function runOrderStatusAction(
  orderId: number,
  action: PendingOrderAction,
  auth?: AdminApiAuth,
): Promise<ApiResult<unknown>> {
  if (action === 'approve') {
    return approveOrder(orderId, auth);
  }
  return cancelOrder(orderId, auth);
}

/** Toast shown after the action — the backend message wins when it failed. */
function resolveStatusToast(
  action: PendingOrderAction,
  result: ApiResult<unknown>,
): string {
  if (!result.ok) {
    // E.g. "Order has already been processed." / "…only be canceled while
    // pending." — surface the backend message and refresh the real state.
    return result.message;
  }
  return action === 'approve' ? 'Pedido aprobado.' : 'Pedido cancelado.';
}

/**
 * Owns the approve/cancel lifecycle of the admin order detail: the pending
 * confirmation, the in-flight guard and the toast feedback.
 */
export function useOrderStatusActions({
  order,
  auth,
  retry,
}: UseOrderStatusActionsParams): OrderStatusActionsState {
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const isProcessingRef = useRef(false);
  const [toast, setToast] = useState<string | null>(null);

  const confirmAction = useCallback(async () => {
    if (!order || !pendingAction || isProcessingRef.current) return;
    isProcessingRef.current = true;
    const action = pendingAction;
    try {
      const result = await runOrderStatusAction(order.order_id, action, auth);
      setToast(resolveStatusToast(action, result));
    } catch (err) {
      console.error('No se pudo actualizar el estado del pedido', err);
      setToast('No se pudo actualizar el pedido. Inténtalo de nuevo.');
    } finally {
      isProcessingRef.current = false;
      setPendingAction(null);
      retry();
    }
  }, [order, pendingAction, auth, retry]);

  const requestAction = useCallback((action: PendingOrderAction) => {
    setPendingAction(action);
  }, []);

  const clearPendingAction = useCallback(() => {
    setPendingAction(null);
  }, []);

  return {
    pendingAction,
    toast,
    requestAction,
    clearPendingAction,
    confirmAction,
  };
}

export default useOrderStatusActions;
