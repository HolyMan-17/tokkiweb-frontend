import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './CheckoutPage.css';
import { useCart, type StockAdjustment } from '../../context/CartContext';
import { createOrder } from '../../api/orders';
import { fetchAllProducts } from '../../api/products';
import StockNotice from '../../components/ui/StockNotice';
import {
  COUNTRY_CODES, DELIVERY_TYPES, getPaymentMethods,
  normalizePhoneNumber, validatePhoneNumber, CEDULA_TYPES,
} from '../../constants';
import { ROUTES } from '../../lib/routes';
import CheckoutContactSection from './CheckoutContactSection';
import CheckoutDeliverySection from './CheckoutDeliverySection';
import CheckoutPaymentSection from './CheckoutPaymentSection';
import CheckoutSummarySection from './CheckoutSummarySection';

interface CheckoutFormState {
  name: string;
  lastName: string;
  cedulaType: string;
  cedula: string;
  countryCode: string;
  phone: string;
  deliveryType: string;
  paymentMethod: string;
}

const CEDULA_REGEX = /^(?:[VEJG]-?)?\d{6,9}$/i;

const sanitizeName = (value: string) =>
  value
    .replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ' -]/g, '')
    .replace(/\s{2,}/g, ' ')
    .slice(0, 60);

const validateCedula = (type: string, value: string) => {
  if (!value) return 'La cédula de identidad es requerida (ej. V-12345678)';
  const formatted = `${type}-${value}`;
  if (!CEDULA_REGEX.test(formatted) || value.length < 6 || value.length > 9) {
    return 'La cédula de identidad es requerida (ej. V-12345678)';
  }
  return '';
};

