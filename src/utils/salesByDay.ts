import type { OrderSummary } from '../types';

export interface SalesByDayPoint {
  label: string;
  total: number;
}

const dayFormatter = new Intl.DateTimeFormat('es-VE', {
  weekday: 'short',
  day: 'numeric',
});

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function computeSalesByDay(
  orders: Pick<OrderSummary, 'total_amount' | 'status' | 'created_at'>[],
  today: Date | string = new Date(),
  days = 7,
): SalesByDayPoint[] {
  const endDate = typeof today === 'string' ? new Date(today) : today;

  const totals = new Map<string, number>();
  for (const order of orders) {
    if (order.status !== 'approved') continue;
    const key = dayKey(new Date(order.created_at));
    totals.set(key, (totals.get(key) ?? 0) + Number(order.total_amount));
  }

  const points: SalesByDayPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(endDate);
    d.setDate(d.getDate() - i);
    points.push({ label: dayFormatter.format(d), total: totals.get(dayKey(d)) ?? 0 });
  }
  return points;
}
