import { Link, useLocation } from 'react-router-dom';
import './AdminNav.css';

const HOME_SVG = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

export default function AdminNav() {
  const location = useLocation();
  const path = location.pathname;

  return (
    <nav className="admin-nav">
      <div className="admin-nav-inner">
        <Link 
          to="/admin" 
          className={`admin-nav-pill ${path === '/admin' ? 'active' : ''}`}
        >
          Inicio
        </Link>
        <Link 
          to="/admin/orders" 
          className={`admin-nav-pill ${path.startsWith('/admin/orders') ? 'active' : ''}`}
        >
          Pedidos
        </Link>
        <Link 
          to="/admin/products" 
          className={`admin-nav-pill ${path.startsWith('/admin/products') ? 'active' : ''}`}
        >
          Productos
        </Link>
        <Link 
          to="/" 
          className="admin-nav-pill store-link"
        >
          {HOME_SVG}
          Volver a Tienda
        </Link>
      </div>
    </nav>
  );
}
