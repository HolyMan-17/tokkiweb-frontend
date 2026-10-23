import { render, screen, act, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import ProductDetailPage from './ProductDetailPage';
import { CartProvider } from '../../context/CartContext';
import { fetchAllProducts } from '../../api/products';
import type { Product } from '../../types';

vi.mock('../../api/products', () => ({
  fetchAllProducts: vi.fn(),
}));

const mockFetchAllProducts = vi.mocked(fetchAllProducts);

const product: Product = {
  product_id: 1,
  product_name: 'Gloss Fresa',
  product_price: '49.99',
  product_description: 'Brillo labial kawaii de fresa',
  category: 'Maquillaje',
  qty_available: 5,
  in_stock: true,
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={[`/products/${product.product_id}`]}>
      <CartProvider>
        <Routes>
          <Route path="/products/:id" element={<ProductDetailPage />} />
        </Routes>
      </CartProvider>
    </MemoryRouter>,
  );
}

describe('ProductDetailPage — temporizador del toast', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
    vi.useFakeTimers();
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockFetchAllProducts.mockResolvedValue([product]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  async function renderAndLoad() {
    const utils = renderPage();
    // Flush the loader promise (microtasks run fine under fake timers).
    await act(async () => {});
    fireEvent.click(screen.getByRole('button', { name: /agregar al carrito/i }));
    return utils;
  }

  it('muestra el toast al agregar al carrito', async () => {
    await renderAndLoad();

    expect(screen.getByText(/agregado al carrito/i)).toBeInTheDocument();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('oculta el toast automáticamente tras ~3 segundos', async () => {
    await renderAndLoad();

    expect(screen.getByText(/agregado al carrito/i)).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.queryByText(/agregado al carrito/i)).not.toBeInTheDocument();
  });

  it('no deja ningún temporizador vivo tras desmontar con el toast visible', async () => {
    const { unmount } = await renderAndLoad();

    expect(screen.getByText(/agregado al carrito/i)).toBeInTheDocument();
    const scheduledBeforeUnmount = vi.getTimerCount();
    expect(scheduledBeforeUnmount).toBeGreaterThan(0);

    unmount();

    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('muestra la imagen del producto cuando tiene product_image_url', async () => {
    mockFetchAllProducts.mockResolvedValue([
      {
        ...product,
        product_image_url: 'https://example.com/photo.jpg',
      },
    ]);
    renderPage();
    await act(async () => {});

    const img = screen.getByRole('img', { name: 'Gloss Fresa' });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/photo.jpg');
    expect(img).toHaveClass('product-image');
  });

  it('muestra el placeholder con la inicial cuando no tiene product_image_url', async () => {
    mockFetchAllProducts.mockResolvedValue([product]);
    renderPage();
    await act(async () => {});

    expect(screen.queryByRole('img', { name: 'Gloss Fresa' })).not.toBeInTheDocument();
    expect(screen.getByText('G')).toBeInTheDocument();
    expect(screen.getByText('G')).toHaveClass('product-image-placeholder');
  });

  it('actualiza document.title con el nombre y precio del producto y lo restaura al desmontar', async () => {
    mockFetchAllProducts.mockResolvedValue([product]);
    const { unmount } = renderPage();
    await act(async () => {});

    expect(document.title).toBe('Gloss Fresa — $49.99 | Tokki Shop');
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      'https://www.tokkishopve.com/products/1',
    );
    expect(document.querySelector('meta[property="og:url"]')?.getAttribute('content')).toBe(
      'https://www.tokkishopve.com/products/1',
    );

    unmount();
    expect(document.title).toBe('Tokki Shop — Accesorios y Dulces Coreanos');
  });

  it('renderiza el botón de compartir con etiqueta accesible', async () => {
    mockFetchAllProducts.mockResolvedValue([product]);
    renderPage();
    await act(async () => {});

    const shareBtn = screen.getByRole('button', { name: /compartir gloss fresa/i });
    expect(shareBtn).toBeInTheDocument();
  });

  it('usa navigator.share cuando está disponible en el navegador', async () => {
    const shareMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', {
      value: shareMock,
      writable: true,
      configurable: true,
    });

    mockFetchAllProducts.mockResolvedValue([product]);
    renderPage();
    await act(async () => {});

    const shareBtn = screen.getByRole('button', { name: /compartir gloss fresa/i });
    await act(async () => {
      fireEvent.click(shareBtn);
    });

    expect(shareMock).toHaveBeenCalledTimes(1);
    expect(shareMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Gloss Fresa — $49.99 | Tokki Shop',
        url: expect.stringContaining('/products/1'),
      }),
    );
  });

  it('copia al portapapeles y muestra toast de feedback cuando navigator.share no existe', async () => {
    // Ensure navigator.share is undefined
    Object.defineProperty(navigator, 'share', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      writable: true,
      configurable: true,
    });

    mockFetchAllProducts.mockResolvedValue([product]);
    renderPage();
    await act(async () => {});

    const shareBtn = screen.getByRole('button', { name: /compartir gloss fresa/i });
    await act(async () => {
      fireEvent.click(shareBtn);
    });

    expect(writeTextMock).toHaveBeenCalledTimes(1);
    expect(writeTextMock).toHaveBeenCalledWith(expect.stringContaining('/products/1'));
    expect(screen.getByText(/enlace copiado al portapapeles/i)).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.queryByText(/enlace copiado al portapapeles/i)).not.toBeInTheDocument();
  });
});
