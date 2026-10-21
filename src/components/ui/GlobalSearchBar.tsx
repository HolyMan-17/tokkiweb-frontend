import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import type { Product } from '../../types';
import { fetchAllProducts } from '../../api/products';
import { matchesSearch } from '../../utils/productSearch';
import { CATEGORIES, slugify, formatPrice } from '../../constants';
import { getCategoryIcon } from './CategoryIcons';
import { ROUTES } from '../../lib/routes';
import sparklesGif from '../../assets/sparkles.gif';
import './GlobalSearchBar.css';

// ── Module-level helpers & cache ──────────────────────────────────────────────

let cachedProductsPromise: Promise<Product[]> | null = null;

function getCachedProducts(): Promise<Product[]> {
  if (!cachedProductsPromise) {
    cachedProductsPromise = fetchAllProducts().catch((err) => {
      cachedProductsPromise = null;
      throw err;
    });
  }
  return cachedProductsPromise;
}

const SEARCH_SVG = (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

// ── Sub-components for modularity ─────────────────────────────────────────────

interface SearchItemButtonProps {
  product: Product;
  onSelect: (id: number) => void;
}

function SearchItemButton({ product, onSelect }: SearchItemButtonProps) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={false}
      className="global-search__item"
      onClick={() => onSelect(product.product_id)}
    >
      {product.product_image_url ? (
        <img
          src={product.product_image_url}
          alt=""
          className="global-search__thumb"
          loading="lazy"
        />
      ) : (
        <span className="global-search__thumb global-search__thumb--placeholder">
          🐰
        </span>
      )}
      <div className="global-search__item-info">
        <span className="global-search__item-name">{product.product_name}</span>
        <span className="global-search__item-category">{product.category}</span>
      </div>
      <span className="global-search__item-price">
        {formatPrice(product.product_price)}
      </span>
    </button>
  );
}

interface SearchEmptyStateProps {
  query: string;
  categories: { name: string; emoji: string }[];
  onClose: () => void;
}

