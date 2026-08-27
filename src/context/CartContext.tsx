/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback, useEffect, useMemo, type ReactNode } from 'react';
import type { Product, CartItem } from '../types';
import { loadCart, saveCart } from '../store/localStore';

interface CartContextType {
  items: CartItem[];
  itemCount: number;
  total: number;
  addItem: (product: Product, qty?: number) => void;
  updateQuantity: (productId: number, qty: number) => void;
  removeItem: (productId: number) => void;
  clearCart: () => void;
  reconcileStock: (products: Product[]) => StockAdjustment[];
}

import type { StockAdjustment, StockAdjustmentType } from '../utils/stock';
export type { StockAdjustment, StockAdjustmentType };

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(loadCart);

  // Persist every cart change to localStorage.
  useEffect(() => {
    saveCart(items);
  }, [items]);

  const addItem = useCallback((product: Product, qty = 1) => {
    setItems(prev => {
      const existing = prev.find(i => i.product.product_id === product.product_id);
      if (existing) {
        const newQty = Math.min(existing.quantity + qty, product.qty_available);
        return prev.map(i =>
          i.product.product_id === product.product_id
            ? { ...i, quantity: newQty }
            : i
        );
      }
      return [...prev, { product, quantity: Math.min(qty, product.qty_available) }];
    });
  }, []);

  const updateQuantity = useCallback((productId: number, qty: number) => {
    if (qty <= 0) {
      setItems(prev => prev.filter(i => i.product.product_id !== productId));
      return;
    }
    setItems(prev =>
      prev.map(i =>
        i.product.product_id === productId
          ? { ...i, quantity: Math.min(qty, i.product.qty_available) }
          : i
      ),
    );
  }, []);

  const removeItem = useCallback((productId: number) => {
    setItems(prev => prev.filter(i => i.product.product_id !== productId));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  // Reconciles every cart line against fresh catalog data in ONE state
  // update: clamps quantities down to the real stock and drops lines whose
  // product is gone or out of stock. Returns what changed (empty = no-op).
  const reconcileStock = useCallback(
    (products: Product[]): StockAdjustment[] => {
      const byId = new Map(products.map(p => [p.product_id, p]));
      const adjustments: StockAdjustment[] = [];
      let changed = false;
      const next: CartItem[] = [];

      for (const item of items) {
        const { product, quantity } = item;
        const { product_id, product_name } = product;
        const fresh = byId.get(product_id);
        if (!fresh || !fresh.in_stock || fresh.qty_available <= 0) {
          adjustments.push({
            productId: product_id,
            productName: product_name,
            type: 'removed',
          });
          changed = true;
          continue;
        }
        if (quantity > fresh.qty_available) {
          adjustments.push({
            productId: product_id,
            productName: product_name,
            type: 'clamped',
            previousQty: quantity,
            newQty: fresh.qty_available,
          });
          next.push({ ...item, quantity: fresh.qty_available });
          changed = true;
          continue;
        }
        next.push(item);
      }

      if (changed) setItems(next);
      return adjustments;
    },
    [items],
  );

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const total = items.reduce(
    (sum, i) => sum + Number(i.product.product_price) * i.quantity,
    0,
  );

  const contextValue = useMemo<CartContextType>(
    () => ({
      items,
      itemCount,
      total,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
      reconcileStock,
    }),
    [items, itemCount, total, addItem, updateQuantity, removeItem, clearCart, reconcileStock],
  );

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextType {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
}
