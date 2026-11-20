import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import AdminDashboardPage from './AdminDashboardPage';
import { fetchOrderSummaries } from '../../../api/orders';
import { fetchAllProducts } from '../../../api/products';
import { fetchTopProducts } from '../../../api/analytics';
import { AdminAuthContext } from '../../../components/auth/AdminAuthContext';
import type { OrderSummary, Product, TopProductStat } from '../../../types';

vi.mock('../../../api/orders', async importOriginal => ({
  ...(await importOriginal<typeof import('../../../api/orders')>()),
  fetchOrderSummaries: vi.fn(),
}));

vi.mock('../../../api/products', () => ({
  fetchAllProducts: vi.fn(),
}));

vi.mock('../../../api/analytics', () => ({
  fetchTopProducts: vi.fn(),
}));

const mockFetchOrderSummaries = vi.mocked(fetchOrderSummaries);
const mockFetchAllProducts = vi.mocked(fetchAllProducts);
const mockFetchTopProducts = vi.mocked(fetchTopProducts);

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

const TOP_PRODUCTS: TopProductStat[] = [
  {
    product_id: 1,
    product_name: 'Bálsamo de Fresa',
    category: 'Maquillaje',
    product_price: '3.50',
    qty_available: 10,
    in_stock: true,
    product_image_url: null,
    units_sold: 10,
    orders_count: 5,
    total_revenue: '35.00',
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
  mockFetchTopProducts.mockReset();
  mockFetchOrderSummaries.mockResolvedValue(SUMMARIES);
  mockFetchAllProducts.mockResolvedValue(PRODUCTS);
  mockFetchTopProducts.mockResolvedValue(TOP_PRODUCTS);
});

describe('AdminDashboardPage — resumen vía API', () => {
  it('renderiza las estadísticas y los pedidos recientes navegables desde listOrders', async () => {
    renderPage();

    expect(await screen.findByText('Pedidos Recientes')).toBeInTheDocument();
    expect(screen.getByAltText('Tokki Bunny')).toBeInTheDocument();
    expect(screen.getByText('#7')).toBeInTheDocument();
    expect(screen.getByText('Aprobado')).toBeInTheDocument();
    expect(screen.getByText('Alertas Stock')).toBeInTheDocument();
    expect(screen.getByText('Ventas Totales')).toBeInTheDocument();
    // 1 aprobado de 2 pedidos totales; 1 producto en stock.
    expect(screen.getAllByText('1').length).toBeGreaterThan(0);

    const recentOrderLink = screen.getByText('#7').closest('a');
    expect(recentOrderLink).toHaveAttribute('href', '/tokki-admin/orders/7');
  });

  it('renderiza la tarjeta de Productos Destacados con medallas, métricas reales y links ?edit', async () => {
    renderPage();

    expect(await screen.findByText('Productos Destacados')).toBeInTheDocument();
    expect(await screen.findByText('Bálsamo de Fresa')).toBeInTheDocument();
    expect(screen.getByText('🥇 #1')).toBeInTheDocument();
    expect(screen.getByText('10 vendidos')).toBeInTheDocument();
    expect(screen.getByText('$35.00')).toBeInTheDocument();
    expect(screen.getByText('10 en stock')).toBeInTheDocument();

    const editLinks = screen.getAllByRole('link', { name: /Editar Bálsamo de Fresa/i });
    expect(editLinks.length).toBeGreaterThan(0);
    expect(editLinks[0]).toHaveAttribute('href', '/tokki-admin/products?edit=1');
  }, 15000);

  it('conecta la tarjeta de Alertas Stock con la ruta /tokki-admin/products?stock=alert', async () => {
    renderPage();

    const stockAlertLink = await screen.findByRole('link', { name: /ver alertas de stock/i });
    expect(stockAlertLink).toHaveAttribute('href', '/tokki-admin/products?stock=alert');
  }, 15000);

  it('renderiza botones de acción rápida, tarjetas KPI enlazadas, sub-métricas de ventas y banner de pedidos pendientes', async () => {
    renderPage();

    const newOrderLink = await screen.findByRole('link', { name: /\+ nuevo pedido/i });
    expect(newOrderLink).toHaveAttribute('href', '/tokki-admin/orders/new');

    const newProductLink = screen.getByRole('link', { name: /\+ agregar producto/i });
    expect(newProductLink).toHaveAttribute('href', '/tokki-admin/products?new=1');

    const pendingBanner = screen.getByRole('link', {
      name: /tienes 1 pedido pendiente por revisar/i,
    });
    expect(pendingBanner).toHaveAttribute('href', '/tokki-admin/orders?status=pending');
    expect(pendingBanner).toHaveTextContent('$15.50 por cobrar');

    const ordersKpiLink = screen.getByRole('link', { name: /^ver pedidos$/i });
    expect(ordersKpiLink).toHaveAttribute('href', '/tokki-admin/orders?status=pending');

    const productsKpiLink = screen.getByRole('link', { name: /^ver productos$/i });
    expect(productsKpiLink).toHaveAttribute('href', '/tokki-admin/products');
    expect(productsKpiLink).toHaveTextContent('1 en stock • 10 uds.');

    expect(screen.getByText(/Este mes:/)).toBeInTheDocument();
    expect(screen.getByText(/Prom\.:/)).toBeInTheDocument();
  });

  it('oculta el banner de pendientes y enlaza la tarjeta Pedidos a /tokki-admin/orders cuando no hay pendientes', async () => {
    mockFetchOrderSummaries.mockResolvedValue([SUMMARIES[0]]);
    renderPage();

    await screen.findByText('Pedidos Recientes');
    expect(
      screen.queryByRole('link', { name: /pendiente.*por revisar/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^ver pedidos$/i })).toHaveAttribute(
      'href',
      '/tokki-admin/orders',
    );
  });

  it('pide el listado de pedidos con el token de admin', async () => {
    renderPage();
    await screen.findByText('Pedidos Recientes');

    const auth = mockFetchOrderSummaries.mock.calls[0][0];
    expect(await auth?.getToken?.()).toBe('clerk-token');
  }, 15000);
});
