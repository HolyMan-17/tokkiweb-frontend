import { describe, it, expect } from 'vitest';
import { getWhatsAppLink, getCustomerOrderWhatsAppLink, TOKKI_WHATSAPP_PHONE } from './whatsapp';
import type { CreatedOrder, OrderDetail } from '../types';

describe('getWhatsAppLink', () => {
  it('exports the canonical Tokki Shop WhatsApp phone number', () => {
    expect(TOKKI_WHATSAPP_PHONE).toBe('+584122698243');
  });

  it('generates a direct WhatsApp link with stripped digits and encoded message', () => {
    const link = getWhatsAppLink('+58 414-123.4567', 42, 'María');
    expect(link).toBe(
      'https://wa.me/584141234567?text=Hola%20Mar%C3%ADa%2C%20te%20escribimos%20de%20Tokki%20Shop%20sobre%20tu%20pedido%20%2342.',
    );
  });

  it('handles international numbers correctly', () => {
    const link = getWhatsAppLink('+1 (305) 555-0199', 105, 'John');
    expect(link).toBe(
      'https://wa.me/13055550199?text=Hola%20John%2C%20te%20escribimos%20de%20Tokki%20Shop%20sobre%20tu%20pedido%20%23105.',
    );
  });

  it('handles empty customer name gracefully', () => {
    const link = getWhatsAppLink('+584121234567', 7, '');
    expect(link).toBe(
      'https://wa.me/584121234567?text=Hola%2C%20te%20escribimos%20de%20Tokki%20Shop%20sobre%20tu%20pedido%20%237.',
    );
  });
});

describe('getCustomerOrderWhatsAppLink', () => {
  it('generates a WhatsApp link directed to Tokki Shop with drawn receipt format', () => {
    const order: OrderDetail = {
      order_id: 42,
      order_token: 'uuid-123',
      status: 'pending',
      client: {
        name: 'María',
        last_name: 'González',
        cedula: 'V-26345678',
        tlf_num: '+584121234567',
      },
      delivery_type: 'envio_nacional',
      payment_method: 'pago_movil',
      total_amount: '18.50',
      created_at: '2026-08-13T14:30:00.000Z',
      items: [
        {
          product_name: 'Bálsamo de Fresa',
          product_qty: 2,
          product_price: '3.50',
          product_total: '7.00',
        },
      ],
    };

    const link = getCustomerOrderWhatsAppLink(order);
    expect(link).toContain('https://wa.me/584122698243?text=');
    const decoded = decodeURIComponent(link);
    expect(decoded).toContain('Hola! Mi nombre es María González y he hecho una orden con de los siguientes articulos:');
    expect(decoded).toContain('==============================');
    expect(decoded).toContain('TOKKI SHOP');
    expect(decoded).toContain('RECIBO DE ORDEN');
    expect(decoded).toContain('Pedido: #42');
    expect(decoded).toContain('- 2x Bálsamo de Fresa - $7.00');
    expect(decoded).toContain('TOTAL: $18.50');
    expect(decoded).toContain('- Entrega: Envío Nacional (Zoom)');
    expect(decoded).toContain('- Método de Pago: Pago Móvil');
    expect(decoded).toContain('- Cédula: V-26345678');
    expect(decoded).toContain('- Teléfono: +584121234567');
  });

  it('handles CreatedOrder structure and extra customer fields gracefully', () => {
    const order = {
      order_id: 88,
      order_token: 'uuid-456',
      delivery_type: 'delivery',
      payment_method: 'pago_movil',
      total_amount: '12.00',
      contact_phone: '+584149998877',
      client: {
        name: 'Carlos',
        last_name: 'Rodríguez',
        cedula: 'V-19876543',
        tlf_num: '+584149998877',
      },
      items: [
        { id: 1, name: 'Tokki Pin', ordered_qty: 1, price: '12.00' },
      ],
    } as unknown as CreatedOrder;

    const link = getCustomerOrderWhatsAppLink(order);
    expect(link).toContain('https://wa.me/584122698243?text=');
    const decoded = decodeURIComponent(link);
    expect(decoded).toContain('Hola! Mi nombre es Carlos Rodríguez y he hecho una orden con de los siguientes articulos:');
    expect(decoded).toContain('Pedido: #88');
    expect(decoded).toContain('- 1x Tokki Pin - $12.00');
    expect(decoded).toContain('TOTAL: $12.00');
    expect(decoded).toContain('- Entrega: Delivery');
    expect(decoded).toContain('- Método de Pago: Pago Móvil');
    expect(decoded).toContain('- Cliente: Carlos Rodríguez');
    expect(decoded).toContain('- Cédula: V-19876543');
    expect(decoded).toContain('- Teléfono: +584149998877');
  });
});
