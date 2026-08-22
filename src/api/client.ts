import type { ApiResponse } from '../types';

const BASE = '/api';

type ApiOptions = RequestInit & {
  /** Pass `useAuth().getToken` from Clerk context to attach a Bearer token. */
  getToken?: () => Promise<string | null>;
};

/**
 * Shared fetch wrapper.
 * – Prepends `/api`
 * – JSON-parses the response
 * – Normalises the `success/data/message` envelope
 *   (handles `row` / `updated_row` product quirks)
 */
export async function api<T = unknown>(
  path: string,
  options: ApiOptions = {},
): Promise<{ ok: true; data: T; message?: string } | { ok: false; message: string }> {
  const { getToken, ...fetchOptions } = options;
  const url = `${BASE}${path}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string> | undefined),
  };

  const token = await getToken?.();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...fetchOptions, headers });

  const json: ApiResponse<T> = await res.json();

  // Normalise `success` (backend sometimes sends string "true"/"false")
  const success =
    json.success === true || json.success === 'true';

  if (!success) {
    return { ok: false, message: json.message ?? 'Unknown error' };
  }

  // Normalise data (handle `row` / `updated_row` quirks)
  const data = (json.data ?? json.row ?? json.updated_row) as T;

  return { ok: true, data, message: json.message };
}
