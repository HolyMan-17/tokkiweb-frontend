import { lazy, Suspense, type ReactNode } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import { AuthProvider } from './components/auth/AdminAuth';
import { ScrollToTop } from './components/ScrollToTop';
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

// Layout + RequireRole + Clerk are lazy so the catalog page (the storefront
// landing page) never pulls in the customer/admin chrome CSS/JS or any
// @clerk/* code. They only load when a wrapped customer sub-page or an
// admin route renders.
const Layout = lazy(() => import('./components/layout/Layout'));
const RequireRole = lazy(() => import('./components/auth/RequireRole'));
const AdminClerkProvider = lazy(() => import('./components/auth/AdminClerkProvider'));

import './App.css';

// The admin panel lives under a hidden path (security-by-obscurity layer).
// Real access control is enforced by Clerk roles below.
const adminPrefix = `${ADMIN_PATH}`;

// Wraps lazy admin routes so they load on first visit to the admin panel.
function SuspenseBoundary({ children }: { children: ReactNode }) {
  return <Suspense fallback={<AdminLoading />}>{children}</Suspense>;
}

// Neutral loading fallback for lazy chunks (customer Layout, admin, etc.).
function PageLoading() {
  return (
    <div className="auth-gate auth-gate--loading">
      <span className="auth-spinner" aria-hidden="true" />
      <p>Cargando…</p>
    </div>
  );
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
        <ScrollToTop />
        <Routes>
          {/* Home / Catalog — standalone, brings its own TopNav */}
          <Route path={ROUTES.home} element={<CatalogPage />} />

          {/* Category — standalone like the catalog, same TopNav */}
          <Route path="/categorias/:slug" element={<CategoryPage />} />

          {/* Customer Routes — Layout is lazy so the catalog page stays
              free of the customer chrome bundle (Header/Layout CSS+JS). */}
          <Route
            element={
              <Suspense fallback={<PageLoading />}>
                <Layout variant="customer" />
              </Suspense>
            }
          >
            <Route path="/products/:id" element={<ProductDetailPage />} />
            <Route path={ROUTES.cart} element={<CartPage />} />
            <Route path={ROUTES.checkout} element={<CheckoutPage />} />
            <Route path={ROUTES.confirmation} element={<OrderConfirmationPage />} />
          </Route>

          {/* Admin — hidden path, guarded by Clerk. Owner + tech only.
              AdminClerkProvider (lazy) mounts Clerk here and only here, so
              the storefront never downloads @clerk/* or clerk.browser.js. */}
          <Route
            path={adminPrefix}
            element={
              <Suspense fallback={<AdminLoading />}>
                <AdminClerkProvider>
                  <SuspenseBoundary>
                    <RequireRole roles={[ROLES.OWNER, ROLES.TECH]}>
                      <Layout variant="admin" />
                    </RequireRole>
                  </SuspenseBoundary>
                </AdminClerkProvider>
              </Suspense>
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
              <Suspense fallback={<AdminLoading />}>
                <AdminClerkProvider>
                  <SuspenseBoundary>
                    <RequireRole roles={[ROLES.TECH]}>
                      <Layout variant="admin" />
                    </RequireRole>
                  </SuspenseBoundary>
                </AdminClerkProvider>
              </Suspense>
            }
          >
            <Route index element={<DevToolsPage />} />
          </Route>

          {/* Admin sign-in — public within the hidden path, used by RequireRole.
              Wrapped in AdminClerkProvider so <SignIn> has a Clerk context. */}
          <Route
            path={ADMIN_ROUTES.signIn}
            element={
              <Suspense fallback={<AdminLoading />}>
                <AdminClerkProvider>
                  <SuspenseBoundary>
                    <AdminSignInPage />
                  </SuspenseBoundary>
                </AdminClerkProvider>
              </Suspense>
            }
          />

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
