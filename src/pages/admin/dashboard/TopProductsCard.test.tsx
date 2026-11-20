import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TopProductsCard from './TopProductsCard';
import { fetchTopProducts } from '../../../api/analytics';
import type { TopProductStat } from '../../../types';

vi.mock('../../../api/analytics', () => ({
  fetchTopProducts: vi.fn(),
}));

const mockFetchTopProducts = vi.mocked(fetchTopProducts);

const TOP_BY_UNITS: TopProductStat[] = [
  {
    product_id: 12,
    product_name: 'Bálsamo Labial Fresa',
    category: 'Maquillaje',
    product_price: '5.00',
    qty_available: 2,
    in_stock: true,
    product_image_url: null,
    units_sold: 24,
    orders_count: 14,
    total_revenue: '120.00',
  },
  {
    product_id: 8,
    product_name: 'Sérum Vitamina C',
    category: 'Skincare',
    product_price: '25.00',
    qty_available: 0,
    in_stock: false,
    product_image_url: null,
    units_sold: 8,
    orders_count: 8,
    total_revenue: '200.00',
  },
];

const TOP_BY_REVENUE: TopProductStat[] = [TOP_BY_UNITS[1], TOP_BY_UNITS[0]];

function renderCard() {
  const auth = { getToken: async () => 'clerk-token' };
  return render(
    <MemoryRouter>
      <TopProductsCard auth={auth} />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mockFetchTopProducts.mockReset();
  mockFetchTopProducts.mockResolvedValue(TOP_BY_UNITS);
});

describe('TopProductsCard', () => {
  it('renders ranked products from fetchTopProducts with medals, sold count, revenue, stock, and ?edit link', async () => {
    renderCard();

    expect(await screen.findByText('Productos Destacados')).toBeInTheDocument();
    expect(screen.getByText('Bálsamo Labial Fresa')).toBeInTheDocument();
    expect(screen.getByText('🥇 #1')).toBeInTheDocument();
    expect(screen.getByText('24 vendidos')).toBeInTheDocument();
    expect(screen.getByText('$120.00')).toBeInTheDocument();
    expect(screen.getByText('2 en stock')).toBeInTheDocument();
    expect(screen.getByText('Agotado (0)')).toBeInTheDocument();

    const editLink = screen.getByRole('link', { name: /Editar Bálsamo Labial Fresa/i });
    expect(editLink).toHaveAttribute('href', '/tokki-admin/products?edit=12');

    expect(mockFetchTopProducts).toHaveBeenCalledWith(
      { sort: 'units', period: 'all', limit: 5 },
      expect.objectContaining({ getToken: expect.any(Function) }),
    );
  });

  it('toggles sort to Ingresos ($) and period to 7d and 30d', async () => {
    const user = userEvent.setup();
    renderCard();

    await screen.findByText('Bálsamo Labial Fresa');

    mockFetchTopProducts.mockResolvedValueOnce(TOP_BY_REVENUE);
    await user.click(screen.getByRole('button', { name: 'Ingresos ($)' }));

    expect(mockFetchTopProducts).toHaveBeenLastCalledWith(
      { sort: 'revenue', period: 'all', limit: 5 },
      expect.any(Object),
    );
    expect(await screen.findByText('Mayor ingreso en pedidos aprobados')).toBeInTheDocument();

    mockFetchTopProducts.mockResolvedValueOnce([TOP_BY_UNITS[0]]);
    await user.click(screen.getByRole('button', { name: '7d' }));
    expect(mockFetchTopProducts).toHaveBeenLastCalledWith(
      { sort: 'revenue', period: '7d', limit: 5 },
      expect.any(Object),
    );

    mockFetchTopProducts.mockResolvedValueOnce([TOP_BY_UNITS[1]]);
    await user.click(screen.getByRole('button', { name: '30d' }));
    expect(mockFetchTopProducts).toHaveBeenLastCalledWith(
      { sort: 'revenue', period: '30d', limit: 5 },
      expect.any(Object),
    );
  });

  it('shows period-appropriate empty states when no approved sales exist', async () => {
    const user = userEvent.setup();
    mockFetchTopProducts.mockResolvedValue([]);
    renderCard();

    expect(
      await screen.findByText('Aún no hay ventas aprobadas para mostrar un ranking.'),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '7d' }));
    expect(
      await screen.findByText('No hay ventas aprobadas en este período.'),
    ).toBeInTheDocument();
  });

  it('shows inline error state and retries cleanly on button click', async () => {
    const user = userEvent.setup();
    mockFetchTopProducts.mockRejectedValueOnce(new Error('Network error'));
    renderCard();

    expect(
      await screen.findByText('No pudimos cargar el ranking de productos.'),
    ).toBeInTheDocument();

    mockFetchTopProducts.mockResolvedValueOnce(TOP_BY_UNITS);
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByText('Bálsamo Labial Fresa')).toBeInTheDocument();
  });
});
