// ─── Scroll memory store — in-memory per-route scroll positions ───────────────
// Pure helpers that remember the vertical scroll offset of visited routes
// during the active SPA lifetime so back navigations return where the user left,
// while full page reloads start cleanly at the top (and clear legacy storage).

export const SCROLL_STORAGE_KEY = 'tokki_scroll_positions_v1';

export interface ScrollMap {
  [key: string]: number;
}

/**
 * Canonical storage key for a route: pathname plus query, without a
 * duplicated '?' separator. An empty query collapses to the bare path.
 */
export function scrollKey(pathname: string, search: string): string {
  const query = search.startsWith('?') ? search.slice(1) : search;
  return query ? `${pathname}?${query}` : pathname;
}

/**
 * Stored offset for a key, or 0 when the entry is missing or corrupt.
 */
export function readOffset(map: ScrollMap, key: string): number {
  const value = map[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

/**
 * New map with the offset applied. Non-finite or negative offsets are
 * rejected, keeping whatever the map already held for that key.
 */
export function saveOffset(map: ScrollMap, key: string, y: number): ScrollMap {
  if (!Number.isFinite(y) || y < 0) return { ...map };
  return { ...map, [key]: y };
}

/**
 * New map without the given key.
 */
export function clearOffset(map: ScrollMap, key: string): ScrollMap {
  const next = { ...map };
  delete next[key];
  return next;
}

/**
 * Offset constrained to the scrollable range of the document.
 */
export function clampOffset(y: number, maxScroll: number): number {
  if (!Number.isFinite(maxScroll) || maxScroll <= 0) return 0;
  if (!Number.isFinite(y) || y <= 0) return 0;
  return Math.min(y, maxScroll);
}

/**
 * Remove any legacy scroll map persisted in sessionStorage so refreshes
 * always flush scroll memory and start from the top.
 */
export function clearPersistedScrollMap(): void {
  try {
    sessionStorage.removeItem(SCROLL_STORAGE_KEY);
  } catch {
    /* private mode / blocked storage — ignore */
  }
}
