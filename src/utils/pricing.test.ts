import { describe, expect, it } from 'vitest';
import {
  normalizeDiscountPercent,
  getOriginalPriceCents,
  hasActiveDiscount,
  getEffectivePriceCents,
  getEffectivePrice,
  getEffectivePriceString,
  formatEffectivePrice,
} from './pricing';

describe('pricing utility', () => {
  it('normalizes valid whole-number discount percentages 0..99 and rejects invalid inputs', () => {
    expect(normalizeDiscountPercent(0)).toBe(0);
    expect(normalizeDiscountPercent(20)).toBe(20);
    expect(normalizeDiscountPercent(99)).toBe(99);
    expect(normalizeDiscountPercent(undefined)).toBe(0);
    expect(normalizeDiscountPercent(null)).toBe(0);
    expect(normalizeDiscountPercent(-1)).toBe(0);
    expect(normalizeDiscountPercent(100)).toBe(0);
    expect(normalizeDiscountPercent(12.5)).toBe(0);
    expect(normalizeDiscountPercent(Number.NaN)).toBe(0);
  });

  it('detects active discounts only when discount_percent is 1..99 and base price > 0', () => {
    expect(hasActiveDiscount({ product_price: '10.00', discount_percent: 20 })).toBe(true);
    expect(hasActiveDiscount({ product_price: '10.00', discount_percent: 0 })).toBe(false);
    expect(hasActiveDiscount({ product_price: '10.00' })).toBe(false);
    expect(hasActiveDiscount({ product_price: '0.00', discount_percent: 20 })).toBe(false);
  });

  it('computes exact integer-cent discounted prices matching the backend formula', () => {
    // $4.99 @ 20% off = $3.992 -> 399 cents -> $3.99
    expect(getOriginalPriceCents({ product_price: '4.99' })).toBe(499);
    expect(getEffectivePriceCents({ product_price: '4.99', discount_percent: 20 })).toBe(399);
    expect(getEffectivePrice({ product_price: '4.99', discount_percent: 20 })).toBe(3.99);
    expect(getEffectivePriceString({ product_price: '4.99', discount_percent: 20 })).toBe('3.99');
    expect(formatEffectivePrice({ product_price: '4.99', discount_percent: 20 })).toBe('$3.99');

    // $19.99 @ 15% off = $16.9915 -> 1699 cents -> $16.99
    expect(getEffectivePriceCents({ product_price: '19.99', discount_percent: 15 })).toBe(1699);
    expect(getEffectivePriceString({ product_price: '19.99', discount_percent: 15 })).toBe('16.99');

    // $10.00 @ 99% off -> $0.10
    expect(getEffectivePriceString({ product_price: '10.00', discount_percent: 99 })).toBe('0.10');

    // $0.01 @ 50% off -> 0.5 cents rounds up to $0.01
    expect(getEffectivePriceString({ product_price: '0.01', discount_percent: 50 })).toBe('0.01');
  });

  it('returns original price cleanly when discount_percent is 0 or omitted', () => {
    expect(getEffectivePrice({ product_price: '5.50' })).toBe(5.5);
    expect(getEffectivePriceString({ product_price: '5.5' })).toBe('5.50');
    expect(formatEffectivePrice({ product_price: '5.5', discount_percent: 0 })).toBe('$5.50');
  });
});
