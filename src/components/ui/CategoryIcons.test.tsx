import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { CATEGORY_ICONS, getCategoryIcon } from './CategoryIcons';
import { CATEGORIES } from '../../constants';

describe('CategoryIcons & CATEGORIES invariants', () => {
  it('every entry in CATEGORIES resolves to a brand <img> icon with category-emoji-img class', () => {
    for (const cat of CATEGORIES) {
      expect(CATEGORY_ICONS[cat.name], `Missing CATEGORY_ICONS entry for ${cat.name}`).toBeDefined();
      const icon = getCategoryIcon(cat.name);
      expect(icon, `getCategoryIcon("${cat.name}") should not be null`).not.toBeNull();

      const { container } = render(<>{icon}</>);
      const img = container.querySelector('img');
      expect(img, `Icon for ${cat.name} should render an <img>`).not.toBeNull();
      expect(img?.className).toContain('category-emoji-img');
      expect(img?.getAttribute('src')).toBeTruthy();
    }
  });

  it.each([
    ['Zona KPOP', 'kpop'],
    ['k-pop', 'kpop'],
    ['Albumes', 'album_icon'],
    ['Álbumes', 'album_icon'],
    ['cd', 'album_icon'],
    ['Bolsas o cajas de regalo', 'gift'],
    ['regalos', 'gift'],
    ['Dulces & Comida Asiatica', 'treat'],
    ['Dulces Asiáticos', 'treat'],
    ['Bolsos y Carteras', 'purse'],
    ['carteras', 'purse'],
    ['Cosplays', 'cosplay'],
    ['disfraces', 'cosplay'],
    ['Para ellos', 'spiderman'],
    ['hombres', 'spiderman'],
    ['Regalos de pareja', 'couple'],
    ['novios', 'couple'],
    ['Bloques de construccion', 'lego_heart'],
    ['lego', 'lego_heart'],
    ['Figuras', 'luffy'],
    ['luffy', 'luffy'],
    ['Peluches', 'bear'],
    ['plush', 'bear'],
    ['Llaveros', 'keychain_art'],
    ['keychain', 'keychain_art'],
    ['Menos de un dolar', 'cash'],
    ['menos-de-un-dolar', 'cash'],
    ['Papeleria', 'paper_crane'],
    ['Papelería', 'paper_crane'],
    ['stationery', 'paper_crane'],
    ['Accesorios', 'ring'],
  ])('getCategoryIcon("%s") resolves to asset matching "%s"', (input, expectedAsset) => {
    const icon = getCategoryIcon(input);
    expect(icon).not.toBeNull();
    const { container } = render(<>{icon}</>);
    expect(container.querySelector('img')?.getAttribute('src')).toContain(expectedAsset);
  });

  it('returns null for unknown or empty category names', () => {
    expect(getCategoryIcon('CategoriaInexistente12345')).toBeNull();
    expect(getCategoryIcon('')).toBeNull();
  });
});
