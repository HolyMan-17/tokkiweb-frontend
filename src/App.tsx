import { lazy, Suspense, type ReactNode } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import Layout from './components/layout/Layout';
import { AuthProvider } from './components/auth/AdminAuth';
import { RequireRole } from './components/auth/RequireRole';
import { ADMIN_PATH, ROLES } from './lib/auth';
import { ROUTES, ADMIN_ROUTES } from './lib/routes';

// Customer Pages (eager — the storefront is the primary experience)
import CatalogPage from './pages/catalog/CatalogPage';
import CategoryPage from './pages/category/CategoryPage';
import ProductDetailPage from './pages/product/ProductDetailPage';
import CartPage from './pages/cart/CartPage';
import CheckoutPage from './pages/checkout/CheckoutPage';
import OrderConfirmationPage from './pages/confirmation/OrderConfirmationPage';

// Admin Pages (lazy — keeps the heavy recharts/admin bundle off the storefront)
const AdminDashboardPage = lazy(() => import('./pages/admin/dashboard/AdminDashboardPage'));
const OrdersDashboardPage = lazy(() => import('./pages/admin/orders/OrdersDashboardPage'));
const AdminOrderDetailPage = lazy(() => import('./pages/admin/orders/OrderDetailPage'));
const ProductManagementPage = lazy(() => import('./pages/admin/products/ProductManagementPage'));
const DevToolsPage = lazy(() => import('./pages/admin/devtools/DevToolsPage'));
const AdminSignInPage = lazy(() => import('./pages/admin/signin/AdminSignInPage'));

import './App.css';

// The admin panel lives under a hidden path (security-by-obscurity layer).
// Real access control is enforced by Clerk roles below.
const adminPrefix = `${ADMIN_PATH}`;

// Wraps lazy admin routes so they load on first visit to the admin panel.
function SuspenseBoundary({ children }: { children: ReactNode }) {
  return <Suspense fallback={<AdminLoading />}>{children}</Suspense>;
}

function AdminLoading() {
  return (
    <div className="auth-gate auth-gate--loading">
      <span className="auth-spinner" aria-hidden="true" />
      <p>Cargando panel…</p>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Routes>
          {/* Home / Catalog — standalone, brings its own TopNav */}
          <Route path={ROUTES.home} element={<CatalogPage />} />

          {/* Category — standalone like the catalog, same TopNav */}
          <Route path="/categorias/:slug" element={<CategoryPage />} />

          {/* Customer Routes */}
          <Route element={<Layout variant="customer" />}>
            <Route path="/products/:id" element={<ProductDetailPage />} />
            <Route path={ROUTES.cart} element={<CartPage />} />
            <Route path={ROUTES.checkout} element={<CheckoutPage />} />
            <Route path={ROUTES.confirmation} element={<OrderConfirmationPage />} />
          </Route>

          {/* Admin — hidden path, guarded by Clerk. Owner + tech only. */}
          <Route
            path={adminPrefix}
            element={
              <RequireRole roles={[ROLES.OWNER, ROLES.TECH]}>
                <SuspenseBoundary>
                  <Layout variant="admin" />
                </SuspenseBoundary>
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
            path={ADMIN_ROUTES.dev}
            element={
              <RequireRole roles={[ROLES.TECH]}>
                <SuspenseBoundary>
                  <Layout variant="admin" />
                </SuspenseBoundary>
              </RequireRole>
            }
          >
            <Route index element={<DevToolsPage />} />
          </Route>

          {/* Admin sign-in — public within the hidden path, used by RequireRole */}
          <Route path={ADMIN_ROUTES.signIn} element={<SuspenseBoundary><AdminSignInPage /></SuspenseBoundary>} />

          {/* Old public admin path → now hidden (keeps any stale links safe) */}
          <Route path="/admin" element={<Navigate to={ADMIN_PATH} replace />} />
          <Route path="/admin/*" element={<Navigate to={ADMIN_PATH} replace />} />

          <Route path="*" element={<Navigate to={ROUTES.home} replace />} />
        </Routes>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
