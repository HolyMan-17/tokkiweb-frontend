import { useCallback, useEffect, useRef, useState } from 'react';
import { compressImage } from '../../../utils/compressImage';

export const MAX_PRODUCT_IMAGES = 5;

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

export type GalleryItem =
  | { id: string; kind: 'existing'; url: string; previewUrl: string }
  | {
      id: string;
      kind: 'pending';
      file: File;
      previewUrl: string;
      status: 'queued' | 'uploading' | 'done' | 'failed';
      uploadedUrl?: string;
    };

interface ProductImagesUploaderProps {
  gallery: GalleryItem[];
  onFilesSelected: (files: File[]) => void;
  onRemoveItem: (id: string) => void;
  onMakeCover: (id: string) => void;
  showToast: (msg: string) => void;
  onImageTooLarge: () => void;
}

export function ProductImagesUploader({
  gallery,
  onFilesSelected,
  onRemoveItem,
  onMakeCover,
  showToast,
  onImageTooLarge,
}: ProductImagesUploaderProps) {
  const slotsUsed = gallery.length;
  const remaining = Math.max(0, MAX_PRODUCT_IMAGES - slotsUsed);
  const isFull = remaining === 0;

  const [activeIndex, setActiveIndex] = useState(0);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);

  const currentActiveIndex = gallery.length > 0 ? Math.min(activeIndex, gallery.length - 1) : 0;

  const handleScroll = useCallback(() => {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const track = trackRef.current;
      if (!track) return;
      const slide = track.firstElementChild as HTMLElement | null;
      const slideWidth = slide?.clientWidth ?? 0;
      if (slideWidth > 0) {
        const nextIndex = Math.min(
          Math.max(0, Math.round(track.scrollLeft / slideWidth)),
          gallery.length - 1,
        );
        setActiveIndex(nextIndex);
      }
    });
  }, [gallery.length]);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const scrollToIndex = (index: number) => {
    const target = Math.min(Math.max(0, index), gallery.length - 1);
    setActiveIndex(target);
    const track = trackRef.current;
    const slide = track?.children[target] as HTMLElement | undefined;
    if (track && slide) {
      track.scrollTo?.({ left: slide.offsetLeft, behavior: 'smooth' });
    }
  };

  const handleFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (raw.length === 0) return;

    const valid: File[] = [];
    let droppedByCap = false;
    for (const file of raw) {
      if (valid.length >= remaining) {
        droppedByCap = true;
        break;
      }
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        showToast(`Formato no soportado (${file.name}). Usa JPG, PNG o WEBP.`);
        continue;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        onImageTooLarge();
        continue;
      }
      valid.push(file);
    }
    if (droppedByCap) {
      showToast(
        remaining === 1
          ? 'Solo puedes agregar 1 imagen más.'
          : `Solo puedes agregar ${remaining} imágenes más.`,
      );
    }
    if (valid.length === 0) return;

    const processed = await Promise.all(valid.map((file) => compressImage(file)));
    onFilesSelected(processed);
  };

  if (slotsUsed === 0) {
    return (
      <div className="form-group">
        <div className="images-uploader-header">
          <span className="form-label">
            Fotos del Producto (0/{MAX_PRODUCT_IMAGES})
          </span>
        </div>
        <div className="images-carousel">
          <label className="image-uploader-empty" htmlFor="product_images_input">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="3" width="18" height="18" rx="4" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
            <span>Subir fotos</span>
            <small>JPG, PNG, WEBP (máx. 5 MB)</small>
            <input
              id="product_images_input"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handleFilesChange}
              hidden
            />
          </label>
        </div>
      </div>
    );
  }

  return (
    <div className="form-group">
      <div className="images-uploader-header">
        <span className="form-label">
          Fotos del Producto ({slotsUsed}/{MAX_PRODUCT_IMAGES})
        </span>
        {isFull && (
          <span className="images-uploader-full-chip">Máximo {MAX_PRODUCT_IMAGES} imágenes</span>
        )}
      </div>

      <div className="images-carousel">
        <div
          className="images-carousel-track"
          ref={trackRef}
          onScroll={handleScroll}
          role="region"
          aria-label="Galería de imágenes del producto"
        >
          {gallery.map((item, index) => (
            <div
              key={item.id}
              className={`images-carousel-slide${index === 0 ? ' is-cover' : ''}${item.kind === 'pending' && item.status === 'failed' ? ' has-error' : ''}`}
            >
              <img
                src={item.previewUrl}
                alt={`Imagen ${index + 1} del producto`}
                className="images-carousel-img"
              />
              {index === 0 && (
                <span className="images-uploader-cover-badge">Portada</span>
              )}
              {item.kind === 'pending' && item.status === 'failed' && (
                <span className="images-uploader-error-chip">Falló</span>
              )}
              <div className="images-carousel-slide-overlay">
                <div className="images-carousel-actions">
                  {index > 0 && (
                    <button
                      type="button"
                      className="images-uploader-action images-uploader-cover-btn"
                      onClick={() => onMakeCover(item.id)}
                      aria-label={`Hacer portada la imagen ${index + 1}`}
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        stroke="none"
                        aria-hidden="true"
                      >
                        <polygon points="12 2 15 9 22 9.3 16.5 13.8 18.5 21 12 17 5.5 21 7.5 13.8 2 9.3 9 9" />
                      </svg>
                      Portada
                    </button>
                  )}
                  <button
                    type="button"
                    className="images-uploader-action images-uploader-remove"
                    onClick={() => onRemoveItem(item.id)}
                    aria-label={`Quitar imagen ${index + 1}`}
                  >
                    Quitar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {gallery.length > 1 && (
          <>
            <button
              type="button"
              className="images-carousel-arrow images-carousel-prev"
              onClick={() => scrollToIndex(currentActiveIndex - 1)}
              disabled={currentActiveIndex === 0}
              aria-label="Ver imagen anterior"
            >
              ‹
            </button>
            <button
              type="button"
              className="images-carousel-arrow images-carousel-next"
              onClick={() => scrollToIndex(currentActiveIndex + 1)}
              disabled={currentActiveIndex === gallery.length - 1}
              aria-label="Ver imagen siguiente"
            >
              ›
            </button>
          </>
        )}

        {!isFull && (
          <label
            className="images-carousel-floating-add"
            htmlFor="product_images_input"
            aria-label="Agregar otra foto"
            title="Agregar otra foto"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <input
              id="product_images_input"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handleFilesChange}
              hidden
            />
          </label>
        )}
      </div>

      <div className="images-carousel-footer">
        <div className="images-carousel-dots" aria-label="Indicadores de fotos">
          {gallery.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className={`images-carousel-dot${index === currentActiveIndex ? ' active' : ''}`}
              onClick={() => scrollToIndex(index)}
              aria-label={`Ir a imagen ${index + 1}`}
            />
          ))}
        </div>
        <span className="images-carousel-counter">
          {currentActiveIndex + 1} / {gallery.length}
        </span>
      </div>
    </div>
  );
}

export default ProductImagesUploader;
