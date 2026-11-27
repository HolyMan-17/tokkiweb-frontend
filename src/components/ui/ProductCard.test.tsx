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

  it('loads images eagerly without high fetchPriority when eager is true and adds responsive attributes for UUID product images', () => {
    const uuidProduct: Product = {
      ...IN_STOCK_PRODUCT,
      product_image_url: '/images/products/aaaaaaaa-1111-4111-8111-111111111111.webp',
    };
    const { container } = render(
      <MemoryRouter>
        <ProductCard product={uuidProduct} eager />
      </MemoryRouter>,
    );

    const img = container.querySelector('img.card-img');
    expect(img).toHaveAttribute('loading', 'eager');
    expect(img).not.toHaveAttribute('fetchpriority');
    expect(img).toHaveAttribute('width', '400');
    expect(img).toHaveAttribute('height', '400');
    expect(img).toHaveAttribute('src', '/images/products/aaaaaaaa-1111-4111-8111-111111111111.webp?w=400');
    expect(img).toHaveAttribute(
      'srcset',
      '/images/products/aaaaaaaa-1111-4111-8111-111111111111.webp?w=400 400w, /images/products/aaaaaaaa-1111-4111-8111-111111111111.webp?w=800 800w',
    );
    expect(img).toHaveAttribute('sizes', '(min-width: 768px) 240px, 46vw');
  });

  it('muestra burbuja de porcentaje arriba a la izquierda, precio rebajado y precio original tachado cuando hay descuento', () => {
    const discounted: Product = {
      ...IN_STOCK_PRODUCT,
      product_price: '10.00',
      discount_percent: 20,
    };
    const { container } = render(
      <MemoryRouter>
        <ProductCard product={discounted} />
      </MemoryRouter>,
    );

    const imgWrap = container.querySelector('.card-img-wrap');
    const badge = container.querySelector('.card-discount-badge');
    expect(badge).not.toBeNull();
    expect(imgWrap).toContainElement(badge as HTMLElement);
    expect(badge).toHaveTextContent('-20%');
    expect(badge).toHaveAttribute('aria-label', '20% de descuento');

    expect(screen.getByText('$8.00')).toBeInTheDocument();
    expect(container.querySelector('del.tokki-price__original')).toHaveTextContent('$10.00');
  });

  it('no muestra burbuja ni precio tachado cuando discount_percent es 0 o indefinido', () => {
    const { container } = render(
      <MemoryRouter>
        <ProductCard product={{ ...IN_STOCK_PRODUCT, discount_percent: 0 }} />
      </MemoryRouter>,
    );

    expect(container.querySelector('.card-discount-badge')).toBeNull();
    expect(container.querySelector('del.tokki-price__original')).toBeNull();
    expect(screen.getByText('$6.50')).toBeInTheDocument();
  });
});
