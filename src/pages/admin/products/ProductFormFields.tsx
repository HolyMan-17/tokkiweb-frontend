import { CATEGORIES } from '../../../constants';
import PriceDisplay from '../../../components/ui/PriceDisplay';
import { normalizeDiscountPercent } from '../../../utils/pricing';

export interface ProductFormState {
  product_name: string;
  product_price: string;
  apply_discount: boolean;
  discount_percent: string;
  qty_available: string;
  product_description: string;
  category: string;
}

export type ProductFormTextField = Exclude<keyof ProductFormState, 'apply_discount'>;
export type FormErrors = Partial<Record<keyof ProductFormState, string>>;

interface ProductFormFieldsProps {
  form: ProductFormState;
  errors: FormErrors;
  touched: Record<string, boolean>;
  onChange: (field: ProductFormTextField, raw: string) => void;
  onBlur: (field: ProductFormTextField) => void;
  onToggleDiscount: (checked: boolean) => void;
}

function DiscountInputPanel({
  productPrice,
  discountPercent,
  error,
  hasError,
  onChange,
  onBlur,
}: {
  productPrice: string;
  discountPercent: string;
  error?: string;
  hasError: boolean;
  onChange: (value: string) => void;
  onBlur: () => void;
}) {
  const previewDiscount = normalizeDiscountPercent(Number(discountPercent));
  const showPreview = previewDiscount > 0 && Number(productPrice) > 0;

  return (
    <div className="discount-panel">
      <div className="form-group">
        <label className="form-label" htmlFor="discount_percent">
          Porcentaje de descuento (%)
        </label>
        <input
          type="text"
          id="discount_percent"
          name="discount_percent"
          inputMode="numeric"
          maxLength={2}
          className={`form-input ${hasError ? 'form-input-error' : ''}`}
          value={discountPercent}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder="Ej. 20"
          required
        />
        {hasError && error && <span className="form-error">{error}</span>}
      </div>

      {showPreview && (
        <div className="discount-preview">
          <span className="discount-preview-label">Precio con descuento:</span>
          <PriceDisplay
            product={{
              product_price: productPrice,
              discount_percent: previewDiscount,
            }}
            showBadge
            size="compact"
          />
        </div>
      )}
    </div>
  );
}

export function ProductFormFields({
  form,
  errors,
  touched,
  onChange,
  onBlur,
  onToggleDiscount,
}: ProductFormFieldsProps) {
  const hasFieldError = (field: ProductFormTextField) =>
    Boolean(touched[field] && errors[field]);

  return (
    <>
      <div className="form-group">
        <label className="form-label" htmlFor="product_name">
          Nombre del Producto
        </label>
        <input
          type="text"
          id="product_name"
          name="product_name"
          className={`form-input ${hasFieldError('product_name') ? 'form-input-error' : ''}`}
          value={form.product_name}
          onChange={(e) => onChange('product_name', e.target.value)}
          onBlur={() => onBlur('product_name')}
          maxLength={80}
          placeholder="Ej. Bálsamo de Fresa"
          required
        />
        {hasFieldError('product_name') && (
          <span className="form-error">{errors.product_name}</span>
        )}
      </div>

      <div className="form-row form-row--price-discount">
        <div className="form-group">
          <label className="form-label" htmlFor="product_price">
            Precio ($)
          </label>
          <input
            type="text"
            id="product_price"
            name="product_price"
            inputMode="decimal"
            className={`form-input ${hasFieldError('product_price') ? 'form-input-error' : ''}`}
            value={form.product_price}
            onChange={(e) => onChange('product_price', e.target.value)}
            onBlur={() => onBlur('product_price')}
            placeholder="0.00"
            required
          />
          {hasFieldError('product_price') && (
            <span className="form-error">{errors.product_price}</span>
          )}
        </div>

        <div className="form-group discount-toggle-group">
          <span className="form-label discount-spacer-label" aria-hidden="true">
            Descuento
          </span>
          <label className="discount-toggle-box" htmlFor="apply_discount">
            <input
              type="checkbox"
              id="apply_discount"
              name="apply_discount"
              className="discount-toggle-checkbox"
              checked={form.apply_discount}
              onChange={(e) => onToggleDiscount(e.target.checked)}
            />
            <span className="discount-toggle-text">Aplicar descuento</span>
          </label>
        </div>
      </div>

      {form.apply_discount && (
        <DiscountInputPanel
          productPrice={form.product_price}
          discountPercent={form.discount_percent}
          error={errors.discount_percent}
          hasError={hasFieldError('discount_percent')}
          onChange={(val) => onChange('discount_percent', val)}
          onBlur={() => onBlur('discount_percent')}
        />
      )}

      <div className="form-row">
        <div className="form-group">
          <label className="form-label" htmlFor="qty_available">
            Cantidad Disponible
          </label>
          <input
            type="text"
            id="qty_available"
            name="qty_available"
            inputMode="numeric"
            className={`form-input ${hasFieldError('qty_available') ? 'form-input-error' : ''}`}
            value={form.qty_available}
            onChange={(e) => onChange('qty_available', e.target.value)}
            onBlur={() => onBlur('qty_available')}
            placeholder="0"
            required
          />
          {hasFieldError('qty_available') && (
            <span className="form-error">{errors.qty_available}</span>
          )}
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="category">
            Categoría
          </label>
          <select
            id="category"
            name="category"
            className="form-input form-select"
            value={form.category}
            onChange={(e) => onChange('category', e.target.value)}
          >
            {CATEGORIES.map((cat) => (
              <option key={cat.name} value={cat.name}>
                {cat.emoji} {cat.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="product_description">
          Descripción
        </label>
        <textarea
          id="product_description"
          name="product_description"
          className="form-input"
          rows={4}
          value={form.product_description}
          onChange={(e) => onChange('product_description', e.target.value)}
          placeholder="Describe el producto…"
        ></textarea>
      </div>
    </>
  );
}

export default ProductFormFields;
