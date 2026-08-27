interface PaymentOption {
  value: string;
  label: string;
}

interface CheckoutPaymentSectionProps {
  paymentMethod: string;
  paymentOptions: PaymentOption[];
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function CheckoutPaymentSection({
  paymentMethod,
  paymentOptions,
  onChange,
}: CheckoutPaymentSectionProps) {
  return (
    <section className="form-section card">
      <h2 className="section-title">Método de pago</h2>
      <div className="radio-cards">
        {paymentOptions.map((method) => (
          <label
            key={method.value}
            className={`radio-card ${paymentMethod === method.value ? 'selected' : ''}`}
          >
            <input
              type="radio"
              name="paymentMethod"
              value={method.value}
              checked={paymentMethod === method.value}
              onChange={onChange}
              className="visually-hidden"
            />
            <span className="radio-label">{method.label}</span>
          </label>
        ))}
      </div>
    </section>
  );
}

export default CheckoutPaymentSection;
