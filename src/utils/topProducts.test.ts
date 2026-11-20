import { describe, expect, it } from 'vitest';
import { getRankBadge, rankTopProducts } from './topProducts';
import type { TopProductStat } from '../types';

const MOCK_STATS: TopProductStat[] = [
  {
    product_id: 2,
    product_name: 'Sérum de Arroz Glow',
    category: 'Skincare',
    product_price: '18.50',
    qty_available: 4,
    in_stock: true,
    product_image_url: null,
    units_sold: 15,
    orders_count: 8,
    total_revenue: '277.50',
  },
  {
    product_id: 1,
    product_name: 'Bálsamo Labial Fresa',
    category: 'Maquillaje',
    product_price: '5.00',
    qty_available: 15,
    in_stock: true,
    product_image_url: null,
    units_sold: 12,
    orders_count: 10,
    total_revenue: '60.00',
  },
  {
    product_id: 3,
    product_name: 'Collar Osito Kawaii',
    category: 'Accesorios',
    product_price: '12.00',
    qty_available: 0,
    in_stock: false,
    product_image_url: null,
    units_sold: 9,
    orders_count: 6,
    total_revenue: '108.00',
  },
  {
    product_id: 5,
    product_name: 'Pin Esmaltado Conejito',
    category: 'Pines & Chapas',
    product_price: '4.50',
    qty_available: 25,
    in_stock: true,
    product_image_url: null,
    units_sold: 4,
    orders_count: 4,
    total_revenue: '18.00',
  },
];

describe('getRankBadge', () => {
  it('returns medals for top 3 and numbered ranks for others', () => {
    expect(getRankBadge(0)).toBe('🥇 #1');
    expect(getRankBadge(1)).toBe('🥈 #2');
    expect(getRankBadge(2)).toBe('🥉 #3');
    expect(getRankBadge(3)).toBe('#4');
    expect(getRankBadge(4)).toBe('#5');
    expect(getRankBadge(9)).toBe('#10');
  });
});

describe('rankTopProducts', () => {
  it('returns empty array when given an empty list', () => {
    expect(rankTopProducts([])).toEqual([]);
  });

  it('preserves server ordering and assigns rank badges', () => {
    const result = rankTopProducts(MOCK_STATS);

    expect(result).toHaveLength(4);
    expect(result.map((r) => r.product_id)).toEqual([2, 1, 3, 5]);
    expect(result.map((r) => r.badgeRank)).toEqual(['🥇 #1', '🥈 #2', '🥉 #3', '#4']);
  });

  it('filters out any item with units_sold <= 0 before assigning badges', () => {
    const withZeroSale: TopProductStat[] = [
      { ...MOCK_STATS[0], units_sold: 0, total_revenue: '0.00' },
      MOCK_STATS[1],
      { ...MOCK_STATS[2], units_sold: -1 },
      MOCK_STATS[3],
    ];

    const result = rankTopProducts(withZeroSale);
    expect(result.map((r) => r.product_id)).toEqual([1, 5]);
    expect(result.map((r) => r.badgeRank)).toEqual(['🥇 #1', '🥈 #2']);
  });
});
