import { useEffect } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { fetchOrderReceipt } from '../../api/orders';
import { useAsync } from '../../hooks/useAsync';
import type { CreatedOrder, OrderDetail } from '../../types';

/** Shape the checkout hands over through the router state (fast-path). */
type RouterStateOrder =
  | OrderDetail
  | (CreatedOrder & { client?: { name: string; last_name: string; cedula?: string; tlf_num?: string } });

export interface OrderReceiptState {
  order: OrderDetail | null;
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  retry: () => void;
}

/**
 * Merges the router-state fast-path with the freshly fetched receipt.
 * The router state wins for every field it carries; the client block falls
 * back to the API copy when the state did not include one.
 */
function mergeOrder(
  rawStateOrder: RouterStateOrder | undefined,
  data: OrderDetail | undefined,
): OrderDetail | null {
  if (!rawStateOrder && !data) return null;

  return {
    ...(data ?? {}),
    ...(rawStateOrder ?? {}),
    client: (rawStateOrder && 'client' in rawStateOrder && rawStateOrder.client)
      ? rawStateOrder.client
      : (data && 'client' in data ? data.client : undefined),
  } as OrderDetail;
}

/**
 * Loads the receipt of the order being confirmed.
 *
 * Fast-path: the order created at checkout arrives via router state.
 * On refresh the state is gone, so we also fetch it by token from the API.
 */
export function useOrderReceipt(): OrderReceiptState {
  const { clearCart } = useCart();
  const location = useLocation();
  const { orderId: orderToken } = useParams(); // URL param is the order_token UUID

  const rawStateOrder = (location.state as { order?: RouterStateOrder } | null)?.order;

  const { data, isLoading, isError, error, retry } = useAsync(
    () => fetchOrderReceipt(String(orderToken)),
    [orderToken],
  );

  const order = mergeOrder(rawStateOrder, data);

  useEffect(() => {
    // Clear the cart once the order has been captured.
    if (!order) return;
    clearCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { order, isLoading, isError, error, retry };
}

export default useOrderReceipt;
