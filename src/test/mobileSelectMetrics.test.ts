import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// NOTE: `?raw` is unusable for .css here — vite.config.ts sets test.css: false
// and Vitest's CSS stubber matches `.css` with ANY query (including `?raw`),
// returning ''. Reading the source from disk gives the same raw-text contract
// as src/test/indexHtml.test.ts's `?raw` imports (which work because html/txt/
// xml aren't stubbed). Vitest always runs from the repo root, so cwd-based
// resolution is deterministic.
const indexCss = readFileSync(
  join(process.cwd(), 'src/index.css'),
  'utf8',
);

const categoryCss = readFileSync(
  join(process.cwd(), 'src/pages/category/CategoryPage.css'),
  'utf8',
);

// Static contract test: mobile native-popup anchoring. On iOS/Android, tapping
// a <select> opens the native options popup anchored to the control's rendered
// metrics. With the old 13px display-font (DynaPuff) metrics, the popup opens
// in the WRONG screen position instead of below the control. Every select that
// behaves correctly in this app (POS delivery/payment, admin product form,
// checkout) uses the BODY font at ≥15px. These tests pin .sort-select to those
// known-good metrics in src/index.css (so lazy-loaded routes like admin
// products always receive its styles) and guard against regressions. Native
// popup positioning can't be reproduced in headless Chromium, so we assert the
// CSS source directly.
//
// Extracts the `.sort-select {` block from the raw CSS. There are no nested
// braces inside the block, so the first `}` after the opening brace closes it.
function extractSortSelectBlock(css: string): string {
  const marker = '.sort-select {';
  const start = css.indexOf(marker);
  if (start === -1) return '';
  const open = css.indexOf('{', start);
  const close = css.indexOf('}', open);
  if (open === -1 || close === -1) return '';
  return css.slice(start, close + 1);
}

describe('.sort-select — métricas para el popup nativo en móvil', () => {
  const block = extractSortSelectBlock(indexCss);

  it('el selector de orden usa 16px para anclar bien el popup nativo en móvil', () => {
    expect(block, 'no se encontró el bloque .sort-select en src/index.css').not.toBe('');
    expect(block).toMatch(/font-size:\s*var\(--text-md\)/);
  });

  it('el selector de orden usa la fuente del cuerpo, no la de display', () => {
    expect(block, 'no se encontró el bloque .sort-select en src/index.css').not.toBe('');
    expect(block).toMatch(/font-family:\s*var\(--font-body\)/);
    expect(block).not.toContain('var(--font-display)');
  });

  it('el selector conserva su tamaño táctil de 40px', () => {
    expect(block, 'no se encontró el bloque .sort-select en src/index.css').not.toBe('');
    expect(block).toMatch(/min-height:\s*40px/);
  });

  it('el selector tiene estilos completos (apariencia, borde, radio y chevron SVG) en src/index.css', () => {
    expect(block, 'no se encontró el bloque .sort-select en src/index.css').not.toBe('');
    expect(block).toMatch(/appearance:\s*none/);
    expect(block).toMatch(/-webkit-appearance:\s*none/);
    expect(block).toMatch(/border:\s*2px solid var\(--color-border\)/);
    expect(block).toMatch(/border-radius:\s*var\(--radius-md\)/);
    expect(block).toMatch(/background-image:\s*url\("data:image\/svg\+xml,/);
  });

  it('CategoryPage.css no duplica el bloque .sort-select', () => {
    expect(extractSortSelectBlock(categoryCss)).toBe('');
  });
});
