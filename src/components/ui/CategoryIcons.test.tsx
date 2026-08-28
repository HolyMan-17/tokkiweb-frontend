import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { CATEGORY_ICONS, getCategoryIcon } from './CategoryIcons';
import { CATEGORIES, slugify } from '../../constants';

describe('CategoryIcons & CATEGORIES — Zona KPOP support', () => {
  it('CATEGORIES contains Zona KPOP as the first category with microphone emoji fallback', () => {
    expect(CATEGORIES[0].name).toBe('Zona KPOP');
    expect(CATEGORIES[0].emoji).toBe('🎤');
    expect(slugify(CATEGORIES[0].name)).toBe('zona-kpop');
  });

  it('CATEGORY_ICONS contains an entry for Zona KPOP with kpop.png image', () => {
    const icon = CATEGORY_ICONS['Zona KPOP'];
    expect(icon).toBeDefined();

    const { container } = render(<>{icon}</>);
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img?.getAttribute('src')).toContain('kpop');
    expect(img?.className).toContain('category-emoji-img');
    expect(img?.className).toContain('category-kpop');
  });

  it('getCategoryIcon returns the Zona KPOP icon for exact and alias matches', () => {
    // Exact match
    const exact = getCategoryIcon('Zona KPOP');
    expect(exact).not.toBeNull();
    const { container: c1 } = render(<>{exact}</>);
    expect(c1.querySelector('img')?.getAttribute('src')).toContain('kpop');

    // Case-insensitive / trimmed match
    const lower = getCategoryIcon('zona kpop');
    expect(lower).not.toBeNull();
    const { container: c2 } = render(<>{lower}</>);
    expect(c2.querySelector('img')?.getAttribute('src')).toContain('kpop');

    // Alias matches
    const alias1 = getCategoryIcon('KPOP');
    expect(alias1).not.toBeNull();
    const { container: c3 } = render(<>{alias1}</>);
    expect(c3.querySelector('img')?.getAttribute('src')).toContain('kpop');

    const alias2 = getCategoryIcon('k-pop');
    expect(alias2).not.toBeNull();
    const { container: c4 } = render(<>{alias2}</>);
    expect(c4.querySelector('img')?.getAttribute('src')).toContain('kpop');
  });

  it('all CATEGORIES have a corresponding brand icon in CATEGORY_ICONS', () => {
    for (const cat of CATEGORIES) {
      const icon = getCategoryIcon(cat.name);
      expect(icon, `Category ${cat.name} should have an icon`).not.toBeNull();
    }
  });

  it('CATEGORIES contains Bolsas o cajas de regalo with gift emoji fallback', () => {
    const giftCat = CATEGORIES.find(c => c.name === 'Bolsas o cajas de regalo');
    expect(giftCat).toBeDefined();
    expect(giftCat?.emoji).toBe('🎁');
    expect(slugify(giftCat!.name)).toBe('bolsas-o-cajas-de-regalo');
  });

  it('CATEGORY_ICONS contains an entry for Bolsas o cajas de regalo with gift.gif image', () => {
    const icon = CATEGORY_ICONS['Bolsas o cajas de regalo'];
    expect(icon).toBeDefined();

    const { container } = render(<>{icon}</>);
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img?.getAttribute('src')).toContain('gift');
    expect(img?.className).toContain('category-emoji-img');
    expect(img?.className).toContain('category-gift');
  });

  it('getCategoryIcon returns the gift icon for Bolsas o cajas de regalo and aliases', () => {
    const exact = getCategoryIcon('Bolsas o cajas de regalo');
    expect(exact).not.toBeNull();
    const { container: c1 } = render(<>{exact}</>);
    expect(c1.querySelector('img')?.getAttribute('src')).toContain('gift');

    const lower = getCategoryIcon('bolsas o cajas de regalo');
    expect(lower).not.toBeNull();
    const { container: c2 } = render(<>{lower}</>);
    expect(c2.querySelector('img')?.getAttribute('src')).toContain('gift');

    const alias1 = getCategoryIcon('cajas de regalo');
    expect(alias1).not.toBeNull();
    const { container: c3 } = render(<>{alias1}</>);
    expect(c3.querySelector('img')?.getAttribute('src')).toContain('gift');

    const alias2 = getCategoryIcon('regalos');
    expect(alias2).not.toBeNull();
    const { container: c4 } = render(<>{alias2}</>);
    expect(c4.querySelector('img')?.getAttribute('src')).toContain('gift');
  });

  it('CATEGORIES contains Dulces & Comida Asiatica with dango emoji fallback', () => {
    const dulcesCat = CATEGORIES.find(c => c.name === 'Dulces & Comida Asiatica');
    expect(dulcesCat).toBeDefined();
    expect(dulcesCat?.emoji).toBe('🍡');
    expect(slugify(dulcesCat!.name)).toBe('dulces-&-comida-asiatica');
  });

  it('CATEGORY_ICONS contains an entry for Dulces & Comida Asiatica with treat.gif image', () => {
    const icon = CATEGORY_ICONS['Dulces & Comida Asiatica'];
    expect(icon).toBeDefined();

    const { container } = render(<>{icon}</>);
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img?.getAttribute('src')).toContain('treat');
    expect(img?.className).toContain('category-emoji-img');
    expect(img?.className).toContain('category-treat');
  });

  it('getCategoryIcon returns the treat icon for Dulces & Comida Asiatica and aliases', () => {
    const exact = getCategoryIcon('Dulces & Comida Asiatica');
    expect(exact).not.toBeNull();
    const { container: c1 } = render(<>{exact}</>);
    expect(c1.querySelector('img')?.getAttribute('src')).toContain('treat');

    const lower = getCategoryIcon('dulces & comida asiatica');
    expect(lower).not.toBeNull();
    const { container: c2 } = render(<>{lower}</>);
    expect(c2.querySelector('img')?.getAttribute('src')).toContain('treat');

    const alias1 = getCategoryIcon('Dulces Asiáticos');
    expect(alias1).not.toBeNull();
    const { container: c3 } = render(<>{alias1}</>);
    expect(c3.querySelector('img')?.getAttribute('src')).toContain('treat');

    const alias2 = getCategoryIcon('comida asiatica');
    expect(alias2).not.toBeNull();
    const { container: c4 } = render(<>{alias2}</>);
    expect(c4.querySelector('img')?.getAttribute('src')).toContain('treat');
  });

  it('returns null for completely unknown category with no match', () => {
    expect(getCategoryIcon('CategoriaInexistente12345')).toBeNull();
    expect(getCategoryIcon('')).toBeNull();
  });
});
