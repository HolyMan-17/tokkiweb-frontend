import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import '../category/CategoryPage.css'; // shared browse styles (search/sort/stock/grid)
import { fetchAllProducts } from '../../api/products';
import { useAsync } from '../../hooks/useAsync';
import ProductCard from '../../components/ui/ProductCard';
import CatalogTopNav from '../../components/layout/CatalogTopNav';
import ErrorState from '../../components/ui/ErrorState';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { ROUTES } from '../../lib/routes';
import sparklesImg from '../../assets/sparkles.gif';

type SortOption = 'recent' | 'price-asc' | 'price-desc' | 'name';

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'recent',     label: 'Más recientes' },
  { value: 'price-asc',  label: 'Precio: menor a mayor' },
  { value: 'price-desc', label: 'Precio: mayor a menor' },
  { value: 'name',       label: 'Nombre A–Z' },
];

const SEARCH_SVG = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const CLEAR_SVG = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

// "Ver más" page for the catalog's "Todos" section — browsable grid of the
// whole inventory with the same search / stock / sort controls as category
// pages (styles are shared via CategoryPage.css).
export default function AllProductsPage() {
  const { data, isLoading, isError, retry } = useAsync(fetchAllProducts, []);
  const allProducts = useMemo(() => data ?? [], [data]);

  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortOption>('recent');
  const [stockOnly, setStockOnly] = useState(false);

  const filtered = useMemo(() => {
    let result = [...allProducts];

    // Search filter (name + description)
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      result = result.filter(p =>
        p.product_name.toLowerCase().includes(q) ||
        p.product_description.toLowerCase().includes(q),
      );
    }

    // Stock filter
    if (stockOnly) {
      result = result.filter(p => p.in_stock && p.qty_available > 0);
    }

    // Sort
    switch (sort) {
      case 'price-asc':
        result.sort((a, b) => Number(a.product_price) - Number(b.product_price));
        break;
      case 'price-desc':
        result.sort((a, b) => Number(b.product_price) - Number(a.product_price));
        break;
      case 'name':
        result.sort((a, b) => a.product_name.localeCompare(b.product_name));
        break;
      // 'recent' = original order
    }

    return result;
  }, [allProducts, query, sort, stockOnly]);

  const hasActiveFilters = query.trim() !== '' || stockOnly || sort !== 'recent';
  const isFiltered = filtered.length !== allProducts.length;

  const clearFilters = () => {
    setQuery('');
    setSort('recent');
    setStockOnly(false);
  };

  if (isLoading) {
    return (
      <>
        <CatalogTopNav />
        <LoadingSpinner fullPage />
      </>
    );
  }

  if (isError) {
    return (
      <>
        <CatalogTopNav />
        <ErrorState onRetry={retry} />
      </>
    );
  }

  return (
    <>
      <CatalogTopNav />

      <div className="category-page">
        {/* Header */}
        <header className="category-page-header">
          <Link to={ROUTES.home} className="back-link">← Volver</Link>
          <h1 className="category-page-title category-page-title--flex">
            <img src={sparklesImg} alt="" className="title-sparkle" width={188} height={200} loading="lazy" />
            Todos los productos
          </h1>
        </header>

        {/* Search bar */}
        <div className="category-search-bar">
          <span className="category-search-icon">{SEARCH_SVG}</span>
          <input
            type="text"
            className="category-search-input"
            placeholder="Buscar en todo el catálogo..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          {query && (
            <button
              className="category-search-clear"
              onClick={() => setQuery('')}
              aria-label="Limpiar búsqueda"
            >
              {CLEAR_SVG}
            </button>
          )}
        </div>

        {/* Filters row */}
        <div className="category-filters">
          <div className="filters-left">
            <button
              className={`category-stock-pill${!stockOnly ? ' active' : ''}`}
              onClick={() => setStockOnly(false)}
            >
              Todos
            </button>
            <button
              className={`category-stock-pill${stockOnly ? ' active' : ''}`}
              onClick={() => setStockOnly(true)}
            >
              En stock ✓
            </button>
          </div>

          <select
            className="sort-select"
            value={sort}
            onChange={e => setSort(e.target.value as SortOption)}
            aria-label="Ordenar productos"
          >
            {SORT_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Result count */}
        <p className="category-result-count">
          {isFiltered
            ? `Mostrando ${filtered.length} de ${allProducts.length} productos`
            : `${allProducts.length} productos`}
        </p>

        {/* Grid or empty state */}
        {filtered.length > 0 ? (
          <div className="category-grid">
            {filtered.map(p => (
              <div key={p.product_id} className="category-grid-item">
                <ProductCard product={p} />
              </div>
            ))}
          </div>
        ) : (
          <div className="category-no-results">
            <span className="no-results-icon">🔍</span>
            <h2 className="no-results-title">No encontramos productos</h2>
            <p className="no-results-sub">Intenta con otra búsqueda o cambia los filtros</p>
            {hasActiveFilters && (
              <button className="btn btn-outline no-results-clear" onClick={clearFilters}>
                Limpiar filtros
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}
