import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import ProductManagementPage from './ProductManagementPage';
import { fetchAllProducts, updateProduct } from '../../../api/products';
import { exportProductsToCsv } from '../../../utils/exportProducts';
import { AdminAuthContext } from '../../../components/auth/AdminAuthContext';
import type { Product } from '../../../types';

vi.mock('../../../api/products', () => ({
  fetchAllProducts: vi.fn(),
  archiveProduct: vi.fn(),
  updateProduct: vi.fn(),
}));

vi.mock('../../../utils/exportProducts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../utils/exportProducts')>();
  return {
    ...actual,
    exportProductsToCsv: vi.fn(),
  };
});

const mockFetchAllProducts = vi.mocked(fetchAllProducts);
const mockExportProductsToCsv = vi.mocked(exportProductsToCsv);
const mockUpdateProduct = vi.mocked(updateProduct);

const MOCK_PRODUCTS: Product[] = [
  {
    product_id: 1,
    product_name: 'Bálsamo Labial Fresa',
    product_price: '3.50',
    product_description: 'Hidratante con aroma a fresa',
    qty_available: 10,
    in_stock: true,
    category: 'Maquillaje',
  },
  {
    product_id: 2,
    product_name: 'Serum Facial Centella',
    product_price: '12.00',
    product_description: 'Calmante para la piel',
    qty_available: 2,
    in_stock: true,
    category: 'Skincare',
  },
  {
    product_id: 3,
    product_name: 'Mochi Dulce Matcha',
    product_price: '4.00',
    product_description: 'Delicioso mochi artesanal',
    qty_available: 3,
    in_stock: true,
    category: 'Dulces & Comida Asiatica',
  },
  {
    product_id: 4,
    product_name: 'Pin Kawaii Bunny',
    product_price: '2.50',
    product_description: 'Pin metálico esmaltado',
    qty_available: 0,
    in_stock: false,
    category: 'Pines & Chapas',
  },
  {
    product_id: 5,
    product_name: 'Lentes Contacto Rosa',
    product_price: '15.00',
    product_description: 'Lentes cosméticos',
    qty_available: 5,
    in_stock: false,
    category: 'Lentes de Contacto',
  },
];

function renderPage(initialEntries: string[] = ['/tokki-admin/products']) {
  return render(
    <AdminAuthContext.Provider
      value={{
        configured: true,
        isLoaded: true,
        isSignedIn: true,
        role: 'owner',
        getAdminToken: async () => 'clerk-token',
      }}
    >
      <MemoryRouter initialEntries={initialEntries}>
        <ProductManagementPage />
      </MemoryRouter>
    </AdminAuthContext.Provider>,
  );
}

beforeEach(() => {
  mockFetchAllProducts.mockReset();
  mockFetchAllProducts.mockResolvedValue(MOCK_PRODUCTS);
  mockExportProductsToCsv.mockReset();
  mockUpdateProduct.mockReset();
});

