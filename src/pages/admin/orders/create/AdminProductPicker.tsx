import { useState, useMemo } from 'react';
import type { Product } from '../../../../types';
import { CATEGORIES } from '../../../../constants';
import { getCategoryIcon } from '../../../../components/ui/CategoryIcons';
import { PosProductCard } from './PosProductCard';
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
          {filteredProducts.map((product) => (
            <PosProductCard
              key={product.product_id}
              product={product}
              selectedQty={getSelectedQty(selectedItems, product.product_id)}
              onAddItem={onAddItem}
              onUpdateQty={onUpdateQty}
              onRemoveItem={onRemoveItem}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default AdminProductPicker;
