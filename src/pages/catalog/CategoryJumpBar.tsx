import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { CATEGORY_ICONS } from '../../components/ui/CategoryIcons';
import { getCategorySectionId } from './categoryJumpUtils';
import './CategoryJumpBar.css';

export interface CategoryJumpItem {
  name: string;
  emoji: string;
}

function scrollToCategory(categoryName: string) {
  const target = document.getElementById(getCategorySectionId(categoryName));
  if (!target) return;

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  target.scrollIntoView?.({
    behavior: prefersReducedMotion ? 'auto' : 'smooth',
    block: 'start',
  });
}

export function CategoryJumpBar({ categories }: { categories: readonly CategoryJumpItem[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateArrows = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const maxScroll = track.scrollWidth - track.clientWidth;
    const left = track.scrollLeft;
    setCanScrollLeft(left > 2);
    setCanScrollRight(maxScroll > 2 && left < maxScroll - 2);
  }, []);

  useLayoutEffect(() => {
    if (categories.length < 2) return;
    const track = trackRef.current;
    if (!track) return;

    updateArrows();

    let scrollRaf = 0;
    const onScroll = () => {
      if (scrollRaf) return;
      scrollRaf = requestAnimationFrame(() => {
        scrollRaf = 0;
        updateArrows();
      });
    };
    track.addEventListener('scroll', onScroll, { passive: true });

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => updateArrows()) : null;
    ro?.observe(track);

    return () => {
      if (scrollRaf) cancelAnimationFrame(scrollRaf);
      track.removeEventListener('scroll', onScroll);
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
      behavior: 'smooth',
    });
  };

  return (
    <nav className="category-jump-nav" aria-label="Ir a una categoría">
      {canScrollLeft && (
        <button
          type="button"
          className="category-jump-arrow category-jump-arrow--left"
          onClick={() => scrollTrack('left')}
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

      <div className="category-jump-track" ref={trackRef}>
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

      {canScrollRight && (
        <button
          type="button"
          className="category-jump-arrow category-jump-arrow--right"
          onClick={() => scrollTrack('right')}
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
