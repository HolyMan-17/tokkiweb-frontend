import { useState, useRef } from 'react';
import type { Product } from '../../../types';
import { CATEGORIES } from '../../../constants';
import {
  createProduct,
  updateProduct,
  uploadProductImage,
  removeProductImage,
} from '../../../api/products';
import { ProductImageUploader } from './ProductImageUploader';
import {
  ProductFormFields,
  type ProductFormState,
  type FormErrors,
} from './ProductFormFields';

const EMPTY_FORM: ProductFormState = {
  product_name: '',
  product_price: '',
  qty_available: '',
  product_description: '',
  category: CATEGORIES[0].name,
};

function sanitizeTextInput(value: string): string {
  return value.replace(/[^\p{L}\p{N}\s.,!?'"()\-–—/&%+*#@:;]/gu, '').slice(0, 500);
}

function sanitizePrice(value: string): string {
  return value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1').slice(0, 10);
}

function sanitizeQty(value: string): string {
  return value.replace(/[^0-9]/g, '').slice(0, 6);
}

function normalizeTextInput(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function validateForm(form: ProductFormState): FormErrors {
  const errors: FormErrors = {};
  const name = form.product_name.trim();
  if (!name) {
    errors.product_name = 'El nombre es obligatorio.';
  } else if (name.length < 2) {
    errors.product_name = 'El nombre debe tener al menos 2 caracteres.';
  }

  const priceNum = Number(form.product_price);
  if (!form.product_price.trim() || Number.isNaN(priceNum)) {
    errors.product_price = 'Ingresa un precio válido.';
  } else if (priceNum <= 0) {
    errors.product_price = 'El precio debe ser mayor a 0.';
  }

  const qtyNum = Number(form.qty_available);
  if (!form.qty_available.trim() || !Number.isInteger(qtyNum)) {
    errors.qty_available = 'Ingresa una cantidad entera.';
  } else if (qtyNum < 0) {
    errors.qty_available = 'El stock no puede ser negativo.';
  }

  return errors;
}

interface ProductFormModalProps {
  open: boolean;
  editingProduct: Product | null;
  auth?: { getToken?: () => Promise<string | null> };
  onClose: () => void;
  onSuccess: (message: string) => void;
  showToast: (message: string) => void;
  onImageTooLarge: () => void;
}

export function ProductFormModal({
  open,
  editingProduct,
  auth,
  onClose,
  onSuccess,
  showToast,
  onImageTooLarge,
}: ProductFormModalProps) {
  const [form, setForm] = useState<ProductFormState>(() =>
    editingProduct
      ? {
          product_name: editingProduct.product_name,
          product_price: editingProduct.product_price,
          qty_available: String(editingProduct.qty_available),
          product_description: editingProduct.product_description,
          category: editingProduct.category,
        }
      : EMPTY_FORM,
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [previewUrl, setPreviewUrl] = useState<string>(() => editingProduct?.product_image_url ?? '');
  const [saving, setSaving] = useState(false);
  const imageFileRef = useRef<File | null>(null);

  if (!open) return null;

  const handleFieldChange = (field: keyof ProductFormState, raw: string) => {
    let value = raw;
    if (field === 'product_name' || field === 'product_description') {
      value = sanitizeTextInput(value);
    } else if (field === 'product_price') {
      value = sanitizePrice(value);
    } else if (field === 'qty_available') {
      value = sanitizeQty(value);
    }
    setForm(prev => ({ ...prev, [field]: value }));
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const handleBlur = (field: keyof ProductFormState) => {
    if (field === 'product_name' || field === 'product_description') {
      setForm(prev => ({ ...prev, [field]: normalizeTextInput(prev[field]) }));
    }
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const handleRemoveImage = async () => {
    if (!editingProduct?.product_image_url || !auth) {
      setPreviewUrl('');
      return;
    }
    const result = await removeProductImage(editingProduct.product_id, auth);
    if (!result.ok) {
      showToast(result.message);
      return;
    }
    setPreviewUrl('');
    showToast('Imagen eliminada');
    onSuccess(editingProduct ? 'Producto actualizado' : 'Producto agregado');
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const normalized: ProductFormState = {
      ...form,
      product_name: normalizeTextInput(form.product_name),
      product_description: normalizeTextInput(form.product_description),
    };
    const nextErrors = validateForm(normalized);
    setErrors(nextErrors);
    setTouched({ product_name: true, product_price: true, qty_available: true });
    if (Object.keys(nextErrors).length > 0) return;
    if (!auth) {
      showToast('El panel necesita Clerk configurado para escribir en la tienda.');
      return;
    }
    setForm(normalized);
    setSaving(true);

    try {
      const payload = {
        product_name: normalized.product_name,
        product_price: Number(normalized.product_price),
        product_description: normalized.product_description,
        category: normalized.category,
        qty_available: Number(normalized.qty_available),
      };

      const saved = editingProduct
        ? await updateProduct(editingProduct.product_id, payload, auth)
        : await createProduct(payload, auth);
      if (!saved.ok) {
        showToast(saved.message);
        return;
      }

      if (imageFileRef.current) {
        const uploaded = await uploadProductImage(saved.data.product_id, imageFileRef.current, auth);
        if (!uploaded.ok) {
          showToast(`Producto guardado, pero la imagen falló: ${uploaded.message}`);
          onSuccess('Producto guardado');
          return;
        }
      }

      onSuccess(editingProduct ? 'Producto actualizado' : 'Producto agregado');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content animate-slideUp">
        <div className="modal-header">
          <h2>{editingProduct ? 'Editar Producto' : 'Nuevo Producto'}</h2>
          <button className="close-btn" onClick={onClose} aria-label="Cerrar modal">
            &times;
          </button>
        </div>
        <form onSubmit={handleSave} className="modal-body" noValidate>
          <ProductImageUploader
            previewUrl={previewUrl}
            imageFileRef={imageFileRef}
            setPreviewUrl={setPreviewUrl}
            showToast={showToast}
            onImageTooLarge={onImageTooLarge}
            onRemoveCurrent={handleRemoveImage}
          />

          <ProductFormFields
            form={form}
            errors={errors}
            touched={touched}
            onChange={handleFieldChange}
            onBlur={handleBlur}
          />

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-outline"
              onClick={onClose}
              disabled={saving}
            >
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ProductFormModal;
