import { describe, expect, test } from 'vitest';
import { sortProducts } from './productSort';
import type { Product } from '../types';

function product(overrides: Partial<Product> = {}): Product {
  return {
    product_id: 1,
    product_name: 'Gloss Mariposa',
    product_price: '5.00',
    product_description: 'Gloss labial con efecto mariposa brillante.',
    qty_available: 10,
    in_stock: true,
    category: 'Maquillaje',
    ...overrides,
  };
}

describe('sortProducts (orden compartido de catálogo)', () => {
  test('orden "recent" deja primero el producto con mayor product_id', () => {
    const products = [
      product({ product_id: 1, product_name: 'Viejo' }),
      product({ product_id: 30, product_name: 'Nuevo' }),
      product({ product_id: 12, product_name: 'Medio' }),
    ];

    const sorted = sortProducts(products, 'recent');

    expect(sorted.map(p => p.product_id)).toEqual([30, 12, 1]);
  });

  test('orden "oldest" deja primero el producto con menor product_id', () => {
    const products = [
      product({ product_id: 30, product_name: 'Nuevo' }),
      product({ product_id: 1, product_name: 'Viejo' }),
      product({ product_id: 12, product_name: 'Medio' }),
    ];

    const sorted = sortProducts(products, 'oldest');

    expect(sorted.map(p => p.product_id)).toEqual([1, 12, 30]);
  });

  test('orden "price-asc" compara precios numéricamente, no como texto', () => {
    const products = [
      product({ product_id: 1, product_name: 'Caro', product_price: '10.00' }),
      product({ product_id: 2, product_name: 'Barato', product_price: '9.99' }),
      product({ product_id: 3, product_name: 'Medio', product_price: '12.50' }),
    ];

    const sorted = sortProducts(products, 'price-asc');

    expect(sorted.map(p => p.product_name)).toEqual(['Barato', 'Caro', 'Medio']);
  });

  test('orden "price-desc" deja primero el producto más caro', () => {
    const products = [
      product({ product_id: 1, product_name: 'Barato', product_price: '9.99' }),
      product({ product_id: 2, product_name: 'Caro', product_price: '10.00' }),
      product({ product_id: 3, product_name: 'Medio', product_price: '12.50' }),
    ];

    const sorted = sortProducts(products, 'price-desc');

    expect(sorted.map(p => p.product_name)).toEqual(['Medio', 'Caro', 'Barato']);
  });

  test('orden "name" ordena alfabéticamente con localeCompare', () => {
    const products = [
      product({ product_id: 1, product_name: 'Peluche de Gato' }),
      product({ product_id: 2, product_name: 'Bálsamo de Fresa' }),
      product({ product_id: 3, product_name: 'Gloss Mariposa' }),
    ];

    const sorted = sortProducts(products, 'name');

    expect(sorted.map(p => p.product_name)).toEqual([
      'Bálsamo de Fresa',
      'Gloss Mariposa',
      'Peluche de Gato',
    ]);
  });

  test('no muta el arreglo original', () => {
    const products = Object.freeze([
      product({ product_id: 1, product_name: 'Viejo', product_price: '3.00' }),
      product({ product_id: 30, product_name: 'Nuevo', product_price: '9.99' }),
      product({ product_id: 12, product_name: 'Medio', product_price: '10.00' }),
    ]);

    expect(() => sortProducts([...products], 'name')).not.toThrow();

    const sorted = sortProducts(products, 'recent');

    expect(products.map(p => p.product_id)).toEqual([1, 30, 12]);
    expect(sorted).not.toBe(products);
    expect(sorted.map(p => p.product_id)).toEqual([30, 12, 1]);
  });

  test('ordena price-asc y price-desc por precio efectivo con descuento', () => {
    const products = [
      product({ product_id: 1, product_name: 'SinDescuento', product_price: '7.00', discount_percent: 0 }),
      product({ product_id: 2, product_name: 'ConDescuento', product_price: '10.00', discount_percent: 50 }), // $5.00
    ];

    expect(sortProducts(products, 'price-asc').map(p => p.product_name)).toEqual([
      'ConDescuento',
      'SinDescuento',
    ]);
    expect(sortProducts(products, 'price-desc').map(p => p.product_name)).toEqual([
      'SinDescuento',
      'ConDescuento',
    ]);
  });
});
