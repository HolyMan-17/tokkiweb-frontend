// Shared browse filters row (stock pills + sort select) used by the category
// pages and the whole-inventory browser. Styles come from
// src/pages/category/CategoryPage.css, imported by both consuming pages.
export type SortOption = 'recent' | 'price-asc' | 'price-desc' | 'name';

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'recent',     label: 'Más recientes' },
  { value: 'price-asc',  label: 'Precio: menor a mayor' },
  { value: 'price-desc', label: 'Precio: mayor a menor' },
  { value: 'name',       label: 'Nombre A–Z' },
];

interface BrowseFiltersProps {
  stockOnly: boolean;
  onStockOnlyChange: (stockOnly: boolean) => void;
  sort: SortOption;
  onSortChange: (sort: SortOption) => void;
}

export function BrowseFilters({
  stockOnly,
  onStockOnlyChange,
  sort,
  onSortChange,
}: BrowseFiltersProps) {
  return (
    <div className="category-filters">
      <div className="filters-left">
        <button
          className={`category-stock-pill${!stockOnly ? ' active' : ''}`}
          onClick={() => onStockOnlyChange(false)}
        >
          Todos
        </button>
        <button
          className={`category-stock-pill${stockOnly ? ' active' : ''}`}
          onClick={() => onStockOnlyChange(true)}
        >
          En stock ✓
        </button>
      </div>

      <select
        className="sort-select"
        value={sort}
        onChange={e => onSortChange(e.target.value as SortOption)}
        aria-label="Ordenar productos"
      >
        {SORT_OPTIONS.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

export default BrowseFilters;