describe('ProductManagementPage — Low Stock Quick-Filter y Query Params', () => {
  it('renderiza todos los productos por defecto', async () => {
    renderPage();

    expect(await screen.findByText('Bálsamo Labial Fresa')).toBeInTheDocument();
    expect(screen.getByText('Serum Facial Centella')).toBeInTheDocument();
    expect(screen.getByText('Mochi Dulce Matcha')).toBeInTheDocument();
    expect(screen.getByText('Pin Kawaii Bunny')).toBeInTheDocument();
    expect(screen.getByText('Lentes Contacto Rosa')).toBeInTheDocument();
  });

  it('inicializa con el filtro de alertas combinadas cuando la URL tiene ?stock=alert', async () => {
    renderPage(['/tokki-admin/products?stock=alert']);

    expect(await screen.findByText('Serum Facial Centella')).toBeInTheDocument();
    expect(screen.getByText('Mochi Dulce Matcha')).toBeInTheDocument();
    expect(screen.getByText('Pin Kawaii Bunny')).toBeInTheDocument();
    expect(screen.getByText('Lentes Contacto Rosa')).toBeInTheDocument();

    expect(screen.queryByText('Bálsamo Labial Fresa')).not.toBeInTheDocument();
  });

  it('abre automáticamente el modal de edición cuando la URL tiene ?edit=<id> y limpia el parámetro al cerrar', async () => {
    const user = userEvent.setup();
    renderPage(['/tokki-admin/products?edit=2']);

    expect(await screen.findByText('Editar Producto')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Serum Facial Centella')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /cerrar modal/i }));
    expect(screen.queryByText('Editar Producto')).not.toBeInTheDocument();
  });

  it('no abre ningún modal si ?edit=<id> apunta a un producto inexistente', async () => {
    renderPage(['/tokki-admin/products?edit=999']);

    await screen.findByText('Bálsamo Labial Fresa');
    expect(screen.queryByText('Editar Producto')).not.toBeInTheDocument();
  });

  it('abre automáticamente el modal Nuevo Producto cuando la URL tiene ?new=1 y lo cierra al salir', async () => {
    const user = userEvent.setup();
    renderPage(['/tokki-admin/products?new=1']);

    expect(await screen.findByText('Nuevo Producto')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /cerrar modal/i }));
    expect(screen.queryByText('Nuevo Producto')).not.toBeInTheDocument();
  });

  it('inicializa con el filtro de bajo stock cuando la URL tiene ?stock=low', async () => {
    renderPage(['/tokki-admin/products?stock=low']);

    expect(await screen.findByText('Serum Facial Centella')).toBeInTheDocument();
    expect(screen.getByText('Mochi Dulce Matcha')).toBeInTheDocument();

    expect(screen.queryByText('Bálsamo Labial Fresa')).not.toBeInTheDocument();
    expect(screen.queryByText('Pin Kawaii Bunny')).not.toBeInTheDocument();
    expect(screen.queryByText('Lentes Contacto Rosa')).not.toBeInTheDocument();
  });

  it('inicializa con el filtro de agotados cuando la URL tiene ?stock=out', async () => {
    renderPage(['/tokki-admin/products?stock=out']);

    expect(await screen.findByText('Pin Kawaii Bunny')).toBeInTheDocument();
    expect(screen.getByText('Lentes Contacto Rosa')).toBeInTheDocument();

    expect(screen.queryByText('Bálsamo Labial Fresa')).not.toBeInTheDocument();
    expect(screen.queryByText('Serum Facial Centella')).not.toBeInTheDocument();
    expect(screen.queryByText('Mochi Dulce Matcha')).not.toBeInTheDocument();
  });

  it('inicializa con el filtro de en stock cuando la URL tiene ?stock=in', async () => {
    renderPage(['/tokki-admin/products?stock=in']);

    expect(await screen.findByText('Bálsamo Labial Fresa')).toBeInTheDocument();
    expect(screen.getByText('Serum Facial Centella')).toBeInTheDocument();
    expect(screen.getByText('Mochi Dulce Matcha')).toBeInTheDocument();

    expect(screen.queryByText('Pin Kawaii Bunny')).not.toBeInTheDocument();
    expect(screen.queryByText('Lentes Contacto Rosa')).not.toBeInTheDocument();
  });

  it('permite filtrar por bajo stock al hacer clic en el botón de la barra', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('Bálsamo Labial Fresa')).toBeInTheDocument();

    const lowStockBtn = screen.getByRole('button', { name: /bajo stock/i });
    await user.click(lowStockBtn);

    expect(screen.getByText('Serum Facial Centella')).toBeInTheDocument();
    expect(screen.getByText('Mochi Dulce Matcha')).toBeInTheDocument();
    expect(screen.queryByText('Bálsamo Labial Fresa')).not.toBeInTheDocument();
    expect(screen.queryByText('Pin Kawaii Bunny')).not.toBeInTheDocument();
  });

  it('restablece el filtro al hacer clic en Limpiar filtros', async () => {
    const user = userEvent.setup();
    renderPage(['/tokki-admin/products?stock=low']);

    expect(await screen.findByText('Serum Facial Centella')).toBeInTheDocument();
    expect(screen.queryByText('Bálsamo Labial Fresa')).not.toBeInTheDocument();

    const searchInput = screen.getByLabelText('Buscar producto');
    await user.type(searchInput, 'inexistente_123');

    const clearFiltersBtn = await screen.findByRole('button', { name: /limpiar filtros/i });
    await user.click(clearFiltersBtn);

    expect(await screen.findByText('Bálsamo Labial Fresa')).toBeInTheDocument();
    expect(screen.getByText('Pin Kawaii Bunny')).toBeInTheDocument();
  });

  it('renderiza el botón de exportar CSV habilitado y ejecuta exportProductsToCsv con productos filtrados', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Bálsamo Labial Fresa');
    const exportBtn = screen.getByRole('button', { name: /exportar productos a csv/i });
    expect(exportBtn).toBeInTheDocument();
    expect(exportBtn).toBeEnabled();

    // Clic en exportar sin filtros (debe exportar todos los productos,
    // ordenados de más reciente a más antiguo por defecto)
    await user.click(exportBtn);
    expect(mockExportProductsToCsv).toHaveBeenCalledTimes(1);
    expect(mockExportProductsToCsv).toHaveBeenCalledWith([
      MOCK_PRODUCTS[4],
      MOCK_PRODUCTS[3],
      MOCK_PRODUCTS[2],
      MOCK_PRODUCTS[1],
      MOCK_PRODUCTS[0],
    ]);

    // Filtrar por bajo stock
    const lowStockBtn = screen.getByRole('button', { name: /bajo stock/i });
    await user.click(lowStockBtn);

    // Exportar nuevamente (solo productos con bajo stock: Mochi y Serum)
    await user.click(exportBtn);
    expect(mockExportProductsToCsv).toHaveBeenCalledTimes(2);
    expect(mockExportProductsToCsv).toHaveBeenLastCalledWith([MOCK_PRODUCTS[2], MOCK_PRODUCTS[1]]);
  });

  it('deshabilita el botón de exportar CSV cuando no hay productos coincidentes', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Bálsamo Labial Fresa');
    const exportBtn = screen.getByRole('button', { name: /exportar productos a csv/i });
    expect(exportBtn).toBeEnabled();

    const searchInput = screen.getByLabelText('Buscar producto');
    await user.type(searchInput, 'no_existe_nada_con_este_nombre');

    expect(exportBtn).toBeDisabled();
    expect(exportBtn).toHaveAttribute('title', 'No hay productos para exportar');
  });
});

