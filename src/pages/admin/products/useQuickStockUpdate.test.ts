import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useQuickStockUpdate, QUICK_STOCK_DEBOUNCE_MS } from './useQuickStockUpdate';
import { updateProduct } from '../../../api/products';
import type { Product } from '../../../types';

vi.mock('../../../api/products', () => ({
  updateProduct: vi.fn(),
}));

const mockUpdateProduct = vi.mocked(updateProduct);

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    product_id: 1,
    product_name: 'Bálsamo Fresa',
    product_price: '5.00',
    product_description: 'Bálsamo kawaii',
    category: 'Maquillaje',
    qty_available: 10,
    in_stock: true,
    ...overrides,
  };
}

describe('useQuickStockUpdate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockUpdateProduct.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('actualiza optimísticamente cantidad e in_stock de forma inmediata y agrupa clics rápidos en un solo PATCH', async () => {
    const auth = { getToken: vi.fn(async () => 'tok-123') };
    const onToast = vi.fn();
    const product = makeProduct({ product_id: 1, qty_available: 10, in_stock: true });

    mockUpdateProduct.mockResolvedValue({
      ok: true,
      data: makeProduct({ product_id: 1, qty_available: 13, in_stock: true }),
    });

    const { result } = renderHook(() =>
      useQuickStockUpdate({ products: [product], auth, onToast }),
    );

    act(() => {
      result.current.adjustStock(result.current.displayProducts[0], 1);
      result.current.adjustStock(result.current.displayProducts[0], 1);
      result.current.adjustStock(result.current.displayProducts[0], 1);
    });

    expect(result.current.displayProducts[0].qty_available).toBe(13);
    expect(result.current.adjustedIds.has(1)).toBe(true);
    expect(mockUpdateProduct).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(QUICK_STOCK_DEBOUNCE_MS);
    });

    expect(mockUpdateProduct).toHaveBeenCalledTimes(1);
    expect(mockUpdateProduct).toHaveBeenCalledWith(1, { qty_available: 13 }, auth);
    expect(onToast).toHaveBeenCalledWith('Stock actualizado: 13');
    expect(result.current.savingIds.has(1)).toBe(false);
  });

  it('actualiza in_stock optimísticamente al pasar de 0 a 1 y de 1 a 0', () => {
    const onToast = vi.fn();
    const outProduct = makeProduct({ product_id: 2, qty_available: 0, in_stock: false });

    const { result } = renderHook(() =>
      useQuickStockUpdate({ products: [outProduct], onToast }),
    );

    act(() => {
      result.current.adjustStock(result.current.displayProducts[0], 1);
    });
    expect(result.current.displayProducts[0].qty_available).toBe(1);
    expect(result.current.displayProducts[0].in_stock).toBe(true);

    act(() => {
      result.current.adjustStock(result.current.displayProducts[0], -1);
    });
    expect(result.current.displayProducts[0].qty_available).toBe(0);
    expect(result.current.displayProducts[0].in_stock).toBe(false);
  });

  it('no permite bajar de 0 y no agenda llamadas PATCH en cero', async () => {
    const onToast = vi.fn();
    const product = makeProduct({ product_id: 3, qty_available: 0, in_stock: false });

    const { result } = renderHook(() =>
      useQuickStockUpdate({ products: [product], onToast }),
    );

    act(() => {
      result.current.adjustStock(result.current.displayProducts[0], -1);
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(QUICK_STOCK_DEBOUNCE_MS);
    });

    expect(result.current.displayProducts[0].qty_available).toBe(0);
    expect(mockUpdateProduct).not.toHaveBeenCalled();
    expect(onToast).not.toHaveBeenCalled();
  });

  it('cancela la petición si se vuelve a la cantidad original antes del debounce y preserva el in_stock previo', async () => {
    const onToast = vi.fn();
    const product = makeProduct({ product_id: 4, qty_available: 5, in_stock: false });

    const { result } = renderHook(() =>
      useQuickStockUpdate({ products: [product], onToast }),
    );

    act(() => {
      result.current.adjustStock(result.current.displayProducts[0], 1);
      result.current.adjustStock(result.current.displayProducts[0], -1);
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(QUICK_STOCK_DEBOUNCE_MS);
    });

    expect(mockUpdateProduct).not.toHaveBeenCalled();
    expect(onToast).not.toHaveBeenCalled();
    expect(result.current.displayProducts[0].qty_available).toBe(5);
    expect(result.current.displayProducts[0].in_stock).toBe(false);
  });

  it('revierte cantidad e in_stock y muestra toast si updateProduct falla con { ok: false } o lanza error', async () => {
    const onToast = vi.fn();
    const product = makeProduct({ product_id: 5, qty_available: 0, in_stock: false });

    mockUpdateProduct.mockResolvedValueOnce({
      ok: false,
      message: 'Sin conexión al servidor',
    });

    const { result } = renderHook(() =>
      useQuickStockUpdate({ products: [product], onToast }),
    );

    act(() => {
      result.current.adjustStock(result.current.displayProducts[0], 1);
    });
    expect(result.current.displayProducts[0].qty_available).toBe(1);
    expect(result.current.displayProducts[0].in_stock).toBe(true);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(QUICK_STOCK_DEBOUNCE_MS);
    });

    expect(result.current.displayProducts[0].qty_available).toBe(0);
    expect(result.current.displayProducts[0].in_stock).toBe(false);
    expect(onToast).toHaveBeenCalledWith('Sin conexión al servidor');
    expect(result.current.savingIds.has(5)).toBe(false);

    mockUpdateProduct.mockRejectedValueOnce(new Error('Network crash'));

    act(() => {
      result.current.adjustStock(result.current.displayProducts[0], 1);
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(QUICK_STOCK_DEBOUNCE_MS);
    });

    expect(result.current.displayProducts[0].qty_available).toBe(0);
    expect(result.current.displayProducts[0].in_stock).toBe(false);
    expect(onToast).toHaveBeenCalledWith('No se pudo actualizar el stock');
    expect(result.current.savingIds.has(5)).toBe(false);
  });

  it('mantiene savingIds activo mientras la petición está en curso y permite limpiar pines y overrides', async () => {
    const onToast = vi.fn();
    const product = makeProduct({ product_id: 6, qty_available: 2, in_stock: true });
    let resolveRequest!: (val: { ok: true; data: Product }) => void;

    mockUpdateProduct.mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = resolve;
      }),
    );

    const { result } = renderHook(() =>
      useQuickStockUpdate({ products: [product], onToast }),
    );

    act(() => {
      result.current.adjustStock(result.current.displayProducts[0], 1);
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(QUICK_STOCK_DEBOUNCE_MS);
    });

    expect(result.current.savingIds.has(6)).toBe(true);
    expect(result.current.adjustedIds.has(6)).toBe(true);

    await act(async () => {
      resolveRequest({ ok: true, data: makeProduct({ product_id: 6, qty_available: 3, in_stock: true }) });
    });

    expect(result.current.savingIds.has(6)).toBe(false);
    expect(result.current.displayProducts[0].qty_available).toBe(3);

    act(() => {
      result.current.clearAdjustedPins();
    });
    expect(result.current.adjustedIds.size).toBe(0);

    act(() => {
      result.current.resetOverrides();
    });
    expect(result.current.displayProducts[0].qty_available).toBe(2);
  });

  it('no sobreescribe un nuevo toque optimista hecho mientras un PATCH anterior está en vuelo', async () => {
    const onToast = vi.fn();
    const product = makeProduct({ product_id: 7, qty_available: 1, in_stock: true });
    let resolveFirst!: (val: { ok: true; data: Product }) => void;

    mockUpdateProduct
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveFirst = resolve;
        }),
      )
      .mockResolvedValueOnce({
        ok: true,
        data: makeProduct({ product_id: 7, qty_available: 3, in_stock: true }),
      });

    const { result } = renderHook(() =>
      useQuickStockUpdate({ products: [product], onToast }),
    );

    // First tap: 1 -> 2, wait for debounce so request #1 is in flight
    act(() => {
      result.current.adjustStock(result.current.displayProducts[0], 1);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(QUICK_STOCK_DEBOUNCE_MS);
    });
    expect(mockUpdateProduct).toHaveBeenCalledTimes(1);

    // Second tap while request #1 is still in flight: 2 -> 3
    act(() => {
      result.current.adjustStock(result.current.displayProducts[0], 1);
    });
    expect(result.current.displayProducts[0].qty_available).toBe(3);

    // Resolve request #1 (qty 2) — must NOT clobber display back to 2
    await act(async () => {
      resolveFirst({ ok: true, data: makeProduct({ product_id: 7, qty_available: 2, in_stock: true }) });
    });
    expect(result.current.displayProducts[0].qty_available).toBe(3);

    // Advance timer for request #2 (qty 3)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(QUICK_STOCK_DEBOUNCE_MS);
    });
    expect(mockUpdateProduct).toHaveBeenCalledTimes(2);
    expect(mockUpdateProduct).toHaveBeenLastCalledWith(7, { qty_available: 3 }, undefined);
    expect(result.current.displayProducts[0].qty_available).toBe(3);
  });
});
