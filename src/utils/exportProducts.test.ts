import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateProductsCsv, exportProductsToCsv } from './exportProducts';
import type { Product } from '../types';

const MOCK_PRODUCTS: Product[] = [
  {
    product_id: 1,
    product_name: 'Bálsamo Labial Fresa',
    product_price: '3.50',
    product_description: 'Hidratante con aroma a fresa',
    qty_available: 10,
    in_stock: true,
    category: 'Maquillaje',
  },
  {
    product_id: 2,
    product_name: 'Serum, Facial "Especial"',
    product_price: '12.00',
    product_description: 'Calmante para la piel',
    qty_available: 2,
    in_stock: true,
    category: 'Skincare',
  },
  {
    product_id: 3,
    product_name: '=Formula Mochi',
    product_price: '4.25',
    product_description: 'Mochi especial',
    qty_available: 5,
    in_stock: true,
    category: 'Dulces & Comida Asiatica',
  },
];

describe('exportProducts utility', () => {
  describe('generateProductsCsv', () => {
    it('incluye BOM UTF-8 y exactamente las cabeceras Nombre y Precio ($)', () => {
      const csv = generateProductsCsv([]);
      expect(csv.startsWith('\uFEFF')).toBe(true);
      expect(csv).toBe('\uFEFFNombre,Precio ($)');
    });

    it('genera únicamente el nombre y el precio para cada producto', () => {
      const csv = generateProductsCsv(MOCK_PRODUCTS);
      const lines = csv.replace('\uFEFF', '').split('\r\n');

      expect(lines.length).toBe(4); // 1 header + 3 data rows
      expect(lines[0]).toBe('Nombre,Precio ($)');

      // Producto 1
      expect(lines[1]).toBe('Bálsamo Labial Fresa,3.50');

      // Producto 2 (con comas y comillas correctamente escapadas)
      expect(lines[2]).toBe('"Serum, Facial ""Especial""",12.00');

      // Producto 3 (con neutralización de fórmula)
      expect(lines[3]).toBe(`'=Formula Mochi,4.25`);
    });

    it('maneja productos con valores vacíos o nulos de forma segura', () => {
      const incompleteProduct = [
        {
          product_id: 99,
          product_name: '',
          product_price: '',
          product_description: '',
          qty_available: 0,
          in_stock: false,
          category: '',
        },
      ];
      const csv = generateProductsCsv(incompleteProduct);
      const lines = csv.replace('\uFEFF', '').split('\r\n');
      expect(lines[1]).toBe('Sin nombre,0.00');
    });
  });

  describe('exportProductsToCsv', () => {
    let createObjectURLSpy: ReturnType<typeof vi.spyOn>;
    let revokeObjectURLSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:tokki-products-url');
      revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('crea un elemento anchor con blob y descarga el archivo con nombre por defecto', () => {
      const clickSpy = vi.fn();
      const appendChildSpy = vi.spyOn(document.body, 'appendChild');
      const removeChildSpy = vi.spyOn(document.body, 'removeChild');

      const originalCreateElement = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        const el = originalCreateElement(tagName);
        if (tagName === 'a') {
          el.click = clickSpy;
        }
        return el;
      });

      exportProductsToCsv(MOCK_PRODUCTS);

      expect(createObjectURLSpy).toHaveBeenCalledTimes(1);
      expect(clickSpy).toHaveBeenCalledTimes(1);
      expect(appendChildSpy).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalled();
      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:tokki-products-url');
    });

    it('utiliza el nombre de archivo personalizado si se proporciona', () => {
      let downloadAttr = '';
      const originalCreateElement = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        const el = originalCreateElement(tagName);
        if (tagName === 'a') {
          el.click = vi.fn();
          const origSetAttr = el.setAttribute.bind(el);
          el.setAttribute = (name: string, value: string) => {
            if (name === 'download') downloadAttr = value;
            origSetAttr(name, value);
          };
        }
        return el;
      });

      exportProductsToCsv(MOCK_PRODUCTS, 'mis_productos.csv');
      expect(downloadAttr).toBe('mis_productos.csv');
    });
  });
});
