import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { updateProduct } from '../../../api/products';
import type { Product } from '../../../types';

export const QUICK_STOCK_DEBOUNCE_MS = 400;

interface AdminAuthHandle {
  getToken?: () => Promise<string | null>;
}

interface StockSnapshot {
  qty_available: number;
  in_stock: boolean;
}

interface UseQuickStockUpdateOptions {
  products: Product[];
  auth?: AdminAuthHandle;
  onToast: (message: string) => void;
  debounceMs?: number;
}

function mergeStockOverrides(
  products: Product[],
  overrides: Record<number, StockSnapshot>,
): Product[] {
  const overrideKeys = Object.keys(overrides);
  if (overrideKeys.length === 0) return products;
  return products.map((product) => {
    const patch = overrides[product.product_id];
    return patch ? { ...product, ...patch } : product;
  });
}

function addProductToSet(prev: ReadonlySet<number>, productId: number): ReadonlySet<number> {
  if (prev.has(productId)) return prev;
  const next = new Set(prev);
  next.add(productId);
  return next;
}

function removeProductFromSet(prev: ReadonlySet<number>, productId: number): ReadonlySet<number> {
  if (!prev.has(productId)) return prev;
  const next = new Set(prev);
  next.delete(productId);
  return next;
}

function clearPendingTimer(timers: Map<number, number>, productId: number): void {
  const existing = timers.get(productId);
  if (existing !== undefined) {
    window.clearTimeout(existing);
    timers.delete(productId);
  }
}

/**
 * Optimistic debounced stock adjustment hook for the admin product grid.
 * Batches rapid taps per product into a single PATCH /products/:id request,
 * guards out-of-order responses, and rolls back to server state on failure.
 */
