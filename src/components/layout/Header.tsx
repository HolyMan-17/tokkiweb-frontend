import { Link, NavLink } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import './Header.css';

interface HeaderProps {
  variant?: 'customer' | 'admin';
}

const CART_SVG = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="21" r="1" />
    <circle cx="20" cy="21" r="1" />
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
  </svg>
);

const GEAR_SVG = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const HOME_SVG = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
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

  const links =
    variant === 'admin'
      ? [
          { to: '/admin/orders', label: 'Pedidos' },
          { to: '/admin/products', label: 'Productos' },
        ]
      : [
          { to: '/', label: 'Inicio' },
          { to: '/cart', label: 'Carrito' },
          { to: '/admin/orders', label: 'Admin' },
        ];

  return (
    <header className={`top-nav ${variant === 'admin' ? 'top-nav-admin' : ''}`}>
      <div className="nav-inner">
        <Link
          to={variant === 'admin' ? '/admin/orders' : '/'}
          className="nav-logo"
          aria-label="Tokki"
        >
          <span className="logo-bunny">🐰</span>
          <span className="logo-text">{variant === 'admin' ? 'Tokki Admin' : 'Tokki'}</span>
          <span className="logo-store">{variant === 'admin' ? 'Admin' : 'Store'}</span>
        </Link>

        <nav className="nav-links" aria-label="Navegación principal">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="nav-actions">
          {variant === 'customer' && (
            <>
              <Link to="/admin/orders" className="nav-icon-btn nav-admin" aria-label="Panel de administración">
                {GEAR_SVG}
              </Link>
              <Link to="/cart" className="nav-cart" aria-label="Carrito">
                {CART_SVG}
                {totalQty > 0 && <span className="cart-badge">{totalQty}</span>}
              </Link>
            </>
          )}
          {variant === 'admin' && (
            <>
              <Link to="/" className="nav-icon-btn" aria-label="Volver a la tienda" title="Volver a la tienda">
                {HOME_SVG}
              </Link>
              <Link to="/" className="nav-icon-btn nav-logout" aria-label="Cerrar sesión" title="Cerrar sesión">
                {LOGOUT_SVG}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
