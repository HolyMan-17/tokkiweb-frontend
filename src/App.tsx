import { Routes, Route } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import Layout from './components/layout/Layout';

// Admin Pages
import AdminDashboardPage from './pages/admin/dashboard/AdminDashboardPage';
import OrdersDashboardPage from './pages/admin/orders/OrdersDashboardPage';
import AdminOrderDetailPage from './pages/admin/orders/OrderDetailPage';
import ProductManagementPage from './pages/admin/products/ProductManagementPage';

// Customer Pages
import CatalogPage from './pages/catalog/CatalogPage';
import CategoryPage from './pages/category/CategoryPage';
import ProductDetailPage from './pages/product/ProductDetailPage';
import CartPage from './pages/cart/CartPage';
import CheckoutPage from './pages/checkout/CheckoutPage';
import OrderConfirmationPage from './pages/confirmation/OrderConfirmationPage';

import './App.css';

function App() {
  return (
    <CartProvider>
      <Routes>
        {/* Home / Catalog — standalone, brings its own TopNav */}
        <Route path="/" element={<CatalogPage />} />

        {/* Category — standalone like the catalog, same TopNav */}
        <Route path="/categorias/:slug" element={<CategoryPage />} />

        {/* Customer Routes (scaffold layout for now) */}
        <Route element={<Layout variant="customer" />}>
          <Route path="/products/:id" element={<ProductDetailPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/confirmation" element={<OrderConfirmationPage />} />
        </Route>

        {/* Admin Routes */}
        <Route element={<Layout variant="admin" />}>
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/admin/orders" element={<OrdersDashboardPage />} />
          <Route path="/admin/orders/:id" element={<AdminOrderDetailPage />} />
          <Route path="/admin/products" element={<ProductManagementPage />} />
        </Route>
      </Routes>
    </CartProvider>
  );
}

export default App;
