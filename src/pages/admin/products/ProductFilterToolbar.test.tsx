import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import ProductFilterToolbar, { type StockFilter } from './ProductFilterToolbar';
import type { SortOption } from '../../../utils/productSort';

describe('ProductFilterToolbar', () => {
  const defaultProps = {
    search: '',
    category: 'Todos',
    stock: 'all' as StockFilter,
    sort: 'recent' as SortOption,
    filteredCount: 5,
    totalCount: 10,
    onSearchChange: vi.fn(),
    onCategoryChange: vi.fn(),
    onStockChange: vi.fn(),
    onSortChange: vi.fn(),
  };

  it('renderiza todos los botones de filtro de stock incluyendo Bajo stock (≤3)', () => {
    render(<ProductFilterToolbar {...defaultProps} />);

    expect(screen.getByRole('button', { name: 'Todos' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'En stock' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /bajo stock/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Agotados' })).toBeInTheDocument();
  });

  it('marca como activo el botón según la propiedad stock', () => {
    const { rerender } = render(<ProductFilterToolbar {...defaultProps} stock="low" />);
    const lowBtn = screen.getByRole('button', { name: /bajo stock/i });
    expect(lowBtn).toHaveClass('stock-pill-active');

    rerender(<ProductFilterToolbar {...defaultProps} stock="in" />);
    expect(screen.getByRole('button', { name: 'En stock' })).toHaveClass('stock-pill-active');

    rerender(<ProductFilterToolbar {...defaultProps} stock="out" />);
    expect(screen.getByRole('button', { name: 'Agotados' })).toHaveClass('stock-pill-active');
  });

  it('llama a onStockChange con "low" al hacer clic en Bajo stock', async () => {
    const user = userEvent.setup();
    const onStockChange = vi.fn();
    render(<ProductFilterToolbar {...defaultProps} onStockChange={onStockChange} />);

    const lowBtn = screen.getByRole('button', { name: /bajo stock/i });
    await user.click(lowBtn);

    expect(onStockChange).toHaveBeenCalledTimes(1);
    expect(onStockChange).toHaveBeenCalledWith('low');
  });

  it('llama a onSearchChange y permite limpiar la búsqueda', async () => {
    const user = userEvent.setup();
    const onSearchChange = vi.fn();
    const { rerender } = render(
      <ProductFilterToolbar {...defaultProps} search="" onSearchChange={onSearchChange} />
    );

    const input = screen.getByLabelText('Buscar producto');
    await user.type(input, 'labial');
    expect(onSearchChange).toHaveBeenCalled();

    rerender(
      <ProductFilterToolbar {...defaultProps} search="labial" onSearchChange={onSearchChange} />
    );
    const clearBtn = screen.getByLabelText('Limpiar búsqueda');
    await user.click(clearBtn);
    expect(onSearchChange).toHaveBeenCalledWith('');
  });

  it('llama a onCategoryChange al hacer clic en una categoría', async () => {
    const user = userEvent.setup();
    const onCategoryChange = vi.fn();
    render(<ProductFilterToolbar {...defaultProps} onCategoryChange={onCategoryChange} />);

    const catBtn = screen.getByRole('tab', { name: /maquillaje/i });
    await user.click(catBtn);

    expect(onCategoryChange).toHaveBeenCalledWith('Maquillaje');
  });

  it('muestra el selector de orden con las cinco opciones', () => {
    render(<ProductFilterToolbar {...defaultProps} />);

    const select = screen.getByLabelText('Ordenar productos');
    expect(select).toBeInTheDocument();
    expect(select).toHaveValue('recent');

    const optionLabels = within(select)
      .getAllByRole('option')
      .map(option => option.textContent);
    expect(optionLabels).toEqual([
      'Más recientes',
      'Más antiguos',
      'Precio: menor a mayor',
      'Precio: mayor a menor',
      'Nombre A–Z',
    ]);
  });

  it('llama a onSortChange al cambiar el orden', async () => {
    const user = userEvent.setup();
    const onSortChange = vi.fn();
    render(<ProductFilterToolbar {...defaultProps} onSortChange={onSortChange} />);

    const select = screen.getByLabelText('Ordenar productos');
    await user.selectOptions(select, 'price-desc');

    expect(onSortChange).toHaveBeenCalledTimes(1);
    expect(onSortChange).toHaveBeenCalledWith('price-desc');
  });

  it('llama a onSortChange con "oldest" al seleccionar Más antiguos', async () => {
    const user = userEvent.setup();
    const onSortChange = vi.fn();
    render(<ProductFilterToolbar {...defaultProps} onSortChange={onSortChange} />);

    const select = screen.getByLabelText('Ordenar productos');
    await user.selectOptions(select, 'oldest');

    expect(onSortChange).toHaveBeenCalledTimes(1);
    expect(onSortChange).toHaveBeenCalledWith('oldest');
  });
});
