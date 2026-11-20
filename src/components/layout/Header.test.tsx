import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { Header } from './Header';
import { CartProvider } from '../../context/CartContext';
import { AdminAuthContext } from '../auth/AdminAuthContext';
import type { AppRole } from '../../lib/auth';
import { ADMIN_ROUTES } from '../../lib/routes';

vi.mock('./AdminUserButton', () => ({
  default: () => null,
}));

async function renderHeader({
  variant = 'admin',
  initialEntries = [ADMIN_ROUTES.root],
  role = 'owner',
}: {
  variant?: 'customer' | 'admin';
  initialEntries?: string[];
  role?: AppRole;
} = {}) {
  const rendered = render(
    <AdminAuthContext.Provider
      value={{
        configured: false,
        isLoaded: true,
        isSignedIn: true,
        role,
      }}
    >
      <CartProvider>
        <MemoryRouter initialEntries={initialEntries}>
          <Header variant={variant} />
        </MemoryRouter>
      </CartProvider>
    </AdminAuthContext.Provider>,
  );

  // Flush the lazy AdminUserButton Suspense resolution cleanly inside act().
  await act(async () => {
    await Promise.resolve();
  });

  return rendered;
}

describe('Header', () => {
  it('renders the Panel de control link to /tokki-admin as the first action in .nav-actions', async () => {
    const { container } = await renderHeader({ initialEntries: [ADMIN_ROUTES.root] });

    const dashboardLink = screen.getByRole('link', { name: 'Panel de control' });
    expect(dashboardLink).toHaveAttribute('href', ADMIN_ROUTES.root);

    const actions = container.querySelector('.nav-actions');
    expect(actions).not.toBeNull();
    const actionLinks = Array.from(actions!.querySelectorAll('a')).map((a) =>
      a.getAttribute('aria-label'),
    );

    expect(actionLinks[0]).toBe('Panel de control');
    expect(actionLinks.indexOf('Panel de control')).toBeLessThan(actionLinks.indexOf('Pedidos'));
    expect(actionLinks.indexOf('Pedidos')).toBeLessThan(actionLinks.indexOf('Productos'));
    expect(actionLinks.indexOf('Productos')).toBeLessThan(actionLinks.indexOf('Volver a la tienda'));
  });

  it('highlights only Panel de control when on /tokki-admin', async () => {
    await renderHeader({ initialEntries: [ADMIN_ROUTES.root] });

    const dashboardLink = screen.getByRole('link', { name: 'Panel de control' });
    const ordersLink = screen.getByRole('link', { name: 'Pedidos' });
    const productsLink = screen.getByRole('link', { name: 'Productos' });

    expect(dashboardLink).toHaveAttribute('aria-current', 'page');
    expect(dashboardLink).toHaveClass('nav-icon-btn--active');

    expect(ordersLink).not.toHaveAttribute('aria-current');
    expect(ordersLink).not.toHaveClass('nav-icon-btn--active');
    expect(productsLink).not.toHaveAttribute('aria-current');
    expect(productsLink).not.toHaveClass('nav-icon-btn--active');
  });

  it.each([
    ADMIN_ROUTES.orders,
    ADMIN_ROUTES.createOrder,
    ADMIN_ROUTES.orderDetail(42),
  ])('highlights only Pedidos on %s without falsely highlighting Panel de control', async (path) => {
    await renderHeader({ initialEntries: [path] });

    const dashboardLink = screen.getByRole('link', { name: 'Panel de control' });
    const ordersLink = screen.getByRole('link', { name: 'Pedidos' });
    const productsLink = screen.getByRole('link', { name: 'Productos' });

    expect(ordersLink).toHaveAttribute('aria-current', 'page');
    expect(ordersLink).toHaveClass('nav-icon-btn--active');

    expect(dashboardLink).not.toHaveAttribute('aria-current');
    expect(dashboardLink).not.toHaveClass('nav-icon-btn--active');
    expect(productsLink).not.toHaveAttribute('aria-current');
    expect(productsLink).not.toHaveClass('nav-icon-btn--active');
  });

  it('highlights only Productos on /tokki-admin/products?stock=low', async () => {
    await renderHeader({ initialEntries: [`${ADMIN_ROUTES.products}?stock=low`] });

    const dashboardLink = screen.getByRole('link', { name: 'Panel de control' });
    const ordersLink = screen.getByRole('link', { name: 'Pedidos' });
    const productsLink = screen.getByRole('link', { name: 'Productos' });

    expect(productsLink).toHaveAttribute('aria-current', 'page');
    expect(productsLink).toHaveClass('nav-icon-btn--active');

    expect(dashboardLink).not.toHaveAttribute('aria-current');
    expect(dashboardLink).not.toHaveClass('nav-icon-btn--active');
    expect(ordersLink).not.toHaveAttribute('aria-current');
    expect(ordersLink).not.toHaveClass('nav-icon-btn--active');
  });

  it('highlights only Herramientas de desarrollo on /tokki-admin/dev for tech role', async () => {
    await renderHeader({ initialEntries: [ADMIN_ROUTES.dev], role: 'tech' });

    const dashboardLink = screen.getByRole('link', { name: 'Panel de control' });
    const devLink = screen.getByRole('link', { name: 'Herramientas de desarrollo' });

    expect(devLink).toHaveAttribute('aria-current', 'page');
    expect(devLink).toHaveClass('nav-icon-btn--active');

    expect(dashboardLink).not.toHaveAttribute('aria-current');
    expect(dashboardLink).not.toHaveClass('nav-icon-btn--active');
  });

  it('preserves customer variant behavior without rendering Panel de control', async () => {
    await renderHeader({ variant: 'customer', initialEntries: ['/'] });

    expect(screen.getByRole('link', { name: 'Inicio' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Carrito' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Panel de control' })).not.toBeInTheDocument();
  });

  it('renders Tokki Shop Admin brand wordmark in admin variant and Tokki Shop in customer variant', async () => {
    const { container, unmount } = await renderHeader({ variant: 'admin', initialEntries: [ADMIN_ROUTES.root] });

    const adminLogo = container.querySelector('.nav-logo');
    expect(adminLogo?.querySelector('.logo-text')).toHaveTextContent('Tokki Shop');
    expect(adminLogo?.querySelector('.logo-store')).toHaveTextContent('Admin');

    unmount();

    const customer = await renderHeader({ variant: 'customer', initialEntries: ['/'] });
    const customerLogo = customer.container.querySelector('.nav-logo');
    expect(customerLogo?.querySelector('.logo-text')).toHaveTextContent('Tokki');
    expect(customerLogo?.querySelector('.logo-store')).toHaveTextContent('Shop');
  });
});
