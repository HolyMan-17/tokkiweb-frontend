import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { PosProductCard } from './PosProductCard';
import type { Product } from '../../../../types';

describe('PosProductCard', () => {
  const baseProduct: Product = {
    product_id: 10,
    product_name: 'Gloss Bunny Pastel',
    product_price: '5.50',
    product_description: 'Gloss labial suave',
    category: 'Maquillaje',
    qty_available: 10,
    in_stock: true,
    product_image_url: 'https://example.com/gloss.png',
  };

  const defaultProps = {
    product: baseProduct,
    selectedQty: 0,
    onAddItem: vi.fn(),
    onUpdateQty: vi.fn(),
    onRemoveItem: vi.fn(),
  };

  it('renderiza la información del producto, imagen y badge de stock normal', () => {
    render(<PosProductCard {...defaultProps} />);

    expect(screen.getByText('Gloss Bunny Pastel')).toBeInTheDocument();
    expect(screen.getByText('$5.50')).toBeInTheDocument();
    expect(screen.getByText('Maquillaje')).toBeInTheDocument();
    expect(screen.getByText('10 disponibles')).toBeInTheDocument();
    expect(screen.getByText('10 disp.')).toBeInTheDocument();

    const img = screen.getByRole('img', { name: 'Gloss Bunny Pastel' });
    expect(img).toHaveAttribute('src', 'https://example.com/gloss.png');
  });

  it('aplica la clase low-stock cuando qty_available <= 3', () => {
    const lowStockProduct = { ...baseProduct, qty_available: 2 };
    const { container } = render(
      <PosProductCard {...defaultProps} product={lowStockProduct} />,
    );

    const badge = container.querySelector('.pos-stock-badge');
    expect(badge).toHaveClass('low-stock');
    expect(screen.getByText('2 disponibles')).toBeInTheDocument();
    expect(screen.getByText('2 disp.')).toBeInTheDocument();
  });

  it('muestra Agotado y deshabilita botón si no hay stock', () => {
    const outOfStockProduct = {
      ...baseProduct,
      qty_available: 0,
      in_stock: false,
    };
    const { container } = render(
      <PosProductCard {...defaultProps} product={outOfStockProduct} />,
    );

    const badge = container.querySelector('.pos-stock-badge');
    expect(badge).toHaveClass('out-of-stock');
    expect(screen.getAllByText('Agotado').length).toBeGreaterThanOrEqual(1);

    const addBtn = screen.getByRole('button', { name: /Agregar/i });
    expect(addBtn).toBeDisabled();
  });

  it('llama a onAddItem al hacer clic en Agregar', async () => {
    const user = userEvent.setup();
    const onAddItem = vi.fn();
    render(<PosProductCard {...defaultProps} onAddItem={onAddItem} />);

    const addBtn = screen.getByRole('button', { name: /Agregar/i });
    await user.click(addBtn);

    expect(onAddItem).toHaveBeenCalledTimes(1);
    expect(onAddItem).toHaveBeenCalledWith(baseProduct);
  });

  it('muestra stepper y badge si selectedQty > 0', async () => {
    const user = userEvent.setup();
    const onUpdateQty = vi.fn();
    const onRemoveItem = vi.fn();

    render(
      <PosProductCard
        {...defaultProps}
        selectedQty={2}
        onUpdateQty={onUpdateQty}
        onRemoveItem={onRemoveItem}
      />,
    );

    expect(screen.getByText('En pedido: 2')).toBeInTheDocument();
    expect(screen.getByTestId('selected-qty-10')).toHaveTextContent('2');

    const incBtn = screen.getByRole('button', { name: /Aumentar/i });
    await user.click(incBtn);
    expect(onUpdateQty).toHaveBeenCalledWith(10, 3);

    const decBtn = screen.getByRole('button', { name: /Disminuir/i });
    await user.click(decBtn);
    expect(onUpdateQty).toHaveBeenCalledWith(10, 1);

    const removeBtn = screen.getByRole('button', { name: /Quitar/i });
    await user.click(removeBtn);
    expect(onRemoveItem).toHaveBeenCalledWith(10);
  });
});
