import { CATEGORIES } from '../../../constants';

export interface ProductFormState {
  product_name: string;
  product_price: string;
  qty_available: string;
  product_description: string;
  category: string;
}

export type FormErrors = Partial<Record<keyof ProductFormState, string>>;

interface ProductFormFieldsProps {
  form: ProductFormState;
  errors: FormErrors;
  touched: Record<string, boolean>;
  onChange: (field: keyof ProductFormState, raw: string) => void;
  onBlur: (field: keyof ProductFormState) => void;
}

export function ProductFormFields({
  form,
  errors,
  touched,
  onChange,
  onBlur,
}: ProductFormFieldsProps) {
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
          className={`form-input ${touched.product_name && errors.product_name ? 'form-input-error' : ''}`}
          value={form.product_name}
          onChange={(e) => onChange('product_name', e.target.value)}
          onBlur={() => onBlur('product_name')}
          maxLength={80}
          placeholder="Ej. Bálsamo de Fresa"
          required
        />
        {touched.product_name && errors.product_name && (
          <span className="form-error">{errors.product_name}</span>
        )}
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label" htmlFor="product_price">
            Precio ($)
          </label>
          <input
            type="text"
            id="product_price"
            name="product_price"
            inputMode="decimal"
            className={`form-input ${touched.product_price && errors.product_price ? 'form-input-error' : ''}`}
            value={form.product_price}
            onChange={(e) => onChange('product_price', e.target.value)}
            onBlur={() => onBlur('product_price')}
            placeholder="0.00"
            required
          />
          {touched.product_price && errors.product_price && (
            <span className="form-error">{errors.product_price}</span>
          )}
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="qty_available">
            Cantidad Disponible
          </label>
          <input
            type="text"
            id="qty_available"
            name="qty_available"
            inputMode="numeric"
            className={`form-input ${touched.qty_available && errors.qty_available ? 'form-input-error' : ''}`}
            value={form.qty_available}
            onChange={(e) => onChange('qty_available', e.target.value)}
            onBlur={() => onBlur('qty_available')}
            placeholder="0"
            required
          />
          {touched.qty_available && errors.qty_available && (
            <span className="form-error">{errors.qty_available}</span>
          )}
        </div>
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
