import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateOrdersCsv, escapeCsvField, exportOrdersToCsv, getOrderStatusLabel } from './exportOrders';
import type { OrderSummary } from '../types';

const MOCK_ORDERS: OrderSummary[] = [
  {
    order_id: 101,
    name: 'María',
    last_name: 'Pérez',
    cedula: 'V-12345678',
    tlf_num: '+584121234567',
    total_amount: '25.00',
    status: 'pending',
    item_count: 2,
    created_at: '2026-08-20T10:00:00.000Z',
    delivery_type: 'envio_nacional',
    payment_method: 'pago_movil',
  },
  {
    order_id: 102,
    name: 'Juan, Carlos',
    last_name: 'De la "Rosa"',
    cedula: '',
    tlf_num: '',
    total_amount: '50.50',
    status: 'approved',
    item_count: 1,
    created_at: '2026-08-21T14:30:00.000Z',
    delivery_type: 'delivery',
    payment_method: 'zelle',
  },
  {
    order_id: 103,
    name: 'Ana',
    last_name: 'Gómez',
    cedula: 'V-99887766',
    tlf_num: '+584149998877',
    total_amount: '12.00',
    status: 'canceled',
    item_count: 1,
    created_at: '2026-08-22T09:15:00.000Z',
    delivery_type: 'retiro_tienda',
    payment_method: 'cash',
  },
];

describe('exportOrders utility', () => {
  describe('getOrderStatusLabel', () => {
    it('traduce los estados canónicos al español', () => {
      expect(getOrderStatusLabel('pending')).toBe('Pendiente');
      expect(getOrderStatusLabel('approved')).toBe('Aprobado');
      expect(getOrderStatusLabel('canceled')).toBe('Cancelado');
    });

    it('maneja valores nulos, vacíos o desconocidos', () => {
      expect(getOrderStatusLabel(null)).toBe('Pendiente');
      expect(getOrderStatusLabel(undefined)).toBe('Pendiente');
      expect(getOrderStatusLabel('otro_estado')).toBe('otro_estado');
    });
  });

  describe('escapeCsvField', () => {
    it('mantiene texto plano sin cambios', () => {
      expect(escapeCsvField('María Pérez')).toBe('María Pérez');
      expect(escapeCsvField(101)).toBe('101');
    });

    it('escapa comas envolviendo en comillas', () => {
      expect(escapeCsvField('Juan, Carlos')).toBe('"Juan, Carlos"');
    });

    it('escapa comillas duplicándolas y envolviendo en comillas', () => {
      expect(escapeCsvField('De la "Rosa"')).toBe('"De la ""Rosa"""');
    });

    it('escapa saltos de línea', () => {
      expect(escapeCsvField('Línea 1\nLínea 2')).toBe('"Línea 1\nLínea 2"');
    });

    it('maneja null o undefined devolviendo string vacío', () => {
      expect(escapeCsvField(null)).toBe('');
      expect(escapeCsvField(undefined)).toBe('');
    });
  });

  describe('generateOrdersCsv', () => {
    it('incluye BOM UTF-8 y la fila de cabecera correcta', () => {
      const csv = generateOrdersCsv([]);
      expect(csv.startsWith('\uFEFF')).toBe(true);
      expect(csv).toContain('ID Pedido,Fecha,Cliente,Cédula,Teléfono,Total ($),Estado,Método de Pago,Tipo de Entrega');
    });

    it('genera filas correctamente mapeadas con formato y labels', () => {
      const csv = generateOrdersCsv(MOCK_ORDERS);
      const lines = csv.replace('\uFEFF', '').split('\r\n');

      expect(lines[0]).toBe('ID Pedido,Fecha,Cliente,Cédula,Teléfono,Total ($),Estado,Método de Pago,Tipo de Entrega');
      
      // Row 1
      expect(lines[1]).toContain('101');
      expect(lines[1]).toContain('María Pérez');
      expect(lines[1]).toContain('V-12345678');
      expect(lines[1]).toContain('+584121234567');
      expect(lines[1]).toContain('25.00');
      expect(lines[1]).toContain('Pendiente');
      expect(lines[1]).toContain('Pago Móvil');
      expect(lines[1]).toContain('Envío Nacional (Zoom)');

      // Row 2 (with escaping for commas and quotes, and N/A fallbacks for empty cedula/phone)
      expect(lines[2]).toContain('102');
      expect(lines[2]).toContain('"Juan, Carlos De la ""Rosa"""');
      expect(lines[2]).toContain('N/A');
      expect(lines[2]).toContain('50.50');
      expect(lines[2]).toContain('Aprobado');
      expect(lines[2]).toContain('Zelle');
      expect(lines[2]).toContain('Delivery');

      // Row 3
      expect(lines[3]).toContain('103');
      expect(lines[3]).toContain('Ana Gómez');
      expect(lines[3]).toContain('Cancelado');
      expect(lines[3]).toContain('Efectivo');
      expect(lines[3]).toContain('Retiro en Tienda');
    });
  });

  describe('exportOrdersToCsv', () => {
    let createObjectURLSpy: ReturnType<typeof vi.spyOn>;
    let revokeObjectURLSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:tokki-test-url');
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

      exportOrdersToCsv(MOCK_ORDERS);

      expect(createObjectURLSpy).toHaveBeenCalledTimes(1);
      expect(clickSpy).toHaveBeenCalledTimes(1);
      expect(appendChildSpy).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalled();
      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:tokki-test-url');
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

      exportOrdersToCsv(MOCK_ORDERS, 'reporte_especial.csv');
      expect(downloadAttr).toBe('reporte_especial.csv');
    });
  });
});
