// Shared catalog sort — single source of truth so every browse page (category,
// all-products) sorts the same way and the sort select renders the same
// options, including "Más antiguos".

import { getEffectivePriceCents } from './pricing';

export type SortOption = 'recent' | 'oldest' | 'price-asc' | 'price-desc' | 'name';

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'recent',     label: 'Más recientes' },
  { value: 'oldest',     label: 'Más antiguos' },
  { value: 'price-asc',  label: 'Precio: menor a mayor' },
  { value: 'price-desc', label: 'Precio: mayor a menor' },
  { value: 'name',       label: 'Nombre A–Z' },
];

/** Returns a new array sorted by the requested option without mutating the
 *  input. "recent" / "oldest" order by product_id, prices compare numerically
 *  using effective discounted price in cents, "name" uses localeCompare. */
export function sortProducts<
  T extends {
    product_id: number;
    product_price: string;
    discount_percent?: number | null;
    product_name: string;
  },
>(
  products: T[],
  sort: SortOption,
): T[] {
  const sorted = [...products];
  switch (sort) {
    case 'recent':
      sorted.sort((a, b) => b.product_id - a.product_id);
      break;
    case 'oldest':
      sorted.sort((a, b) => a.product_id - b.product_id);
      break;
    case 'price-asc':
      sorted.sort((a, b) => getEffectivePriceCents(a) - getEffectivePriceCents(b));
      break;
    case 'price-desc':
      sorted.sort((a, b) => getEffectivePriceCents(b) - getEffectivePriceCents(a));
      break;
    case 'name':
      sorted.sort((a, b) => a.product_name.localeCompare(b.product_name));
      break;
  }
  return sorted;
}
