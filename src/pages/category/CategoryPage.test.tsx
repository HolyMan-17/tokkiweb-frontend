import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import CategoryPage from './CategoryPage';
import { CartProvider } from '../../context/CartContext';
import { fetchAllProducts } from '../../api/products';
import type { Product } from '../../types';

vi.mock('../../api/products', () => ({
  fetchAllProducts: vi.fn(),
}));

const mockFetchAllProducts = vi.mocked(fetchAllProducts);

const glossMariposa: Product = {
  product_id: 101,
  product_name: 'Gloss Mariposa',
  product_price: '5.00',
  product_description: 'Brillo hidratante con efecto espejo.',
  qty_available: 10,
  in_stock: true,
  category: 'Maquillaje',
};

const sombrasRosadas: Product = {
  product_id: 102,
  product_name: 'Sombras Rosadas',
  product_price: '7.00',
  product_description: 'Paleta de sombras en tonos pastel.',
  qty_available: 5,
  in_stock: true,
  category: 'Maquillaje',
};

function renderCategory(path = '/categorias/maquillaje') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <CartProvider>
        <Routes>
          <Route path="/categorias/:slug" element={<CategoryPage />} />
        </Routes>
      </CartProvider>
    </MemoryRouter>,
  );
}

describe('CategoryPage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
    mockFetchAllProducts.mockResolvedValue([glossMariposa, sombrasRosadas]);
  });

  it('mantiene visible el producto cuyo término solo aparece en la descripción', async () => {
    const user = userEvent.setup();
    renderCategory();

    expect(await screen.findByText('Gloss Mariposa')).toBeInTheDocument();
    expect(screen.getByText('Sombras Rosadas')).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('Buscar en Maquillaje...'), 'hidratante');

    expect(screen.getByText('Gloss Mariposa')).toBeInTheDocument();
    expect(screen.queryByText('Sombras Rosadas')).not.toBeInTheDocument();
    expect(screen.getByText('Mostrando 1 de 2 productos')).toBeInTheDocument();
  });

  it('filtra por categoría, adapta el placeholder de búsqueda y muestra el icono de la categoría', async () => {
    const kpopProduct: Product = {
      product_id: 201,
      product_name: 'Photocard Set BTS',
      product_price: '6.50',
      product_description: 'Set de photocards holográficas.',
      qty_available: 20,
      in_stock: true,
      category: 'Zona KPOP',
    };

    mockFetchAllProducts.mockResolvedValue([glossMariposa, kpopProduct]);
    renderCategory('/categorias/zona-kpop');

    expect(await screen.findByText('Zona KPOP')).toBeInTheDocument();
    expect(screen.getByText('Photocard Set BTS')).toBeInTheDocument();
    expect(screen.queryByText('Gloss Mariposa')).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText('Buscar en Zona KPOP...')).toBeInTheDocument();

    const titleImg = document.querySelector('.category-page-title img');
    expect(titleImg).not.toBeNull();
    expect(titleImg?.getAttribute('src')).toContain('kpop');
  });

  it('ordena por "Más recientes" (default) mostrando primero el producto con mayor product_id', async () => {
    const labialViejo: Product = {
      product_id: 10,
      product_name: 'Labial Viejo',
      product_price: '3.00',
      product_description: 'Producto antiguo.',
      qty_available: 4,
      in_stock: true,
      category: 'Maquillaje',
    };
    const labialNuevo: Product = {
      product_id: 99,
      product_name: 'Labial Nuevo',
      product_price: '6.00',
      product_description: 'Producto recién agregado.',
      qty_available: 7,
      in_stock: true,
      category: 'Maquillaje',
    };

    mockFetchAllProducts.mockResolvedValue([labialViejo, labialNuevo]);
    renderCategory();

    const select = await screen.findByRole('combobox', { name: 'Ordenar productos' });
    expect(select).toHaveValue('recent');

    const nuevos = await screen.findAllByText('Labial Nuevo');
    const viejos = await screen.findAllByText('Labial Viejo');
    expect(nuevos.length).toBeGreaterThan(0);
    expect(viejos.length).toBeGreaterThan(0);

    expect(nuevos[0].compareDocumentPosition(viejos[0])).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it('renderiza la página de categoría Regalos listo para entrega con su icono christmas_gifts y solo sus productos', async () => {
    const readyGiftProduct: Product = {
      product_id: 901,
      product_name: 'Set Navideño Listo Tokki',
      product_price: '15.00',
      product_description: 'Caja navideña armada lista para entregar.',
      qty_available: 8,
      in_stock: true,
      category: 'Regalos listo para entrega',
    };

    mockFetchAllProducts.mockResolvedValue([glossMariposa, readyGiftProduct]);
    renderCategory('/categorias/regalos-listo-para-entrega');

    expect(await screen.findByText('Regalos listo para entrega')).toBeInTheDocument();
    expect(screen.getByText('Set Navideño Listo Tokki')).toBeInTheDocument();
    expect(screen.queryByText('Gloss Mariposa')).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText('Buscar en Regalos listo para entrega...')).toBeInTheDocument();

    const titleImg = document.querySelector('.category-page-title img');
    expect(titleImg).not.toBeNull();
    expect(titleImg?.getAttribute('src')).toContain('christmas_gifts');
  });
});
