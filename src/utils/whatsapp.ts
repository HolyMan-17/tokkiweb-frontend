import type { CreatedOrder, OrderDetail } from '../types';
import { formatDate, formatPrice, getDeliveryLabel, getPaymentLabel } from '../constants';

export const TOKKI_WHATSAPP_PHONE = '+584122698243';

/**
 * Generates a direct WhatsApp click-to-chat URL for an admin to contact a customer.
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

/**
 * Generates a customer-facing WhatsApp link on Order Confirmation
 * with a drawn receipt format sent directly to Tokki Shop's WhatsApp (+584122698243).
 */
export function getCustomerOrderWhatsAppLink(
  order: OrderDetail | CreatedOrder | (Record<string, unknown> & { order_id: number }),
  storePhone: string = TOKKI_WHATSAPP_PHONE,
): string {
  const digits = storePhone.replace(/\D/g, '');
  const anyOrder = order as Record<string, unknown>;

  // Robustly extract customer name from any possible order structure
  let customerName = '';
  const clientObj = anyOrder.client as { name?: string; last_name?: string } | undefined;
  const clientInfoObj = anyOrder.client_info as { name?: string; last_name?: string } | undefined;

  if (clientObj && typeof clientObj === 'object') {
    const first = clientObj.name || '';
    const last = clientObj.last_name || '';
    customerName = `${first} ${last}`.trim();
  } else if (clientInfoObj && typeof clientInfoObj === 'object') {
    const first = clientInfoObj.name || '';
    const last = clientInfoObj.last_name || '';
    customerName = `${first} ${last}`.trim();
  } else if (typeof anyOrder.name === 'string') {
    const first = anyOrder.name;
    const last = typeof anyOrder.last_name === 'string' ? anyOrder.last_name : '';
    customerName = `${first} ${last}`.trim();
  }

  // Robustly extract phone
  let contactPhone = '';
  const clientPhone = (clientObj as { tlf_num?: string })?.tlf_num;
  const clientInfoPhone = (clientInfoObj as { tlf_num?: string })?.tlf_num;
  if (clientPhone) {
    contactPhone = clientPhone;
  } else if (clientInfoPhone) {
    contactPhone = clientInfoPhone;
  } else if (typeof anyOrder.contact_phone === 'string') {
    contactPhone = anyOrder.contact_phone;
  } else if (typeof anyOrder.tlf_num === 'string') {
    contactPhone = anyOrder.tlf_num;
  }

  // Robustly extract cedula
  let cedula = '';
  const clientCedula = (clientObj as { cedula?: string })?.cedula;
  const clientInfoCedula = (clientInfoObj as { cedula?: string })?.cedula;
  if (clientCedula) {
    cedula = clientCedula;
  } else if (clientInfoCedula) {
    cedula = clientInfoCedula;
  } else if (typeof anyOrder.cedula === 'string') {
    cedula = anyOrder.cedula;
  }

  const greeting = customerName
    ? `Hola! Mi nombre es ${customerName} y he hecho una orden con de los siguientes articulos:`
    : `Hola! Mi nombre es [nombre cliente] y he hecho una orden con de los siguientes articulos:`;

  const items = Array.isArray(anyOrder.items) ? anyOrder.items : [];
  const itemLines = items.map((item: Record<string, unknown>) => {
    const name = String(item.product_name || item.name || 'Producto');
    const qty = Number(item.product_qty ?? item.ordered_qty ?? 1);
    const price = String(item.product_price || item.price || '0');
    const total = item.product_total ? String(item.product_total) : (Number(price) * qty).toFixed(2);
    return `- ${qty}x ${name} - ${formatPrice(total)}`;
  });

  const dividerMain = '==============================';
  const dividerSub = '------------------------------';

  const lines = [
    greeting,
    '',
    dividerMain,
    '          TOKKI SHOP',
    '       RECIBO DE ORDEN',
    dividerMain,
    `Pedido: #${anyOrder.order_id}`,
  ];

  if (typeof anyOrder.created_at === 'string') {
    lines.push(`Fecha: ${formatDate(anyOrder.created_at)}`);
  }

  lines.push(dividerSub);
  lines.push('ARTICULOS:');
  if (itemLines.length > 0) {
    lines.push(...itemLines);
  } else {
    lines.push('- (Sin articulos)');
  }

  lines.push(dividerSub);
  lines.push(`TOTAL: ${formatPrice(String(anyOrder.total_amount || '0'))}`);
  lines.push(dividerSub);

  lines.push('DETALLES DE ENTREGA Y PAGO:');
  lines.push(`- Entrega: ${getDeliveryLabel(anyOrder.delivery_type as string)}`);
  lines.push(`- Método de Pago: ${getPaymentLabel(anyOrder.payment_method as string)}`);

  if (customerName) {
    lines.push(`- Cliente: ${customerName}`);
  }
  if (cedula) {
    lines.push(`- Cédula: ${cedula}`);
  }
  if (contactPhone) {
    lines.push(`- Teléfono: ${contactPhone}`);
  }

  lines.push(dividerMain);

  const message = lines.join('\n');
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

