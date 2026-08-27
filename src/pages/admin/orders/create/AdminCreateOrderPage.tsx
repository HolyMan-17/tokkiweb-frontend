import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { fetchAllProducts } from '../../../../api/products';
import { useAsync } from '../../../../hooks/useAsync';
import { ADMIN_ROUTES } from '../../../../lib/routes';
import LoadingSpinner from '../../../../components/ui/LoadingSpinner';
import ErrorState from '../../../../components/ui/ErrorState';
import { AdminProductPicker } from './AdminProductPicker';
import { CustomerFormCard } from './CustomerFormCard';
import { OrderSummaryCard } from './OrderSummaryCard';
import { useAdminOrderCreator } from './useAdminOrderCreator';
import sparklesGif from '../../../../assets/sparkles.gif';
import './AdminCreateOrderPage.css';

export default function AdminCreateOrderPage() {
  const { data: productsData, isLoading, isError, retry } = useAsync(
    () => fetchAllProducts(),
    [],
  );

  const products = useMemo(() => productsData ?? [], [productsData]);

  const {
    customer,
    errors,
    deliveryType,
    paymentMethod,
    autoApprove,
    selectedItems,
    selectedQtyMap,
    totalAmount,
    isSubmitting,
    toast,
    setDeliveryType,
    setPaymentMethod,
    setAutoApprove,
    handleQuickFillCounter,
    handleCustomerChange,
    handleAddItem,
    handleIncrement,
    handleDecrement,
    handleUpdateQty,
    handleRemove,
    handleSubmit,
  } = useAdminOrderCreator();

  if (isLoading) {
    return (
      <div className="page admin-create-order-page">
        <LoadingSpinner fullPage />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="page admin-create-order-page">
        <ErrorState onRetry={retry} />
      </div>
    );
  }

  return (
    <div className="page admin-create-order-page animate-fadeIn">
      <nav className="create-order-nav">
        <Link to={ADMIN_ROUTES.orders} className="create-order-back-link">
          ← Volver a Pedidos
        </Link>
      </nav>

      <header className="page-header create-order-header">
        <div className="create-order-header-info">
          <span className="create-order-badge">
            <img
              src={sparklesGif}
              alt=""
              className="badge-sparkles-img"
              width={18}
              height={18}
            />
            <span>Venta Directa / POS</span>
          </span>
          <h1 className="page-title font-display">Registrar Nuevo Pedido</h1>
          <p className="page-subtitle">
            Crea órdenes para ventas en tienda física, WhatsApp o delivery directo
          </p>
        </div>
      </header>

      <div className="create-order-layout">
        {/* Left Column: Customer Details & Order Summary */}
        <section className="create-order-sidebar">
          <CustomerFormCard
            customer={customer}
            errors={errors}
            deliveryType={deliveryType}
            paymentMethod={paymentMethod}
            autoApprove={autoApprove}
            onCustomerChange={handleCustomerChange}
            onQuickFillCounter={handleQuickFillCounter}
            onDeliveryTypeChange={setDeliveryType}
            onPaymentMethodChange={setPaymentMethod}
            onAutoApproveChange={setAutoApprove}
          />

          <OrderSummaryCard
            selectedItems={selectedItems}
            totalAmount={totalAmount}
            isFormValid={selectedItems.length > 0}
            isSubmitting={isSubmitting}
            onIncrement={handleIncrement}
            onDecrement={handleDecrement}
            onRemove={handleRemove}
            onSubmit={handleSubmit}
          />
        </section>

        {/* Right Column: Product Picker Catalog */}
        <section className="create-order-catalog-section">
          <AdminProductPicker
            products={products}
            selectedItems={selectedQtyMap}
            onAddItem={handleAddItem}
            onUpdateQty={handleUpdateQty}
            onRemoveItem={handleRemove}
          />
        </section>
      </div>

      {toast && (
        <div className="create-order-toast" role="alert">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {toast}
        </div>
      )}
    </div>
  );
}
