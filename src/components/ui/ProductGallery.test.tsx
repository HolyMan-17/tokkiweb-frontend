import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { computeActiveIndex } from './galleryUtils';
import ProductGallery from './ProductGallery';

const IMAGES = [
  'http://x/images/products/aaaaaaaa-1111-4111-8111-111111111111.webp',
  'http://x/images/products/bbbbbbbb-2222-4222-8222-222222222222.webp',
  'http://x/images/products/cccccccc-3333-4333-8333-333333333333.webp',
];

describe('computeActiveIndex', () => {
  it('redondea el desplazamiento al índice de la diapositiva', () => {
    expect(computeActiveIndex(0, 300, 3)).toBe(0);
    expect(computeActiveIndex(300, 300, 3)).toBe(1);
    expect(computeActiveIndex(450, 300, 3)).toBe(2);
  });

  it('acota el índice al rango válido', () => {
    expect(computeActiveIndex(-100, 300, 3)).toBe(0);
    expect(computeActiveIndex(9000, 300, 3)).toBe(2);
  });

  it('devuelve 0 con datos de maquetación ausentes (ancho 0)', () => {
    expect(computeActiveIndex(150, 0, 3)).toBe(0);
  });
});

describe('ProductGallery', () => {
  let scrollToMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    scrollToMock = vi.fn();
    (Element.prototype as unknown as { scrollTo: unknown }).scrollTo = scrollToMock;
  });

  afterEach(() => {
    delete (Element.prototype as unknown as { scrollTo?: unknown }).scrollTo;
    vi.restoreAllMocks();
  });

  it('muestra el marcador con la inicial cuando no hay imágenes', () => {
    render(<ProductGallery name="Gloss Fresa" images={[]} />);

    const container = document.querySelector('.product-image-container');
    expect(container).not.toBeNull();
    expect(document.querySelector('.product-image-placeholder')).not.toBeNull();
    expect(screen.getByText('G')).toBeInTheDocument();
    expect(document.querySelector('.product-gallery-track')).toBeNull();
    expect(document.querySelector('.product-gallery-thumbs')).toBeNull();
  });

  it('muestra una imagen estática cuando hay una sola', () => {
    render(<ProductGallery name="Gloss Fresa" images={[IMAGES[0]]} />);

    const img = document.querySelector('.product-image') as HTMLImageElement | null;
    expect(img).not.toBeNull();
    expect(img?.getAttribute('src')).toBe(IMAGES[0]);
    expect(img?.getAttribute('alt')).toBe('Gloss Fresa');
    expect(document.querySelector('.product-gallery-track')).toBeNull();
    expect(document.querySelector('.product-gallery-thumbs')).toBeNull();
  });

  it('renderiza pista, diapositivas y miniaturas con etiquetas accesibles', () => {
    render(<ProductGallery name="Set Kawaii" images={IMAGES} />);

    const track = document.querySelector('.product-gallery-track');
    expect(track).not.toBeNull();
    expect(track?.getAttribute('aria-label')).toBe('Imágenes de Set Kawaii');

    const slides = document.querySelectorAll('.product-gallery-slide');
    expect(slides).toHaveLength(3);
    const imgs = document.querySelectorAll('.product-gallery-img');
    expect(imgs[0].getAttribute('alt')).toBe('Set Kawaii — imagen 1');
    expect(imgs[1].getAttribute('alt')).toBe('Set Kawaii — imagen 2');
    expect(imgs[0].getAttribute('loading')).toBe('eager');
    expect(imgs[1].getAttribute('loading')).toBe('lazy');

    const thumbs = document.querySelectorAll('.product-gallery-thumb');
    expect(thumbs).toHaveLength(3);
    expect(screen.getByRole('button', { name: 'Ver imagen 1 de 3' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver imagen 3 de 3' })).toBeInTheDocument();
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
  });

  it('marca la primera miniatura como activa y salta a la elegida al hacer clic', async () => {
    render(<ProductGallery name="Set Kawaii" images={IMAGES} />);

    const firstThumb = screen.getByRole('button', { name: 'Ver imagen 1 de 3' });
    expect(firstThumb).toHaveClass('active');
    expect(firstThumb.getAttribute('aria-current')).toBe('true');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Ver imagen 2 de 3' }));
    });

    const secondThumb = screen.getByRole('button', { name: 'Ver imagen 2 de 3' });
    expect(secondThumb).toHaveClass('active');
    expect(secondThumb.getAttribute('aria-current')).toBe('true');
    expect(firstThumb).not.toHaveClass('active');
    expect(scrollToMock).toHaveBeenCalled();
  });

  it('actualiza el índice activo al deslizar (evento scroll)', async () => {
    const { container } = render(<ProductGallery name="Set Kawaii" images={IMAGES} />);

    const track = container.querySelector('.product-gallery-track') as HTMLElement;
    const firstSlide = container.querySelector('.product-gallery-slide') as HTMLElement;
    Object.defineProperty(firstSlide, 'clientWidth', { value: 300, configurable: true });

    await act(async () => {
      track.scrollLeft = 300;
      fireEvent.scroll(track);
      await new Promise((resolve) => setTimeout(resolve, 30));
    });

    const secondThumb = screen.getByRole('button', { name: 'Ver imagen 2 de 3' });
    expect(secondThumb).toHaveClass('active');
  });

  it('navega con las flechas de escritorio (anterior y siguiente)', async () => {
    render(<ProductGallery name="Set Kawaii" images={IMAGES} />);

    const nextBtn = screen.getByRole('button', { name: 'Imagen siguiente' });
    const prevBtn = screen.getByRole('button', { name: 'Imagen anterior' });

    expect(prevBtn).toBeDisabled();
    expect(nextBtn).toBeEnabled();

    await act(async () => {
      fireEvent.click(nextBtn);
    });

    expect(scrollToMock).toHaveBeenCalled();
  });

  it('activa y desactiva la visibilidad de controles al tocar/hacer clic', async () => {
    vi.useFakeTimers();
    const { container } = render(<ProductGallery name="Set Kawaii" images={IMAGES} />);

    const gallery = container.querySelector('.product-gallery') as HTMLElement;
    expect(gallery).not.toHaveClass('controls-visible');

    // Tap/click shows controls
    await act(async () => {
      fireEvent.click(gallery);
    });
    expect(gallery).toHaveClass('controls-visible');

    // Auto-hides after 3500ms idle
    await act(async () => {
      vi.advanceTimersByTime(3500);
    });
    expect(gallery).not.toHaveClass('controls-visible');

    vi.useRealTimers();
  });
});
