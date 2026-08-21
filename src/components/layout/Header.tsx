import { lazy, Suspense } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { ROLES, CLERK_PUBLISHABLE_KEY } from '../../lib/auth';
import { ROUTES, ADMIN_ROUTES } from '../../lib/routes';
import { useAdminAuth } from '../auth/useAdminAuth';
import './Header.css';
import hoppingBunny from '../../assets/hopping_bunny.gif';

// Clerk's <UserButton> is lazy so @clerk/react stays out of the customer
// (and catalog) bundle — it only loads when the admin header renders it.
const AdminUserButton = lazy(() => import('./AdminUserButton'));

interface HeaderProps {
  variant?: 'customer' | 'admin';
}

const DEV_SVG = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  </svg>
);

const CART_SVG = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="21" r="1" />
    <circle cx="20" cy="21" r="1" />
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
  </svg>
);

const HOME_SVG = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const GEAR_SVG = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const ORDERS_SVG = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

const PRODUCTS_SVG = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);

const LOGOUT_SVG = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

export function Header({ variant = 'customer' }: HeaderProps) {
  const { items } = useCart();
  const totalQty = items.reduce((s, i) => s + i.quantity, 0);
  const location = useLocation();
  const isCartPage = location.pathname === ROUTES.cart;
  const { role } = useAdminAuth();
  const isTech = role === ROLES.TECH;
  const hasAdminRole = role === ROLES.OWNER || role === ROLES.TECH;
  const clerkConfigured = Boolean(CLERK_PUBLISHABLE_KEY);
  const showAdminLink = !clerkConfigured || hasAdminRole;

  return (
    <header className={`top-nav ${variant === 'admin' ? 'top-nav-admin' : ''}`}>
      <div className="nav-inner">
        <Link
          to={variant === 'admin' ? ADMIN_ROUTES.root : ROUTES.home}
          className="nav-logo"
          aria-label="Tokki"
        >
          <span className="logo-bunny"><img src={hoppingBunny} alt="Tokki el conejo" width={120} height={146} /></span>
          <span className="logo-text">{variant === 'admin' ? 'Tokki Shop' : 'Tokki'}</span>
          <span className="logo-store">{variant === 'admin' ? 'Admin' : 'Shop'}</span>
        </Link>

        <div className="nav-actions">
          {variant === 'customer' ? (
            <>
              <Link to={ROUTES.home} className="nav-icon-btn" aria-label="Inicio" title="Inicio">
                {HOME_SVG}
              </Link>
              {!isCartPage && (
                <Link to={ROUTES.cart} className="nav-cart" aria-label="Carrito">
                  {CART_SVG}
                  {totalQty > 0 && <span className="cart-badge">{totalQty}</span>}
                </Link>
              )}
              {showAdminLink && (
                <Link to={ADMIN_ROUTES.root} className="nav-icon-btn" aria-label="Panel de administración" title="Panel de administración">
                  {GEAR_SVG}
                </Link>
              )}
            </>
          ) : (
            <>
              <Link to={ADMIN_ROUTES.orders} className="nav-icon-btn" aria-label="Pedidos" title="Pedidos">
                {ORDERS_SVG}
              </Link>
              <Link to={ADMIN_ROUTES.products} className="nav-icon-btn" aria-label="Productos" title="Productos">
                {PRODUCTS_SVG}
              </Link>
              {(isTech || !clerkConfigured) && (
                <Link to={ADMIN_ROUTES.dev} className="nav-icon-btn" aria-label="Herramientas de desarrollo" title="Herramientas de desarrollo">
                  {DEV_SVG}
                </Link>
              )}
              <Link to={ROUTES.home} className="nav-icon-btn nav-logout" aria-label="Volver a la tienda" title="Volver a la tienda">
                {LOGOUT_SVG}
              </Link>
              {clerkConfigured && (
                <span className="nav-user">
                  <Suspense fallback={null}><AdminUserButton /></Suspense>
                </span>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
