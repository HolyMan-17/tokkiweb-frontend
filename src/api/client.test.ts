import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { api } from './client';

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

describe('envelope normalization (success flag)', () => {
  test('success: true resolves ok:true with json.data', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ success: true, data: { id: 1 } }),
    );

    const result = await api<{ id: number }>('/ping');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toEqual({ id: 1 });
  });

  test('string "true" quirk is accepted and message passes through on success', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ success: 'true', message: "There's no registered products." }),
    );

    const result = await api('/ping');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.message).toBe("There's no registered products.");
  });

  test('success: false resolves ok:false with the backend message', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ success: false, message: 'Image exceeds the 5 MB size limit.' }),
    );

    const result = await api('/ping');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toBe('Image exceeds the 5 MB size limit.');
  });

  test('string "false" quirk resolves ok:false', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ success: 'false', message: 'Nope' }),
    );

    const result = await api('/ping');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toBe('Nope');
  });

  test('missing/unknown success value resolves ok:false with the fallback message', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { id: 1 } }));

    const result = await api('/ping');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toBe('Unknown error');
  });
});

describe('envelope normalization (data / row / updated_row quirks)', () => {
  test('json.data wins when all payload fields are present', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        success: true,
        data: { source: 'data' },
        row: { source: 'row' },
        updated_row: { source: 'updated_row' },
      }),
    );

    const result = await api<{ source: string }>('/ping');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toEqual({ source: 'data' });
  });

  test('falls back to json.row when data is absent (create-product quirk)', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ success: true, row: { source: 'row' } }),
    );

    const result = await api<{ source: string }>('/products');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toEqual({ source: 'row' });
  });

  test('null data falls through to row via ??.', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ success: true, data: null, row: { source: 'row' } }),
    );

    const result = await api<{ source: string }>('/products');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toEqual({ source: 'row' });
  });

  test('falls back to json.updated_row when data and row are absent (update quirk)', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ success: true, updated_row: { source: 'updated_row' } }),
    );

    const result = await api<{ source: string }>('/products/7');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toEqual({ source: 'updated_row' });
  });

  test('success with no payload field at all resolves ok:true with data undefined', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true }));

    const result = await api('/ping');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toBeUndefined();
  });
});

describe('request shaping', () => {
  test('prepends the /api base to the path by default', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true }));

    await api('/orders/3');

    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/orders/3');
  });

  test('reads VITE_API_URL as the base URL when set', async () => {
    vi.stubEnv('VITE_API_URL', 'https://backend.example.com/api');
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true }));

    await api('/orders/3');

    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe('https://backend.example.com/api/orders/3');
  });

  test('strips trailing slash from VITE_API_URL to avoid double-slash', async () => {
    vi.stubEnv('VITE_API_URL', 'https://backend.example.com/api/');
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true }));

    await api('/products');

    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe('https://backend.example.com/api/products');
  });

  test('JSON requests get Content-Type application/json by default', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true }));

    await api('/orders', { method: 'POST', body: JSON.stringify({ a: 1 }) });

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers['Content-Type']).toBe('application/json');
  });

  test('FormData body must NOT get a JSON Content-Type (multipart regression guard)', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true, data: {} }));
    const file = new File(['bytes'], 'foto.png', { type: 'image/png' });
    const form = new FormData();
    form.append('image', file);

    await api('/products/5/image', { method: 'POST', body: form });

    const [, init] = fetchMock.mock.calls[0];
    expect(init.body).toBeInstanceOf(FormData);
    expect(init.headers['Content-Type']).toBeUndefined();
  });
});

describe('auth header', () => {
  test('attaches Authorization when getToken resolves a token', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true, data: {} }));

    await api('/orders', { getToken: async () => 'clerk-token' });

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers.Authorization).toBe('Bearer clerk-token');
  });

  test('omits Authorization when getToken resolves null', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true, data: {} }));

    await api('/orders', { getToken: async () => null });

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers.Authorization).toBeUndefined();
  });

  test('omits Authorization when no getToken is provided', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true }));

    await api('/orders');

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers.Authorization).toBeUndefined();
  });
});

describe('network and parse resilience (A1 hardening)', () => {
  test('network failure (fetch rejects) returns ok:false with Spanish message', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    const result = await api('/products');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toBe('No se pudo conectar con el servidor');
  });

  test('non-JSON response (HTML 502) returns ok:false with Spanish message', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 502,
      json: async () => { throw new SyntaxError('Unexpected token <'); },
    });

    const result = await api('/products');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toBe('No se pudo conectar con el servidor');
    expect(result.status).toBe(502);
  });

  test('non-JSON response without status still returns ok:false gracefully', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: undefined,
      json: async () => { throw new SyntaxError('Unexpected token <'); },
    });

    const result = await api('/products');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toBe('No se pudo conectar con el servidor');
  });

  test('getToken rejection is caught and returns ok:false', async () => {
    const result = await api('/orders', {
      getToken: async () => { throw new Error('Clerk unavailable'); },
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toBe('No se pudo conectar con el servidor');
  });
});
