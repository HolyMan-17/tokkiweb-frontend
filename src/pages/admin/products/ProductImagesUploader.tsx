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

  return (
    <div className="form-group">
      <span className="form-label">
        Fotos del Producto ({slotsUsed}/{MAX_PRODUCT_IMAGES})
      </span>
      <div className="images-uploader-grid">
        {gallery.map((item, index) => (
          <div
            key={item.id}
            className={`images-uploader-slot${index === 0 ? ' is-cover' : ''}${item.kind === 'pending' && item.status === 'failed' ? ' has-error' : ''}`}
          >
            <img
              src={item.previewUrl}
              alt={`Imagen ${index + 1} del producto`}
              className="images-uploader-thumb"
            />
            {index === 0 ? (
              <span className="images-uploader-cover-badge">Portada</span>
            ) : (
              <div className="images-uploader-slot-actions">
                <button
                  type="button"
                  className="images-uploader-action"
                  onClick={() => onMakeCover(item.id)}
                  aria-label={`Hacer portada la imagen ${index + 1}`}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polygon points="12 2 15 9 22 9.3 16.5 13.8 18.5 21 12 17 5.5 21 7.5 13.8 2 9.3 9 9" />
                  </svg>
                  Portada
                </button>
                <button
                  type="button"
                  className="images-uploader-action images-uploader-remove"
                  onClick={() => onRemoveItem(item.id)}
                  aria-label={`Quitar imagen ${index + 1}`}
                >
                  Quitar
                </button>
              </div>
            )}
            {item.kind === 'pending' && item.status === 'failed' && (
              <span className="images-uploader-error-chip">Falló</span>
            )}
          </div>
        ))}
        {!isFull && (
          <label className="images-uploader-add" htmlFor="product_images_input">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="3" width="18" height="18" rx="4" />
              <line x1="12" y1="8" x2="12" y2="16" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
            <span>Agregar</span>
            <small>JPG, PNG, WEBP</small>
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
        {isFull && (
          <div className="images-uploader-full">Máximo {MAX_PRODUCT_IMAGES} imágenes</div>
        )}
      </div>
    </div>
  );
}

export default ProductImagesUploader;
