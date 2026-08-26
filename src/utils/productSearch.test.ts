import { describe, expect, test } from 'vitest';
import { matchesSearch } from './productSearch';
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

describe('matchesSearch (nombre + descripción)', () => {
  test('encuentra por nombre', () => {
    expect(matchesSearch(product(), 'mariposa')).toBe(true);
  });

  test('encuentra por descripción aunque el nombre no coincida', () => {
    const p = product({
      product_name: 'Sombras Pastel',
      product_description: 'Brillo hidratante de larga duración',
    });
    expect(matchesSearch(p, 'hidratante')).toBe(true);
  });

  test('ignora mayúsculas/minúsculas', () => {
    expect(matchesSearch(product({ product_name: 'Maquillaje Líquido' }), 'MAQUILLAJE')).toBe(true);
    expect(matchesSearch(product(), 'GLOSS')).toBe(true);
  });

  test('ignora tildes y acentos', () => {
    expect(matchesSearch(product({ product_name: 'Bálsamo de Fresa' }), 'balsamo')).toBe(true);
    expect(
      matchesSearch(
        product({ product_name: 'Peluche de Gato', product_description: 'Peluche suave' }),
        'peluche',
      ),
    ).toBe(true);
    expect(matchesSearch(product({ product_name: 'Duración X' }), 'duracion')).toBe(true);
  });

  test('consulta vacía coincide con todos', () => {
    expect(matchesSearch(product(), '')).toBe(true);
    expect(matchesSearch(product(), '   ')).toBe(true);
  });

  test('sin coincidencia devuelve false', () => {
    expect(matchesSearch(product(), 'tenedor')).toBe(false);
  });
});
