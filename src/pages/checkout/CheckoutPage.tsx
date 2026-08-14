import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './CheckoutPage.css';
import { useCart } from '../../context/CartContext';
import { formatPrice, COUNTRY_CODES, DELIVERY_TYPES, PAYMENT_METHODS } from '../../constants';

export default function CheckoutPage() {
  const { items, total } = useCart();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    lastName: '',
    countryCode: COUNTRY_CODES[0].code,
    phone: '',
    deliveryType: DELIVERY_TYPES[0].value,
    paymentMethod: PAYMENT_METHODS[0].value,
  });

  const sanitizeName = (value: string) =>
    value
      .replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ' -]/g, '')
      .replace(/\s{2,}/g, ' ')
      .slice(0, 60);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const sanitized =
      name === 'name' || name === 'lastName'
        ? sanitizeName(value)
        : name === 'phone'
          ? value.replace(/\D/g, '').slice(0, 15)
          : value;
    setFormData(prev => ({ ...prev, [name]: sanitized }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.lastName || !formData.phone) {
      alert('Por favor completa todos los campos requeridos.');
      return;
    }
    if (!/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(formData.name) || !/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(formData.lastName)) {
      alert('Ingresa un nombre válido.');
      return;
    }
    if (formData.phone.replace(/\D/g, '').length < 7) {
      alert('Ingresa un teléfono válido (mínimo 7 dígitos).');
      return;
    }
    // Simulate API call and redirect
    navigate('/confirmation');
  };

  if (items.length === 0) {
    return (
      <div className="page">
        <div className="page-header">
          <h1 className="page-title">No hay productos</h1>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/')}>
          Volver a la tienda
        </button>
      </div>
    );
  }

  return (
    <div className="page checkout-page animate-fadeIn">
      <nav className="detail-nav">
        <Link to="/cart" className="back-link text-primary font-semibold">
          ← Volver al carrito
        </Link>
      </nav>

      <div className="page-header">
        <h1 className="page-title">Finalizar Compra</h1>
        <p className="page-subtitle">Completa tus datos para procesar el pedido</p>
      </div>

      <form onSubmit={handleSubmit} className="checkout-form stagger">
        <section className="form-section card">
          <h2 className="section-title">Información de contacto</h2>
          
          <div className="form-group mb-md">
            <label className="form-label" htmlFor="name">Nombre</label>
            <input 
              type="text" 
              id="name" 
              name="name" 
              className="form-input" 
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Ej. María"
              maxLength={60}
              autoComplete="given-name"
              required
            />
          </div>

          <div className="form-group mb-md">
            <label className="form-label" htmlFor="lastName">Apellido</label>
            <input 
              type="text" 
              id="lastName" 
              name="lastName" 
              className="form-input" 
              value={formData.lastName}
              onChange={handleInputChange}
              placeholder="Ej. Pérez"
              maxLength={60}
              autoComplete="family-name"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Teléfono</label>
            <div className="phone-input-group">
              <select 
                name="countryCode" 
                className="form-select phone-select" 
                value={formData.countryCode}
                onChange={handleInputChange}
                autoComplete="country-code"
              >
                {COUNTRY_CODES.map(c => (
                  <option key={c.code} value={c.code}>{c.short} ({c.code})</option>
                ))}
              </select>
              <input 
                type="tel" 
                name="phone" 
                className="form-input phone-number" 
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="414 1234567"
                inputMode="tel"
                maxLength={15}
                autoComplete="tel-national"
                required
              />
            </div>
          </div>
        </section>

        <section className="form-section card">
          <h2 className="section-title">Entrega</h2>
          <div className="radio-cards">
            {DELIVERY_TYPES.map(type => (
              <label 
                key={type.value} 
                className={`radio-card ${formData.deliveryType === type.value ? 'selected' : ''}`}
              >
                <input 
                  type="radio" 
                  name="deliveryType" 
                  value={type.value}
                  checked={formData.deliveryType === type.value}
                  onChange={handleInputChange}
                  className="visually-hidden"
                />
                <span className="radio-label">{type.label}</span>
              </label>
            ))}
          </div>
        </section>

        <section className="form-section card">
          <h2 className="section-title">Método de pago</h2>
          <div className="radio-cards">
            {PAYMENT_METHODS.map(method => (
              <label 
                key={method.value} 
                className={`radio-card ${formData.paymentMethod === method.value ? 'selected' : ''}`}
              >
                <input 
                  type="radio" 
                  name="paymentMethod" 
                  value={method.value}
                  checked={formData.paymentMethod === method.value}
                  onChange={handleInputChange}
                  className="visually-hidden"
                />
                <span className="radio-label">{method.label}</span>
              </label>
            ))}
          </div>
        </section>

        <section className="form-section card">
          <h2 className="section-title">Resumen del pedido</h2>
          <div className="order-summary-items">
            {items.map(item => (
              <div key={item.product.product_id} className="summary-item">
                <span className="summary-item-name">{item.quantity}x {item.product.product_name}</span>
                <span className="summary-item-price">
                  {formatPrice(Number(item.product.product_price) * item.quantity)}
                </span>
              </div>
            ))}
          </div>
          <div className="summary-total mt-md">
            <span>Total</span>
            <span className="text-primary">{formatPrice(total)}</span>
          </div>
        </section>

        <button type="submit" className="btn btn-primary btn-lg btn-block mt-md">
          Confirmar pedido
        </button>
      </form>
    </div>
  );
}
