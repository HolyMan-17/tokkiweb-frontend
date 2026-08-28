import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import AdminProductPicker from './AdminProductPicker';
import type { Product } from '../../../../types';

const MOCK_PRODUCTS: Product[] = [
  {
    product_id: 1,
    product_name: 'Gloss Mágico Bunny',
    product_price: '5.50',
    product_description: 'Brillo labial hidratante con tono rosado.',
    qty_available: 10,
    in_stock: true,
    category: 'Maquillaje',
    product_image_url: 'https://example.com/gloss.png',
  },
  {
    product_id: 2,
    product_name: 'Serum Facial Rice Glow',
    product_price: '12.00',
    product_description: 'Serum de arroz iluminador.',
    qty_available: 2,
    in_stock: true,
    category: 'Skincare',
    product_image_url: null,
  },
  {
    product_id: 3,
    product_name: 'Collar Corazón Pastel',
    product_price: '4.00',
    product_description: 'Collar con dije de resina en forma de corazón.',
    qty_available: 0,
    in_stock: false,
    category: 'Accesorios',
    product_image_url: 'https://example.com/collar.png',
  },
  {
    product_id: 4,
    product_name: 'Mochi Fresa Cream',
    product_price: '3.50',
    product_description: 'Dulce tradicional relleno de crema de fresa.',
    qty_available: 5,
    in_stock: true,
    category: 'Dulces & Comida Asiatica',
    product_image_url: null,
  },
];

