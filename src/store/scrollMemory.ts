// ─── Scroll memory store — session scroll positions ────────────────
// Pure helpers that remember the vertical scroll offset of visited
// routes so the catalog can restore the previous position on back-nav.
// Persistence lives in sessionStorage and is best-effort only.

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
 * Parse a persisted payload, dropping entries that are not finite numbers.
 */
export function parseScrollMap(raw: string | null): ScrollMap {
  if (!raw) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
  const map: ScrollMap = {};
  for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
    if (typeof value === 'number' && Number.isFinite(value)) map[key] = value;
  }
  return map;
}

/**
 * Serialise a map for storage.
 */
export function serializeScrollMap(map: ScrollMap): string {
  return JSON.stringify(map);
}

/**
 * Read the persisted scroll map. Unreadable storage yields an empty map.
 */
export function loadScrollMap(): ScrollMap {
  try {
    return parseScrollMap(sessionStorage.getItem(SCROLL_STORAGE_KEY));
  } catch {
    return {};
  }
}

/**
 * Persist the scroll map. Storage failures are ignored.
 */
export function persistScrollMap(map: ScrollMap): void {
  try {
    sessionStorage.setItem(SCROLL_STORAGE_KEY, serializeScrollMap(map));
  } catch {
    /* quota / private mode — ignore */
  }
}
