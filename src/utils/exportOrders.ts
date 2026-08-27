import type { OrderSummary } from '../types';
import { formatDate, getDeliveryLabel, getPaymentLabel } from '../constants';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  approved: 'Aprobado',
  canceled: 'Cancelado',
};

/**
 * Returns the localized label for an order status.
 */
export function getOrderStatusLabel(status?: string | null): string {
  if (!status || !status.trim()) return 'Pendiente';
  const key = status.trim().toLowerCase();
  return STATUS_LABELS[key] ?? status;
}

/**
 * Escapes a single CSV value according to standard RFC 4180 rules.
 * Neutralizes spreadsheet formula injection (CWE-1236) if string starts with =, +, @, \t, \r.
 * If the value contains commas, quotes, or line breaks, it is wrapped in double quotes
 * and any internal double quotes are escaped as two double quotes ("").
 */
export function escapeCsvField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  let str = String(value);

  // Neutralize CSV formula injection for spreadsheet programs
  if (/^[=+@\t\r]/.test(str) || (/^-/.test(str) && isNaN(Number(str)))) {
    str = `'${str}`;
  }

  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

const CSV_HEADERS = [
  'ID Pedido',
  'Fecha',
  'Cliente',
  'Cédula',
  'Teléfono',
  'Total ($)',
  'Estado',
  'Método de Pago',
  'Tipo de Entrega',
] as const;

/**
 * Generates CSV content with a UTF-8 Byte Order Mark (BOM) for Excel compatibility.
 */
export function generateOrdersCsv(orders: OrderSummary[]): string {
  const headerRow = CSV_HEADERS.map(escapeCsvField).join(',');

  const dataRows = orders.map((order) => {
    const raw = order as unknown as Record<string, string>;
    const deliveryRaw = order.delivery_type || raw.delivery_method || raw.delivery || raw.deliveryType || raw.metodo_entrega;
    const paymentRaw = order.payment_method || raw.payment_type || raw.payment || raw.paymentMethod || raw.metodo_pago;

    const orderId = order.order_id;
    const dateFormatted = order.created_at ? formatDate(order.created_at) : 'N/A';
    const customerName = `${order.name || ''} ${order.last_name || ''}`.trim() || 'N/A';
    const cedula = (order.cedula && order.cedula.trim()) ? order.cedula.trim() : 'N/A';
    const phone = (order.tlf_num && order.tlf_num.trim()) ? order.tlf_num.trim() : 'N/A';
    const totalAmount = order.total_amount || '0.00';
    const status = getOrderStatusLabel(order.status);
    const paymentLabel = getPaymentLabel(paymentRaw);
    const deliveryLabel = getDeliveryLabel(deliveryRaw);

    return [
      escapeCsvField(orderId),
      escapeCsvField(dateFormatted),
      escapeCsvField(customerName),
      escapeCsvField(cedula),
      escapeCsvField(phone),
      escapeCsvField(totalAmount),
      escapeCsvField(status),
      escapeCsvField(paymentLabel),
      escapeCsvField(deliveryLabel),
    ].join(',');
  });

  return '\uFEFF' + [headerRow, ...dataRows].join('\r\n');
}

/**
 * Triggers a browser download of the orders list formatted as CSV.
 */
export function exportOrdersToCsv(orders: OrderSummary[], filename?: string): void {
  if (typeof document === 'undefined' || typeof URL === 'undefined') {
    return;
  }

  const csvContent = generateOrdersCsv(orders);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const today = new Date().toISOString().split('T')[0];
  const downloadFilename = filename || `tokki_pedidos_${today}.csv`;

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', downloadFilename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}
