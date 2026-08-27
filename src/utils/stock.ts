// ─── Stock reconciliation utilities ─────────────────────────────────
export type StockAdjustmentType = 'clamped' | 'removed';

export interface StockAdjustment {
  productId: number;
  productName: string;
  type: StockAdjustmentType;
  previousQty?: number;
  newQty?: number;
}

/** Spanish, user-facing description of a single cart adjustment. */
export function describeStockAdjustment(a: StockAdjustment): string {
  if (a.type === 'clamped') {
    return `'${a.productName}' ahora tiene solo ${a.newQty} disponible${a.newQty === 1 ? '' : 's'}`;
  }
  return `'${a.productName}' ya no está disponible`;
}
