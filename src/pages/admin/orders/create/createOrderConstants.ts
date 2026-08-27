import type { Product } from '../../../../types';

export interface CustomerForm {
  name: string;
  last_name: string;
  cedula: string;
  tlf_num: string;
}

export interface FormErrors {
  name?: string;
  last_name?: string;
  cedula?: string;
  tlf_num?: string;
}

export interface SelectedOrderItem {
  product: Product;
  quantity: number;
}

export const DEFAULT_COUNTER_CLIENT: CustomerForm = {
  name: 'Cliente',
  last_name: 'Tienda',
  cedula: 'V-00000000',
  tlf_num: '+584120000000',
};

export const DELIVERY_OPTIONS = [
  { value: 'retiro_tienda', label: 'Retiro en Tienda / Compra Física' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'envio_nacional', label: 'Envío Nacional' },
] as const;

export const PAYMENT_OPTIONS = [
  { value: 'cash', label: 'Efectivo / Divisas' },
  { value: 'pago_movil', label: 'Pago Móvil' },
  { value: 'punto', label: 'Punto de Venta' },
  { value: 'binance', label: 'Binance Pay' },
  { value: 'zelle', label: 'Zelle' },
  { value: 'paypal', label: 'PayPal' },
] as const;

export const CEDULA_REGEX = /^(?:[VEJG]-?)?\d{6,9}$/i;

export const sanitizeName = (value: string): string =>
  value
    .replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ' -]/g, '')
    .replace(/\s{2,}/g, ' ')
    .slice(0, 60);

export const validateNameField = (value: string, fieldLabel: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return `El ${fieldLabel.toLowerCase()} es requerido`;
  if (trimmed.length < 2) return `El ${fieldLabel.toLowerCase()} debe tener al menos 2 caracteres`;
  if (!/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(trimmed)) {
    return `Ingresa un ${fieldLabel.toLowerCase()} válido`;
  }
  return '';
};

export const validateCedulaField = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return 'La cédula de identidad es requerida (ej. V-12345678)';
  if (trimmed === 'V-00000000' || trimmed === '00000000') return '';
  if (!CEDULA_REGEX.test(trimmed)) {
    return 'Formato de cédula inválido (ej. V-12345678)';
  }
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 6 || digits.length > 9) {
    return 'La cédula debe contener entre 6 y 9 dígitos';
  }
  return '';
};

export const normalizeCedula = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^[VEJG]-/i.test(trimmed)) return trimmed.toUpperCase();
  if (/^[VEJG]\d/i.test(trimmed)) {
    return `${trimmed.charAt(0).toUpperCase()}-${trimmed.slice(1)}`;
  }
  return `V-${trimmed.replace(/\D/g, '')}`;
};

export const validatePhoneField = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return 'El número de teléfono es requerido (ej. +584121234567)';
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) {
    return 'Ingresa un número de teléfono válido (entre 7 y 15 dígitos)';
  }
  return '';
};

export const normalizePhone = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('+')) {
    return `+${trimmed.slice(1).replace(/\D/g, '')}`;
  }
  return `+${trimmed.replace(/\D/g, '')}`;
};
