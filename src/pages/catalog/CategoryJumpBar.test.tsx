import { render, screen, fireEvent } from '@testing-library/react';
import { afterEach, describe, it, expect, vi } from 'vitest';
import CategoryJumpBar from './CategoryJumpBar';
import { getCategorySectionId } from './categoryJumpUtils';

const SAMPLE_CATEGORIES = [
  { name: 'Maquillaje', emoji: '💄' },
  { name: 'Pines & Chapas', emoji: '📌' },
  { name: 'Papeleria', emoji: '📝' },
];

describe('CategoryJumpBar', () => {
  const originalMatchMedia = window.matchMedia;

  afterEach(() => {
    document.body.innerHTML = '';
    if (originalMatchMedia) {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        configurable: true,
        value: originalMatchMedia,
      });
    }
    vi.restoreAllMocks();
  });

  it('returns null (renders no nav) when categories has 0 or 1 item', () => {
    const { container: emptyContainer } = render(<CategoryJumpBar categories={[]} />);
    expect(emptyContainer.firstChild).toBeNull();
    expect(screen.queryByRole('navigation', { name: 'Ir a una categoría' })).toBeNull();

    const { container: singleContainer } = render(
      <CategoryJumpBar categories={[SAMPLE_CATEGORIES[0]]} />,
    );
    expect(singleContainer.firstChild).toBeNull();
    expect(screen.queryByRole('navigation', { name: 'Ir a una categoría' })).toBeNull();
  });

  it('renders a nav with one pill button per active category in order, showing name and icon', () => {
    render(<CategoryJumpBar categories={SAMPLE_CATEGORIES} />);

    const nav = screen.getByRole('navigation', { name: 'Ir a una categoría' });
    expect(nav).toBeInTheDocument();

    const buttons = Array.from(nav.querySelectorAll('button.category-jump-pill'));
    expect(buttons).toHaveLength(3);
    expect(buttons.map((b) => b.textContent?.trim())).toEqual([
      'Maquillaje',
      'Pines & Chapas',
      'Papeleria',
    ]);

    for (const button of buttons) {
      expect(button.querySelector('.category-emoji-img')).not.toBeNull();
    }
  });

  it('scrolls smoothly to the matching section element for normal and &-containing slugs', () => {
    const papeleriaSection = document.createElement('section');
    papeleriaSection.id = getCategorySectionId('Papeleria');
    const papeleriaScroll = vi.fn();
    papeleriaSection.scrollIntoView = papeleriaScroll;
    document.body.appendChild(papeleriaSection);

    const pinesSection = document.createElement('section');
    pinesSection.id = getCategorySectionId('Pines & Chapas');
    const pinesScroll = vi.fn();
    pinesSection.scrollIntoView = pinesScroll;
    document.body.appendChild(pinesSection);

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });

    render(<CategoryJumpBar categories={SAMPLE_CATEGORIES} />);

    fireEvent.click(screen.getByRole('button', { name: 'Papeleria' }));
    expect(papeleriaScroll).toHaveBeenCalledTimes(1);
    expect(papeleriaScroll).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });

    fireEvent.click(screen.getByRole('button', { name: 'Pines & Chapas' }));
    expect(pinesScroll).toHaveBeenCalledTimes(1);
    expect(pinesScroll).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
  });

  it('uses behavior: auto when prefers-reduced-motion: reduce matches', () => {
    const papeleriaSection = document.createElement('section');
    papeleriaSection.id = getCategorySectionId('Papeleria');
    const scrollMock = vi.fn();
    papeleriaSection.scrollIntoView = scrollMock;
    document.body.appendChild(papeleriaSection);

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });

    render(<CategoryJumpBar categories={SAMPLE_CATEGORIES} />);

    fireEvent.click(screen.getByRole('button', { name: 'Papeleria' }));
    expect(scrollMock).toHaveBeenCalledWith({ behavior: 'auto', block: 'start' });
  });
});
