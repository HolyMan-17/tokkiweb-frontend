import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import AllProductsPage from './AllProductsPage';
import type { Product } from '../../types';

const MOCK_PRODUCTS: Product[] = [
  {
    product_id: 1,
    product_name: 'Mochi Fresa Cream',
    category: 'Dulces & Comida Asiatica',
    product_price: '3.50',
    product_description: 'Delicioso mochi tradicional relleno',
    qty_available: 10,
    in_stock: true,
    product_image_url: 'https://example.com/mochi.jpg',
  },
  {
    product_id: 2,
    product_name: 'Bálsamo Labial Bunny',
    category: 'Maquillaje',
    product_price: '5.00',
    product_description: 'Hidratante con aroma a fresa',
    qty_available: 5,
    in_stock: true,
    product_image_url: 'https://example.com/balsamo.jpg',
  },
  {
    product_id: 3,
    product_name: 'Peluche Conejito Rosa',
    category: 'Peluches y Figuras',
    product_price: '15.00',
    product_description: 'Peluche suave y esponjoso',
    qty_available: 0,
    in_stock: false,
    product_image_url: 'https://example.com/peluche.jpg',
  },
];

vi.mock('../../api/products', () => ({
  fetchAllProducts: vi.fn().mockImplementation(() => Promise.resolve(MOCK_PRODUCTS)),
}));

vi.mock('../../context/CartContext', () => ({
  useCart: () => ({
    items: [],
    addItem: vi.fn(),
    removeItem: vi.fn(),
    updateQuantity: vi.fn(),
    clearCart: vi.fn(),
    totalCount: 0,
    totalPrice: 0,
  }),
}));

describe('AllProductsPage — URL ?q= sync', () => {
  it('pre-populates search query and filters products when loaded with ?q=mochi', async () => {
    render(
      <MemoryRouter initialEntries={['/productos?q=mochi']}>
        <Routes>
          <Route path="/productos" element={<AllProductsPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Wait for product card to appear
    expect(await screen.findByText('Mochi Fresa Cream')).toBeInTheDocument();
    expect(screen.queryByText('Bálsamo Labial Bunny')).not.toBeInTheDocument();
    expect(screen.queryByText('Peluche Conejito Rosa')).not.toBeInTheDocument();

    const searchInput = screen.getByRole('textbox', { name: /buscar por nombre o descripción/i });
    expect(searchInput).toHaveValue('mochi');
  });

  it('handles case-insensitive and diacritic-insensitive query from URL like ?q=balsamo', async () => {
    render(
      <MemoryRouter initialEntries={['/productos?q=balsamo']}>
        <Routes>
          <Route path="/productos" element={<AllProductsPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText('Bálsamo Labial Bunny')).toBeInTheDocument();
    expect(screen.queryByText('Mochi Fresa Cream')).not.toBeInTheDocument();
  });

  it('renders all products when no query parameter is present', async () => {
    render(
      <MemoryRouter initialEntries={['/productos']}>
        <Routes>
          <Route path="/productos" element={<AllProductsPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText('Mochi Fresa Cream')).toBeInTheDocument();
    expect(screen.getByText('Bálsamo Labial Bunny')).toBeInTheDocument();
    expect(screen.getByText('Peluche Conejito Rosa')).toBeInTheDocument();
  });

  it('updates the filter and clears query when clear button is clicked', async () => {
    render(
      <MemoryRouter initialEntries={['/productos?q=mochi']}>
        <Routes>
          <Route path="/productos" element={<AllProductsPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText('Mochi Fresa Cream')).toBeInTheDocument();
    expect(screen.queryByText('Bálsamo Labial Bunny')).not.toBeInTheDocument();

    const clearBtn = screen.getByRole('button', { name: /limpiar búsqueda/i });
    fireEvent.click(clearBtn);

    expect(screen.getByText('Mochi Fresa Cream')).toBeInTheDocument();
    expect(screen.getByText('Bálsamo Labial Bunny')).toBeInTheDocument();
    expect(screen.getByText('Peluche Conejito Rosa')).toBeInTheDocument();
  });
});