export function useQuickStockUpdate({
  products,
  auth,
  onToast,
  debounceMs = QUICK_STOCK_DEBOUNCE_MS,
}: UseQuickStockUpdateOptions) {
  const [stockOverrides, setStockOverrides] = useState<Record<number, StockSnapshot>>({});
  const [savingIds, setSavingIds] = useState<ReadonlySet<number>>(() => new Set());
  const [adjustedIds, setAdjustedIds] = useState<ReadonlySet<number>>(() => new Set());

  const overridesRef = useRef<Record<number, StockSnapshot>>({});
  const timersRef = useRef<Map<number, number>>(new Map());
  const committedRef = useRef<Map<number, StockSnapshot>>(new Map());
  const targetQtyRef = useRef<Map<number, number>>(new Map());
  const requestSeqRef = useRef<Map<number, number>>(new Map());
  const inFlightRef = useRef<Set<number>>(new Set());
  const mountedRef = useRef(true);

  const authRef = useRef(auth);
  const onToastRef = useRef(onToast);

  useEffect(() => {
    authRef.current = auth;
    onToastRef.current = onToast;
  }, [auth, onToast]);

  useEffect(() => {
    mountedRef.current = true;
    const timers = timersRef.current;
    return () => {
      mountedRef.current = false;
      for (const timerId of timers.values()) {
        window.clearTimeout(timerId);
      }
      timers.clear();
    };
  }, []);

  const setProductSnapshot = useCallback((productId: number, snapshot: StockSnapshot) => {
    const next = { ...overridesRef.current, [productId]: snapshot };
    overridesRef.current = next;
    if (mountedRef.current) {
      setStockOverrides(next);
    }
  }, []);

  const commitStock = useCallback(
    async (productId: number, qtyToSend: number) => {
      timersRef.current.delete(productId);
      const seq = (requestSeqRef.current.get(productId) ?? 0) + 1;
      requestSeqRef.current.set(productId, seq);

      inFlightRef.current.add(productId);
      if (mountedRef.current) {
        setSavingIds((prev) => addProductToSet(prev, productId));
      }

      try {
        const result = await updateProduct(
          productId,
          { qty_available: qtyToSend },
          authRef.current,
        );
        const isCurrentSeq = requestSeqRef.current.get(productId) === seq;
        const hasNewerTarget = targetQtyRef.current.get(productId) !== qtyToSend;

        if (!result.ok) {
          if (isCurrentSeq && !hasNewerTarget) {
            const baseline = committedRef.current.get(productId);
            committedRef.current.delete(productId);
            targetQtyRef.current.delete(productId);
            if (baseline) setProductSnapshot(productId, baseline);
            if (mountedRef.current) onToastRef.current(result.message);
          }
          return;
        }

        const serverQty = result.data?.qty_available ?? qtyToSend;
        const serverInStock = result.data?.in_stock ?? serverQty > 0;
        const confirmed: StockSnapshot = { qty_available: serverQty, in_stock: serverInStock };

        if (isCurrentSeq && hasNewerTarget) {
          committedRef.current.set(productId, confirmed);
          return;
        }

        if (isCurrentSeq) {
          committedRef.current.delete(productId);
          targetQtyRef.current.delete(productId);
          setProductSnapshot(productId, confirmed);
          if (mountedRef.current) onToastRef.current(`Stock actualizado: ${serverQty}`);
        }
      } catch {
        const isCurrentSeq = requestSeqRef.current.get(productId) === seq;
        const hasNewerTarget = targetQtyRef.current.get(productId) !== qtyToSend;
        if (isCurrentSeq && !hasNewerTarget) {
          const baseline = committedRef.current.get(productId);
          committedRef.current.delete(productId);
          targetQtyRef.current.delete(productId);
          if (baseline) setProductSnapshot(productId, baseline);
          if (mountedRef.current) onToastRef.current('No se pudo actualizar el stock');
        }
      } finally {
        if (requestSeqRef.current.get(productId) === seq) {
          inFlightRef.current.delete(productId);
          if (mountedRef.current) {
            setSavingIds((prev) => removeProductFromSet(prev, productId));
          }
        }
      }
    },
    [setProductSnapshot],
  );

  const adjustStock = useCallback(
    (product: Product, delta: -1 | 1) => {
      const productId = product.product_id;
      const latestKnown = overridesRef.current[productId];
      const baseSnapshot: StockSnapshot = latestKnown ?? {
        qty_available: product.qty_available,
        in_stock: product.in_stock,
      };
      const currentQty = targetQtyRef.current.get(productId) ?? baseSnapshot.qty_available;
      const nextQty = Math.max(0, currentQty + delta);
      if (nextQty === currentQty) return;

      const baseline = committedRef.current.get(productId) ?? baseSnapshot;
      committedRef.current.set(productId, baseline);

      setAdjustedIds((prev) => addProductToSet(prev, productId));
      clearPendingTimer(timersRef.current, productId);

      if (nextQty === baseline.qty_available && !inFlightRef.current.has(productId)) {
        committedRef.current.delete(productId);
        targetQtyRef.current.delete(productId);
        setProductSnapshot(productId, baseline);
        return;
      }

      targetQtyRef.current.set(productId, nextQty);
      setProductSnapshot(productId, {
        qty_available: nextQty,
        in_stock: nextQty > 0,
      });

      const timerId = window.setTimeout(() => {
        void commitStock(productId, nextQty);
      }, debounceMs);
      timersRef.current.set(productId, timerId);
    },
    [commitStock, debounceMs, setProductSnapshot],
  );

  const clearAdjustedPins = useCallback(() => {
    setAdjustedIds((prev) => (prev.size === 0 ? prev : new Set()));
  }, []);

  const resetOverrides = useCallback(() => {
    for (const timerId of timersRef.current.values()) {
      window.clearTimeout(timerId);
    }
    timersRef.current.clear();
    committedRef.current.clear();
    targetQtyRef.current.clear();
    inFlightRef.current.clear();
    overridesRef.current = {};
    setStockOverrides({});
    setSavingIds(new Set());
    setAdjustedIds(new Set());
  }, []);

  const displayProducts = useMemo(
    () => mergeStockOverrides(products, stockOverrides),
    [products, stockOverrides],
  );

  return {
    displayProducts,
    savingIds,
    adjustedIds,
    adjustStock,
    clearAdjustedPins,
    resetOverrides,
  };
}

export default useQuickStockUpdate;
