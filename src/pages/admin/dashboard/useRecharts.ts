import { useEffect, useState } from 'react';

export type RechartsModule = typeof import('recharts');

let rechartsCache: RechartsModule | null = null;
let rechartsPromise: Promise<RechartsModule> | null = null;

function loadRecharts(): Promise<RechartsModule> {
  if (rechartsCache) return Promise.resolve(rechartsCache);
  if (!rechartsPromise) {
    rechartsPromise = import('recharts').then((mod) => {
      rechartsCache = mod;
      return mod;
    });
  }
  return rechartsPromise;
}

/**
 * Lazily loads the recharts bundle once and shares it across every chart
 * instance. Returns `null` while the library is still being fetched.
 */
export function useRecharts(): RechartsModule | null {
  const [recharts, setRecharts] = useState<RechartsModule | null>(rechartsCache);

  useEffect(() => {
    if (!recharts) {
      loadRecharts().then(setRecharts);
    }
  }, [recharts]);

  return recharts;
}
