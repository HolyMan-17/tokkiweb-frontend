import { useState } from 'react';
import { MOCK_PRODUCTS } from '../../../mock/data';
import type { Product } from '../../../types';
import { formatPrice } from '../../../constants';
import './ProductManagementPage.css';

export default function ProductManagementPage() {
  const [products] = useState<Product[]>(MOCK_PRODUCTS);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

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

      <div className="products-grid stagger">
        {products.map((product, index) => (
          <div 
            key={product.product_id} 
            className="card product-card-admin animate-slideUp"
            style={{ animationDelay: `${index * 0.05}s` }}
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
