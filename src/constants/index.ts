// ─── Categories (name → emoji) ────────────────────────────
export const CATEGORIES: { name: string; emoji: string }[] = [
  { name: 'Maquillaje', emoji: '💄' },
  { name: 'Accesorios', emoji: '💎' },
  { name: 'Lentes de Contacto', emoji: '👁️' },
  { name: 'Pines', emoji: '📌' },
];

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-');
}

// ─── Delivery options ──────────────────────────────────────
export const DELIVERY_TYPES = [
  { value: 'standard', label: 'Envío Estándar' },
  { value: 'pickup',   label: 'Retiro en Tienda' },
] as const;

// ─── Payment methods ──────────────────────────────────────
export const PAYMENT_METHODS = [
  { value: 'pago_movil',    label: 'Pago Móvil' },
  { value: 'bank_transfer', label: 'Transferencia Bancaria' },
  { value: 'cash',          label: 'Efectivo' },
  { value: 'zelle',         label: 'Zelle' },
] as const;

// ─── Country codes (LatAm focus) ──────────────────────────
export const COUNTRY_CODES = [
  { code: '+58', country: '🇻🇪 Venezuela', short: 'VE' },
  { code: '+57', country: '🇨🇴 Colombia',  short: 'CO' },
  { code: '+56', country: '🇨🇱 Chile',     short: 'CL' },
  { code: '+54', country: '🇦🇷 Argentina', short: 'AR' },
  { code: '+55', country: '🇧🇷 Brasil',    short: 'BR' },
  { code: '+52', country: '🇲🇽 México',    short: 'MX' },
  { code: '+1',  country: '🇺🇸 USA',       short: 'US' },
] as const;

// ─── Currency formatting ──────────────────────────────────
const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
});

export function formatPrice(price: string | number): string {
  return currencyFormatter.format(Number(price));
}

// ─── Date formatting ──────────────────────────────────────
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-VE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-VE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
