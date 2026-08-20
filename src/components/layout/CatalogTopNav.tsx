import { Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import './CatalogTopNav.css';
import hoppingBunny from '../../assets/hopping_bunny.gif';

export function CatalogTopNav() {
  const { items } = useCart();
  const totalQty = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <nav className="top-nav">
      <div className="nav-inner">
        <Link to="/" className="nav-logo">
          <span className="logo-bunny"><img src={hoppingBunny} alt="Tokki el conejo" /></span>
          <span className="logo-text">Tokki</span>
          <span className="logo-store">Shop</span>
        </Link>

        <div className="nav-actions">
          <Link to="/admin/orders" className="nav-pill nav-pill-accent" aria-label="Panel de administración">
            Admin
          </Link>
          <Link to="/cart" className="nav-cart" aria-label="Carrito">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            {totalQty > 0 && (
              <span className="cart-badge">{totalQty}</span>
            )}
          </Link>
        </div>
      </div>
    </nav>
  );
}

export default CatalogTopNav;
