import { Routes, Route, Navigate } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import Layout from './components/layout/Layout';
import { AuthProvider } from './components/auth/AdminAuth';
import { RequireRole } from './components/auth/RequireRole';
import { ADMIN_PATH, ROLES } from './lib/auth';

// Admin Pages
import AdminDashboardPage from './pages/admin/dashboard/AdminDashboardPage';
import OrdersDashboardPage from './pages/admin/orders/OrdersDashboardPage';
import AdminOrderDetailPage from './pages/admin/orders/OrderDetailPage';
import ProductManagementPage from './pages/admin/products/ProductManagementPage';
import DevToolsPage from './pages/admin/devtools/DevToolsPage';
import AdminSignInPage from './pages/admin/signin/AdminSignInPage';

// Customer Pages
import CatalogPage from './pages/catalog/CatalogPage';
import CategoryPage from './pages/category/CategoryPage';
import ProductDetailPage from './pages/product/ProductDetailPage';
import CartPage from './pages/cart/CartPage';
import CheckoutPage from './pages/checkout/CheckoutPage';
import OrderConfirmationPage from './pages/confirmation/OrderConfirmationPage';

import './App.css';

// The admin panel lives under a hidden path (security-by-obscurity layer).
// Real access control is enforced by Clerk roles below.
const adminPrefix = `${ADMIN_PATH}`;

function App() {
  return (
    <AuthProvider>
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

          {/* Admin — hidden path, guarded by Clerk. Owner + tech only. */}
          <Route
            path={adminPrefix}
            element={
              <RequireRole roles={[ROLES.OWNER, ROLES.TECH]}>
                <Layout variant="admin" />
              </RequireRole>
            }
          >
            <Route index element={<AdminDashboardPage />} />
            <Route path="orders" element={<OrdersDashboardPage />} />
            <Route path="orders/:id" element={<AdminOrderDetailPage />} />
            <Route path="products" element={<ProductManagementPage />} />
          </Route>

          {/* Dev Tools — tech only */}
          <Route
            path={`${adminPrefix}/dev`}
            element={
              <RequireRole roles={[ROLES.TECH]}>
                <Layout variant="admin" />
              </RequireRole>
            }
          >
            <Route index element={<DevToolsPage />} />
          </Route>

          {/* Admin sign-in — public within the hidden path, used by RequireRole */}
          <Route path={`${adminPrefix}/sign-in`} element={<AdminSignInPage />} />

          {/* Old public admin path → now hidden (keeps any stale links safe) */}
          <Route path="/admin" element={<Navigate to={ADMIN_PATH} replace />} />
          <Route path="/admin/*" element={<Navigate to={ADMIN_PATH} replace />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
