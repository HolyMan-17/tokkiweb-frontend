// ─── Orders API client — mirrors the backend contract 1:1 ────────────────────
// Endpoints (FRONTEND_REQUIREMENTS §4.2):
//   POST   /orders                public — checkout, every new order is pending
//   GET    /orders                admin (Bearer) — summaries, newest first
//   GET    /orders/:order_id      public — full detail
//   PATCH  /orders/:order_id/cancel   admin — only while pending
//   PATCH  /orders/:id/approve        admin — only while pending

import { api, NotFoundError, type ApiResult } from './client';
import type {
  ApproveResult,
  CheckoutPayload,
  ClientInfo,
  CreateOrderPayload,
  CreatedOrder,
  OrderDetail,
  OrderListItem,
  OrderSummary,
} from '../types';

type AdminAuth = { getToken?: () => Promise<string | null> };

export { NotFoundError };
export type {
  ApproveResult,
  CheckoutPayload,
  ClientInfo,
  CreateOrderPayload,
  CreatedOrder,
  OrderDetail,
  OrderListItem,
  OrderSummary,
};

/** Checkout submission. The payload is sent verbatim: `tlf_num` already
 *  arrives as a full international E.164 number, so `country_code` stays
 *  omitted (§4.2 phone rules). Backend errors (400 stock/validation,
 *  404 product) surface as `ok:false` with their message for the toast. */
export async function createOrder(
  payload: CheckoutPayload,
): Promise<ApiResult<CreatedOrder>> {
  return api<CreatedOrder>('/orders', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/** Admin list. Empty shop quirk: success with NO data → []. */
export async function listOrders(auth?: AdminAuth): Promise<ApiResult<OrderSummary[]>> {
  const result = await api<OrderSummary[]>('/orders', {
    method: 'GET',
    getToken: auth?.getToken,
  });
  if (!result.ok) return result;
  return { ok: true, data: result.data ?? [], message: result.message, status: result.status };
}

/** Public guest order receipt (unauthenticated, keyed on unguessable UUID) */
export async function getOrderReceipt(
  orderToken: string,
): Promise<ApiResult<OrderDetail>> {
  return api<OrderDetail>(`/orders/receipt/${orderToken}`);
}

/** Admin single order detail (authenticated with Clerk Bearer token) */
export async function getOrderDetail(
  orderId: number | string,
  auth?: AdminAuth,
): Promise<ApiResult<OrderDetail>> {
  return api<OrderDetail>(`/orders/${orderId}`, {
    method: 'GET',
    getToken: auth?.getToken,
  });
}

/** Only valid while pending; 400 "already processed" surfaces via ok:false. */
export async function approveOrder(
  orderId: number,
  auth?: AdminAuth,
): Promise<ApiResult<ApproveResult>> {
  return api<ApproveResult>(`/orders/${orderId}/approve`, {
    method: 'PATCH',
    getToken: auth?.getToken,
  });
}

/** Only valid while pending (backend restores stock in-transaction). */
export async function cancelOrder(
  orderId: number,
  auth?: AdminAuth,
): Promise<ApiResult<unknown>> {
  return api(`/orders/${orderId}/cancel`, {
    method: 'PATCH',
    getToken: auth?.getToken,
  });
}

// ─── Page-facing loaders ───────────────────────────────────
// Thrown-error variants pairing with useAsync + <ErrorState>, same contract
// as fetchAllProducts. NotFoundError maps to the backend's 404s so screens
// can render their "not found" view.

export async function fetchOrderSummaries(auth?: AdminAuth): Promise<OrderSummary[]> {
  const result = await listOrders(auth);
  if (!result.ok) throw new Error(result.message);
  return result.data;
}

export async function fetchOrderDetail(
  orderId: number | string,
  auth?: AdminAuth,
): Promise<OrderDetail> {
  const result = await getOrderDetail(orderId, auth);
  if (!result.ok) {
    if (result.status === 404 || /doesn't exist|not found|no existe/i.test(result.message)) {
      throw new NotFoundError(result.message);
    }
    throw new Error(result.message);
  }
  return result.data;
}

export async function fetchOrderReceipt(orderToken: string): Promise<OrderDetail> {
  const result = await getOrderReceipt(orderToken);
  if (!result.ok) {
    if (result.status === 404 || /doesn't exist|not found|no existe/i.test(result.message)) {
      throw new NotFoundError(result.message);
    }
    throw new Error(result.message);
  }
  return result.data;
}
