import type { OrderDetail, OrderItem, Product } from '../../../types';

/** Auth handle used by the admin API clients (Bearer token via Clerk). */
export type AdminApiAuth = { getToken?: () => Promise<string | null> };

/** Catalog images indexed by normalized product name and by product id. */
export interface CatalogImageMap {
  byName: Map<string, string>;
  byId: Map<number, string>;
}

/**
 * Indexes the live catalog by product name (normalized) and by product id so
 * an order line without a photo can still show the catalog image.
 */
export function buildCatalogImageMap(
  products: Product[] | undefined,
): CatalogImageMap {
  const byName = new Map<string, string>();
  const byId = new Map<number, string>();
  if (!products) return { byName, byId };
  for (const p of products) {
    if (p.product_image_url) {
      byName.set(p.product_name.toLowerCase().trim(), p.product_image_url);
      byId.set(p.product_id, p.product_image_url);
    }
  }
  return { byName, byId };
}

/** Product id of an order line — tolerates the `id` alias some backends send. */
export function resolveItemProductId(item: OrderItem): number | undefined {
  const raw = item as unknown as Record<string, unknown>;
  if (typeof raw.product_id === 'number') return raw.product_id;
  if (typeof raw.id === 'number') return raw.id;
  return undefined;
}

/**
 * Image of an order line: the order payload wins, the live catalog is the
 * fallback (by product id first, then by product name).
 */
export function resolveItemImageUrl(
  item: OrderItem,
  catalog: CatalogImageMap,
): string | undefined {
  const raw = item as unknown as Record<string, unknown>;
  const productId = resolveItemProductId(item);
  const candidates: Array<string | null | undefined> = [
    item.product_image_url,
    item.image_url,
    raw.image as string | null | undefined,
    productId !== undefined ? catalog.byId.get(productId) : undefined,
    item.product_name
      ? catalog.byName.get(item.product_name.toLowerCase().trim())
      : undefined,
  ];
  return candidates.find((url) => Boolean(url)) ?? undefined;
}

/** First letter of the product name — the placeholder for lines without photo. */
export function resolveItemInitialLetter(productName: string | undefined): string {
  return productName ? productName.charAt(0).toUpperCase() : '🛍️';
}

/** Delivery slug of an order — tolerates the aliases some backends use. */
export function resolveDeliverySlug(order: OrderDetail): string | undefined {
  const raw = order as unknown as Record<string, string | undefined>;
  return (
    order.delivery_type ||
    raw.delivery_method ||
    raw.delivery ||
    raw.deliveryType ||
    raw.metodo_entrega
  );
}

/** Payment slug of an order — tolerates the aliases some backends use. */
export function resolvePaymentSlug(order: OrderDetail): string | undefined {
  const raw = order as unknown as Record<string, string | undefined>;
  return (
    order.payment_method ||
    raw.payment_type ||
    raw.payment ||
    raw.paymentMethod ||
    raw.metodo_pago
  );
}
