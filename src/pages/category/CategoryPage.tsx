import { Link, useParams } from 'react-router-dom';
import './CategoryPage.css';
import { MOCK_PRODUCTS } from '../../mock/data';
import ProductCard from '../../components/ui/ProductCard';
import CatalogTopNav from '../../components/layout/CatalogTopNav';
import { CATEGORIES, slugify } from '../../constants';

export default function CategoryPage() {
  const { slug } = useParams();

  const category = CATEGORIES.find(c => slugify(c.name) === slug);
  const products = category
    ? MOCK_PRODUCTS.filter(p => p.category === category.name)
    : [];

  return (
    <>
      <CatalogTopNav />

      <div className="category-page">
        {category ? (
          <>
            <header className="category-page-header">
              <Link to="/" className="back-link">← Volver</Link>
              <h1 className="category-page-title">
                <span>{category.emoji}</span> {category.name}
              </h1>
              <p className="category-page-count">{products.length} productos</p>
            </header>

            <div className="category-grid">
              {products.map(p => (
                <div key={p.product_id} className="category-grid-item">
                  <ProductCard product={p} />
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="category-empty">
            <h1 className="category-page-title">Categoría no encontrada</h1>
            <Link to="/" className="back-link">← Volver al inicio</Link>
          </div>
        )}
      </div>
    </>
  );
}
