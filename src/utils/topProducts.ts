import type { Product, OrderSummary } from '../types';

export interface TopProductItem {
  product_id: number;
  product_name: string;
  category: string;
  product_price: string;
  qty_available: number;
  in_stock?: boolean;
  product_image_url?: string | null;
  badgeRank?: string;
  soldCount?: number;
}

export function getRankBadge(rankIndex: number): string {
  switch (rankIndex) {
    case 0:
      return '🥇 #1';
    case 1:
      return '🥈 #2';
    case 2:
      return '🥉 #3';
    default:
      return `#${rankIndex + 1}`;
  }
}

interface OrderItemLike {
  product_id?: number;
  id?: number;
  product_name?: string;
  name?: string;
  product_qty?: number;
  ordered_qty?: number;
  quantity?: number;
}

/**
 * Computes top-ranked products for the admin dashboard based on order line-items (if available)
 * or catalog insights (in-stock status, product value/price, and inventory movement).
 */
export function computeTopProducts(
  products: Product[],
  orders: (OrderSummary & { items?: OrderItemLike[] })[] = [],
  limit = 5,
): TopProductItem[] {
  if (!products || products.length === 0) return [];

  // Map to store sold count per product ID and per normalized product name
  const soldCountById = new Map<number, number>();
  const soldCountByName = new Map<string, number>();
  let hasLineItemData = false;

  for (const order of orders) {
    if (order.status === 'canceled') continue;
    const items = order.items;
    if (Array.isArray(items) && items.length > 0) {
      for (const item of items) {
        const qty = item.product_qty ?? item.ordered_qty ?? item.quantity ?? 1;
        const pid = item.product_id ?? item.id;
        const pname = item.product_name ?? item.name;

        if (pid != null) {
          soldCountById.set(pid, (soldCountById.get(pid) ?? 0) + qty);
          hasLineItemData = true;
        }
        if (pname) {
          const norm = pname.trim().toLowerCase();
          soldCountByName.set(norm, (soldCountByName.get(norm) ?? 0) + qty);
          hasLineItemData = true;
        }
      }
    }
  }

  // Calculate sold units per product
  const annotated = products.map((product) => {
    let soldCount = 0;
    if (soldCountById.has(product.product_id)) {
      soldCount = soldCountById.get(product.product_id)!;
    } else if (soldCountByName.has(product.product_name.trim().toLowerCase())) {
      soldCount = soldCountByName.get(product.product_name.trim().toLowerCase())!;
    }
    const priceNum = Number(product.product_price) || 0;
    return {
      product,
      soldCount,
      priceNum,
    };
  });

  if (hasLineItemData) {
    annotated.sort((a, b) => {
      // 1. Higher sold units
      if (b.soldCount !== a.soldCount) {
        return b.soldCount - a.soldCount;
      }
      // 2. Higher price volume generated
      const revenueA = a.soldCount * a.priceNum;
      const revenueB = b.soldCount * b.priceNum;
      if (revenueB !== revenueA) {
        return revenueB - revenueA;
      }
      // 3. Higher unit price
      if (b.priceNum !== a.priceNum) {
        return b.priceNum - a.priceNum;
      }
      // 4. Stable ID order
      return a.product.product_id - b.product.product_id;
    });
  } else {
    // When no line-item sales data is present, rank using catalog and inventory insights:
    // 1. In-stock products first
    // 2. Higher price/value product
    // 3. Lower remaining stock indicates higher velocity / movement
    // 4. Stable ID order
    annotated.sort((a, b) => {
      const aInStock = (a.product.qty_available > 0 && a.product.in_stock !== false) ? 1 : 0;
      const bInStock = (b.product.qty_available > 0 && b.product.in_stock !== false) ? 1 : 0;
      if (bInStock !== aInStock) {
        return bInStock - aInStock;
      }

      // Higher unit price (high-value products generate more revenue/volume)
      if (b.priceNum !== a.priceNum) {
        return b.priceNum - a.priceNum;
      }

      // Lower remaining stock (velocity/inventory movement)
      if (a.product.qty_available !== b.product.qty_available) {
        return a.product.qty_available - b.product.qty_available;
      }

      return a.product.product_id - b.product.product_id;
    });
  }

  return annotated.slice(0, Math.max(0, limit)).map(({ product, soldCount }, index) => ({
    product_id: product.product_id,
    product_name: product.product_name,
    category: product.category,
    product_price: product.product_price,
    qty_available: product.qty_available,
    in_stock: product.in_stock,
    product_image_url: product.product_image_url,
    soldCount: soldCount > 0 ? soldCount : undefined,
    badgeRank: getRankBadge(index),
  }));
}
