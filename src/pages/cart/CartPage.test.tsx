import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import CartPage from './CartPage';
import { CartProvider } from '../../context/CartContext';
import { fetchAllProducts } from '../../api/products';
import type { Product } from '../../types';

vi.mock('../../api/products', () => ({
  fetchAllProducts: vi.fn(),
}));

const mockFetchAllProducts = vi.mocked(fetchAllProducts);

const p1: Product = {
  product_id: 1,
  product_name: 'Bálsamo de Fresa',
  product_price: '3.50',
  product_description: 'Bálsamo labial hidratante.',
  qty_available: 45,
  in_stock: true,
  category: 'Maquillaje',
};

const p2: Product = {
  product_id: 2,
  product_name: 'Butterfly Gloss',
  product_price: '5.00',
  product_description: 'Gloss labial brillante.',
  qty_available: 30,
  in_stock: true,
  category: 'Maquillaje',
};

const p3: Product = {
  product_id: 3,
  product_name: 'Sombras Pastel',
  product_price: '7.50',
  product_description: 'Paleta de sombras pastel.',
  qty_available: 12,
  in_stock: true,
  category: 'Maquillaje',
};

function freshCatalog(): Product[] {
  return [
    // p1 bajó de stock a 2 unidades; p2 ya no existe en el catálogo.
    { ...p1, qty_available: 2 },
    p3,
  ];
}

function seedCart() {
  window.localStorage.setItem(
    'tokki_cart_v1',
    JSON.stringify([
      { product: p1, quantity: 5 },
      { product: p2, quantity: 1 },
    ]),
  );
}

function renderPage(initialEntry = '/cart') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <CartProvider>
        <CartPage />
      </CartProvider>
    </MemoryRouter>,
  );
}

describe('CartPage — reconciliación de stock al montar', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
    mockFetchAllProducts.mockResolvedValue(freshCatalog());
  });

  it('muestra un aviso con los productos ajustados y las cantidades nuevas', async () => {
    seedCart();
    renderPage();

    expect(await screen.findByRole('status')).toHaveTextContent(
      /Ajustamos tu carrito/i,
    );
    expect(screen.getByText(/ahora tiene solo 2 disponibles/i)).toBeInTheDocument();
  });

  it('elimina del carrito la línea cuyo producto ya no existe', async () => {
    seedCart();
    renderPage();

    await screen.findByRole('status');
    expect(screen.getByText(/ya no está disponible/i)).toBeInTheDocument();
    expect(screen.queryByText(p2.product_name)).not.toBeInTheDocument();
    expect(screen.getByText(p1.product_name)).toBeInTheDocument();
  });

  it('no muestra ningún aviso cuando el stock sigue vigente', async () => {
    window.localStorage.setItem(
      'tokki_cart_v1',
      JSON.stringify([{ product: p1, quantity: 1 }]),
    );
    renderPage();

    // Espera a que la reconciliación (best-effort) termine.
    await screen.findByText('Mi Carrito');
    expect(mockFetchAllProducts).toHaveBeenCalled();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByText(p1.product_name)).toBeInTheDocument();
  });
});
