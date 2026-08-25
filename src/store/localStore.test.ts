import { describe, expect, test } from 'vitest';
import { toOrderSummary } from './localStore';
import type { OrderDetail } from '../types';

const ORDER: OrderDetail = {
  order_id: 42,
  status: 'pending',
  client: { name: 'María', last_name: 'Pérez', tlf_num: '+584141234567' },
  delivery_type: 'envio_nacional',
  payment_method: 'pago_movil',
  total_amount: '25.00',
  created_at: '2026-08-25T12:00:00.000Z',
  items: [
    // Two distinct products, three total units — item_count must be LINES (2),
    // matching the backend's COUNT(o_i.product_id), not units (3).
    { product_name: 'Hoodie', product_qty: 2, product_price: '10.00', product_total: '20.00' },
    { product_name: 'Pin', product_qty: 1, product_price: '5.00', product_total: '5.00' },
  ],
};

describe('toOrderSummary', () => {
  test('counts order LINES (distinct products), not total units', () => {
    expect(toOrderSummary(ORDER).item_count).toBe(2);
  });

  test('keeps client identity and totals intact', () => {
    const s = toOrderSummary(ORDER);
    expect(s.order_id).toBe(42);
    expect(s.name).toBe('María');
    expect(s.total_amount).toBe('25.00');
    expect(s.status).toBe('pending');
  });
});
