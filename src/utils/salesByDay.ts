import type { OrderSummary } from '../types';
import { getDeliveryLabel, getPaymentLabel } from '../constants';

export type TimePeriod = 'day' | 'week' | 'month';
export type ChartMetric = 'revenue' | 'orders';

export interface SalesByDayPoint {
  label: string;
  fullLabel?: string;
  total: number;
}

export interface DistributionPoint {
  name: string;
  value: number;
  color: string;
}

const dayFormatter = new Intl.DateTimeFormat('es-VE', {
  weekday: 'short',
  day: 'numeric',
});

const fullDayFormatter = new Intl.DateTimeFormat('es-VE', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

const monthFormatter = new Intl.DateTimeFormat('es-VE', {
  month: 'short',
});

const fullMonthFormatter = new Intl.DateTimeFormat('es-VE', {
  month: 'long',
  year: 'numeric',
});

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function computeSalesByDay(
  orders: Pick<OrderSummary, 'total_amount' | 'status' | 'created_at'>[],
  today: Date | string = new Date(),
  days = 7,
): SalesByDayPoint[] {
  return computeSalesByPeriod(orders, { period: 'day', metric: 'revenue', referenceDate: today, days });
}

export function computeSalesByPeriod(
  orders: Pick<OrderSummary, 'total_amount' | 'status' | 'created_at'>[],
  options: {
    period?: TimePeriod;
    metric?: ChartMetric;
    referenceDate?: Date | string;
    days?: number;
  } = {},
): SalesByDayPoint[] {
  const {
    period = 'day',
    metric = 'revenue',
    referenceDate = new Date(),
    days = 7,
  } = options;

  const refDate = typeof referenceDate === 'string' ? new Date(referenceDate) : referenceDate;

  if (period === 'day') {
    const totals = new Map<string, number>();
    for (const order of orders) {
      if (metric === 'revenue' && order.status !== 'approved') continue;
      if (metric === 'orders' && order.status === 'canceled') continue;

      const key = dayKey(new Date(order.created_at));
      const val = metric === 'revenue' ? Number(order.total_amount) : 1;
      totals.set(key, (totals.get(key) ?? 0) + val);
    }

    const points: SalesByDayPoint[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(refDate);
      d.setDate(d.getDate() - i);
      const raw = dayFormatter.format(d).replace('.', '').replace(',', '');
      const capitalized = raw.charAt(0).toUpperCase() + raw.slice(1);
      
      const fullRaw = fullDayFormatter.format(d);
      const fullCapitalized = fullRaw.charAt(0).toUpperCase() + fullRaw.slice(1);

      points.push({
        label: capitalized,
        fullLabel: fullCapitalized,
        total: totals.get(dayKey(d)) ?? 0,
      });
    }
    return points;
  }

  if (period === 'week') {
    const currentYear = refDate.getFullYear();
    const currentMonth = refDate.getMonth();
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

    // Monday-based ISO calendar weeks that span across the month
    const firstDayOfWeek = firstDayOfMonth.getDay();
    const mondayOffset = firstDayOfWeek === 0 ? -6 : 1 - firstDayOfWeek;
    const startMonday = new Date(currentYear, currentMonth, 1 + mondayOffset, 0, 0, 0, 0);

    interface WeekBucket {
      start: Date;
      end: Date;
      label: string;
      fullLabel: string;
      total: number;
    }

    const weeks: WeekBucket[] = [];
    const currentWeekStart = new Date(startMonday);

    while (currentWeekStart <= lastDayOfMonth) {
      const weekStart = new Date(currentWeekStart);
      const weekEnd = new Date(currentWeekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      const startD = String(weekStart.getDate()).padStart(2, '0');
      const startM = String(weekStart.getMonth() + 1).padStart(2, '0');
      const endD = String(weekEnd.getDate()).padStart(2, '0');
      const endM = String(weekEnd.getMonth() + 1).padStart(2, '0');

      const label = `${startD}/${startM} - ${endD}/${endM}`;

      const startDay = weekStart.getDate();
      const endDay = weekEnd.getDate();
      const startMonth = monthFormatter.format(weekStart).replace('.', '').toLowerCase();
      const endMonth = monthFormatter.format(weekEnd).replace('.', '').toLowerCase();

      const fullLabel = weekStart.getMonth() === weekEnd.getMonth()
        ? `${startDay} - ${endDay} ${startMonth}`
        : `${startDay} ${startMonth} - ${endDay} ${endMonth}`;

      weeks.push({
        start: weekStart,
        end: weekEnd,
        label,
        fullLabel,
        total: 0,
      });

      currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    }

    for (const order of orders) {
      if (metric === 'revenue' && order.status !== 'approved') continue;
      if (metric === 'orders' && order.status === 'canceled') continue;

      const orderTime = new Date(order.created_at).getTime();
      const val = metric === 'revenue' ? Number(order.total_amount) : 1;

      for (const w of weeks) {
        if (orderTime >= w.start.getTime() && orderTime <= w.end.getTime()) {
          w.total += val;
          break;
        }
      }
    }

    return weeks.map((w) => ({
      label: w.label,
      fullLabel: w.fullLabel,
      total: w.total,
    }));
  }

  if (period === 'month') {
    const currentYear = refDate.getFullYear();
    const monthTotals = new Array(12).fill(0);

    for (const order of orders) {
      if (metric === 'revenue' && order.status !== 'approved') continue;
      if (metric === 'orders' && order.status === 'canceled') continue;

      const orderDate = new Date(order.created_at);
      if (orderDate.getFullYear() === currentYear) {
        const m = orderDate.getMonth();
        const val = metric === 'revenue' ? Number(order.total_amount) : 1;
        monthTotals[m] += val;
      }
    }

    return monthTotals.map((tot, m) => {
      const d = new Date(currentYear, m, 1);
      const rawMonth = monthFormatter.format(d).replace('.', '');
      const label = rawMonth.charAt(0).toUpperCase() + rawMonth.slice(1);

      const fullRaw = fullMonthFormatter.format(d);
      const fullLabel = fullRaw.charAt(0).toUpperCase() + fullRaw.slice(1);

      return {
        label,
        fullLabel,
        total: tot,
      };
    });
  }

  return [];
}

const PAYMENT_PALETTE: Record<string, string> = {
  pago_movil: '#e68bbe', // --p5 primary
  binance: '#f4b8da',    // --p3
  zelle: '#4caf80',      // success green
  paypal: '#5b9bd5',     // soft blue
  cash: '#e8a44d',       // warning amber
};

const DELIVERY_PALETTE: Record<string, string> = {
  envio_nacional: '#eea1cd', // --p4
  delivery: '#e68bbe',       // --p5
  retiro_tienda: '#4caf80',  // success green
};

const FALLBACK_COLORS = ['#e68bbe', '#f4b8da', '#4caf80', '#e8a44d', '#5b9bd5', '#a28089'];

export function computePaymentDistribution(
  orders: Pick<OrderSummary, 'payment_method'>[],
): DistributionPoint[] {
  const counts = new Map<string, number>();
  for (const order of orders) {
    const method = order.payment_method || 'no_especificado';
    counts.set(method, (counts.get(method) ?? 0) + 1);
  }

  return Array.from(counts.entries()).map(([method, value], idx) => ({
    name: getPaymentLabel(method),
    value,
    color: PAYMENT_PALETTE[method.toLowerCase()] || FALLBACK_COLORS[idx % FALLBACK_COLORS.length],
  }));
}

export function computeDeliveryDistribution(
  orders: Pick<OrderSummary, 'delivery_type'>[],
): DistributionPoint[] {
  const counts = new Map<string, number>();
  for (const order of orders) {
    const type = order.delivery_type || 'no_especificado';
    counts.set(type, (counts.get(type) ?? 0) + 1);
  }

  return Array.from(counts.entries()).map(([type, value], idx) => ({
    name: getDeliveryLabel(type),
    value,
    color: DELIVERY_PALETTE[type.toLowerCase()] || FALLBACK_COLORS[idx % FALLBACK_COLORS.length],
  }));
}
