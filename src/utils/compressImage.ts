export const COMPRESS_THRESHOLD_BYTES = 1024 * 1024;
export const MAX_DIMENSION_PX = 1600;
export const RETRY_THRESHOLD_BYTES = 1536 * 1024;

const INITIAL_QUALITY = 0.82;
const RETRY_QUALITY = 0.7;

type TargetMime = 'image/webp' | 'image/jpeg';

export function shouldCompress(bytes: number): boolean {
  return bytes > COMPRESS_THRESHOLD_BYTES;
}

export function computeScale(width: number, height: number): number {
  const longestSide = Math.max(width, height);
  return Math.min(1, MAX_DIMENSION_PX / longestSide);
}

export function pickTargetMime(blob: Blob | null): TargetMime {
  return blob !== null && blob.type === 'image/webp' ? 'image/webp' : 'image/jpeg';
}

export function swapExtension(fileName: string, mime: TargetMime): string {
  const dot = fileName.lastIndexOf('.');
  const base = dot > 0 ? fileName.slice(0, dot) : fileName;
  return `${base}.${mime === 'image/webp' ? 'webp' : 'jpg'}`;
}

function encodeCanvas(
  canvas: HTMLCanvasElement,
  type: TargetMime,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('No se pudo leer la imagen.'));
    img.src = url;
  });
}

async function encodeWithFallback(canvas: HTMLCanvasElement, file: File): Promise<File> {
  let blob = await encodeCanvas(canvas, 'image/webp', INITIAL_QUALITY);
  const mime = pickTargetMime(blob);
  if (mime === 'image/jpeg') {
    blob = await encodeCanvas(canvas, 'image/jpeg', INITIAL_QUALITY);
  }
  if (!blob) return file;
  if (blob.size > RETRY_THRESHOLD_BYTES) {
    const retried = await encodeCanvas(canvas, mime, RETRY_QUALITY);
    if (retried) blob = retried;
  }
  return new File([blob], swapExtension(file.name, mime), { type: blob.type });
}

function encodeScaled(img: HTMLImageElement, file: File): Promise<File> {
  const naturalWidth = img.naturalWidth;
  const naturalHeight = img.naturalHeight;
  if (naturalWidth === 0 || naturalHeight === 0) return Promise.resolve(file);
  const scale = computeScale(naturalWidth, naturalHeight);
  const targetWidth = Math.max(1, Math.round(naturalWidth * scale));
  const targetHeight = Math.max(1, Math.round(naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.resolve(file);
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
  return encodeWithFallback(canvas, file);
}

export async function compressImage(file: File): Promise<File> {
  try {
    if (!shouldCompress(file.size)) return file;
    const url = URL.createObjectURL(file);
    try {
      const img = await loadImage(url);
      return await encodeScaled(img, file);
    } finally {
      URL.revokeObjectURL(url);
    }
  } catch (error) {
    console.warn('compressImage: se usará el archivo original.', error);
    return file;
  }
}
