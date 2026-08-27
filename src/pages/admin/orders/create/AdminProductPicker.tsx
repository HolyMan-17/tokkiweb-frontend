import { useState, useMemo } from 'react';
import type { Product } from '../../../../types';
import { CATEGORIES, formatPrice } from '../../../../constants';
import { getCategoryIcon } from '../../../../components/ui/CategoryIcons';
import sparklesGif from '../../../../assets/sparkles.gif';
import './AdminProductPicker.css';

export interface AdminProductPickerProps {
  products: Product[];
  selectedItems: Map<number, number> | Record<number, number>;
  onAddItem: (product: Product) => void;
  onUpdateQty: (productId: number, qty: number) => void;
  onRemoveItem: (productId: number) => void;
}

function getSelectedQty(
  selectedItems: Map<number, number> | Record<number, number>,
  productId: number,
): number {
  if (selectedItems instanceof Map) {
    return selectedItems.get(productId) ?? 0;
  }
  if (selectedItems && typeof selectedItems === 'object') {
    return (selectedItems as Record<number, number>)[productId] ?? 0;
  }
  return 0;
}

export function AdminProductPicker({
  products,
  selectedItems,
  onAddItem,
  onUpdateQty,
  onRemoveItem,
}: AdminProductPickerProps) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('Todos');

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (category !== 'Todos' && p.category !== category) return false;
      if (q) {
        const matchesName = p.product_name.toLowerCase().includes(q);
        const matchesCategory = p.category.toLowerCase().includes(q);
        if (!matchesName && !matchesCategory) return false;
      }
      return true;
    });
  }, [products, category, search]);

  const handleClearFilters = () => {
    setSearch('');
    setCategory('Todos');
  };

  const hasActiveFilters = search.trim() !== '' || category !== 'Todos';

  return (
    <div className="admin-product-picker">
      {/* ─── Toolbar (Search + Categories) ──────────────────────── */}
      <div className="pos-picker-toolbar">
        <div className="pos-search-field">
          <svg
            className="pos-search-icon"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="search"
            className="pos-search-input"
            placeholder="Buscar producto por nombre o categoría…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Buscar producto"
          />
          {search && (
            <button
              type="button"
              className="pos-search-clear"
              onClick={() => setSearch('')}
              aria-label="Limpiar búsqueda"
            >
              &times;
            </button>
          )}
        </div>

        {/* ─── Category Chips ────────────────────────────────────── */}
        <div
          className="pos-category-chips"
          role="tablist"
          aria-label="Filtrar por categoría"
        >
          <button
            type="button"
            className={`pos-chip ${category === 'Todos' ? 'chip-active' : ''}`}
            onClick={() => setCategory('Todos')}
            role="tab"
            aria-selected={category === 'Todos'}
          >
            <img
              src={sparklesGif}
              alt=""
              className="category-emoji-img"
              width={20}
              height={20}
            />
            <span>Todos</span>
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.name}
              type="button"
              className={`pos-chip ${category === cat.name ? 'chip-active' : ''}`}
              onClick={() => setCategory(cat.name)}
              role="tab"
              aria-selected={category === cat.name}
            >
              {getCategoryIcon(cat.name) ?? cat.emoji}
              <span>{cat.name}</span>
            </button>
          ))}
        </div>

        {/* ─── Results Info ─────────────────────────────────────── */}
        <div className="pos-results-info">
          <span>
            {filteredProducts.length} de {products.length} producto
            {products.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* ─── Products Grid / Empty State ────────────────────────── */}
      {filteredProducts.length === 0 ? (
        <div className="pos-empty-state">
          <img
            src={sparklesGif}
            alt=""
            className="pos-empty-sparkles"
            width={36}
            height={36}
          />
          <p className="pos-empty-title">Sin resultados</p>
          <p className="pos-empty-text">No hay productos que coincidan con tu búsqueda.</p>
          {hasActiveFilters && (
            <button
              type="button"
              className="btn btn-outline btn-sm pos-btn-clear"
              onClick={handleClearFilters}
            >
              Limpiar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="pos-products-grid">
          {filteredProducts.map((product) => {
            const selectedQty = getSelectedQty(selectedItems, product.product_id);
            const isOutOfStock = product.qty_available <= 0 || !product.in_stock;
            const isMaxReached = selectedQty >= product.qty_available;

            return (
              <div
                key={product.product_id}
                className={`pos-product-card ${
                  selectedQty > 0 ? 'card-selected' : ''
                } ${isOutOfStock ? 'card-out-of-stock' : ''}`}
              >
                {/* ── Visual Badge if Added ── */}
                {selectedQty > 0 && (
                  <span
                    className="pos-selected-badge"
                    data-testid={`selected-badge-${product.product_id}`}
                  >
                    En pedido: {selectedQty}
                  </span>
                )}

                {/* ── Thumbnail ── */}
                <div className="pos-product-thumb">
                  {product.product_image_url ? (
                    <img
                      src={product.product_image_url}
                      alt={product.product_name}
                      loading="lazy"
                      className="pos-thumb-img"
                    />
                  ) : (
                    <div className="pos-thumb-placeholder">
                      {product.product_name.charAt(0)}
                    </div>
                  )}
                  {isOutOfStock && (
                    <span className="pos-sold-out-ribbon">Agotado</span>
                  )}
                </div>

                {/* ── Body ── */}
                <div className="pos-product-body">
                  <span className="pos-product-category">{product.category}</span>
                  <p className="pos-product-name" title={product.product_name}>
                    {product.product_name}
                  </p>
                  <div className="pos-product-meta">
                    <span className="pos-product-price">
                      {formatPrice(product.product_price)}
                    </span>
                    <span
                      className={`pos-stock-badge ${
                        product.qty_available > 0
                          ? product.qty_available <= 3
                            ? 'low-stock'
                            : 'in-stock'
                          : 'out-of-stock'
                      }`}
                    >
                      {product.qty_available > 0
                        ? `${product.qty_available} ${
                            product.qty_available === 1 ? 'disponible' : 'disponibles'
                          }`
                        : 'Agotado'}
                    </span>
                  </div>
                </div>

                {/* ── Actions ── */}
                <div className="pos-product-actions">
                  {selectedQty === 0 ? (
                    <button
                      type="button"
                      className="btn btn-sm btn-primary pos-add-btn"
                      disabled={isOutOfStock || isMaxReached}
                      onClick={() => onAddItem(product)}
                      aria-label={`Agregar ${product.product_name}`}
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                      Agregar
                    </button>
                  ) : (
                    <div className="pos-qty-stepper">
                      <div className="pos-qty-controls">
                        <button
                          type="button"
                          className="pos-qty-btn pos-qty-decrease"
                          onClick={() => {
                            if (selectedQty <= 1) {
                              onRemoveItem(product.product_id);
                            } else {
                              onUpdateQty(product.product_id, selectedQty - 1);
                            }
                          }}
                          aria-label={`Disminuir cantidad de ${product.product_name}`}
                        >
                          &minus;
                        </button>
                        <span
                          className="pos-qty-num"
                          data-testid={`selected-qty-${product.product_id}`}
                        >
                          {selectedQty}
                        </span>
                        <button
                          type="button"
                          className="pos-qty-btn pos-qty-increase"
                          disabled={isMaxReached}
                          onClick={() =>
                            onUpdateQty(product.product_id, selectedQty + 1)
                          }
                          aria-label={`Aumentar cantidad de ${product.product_name}`}
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        className="pos-remove-btn"
                        onClick={() => onRemoveItem(product.product_id)}
                        aria-label={`Quitar ${product.product_name} del pedido`}
                        title="Quitar del pedido"
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default AdminProductPicker;
