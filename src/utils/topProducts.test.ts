import { describe, expect, it } from 'vitest';
import { computeTopProducts, getRankBadge } from './topProducts';
import type { Product, OrderSummary } from '../types';

const MOCK_PRODUCTS: Product[] = [
  {
    product_id: 1,
    product_name: 'Bálsamo Labial Fresa',
    category: 'Maquillaje',
    product_price: '5.00',
    product_description: 'Bálsamo hidratante',
    qty_available: 15,
    in_stock: true,
  },
  {
    product_id: 2,
    product_name: 'Sérum de Arroz Glow',
    category: 'Skincare',
    product_price: '18.50',
    product_description: 'Sérum iluminador',
    qty_available: 4,
    in_stock: true,
  },
  {
    product_id: 3,
    product_name: 'Collar Osito Kawaii',
    category: 'Accesorios',
    product_price: '12.00',
    product_description: 'Collar plateado',
    qty_available: 2,
    in_stock: true,
  },
  {
    product_id: 4,
    product_name: 'Lentes Honey Brown',
    category: 'Lentes de Contacto',
    product_price: '22.00',
    product_description: 'Lentes de contacto cosméticos',
    qty_available: 0,
    in_stock: false,
  },
  {
    product_id: 5,
    product_name: 'Pin Esmaltado Conejito',
    category: 'Pines & Chapas',
    product_price: '4.50',
    product_description: 'Pin metálico',
    qty_available: 25,
    in_stock: true,
  },
  {
    product_id: 6,
    product_name: 'Mochi de Fresa',
    category: 'Dulces & Comida Asiatica',
    product_price: '3.00',
    product_description: 'Mochi relleno',
    qty_available: 8,
    in_stock: true,
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

describe('computeTopProducts', () => {
  it('returns empty array when no products are provided', () => {
    expect(computeTopProducts([])).toEqual([]);
  });

  it('respects the limit argument', () => {
    const result = computeTopProducts(MOCK_PRODUCTS, [], 3);
    expect(result).toHaveLength(3);
    expect(result[0].badgeRank).toBe('🥇 #1');
    expect(result[1].badgeRank).toBe('🥈 #2');
    expect(result[2].badgeRank).toBe('🥉 #3');
  });

  it('returns structured TopProductItem objects with required fields', () => {
    const result = computeTopProducts(MOCK_PRODUCTS, [], 5);
    expect(result).toHaveLength(5);
    for (const item of result) {
      expect(item).toHaveProperty('product_id');
      expect(item).toHaveProperty('product_name');
      expect(item).toHaveProperty('category');
      expect(item).toHaveProperty('product_price');
      expect(item).toHaveProperty('qty_available');
      expect(item).toHaveProperty('badgeRank');
    }
  });

  it('ranks by sold units when order line items are available', () => {
    // Orders with items attached (extended order format or receipts/details)
    const ordersWithItems = [
      {
        order_id: 101,
        name: 'Ana',
        last_name: 'Pérez',
        tlf_num: '+584141112233',
        total_amount: '37.00',
        status: 'approved' as const,
        item_count: 2,
        created_at: '2026-08-20T10:00:00Z',
        items: [
          { product_id: 2, product_qty: 2, product_name: 'Sérum de Arroz Glow', product_price: '18.50', product_total: '37.00' },
        ],
      },
      {
        order_id: 102,
        name: 'Luis',
        last_name: 'Gómez',
        tlf_num: '+584142223344',
        total_amount: '30.00',
        status: 'approved' as const,
        item_count: 6,
        created_at: '2026-08-21T11:00:00Z',
        items: [
          { product_id: 1, product_qty: 6, product_name: 'Bálsamo Labial Fresa', product_price: '5.00', product_total: '30.00' },
        ],
      },
      {
        order_id: 103,
        name: 'Carlos',
        last_name: 'Ruiz',
        tlf_num: '+584143334455',
        total_amount: '20.00',
        status: 'canceled' as const, // Canceled order should be ignored
        item_count: 10,
        created_at: '2026-08-22T12:00:00Z',
        items: [
          { product_id: 5, product_qty: 10, product_name: 'Pin Esmaltado Conejito', product_price: '4.50', product_total: '45.00' },
        ],
      },
    ];

    const result = computeTopProducts(MOCK_PRODUCTS, ordersWithItems as unknown as OrderSummary[], 5);
    
    // Product 1 has 6 sold items -> Rank #1
    expect(result[0].product_id).toBe(1);
    expect(result[0].soldCount).toBe(6);
    expect(result[0].badgeRank).toBe('🥇 #1');

    // Product 2 has 2 sold items -> Rank #2
    expect(result[1].product_id).toBe(2);
    expect(result[1].soldCount).toBe(2);
    expect(result[1].badgeRank).toBe('🥈 #2');
  });

  it('ranks by catalog velocity and price value when no order items exist', () => {
    // When no order line items are available:
    // in-stock items are prioritized, ranked by value / price volume & velocity
    const result = computeTopProducts(MOCK_PRODUCTS, [], 5);

    expect(result[0].badgeRank).toBe('🥇 #1');
    // Top items should be in-stock
    expect(result[0].qty_available).toBeGreaterThan(0);
    // Highest value in-stock products should appear at the top
    const topIds = result.map(r => r.product_id);
    expect(topIds).toContain(2); // Sérum 18.50
    expect(topIds).toContain(3); // Collar 12.00
  });

  it('handles orders with items matching by name if product_id is missing', () => {
    const ordersWithNameMatch = [
      {
        order_id: 201,
        name: 'Carla',
        last_name: 'M.',
        tlf_num: '+584140001122',
        total_amount: '12.00',
        status: 'approved' as const,
        item_count: 1,
        created_at: '2026-08-23T10:00:00Z',
        items: [
          { product_name: 'Collar Osito Kawaii', product_qty: 4, product_price: '12.00', product_total: '48.00' },
        ],
      },
    ];

    const result = computeTopProducts(MOCK_PRODUCTS, ordersWithNameMatch as unknown as OrderSummary[], 3);
    expect(result[0].product_id).toBe(3);
    expect(result[0].soldCount).toBe(4);
  });
});
