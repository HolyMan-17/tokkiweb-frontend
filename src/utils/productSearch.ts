// Shared catalog-search predicate — single source of truth so every browse
// page (category, all-products) matches the same fields the same way:
// name OR description, case-insensitive and diacritic-insensitive
// ("balsamo" finds "Bálsamo", "peluche" finds "Peluche").

import type { Product } from '../types';

function fold(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** True when the trimmed query appears in the product's name or description.
 *  An empty / whitespace-only query matches everything. */
export function matchesSearch(product: Product, query: string): boolean {
  const q = fold(query.trim());
  if (!q) return true;
  return (
    fold(product.product_name).includes(q) ||
    fold(product.product_description).includes(q)
  );
}
