// ─── Analytics API client — mirrors tokkiweb-backend API_CONTRACT §3 ──────────
// Endpoints:
//   GET /analytics/top-products  admin (Bearer) — ranked approved sales

import { api, type ApiResult } from './client';
import type { TopProductStat, TopProductsPeriod, TopProductsSort } from '../types';

type AdminAuth = { getToken?: () => Promise<string | null> };

export interface TopProductsParams {
  sort?: TopProductsSort;
  period?: TopProductsPeriod;
  limit?: number;
}

export async function getTopProducts(
  params?: TopProductsParams,
  auth?: AdminAuth,
): Promise<ApiResult<TopProductStat[]>> {
  const qs = new URLSearchParams();
  if (params?.sort) qs.set('sort', params.sort);
  if (params?.period) qs.set('period', params.period);
  if (params?.limit != null) qs.set('limit', String(params.limit));

  const suffix = qs.toString();
  const path = suffix ? `/analytics/top-products?${suffix}` : '/analytics/top-products';

  const result = await api<TopProductStat[]>(path, {
    method: 'GET',
    getToken: auth?.getToken,
  });
  if (!result.ok) return result;
  return { ok: true, data: result.data ?? [], message: result.message, status: result.status };
}

export async function fetchTopProducts(
  params?: TopProductsParams,
  auth?: AdminAuth,
): Promise<TopProductStat[]> {
  const result = await getTopProducts(params, auth);
  if (!result.ok) throw new Error(result.message);
  return result.data;
}
