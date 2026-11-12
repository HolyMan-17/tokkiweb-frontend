import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { scrollKey, readOffset, saveOffset, clearOffset, clampOffset, parseScrollMap, serializeScrollMap, loadScrollMap, persistScrollMap, SCROLL_STORAGE_KEY, type ScrollMap } from './scrollMemory';

/**
 * Canonical key form (documented contract):
 *   scrollKey('/categorias/x', '')     -> '/categorias/x'
 *   scrollKey('/categorias/x', 'q=1')  -> '/categorias/x?q=1'
 *   scrollKey('/categorias/x', '?q=1') -> '/categorias/x?q=1'  (leading '?' stripped)
 * A search that normalises to an empty string collapses back to the bare path.
 */
describe('scrollMemory — scrollKey', () => {
  it('builds a bare path key when the search string is empty', () => {
    expect(scrollKey('/categorias/maquillaje', '')).toBe('/categorias/maquillaje');
  });

  it('builds a path?query key when a search string is present', () => {
    expect(scrollKey('/productos', 'q=stickers')).toBe('/productos?q=stickers');
  });

  it('normalises a leading "?" so both spellings produce the same key', () => {
    expect(scrollKey('/productos', '?q=stickers')).toBe('/productos?q=stickers');
    expect(scrollKey('/productos', '?q=stickers')).toBe(scrollKey('/productos', 'q=stickers'));
  });

  it('collapses a search that only contains "?" back to the bare path', () => {
    expect(scrollKey('/productos', '?')).toBe('/productos');
  });

  it('does not collide between different paths or different queries', () => {
    expect(scrollKey('/productos', 'q=a')).not.toBe(scrollKey('/productos', 'q=b'));
    expect(scrollKey('/productos', 'q=a')).not.toBe(scrollKey('/categorias/ropa', 'q=a'));
    expect(scrollKey('/productos', '')).not.toBe(scrollKey('/productos', 'q=a'));
  });
});

describe('scrollMemory — readOffset', () => {
  it('returns 0 for a key that is not in the map', () => {
    expect(readOffset({}, '/productos')).toBe(0);
  });

  it('returns 0 when the stored value is not a finite number', () => {
    const corrupt = { '/productos': 'not-a-number' } as unknown as ScrollMap;
    const notANumber = { '/productos': Number.NaN } as unknown as ScrollMap;
    expect(readOffset(corrupt, '/productos')).toBe(0);
    expect(readOffset(notANumber, '/productos')).toBe(0);
  });

  it('returns the stored offset for a known key', () => {
    const map: ScrollMap = { '/productos': 240, '/categorias/ropa': 80 };
    expect(readOffset(map, '/productos')).toBe(240);
    expect(readOffset(map, '/categorias/ropa')).toBe(80);
  });
});

describe('scrollMemory — saveOffset', () => {
  it('returns a new map and leaves the input map untouched', () => {
    const original: ScrollMap = { '/productos': 100 };
    const next = saveOffset(original, '/productos', 350);
    expect(next).not.toBe(original);
    expect(original).toEqual({ '/productos': 100 });
    expect(next).toEqual({ '/productos': 350 });
  });

  it('stores a new key while keeping the other entries intact', () => {
    const original: ScrollMap = { '/productos': 100 };
    const next = saveOffset(original, '/categorias/ropa', 420);
    expect(next).toEqual({ '/productos': 100, '/categorias/ropa': 420 });
    expect(original).toEqual({ '/productos': 100 });
  });

  it('ignores NaN and Infinity offsets and keeps the previous value', () => {
    const original: ScrollMap = { '/productos': 100 };
    expect(saveOffset(original, '/productos', Number.NaN)).toEqual({ '/productos': 100 });
    expect(saveOffset(original, '/productos', Number.POSITIVE_INFINITY)).toEqual({ '/productos': 100 });
    expect(saveOffset(original, '/productos', Number.NEGATIVE_INFINITY)).toEqual({ '/productos': 100 });
    expect(original).toEqual({ '/productos': 100 });
  });

  it('ignores negative offsets and keeps the previous value', () => {
    const original: ScrollMap = { '/productos': 100 };
    expect(saveOffset(original, '/productos', -1)).toEqual({ '/productos': 100 });
    expect(original).toEqual({ '/productos': 100 });
  });

  it('stores nothing for an invalid offset on a fresh key', () => {
    expect(saveOffset({}, '/productos', Number.NaN)).toEqual({});
  });

  it('stores a zero offset (top of the page)', () => {
    expect(saveOffset({ '/productos': 100 }, '/productos', 0)).toEqual({ '/productos': 0 });
  });
});

