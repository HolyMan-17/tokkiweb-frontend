import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import AdminDashboardPage from './AdminDashboardPage';
import { fetchOrderSummaries } from '../../../api/orders';
import { fetchAllProducts } from '../../../api/products';
import { AdminAuthContext } from '../../../components/auth/AdminAuthContext';
import type { OrderSummary, Product } from '../../../types';

vi.mock('../../../api/orders', async importOriginal => ({
  ...(await importOriginal<typeof import('../../../api/orders')>()),
  fetchOrderSummaries: vi.fn(),
}));

vi.mock('../../../api/products', () => ({
  fetchAllProducts: vi.fn(),
}));

const mockFetchOrderSummaries = vi.mocked(fetchOrderSummaries);
const mockFetchAllProducts = vi.mocked(fetchAllProducts);

// jsdom no implementa ResizeObserver; recharts lo necesita para medir.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', ResizeObserverStub);

const SUMMARIES: OrderSummary[] = [
  {
    order_id: 7,
    name: 'María',
    last_name: 'González',
    tlf_num: '+584146999670',
    total_amount: '18.50',
    status: 'approved',
    item_count: 3,
    created_at: '2026-08-13T14:30:00.000Z',
  },
  {
    order_id: 6,
    name: 'Sofía',
    last_name: 'Hernández',
    tlf_num: '+584147778899',
    total_amount: '15.50',
    status: 'pending',
    item_count: 1,
    created_at: '2026-08-14T08:10:00.000Z',
  },
];

const PRODUCTS: Product[] = [
  {
    product_id: 1,
    product_name: 'Bálsamo de Fresa',
    product_price: '3.50',
    product_description: '',
    qty_available: 10,
    in_stock: true,
    category: 'Maquillaje',
  },
];

function renderPage() {
  return render(
    <AdminAuthContext.Provider
      value={{
        configured: true,
        isLoaded: true,
        isSignedIn: true,
        role: 'owner',
        getAdminToken: async () => 'clerk-token',
      }}
    >
      <MemoryRouter>
        <AdminDashboardPage />
      </MemoryRouter>
    </AdminAuthContext.Provider>,
  );
}

beforeEach(() => {
  mockFetchOrderSummaries.mockReset();
  mockFetchAllProducts.mockReset();
  mockFetchOrderSummaries.mockResolvedValue(SUMMARIES);
  mockFetchAllProducts.mockResolvedValue(PRODUCTS);
});

describe('AdminDashboardPage — resumen vía API', () => {
  it('renderiza las estadísticas y los pedidos recientes desde listOrders', async () => {
    renderPage();

    expect(await screen.findByText('Pedidos Recientes')).toBeInTheDocument();
    expect(screen.getByAltText('Tokki Bunny')).toBeInTheDocument();
    expect(screen.getByText('#7')).toBeInTheDocument();
    expect(screen.getByText('Aprobado')).toBeInTheDocument();
    expect(screen.getByText('Alertas Stock')).toBeInTheDocument();
    expect(screen.getByText('Ventas Totales')).toBeInTheDocument();
    // 1 aprobado de 2 pedidos totales; 1 producto en stock.
    expect(screen.getAllByText('1').length).toBeGreaterThan(0);
  });

  it('renderiza la tarjeta de Productos Destacados / Top Inventario con medallas y links de edición', async () => {
    renderPage();

    expect(await screen.findByText('Productos Destacados / Top Inventario')).toBeInTheDocument();
    expect(screen.getByText('Bálsamo de Fresa')).toBeInTheDocument();
    expect(screen.getByText('🥇 #1')).toBeInTheDocument();
    expect(screen.getByText('10 en stock')).toBeInTheDocument();

    const editLinks = screen.getAllByRole('link', { name: /Editar Bálsamo de Fresa/i });
    expect(editLinks.length).toBeGreaterThan(0);
    expect(editLinks[0]).toHaveAttribute('href', '/tokki-admin/products');
  });

  it('conecta la tarjeta de Alertas Stock con la ruta /tokki-admin/products?stock=low', async () => {
    renderPage();

    await screen.findByText('Alertas Stock');
    const stockAlertLink = screen.getByRole('link', { name: /Ver alertas de stock/i });
    expect(stockAlertLink).toHaveAttribute('href', '/tokki-admin/products?stock=low');
  });

  it('pide el listado de pedidos con el token de admin', async () => {
    renderPage();
    await screen.findByText('Pedidos Recientes');

    const auth = mockFetchOrderSummaries.mock.calls[0][0];
    expect(await auth?.getToken?.()).toBe('clerk-token');
  });
});
