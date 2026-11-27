import { formatPrice } from '../constants';

export interface PriceableProduct {
  product_price: string | number;
  discount_percent?: number | null;
}

export function normalizeDiscountPercent(raw: unknown): number {
  if (typeof raw !== 'number' || !Number.isInteger(raw)) {
    return 0;
  }
  if (raw < 0 || raw > 99) {
    return 0;
  }
  return raw;
}

export function getOriginalPriceCents(product: PriceableProduct): number {
  const num = typeof product.product_price === 'number'
    ? product.product_price
    : Number(product.product_price);
  if (!Number.isFinite(num) || num <= 0) {
    return 0;
  }
  return Math.round(num * 100);
}

export function hasActiveDiscount(product: PriceableProduct): boolean {
  return normalizeDiscountPercent(product.discount_percent) > 0 && getOriginalPriceCents(product) > 0;
}

export function getEffectivePriceCents(product: PriceableProduct): number {
  const baseCents = getOriginalPriceCents(product);
  const pct = normalizeDiscountPercent(product.discount_percent);
  return Math.round((baseCents * (100 - pct)) / 100);
}

export function getEffectivePrice(product: PriceableProduct): number {
  return getEffectivePriceCents(product) / 100;
}

export function getEffectivePriceString(product: PriceableProduct): string {
  return (getEffectivePriceCents(product) / 100).toFixed(2);
}

export function formatEffectivePrice(product: PriceableProduct): string {
  return formatPrice(getEffectivePrice(product));
}
