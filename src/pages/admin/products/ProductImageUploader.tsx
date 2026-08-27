import type { RefObject } from 'react';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

interface ProductImageUploaderProps {
  previewUrl: string;
  imageFileRef: RefObject<File | null>;
  setPreviewUrl: (url: string) => void;
  showToast: (msg: string) => void;
  onImageTooLarge: () => void;
  onRemoveCurrent: () => void;
}

export function ProductImageUploader({
  previewUrl,
  imageFileRef,
  setPreviewUrl,
  showToast,
  onImageTooLarge,
  onRemoveCurrent,
}: ProductImageUploaderProps) {
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      showToast('Formato no soportado. Usa JPG, PNG o WEBP.');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      onImageTooLarge();
      return;
    }
    imageFileRef.current = file;
    const reader = new FileReader();
    reader.onload = (event) => {
      setPreviewUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemove = () => {
    if (imageFileRef.current) {
      imageFileRef.current = null;
      onRemoveCurrent();
      return;
    }
    onRemoveCurrent();
  };

  return (
    <div className="form-group">
      <label className="form-label" htmlFor="product_image_input">
        Foto del Producto
      </label>
      <div className={`image-uploader ${previewUrl ? 'has-image' : ''}`}>
        {previewUrl ? (
          <>
            <img
              src={previewUrl}
              alt="Vista previa del producto"
              className="image-uploader-preview"
            />
            <div className="image-uploader-overlay">
              <label className="image-uploader-btn" htmlFor="product_image_input">
                Cambiar
                <input
                  id="product_image_input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageChange}
                  hidden
                />
              </label>
              <button
                type="button"
                className="image-uploader-btn image-uploader-remove"
                onClick={handleRemove}
              >
                Quitar
              </button>
            </div>
          </>
        ) : (
          <label className="image-uploader-empty" htmlFor="product_image_input">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="18" height="18" rx="4" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
            <span>Subir foto</span>
            <small>JPG, PNG, WEBP (máx. 5 MB)</small>
            <input
              id="product_image_input"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageChange}
              hidden
            />
          </label>
        )}
      </div>
    </div>
  );
}

export default ProductImageUploader;
