import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import CatalogPage from './CatalogPage';

vi.mock('../../api/products', () => ({
  fetchAllProducts: vi.fn().mockResolvedValue([
    {
      product_id: 1,
      product_name: 'Mochi de Fresa',
      category: 'Dulces Asiáticos',
      product_price: '3.50',
      product_description: 'Delicioso mochi tradicional',
      qty_available: 10,
      in_stock: true,
      product_image_url: 'https://example.com/mochi.jpg',
    },
  ]),
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

describe('CatalogPage — footer and social links', () => {
  it('renders footer with 2026 copyright and Tokki Shop link pointing to external url', async () => {
    render(
      <MemoryRouter>
        <CatalogPage />
      </MemoryRouter>
    );

    const devLink = await screen.findByRole('link', { name: /Tokki Shop/i });
    expect(devLink).toBeInTheDocument();
    expect(devLink).toHaveAttribute('href', 'https://oak-dev-11db6.web.app/');
    expect(screen.getByText(/2026/i)).toBeInTheDocument();
  });

  it('links directly to WhatsApp chat number instead of the WhatsApp catalog', async () => {
    render(
      <MemoryRouter>
        <CatalogPage />
      </MemoryRouter>
    );

    const waLink = await screen.findByRole('link', { name: /WhatsApp/i });
    expect(waLink).toBeInTheDocument();
    expect(waLink).toHaveAttribute('href', 'https://wa.me/584122698243');
  });
});