describe('ProductManagementPage — Orden de productos', () => {
  function readCardNames(container: HTMLElement): string[] {
    return Array.from(
      container.querySelectorAll('.product-card-admin .product-name'),
    ).map(el => el.textContent);
  }

  it('ordena por más recientes por defecto', async () => {
    const { container } = renderPage();

    await screen.findByText('Bálsamo Labial Fresa');

    const names = readCardNames(container);
    expect(names).toEqual([
      'Lentes Contacto Rosa',
      'Pin Kawaii Bunny',
      'Mochi Dulce Matcha',
      'Serum Facial Centella',
      'Bálsamo Labial Fresa',
    ]);
  });

  it('ordena por más antiguos al seleccionar Más antiguos', async () => {
    const user = userEvent.setup();
    const { container } = renderPage();

    await screen.findByText('Bálsamo Labial Fresa');

    await user.selectOptions(screen.getByLabelText('Ordenar productos'), 'oldest');

    const names = readCardNames(container);
    expect(names[0]).toBe('Bálsamo Labial Fresa');
    expect(names).toEqual([
      'Bálsamo Labial Fresa',
      'Serum Facial Centella',
      'Mochi Dulce Matcha',
      'Pin Kawaii Bunny',
      'Lentes Contacto Rosa',
    ]);
  });

  it('ordena por mayor precio al seleccionar Precio: mayor a menor', async () => {
    const user = userEvent.setup();
    const { container } = renderPage();

    await screen.findByText('Bálsamo Labial Fresa');

    await user.selectOptions(screen.getByLabelText('Ordenar productos'), 'price-desc');

    const names = readCardNames(container);
    // Más caro: Lentes 15.00 → Serum 12.00 → Mochi 4.00 → Bálsamo 3.50 → Pin 2.50
    expect(names[0]).toBe('Lentes Contacto Rosa');
    expect(names).toEqual([
      'Lentes Contacto Rosa',
      'Serum Facial Centella',
      'Mochi Dulce Matcha',
      'Bálsamo Labial Fresa',
      'Pin Kawaii Bunny',
    ]);
  });

  it('ordena por nombre al seleccionar Nombre A–Z', async () => {
    const user = userEvent.setup();
    const { container } = renderPage();

    await screen.findByText('Bálsamo Labial Fresa');

    await user.selectOptions(screen.getByLabelText('Ordenar productos'), 'name');

    const names = readCardNames(container);
    expect(names[0]).toBe('Bálsamo Labial Fresa');
    expect(names).toEqual([
      'Bálsamo Labial Fresa',
      'Lentes Contacto Rosa',
      'Mochi Dulce Matcha',
      'Pin Kawaii Bunny',
      'Serum Facial Centella',
    ]);
  });

  it('restablece el orden al limpiar filtros', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Bálsamo Labial Fresa');

    await user.selectOptions(screen.getByLabelText('Ordenar productos'), 'oldest');

    // La búsqueda sin resultados muestra el estado vacío con el botón limpiar
    const searchInput = screen.getByLabelText('Buscar producto');
    await user.type(searchInput, 'inexistente_123');

    const clearFiltersBtn = await screen.findByRole('button', { name: /limpiar filtros/i });
    await user.click(clearFiltersBtn);

    expect(await screen.findByText('Bálsamo Labial Fresa')).toBeInTheDocument();
    expect(screen.getByLabelText('Ordenar productos')).toHaveValue('recent');
  });

  it('exporta el CSV respetando el orden seleccionado', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Bálsamo Labial Fresa');

    await user.selectOptions(screen.getByLabelText('Ordenar productos'), 'price-desc');

    const exportBtn = screen.getByRole('button', { name: /exportar productos a csv/i });
    await user.click(exportBtn);

    expect(mockExportProductsToCsv).toHaveBeenCalledTimes(1);
    // Lentes 15.00 → Serum 12.00 → Mochi 4.00 → Bálsamo 3.50 → Pin 2.50
    expect(mockExportProductsToCsv).toHaveBeenLastCalledWith([
      MOCK_PRODUCTS[4],
      MOCK_PRODUCTS[1],
      MOCK_PRODUCTS[2],
      MOCK_PRODUCTS[0],
      MOCK_PRODUCTS[3],
    ]);
  });
});

