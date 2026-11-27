import { describe, expect, it } from 'vitest';
import {
  isOptimizableProductImage,
  getProductImageUrl,
  getProductCardImageAttrs,
  getProductGalleryImageAttrs,
  getProductThumbUrl,
} from './productImage';

const UUID_RELATIVE = '/images/products/aaaaaaaa-1111-4111-8111-111111111111.webp';
const UUID_ABSOLUTE =
  'https://www.tokkishopve.com/images/products/bbbbbbbb-2222-4222-8222-222222222222.webp';

describe('productImage responsive URL helpers', () => {
  it('identifies only clean UUID product WebP URLs as optimizable', () => {
    expect(isOptimizableProductImage(UUID_RELATIVE)).toBe(true);
    expect(isOptimizableProductImage(UUID_ABSOLUTE)).toBe(true);
    expect(isOptimizableProductImage('https://example.com/mochi.jpg')).toBe(false);
    expect(isOptimizableProductImage('/images/products/sample-1.png')).toBe(false);
    expect(isOptimizableProductImage(`${UUID_RELATIVE}?w=400`)).toBe(false);
    expect(isOptimizableProductImage('data:image/webp;base64,AAAA')).toBe(false);
    expect(isOptimizableProductImage('')).toBe(false);
  });

  it('appends ?w= only to optimizable product URLs and passes others through unchanged', () => {
    expect(getProductImageUrl(UUID_RELATIVE, 400)).toBe(`${UUID_RELATIVE}?w=400`);
    expect(getProductImageUrl(UUID_ABSOLUTE, 800)).toBe(`${UUID_ABSOLUTE}?w=800`);
    expect(getProductImageUrl('https://example.com/mochi.jpg', 400)).toBe(
      'https://example.com/mochi.jpg',
    );
    expect(getProductImageUrl('/images/products/sample-1.png', 400)).toBe(
      '/images/products/sample-1.png',
    );
  });

  it('returns responsive src/srcSet/sizes for ProductCard on optimizable URLs and plain src otherwise', () => {
    expect(getProductCardImageAttrs(UUID_RELATIVE)).toEqual({
      src: `${UUID_RELATIVE}?w=400`,
      srcSet: `${UUID_RELATIVE}?w=400 400w, ${UUID_RELATIVE}?w=800 800w`,
      sizes: '(min-width: 768px) 240px, 46vw',
    });

    expect(getProductCardImageAttrs('https://example.com/mochi.jpg')).toEqual({
      src: 'https://example.com/mochi.jpg',
    });
  });

  it('returns 800w default with 400w/800w/1600w srcSet for ProductGallery main images', () => {
    expect(getProductGalleryImageAttrs(UUID_ABSOLUTE)).toEqual({
      src: `${UUID_ABSOLUTE}?w=800`,
      srcSet: `${UUID_ABSOLUTE}?w=400 400w, ${UUID_ABSOLUTE}?w=800 800w, ${UUID_ABSOLUTE} 1600w`,
      sizes: '(min-width: 768px) 480px, 100vw',
    });

    expect(getProductGalleryImageAttrs('/images/products/sample-1.png')).toEqual({
      src: '/images/products/sample-1.png',
    });
  });

  it('returns 400w thumbnail URL for search, admin, and gallery thumbs', () => {
    expect(getProductThumbUrl(UUID_RELATIVE)).toBe(`${UUID_RELATIVE}?w=400`);
    expect(getProductThumbUrl('/images/products/sample-1.png')).toBe(
      '/images/products/sample-1.png',
    );
  });
});
