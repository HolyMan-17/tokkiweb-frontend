import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import BrowseFilters from './BrowseFilters';

describe('BrowseFilters', () => {
  it('renderiza la fila de filtros con los pills de stock y el select de orden', () => {
    render(
      <BrowseFilters
        stockOnly={false}
        onStockOnlyChange={vi.fn()}
        sort="recent"
        onSortChange={vi.fn()}
      />,
    );

    const filters = document.querySelector('.category-filters');
    expect(filters).not.toBeNull();

    const filtersLeft = filters?.querySelector('.filters-left');
    expect(filtersLeft).not.toBeNull();

    const pills = filtersLeft?.querySelectorAll('button.category-stock-pill');
    expect(pills).toHaveLength(2);
    expect(pills?.[0].textContent).toBe('Todos');
    expect(pills?.[1].textContent).toBe('En stock ✓');

    const select = screen.getByRole('combobox', { name: 'Ordenar productos' });
    expect(select).toHaveClass('sort-select');
    expect(filters?.querySelector('select.sort-select')).toBe(select);
  });

  it('expone las opciones de orden con sus valores y etiquetas', () => {
    render(
      <BrowseFilters
        stockOnly={false}
        onStockOnlyChange={vi.fn()}
        sort="recent"
        onSortChange={vi.fn()}
      />,
    );

    const options = screen.getAllByRole('option');
    expect(options.map(o => o.textContent)).toEqual([
      'Más recientes',
      'Precio: menor a mayor',
      'Precio: mayor a menor',
      'Nombre A–Z',
    ]);
    expect(options.map(o => (o as HTMLOptionElement).value)).toEqual([
      'recent',
      'price-asc',
      'price-desc',
      'name',
    ]);
  });

  it('marca como activo el pill "Todos" cuando stockOnly es false', () => {
    render(
      <BrowseFilters
        stockOnly={false}
        onStockOnlyChange={vi.fn()}
        sort="recent"
        onSortChange={vi.fn()}
      />,
    );

    const [todos, enStock] = screen.getAllByRole('button');
    expect(todos).toHaveClass('category-stock-pill', 'active');
    expect(enStock).toHaveClass('category-stock-pill');
    expect(enStock).not.toHaveClass('active');
  });

  it('marca como activo el pill "En stock ✓" cuando stockOnly es true', () => {
    render(
      <BrowseFilters
        stockOnly
        onStockOnlyChange={vi.fn()}
        sort="recent"
        onSortChange={vi.fn()}
      />,
    );

    const [todos, enStock] = screen.getAllByRole('button');
    expect(todos).toHaveClass('category-stock-pill');
    expect(todos).not.toHaveClass('active');
    expect(enStock).toHaveClass('category-stock-pill', 'active');
  });

  it('notifica el cambio de filtro de stock a la página', async () => {
    const user = userEvent.setup();
    const onStockOnlyChange = vi.fn();

    render(
      <BrowseFilters
        stockOnly={false}
        onStockOnlyChange={onStockOnlyChange}
        sort="recent"
        onSortChange={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'En stock ✓' }));
    expect(onStockOnlyChange).toHaveBeenCalledWith(true);

    await user.click(screen.getByRole('button', { name: 'Todos' }));
    expect(onStockOnlyChange).toHaveBeenCalledWith(false);
  });

  it('notifica el cambio de orden a la página', async () => {
    const user = userEvent.setup();
    const onSortChange = vi.fn();

    render(
      <BrowseFilters
        stockOnly={false}
        onStockOnlyChange={vi.fn()}
        sort="recent"
        onSortChange={onSortChange}
      />,
    );

    const select = screen.getByRole('combobox', { name: 'Ordenar productos' });
    expect(select).toHaveValue('recent');

    await user.selectOptions(select, 'price-asc');
    expect(onSortChange).toHaveBeenCalledWith('price-asc');
  });
});
