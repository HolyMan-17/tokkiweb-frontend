import { useRef, useState } from 'react';
import type { Product } from '../../../types';
import { CATEGORIES } from '../../../constants';
import { createProduct, updateProduct } from '../../../api/products';
import { ProductImagesUploader } from './ProductImagesUploader';
import {
  ProductFormFields,
  type ProductFormState,
  type FormErrors,
} from './ProductFormFields';
import { useProductGallery, RETRY_DELAY_MS } from './useProductGallery';

export { RETRY_DELAY_MS };

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

function failureText(count: number): string {
  return count === 1 ? 'No se pudo subir 1 imagen' : `No se pudieron subir ${count} imágenes`;
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
  const [saving, setSaving] = useState(false);
  const gallery = useProductGallery({ editingProduct, auth, showToast });
  const savedProductIdRef = useRef<number | null>(null);

  if (!open) return null;

  const successMessage = () =>
    editingProduct ? 'Producto actualizado' : 'Producto agregado';

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

  const resolvePendingUploads = async (productId: number): Promise<boolean> => {
    const { failed, message } = await gallery.processUploadQueue(productId);
    if (failed > 0) {
      gallery.setUploadFailure({ count: failed, message: message ?? 'Error de red.' });
      return false;
    }
    return true;
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
      // subida pendiente: reenviar no debe volver a crear ni actualizar el producto.
      if (savedProductIdRef.current !== null) {
        const productId = savedProductIdRef.current;
        if (gallery.hasUnfinishedUploads()) {
          gallery.resetFailedToQueued();
          const resolved = await resolvePendingUploads(productId);
          if (!resolved) return;
        }
        await gallery.finalize(productId, {
          onDone: () => onSuccess(successMessage()),
        });
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

      if (gallery.hasUnfinishedUploads()) {
        const resolved = await resolvePendingUploads(saved.data.product_id);
        if (!resolved) return;
      }
      await gallery.finalize(saved.data.product_id, {
        onDone: () => onSuccess(successMessage()),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRetryUploads = async () => {
    if (!auth || saving || savedProductIdRef.current === null) return;
    setSaving(true);
    try {
      const productId = savedProductIdRef.current;
      gallery.resetFailedToQueued();
      const resolved = await resolvePendingUploads(productId);
      if (!resolved) return;
      await gallery.finalize(productId, {
        onDone: () => onSuccess(successMessage()),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleContinueWithoutFailed = () => {
    const failedCount = gallery.discardFailed();
    showToast(
      failedCount === 1
        ? 'Producto guardado; se descartó 1 imagen.'
        : `Producto guardado; se descartaron ${failedCount} imágenes.`,
    );
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
          <ProductImagesUploader
            gallery={gallery.gallery}
            onFilesSelected={gallery.handleFilesSelected}
            onRemoveItem={gallery.removeItem}
            onMakeCover={gallery.makeCover}
            showToast={showToast}
            onImageTooLarge={onImageTooLarge}
          />

          <ProductFormFields
            form={form}
            errors={errors}
            touched={touched}
            onChange={handleFieldChange}
            onBlur={handleBlur}
          />

          {gallery.uploadFailure && (
            <div className="form-group" role="alert">
              <span className="form-error">
                {failureText(gallery.uploadFailure.count)}: {gallery.uploadFailure.message}.
                El producto ya quedó guardado.
              </span>
              <button
                type="button"
                className="btn btn-outline"
                onClick={handleRetryUploads}
                disabled={saving}
              >
                Reintentar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleContinueWithoutFailed}
                disabled={saving}
              >
                Continuar sin ellas
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
