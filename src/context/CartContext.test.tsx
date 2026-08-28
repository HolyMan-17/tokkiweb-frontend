import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import { CartProvider, useCart } from './CartContext';
import { describeStockAdjustment, type StockAdjustment } from '../utils/stock';
import type { Product } from '../types';

const p1: Product = {
  product_id: 1,
  product_name: 'Bálsamo de Fresa',
  product_price: '3.50',
  product_description: 'Bálsamo labial hidratante.',
  qty_available: 45,
  in_stock: true,
  category: 'Maquillaje',
};

const p2: Product = {
  product_id: 2,
  product_name: 'Butterfly Gloss',
  product_price: '5.00',
  product_description: 'Gloss labial brillante.',
  qty_available: 30,
  in_stock: true,
  category: 'Maquillaje',
};

function freshProduct(product: Product, patch: Partial<Product> = {}): Product {
  return { ...product, ...patch };
}

function seedCart(items: { product: Product; quantity: number }[]) {
  window.localStorage.setItem('tokki_cart_v1', JSON.stringify(items));
}

/** Probe that renders the reconciled cart state and triggers reconcileStock. */
function ReconcileProbe({ products }: { products: Product[] }) {
  const { items, reconcileStock } = useCart();
  return (
    <div>
      <button onClick={() => reconcileStock(products)}>reconciliar</button>
      <ul>
        {items.map(i => (
          <li key={i.product.product_id}>
            {i.product.product_name} x{i.quantity}
          </li>
        ))}
      </ul>
    </div>
  );
}

async function renderProbe(products: Product[]) {
  const user = userEvent.setup();
  render(
    <CartProvider>
      <ReconcileProbe products={products} />
    </CartProvider>,
  );
  const button = await screen.findByRole('button', { name: /reconciliar/i });
  return { user, button };
}

describe('CartContext — reconcileStock', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('reduce la cantidad al stock disponible cuando el inventario bajó', async () => {
    seedCart([{ product: p1, quantity: 5 }]);
    const { user, button } = await renderProbe([
      freshProduct(p1, { qty_available: 2 }),
    ]);

    await user.click(button);

    expect(screen.getByText(`${p1.product_name} x2`)).toBeInTheDocument();
  });

  it('elimina la línea cuyo producto se quedó sin stock', async () => {
    seedCart([{ product: p1, quantity: 3 }]);
    const { user, button } = await renderProbe([
      freshProduct(p1, { qty_available: 0, in_stock: false }),
    ]);

    await user.click(button);

    expect(screen.queryByText(new RegExp(p1.product_name))).not.toBeInTheDocument();
  });

  it('elimina la línea cuyo producto ya no existe en el catálogo', async () => {
    seedCart([
      { product: p1, quantity: 1 },
      { product: p2, quantity: 2 },
    ]);
    // El catálogo fresco ya no trae p2 (archivado/borrado).
    const { user, button } = await renderProbe([freshProduct(p1)]);

    await user.click(button);

    expect(screen.getByText(`${p1.product_name} x1`)).toBeInTheDocument();
    expect(screen.queryByText(new RegExp(p2.product_name))).not.toBeInTheDocument();
  });

  it('es un no-op cuando todas las líneas siguen vigentes', async () => {
    seedCart([
      { product: p1, quantity: 2 },
      { product: p2, quantity: 4 },
    ]);
    const { user, button } = await renderProbe([freshProduct(p1), freshProduct(p2)]);

    await user.click(button);

    expect(screen.getByText(`${p1.product_name} x2`)).toBeInTheDocument();
    expect(screen.getByText(`${p2.product_name} x4`)).toBeInTheDocument();
  });
});

describe('describeStockAdjustment', () => {
  it('describe un recorte de cantidad con el nuevo máximo', () => {
    const adj: StockAdjustment = {
      productId: 1,
      productName: 'Bálsamo de Fresa',
      type: 'clamped',
      previousQty: 5,
      newQty: 2,
    };
    expect(describeStockAdjustment(adj)).toBe(
      "'Bálsamo de Fresa' ahora tiene solo 2 disponibles",
    );
  });

  it('describe una línea eliminada como no disponible', () => {
    const adj: StockAdjustment = {
      productId: 2,
      productName: 'Butterfly Gloss',
      type: 'removed',
    };
    expect(describeStockAdjustment(adj)).toBe(
      "'Butterfly Gloss' ya no está disponible",
    );
  });
});