function SearchEmptyState({ query, categories, onClose }: SearchEmptyStateProps) {
  return (
    <div className="global-search__empty">
      <p className="global-search__empty-message">
        No encontramos "{query}". Intente buscando en nuestras categorías
      </p>
      <div className="global-search__categories">
        {categories.map((cat) => (
          <Link
            key={cat.name}
            to={ROUTES.category(slugify(cat.name))}
            className="global-search__category-pill"
            onClick={onClose}
          >
            <span className="global-search__category-icon">
              {getCategoryIcon(cat.name) ?? cat.emoji}
            </span>
            <span>{cat.name}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

interface GlobalSearchBarProps {
  products?: Product[];
}

export function GlobalSearchBar({ products: initialProducts }: GlobalSearchBarProps) {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [fetchedProducts, setFetchedProducts] = useState<Product[]>([]);

  const allProducts = initialProducts ?? fetchedProducts;

  useEffect(() => {
    if (!initialProducts) {
      let isSubscribed = true;
      getCachedProducts()
        .then((data) => {
          if (isSubscribed) setFetchedProducts(data);
        })
        .catch(() => {});
      return () => {
        isSubscribed = false;
      };
    }
  }, [initialProducts]);

  useEffect(() => {
    if (isMobileOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isMobileOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const trimmedQuery = query.trim();

  const latestProducts = useMemo(() => {
    return allProducts.slice(-4).reverse();
  }, [allProducts]);

  const matchingProducts = useMemo(() => {
    if (!trimmedQuery) return [];
    return allProducts.filter((p) => matchesSearch(p, trimmedQuery));
  }, [allProducts, trimmedQuery]);

  const activeCategories = useMemo(() => {
    if (allProducts.length === 0) return CATEGORIES;
    const availableCategoryNames = new Set(allProducts.map((p) => p.category));
    const matched = CATEGORIES.filter((cat) => availableCategoryNames.has(cat.name));
    return matched.length > 0 ? matched : CATEGORIES;
  }, [allProducts]);

  const closeSearch = useCallback(() => {
    setIsOpen(false);
    setIsMobileOpen(false);
  }, []);

  const handleOpenMobile = useCallback(() => {
    setIsMobileOpen(true);
    setIsOpen(true);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }, []);

  const handleSelectProduct = useCallback(
    (productId: number) => {
      closeSearch();
      navigate(ROUTES.product(productId));
    },
    [closeSearch, navigate],
  );

  const handleSubmitSearch = useCallback(() => {
    const q = trimmedQuery;
    closeSearch();
    if (q) {
      navigate(`${ROUTES.allProducts}?q=${encodeURIComponent(q)}`);
    } else {
      navigate(ROUTES.allProducts);
    }
  }, [trimmedQuery, closeSearch, navigate]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Escape') {
        closeSearch();
        inputRef.current?.blur();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleSubmitSearch();
      }
    },
    [closeSearch, handleSubmitSearch],
  );

  const handleClear = useCallback(() => {
    setQuery('');
    inputRef.current?.focus();
  }, []);

  return (
    <div
      ref={containerRef}
      className={`global-search ${isMobileOpen ? 'global-search--mobile-open' : ''}`}
    >
      <button
        type="button"
        className="global-search__mobile-trigger"
        onClick={handleOpenMobile}
        aria-label="Abrir búsqueda"
      >
        {SEARCH_SVG}
      </button>

      <div className="global-search__panel">
        <div className="global-search__header">
          <div className="global-search__pill">
            <span className="global-search__icon">{SEARCH_SVG}</span>
            <input
              ref={inputRef}
              type="search"
              role="combobox"
              className="global-search__input"
              placeholder="Buscar productos, dulces, maquillaje…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setIsOpen(true)}
              onKeyDown={handleKeyDown}
              aria-label="Buscar producto"
              aria-expanded={isOpen}
              aria-controls="tokki-search-listbox"
              aria-autocomplete="list"
            />
            {query && (
              <button
                type="button"
                className="global-search__clear-btn"
                onClick={handleClear}
                aria-label="Limpiar búsqueda"
              >
                &times;
              </button>
            )}
          </div>

          <button
            type="button"
            className="global-search__cancel-btn"
            onClick={closeSearch}
            aria-label="Cancelar búsqueda"
          >
            Cancelar
          </button>
        </div>

        {isOpen && (
          <div id="tokki-search-listbox" role="listbox" className="global-search__dropdown">
            {!trimmedQuery ? (
              <div className="global-search__suggestions">
                <p className="global-search__section-title">
                  Últimas Novedades
                  <img
                    src={sparklesGif}
                    alt=""
                    className="global-search__sparkles"
                    width={20}
                    height={20}
                    loading="lazy"
                  />
                </p>
                <div className="global-search__list">
                  {latestProducts.map((p) => (
                    <SearchItemButton
                      key={p.product_id}
                      product={p}
                      onSelect={handleSelectProduct}
                    />
                  ))}
                </div>
              </div>
            ) : matchingProducts.length > 0 ? (
              <div className="global-search__suggestions">
                <p className="global-search__section-title">Sugerencias</p>
                <div className="global-search__list">
                  {matchingProducts.slice(0, 5).map((p) => (
                    <SearchItemButton
                      key={p.product_id}
                      product={p}
                      onSelect={handleSelectProduct}
                    />
                  ))}
                </div>

                <div className="global-search__footer">
                  <button
                    type="button"
                    className="global-search__view-all-btn"
                    onClick={handleSubmitSearch}
                  >
                    Ver todos los {matchingProducts.length} productos para "{trimmedQuery}" &rarr;
                  </button>
                </div>
              </div>
            ) : (
              <SearchEmptyState
                query={trimmedQuery}
                categories={activeCategories}
                onClose={closeSearch}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default GlobalSearchBar;
