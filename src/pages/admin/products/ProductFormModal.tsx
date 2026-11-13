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

export const RETRY_DELAY_MS = 1200;

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
  const [imageError, setImageError] = useState<string | null>(null);
  const imageFileRef = useRef<File | null>(null);
  const savedProductIdRef = useRef<number | null>(null);

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

  const successMessage = () =>
    editingProduct ? 'Producto actualizado' : 'Producto agregado';

  const attemptImageUpload = async (productId: number, file: File): Promise<boolean> => {
    if (!auth) return false;
    let uploaded = await uploadProductImage(productId, file, auth);
    if (uploaded.ok) return true;
    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
    uploaded = await uploadProductImage(productId, file, auth);
    if (uploaded.ok) return true;
    setImageError(uploaded.message);
    return false;
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
      // Un intento anterior ya confirmó el producto y solo falta resolver la
      // imagen: reenviar no debe volver a crear ni actualizar el producto.
      if (savedProductIdRef.current !== null) {
        const pendingFile = imageFileRef.current;
        if (pendingFile) {
          const uploaded = await attemptImageUpload(savedProductIdRef.current, pendingFile);
          if (uploaded) {
            setImageError(null);
            onSuccess(successMessage());
          }
          return;
        }
        setImageError(null);
        onSuccess(successMessage());
        return;
      }

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

      savedProductIdRef.current = saved.data.product_id;

      if (imageFileRef.current) {
        const uploaded = await attemptImageUpload(saved.data.product_id, imageFileRef.current);
        if (uploaded) {
          setImageError(null);
          onSuccess(successMessage());
        }
        return;
      }

      onSuccess(successMessage());
    } finally {
      setSaving(false);
    }
  };

  const handleRetryImage = async () => {
    if (!auth || saving || savedProductIdRef.current === null) return;
    const file = imageFileRef.current;
    if (!file) {
      setImageError(null);
      onSuccess(successMessage());
      return;
    }
    setSaving(true);
    try {
      const uploaded = await attemptImageUpload(savedProductIdRef.current, file);
      if (uploaded) {
        setImageError(null);
        onSuccess(successMessage());
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSaveWithoutImage = () => {
    setImageError(null);
    showToast('Producto guardado, pero sin imagen');
    onSuccess('Producto guardado');
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

          {imageError && (
            <div className="form-group" role="alert">
              <span className="form-error">
                No se pudo subir la imagen: {imageError}. El producto ya quedó guardado.
              </span>
              <button
                type="button"
                className="btn btn-outline"
                onClick={handleRetryImage}
                disabled={saving}
              >
                Reintentar imagen
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveWithoutImage}
                disabled={saving}
              >
                Guardar sin imagen
              </button>
            </div>
          )}

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
