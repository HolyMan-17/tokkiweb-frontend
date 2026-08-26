import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  createOrder,
  listOrders,
  getOrderDetail,
  approveOrder,
  cancelOrder,
  fetchOrderSummaries,
  fetchOrderDetail,
  NotFoundError,
} from './orders';
import type { CheckoutPayload } from '../types';

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

const CREATE_PAYLOAD: CheckoutPayload = {
  client_info: {
    name: 'Jane',
    last_name: 'Doe',
    cedula: 'V-12345678',
    // Full international E.164 — country_code must stay omitted (§4.2).
    tlf_num: '+5841469996703',
  },
  delivery_type: 'envio_nacional',
  payment_method: 'pago_movil',
  items: [
    { product_id: 1, product_qty: 2 },
    { product_id: 2, product_qty: 1 },
  ],
};

describe('createOrder', () => {
  test('POSTs the checkout payload verbatim to /api/orders (public, no bearer)', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        {
          success: true,
          data: {
            order_id: 5,
            delivery_type: 'envio_nacional',
            payment_method: 'pago_movil',
            total_amount: '99.98',
            items: [{ id: 1, name: 'Tokki Hoodie', ordered_qty: 2, price: '49.99' }],
          },
          message: 'Order has been successfully created.',
        },
        201,
      ),
    );

    const result = await createOrder(CREATE_PAYLOAD);

    expect(fetchMock).toHaveBeenCalledWith('/api/orders', expect.any(Object));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/orders');
    expect(init.method).toBe('POST');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(init.headers.Authorization).toBeUndefined();
    // Body passes through untouched — backend owns validation/normalization.
    expect(JSON.parse(init.body)).toEqual(CREATE_PAYLOAD);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.order_id).toBe(5);
    expect(result.data.total_amount).toBe('99.98');
    expect(result.data.items[0]).toEqual({
      id: 1,
      name: 'Tokki Hoodie',
      ordered_qty: 2,
      price: '49.99',
    });
  });

  test('surfaces backend rejection (e.g. stock) as ok:false with its message', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        { success: false, message: 'Requested quantity is not available in the stock.' },
        400,
      ),
    );
    const result = await createOrder(CREATE_PAYLOAD);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toBe('Requested quantity is not available in the stock.');
  });
});

describe('listOrders', () => {
  test('GETs /api/orders newest-first with Bearer when auth is given', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        success: true,
        data: [
          {
            order_id: 7,
            name: 'María',
            last_name: 'González',
            cedula: 'V-26345678',
            tlf_num: '+584146999670',
            total_amount: '18.50',
            status: 'pending',
            item_count: 3,
            created_at: '2026-08-13T14:30:00.000Z',
          },
        ],
      }),
    );

    const result = await listOrders({ getToken: async () => 'clerk-token' });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/orders');
    expect(init.method).toBe('GET');
    expect(init.headers.Authorization).toBe('Bearer clerk-token');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toHaveLength(1);
    expect(result.data[0].item_count).toBe(3);
  });

  test('empty-list quirk (success without data) resolves ok with empty array', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ success: true, message: 'No orders have been placed.' }),
    );
    const result = await listOrders();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toEqual([]);
  });
});

describe('getOrderDetail', () => {
  const DETAIL = {
    order_id: 42,
    status: 'pending',
    client: { name: 'Jane', last_name: 'Doe', cedula: 'V-12345678', tlf_num: '+5841469996703' },
    delivery_type: 'delivery',
    payment_method: 'zelle',
    total_amount: '74.98',
    created_at: '2026-08-04T12:00:00.000Z',
    items: [
      {
        product_name: 'Tokki Hoodie',
        product_qty: 2,
        product_price: '49.99',
        product_total: '99.98',
      },
    ],
  };

  test('GETs /api/orders/:order_id and returns the full detail', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ success: true, data: DETAIL, message: 'Order retrieved.' }),
    );
    const result = await getOrderDetail(42);
    expect(fetchMock).toHaveBeenCalledWith('/api/orders/42', expect.any(Object));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.client.cedula).toBe('V-12345678');
    expect(result.data.delivery_type).toBe('delivery');
    expect(result.data.payment_method).toBe('zelle');
  });

  test('404 surfaces as ok:false with the backend message', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ success: false, message: "Order doesn't exist." }, 404),
    );
    const result = await getOrderDetail(999);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toBe("Order doesn't exist.");
  });

  test('fetchOrderDetail resolves the detail (thrown-error loader pairing)', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true, data: DETAIL }));
    const order = await fetchOrderDetail(42);
    expect(order.order_id).toBe(42);
  });

  test('fetchOrderDetail throws NotFoundError on missing order', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ success: false, message: "Order doesn't exist." }, 404),
    );
    await expect(fetchOrderDetail(999)).rejects.toBeInstanceOf(NotFoundError);
  });

  test('NotFoundError carries the backend message', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ success: false, message: "Order doesn't exist." }, 404),
    );
    const err = await fetchOrderDetail(999).catch((e: unknown) => e);
    expect((err as Error).message).toBe("Order doesn't exist.");
  });
});

describe('approveOrder / cancelOrder', () => {
  test('approve PATCHes /orders/:id/approve with Bearer and returns the new status', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        success: true,
        data: { order_id: 42, status: 'approved' },
        message: 'Order was successfully approved',
      }),
    );
    const result = await approveOrder(42, { getToken: async () => 'clerk-token' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/orders/42/approve');
    expect(init.method).toBe('PATCH');
    expect(init.headers.Authorization).toBe('Bearer clerk-token');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toEqual({ order_id: 42, status: 'approved' });
  });

  test('cancel PATCHes /orders/:id/cancel with Bearer', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ success: true, message: 'Order was canceled.' }),
    );
    const result = await cancelOrder(42, { getToken: async () => 'clerk-token' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/orders/42/cancel');
    expect(init.method).toBe('PATCH');
    expect(init.headers.Authorization).toBe('Bearer clerk-token');
    expect(result.ok).toBe(true);
  });

  test('cancel on a non-pending order surfaces the 400 message', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ success: false, message: 'Order can only be canceled while pending.' }, 400),
    );
    const result = await cancelOrder(42, { getToken: async () => 'clerk-token' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toBe('Order can only be canceled while pending.');
  });
});

describe('fetchOrderSummaries', () => {
  test('throws a plain Error with the backend message when the list fails', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ success: false, message: 'Unauthorized' }, 401),
    );
    await expect(fetchOrderSummaries()).rejects.toThrow('Unauthorized');
  });
});
