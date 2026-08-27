/**
 * Generates a direct WhatsApp click-to-chat URL for an order.
 * Format: https://wa.me/<digits>?text=<message>
 *
 * @param phone E.164 or raw phone number (e.g. "+584121234567")
 * @param orderId Order ID number (e.g. 42)
 * @param customerName Customer first name (e.g. "María")
 */
export function getWhatsAppLink(phone: string, orderId: number, customerName: string): string {
  const digits = phone.replace(/\D/g, '');
  const name = customerName.trim();
  const greeting = name ? `Hola ${name}` : 'Hola';
  const message = `${greeting}, te escribimos de Tokki Shop sobre tu pedido #${orderId}.`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
