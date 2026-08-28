import { describe, it, expect, beforeEach } from 'vitest';
import { loadCart, saveCart } from './localStore';
import type { CartItem, Product } from '../types';

const testProduct: Product = {
  product_id: 101,
  product_name: 'Bálsamo Labial Test',
  product_price: '3.50',
  product_description: 'Test description',
  qty_available: 10,
  in_stock: true,
  category: 'Maquillaje',
};

describe('localStore — Cart persistence', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('returns empty array when no cart is in localStorage', () => {
    const cart = loadCart();
    expect(cart).toEqual([]);
  });

  it('persists and validates cart items across sessions', () => {
    const cartItem: CartItem = {
      product: testProduct,
      quantity: 2,
    };
    saveCart([cartItem]);
    const loadedCart = loadCart();
    expect(loadedCart.length).toBe(1);
    expect(loadedCart[0].quantity).toBe(2);
    expect(loadedCart[0].product.product_id).toBe(101);
    expect(loadedCart[0].product.product_name).toBe('Bálsamo Labial Test');
  });

  it('filters out invalid or corrupt cart items from localStorage', () => {
    window.localStorage.setItem('tokki_cart_v1', JSON.stringify([
      null,
      {},
      { product: { product_id: 'invalid' } },
      { product: testProduct, quantity: 3 },
    ]));
    const loadedCart = loadCart();
    expect(loadedCart.length).toBe(1);
    expect(loadedCart[0].quantity).toBe(3);
  });
});

