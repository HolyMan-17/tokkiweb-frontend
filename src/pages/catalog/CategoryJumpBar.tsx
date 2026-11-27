import { useCallback, useEffect, useRef, useState } from 'react';
import { CATEGORY_ICONS } from '../../components/ui/CategoryIcons';
import { getCategorySectionId } from './categoryJumpUtils';
import './CategoryJumpBar.css';

export interface CategoryJumpItem {
  name: string;
  emoji: string;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function scrollToCategory(categoryName: string) {
  const target = document.getElementById(getCategorySectionId(categoryName));
  if (!target) return;

  target.scrollIntoView?.({
    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    block: 'start',
  });
}

export function CategoryJumpBar({ categories }: { categories: readonly CategoryJumpItem[] }) {
  const navRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [isScrollable, setIsScrollable] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateArrows = useCallback(() => {
    const nav = navRef.current;
    const track = trackRef.current;
    if (!nav || !track) return;

    const isDesktop =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(min-width: 768px)').matches;
    const navPaddingInline = isDesktop ? 64 : 0;
    const navInnerWidth = nav.clientWidth - navPaddingInline;
    // Compare against the nav's invariant inner width when available so toggling
    // sibling arrow buttons cannot feed back into ResizeObserver measurements.
    const availableWidth = navInnerWidth > 0 ? navInnerWidth : track.clientWidth;
    const overflows = track.scrollWidth > availableWidth + 2;

    if (!overflows) {
      setIsScrollable(false);
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }

    const maxScroll = track.scrollWidth - track.clientWidth;
    const left = track.scrollLeft;
    setIsScrollable(true);
    setCanScrollLeft(left > 2);
    setCanScrollRight(maxScroll > 2 && left < maxScroll - 2);
  }, []);

  useEffect(() => {
    if (categories.length < 2) return;
    const nav = navRef.current;
    const track = trackRef.current;
    if (!nav || !track) return;

    let rafId = 0;
    const scheduleMeasure = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        updateArrows();
      });
    };

    scheduleMeasure();
    track.addEventListener('scroll', scheduleMeasure, { passive: true });

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(scheduleMeasure) : null;
    ro?.observe(nav);
    ro?.observe(track);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      track.removeEventListener('scroll', scheduleMeasure);
      ro?.disconnect();
    };
  }, [categories.length, updateArrows]);

  if (categories.length < 2) {
    return null;
  }

  const scrollTrack = (dir: 'left' | 'right') => {
    const track = trackRef.current;
    if (!track) return;
    const step = Math.max(200, Math.round(track.clientWidth * 0.6));
    track.scrollBy?.({
      left: dir === 'right' ? step : -step,
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    });
  };

  const fadeClass =
    canScrollLeft && canScrollRight
      ? 'category-jump-track--fade-both'
      : canScrollLeft
        ? 'category-jump-track--fade-left'
        : canScrollRight
          ? 'category-jump-track--fade-right'
          : '';

  return (
    <nav
      ref={navRef}
      className={isScrollable ? 'category-jump-nav category-jump-nav--scrollable' : 'category-jump-nav'}
      aria-label="Ir a una categoría"
    >
      {isScrollable && (
        <button
          type="button"
          className="category-jump-arrow category-jump-arrow--left"
          onClick={() => scrollTrack('left')}
          disabled={!canScrollLeft}
          aria-label="Desplazar categorías a la izquierda"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      )}

      <div
        className={fadeClass ? `category-jump-track ${fadeClass}` : 'category-jump-track'}
        ref={trackRef}
      >
        {categories.map((cat) => (
          <button
            key={cat.name}
            type="button"
            className="category-jump-pill"
            onClick={() => scrollToCategory(cat.name)}
          >
            <span className="category-jump-pill-icon" aria-hidden="true">
              {CATEGORY_ICONS[cat.name] ?? cat.emoji}
            </span>
            <span className="category-jump-pill-label">{cat.name}</span>
          </button>
        ))}
      </div>

      {isScrollable && (
        <button
          type="button"
          className="category-jump-arrow category-jump-arrow--right"
          onClick={() => scrollTrack('right')}
          disabled={!canScrollRight}
          aria-label="Desplazar categorías a la derecha"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      )}
    </nav>
  );
}

export default CategoryJumpBar;
