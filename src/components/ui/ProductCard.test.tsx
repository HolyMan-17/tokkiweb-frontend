import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, it, expect, vi } from 'vitest';
import ProductCard from './ProductCard';
import type { Product } from '../../types';

const mockAddItem = vi.fn();

vi.mock('../../context/CartContext', () => ({
  useCart: () => ({
    items: [],
    itemCount: 0,
    addItem: mockAddItem,
    removeItem: vi.fn(),
    updateQuantity: vi.fn(),
    clearCart: vi.fn(),
  }),
  useCartActions: () => ({
    addItem: mockAddItem,
    removeItem: vi.fn(),
    updateQuantity: vi.fn(),
    clearCart: vi.fn(),
  }),
}));

const IN_STOCK_PRODUCT: Product = {
  product_id: 42,
  product_name: 'Cuaderno Conejito Pastel',
  category: 'Papeleria',
  product_price: '6.50',
  product_description: 'Libreta kawaii.',
  qty_available: 10,
  in_stock: true,
  product_image_url: 'https://example.com/cuaderno.webp',
};

const OUT_OF_STOCK_PRODUCT: Product = {
  ...IN_STOCK_PRODUCT,
  product_id: 43,
  qty_available: 0,
  in_stock: false,
};

describe('ProductCard', () => {
  beforeEach(() => {
    mockAddItem.mockClear();
  });

  it('renders as an <article> with a product <Link> and a quick-add <button> that is NOT nested inside <a>', () => {
    const { container } = render(
      <MemoryRouter>
        <ProductCard product={IN_STOCK_PRODUCT} />
      </MemoryRouter>,
    );

    const card = container.querySelector('.product-card');
    expect(card).not.toBeNull();
    expect(card?.tagName).toBe('ARTICLE');

    const link = container.querySelector('a.card-link');
    expect(link).not.toBeNull();
    expect(link).toHaveAttribute('href', '/products/42');
    expect(link).toHaveTextContent('Cuaderno Conejito Pastel');

    const addBtn = screen.getByRole('button', {
      name: 'Agregar Cuaderno Conejito Pastel al carrito',
    });
    expect(addBtn.closest('a')).toBeNull();
  });

  it('calls addItem(product, 1) when quick-add button is clicked', () => {
    render(
      <MemoryRouter>
        <ProductCard product={IN_STOCK_PRODUCT} />
      </MemoryRouter>,
    );

    const addBtn = screen.getByRole('button', {
      name: 'Agregar Cuaderno Conejito Pastel al carrito',
    });
    fireEvent.click(addBtn);

    expect(mockAddItem).toHaveBeenCalledTimes(1);
    expect(mockAddItem).toHaveBeenCalledWith(IN_STOCK_PRODUCT, 1);
  });

  it('disables quick-add button and renders sold-out ribbon when out of stock', () => {
    const { container } = render(
      <MemoryRouter>
        <ProductCard product={OUT_OF_STOCK_PRODUCT} />
      </MemoryRouter>,
    );

    const addBtn = screen.getByRole('button', {
      name: 'Agregar Cuaderno Conejito Pastel al carrito',
    });
    expect(addBtn).toBeDisabled();
    expect(container.querySelector('.sold-out-ribbon')).toHaveTextContent('Agotado');

    fireEvent.click(addBtn);
    expect(mockAddItem).not.toHaveBeenCalled();
  });

  it('renders .card-img-deferred instead of <img> when deferImage is true', () => {
    const { container } = render(
      <MemoryRouter>
        <ProductCard product={IN_STOCK_PRODUCT} deferImage />
      </MemoryRouter>,
    );

    expect(container.querySelector('img.card-img')).toBeNull();
    expect(container.querySelector('.card-img-deferred')).not.toBeNull();
  });

  it('loads images lazily by default and eagerly with high fetchPriority when priority is true', () => {
    const { container, rerender } = render(
      <MemoryRouter>
        <ProductCard product={IN_STOCK_PRODUCT} />
      </MemoryRouter>,
    );

    const lazyImg = container.querySelector('img.card-img');
    expect(lazyImg).toHaveAttribute('loading', 'lazy');
    expect(lazyImg).not.toHaveAttribute('fetchpriority');

    rerender(
      <MemoryRouter>
        <ProductCard product={IN_STOCK_PRODUCT} priority />
      </MemoryRouter>,
    );

    const eagerImg = container.querySelector('img.card-img');
    expect(eagerImg).toHaveAttribute('loading', 'eager');
    expect(eagerImg).toHaveAttribute('fetchpriority', 'high');
  });
});
