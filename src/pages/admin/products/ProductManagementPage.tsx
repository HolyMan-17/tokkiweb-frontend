import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchAllProducts, archiveProduct } from '../../../api/products';
import { useAsync } from '../../../hooks/useAsync';
import { useAdminAuth } from '../../../components/auth/useAdminAuth';
import type { Product } from '../../../types';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import ErrorState from '../../../components/ui/ErrorState';
import ProductFormModal from './ProductFormModal';
import { ProductFilterToolbar, type StockFilter } from './ProductFilterToolbar';
import { ProductAdminGrid } from './ProductAdminGrid';
import './ProductManagementPage.css';

export default function ProductManagementPage() {
  const { data, isLoading, isError, retry } = useAsync(fetchAllProducts, []);
  const products = useMemo(() => data ?? [], [data]);
  const { getAdminToken } = useAdminAuth();
  // Stable auth handle for API calls (Bearer via Clerk when mounted)
  const auth = useMemo(
    () => (getAdminToken ? { getToken: getAdminToken } : undefined),
    [getAdminToken],
  );
  const [searchParams, setSearchParams] = useSearchParams();
  const stockParam = searchParams.get('stock');
  const stock: StockFilter =
    stockParam === 'low' || stockParam === 'in' || stockParam === 'out'
      ? stockParam
      : 'all';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('Todos');
  const [toast, setToast] = useState<string | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Product | null>(null);
  const [imageErrorOpen, setImageErrorOpen] = useState(false);
  const toastTimer = useRef<number | null>(null);

  const showToast = (message: string) => {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2500);
  };

  const handleStockChange = useCallback((newStock: StockFilter) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (newStock === 'all') {
        next.delete('stock');
      } else {
        next.set('stock', newStock);
      }
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter(p => {
      if (category !== 'Todos' && p.category !== category) return false;
      if (stock === 'in' && (p.qty_available <= 0 || !p.in_stock)) return false;
      if (stock === 'low' && !(p.qty_available > 0 && p.qty_available <= 3)) return false;
      if (stock === 'out' && !(p.qty_available === 0 || !p.in_stock)) return false;
      if (q && !p.product_name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [products, category, stock, search]);

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

  const handleModalSuccess = (message: string) => {
    closeModal();
    retry();
    showToast(message);
  };

  const handleArchive = (productId: number) => {
    setArchiveTarget(products.find(p => p.product_id === productId) ?? null);
  };

  const confirmArchive = async () => {
    if (!archiveTarget || !auth) return;
    const result = await archiveProduct(archiveTarget.product_id, auth);
    setArchiveTarget(null);
    if (!result.ok) {
      showToast(result.message);
      return;
    }
    retry();
    showToast('Producto archivado');
  };

  const clearFilters = () => {
    setSearch('');
    setCategory('Todos');
    handleStockChange('all');
  };

  const hasActiveFilters = search.trim() !== '' || category !== 'Todos' || stock !== 'all';

  useEffect(() => {
    return () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    };
  }, []);

  if (isLoading || isError) {
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
        {isError ? <ErrorState onRetry={retry} /> : <LoadingSpinner fullPage />}
      </div>
    );
  }

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

      <ProductFilterToolbar
        search={search}
        category={category}
        stock={stock}
        filteredCount={filtered.length}
        totalCount={products.length}
        onSearchChange={setSearch}
        onCategoryChange={setCategory}
        onStockChange={handleStockChange}
      />

      <ProductAdminGrid
        products={filtered}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={clearFilters}
        onEdit={openEditModal}
        onArchive={handleArchive}
      />

      {isModalOpen && (
        <ProductFormModal
          key={editingProduct ? String(editingProduct.product_id) : 'new'}
          open={isModalOpen}
          editingProduct={editingProduct}
          auth={auth}
          onClose={closeModal}
          onSuccess={handleModalSuccess}
          showToast={showToast}
          onImageTooLarge={() => setImageErrorOpen(true)}
        />
      )}

      {toast && (
        <div className="product-toast" role="status">
          {toast}
        </div>
      )}

      <ConfirmDialog
        open={archiveTarget !== null}
        variant="danger"
        title="¿Archivar producto?"
        message={
          <>
            <strong>{archiveTarget?.product_name}</strong> se quitará de la tienda.{' '}
            Esta acción <strong>no se puede revertir</strong>.
          </>
        }
        confirmLabel="Sí, archivar"
        onConfirm={confirmArchive}
        onCancel={() => setArchiveTarget(null)}
      />

      <ConfirmDialog
        open={imageErrorOpen}
        variant="warning"
        title="Imagen muy pesada"
        message="La imagen no puede superar los 5 MB. Prueba con una más liviana."
        confirmLabel="Entendido"
        onConfirm={() => setImageErrorOpen(false)}
        onCancel={() => setImageErrorOpen(false)}
      />
    </div>
  );
}
