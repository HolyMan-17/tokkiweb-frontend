import { act, render, screen, fireEvent } from '@testing-library/react';
import { afterEach, describe, it, expect, vi } from 'vitest';
import CategoryJumpBar from './CategoryJumpBar';
import { getCategorySectionId } from './categoryJumpUtils';

const SAMPLE_CATEGORIES = [
  { name: 'Maquillaje', emoji: '💄' },
  { name: 'Pines & Chapas', emoji: '📌' },
  { name: 'Papeleria', emoji: '📝' },
];

function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

function setTrackMetrics(
  track: HTMLDivElement,
  { clientWidth, scrollWidth, scrollLeft }: { clientWidth: number; scrollWidth: number; scrollLeft: number },
) {
  Object.defineProperty(track, 'clientWidth', { configurable: true, value: clientWidth });
  Object.defineProperty(track, 'scrollWidth', { configurable: true, value: scrollWidth });
  Object.defineProperty(track, 'scrollLeft', { configurable: true, writable: true, value: scrollLeft });
}

async function flushTrackScroll(track: HTMLDivElement) {
  await act(async () => {
    fireEvent.scroll(track);
    await nextFrame();
  });
}

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

  it('renders no scroll arrows and no fade classes when pills do not overflow', async () => {
    render(<CategoryJumpBar categories={SAMPLE_CATEGORIES} />);

    const nav = screen.getByRole('navigation', { name: 'Ir a una categoría' });
    const track = nav.querySelector('.category-jump-track') as HTMLDivElement;
    setTrackMetrics(track, { clientWidth: 600, scrollWidth: 420, scrollLeft: 0 });
    await flushTrackScroll(track);

    expect(nav).not.toHaveClass('category-jump-nav--scrollable');
    expect(screen.queryByRole('button', { name: 'Desplazar categorías a la izquierda' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Desplazar categorías a la derecha' })).toBeNull();
    expect(track).not.toHaveClass('category-jump-track--fade-left');
    expect(track).not.toHaveClass('category-jump-track--fade-right');
    expect(track).not.toHaveClass('category-jump-track--fade-both');
  });

  it('shows flanking arrows outside track with fade-right at scrollLeft = 0 when overflowing', async () => {
    render(<CategoryJumpBar categories={SAMPLE_CATEGORIES} />);

    const nav = screen.getByRole('navigation', { name: 'Ir a una categoría' });
    const track = nav.querySelector('.category-jump-track') as HTMLDivElement;
    setTrackMetrics(track, { clientWidth: 400, scrollWidth: 900, scrollLeft: 0 });
    await flushTrackScroll(track);

    expect(nav).toHaveClass('category-jump-nav--scrollable');

    const leftArrow = screen.getByRole('button', { name: 'Desplazar categorías a la izquierda' });
    const rightArrow = screen.getByRole('button', { name: 'Desplazar categorías a la derecha' });

    expect(track.contains(leftArrow)).toBe(false);
    expect(track.contains(rightArrow)).toBe(false);
    expect(leftArrow.compareDocumentPosition(track) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(track.compareDocumentPosition(rightArrow) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    expect(leftArrow).toBeDisabled();
    expect(rightArrow).toBeEnabled();
    expect(track).toHaveClass('category-jump-track--fade-right');
    expect(track).not.toHaveClass('category-jump-track--fade-left');
    expect(track).not.toHaveClass('category-jump-track--fade-both');
  });

  it('enables both arrows and applies fade-both when scrolled to the middle', async () => {
    render(<CategoryJumpBar categories={SAMPLE_CATEGORIES} />);

    const nav = screen.getByRole('navigation', { name: 'Ir a una categoría' });
    const track = nav.querySelector('.category-jump-track') as HTMLDivElement;
    setTrackMetrics(track, { clientWidth: 400, scrollWidth: 900, scrollLeft: 200 });
    await flushTrackScroll(track);

    const leftArrow = screen.getByRole('button', { name: 'Desplazar categorías a la izquierda' });
    const rightArrow = screen.getByRole('button', { name: 'Desplazar categorías a la derecha' });

    expect(leftArrow).toBeEnabled();
    expect(rightArrow).toBeEnabled();
    expect(track).toHaveClass('category-jump-track--fade-both');
    expect(track).not.toHaveClass('category-jump-track--fade-left');
    expect(track).not.toHaveClass('category-jump-track--fade-right');
  });

  it('disables right arrow and applies fade-left when scrolled to the right end', async () => {
    render(<CategoryJumpBar categories={SAMPLE_CATEGORIES} />);

    const nav = screen.getByRole('navigation', { name: 'Ir a una categoría' });
    const track = nav.querySelector('.category-jump-track') as HTMLDivElement;
    setTrackMetrics(track, { clientWidth: 400, scrollWidth: 900, scrollLeft: 500 });
    await flushTrackScroll(track);

    const leftArrow = screen.getByRole('button', { name: 'Desplazar categorías a la izquierda' });
    const rightArrow = screen.getByRole('button', { name: 'Desplazar categorías a la derecha' });

    expect(leftArrow).toBeEnabled();
    expect(rightArrow).toBeDisabled();
    expect(track).toHaveClass('category-jump-track--fade-left');
    expect(track).not.toHaveClass('category-jump-track--fade-right');
    expect(track).not.toHaveClass('category-jump-track--fade-both');
  });

  it('scrolls track horizontally on arrow click and respects prefers-reduced-motion', async () => {
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

    const nav = screen.getByRole('navigation', { name: 'Ir a una categoría' });
    const track = nav.querySelector('.category-jump-track') as HTMLDivElement;
    const scrollByMock = vi.fn();
    track.scrollBy = scrollByMock;
    setTrackMetrics(track, { clientWidth: 400, scrollWidth: 900, scrollLeft: 200 });
    await flushTrackScroll(track);

    const leftArrow = screen.getByRole('button', { name: 'Desplazar categorías a la izquierda' });
    const rightArrow = screen.getByRole('button', { name: 'Desplazar categorías a la derecha' });

    fireEvent.click(rightArrow);
    expect(scrollByMock).toHaveBeenCalledWith({ left: 240, behavior: 'smooth' });

    fireEvent.click(leftArrow);
    expect(scrollByMock).toHaveBeenCalledWith({ left: -240, behavior: 'smooth' });

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

    fireEvent.click(rightArrow);
    expect(scrollByMock).toHaveBeenLastCalledWith({ left: 240, behavior: 'auto' });
  });
});
