import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import ProductManagementPage from './ProductManagementPage';
import { fetchAllProducts } from '../../../api/products';
import { AdminAuthContext } from '../../../components/auth/AdminAuthContext';
import type { Product } from '../../../types';

vi.mock('../../../api/products', () => ({
  fetchAllProducts: vi.fn(),
  archiveProduct: vi.fn(),
}));

const mockFetchAllProducts = vi.mocked(fetchAllProducts);

const MOCK_PRODUCTS: Product[] = [
  {
    product_id: 1,
    product_name: 'Bálsamo Labial Fresa',
    product_price: '3.50',
    product_description: 'Hidratante con aroma a fresa',
    qty_available: 10,
    in_stock: true,
    category: 'Maquillaje',
  },
  {
    product_id: 2,
    product_name: 'Serum Facial Centella',
    product_price: '12.00',
    product_description: 'Calmante para la piel',
    qty_available: 2,
    in_stock: true,
    category: 'Skincare',
  },
  {
    product_id: 3,
    product_name: 'Mochi Dulce Matcha',
    product_price: '4.00',
    product_description: 'Delicioso mochi artesanal',
    qty_available: 3,
    in_stock: true,
    category: 'Dulces & Comida Asiatica',
  },
  {
    product_id: 4,
    product_name: 'Pin Kawaii Bunny',
    product_price: '2.50',
    product_description: 'Pin metálico esmaltado',
    qty_available: 0,
    in_stock: false,
    category: 'Pines & Chapas',
  },
  {
    product_id: 5,
    product_name: 'Lentes Contacto Rosa',
    product_price: '15.00',
    product_description: 'Lentes cosméticos',
    qty_available: 5,
    in_stock: false,
    category: 'Lentes de Contacto',
  },
];

function renderPage(initialEntries: string[] = ['/tokki-admin/products']) {
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
      <MemoryRouter initialEntries={initialEntries}>
        <ProductManagementPage />
      </MemoryRouter>
    </AdminAuthContext.Provider>,
  );
}

beforeEach(() => {
  mockFetchAllProducts.mockReset();
  mockFetchAllProducts.mockResolvedValue(MOCK_PRODUCTS);
});

describe('ProductManagementPage — Low Stock Quick-Filter y Query Params', () => {
  it('renderiza todos los productos por defecto', async () => {
    renderPage();

    expect(await screen.findByText('Bálsamo Labial Fresa')).toBeInTheDocument();
    expect(screen.getByText('Serum Facial Centella')).toBeInTheDocument();
    expect(screen.getByText('Mochi Dulce Matcha')).toBeInTheDocument();
    expect(screen.getByText('Pin Kawaii Bunny')).toBeInTheDocument();
    expect(screen.getByText('Lentes Contacto Rosa')).toBeInTheDocument();
  });

  it('inicializa con el filtro de bajo stock cuando la URL tiene ?stock=low', async () => {
    renderPage(['/tokki-admin/products?stock=low']);

    expect(await screen.findByText('Serum Facial Centella')).toBeInTheDocument();
    expect(screen.getByText('Mochi Dulce Matcha')).toBeInTheDocument();

    expect(screen.queryByText('Bálsamo Labial Fresa')).not.toBeInTheDocument();
    expect(screen.queryByText('Pin Kawaii Bunny')).not.toBeInTheDocument();
    expect(screen.queryByText('Lentes Contacto Rosa')).not.toBeInTheDocument();
  });

  it('inicializa con el filtro de agotados cuando la URL tiene ?stock=out', async () => {
    renderPage(['/tokki-admin/products?stock=out']);

    expect(await screen.findByText('Pin Kawaii Bunny')).toBeInTheDocument();
    expect(screen.getByText('Lentes Contacto Rosa')).toBeInTheDocument();

    expect(screen.queryByText('Bálsamo Labial Fresa')).not.toBeInTheDocument();
    expect(screen.queryByText('Serum Facial Centella')).not.toBeInTheDocument();
    expect(screen.queryByText('Mochi Dulce Matcha')).not.toBeInTheDocument();
  });

  it('inicializa con el filtro de en stock cuando la URL tiene ?stock=in', async () => {
    renderPage(['/tokki-admin/products?stock=in']);

    expect(await screen.findByText('Bálsamo Labial Fresa')).toBeInTheDocument();
    expect(screen.getByText('Serum Facial Centella')).toBeInTheDocument();
    expect(screen.getByText('Mochi Dulce Matcha')).toBeInTheDocument();

    expect(screen.queryByText('Pin Kawaii Bunny')).not.toBeInTheDocument();
    expect(screen.queryByText('Lentes Contacto Rosa')).not.toBeInTheDocument();
  });

  it('permite filtrar por bajo stock al hacer clic en el botón de la barra', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('Bálsamo Labial Fresa')).toBeInTheDocument();

    const lowStockBtn = screen.getByRole('button', { name: /bajo stock/i });
    await user.click(lowStockBtn);

    expect(screen.getByText('Serum Facial Centella')).toBeInTheDocument();
    expect(screen.getByText('Mochi Dulce Matcha')).toBeInTheDocument();
    expect(screen.queryByText('Bálsamo Labial Fresa')).not.toBeInTheDocument();
    expect(screen.queryByText('Pin Kawaii Bunny')).not.toBeInTheDocument();
  });

  it('restablece el filtro al hacer clic en Limpiar filtros', async () => {
    const user = userEvent.setup();
    renderPage(['/tokki-admin/products?stock=low']);

    expect(await screen.findByText('Serum Facial Centella')).toBeInTheDocument();
    expect(screen.queryByText('Bálsamo Labial Fresa')).not.toBeInTheDocument();

    const searchInput = screen.getByLabelText('Buscar producto');
    await user.type(searchInput, 'inexistente_123');

    const clearFiltersBtn = await screen.findByRole('button', { name: /limpiar filtros/i });
    await user.click(clearFiltersBtn);

    expect(await screen.findByText('Bálsamo Labial Fresa')).toBeInTheDocument();
    expect(screen.getByText('Pin Kawaii Bunny')).toBeInTheDocument();
  });
});