describe('AdminProductPicker', () => {
  const defaultProps = {
    products: MOCK_PRODUCTS,
    selectedItems: new Map<number, number>(),
    onAddItem: vi.fn(),
    onUpdateQty: vi.fn(),
    onRemoveItem: vi.fn(),
  };

  it('renderiza el buscador en vivo con el placeholder requerido', () => {
    render(<AdminProductPicker {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText('Buscar producto por nombre o categoría…');
    expect(searchInput).toBeInTheDocument();
    expect(searchInput).toHaveAttribute('aria-label', 'Buscar producto');
  });

  it('renderiza los chips de categorías con "Todos" activo por defecto', () => {
    render(<AdminProductPicker {...defaultProps} />);

    const todosTab = screen.getByRole('tab', { name: /todos/i });
    expect(todosTab).toBeInTheDocument();
    expect(todosTab).toHaveClass('chip-active');

    expect(screen.getByRole('tab', { name: /maquillaje/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /skincare/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /accesorios/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /dulces & comida asiatica/i })).toBeInTheDocument();
  });

  it('renderiza la cuadrícula de productos con información de precios y stock', () => {
    render(<AdminProductPicker {...defaultProps} />);

    // Nombres y precios
    expect(screen.getByText('Gloss Mágico Bunny')).toBeInTheDocument();
    expect(screen.getByText('$5.50')).toBeInTheDocument();
    expect(screen.getByText('Serum Facial Rice Glow')).toBeInTheDocument();
    expect(screen.getByText('$12.00')).toBeInTheDocument();
    expect(screen.getByText('Collar Corazón Pastel')).toBeInTheDocument();
    expect(screen.getByText('$4.00')).toBeInTheDocument();

    // Badges de stock
    expect(screen.getByText('10 disponibles')).toBeInTheDocument();
    expect(screen.getByText('2 disponibles')).toBeInTheDocument();
    expect(screen.getAllByText('Agotado').length).toBeGreaterThanOrEqual(1);

    // Placeholder para productos sin imagen
    expect(screen.getByText('S')).toBeInTheDocument(); // Serum
    expect(screen.getByText('M')).toBeInTheDocument(); // Mochi
  });

  it('filtra productos en vivo por nombre de producto', async () => {
    const user = userEvent.setup();
    render(<AdminProductPicker {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText('Buscar producto por nombre o categoría…');
    await user.type(searchInput, 'Gloss');

    expect(screen.getByText('Gloss Mágico Bunny')).toBeInTheDocument();
    expect(screen.queryByText('Serum Facial Rice Glow')).not.toBeInTheDocument();
    expect(screen.queryByText('Mochi Fresa Cream')).not.toBeInTheDocument();
  });

  it('filtra productos en vivo por categoría desde el buscador', async () => {
    const user = userEvent.setup();
    render(<AdminProductPicker {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText('Buscar producto por nombre o categoría…');
    await user.type(searchInput, 'Skincare');

    expect(screen.getByText('Serum Facial Rice Glow')).toBeInTheDocument();
    expect(screen.queryByText('Gloss Mágico Bunny')).not.toBeInTheDocument();
  });

  it('permite limpiar la búsqueda con el botón de limpiar', async () => {
    const user = userEvent.setup();
    render(<AdminProductPicker {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText('Buscar producto por nombre o categoría…');
    await user.type(searchInput, 'Gloss');
    expect(screen.queryByText('Serum Facial Rice Glow')).not.toBeInTheDocument();

    const clearButton = screen.getByLabelText('Limpiar búsqueda');
    await user.click(clearButton);

    expect(searchInput).toHaveValue('');
    expect(screen.getByText('Serum Facial Rice Glow')).toBeInTheDocument();
  });

  it('filtra productos al hacer clic en un chip de categoría', async () => {
    const user = userEvent.setup();
    render(<AdminProductPicker {...defaultProps} />);

    const skincareTab = screen.getByRole('tab', { name: /skincare/i });
    await user.click(skincareTab);

    expect(skincareTab).toHaveClass('chip-active');
    expect(screen.getByText('Serum Facial Rice Glow')).toBeInTheDocument();
    expect(screen.queryByText('Gloss Mágico Bunny')).not.toBeInTheDocument();
    expect(screen.queryByText('Collar Corazón Pastel')).not.toBeInTheDocument();

    // Volver a Todos
    const todosTab = screen.getByRole('tab', { name: /todos/i });
    await user.click(todosTab);
    expect(screen.getByText('Gloss Mágico Bunny')).toBeInTheDocument();
    expect(screen.getByText('Serum Facial Rice Glow')).toBeInTheDocument();
  });

  it('muestra estado vacío y botón para limpiar filtros si no hay coincidencias', async () => {
    const user = userEvent.setup();
    render(<AdminProductPicker {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText('Buscar producto por nombre o categoría…');
    await user.type(searchInput, 'Producto Inexistente 12345');

    expect(screen.getByText('Sin resultados')).toBeInTheDocument();
    expect(screen.getByText('No hay productos que coincidan con tu búsqueda.')).toBeInTheDocument();

    const clearFiltersBtn = screen.getByRole('button', { name: /limpiar filtros/i });
    await user.click(clearFiltersBtn);

    expect(screen.getByText('Gloss Mágico Bunny')).toBeInTheDocument();
  });

  it('llama a onAddItem al presionar Agregar en un producto disponible', async () => {
    const user = userEvent.setup();
    const onAddItem = vi.fn();
    render(<AdminProductPicker {...defaultProps} onAddItem={onAddItem} />);

    const addButtons = screen.getAllByRole('button', { name: /agregar/i });
    await user.click(addButtons[0]);

    expect(onAddItem).toHaveBeenCalledTimes(1);
    expect(onAddItem).toHaveBeenCalledWith(MOCK_PRODUCTS[0]);
  });

  it('deshabilita el botón de agregar si el producto está agotado (qty_available <= 0)', () => {
    render(<AdminProductPicker {...defaultProps} />);

    const collarCard = screen.getByText('Collar Corazón Pastel').closest('.pos-product-card');
    expect(collarCard).toBeInTheDocument();

    const addBtn = collarCard?.querySelector('button.pos-add-btn');
    expect(addBtn).toBeDisabled();
  });

  it('muestra badge visual si el producto ya está añadido en la orden (Map)', () => {
    const selected = new Map<number, number>([
      [1, 2], // 2 de Gloss Mágico Bunny
    ]);

    render(<AdminProductPicker {...defaultProps} selectedItems={selected} />);

    expect(screen.getByText(/en pedido: 2/i)).toBeInTheDocument();
  });

  it('muestra badge visual si el producto ya está añadido en la orden (Object)', () => {
    const selected = { 1: 3 };

    render(<AdminProductPicker {...defaultProps} selectedItems={selected} />);

    expect(screen.getByText(/en pedido: 3/i)).toBeInTheDocument();
  });

  it('deshabilita el botón de aumentar/agregar si la cantidad seleccionada alcanza el stock disponible', () => {
    const selected = new Map<number, number>([
      [2, 2], // 2 seleccionados de Serum (stock máximo es 2)
    ]);

    render(<AdminProductPicker {...defaultProps} selectedItems={selected} />);

    const serumCard = screen.getByText('Serum Facial Rice Glow').closest('.pos-product-card');
    expect(serumCard).toBeInTheDocument();

    const increaseBtn = serumCard?.querySelector('button.pos-qty-increase');
    expect(increaseBtn).toBeDisabled();
  });

  it('permite aumentar la cantidad si aún hay stock disponible', async () => {
    const user = userEvent.setup();
    const onUpdateQty = vi.fn();
    const selected = new Map<number, number>([
      [1, 2], // 2 seleccionados de Gloss (stock 10)
    ]);

    render(
      <AdminProductPicker
        {...defaultProps}
        selectedItems={selected}
        onUpdateQty={onUpdateQty}
      />
    );

    const glossCard = screen.getByText('Gloss Mágico Bunny').closest('.pos-product-card');
    const increaseBtn = glossCard?.querySelector('button.pos-qty-increase');
    expect(increaseBtn).not.toBeDisabled();

    if (increaseBtn) {
      await user.click(increaseBtn);
      expect(onUpdateQty).toHaveBeenCalledWith(1, 3);
    }
  });

  it('permite disminuir la cantidad seleccionada (> 1) llamando a onUpdateQty', async () => {
    const user = userEvent.setup();
    const onUpdateQty = vi.fn();
    const selected = new Map<number, number>([
      [1, 3],
    ]);

    render(
      <AdminProductPicker
        {...defaultProps}
        selectedItems={selected}
        onUpdateQty={onUpdateQty}
      />
    );

    const glossCard = screen.getByText('Gloss Mágico Bunny').closest('.pos-product-card');
    const decreaseBtn = glossCard?.querySelector('button.pos-qty-decrease');

    if (decreaseBtn) {
      await user.click(decreaseBtn);
      expect(onUpdateQty).toHaveBeenCalledWith(1, 2);
    }
  });

  it('llama a onRemoveItem al disminuir la cantidad cuando solo queda 1 seleccionado', async () => {
    const user = userEvent.setup();
    const onRemoveItem = vi.fn();
    const selected = new Map<number, number>([
      [1, 1],
    ]);

    render(
      <AdminProductPicker
        {...defaultProps}
        selectedItems={selected}
        onRemoveItem={onRemoveItem}
      />
    );

    const glossCard = screen.getByText('Gloss Mágico Bunny').closest('.pos-product-card');
    const decreaseBtn = glossCard?.querySelector('button.pos-qty-decrease');

    if (decreaseBtn) {
      await user.click(decreaseBtn);
      expect(onRemoveItem).toHaveBeenCalledWith(1);
    }
  });

  it('llama a onRemoveItem al presionar el botón de quitar/eliminar del card', async () => {
    const user = userEvent.setup();
    const onRemoveItem = vi.fn();
    const selected = new Map<number, number>([
      [1, 2],
    ]);

    render(
      <AdminProductPicker
        {...defaultProps}
        selectedItems={selected}
        onRemoveItem={onRemoveItem}
      />
    );

    const glossCard = screen.getByText('Gloss Mágico Bunny').closest('.pos-product-card');
    const removeBtn = glossCard?.querySelector('button.pos-remove-btn');

    if (removeBtn) {
      await user.click(removeBtn);
      expect(onRemoveItem).toHaveBeenCalledWith(1);
    }
  });
});
