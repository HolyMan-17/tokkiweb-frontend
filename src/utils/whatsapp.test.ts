import { describe, it, expect } from 'vitest';
import { getWhatsAppLink } from './whatsapp';

describe('getWhatsAppLink', () => {
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
