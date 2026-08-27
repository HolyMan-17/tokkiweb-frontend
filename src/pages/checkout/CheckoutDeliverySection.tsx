import { DELIVERY_TYPES } from '../../constants';

interface CheckoutDeliverySectionProps {
  deliveryType: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function CheckoutDeliverySection({
  deliveryType,
  onChange,
}: CheckoutDeliverySectionProps) {
  return (
    <section className="form-section card">
      <h2 className="section-title">Entrega</h2>
      <div className="radio-cards">
        {DELIVERY_TYPES.map((type) => (
          <label
            key={type.value}
            className={`radio-card ${deliveryType === type.value ? 'selected' : ''}`}
          >
            <input
              type="radio"
              name="deliveryType"
              value={type.value}
              checked={deliveryType === type.value}
              onChange={onChange}
              className="visually-hidden"
            />
            <span className="radio-label">{type.label}</span>
          </label>
        ))}
      </div>
    </section>
  );
}

export default CheckoutDeliverySection;
