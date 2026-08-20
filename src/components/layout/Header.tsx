import { Link, useLocation } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import './Header.css';
import hoppingBunny from '../../assets/hopping_bunny.gif';

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

export function Header({ variant = 'customer' }: HeaderProps) {
  const { items } = useCart();
  const totalQty = items.reduce((s, i) => s + i.quantity, 0);
  const location = useLocation();
  const isCartPage = location.pathname === '/cart';

  return (
    <header className={`top-nav ${variant === 'admin' ? 'top-nav-admin' : ''}`}>
      <div className="nav-inner">
        <Link
          to={variant === 'admin' ? '/admin/orders' : '/'}
          className="nav-logo"
          aria-label="Tokki"
        >
          <span className="logo-bunny"><img src={hoppingBunny} alt="Tokki el conejo" /></span>
          <span className="logo-text">{variant === 'admin' ? 'Tokki Shop' : 'Tokki'}</span>
          <span className="logo-store">{variant === 'admin' ? 'Admin' : 'Store'}</span>
        </Link>

        <div className="nav-actions">
          {variant === 'customer' ? (
            <>
              <Link to="/" className="nav-pill" aria-label="Inicio">Inicio</Link>
              {!isCartPage && (
                <Link to="/cart" className="nav-cart" aria-label="Carrito">
                  {CART_SVG}
                  {totalQty > 0 && <span className="cart-badge">{totalQty}</span>}
                </Link>
              )}
              <Link to="/admin/orders" className="nav-pill nav-pill-accent" aria-label="Panel de administración">Admin</Link>
            </>
          ) : (
            <Link to="/" className="nav-pill nav-pill-accent" aria-label="Volver a la tienda">Tienda</Link>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
