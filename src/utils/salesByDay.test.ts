import { describe, expect, test } from 'vitest';
import { computeSalesByDay } from './salesByDay';
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
    ...overrides,
  } as OrderSummary;
}

describe('computeSalesByDay', () => {
  test('ignores non-approved orders', () => {
    const orders = [
      makeOrder({ status: 'pending', created_at: '2026-08-25T10:00:00.000Z' }),
      makeOrder({ status: 'canceled', created_at: '2026-08-25T11:00:00.000Z' }),
    ];
    expect(computeSalesByDay(orders, TODAY)).toEqual([
      { label: 'mié 19', total: 0 },
      { label: 'jue 20', total: 0 },
      { label: 'vie 21', total: 0 },
      { label: 'sáb 22', total: 0 },
      { label: 'dom 23', total: 0 },
      { label: 'lun 24', total: 0 },
      { label: 'mar 25', total: 0 },
    ]);
  });

  test('sums same-day approved orders with Number(total_amount)', () => {
    const orders = [
      makeOrder({ total_amount: '12.50', created_at: '2026-08-25T08:00:00.000Z' }),
      makeOrder({ total_amount: '7.5', created_at: '2026-08-25T20:00:00.000Z' }),
    ];
    const result = computeSalesByDay(orders, TODAY);
    expect(result[6].label).toBe('mar 25');
    expect(result[6].total).toBeCloseTo(20, 5);
  });

  test('fills missing days with 0 and keeps rolling window of 7 ending today', () => {
    const orders = [makeOrder({ total_amount: '30', created_at: '2026-08-19T12:00:00.000Z' })];
    const result = computeSalesByDay(orders, TODAY);
    expect(result).toHaveLength(7);
    expect(result[0]).toEqual({ label: 'mié 19', total: 30 });
    expect(result.slice(1).every((d) => d.total === 0)).toBe(true);
  });

  test('respects injected today and custom window length', () => {
    const orders = [
      makeOrder({ total_amount: '5', created_at: '2026-01-02T15:00:00.000Z' }),
      makeOrder({ total_amount: '9', created_at: '2026-01-04T23:59:59.999Z' }),
    ];
    const result = computeSalesByDay(orders, '2026-01-04T12:00:00.000Z', 4);
    expect(result.map((d) => d.label)).toEqual(['jue 1', 'vie 2', 'sáb 3', 'dom 4']);
    expect(result[0].total).toBe(0);
    expect(result[1].total).toBe(5);
    expect(result[2].total).toBe(0);
    expect(result[3].total).toBe(9);
  });

  test('formats labels as Spanish short weekday + day number (es-VE)', () => {
    const result = computeSalesByDay([], new Date('2026-12-25T18:00:00.000Z'));
    // 2026-12-19 → sábado, 2026-12-25 → viernes
    expect(result[0].label).toMatch(/^sáb/);
    expect(result[0].label.endsWith('19')).toBe(true);
    expect(result[6].label).toMatch(/^vie/);
    expect(result[6].label.endsWith('25')).toBe(true);
  });

  test('accepts a Date instance as injected today', () => {
    const orders = [makeOrder({ total_amount: '3', created_at: '2026-08-25T05:00:00.000Z' })];
    const result = computeSalesByDay(orders, new Date(TODAY));
    expect(result[6]).toEqual({ label: 'mar 25', total: 3 });
  });
});