describe('ProductManagementPage — Stepper rápido de stock', () => {
  function getProductCard(name: string): HTMLElement {
    const heading = screen.getByText(name);
    const card = heading.closest('.product-card-admin');
    if (!card) throw new Error(`Card not found for ${name}`);
    return card as HTMLElement;
  }

  it('muestra botones - y + por tarjeta y deshabilita - cuando el stock es 0', async () => {
    renderPage();
    await screen.findByText('Pin Kawaii Bunny');

    const zeroCard = getProductCard('Pin Kawaii Bunny');
    expect(within(zeroCard).getByRole('button', { name: /disminuir stock de pin kawaii bunny/i })).toBeDisabled();
    expect(within(zeroCard).getByRole('button', { name: /aumentar stock de pin kawaii bunny/i })).toBeEnabled();
    expect(within(zeroCard).getByText('0')).toHaveClass('stock-stepper-value');

    const fullCard = getProductCard('Bálsamo Labial Fresa');
    expect(within(fullCard).getByRole('button', { name: /disminuir stock de bálsamo labial fresa/i })).toBeEnabled();
    expect(within(fullCard).getByText('10')).toHaveClass('stock-stepper-value');
  });

  it('etiqueta visiblemente el stepper como "Stock" en cada tarjeta', async () => {
    renderPage();
    await screen.findByText('Bálsamo Labial Fresa');

    const card = getProductCard('Bálsamo Labial Fresa');
    const label = within(card).getByText(/^stock$/i);
    expect(label).toHaveClass('stock-stepper-label');
    expect(label).toBeVisible();

    const group = within(card).getByRole('group', { name: /stock de bálsamo labial fresa/i });
    expect(group).toContainElement(within(card).getByText('10'));
    expect(within(card).getByText(/unidades/i)).toBeInTheDocument();
  });

  it('agrupa clics rápidos en + y envía un único updateProduct con toast de confirmación', async () => {
    const user = userEvent.setup();
    mockUpdateProduct.mockResolvedValue({
      ok: true,
      data: { ...MOCK_PRODUCTS[0], qty_available: 13, in_stock: true },
    });

    renderPage();
    await screen.findByText('Bálsamo Labial Fresa');

    const card = getProductCard('Bálsamo Labial Fresa');
    const plusBtn = within(card).getByRole('button', { name: /aumentar stock de bálsamo labial fresa/i });

    await user.click(plusBtn);
    await user.click(plusBtn);
    await user.click(plusBtn);

    expect(within(card).getByText('13')).toBeInTheDocument();

    await waitFor(() => {
      expect(mockUpdateProduct).toHaveBeenCalledTimes(1);
    });
    expect(mockUpdateProduct).toHaveBeenCalledWith(
      1,
      { qty_available: 13 },
      expect.objectContaining({ getToken: expect.any(Function) }),
    );
    expect(await screen.findByText('Stock actualizado: 13')).toBeInTheDocument();
  });

  it('mantiene visible un producto agotado al reabastecer en ?stock=out y limpia el anclaje al cambiar de filtro', async () => {
    const user = userEvent.setup();
    mockUpdateProduct.mockResolvedValue({
      ok: true,
      data: { ...MOCK_PRODUCTS[3], qty_available: 1, in_stock: true },
    });

    renderPage(['/tokki-admin/products?stock=out']);
    await screen.findByText('Pin Kawaii Bunny');

    const card = getProductCard('Pin Kawaii Bunny');
    expect(within(card).getByText('Agotado')).toBeInTheDocument();

    const plusBtn = within(card).getByRole('button', { name: /aumentar stock de pin kawaii bunny/i });
    await user.click(plusBtn);

    // Card remains visible under ?stock=out so user can keep tapping +, while Agotado ribbon clears immediately
    expect(screen.getByText('Pin Kawaii Bunny')).toBeInTheDocument();
    expect(within(card).queryByText('Agotado')).not.toBeInTheDocument();
    expect(within(card).getByText('1')).toBeInTheDocument();

    // Switching filters clears adjusted pins: switching to Todos then back to Agotados hides Pin Kawaii Bunny (now stock 1)
    await user.click(screen.getByRole('button', { name: /^todos$/i }));
    await user.click(screen.getByRole('button', { name: /^agotados$/i }));
    expect(screen.queryByText('Pin Kawaii Bunny')).not.toBeInTheDocument();
  });

  it('revierte el stock optimista y muestra el mensaje de error cuando updateProduct falla', async () => {
    const user = userEvent.setup();
    mockUpdateProduct.mockResolvedValue({
      ok: false,
      message: 'Error al guardar stock',
    });

    renderPage();
    await screen.findByText('Bálsamo Labial Fresa');

    const card = getProductCard('Bálsamo Labial Fresa');
    const plusBtn = within(card).getByRole('button', { name: /aumentar stock de bálsamo labial fresa/i });

    await user.click(plusBtn);
    expect(within(card).getByText('11')).toBeInTheDocument();

    expect(await screen.findByText('Error al guardar stock')).toBeInTheDocument();
    expect(within(card).getByText('10')).toBeInTheDocument();
  });
});

