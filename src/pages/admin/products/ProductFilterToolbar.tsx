import { CATEGORIES } from '../../../constants';
import { getCategoryIcon } from '../../../components/ui/CategoryIcons';
import sparklesGif from '../../../assets/sparkles.gif';

export type StockFilter = 'all' | 'in' | 'low' | 'out';

interface ProductFilterToolbarProps {
  search: string;
  category: string;
  stock: StockFilter;
  filteredCount: number;
  totalCount: number;
  onSearchChange: (value: string) => void;
  onCategoryChange: (category: string) => void;
  onStockChange: (stock: StockFilter) => void;
}

export function ProductFilterToolbar({
  search,
  category,
  stock,
  filteredCount,
  totalCount,
  onSearchChange,
  onCategoryChange,
  onStockChange,
}: ProductFilterToolbarProps) {
  return (
    <div className="products-toolbar">
      <div className="search-field">
        <svg
          className="search-icon"
          width="16"
          height="16"
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
          className="search-input"
          placeholder="Buscar producto…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Buscar producto"
        />
        {search && (
          <button
            type="button"
            className="search-clear"
            onClick={() => onSearchChange('')}
            aria-label="Limpiar búsqueda"
          >
            &times;
          </button>
        )}
      </div>

      <div className="category-chips" role="tablist" aria-label="Filtrar por categoría">
        <button
          type="button"
          className={`chip ${category === 'Todos' ? 'chip-active' : ''}`}
          onClick={() => onCategoryChange('Todos')}
          role="tab"
          aria-selected={category === 'Todos'}
        >
          <img src={sparklesGif} alt="" className="category-emoji-img" width={188} height={200} />
          Todos
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.name}
            type="button"
            className={`chip ${category === cat.name ? 'chip-active' : ''}`}
            onClick={() => onCategoryChange(cat.name)}
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
            type="button"
            className={`stock-pill ${stock === 'all' ? 'stock-pill-active' : ''}`}
            onClick={() => onStockChange('all')}
          >
            Todos
          </button>
          <button
            type="button"
            className={`stock-pill ${stock === 'in' ? 'stock-pill-active' : ''}`}
            onClick={() => onStockChange('in')}
          >
            En stock
          </button>
          <button
            type="button"
            className={`stock-pill stock-pill-low ${stock === 'low' ? 'stock-pill-active stock-pill-low-active' : ''}`}
            onClick={() => onStockChange('low')}
          >
            Bajo stock (≤3)
          </button>
          <button
            type="button"
            className={`stock-pill ${stock === 'out' ? 'stock-pill-active' : ''}`}
            onClick={() => onStockChange('out')}
          >
            Agotados
          </button>
        </div>

        <p className="results-count">
          {filteredCount} de {totalCount} producto{totalCount !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  );
}

export default ProductFilterToolbar;
