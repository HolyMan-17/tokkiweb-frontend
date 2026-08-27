import type { ChangeEvent } from 'react';
import {
  DELIVERY_OPTIONS,
  PAYMENT_OPTIONS,
  type CustomerForm,
  type FormErrors,
} from './createOrderConstants';

export interface CustomerFormCardProps {
  customer: CustomerForm;
  errors: FormErrors;
  deliveryType: string;
  paymentMethod: string;
  autoApprove: boolean;
  onCustomerChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onQuickFillCounter: () => void;
  onDeliveryTypeChange: (val: string) => void;
  onPaymentMethodChange: (val: string) => void;
  onAutoApproveChange: (val: boolean) => void;
}

export function CustomerFormCard({
  customer,
  errors,
  deliveryType,
  paymentMethod,
  autoApprove,
  onCustomerChange,
  onQuickFillCounter,
  onDeliveryTypeChange,
  onPaymentMethodChange,
  onAutoApproveChange,
}: CustomerFormCardProps) {
  return (
    <div className="create-order-card customer-section-card">
      <div className="card-header-flex">
        <h2 className="section-title font-display">Datos del Cliente</h2>
        <button
          type="button"
          className="btn-quick-fill"
          onClick={onQuickFillCounter}
          title="Llenar automáticamente con datos de cliente mostrador"
        >
          ⚡ Cliente en Mostrador
        </button>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label" htmlFor="customer-name">
            Nombre
          </label>
          <input
            id="customer-name"
            type="text"
            name="name"
            className={`form-input ${errors.name ? 'input-error' : ''}`}
            value={customer.name}
            onChange={onCustomerChange}
            placeholder="Ej. María"
            aria-invalid={Boolean(errors.name)}
            required
          />
          {errors.name && <span className="field-error-msg">{errors.name}</span>}
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="customer-lastname">
            Apellido
          </label>
          <input
            id="customer-lastname"
            type="text"
            name="last_name"
            className={`form-input ${errors.last_name ? 'input-error' : ''}`}
            value={customer.last_name}
            onChange={onCustomerChange}
            placeholder="Ej. Pérez"
            aria-invalid={Boolean(errors.last_name)}
            required
          />
          {errors.last_name && (
            <span className="field-error-msg">{errors.last_name}</span>
          )}
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label" htmlFor="customer-cedula">
            Cédula
          </label>
          <input
            id="customer-cedula"
            type="text"
            name="cedula"
            className={`form-input ${errors.cedula ? 'input-error' : ''}`}
            value={customer.cedula}
            onChange={onCustomerChange}
            placeholder="Ej. V-12345678"
            aria-invalid={Boolean(errors.cedula)}
            required
          />
          {errors.cedula && (
            <span className="field-error-msg">{errors.cedula}</span>
          )}
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="customer-phone">
            Teléfono
          </label>
          <input
            id="customer-phone"
            type="text"
            name="tlf_num"
            className={`form-input ${errors.tlf_num ? 'input-error' : ''}`}
            value={customer.tlf_num}
            onChange={onCustomerChange}
            placeholder="Ej. +584121234567"
            aria-invalid={Boolean(errors.tlf_num)}
            required
          />
          {errors.tlf_num && (
            <span className="field-error-msg">{errors.tlf_num}</span>
          )}
        </div>
      </div>

      <div className="form-group form-group-full">
        <label className="form-label" htmlFor="delivery-type">
          Método de Entrega
        </label>
        <select
          id="delivery-type"
          name="deliveryType"
          className="form-select"
          value={deliveryType}
          onChange={(e) => onDeliveryTypeChange(e.target.value)}
        >
          {DELIVERY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group form-group-full">
        <label className="form-label" htmlFor="payment-method">
          Método de Pago
        </label>
        <select
          id="payment-method"
          name="paymentMethod"
          className="form-select"
          value={paymentMethod}
          onChange={(e) => onPaymentMethodChange(e.target.value)}
        >
          {PAYMENT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="auto-approve-box">
        <label className="auto-approve-label">
          <input
            type="checkbox"
            className="form-checkbox"
            checked={autoApprove}
            onChange={(e) => onAutoApproveChange(e.target.checked)}
          />
          <span className="checkbox-text">
            Marcar como Aprobado inmediatamente
          </span>
        </label>
      </div>
    </div>
  );
}
