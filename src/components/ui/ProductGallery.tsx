import { useCallback, useEffect, useRef, useState } from 'react';
import { computeActiveIndex } from './galleryUtils';
import './ProductGallery.css';

interface ProductGalleryProps {
  name: string;
  images: string[];
}

export default function ProductGallery({ name, images }: ProductGalleryProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const hideTimerRef = useRef<number | null>(null);

  const [activeIndex, setActiveIndex] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(false);

  const gallery = images.length > 1;

  const showControlsTemporarily = useCallback(() => {
    setControlsVisible(true);
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
    }
    hideTimerRef.current = window.setTimeout(() => {
      setControlsVisible(false);
      hideTimerRef.current = null;
    }, 3500);
  }, []);

  const handleScroll = useCallback(() => {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const track = trackRef.current;
      if (!track) return;
      const slide = track.firstElementChild as HTMLElement | null;
      setActiveIndex(computeActiveIndex(track.scrollLeft, slide?.clientWidth ?? 0, images.length));
    });
  }, [images.length]);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      if (hideTimerRef.current !== null) window.clearTimeout(hideTimerRef.current);
    };
  }, []);

  if (!gallery) {
    return (
      <div className="product-image-container animate-scaleIn">
        {images.length === 1 ? (
          <img src={images[0]} alt={name} className="product-image" />
        ) : (
          <div className="product-image-placeholder">{name.charAt(0).toUpperCase()}</div>
        )}
      </div>
    );
  }

  const scrollToIndex = (index: number) => {
    const target = Math.min(Math.max(0, index), images.length - 1);
    setActiveIndex(target);
    const track = trackRef.current;
    const slide = track?.children[target] as HTMLElement | undefined;
    if (track && slide) {
      track.scrollTo?.({ left: slide.offsetLeft, behavior: 'smooth' });
    }
  };

  const handleThumbClick = (index: number) => {
    showControlsTemporarily();
    scrollToIndex(index);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    showControlsTemporarily();
    scrollToIndex(activeIndex - 1);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    showControlsTemporarily();
    scrollToIndex(activeIndex + 1);
  };

  return (
    <div
      className={`product-image-container product-gallery animate-scaleIn${controlsVisible ? ' controls-visible' : ''}`}
      onClick={showControlsTemporarily}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          showControlsTemporarily();
        }
      }}
      role="region"
      tabIndex={0}
      aria-label={`Galería de fotos de ${name}`}
      onTouchStart={showControlsTemporarily}
    >
      <div
        className="product-gallery-track"
        ref={trackRef}
        onScroll={handleScroll}
        role="group"
        aria-roledescription="carrusel"
        aria-label={`Imágenes de ${name}`}
      >
        {images.map((url, index) => (
          <div className="product-gallery-slide" key={url}>
            <img
              src={url}
              alt={`${name} — imagen ${index + 1}`}
              className="product-gallery-img"
              loading={index === 0 ? 'eager' : 'lazy'}
              draggable={false}
            />
          </div>
        ))}
      </div>

      <span className="product-gallery-counter" aria-hidden="true">
        {activeIndex + 1} / {images.length}
      </span>

      <div className="product-gallery-controls">
        <button
          type="button"
          className="product-gallery-arrow product-gallery-arrow-prev"
          onClick={handlePrev}
          disabled={activeIndex === 0}
          aria-label="Imagen anterior"
        >
          ‹
        </button>

        <button
          type="button"
          className="product-gallery-arrow product-gallery-arrow-next"
          onClick={handleNext}
          disabled={activeIndex === images.length - 1}
          aria-label="Imagen siguiente"
        >
          ›
        </button>

        <div className="product-gallery-thumbs" aria-label={`Miniaturas de ${name}`}>
          {images.map((url, index) => (
            <button
              key={url}
              type="button"
              className={`product-gallery-thumb${index === activeIndex ? ' active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                handleThumbClick(index);
              }}
              aria-label={`Ver imagen ${index + 1} de ${images.length}`}
              aria-current={index === activeIndex ? 'true' : undefined}
            >
              <img
                src={url}
                alt=""
                className="product-gallery-thumb-img"
                loading="lazy"
                draggable={false}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
