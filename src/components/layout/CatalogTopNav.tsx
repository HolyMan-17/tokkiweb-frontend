import { Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { ADMIN_PATH, CLERK_PUBLISHABLE_KEY, ROLES } from '../../lib/auth';
import { ROUTES } from '../../lib/routes';
import { useAdminAuth } from '../auth/useAdminAuth';
import { CartIcon, GearIcon } from '../ui/icons';
import './CatalogTopNav.css';
import hoppingBunny from '../../assets/hopping_bunny.gif';

export function CatalogTopNav() {
  const { items } = useCart();
  const totalQty = items.reduce((s, i) => s + i.quantity, 0);
  const { role } = useAdminAuth();
  const hasAdminRole = role === ROLES.OWNER || role === ROLES.TECH;
  const showAdminLink = !CLERK_PUBLISHABLE_KEY || hasAdminRole;

  return (
    <nav className="top-nav">
      <div className="nav-inner">
        <Link to={ROUTES.home} className="nav-logo">
          <span className="logo-bunny"><img src={hoppingBunny} alt="Tokki el conejo" width={120} height={146} /></span>
          <span className="logo-text">Tokki</span>
          <span className="logo-store">Shop</span>
        </Link>

        <div className="nav-actions">
          {showAdminLink && (
            <Link to={ADMIN_PATH} className="nav-icon-btn" aria-label="Panel de administración" title="Panel de administración">
              <GearIcon />
            </Link>
          )}
          <Link to={ROUTES.cart} className="nav-cart" aria-label="Carrito">
            <CartIcon />
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
