import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Some jsdom/worker combos on this machine expose `window` without
// `localStorage`. Backfill a tiny in-memory shim so store-backed tests are
// deterministic regardless of the environment quirk.
if (typeof window !== 'undefined' && !window.localStorage) {
  const memory = new Map<string, string>();
  const shim: Storage = {
    get length() {
      return memory.size;
    },
    clear: () => memory.clear(),
    getItem: (k: string) => memory.get(k) ?? null,
    key: (i: number) => Array.from(memory.keys())[i] ?? null,
    removeItem: (k: string) => void memory.delete(k),
    setItem: (k: string, v: string) => void memory.set(k, String(v)),
  };
  Object.defineProperty(window, 'localStorage', { value: shim, configurable: true });
}

afterEach(() => {
  cleanup();
  window.localStorage?.clear();
});
