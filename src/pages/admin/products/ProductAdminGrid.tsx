import type { Product } from '../../../types';
import { formatPrice } from '../../../constants';

interface ProductAdminGridProps {
  products: Product[];
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  onEdit: (product: Product) => void;
  onArchive: (productId: number) => void;
}

export function ProductAdminGrid({
  products,
  hasActiveFilters,
  onClearFilters,
  onEdit,
  onArchive,
}: ProductAdminGridProps) {
  if (products.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-emoji">🔍</div>
        <p className="empty-title">Sin resultados</p>
        <p className="empty-text">No hay productos que coincidan con tu búsqueda.</p>
        {hasActiveFilters && (
          <button className="btn btn-outline btn-sm" onClick={onClearFilters}>
            Limpiar filtros
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="products-grid stagger">
      {products.map((product, index) => (
        <div
          key={product.product_id}
          className="card product-card-admin animate-slideUp"
          style={{ animationDelay: `${Math.min(index, 12) * 0.03}s` }}
        >
          <div className="product-thumb">
            {product.product_image_url ? (
              <img src={product.product_image_url} alt={product.product_name} loading="lazy" />
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
              <span
                className={`stock-badge ${product.qty_available > 0 ? 'in-stock' : 'out-of-stock'}`}
              >
                Stock: {product.qty_available}
              </span>
            </div>
          </div>

          <div className="product-actions">
            <button
              className="btn btn-outline btn-sm action-btn"
              onClick={() => onEdit(product)}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
              Editar
            </button>
            <button
              className="btn btn-sm action-btn action-btn-danger"
              onClick={() => onArchive(product.product_id)}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
              Archivar
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default ProductAdminGrid;
