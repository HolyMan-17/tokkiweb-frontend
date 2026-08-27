import type { ApiResponse } from '../types';

/** Base URL — reads `VITE_API_URL` from env, falls back to `/api` for the
 *  Vite dev proxy. Strips any trailing slash to avoid `//` in URLs. */
function getBaseUrl(): string {
  const raw = import.meta.env.VITE_API_URL ?? '/api';
  return raw.endsWith('/') ? raw.slice(0, -1) : raw;
}

/** User-facing fallback when the backend is unreachable or returns non-JSON. */
const NETWORK_ERROR_MSG = 'No se pudo conectar con el servidor';

type ApiOptions = RequestInit & {
  /** Pass `useAuth().getToken` from Clerk context to attach a Bearer token. */
  getToken?: () => Promise<string | null>;
};

/**
 * Shared fetch wrapper.
 * – Prepends the base URL (from `VITE_API_URL` env or `/api`)
 * – JSON-parses the response
 * – Normalises the `success/data/message` envelope
 *   (handles `row` / `updated_row` product quirks)
 * – Catches network failures and non-JSON responses gracefully
 */
export type ApiResult<T> =
  | { ok: true; data: T; message?: string; status?: number }
  | { ok: false; message: string; status?: number };

/** Thrown by page-facing loaders when the backend answers 404 — screens map
 *  it to their "not found" view instead of the generic error state. */
export class NotFoundError extends Error {
  constructor(message = 'Recurso no encontrado') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export async function api<T = unknown>(
  path: string,
  options: ApiOptions = {},
): Promise<ApiResult<T>> {
  try {
    const { getToken, ...fetchOptions } = options;
    const url = `${getBaseUrl()}${path}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(fetchOptions.headers as Record<string, string> | undefined),
    };

    if (fetchOptions.body instanceof FormData) {
      delete headers['Content-Type'];
    }

    const token = await getToken?.();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(url, { ...fetchOptions, headers });

    if (!res.ok) {
      let errorMessage = NETWORK_ERROR_MSG;
      try {
        const errJson = (await res.json()) as ApiResponse<unknown>;
        if (errJson && typeof errJson === 'object' && errJson.message) {
          errorMessage = errJson.message;
        }
      } catch {
        // Fall back to default error message if body is not JSON
      }
      return { ok: false, message: errorMessage, status: res.status };
    }

    let json: ApiResponse<T>;
    try {
      json = await res.json();
    } catch {
      // Non-JSON response (e.g. Vercel/host HTML 502 page)
      return { ok: false, message: NETWORK_ERROR_MSG, status: res.status };
    }

    // Normalise `success` (backend sometimes sends string "true"/"false")
    const success =
      json.success === true || json.success === 'true';

    if (!success) {
      return { ok: false, message: json.message ?? 'Unknown error', status: res.status };
    }

    // Normalise data (handle `row` / `updated_row` quirks)
    const data = (json.data ?? json.row ?? json.updated_row) as T;

    return { ok: true, data, message: json.message, status: res.status };
  } catch {
    // Network down, DNS failure, Clerk getToken crash, etc.
    return { ok: false, message: NETWORK_ERROR_MSG };
  }
}

