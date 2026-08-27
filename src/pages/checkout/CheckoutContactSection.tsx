import type { CountryCode } from '../../constants';
import { CEDULA_TYPES, COUNTRY_CODES, getCountryHint, normalizePhoneNumber } from '../../constants';

interface CheckoutFormData {
  name: string;
  lastName: string;
  cedulaType: string;
  cedula: string;
  countryCode: string;
  phone: string;
}

interface CheckoutContactSectionProps {
  formData: CheckoutFormData;
  cedulaError: string;
  phoneError: string;
  selectedCountry: CountryCode;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
}

export function CheckoutContactSection({
  formData,
  cedulaError,
  phoneError,
  selectedCountry,
  onChange,
}: CheckoutContactSectionProps) {
  return (
    <section className="form-section card">
      <h2 className="section-title">Información de contacto</h2>

      <div className="form-group mb-md">
        <label className="form-label" htmlFor="name">
          Nombre
        </label>
        <input
          type="text"
          id="name"
          name="name"
          className="form-input"
          value={formData.name}
          onChange={onChange}
          placeholder="Ej. María"
          maxLength={60}
          autoComplete="given-name"
          required
        />
      </div>

      <div className="form-group mb-md">
        <label className="form-label" htmlFor="lastName">
          Apellido
        </label>
        <input
          type="text"
          id="lastName"
          name="lastName"
          className="form-input"
          value={formData.lastName}
          onChange={onChange}
          placeholder="Ej. Pérez"
          maxLength={60}
          autoComplete="family-name"
          required
        />
      </div>

      <div className="form-group mb-md">
        <label className="form-label" htmlFor="cedula">
          Cédula
        </label>
        <div className="phone-input-group">
          <select
            name="cedulaType"
            id="cedulaType"
            className="form-select phone-select cedula-select"
            value={formData.cedulaType}
            onChange={onChange}
            aria-label="Tipo de cédula"
          >
            {CEDULA_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <input
            type="tel"
            name="cedula"
            id="cedula"
            className={`form-input phone-number ${cedulaError ? 'form-input-error' : ''}`}
            value={formData.cedula}
            onChange={onChange}
            placeholder="Ej. 12345678"
            inputMode="numeric"
            maxLength={9}
            aria-invalid={cedulaError ? 'true' : 'false'}
            required
          />
        </div>
        {formData.cedula && !cedulaError && (
          <p className="phone-preview" role="status">
            {formData.cedulaType}-{formData.cedula}
          </p>
        )}
        {cedulaError && (
          <p className="phone-preview phone-preview-error" role="status">
            {cedulaError}
          </p>
        )}
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="phone">
          Teléfono
        </label>
        <div className="phone-input-group">
          <select
            name="countryCode"
            id="countryCode"
            className="form-select phone-select"
            value={formData.countryCode}
            onChange={onChange}
            autoComplete="tel-country-code"
            aria-label="Código de país"
          >
            {COUNTRY_CODES.map((c) => (
              <option key={`${c.short}-${c.code}`} value={c.code}>
                {c.short} ({c.code})
              </option>
            ))}
          </select>
          <input
            type="tel"
            name="phone"
            id="phone"
            className={`form-input phone-number ${phoneError ? 'form-input-error' : ''}`}
            value={formData.phone}
            onChange={onChange}
            placeholder={getCountryHint(selectedCountry)}
            inputMode="tel"
            maxLength={selectedCountry.digits + 1}
            autoComplete="tel-national"
            aria-invalid={phoneError ? 'true' : 'false'}
            required
          />
        </div>
        <p className="form-hint">Número para coordinar entrega y pago vía WhatsApp</p>
        {formData.phone && (
          <p className={`phone-preview ${phoneError ? 'phone-preview-error' : ''}`} role="status">
            {selectedCountry.code} {normalizePhoneNumber(selectedCountry, formData.phone) || '· · ·'}
          </p>
        )}
      </div>
    </section>
  );
}

export default CheckoutContactSection;
