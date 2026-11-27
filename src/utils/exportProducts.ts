import type { Product } from '../types';
import { escapeCsvField } from './exportOrders';
import { getEffectivePriceString, normalizeDiscountPercent } from './pricing';

const CSV_HEADERS = ['Nombre', 'Precio ($)', 'Descuento (%)', 'Precio Final ($)'] as const;

/**
 * Generates CSV content with a UTF-8 Byte Order Mark (BOM) for Excel compatibility.
 * Exports product name, base price, active discount %, and effective final price.
 */
export function generateProductsCsv(products: Product[]): string {
  const headerRow = CSV_HEADERS.map(escapeCsvField).join(',');

  const dataRows = products.map((product) => {
    const name = (product.product_name && product.product_name.trim())
      ? product.product_name.trim()
      : 'Sin nombre';
    const price = (product.product_price !== undefined && product.product_price !== null && String(product.product_price).trim() !== '')
      ? String(product.product_price).trim()
      : '0.00';
    const discountPct = normalizeDiscountPercent(product.discount_percent);
    const finalPrice = getEffectivePriceString({
      product_price: price,
      discount_percent: discountPct,
    });

    return [
      escapeCsvField(name),
      escapeCsvField(price),
      escapeCsvField(String(discountPct)),
      escapeCsvField(finalPrice),
    ].join(',');
  });

  return '\uFEFF' + [headerRow, ...dataRows].join('\r\n');
}

/**
 * Triggers a browser download of the products list formatted as CSV.
 */
export function exportProductsToCsv(products: Product[], filename?: string): void {
  if (typeof document === 'undefined' || typeof URL === 'undefined') {
    return;
  }

  const csvContent = generateProductsCsv(products);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const today = new Date().toISOString().split('T')[0];
  const downloadFilename = filename || `tokki_productos_${today}.csv`;

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', downloadFilename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}
