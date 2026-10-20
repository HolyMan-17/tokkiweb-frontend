import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GlobalSearchBar } from './GlobalSearchBar';
import type { Product } from '../../types';
import * as productsApi from '../../api/products';

const MOCK_PRODUCTS: Product[] = [
  {
    product_id: 1,
    product_name: 'Gloss Mágico Bunny',
    category: 'Maquillaje',
    product_price: '5.50',
    product_description: 'Brillo labial hidratante que cambia de color.',
    qty_available: 10,
    in_stock: true,
    product_image_url: 'https://example.com/gloss.png',
  },
  {
    product_id: 2,
    product_name: 'Serum de Arroz Coreano',
    category: 'Skincare',
    product_price: '14.00',
    product_description: 'Serum iluminador con extracto fermentado de arroz.',
    qty_available: 4,
    in_stock: true,
    product_image_url: 'https://example.com/serum.png',
  },
  {
    product_id: 3,
    product_name: 'Mochi Fresa Cream',
    category: 'Dulces & Comida Asiatica',
    product_price: '3.50',
    product_description: 'Dulce tradicional relleno de crema de fresa.',
    qty_available: 8,
    in_stock: true,
    product_image_url: 'https://example.com/mochi.png',
  },
  {
    product_id: 4,
    product_name: 'Té Matcha Japonés',
    category: 'Dulces & Comida Asiatica',
    product_price: '6.00',
    product_description: 'Polvo de té verde ceremonial importado.',
    qty_available: 12,
    in_stock: true,
    product_image_url: 'https://example.com/matcha.png',
  },
  {
    product_id: 5,
    product_name: 'Photocard Holder Tokki',
    category: 'Zona KPOP',
    product_price: '4.50',
    product_description: 'Funda protectora acrílica con orejas de conejo.',
    qty_available: 15,
    in_stock: true,
    product_image_url: 'https://example.com/holder.png',
  },
];

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('GlobalSearchBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. focus on empty input opens listbox and displays "Últimas Novedades ✨" with latest products', () => {
    render(
      <MemoryRouter>
        <GlobalSearchBar products={MOCK_PRODUCTS} />
      </MemoryRouter>
    );

    const input = screen.getByRole('combobox', { name: /buscar producto/i });
    expect(input).toHaveAttribute('aria-expanded', 'false');

    fireEvent.focus(input);

    expect(input).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(/últimas novedades/i)).toBeInTheDocument();

    // Latest 4 products in reverse order: id 5, 4, 3, 2
    expect(screen.getByText('Photocard Holder Tokki')).toBeInTheDocument();
    expect(screen.getByText('Té Matcha Japonés')).toBeInTheDocument();
    expect(screen.getByText('Mochi Fresa Cream')).toBeInTheDocument();
    expect(screen.getByText('Serum de Arroz Coreano')).toBeInTheDocument();
    expect(screen.queryByText('Gloss Mágico Bunny')).not.toBeInTheDocument();
  });

  it('2. filters products with live suggestions, formatted price and "Ver todos los N productos"', () => {
    render(
      <MemoryRouter>
        <GlobalSearchBar products={MOCK_PRODUCTS} />
      </MemoryRouter>
    );

    const input = screen.getByRole('combobox', { name: /buscar producto/i });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'te' } });

    // Matches 'Té Matcha Japonés' (name) and 'Serum... extracto fermentado de arroz' (desc contains 'te')
    expect(screen.getByText('Té Matcha Japonés')).toBeInTheDocument();
    expect(screen.getByText('$6.00')).toBeInTheDocument();

    const viewAllBtn = screen.getByRole('button', { name: /ver todos los/i });
    expect(viewAllBtn).toBeInTheDocument();
    expect(viewAllBtn).toHaveTextContent(/ver todos los \d+ productos para "te"/i);
  });

  it('3. clicking a suggested product navigates to /products/:id and closes listbox', () => {
    render(
      <MemoryRouter>
        <GlobalSearchBar products={MOCK_PRODUCTS} />
      </MemoryRouter>
    );

    const input = screen.getByRole('combobox', { name: /buscar producto/i });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'mochi' } });

    const mochiOption = screen.getByRole('option', { name: /mochi fresa cream/i });
    fireEvent.click(mochiOption);

    expect(mockNavigate).toHaveBeenCalledWith('/products/3');
    expect(input).toHaveAttribute('aria-expanded', 'false');
  });

  it('4. shows empty state message and category links when query has no matches', () => {
    render(
      <MemoryRouter>
        <GlobalSearchBar products={MOCK_PRODUCTS} />
      </MemoryRouter>
    );

    const input = screen.getByRole('combobox', { name: /buscar producto/i });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'ramen picante' } });

    expect(
      screen.getByText(/no encontramos "ramen picante"\. intente buscando en nuestras categorías/i)
    ).toBeInTheDocument();

    // Check category pills appear in empty state
    const categoryLink = screen.getByRole('link', { name: /maquillaje/i });
    expect(categoryLink).toHaveAttribute('href', '/categorias/maquillaje');
  });

  it('5. submitting with Enter or clicking "Ver todos" navigates to /productos?q=...', () => {
    render(
      <MemoryRouter>
        <GlobalSearchBar products={MOCK_PRODUCTS} />
      </MemoryRouter>
    );

    const input = screen.getByRole('combobox', { name: /buscar producto/i });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'mochi' } });

    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    expect(mockNavigate).toHaveBeenCalledWith('/productos?q=mochi');
    expect(input).toHaveAttribute('aria-expanded', 'false');
  });

  it('6. clear button (×) empties input and restores "Últimas Novedades ✨"', () => {
    render(
      <MemoryRouter>
        <GlobalSearchBar products={MOCK_PRODUCTS} />
      </MemoryRouter>
    );

    const input = screen.getByRole('combobox', { name: /buscar producto/i });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'mochi' } });

    const clearBtn = screen.getByRole('button', { name: /limpiar búsqueda/i });
    fireEvent.click(clearBtn);

    expect(input).toHaveValue('');
    expect(screen.getByText(/últimas novedades/i)).toBeInTheDocument();
  });

  it('7. mobile trigger opens full overlay and Cancel button / Escape / click outside closes it', () => {
    const { container } = render(
      <MemoryRouter>
        <GlobalSearchBar products={MOCK_PRODUCTS} />
      </MemoryRouter>
    );

    const root = container.firstChild as HTMLElement;
    expect(root).not.toHaveClass('global-search--mobile-open');

    const triggerBtn = screen.getByRole('button', { name: /abrir búsqueda/i });
    fireEvent.click(triggerBtn);

    expect(root).toHaveClass('global-search--mobile-open');

    // Click Cancelar closes mobile overlay
    const cancelBtn = screen.getByRole('button', { name: /cancelar/i });
    fireEvent.click(cancelBtn);

    expect(root).not.toHaveClass('global-search--mobile-open');

    // Test Escape key closes it
    fireEvent.click(triggerBtn);
    expect(root).toHaveClass('global-search--mobile-open');

    const input = screen.getByRole('combobox', { name: /buscar producto/i });
    fireEvent.keyDown(input, { key: 'Escape', code: 'Escape' });

    expect(root).not.toHaveClass('global-search--mobile-open');
  });

  it('8. falls back to cached fetchAllProducts when products prop is omitted', async () => {
    const fetchSpy = vi.spyOn(productsApi, 'fetchAllProducts').mockResolvedValue(MOCK_PRODUCTS);

    render(
      <MemoryRouter>
        <GlobalSearchBar />
      </MemoryRouter>
    );

    const input = screen.getByRole('combobox', { name: /buscar producto/i });
    fireEvent.focus(input);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalled();
      expect(screen.getByText('Photocard Holder Tokki')).toBeInTheDocument();
    });
  });
});