describe('scrollMemory — clearOffset', () => {
  it('removes the key and returns a new map without touching the input', () => {
    const original: ScrollMap = { '/productos': 100, '/categorias/ropa': 420 };
    const next = clearOffset(original, '/productos');
    expect(next).not.toBe(original);
    expect(next).toEqual({ '/categorias/ropa': 420 });
    expect(original).toEqual({ '/productos': 100, '/categorias/ropa': 420 });
  });

  it('is a no-op for a key that is not present', () => {
    const original: ScrollMap = { '/productos': 100 };
    const next = clearOffset(original, '/otra');
    expect(next).toEqual({ '/productos': 100 });
    expect(original).toEqual({ '/productos': 100 });
  });
});

describe('scrollMemory — clampOffset', () => {
  it('keeps an offset that is below the maximum', () => {
    expect(clampOffset(120, 800)).toBe(120);
    expect(clampOffset(0, 800)).toBe(0);
  });

  it('clamps an offset that is above the maximum down to it', () => {
    expect(clampOffset(1200, 800)).toBe(800);
  });

  it('clamps a negative offset to 0', () => {
    expect(clampOffset(-50, 800)).toBe(0);
  });

  it('returns 0 when the maximum scroll is zero or negative', () => {
    expect(clampOffset(120, 0)).toBe(0);
    expect(clampOffset(120, -10)).toBe(0);
    expect(clampOffset(-50, -10)).toBe(0);
  });
});

describe('scrollMemory — parseScrollMap', () => {
  it('returns an empty map for null, empty or invalid payloads', () => {
    expect(parseScrollMap(null)).toEqual({});
    expect(parseScrollMap('')).toEqual({});
    expect(parseScrollMap('{not json')).toEqual({});
  });

  it('does not throw on malformed JSON', () => {
    expect(() => parseScrollMap('=')).not.toThrow();
  });

  it('drops only the invalid entries of a partially valid payload', () => {
    const raw = JSON.stringify({
      '/productos': 120,
      '/roto': 'abc',
      '/categorias/ropa': 340,
    });
    expect(parseScrollMap(raw)).toEqual({ '/productos': 120, '/categorias/ropa': 340 });
  });

  it('drops entries whose value is null', () => {
    expect(parseScrollMap(JSON.stringify({ '/nulo': null, '/ok': 5 }))).toEqual({ '/ok': 5 });
  });

  it('keeps every valid numeric entry', () => {
    const raw = JSON.stringify({ '/a': 0, '/b': 12.5, '/c': 900 });
    expect(parseScrollMap(raw)).toEqual({ '/a': 0, '/b': 12.5, '/c': 900 });
  });
});

describe('scrollMemory — serializeScrollMap', () => {
  it('serialises a map to JSON that parses back to the same entries', () => {
    const map: ScrollMap = { '/productos': 120, '/categorias/ropa': 340 };
    expect(JSON.parse(serializeScrollMap(map))).toEqual(map);
  });

  it('round-trips through parseScrollMap', () => {
    const map: ScrollMap = { '/productos': 120, '/categorias/ropa': 340 };
    expect(parseScrollMap(serializeScrollMap(map))).toEqual(map);
  });

  it('round-trips an empty map', () => {
    expect(parseScrollMap(serializeScrollMap({}))).toEqual({});
  });
});

describe('scrollMemory — sessionStorage persistence', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  afterEach(() => {
    window.sessionStorage.clear();
  });

  it('exposes the expected sessionStorage key', () => {
    expect(SCROLL_STORAGE_KEY).toBe('tokki_scroll_positions_v1');
  });

  it('returns an empty map when sessionStorage holds no scroll positions', () => {
    expect(loadScrollMap()).toEqual({});
  });

  it('persists a map and loads it back unchanged', () => {
    const map: ScrollMap = { '/productos': 120, '/categorias/ropa': 340 };
    persistScrollMap(map);
    expect(loadScrollMap()).toEqual(map);
  });

  it('writes the serialised map under the scroll storage key', () => {
    const map: ScrollMap = { '/productos': 120 };
    persistScrollMap(map);
    const raw = window.sessionStorage.getItem(SCROLL_STORAGE_KEY);
    expect(raw).not.toBeNull();
    expect(parseScrollMap(raw)).toEqual(map);
  });

  it('ignores a corrupt sessionStorage payload instead of throwing', () => {
    window.sessionStorage.setItem(SCROLL_STORAGE_KEY, '{not json');
    expect(() => loadScrollMap()).not.toThrow();
    expect(loadScrollMap()).toEqual({});
  });
});
