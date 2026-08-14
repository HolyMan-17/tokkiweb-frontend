import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import './Layout.css';

interface LayoutProps {
  variant?: 'customer' | 'admin';
}

export function Layout({ variant = 'customer' }: LayoutProps) {
  return (
    <div className="layout-root">
      <Header variant={variant} />
      <main className="layout-main">
        <div className="layout-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default Layout;
