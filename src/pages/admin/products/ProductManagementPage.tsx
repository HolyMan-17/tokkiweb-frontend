import { useMemo, useState } from 'react';
import { MOCK_PRODUCTS } from '../../../mock/data';
import type { Product } from '../../../types';
import { formatPrice, CATEGORIES } from '../../../constants';
import './ProductManagementPage.css';

type StockFilter = 'all' | 'in' | 'out';

export default function ProductManagementPage() {
  const [products] = useState<Product[]>(MOCK_PRODUCTS);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('Todos');
  const [stock, setStock] = useState<StockFilter>('all');

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
    setIsModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Saving product...');
    closeModal();
  };

  const handleArchive = (productId: number) => {
    if (window.confirm('¿Estás seguro de que deseas archivar este producto?')) {
      console.log(`Archiving product ${productId}`);
    }
  };

  const clearFilters = () => {
    setSearch('');
    setCategory('Todos');
    setStock('all');
  };

  const hasActiveFilters = search.trim() !== '' || category !== 'Todos' || stock !== 'all';

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
            ✨ Todos
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat.name}
              className={`chip ${category === cat.name ? 'chip-active' : ''}`}
              onClick={() => setCategory(cat.name)}
              role="tab"
              aria-selected={category === cat.name}
            >
              {cat.emoji} {cat.name}
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
            <form onSubmit={handleSave} className="modal-body">
              <div className="form-group">
                <label className="form-label">Nombre del Producto</label>
                <input 
                  type="text" 
                  className="form-input" 
                  defaultValue={editingProduct?.product_name || ''} 
                  required 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Precio ($)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  className="form-input" 
                  defaultValue={editingProduct?.product_price || ''} 
                  required 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Cantidad Disponible</label>
                <input 
                  type="number" 
                  className="form-input" 
                  defaultValue={editingProduct?.qty_available || 0} 
                  required 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Descripción</label>
                <textarea 
                  className="form-input" 
                  rows={4} 
                  defaultValue={editingProduct?.product_description || ''}
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
    </div>
  );
}