export default function CheckoutPage() {
  const { items, total, clearCart, reconcileStock } = useCart();
  const navigate = useNavigate();

  const [formData, setFormData] = useState<CheckoutFormState>({
    name: '',
    lastName: '',
    cedulaType: CEDULA_TYPES[0],
    cedula: '',
    countryCode: COUNTRY_CODES[0].code,
    phone: '',
    deliveryType: DELIVERY_TYPES[0].value,
    paymentMethod: getPaymentMethods(DELIVERY_TYPES[0].value)[0].value,
  });
  const [phoneError, setPhoneError] = useState('');
  const [cedulaError, setCedulaError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [stockChanges, setStockChanges] = useState<StockAdjustment[]>([]);
  const toastTimer = useRef<number | null>(null);

  const showToast = (message: string) => {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    return () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    };
  }, []);

  const selectedCountry =
    COUNTRY_CODES.find(c => c.code === formData.countryCode) ?? COUNTRY_CODES[0];

  // Efectivo only applies to "Retiro en Tienda" — the list adapts live.
  const paymentOptions = getPaymentMethods(formData.deliveryType);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const sanitized =
      name === 'name' || name === 'lastName'
        ? sanitizeName(value)
        : name === 'cedula'
          ? value.replace(/\D/g, '').slice(0, 9)
          : name === 'phone'
            ? value.replace(/\D/g, '').slice(0, selectedCountry.digits + 1)
            : value;
    // Delivery change can invalidate the selected method (e.g. Efectivo
    // chosen, then switching away from pickup) — reset to first available.
    if (name === 'deliveryType') {
      const options = getPaymentMethods(value);
      setFormData(prev => ({
        ...prev,
        deliveryType: value,
        paymentMethod: options.some(m => m.value === prev.paymentMethod)
          ? prev.paymentMethod
          : options[0].value,
      }));
      return;
    }
    setFormData(prev => ({ ...prev, [name]: sanitized }));
    if (name === 'countryCode') {
      const country = COUNTRY_CODES.find(c => c.code === value) ?? COUNTRY_CODES[0];
      setPhoneError(validatePhoneNumber(country, formData.phone));
    }
    if (name === 'phone') {
      setPhoneError(validatePhoneNumber(selectedCountry, sanitized));
    }
    if (name === 'cedula') {
      setCedulaError(validateCedula(formData.cedulaType, sanitized));
    }
    if (name === 'cedulaType') {
      setCedulaError(validateCedula(value, formData.cedula));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.lastName || !formData.phone) {
      showToast('Por favor completa todos los campos requeridos.');
      return;
    }
    const cedulaErrorMsg = validateCedula(formData.cedulaType, formData.cedula);
    if (cedulaErrorMsg) {
      setCedulaError(cedulaErrorMsg);
      showToast(cedulaErrorMsg);
      return;
    }
    if (!/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(formData.name) || !/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(formData.lastName)) {
      showToast('Ingresa un nombre válido.');
      return;
    }
    const phoneErrorMsg = validatePhoneNumber(selectedCountry, formData.phone);
    if (phoneErrorMsg) {
      setPhoneError(phoneErrorMsg);
      showToast('Numero de telefono invalido');
      return;
    }

    // Reconcile against fresh stock BEFORE creating the order. If anything
    // changed, block the submission and let the user review the adjustments.
    try {
      const products = await fetchAllProducts();
      const changes = reconcileStock(products);
      if (changes.length > 0) {
        setStockChanges(changes);
        showToast('Ajustamos tu carrito según el stock actual. Revísalo antes de continuar.');
        return;
      }
    } catch {
      showToast('No pudimos verificar el stock. Inténtalo de nuevo.');
      return;
    }

    // Create the order on the backend, then hand the id to the confirmation
    // page (it fetches the fresh detail by id — no router state needed).
    setIsSubmitting(true);
    try {
      const tlf_num = `${selectedCountry.code}${normalizePhoneNumber(selectedCountry, formData.phone)}`;
      const result = await createOrder({
        client_info: {
          name: formData.name.trim(),
          last_name: formData.lastName.trim(),
          cedula: `${formData.cedulaType}-${formData.cedula}`,
          // tlf_num already carries the full international number (§4.2):
          // country_code stays omitted so the backend normalizes to E.164.
          tlf_num,
        },
        delivery_type: formData.deliveryType,
        payment_method: formData.paymentMethod,
        items: items.map(item => ({
          product_id: item.product.product_id,
          product_qty: item.quantity,
        })),
      });

      if (!result.ok) {
        showToast(result.message);
        return;
      }

      clearCart();
      const confirmationKey = result.data.order_token || result.data.order_id;
      navigate(ROUTES.confirmation(confirmationKey), {
        state: { order: result.data },
      });
    } catch (error) {
      console.error('Error al crear el pedido:', error);
      showToast('No se pudo crear el pedido. Inténtalo de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="page">
        <div className="page-header">
          <h1 className="page-title">No hay productos</h1>
        </div>
        <button className="btn btn-primary" onClick={() => navigate(ROUTES.home)}>
          Volver a la tienda
        </button>
      </div>
    );
  }

  return (
    <div className="page checkout-page animate-fadeIn">
      <nav className="detail-nav">
        <Link to={ROUTES.cart} className="back-link text-primary font-semibold">
          ← Volver al carrito
        </Link>
      </nav>

      <div className="page-header">
        <h1 className="page-title">Finalizar Compra</h1>
        <p className="page-subtitle">Completa tus datos para procesar el pedido</p>
      </div>

      {stockChanges.length > 0 && (
        <StockNotice changes={stockChanges} onDismiss={() => setStockChanges([])} />
      )}

      <form onSubmit={handleSubmit} className="checkout-form stagger" noValidate>
        <CheckoutContactSection
          formData={formData}
          cedulaError={cedulaError}
          phoneError={phoneError}
          selectedCountry={selectedCountry}
          onChange={handleInputChange}
        />

        <CheckoutDeliverySection
          deliveryType={formData.deliveryType}
          onChange={handleInputChange}
        />

        <CheckoutPaymentSection
          paymentMethod={formData.paymentMethod}
          paymentOptions={paymentOptions}
          onChange={handleInputChange}
        />

        <CheckoutSummarySection
          items={items}
          total={total}
        />

        <button type="submit" className="btn btn-primary btn-lg btn-block mt-md" disabled={isSubmitting}>
          {isSubmitting ? 'Procesando…' : 'Confirmar pedido'}
        </button>
      </form>

      {toast && (
        <div className="checkout-toast" role="alert">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {toast}
        </div>
      )}
    </div>
  );
}
