import { useMemo, useState, useRef, useEffect } from 'react';
import { fetchProducts, saveProducts } from '../../../store/localStore';
import { useAsync } from '../../../hooks/useAsync';
import type { Product } from '../../../types';
import { formatPrice, CATEGORIES } from '../../../constants';
import { getCategoryIcon } from '../../../components/ui/CategoryIcons';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import ErrorState from '../../../components/ui/ErrorState';
import sparklesGif from '../../../assets/sparkles.gif';
import './ProductManagementPage.css';

type StockFilter = 'all' | 'in' | 'out';

interface ProductFormState {
  product_name: string;
  product_price: string;
  qty_available: string;
  product_description: string;
  category: string;
}

interface FormErrors {
  product_name?: string;
  product_price?: string;
  qty_available?: string;
}

const EMPTY_FORM: ProductFormState = {
  product_name: '',
  product_price: '',
  qty_available: '',
  product_description: '',
  category: 'Otros',
};

// Sanitize text: strip control chars, collapse whitespace, trim.
function sanitizeText(value: string): string {
  return value
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Price: allow digits + at most one decimal point + up to 2 decimals.
function sanitizePrice(value: string): string {
  let v = value.replace(/[^\d.]/g, '');
  const firstDot = v.indexOf('.');
  if (firstDot !== -1) {
    v = v.slice(0, firstDot + 1) + v.slice(firstDot + 1).replace(/\./g, '');
  }
  const [int, dec] = v.split('.');
  if (dec && dec.length > 2) v = `${int}.${dec.slice(0, 2)}`;
  return v;
}

// Quantity: positive integers only.
function sanitizeQty(value: string): string {
  return value.replace(/[^\d]/g, '').replace(/^0+(?=\d)/, '');
}

function validateForm(form: ProductFormState): FormErrors {
  const errors: FormErrors = {};

  if (!form.product_name) {
    errors.product_name = 'El nombre es obligatorio.';
  } else if (form.product_name.length < 2) {
    errors.product_name = 'El nombre debe tener al menos 2 caracteres.';
  } else if (form.product_name.length > 80) {
    errors.product_name = 'El nombre no puede superar los 80 caracteres.';
  }

  if (!form.product_price) {
    errors.product_price = 'El precio es obligatorio.';
  } else if (Number(form.product_price) <= 0) {
    errors.product_price = 'El precio debe ser mayor que 0.';
  }

  if (form.qty_available === '') {
    errors.qty_available = 'La cantidad es obligatoria.';
  } else if (Number(form.qty_available) > 100000) {
    errors.qty_available = 'La cantidad no puede superar 100.000.';
  }

  return errors;
}

export default function ProductManagementPage() {
  const { data, isLoading, isError, retry } = useAsync(fetchProducts, []);
  const products = useMemo(() => data ?? [], [data]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('Todos');
  const [stock, setStock] = useState<StockFilter>('all');
  const [imagePreview, setImagePreview] = useState<string>('');
  const [form, setForm] = useState<ProductFormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<string | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Product | null>(null);
  const [imageErrorOpen, setImageErrorOpen] = useState(false);
  const toastTimer = useRef<number | null>(null);

  const showToast = (message: string) => {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2500);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter(p => {
      if (category !== 'Todos' && p.category !== category) return false;
      if (stock === 'in' && p.qty_available <= 0) return false;
      if (stock === 'out' && p.qty_available > 0) return false;
      if (q && !p.product_name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [products, search, category, stock]);

  const openAddModal = () => {
    setEditingProduct(null);
    setImagePreview('');
    setForm(EMPTY_FORM);
    setErrors({});
    setTouched({});
    setIsModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setImagePreview(product.product_image ?? '');
    setForm({
      product_name: product.product_name,
      product_price: product.product_price,
      qty_available: String(product.qty_available),
      product_description: product.product_description,
      category: product.category,
    });
    setErrors({});
    setTouched({});
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
    setImagePreview('');
    setForm(EMPTY_FORM);
    setErrors({});
    setTouched({});
  };

  const handleFieldChange = (field: keyof ProductFormState, raw: string) => {
    let value = raw;
    if (field === 'product_name' || field === 'product_description') {
      value = sanitizeText(value);
    } else if (field === 'product_price') {
      value = sanitizePrice(value);
    } else if (field === 'qty_available') {
      value = sanitizeQty(value);
    }
    setForm(prev => ({ ...prev, [field]: value }));
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const handleBlur = (field: keyof ProductFormState) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    if (file.size > 3 * 1024 * 1024) {
      setImageErrorOpen(true);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImagePreview(String(reader.result));
    reader.readAsDataURL(file);
  };

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const nextErrors = validateForm(form);
    setErrors(nextErrors);
    setTouched({ product_name: true, product_price: true, qty_available: true });
    if (Object.keys(nextErrors).length > 0) return;

    const qty = Number(form.qty_available);
    const productData: Product = {
      product_id: editingProduct?.product_id ?? Date.now(),
      product_name: form.product_name,
      product_price: form.product_price,
      product_description: form.product_description,
      qty_available: qty,
      in_stock: qty > 0,
      category: form.category,
      product_image: imagePreview || undefined,
    };

    try {
      if (editingProduct) {
        saveProducts(products.map(p =>
          p.product_id === editingProduct.product_id ? productData : p
        ));
      } else {
        saveProducts([...products, productData]);
      }
    } catch {
      showToast('No se pudo guardar el producto.');
      return;
    }
    closeModal();
    showToast(editingProduct ? 'Producto actualizado' : 'Producto agregado');
  };

  const handleArchive = (productId: number) => {
    setArchiveTarget(products.find(p => p.product_id === productId) ?? null);
  };

  const confirmArchive = () => {
    if (!archiveTarget) return;
    try {
      saveProducts(products.filter(p => p.product_id !== archiveTarget.product_id));
    } catch {
      showToast('No se pudo archivar el producto.');
      setArchiveTarget(null);
      return;
    }
    setArchiveTarget(null);
    showToast('Producto archivado');
  };

  const clearFilters = () => {
    setSearch('');
    setCategory('Todos');
    setStock('all');
  };

  const hasActiveFilters = search.trim() !== '' || category !== 'Todos' || stock !== 'all';

  useEffect(() => {
    return () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    };
  }, []);

  if (isLoading || isError) {
    return (
      <div className="page product-management-page">
        <header className="page-header">
          <div>
            <h1 className="page-title">Productos <span>({products.length})</span></h1>
          </div>
          <button className="btn btn-primary" onClick={openAddModal}>
            Agregar producto
          </button>
        </header>
        {isError ? <ErrorState onRetry={retry} /> : <LoadingSpinner fullPage />}
      </div>
    );
  }

  return (
    <div className="page product-management-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Productos <span>({products.length})</span></h1>
        </div>
        <button className="btn btn-primary" onClick={openAddModal}>
          Agregar producto
        </button>
      </header>

      {/* ── Browse toolbar ── */}
      <div className="products-toolbar">
        <div className="search-field">
          <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="search"
            className="search-input"
            placeholder="Buscar producto…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            aria-label="Buscar producto"
          />
          {search && (
            <button className="search-clear" onClick={() => setSearch('')} aria-label="Limpiar búsqueda">
              &times;
            </button>
          )}
        </div>

        <div className="category-chips" role="tablist" aria-label="Filtrar por categoría">
<button
              className={`chip ${category === 'Todos' ? 'chip-active' : ''}`}
              onClick={() => setCategory('Todos')}
              role="tab"
              aria-selected={category === 'Todos'}
            >
<img src={sparklesGif} alt="" className="category-emoji-img" width={188} height={200} />
            Todos
          </button>
            {CATEGORIES.map(cat => (
              <button
                key={cat.name}
                className={`chip ${category === cat.name ? 'chip-active' : ''}`}
                onClick={() => setCategory(cat.name)}
                role="tab"
                aria-selected={category === cat.name}
              >
                {getCategoryIcon(cat.name) ?? cat.emoji}
                {cat.name}
              </button>
            ))}
          </div>

        <div className="toolbar-bottom">
          <div className="stock-toggle" aria-label="Filtrar por stock">
            <button
              className={`stock-pill ${stock === 'all' ? 'stock-pill-active' : ''}`}
              onClick={() => setStock('all')}
            >
              Todos
            </button>
            <button
              className={`stock-pill ${stock === 'in' ? 'stock-pill-active' : ''}`}
              onClick={() => setStock('in')}
            >
              En stock
            </button>
            <button
              className={`stock-pill ${stock === 'out' ? 'stock-pill-active' : ''}`}
              onClick={() => setStock('out')}
            >
              Agotados
            </button>
          </div>

          <p className="results-count">
            {filtered.length} de {products.length} producto{products.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-emoji">🔍</div>
          <p className="empty-title">Sin resultados</p>
          <p className="empty-text">
            No hay productos que coincidan con tu búsqueda.
          </p>
          {hasActiveFilters && (
            <button className="btn btn-outline btn-sm" onClick={clearFilters}>
              Limpiar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="products-grid stagger">
          {filtered.map((product, index) => (
            <div
              key={product.product_id}
              className="card product-card-admin animate-slideUp"
              style={{ animationDelay: `${Math.min(index, 12) * 0.03}s` }}
            >
              <div className="product-thumb">
                {product.product_image ? (
                  <img src={product.product_image} alt={product.product_name} loading="lazy" />
                ) : (
                  <span className="product-thumb-letter">
                    {product.product_name.charAt(0)}
                  </span>
                )}
                {!product.in_stock && (
                  <span className="product-thumb-ribbon">Agotado</span>
                )}
              </div>

              <div className="product-body">
                <p className="product-name" title={product.product_name}>
                  {product.product_name}
                </p>
                <span className="product-category">{product.category}</span>
                <div className="product-details">
                  <span className="product-price">{formatPrice(product.product_price)}</span>
                  <span className={`stock-badge ${product.qty_available > 0 ? 'in-stock' : 'out-of-stock'}`}>
                    Stock: {product.qty_available}
                  </span>
                </div>
              </div>

              <div className="product-actions">
                <button className="btn btn-outline btn-sm action-btn" onClick={() => openEditModal(product)}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                  Editar
                </button>
                <button className="btn btn-sm action-btn action-btn-danger" onClick={() => handleArchive(product.product_id)}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                  Archivar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content animate-slideUp">
            <div className="modal-header">
              <h2>{editingProduct ? 'Editar Producto' : 'Nuevo Producto'}</h2>
              <button className="close-btn" onClick={closeModal}>&times;</button>
            </div>
            <form onSubmit={handleSave} className="modal-body" noValidate>
              <div className="form-group">
                <label className="form-label">Foto del Producto</label>
                <div className={`image-uploader ${imagePreview ? 'has-image' : ''}`}>
                  {imagePreview ? (
                    <>
                      <img src={imagePreview} alt="Vista previa del producto" className="image-uploader-preview" />
                      <div className="image-uploader-overlay">
                        <label className="image-uploader-btn">
                          Cambiar
                          <input type="file" accept="image/*" onChange={handleImageChange} hidden />
                        </label>
                        <button type="button" className="image-uploader-btn image-uploader-remove" onClick={() => setImagePreview('')}>
                          Quitar
                        </button>
                      </div>
                    </>
                  ) : (
                    <label className="image-uploader-empty">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="4" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <path d="M21 15l-5-5L5 21" />
                      </svg>
                      <span>Subir foto</span>
                      <small>PNG, JPG, WEBP… (máx. 3 MB)</small>
                      <input type="file" accept="image/*" onChange={handleImageChange} hidden />
                    </label>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Nombre del Producto</label>
                <input
                  type="text"
                  name="product_name"
                  className={`form-input ${touched.product_name && errors.product_name ? 'form-input-error' : ''}`}
                  value={form.product_name}
                  onChange={e => handleFieldChange('product_name', e.target.value)}
                  onBlur={() => handleBlur('product_name')}
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
                  <label className="form-label">Precio ($)</label>
                  <input
                    type="text"
                    name="product_price"
                    inputMode="decimal"
                    className={`form-input ${touched.product_price && errors.product_price ? 'form-input-error' : ''}`}
                    value={form.product_price}
                    onChange={e => handleFieldChange('product_price', e.target.value)}
                    onBlur={() => handleBlur('product_price')}
                    placeholder="0.00"
                    required
                  />
                  {touched.product_price && errors.product_price && (
                    <span className="form-error">{errors.product_price}</span>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Cantidad Disponible</label>
                  <input
                    type="text"
                    name="qty_available"
                    inputMode="numeric"
                    className={`form-input ${touched.qty_available && errors.qty_available ? 'form-input-error' : ''}`}
                    value={form.qty_available}
                    onChange={e => handleFieldChange('qty_available', e.target.value)}
                    onBlur={() => handleBlur('qty_available')}
                    placeholder="0"
                    required
                  />
                  {touched.qty_available && errors.qty_available && (
                    <span className="form-error">{errors.qty_available}</span>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Categoría</label>
                <select
                  name="category"
                  className="form-input form-select"
                  value={form.category}
                  onChange={e => handleFieldChange('category', e.target.value)}
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat.name} value={cat.name}>{cat.emoji} {cat.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Descripción</label>
                <textarea
                  name="product_description"
                  className="form-input"
                  rows={4}
                  value={form.product_description}
                  onChange={e => handleFieldChange('product_description', e.target.value)}
                  placeholder="Describe el producto…"
                ></textarea>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={closeModal}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <div className="product-toast" role="status">
          {toast}
        </div>
      )}

      <ConfirmDialog
        open={archiveTarget !== null}
        variant="danger"
        title="¿Archivar producto?"
        message={
          <>
            <strong>{archiveTarget?.product_name}</strong> se quitará de la tienda.{' '}
            Esta acción <strong>no se puede revertir</strong>.
          </>
        }
        confirmLabel="Sí, archivar"
        onConfirm={confirmArchive}
        onCancel={() => setArchiveTarget(null)}
      />

      <ConfirmDialog
        open={imageErrorOpen}
        variant="warning"
        title="Imagen muy pesada"
        message="La imagen no puede superar los 3 MB. Prueba con una más liviana."
        confirmLabel="Entendido"
        onConfirm={() => setImageErrorOpen(false)}
        onCancel={() => setImageErrorOpen(false)}
      />
    </div>
  );
}
