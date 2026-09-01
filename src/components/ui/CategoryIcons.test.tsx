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

  it('CATEGORY_ICONS contains an entry for Accesorios with ring.avif and category-ring class', () => {
    const icon = CATEGORY_ICONS['Accesorios'];
    expect(icon).toBeDefined();

    const { container } = render(<>{icon}</>);
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img?.getAttribute('src')).toContain('ring');
    expect(img?.className).toContain('category-emoji-img');
    expect(img?.className).toContain('category-ring');
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

  it('CATEGORIES contains Bolsos y Carteras with purse emoji fallback', () => {
    const purseCat = CATEGORIES.find(c => c.name === 'Bolsos y Carteras');
    expect(purseCat).toBeDefined();
    expect(purseCat?.emoji).toBe('👜');
    expect(slugify(purseCat!.name)).toBe('bolsos-y-carteras');
  });

  it('CATEGORY_ICONS contains an entry for Bolsos y Carteras with purse.png image', () => {
    const icon = CATEGORY_ICONS['Bolsos y Carteras'];
    expect(icon).toBeDefined();

    const { container } = render(<>{icon}</>);
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img?.getAttribute('src')).toContain('purse');
    expect(img?.className).toContain('category-emoji-img');
    expect(img?.className).toContain('category-purse');
  });

  it('getCategoryIcon returns the purse icon for Bolsos y Carteras and aliases', () => {
    const exact = getCategoryIcon('Bolsos y Carteras');
    expect(exact).not.toBeNull();
    const { container: c1 } = render(<>{exact}</>);
    expect(c1.querySelector('img')?.getAttribute('src')).toContain('purse');

    const lower = getCategoryIcon('bolsos y carteras');
    expect(lower).not.toBeNull();
    const { container: c2 } = render(<>{lower}</>);
    expect(c2.querySelector('img')?.getAttribute('src')).toContain('purse');

    const alias1 = getCategoryIcon('bolsos');
    expect(alias1).not.toBeNull();
    const { container: c3 } = render(<>{alias1}</>);
    expect(c3.querySelector('img')?.getAttribute('src')).toContain('purse');

    const alias2 = getCategoryIcon('carteras');
    expect(alias2).not.toBeNull();
    const { container: c4 } = render(<>{alias2}</>);
    expect(c4.querySelector('img')?.getAttribute('src')).toContain('purse');

    const alias3 = getCategoryIcon('purses');
    expect(alias3).not.toBeNull();
    const { container: c5 } = render(<>{alias3}</>);
    expect(c5.querySelector('img')?.getAttribute('src')).toContain('purse');
  });

  it('CATEGORIES contains Cosplays with theater mask emoji fallback', () => {
    const cosplayCat = CATEGORIES.find(c => c.name === 'Cosplays');
    expect(cosplayCat).toBeDefined();
    expect(cosplayCat?.emoji).toBe('🎭');
    expect(slugify(cosplayCat!.name)).toBe('cosplays');
  });

  it('CATEGORY_ICONS contains an entry for Cosplays with cosplay.png image', () => {
    const icon = CATEGORY_ICONS['Cosplays'];
    expect(icon).toBeDefined();

    const { container } = render(<>{icon}</>);
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img?.getAttribute('src')).toContain('cosplay');
    expect(img?.className).toContain('category-emoji-img');
    expect(img?.className).toContain('category-cosplay');
  });

  it('getCategoryIcon returns the cosplay icon for Cosplays and aliases', () => {
    const exact = getCategoryIcon('Cosplays');
    expect(exact).not.toBeNull();
    const { container: c1 } = render(<>{exact}</>);
    expect(c1.querySelector('img')?.getAttribute('src')).toContain('cosplay');

    const lower = getCategoryIcon('cosplays');
    expect(lower).not.toBeNull();
    const { container: c2 } = render(<>{lower}</>);
    expect(c2.querySelector('img')?.getAttribute('src')).toContain('cosplay');

    const alias1 = getCategoryIcon('cosplay');
    expect(alias1).not.toBeNull();
    const { container: c3 } = render(<>{alias1}</>);
    expect(c3.querySelector('img')?.getAttribute('src')).toContain('cosplay');

    const alias2 = getCategoryIcon('disfraces');
    expect(alias2).not.toBeNull();
    const { container: c4 } = render(<>{alias2}</>);
    expect(c4.querySelector('img')?.getAttribute('src')).toContain('cosplay');
  });

  it('CATEGORIES contains Para ellos with spider emoji fallback', () => {
    const ellosCat = CATEGORIES.find(c => c.name === 'Para ellos');
    expect(ellosCat).toBeDefined();
    expect(ellosCat?.emoji).toBe('🕷️');
    expect(slugify(ellosCat!.name)).toBe('para-ellos');
  });

  it('CATEGORY_ICONS contains an entry for Para ellos with spiderman.png image', () => {
    const icon = CATEGORY_ICONS['Para ellos'];
    expect(icon).toBeDefined();

    const { container } = render(<>{icon}</>);
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img?.getAttribute('src')).toContain('spiderman');
    expect(img?.className).toContain('category-emoji-img');
    expect(img?.className).toContain('category-spiderman');
  });

  it('getCategoryIcon returns the spiderman icon for Para ellos and aliases', () => {
    const exact = getCategoryIcon('Para ellos');
    expect(exact).not.toBeNull();
    const { container: c1 } = render(<>{exact}</>);
    expect(c1.querySelector('img')?.getAttribute('src')).toContain('spiderman');

    const lower = getCategoryIcon('para ellos');
    expect(lower).not.toBeNull();
    const { container: c2 } = render(<>{lower}</>);
    expect(c2.querySelector('img')?.getAttribute('src')).toContain('spiderman');

    const alias1 = getCategoryIcon('hombres');
    expect(alias1).not.toBeNull();
    const { container: c3 } = render(<>{alias1}</>);
    expect(c3.querySelector('img')?.getAttribute('src')).toContain('spiderman');

    const alias2 = getCategoryIcon('ellos');
    expect(alias2).not.toBeNull();
    const { container: c4 } = render(<>{alias2}</>);
    expect(c4.querySelector('img')?.getAttribute('src')).toContain('spiderman');
  });

  it('CATEGORIES contains Regalos de pareja with couple emoji fallback', () => {
    const parejaCat = CATEGORIES.find(c => c.name === 'Regalos de pareja');
    expect(parejaCat).toBeDefined();
    expect(parejaCat?.emoji).toBe('💑');
    expect(slugify(parejaCat!.name)).toBe('regalos-de-pareja');
  });

  it('CATEGORY_ICONS contains an entry for Regalos de pareja with couple.png image', () => {
    const icon = CATEGORY_ICONS['Regalos de pareja'];
    expect(icon).toBeDefined();

    const { container } = render(<>{icon}</>);
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img?.getAttribute('src')).toContain('couple');
    expect(img?.className).toContain('category-emoji-img');
    expect(img?.className).toContain('category-couple');
  });

  it('getCategoryIcon returns the couple icon for Regalos de pareja and aliases', () => {
    const exact = getCategoryIcon('Regalos de pareja');
    expect(exact).not.toBeNull();
    const { container: c1 } = render(<>{exact}</>);
    expect(c1.querySelector('img')?.getAttribute('src')).toContain('couple');

    const lower = getCategoryIcon('regalos de pareja');
    expect(lower).not.toBeNull();
    const { container: c2 } = render(<>{lower}</>);
    expect(c2.querySelector('img')?.getAttribute('src')).toContain('couple');

    const alias1 = getCategoryIcon('pareja');
    expect(alias1).not.toBeNull();
    const { container: c3 } = render(<>{alias1}</>);
    expect(c3.querySelector('img')?.getAttribute('src')).toContain('couple');

    const alias2 = getCategoryIcon('novios');
    expect(alias2).not.toBeNull();
    const { container: c4 } = render(<>{alias2}</>);
    expect(c4.querySelector('img')?.getAttribute('src')).toContain('couple');

    const alias3 = getCategoryIcon('couple');
    expect(alias3).not.toBeNull();
    const { container: c5 } = render(<>{alias3}</>);
    expect(c5.querySelector('img')?.getAttribute('src')).toContain('couple');
  });

  it('CATEGORIES contains Bloques de construccion with brick emoji fallback', () => {
    const bloquesCat = CATEGORIES.find(c => c.name === 'Bloques de construccion');
    expect(bloquesCat).toBeDefined();
    expect(bloquesCat?.emoji).toBe('🧱');
    expect(slugify(bloquesCat!.name)).toBe('bloques-de-construccion');
  });

  it('CATEGORY_ICONS contains an entry for Bloques de construccion with lego_heart.gif image', () => {
    const icon = CATEGORY_ICONS['Bloques de construccion'];
    expect(icon).toBeDefined();

    const { container } = render(<>{icon}</>);
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img?.getAttribute('src')).toContain('lego_heart');
    expect(img?.className).toContain('category-emoji-img');
    expect(img?.className).toContain('category-lego');
  });

  it('getCategoryIcon returns the lego icon for Bloques de construccion and aliases', () => {
    const exact = getCategoryIcon('Bloques de construccion');
    expect(exact).not.toBeNull();
    const { container: c1 } = render(<>{exact}</>);
    expect(c1.querySelector('img')?.getAttribute('src')).toContain('lego_heart');

    const lower = getCategoryIcon('bloques de construccion');
    expect(lower).not.toBeNull();
    const { container: c2 } = render(<>{lower}</>);
    expect(c2.querySelector('img')?.getAttribute('src')).toContain('lego_heart');

    const withAccent = getCategoryIcon('Bloques de construcción');
    expect(withAccent).not.toBeNull();
    const { container: c3 } = render(<>{withAccent}</>);
    expect(c3.querySelector('img')?.getAttribute('src')).toContain('lego_heart');

    const alias1 = getCategoryIcon('lego');
    expect(alias1).not.toBeNull();
    const { container: c4 } = render(<>{alias1}</>);
    expect(c4.querySelector('img')?.getAttribute('src')).toContain('lego_heart');

    const alias2 = getCategoryIcon('legos');
    expect(alias2).not.toBeNull();
    const { container: c5 } = render(<>{alias2}</>);
    expect(c5.querySelector('img')?.getAttribute('src')).toContain('lego_heart');

    const alias3 = getCategoryIcon('bloques');
    expect(alias3).not.toBeNull();
    const { container: c6 } = render(<>{alias3}</>);
    expect(c6.querySelector('img')?.getAttribute('src')).toContain('lego_heart');
  });

  it('CATEGORIES contains Figuras with superhero emoji fallback', () => {
    const figurasCat = CATEGORIES.find(c => c.name === 'Figuras');
    expect(figurasCat).toBeDefined();
    expect(figurasCat?.emoji).toBe('🦸');
    expect(slugify(figurasCat!.name)).toBe('figuras');
  });

  it('CATEGORY_ICONS contains an entry for Figuras with luffy.png image', () => {
    const icon = CATEGORY_ICONS['Figuras'];
    expect(icon).toBeDefined();

    const { container } = render(<>{icon}</>);
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img?.getAttribute('src')).toContain('luffy');
    expect(img?.className).toContain('category-emoji-img');
    expect(img?.className).toContain('category-luffy');
  });

  it('getCategoryIcon returns the luffy icon for Figuras and aliases', () => {
    const exact = getCategoryIcon('Figuras');
    expect(exact).not.toBeNull();
    const { container: c1 } = render(<>{exact}</>);
    expect(c1.querySelector('img')?.getAttribute('src')).toContain('luffy');

    const lower = getCategoryIcon('figuras');
    expect(lower).not.toBeNull();
    const { container: c2 } = render(<>{lower}</>);
    expect(c2.querySelector('img')?.getAttribute('src')).toContain('luffy');

    const alias1 = getCategoryIcon('figura');
    expect(alias1).not.toBeNull();
    const { container: c3 } = render(<>{alias1}</>);
    expect(c3.querySelector('img')?.getAttribute('src')).toContain('luffy');

    const alias2 = getCategoryIcon('figures');
    expect(alias2).not.toBeNull();
    const { container: c4 } = render(<>{alias2}</>);
    expect(c4.querySelector('img')?.getAttribute('src')).toContain('luffy');

    const alias3 = getCategoryIcon('luffy');
    expect(alias3).not.toBeNull();
    const { container: c5 } = render(<>{alias3}</>);
    expect(c5.querySelector('img')?.getAttribute('src')).toContain('luffy');
  });

  it('CATEGORIES contains Peluches with teddy bear emoji fallback', () => {
    const peluchesCat = CATEGORIES.find(c => c.name === 'Peluches');
    expect(peluchesCat).toBeDefined();
    expect(peluchesCat?.emoji).toBe('🧸');
    expect(slugify(peluchesCat!.name)).toBe('peluches');
  });

  it('CATEGORY_ICONS contains an entry for Peluches with hopping_bear.gif image', () => {
    const icon = CATEGORY_ICONS['Peluches'];
    expect(icon).toBeDefined();

    const { container } = render(<>{icon}</>);
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img?.getAttribute('src')).toContain('bear');
    expect(img?.className).toContain('category-emoji-img');
    expect(img?.className).toContain('category-bear');
  });

  it('getCategoryIcon returns the bear icon for Peluches and aliases', () => {
    const peluches = getCategoryIcon('Peluches');
    expect(peluches).not.toBeNull();
    const { container: c2 } = render(<>{peluches}</>);
    expect(c2.querySelector('img')?.getAttribute('src')).toContain('bear');

    const lower = getCategoryIcon('peluches');
    expect(lower).not.toBeNull();
    const { container: c3 } = render(<>{lower}</>);
    expect(c3.querySelector('img')?.getAttribute('src')).toContain('bear');

    const alias1 = getCategoryIcon('peluche');
    expect(alias1).not.toBeNull();
    const { container: c4 } = render(<>{alias1}</>);
    expect(c4.querySelector('img')?.getAttribute('src')).toContain('bear');

    const alias2 = getCategoryIcon('plush');
    expect(alias2).not.toBeNull();
    const { container: c5 } = render(<>{alias2}</>);
    expect(c5.querySelector('img')?.getAttribute('src')).toContain('bear');
  });

  it('returns null for completely unknown category with no match', () => {
    expect(getCategoryIcon('CategoriaInexistente12345')).toBeNull();
    expect(getCategoryIcon('')).toBeNull();
  });
});
