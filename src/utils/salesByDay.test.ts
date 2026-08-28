import { describe, expect, test } from 'vitest';
import {
  computeSalesByDay,
  computeSalesByPeriod,
  computePaymentDistribution,
  computeDeliveryDistribution,
} from './salesByDay';
import type { OrderSummary } from '../types';

const TODAY = '2026-08-25T15:30:00.000Z';

function makeOrder(overrides: Partial<OrderSummary> = {}): OrderSummary {
  return {
    order_id: 1,
    name: 'Test',
    last_name: 'User',
    total_amount: '10',
    status: 'approved',
    created_at: TODAY,
    delivery_type: 'envio_nacional',
    payment_method: 'pago_movil',
    ...overrides,
  } as OrderSummary;
}

describe('computeSalesByDay', () => {
  test('ignores non-approved orders and capitalizes day labels', () => {
    const orders = [
      makeOrder({ status: 'pending', created_at: '2026-08-25T10:00:00.000Z' }),
      makeOrder({ status: 'canceled', created_at: '2026-08-25T11:00:00.000Z' }),
    ];
    const result = computeSalesByDay(orders, TODAY);
    expect(result).toHaveLength(7);
    expect(result[0].label).toMatch(/mi[eé] 19/i);
    expect(result[6].label).toMatch(/mar 25/i);
    expect(result[6].total).toBe(0);
  });

  test('sums same-day approved orders with Number(total_amount)', () => {
    const orders = [
      makeOrder({ total_amount: '12.50', created_at: '2026-08-25T08:00:00.000Z' }),
      makeOrder({ total_amount: '7.5', created_at: '2026-08-25T20:00:00.000Z' }),
    ];
    const result = computeSalesByDay(orders, TODAY);
    expect(result[6].label).toMatch(/mar 25/i);
    expect(result[6].total).toBeCloseTo(20, 5);
  });
});

describe('computeSalesByPeriod', () => {
  test('computes daily revenue for 7 rolling days', () => {
    const orders = [
      makeOrder({ total_amount: '25.00', created_at: '2026-08-25T10:00:00.000Z' }),
      makeOrder({ total_amount: '10.00', status: 'pending', created_at: '2026-08-25T11:00:00.000Z' }),
    ];
    const result = computeSalesByPeriod(orders, { period: 'day', metric: 'revenue', referenceDate: TODAY });
    expect(result).toHaveLength(7);
    expect(result[6].total).toBe(25);
  });

  test('computes daily order count (including all active orders)', () => {
    const orders = [
      makeOrder({ status: 'approved', created_at: '2026-08-25T10:00:00.000Z' }),
      makeOrder({ status: 'pending', created_at: '2026-08-25T11:00:00.000Z' }),
      makeOrder({ status: 'canceled', created_at: '2026-08-25T12:00:00.000Z' }),
    ];
    const result = computeSalesByPeriod(orders, { period: 'day', metric: 'orders', referenceDate: TODAY });
    expect(result[6].total).toBe(2); // approved + pending (excludes canceled)
  });

  test('computes weekly breakdown with date ranges across the month (Monday to Sunday in dd/mm - dd/mm and rich fullLabel)', () => {
    const orders = [
      makeOrder({ total_amount: '15.00', created_at: '2026-08-03T10:00:00.000Z' }), // Week of 03/08 - 09/08
      makeOrder({ total_amount: '30.00', created_at: '2026-08-10T10:00:00.000Z' }), // Week of 10/08 - 16/08
      makeOrder({ total_amount: '45.00', created_at: '2026-08-25T10:00:00.000Z' }), // Week of 24/08 - 30/08
    ];
    const result = computeSalesByPeriod(orders, { period: 'week', metric: 'revenue', referenceDate: TODAY });
    expect(result.length).toBeGreaterThanOrEqual(4);
    
    // Checks that date ranges are formatted as dd/mm - dd/mm (e.g. "03/08 - 09/08" or "31/08 - 06/09")
    const week2 = result.find(r => r.label.includes('03/08 - 09/08'));
    const week3 = result.find(r => r.label.includes('10/08 - 16/08'));
    const week5 = result.find(r => r.label.includes('24/08 - 30/08'));

    expect(week2).toBeDefined();
    expect(week2?.total).toBe(15);
    expect(week2?.fullLabel).toContain('3 - 9');
    expect(week3).toBeDefined();
    expect(week3?.total).toBe(30);
    expect(week3?.fullLabel).toContain('10 - 16');
    expect(week5).toBeDefined();
    expect(week5?.total).toBe(45);
    expect(week5?.fullLabel).toContain('24 - 30');
  });

  test('computes monthly breakdown for the current year (12 months with fullLabel)', () => {
    const orders = [
      makeOrder({ total_amount: '100.00', created_at: '2026-01-15T10:00:00.000Z' }),
      makeOrder({ total_amount: '200.00', created_at: '2026-08-20T10:00:00.000Z' }),
    ];
    const result = computeSalesByPeriod(orders, { period: 'month', metric: 'revenue', referenceDate: TODAY });
    expect(result).toHaveLength(12);
    expect(result[0].label).toMatch(/ene/i);
    expect(result[0].fullLabel).toMatch(/enero/i);
    expect(result[0].total).toBe(100);
    expect(result[7].label).toMatch(/ago/i);
    expect(result[7].fullLabel).toMatch(/agosto/i);
    expect(result[7].total).toBe(200);
  });
});

describe('computePaymentDistribution', () => {
  test('groups orders by payment method with labels and counts', () => {
    const orders = [
      makeOrder({ payment_method: 'pago_movil' }),
      makeOrder({ payment_method: 'pago_movil' }),
      makeOrder({ payment_method: 'zelle' }),
    ];
    const dist = computePaymentDistribution(orders);
    const pagoMovil = dist.find(d => d.name === 'Pago Móvil');
    const zelle = dist.find(d => d.name === 'Zelle');
    expect(pagoMovil?.value).toBe(2);
    expect(zelle?.value).toBe(1);
  });
});

describe('computeDeliveryDistribution', () => {
  test('groups orders by delivery type with labels and counts', () => {
    const orders = [
      makeOrder({ delivery_type: 'envio_nacional' }),
      makeOrder({ delivery_type: 'delivery' }),
      makeOrder({ delivery_type: 'delivery' }),
    ];
    const dist = computeDeliveryDistribution(orders);
    const envio = dist.find(d => d.name.includes('Envío Nacional'));
    const delivery = dist.find(d => d.name === 'Delivery');
    expect(envio?.value).toBe(1);
    expect(delivery?.value).toBe(2);
  });
});
