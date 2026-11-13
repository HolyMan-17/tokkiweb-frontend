import { useEffect, useRef, useState } from 'react';
import type { Product } from '../../../types';
import {
  addProductImage,
  removeProductImageByUrl,
  reorderProductImages,
} from '../../../api/products';
import { MAX_PRODUCT_IMAGES, type GalleryItem } from './ProductImagesUploader';

export const RETRY_DELAY_MS = 1200;

type AdminAuth = { getToken?: () => Promise<string | null> };
type PendingGalleryItem = Extract<GalleryItem, { kind: 'pending' }>;
type UploadAttempt =
  | { ok: true; url: string | null }
  | { ok: false; message: string };

function buildInitialGallery(editingProduct: Product | null): GalleryItem[] {
  const urls = editingProduct?.product_image_urls?.length
    ? editingProduct.product_image_urls
    : editingProduct?.product_image_url
      ? [editingProduct.product_image_url]
      : [];
  return urls.map((url, index): GalleryItem => ({
    id: `existing-${index}`,
    kind: 'existing',
    url,
    previewUrl: url,
  }));
}

const waitRetry = () =>
  new Promise<void>(resolve => setTimeout(resolve, RETRY_DELAY_MS));

interface UseProductGalleryArgs {
  editingProduct: Product | null;
  auth?: AdminAuth;
  showToast: (message: string) => void;
}

export function useProductGallery({
  editingProduct,
  auth,
  showToast,
}: UseProductGalleryArgs) {
  const [gallery, setGallery] = useState<GalleryItem[]>(() =>
    buildInitialGallery(editingProduct),
  );
  const [uploadFailure, setUploadFailure] = useState<{
    count: number;
    message: string;
  } | null>(null);
  const galleryRef = useRef<GalleryItem[]>(gallery);
  const serverOrderRef = useRef<string[]>(
    editingProduct?.product_image_urls?.length
      ? editingProduct.product_image_urls
      : editingProduct?.product_image_url
        ? [editingProduct.product_image_url]
        : [],
  );
  const objectIdCounter = useRef(0);
  const objectUrlsRef = useRef<string[]>([]);

  const updateGallery = (next: GalleryItem[]) => {
    galleryRef.current = next;
    setGallery(next);
  };

  // Los object URL mantienen vivo el Blob mientras existan: cada URL creada
  // se revoca al quitar su ítem o al desmontar el modal. El registro se muta
  // in place para que el cleanup del efecto vea siempre el contenido actual.
  const revokePreview = (previewUrl: string) => {
    URL.revokeObjectURL(previewUrl);
    const index = objectUrlsRef.current.indexOf(previewUrl);
    if (index >= 0) objectUrlsRef.current.splice(index, 1);
  };

  useEffect(() => {
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps -- Limpia todas las URLs acumuladas en la ref durante el ciclo de vida al desmontar
      for (const url of objectUrlsRef.current) {
        URL.revokeObjectURL(url);
      }
    };
  }, []);

  const handleFilesSelected = (files: File[]) => {
    const remaining = Math.max(0, MAX_PRODUCT_IMAGES - galleryRef.current.length);
    const accepted = files.slice(0, remaining);
    const items: GalleryItem[] = accepted.map(file => {
      // react-doctor-disable-next-line react-doctor/no-create-object-url-without-revoke -- Revocados en unmount via objectUrlsRef y al descartar o quitar en revokePreview
      const previewUrl = URL.createObjectURL(file);
      objectUrlsRef.current.push(previewUrl);
      objectIdCounter.current += 1;
      return {
        id: `pending-${objectIdCounter.current}`,
        kind: 'pending',
        file,
        previewUrl,
        status: 'queued',
      };
    });
    updateGallery([...galleryRef.current, ...items]);
    setUploadFailure(null);
  };

  const removeItem = async (id: string) => {
    const item = galleryRef.current.find(candidate => candidate.id === id);
    if (!item) return;

    if (item.kind === 'pending') {
      revokePreview(item.previewUrl);
      updateGallery(galleryRef.current.filter(rest => rest.id !== id));
      return;
    }

    if (!editingProduct) return;
    if (!auth) {
      showToast('El panel necesita Clerk configurado para escribir en la tienda.');
      return;
    }
    const result = await removeProductImageByUrl(editingProduct.product_id, item.url, auth);
    if (!result.ok) {
      showToast(result.message);
      return;
    }
    serverOrderRef.current =
      result.data?.product_image_urls ??
      serverOrderRef.current.filter(url => url !== item.url);
    updateGallery(galleryRef.current.filter(rest => rest.id !== id));
    showToast('Imagen eliminada');
  };

  const makeCover = (id: string) => {
    const current = galleryRef.current;
    const index = current.findIndex(candidate => candidate.id === id);
    if (index <= 0) return;
    const next = [...current];
    const [item] = next.splice(index, 1);
    updateGallery([item, ...next]);
  };

  const hasUnfinishedUploads = () =>
    galleryRef.current.some(
      item => item.kind === 'pending' && item.status !== 'done',
    );

  const resetFailedToQueued = () => {
    updateGallery(
      galleryRef.current.map(item =>
        item.kind === 'pending' && item.status === 'failed'
          ? { ...item, status: 'queued' as const }
          : item,
      ),
    );
  };

  const attemptUpload = async (
    productId: number,
    file: File,
  ): Promise<UploadAttempt> => {
    if (!auth) return { ok: false, message: 'No hay sesión de administrador.' };
    let uploaded = await addProductImage(productId, file, auth);
    if (!uploaded.ok) {
      await waitRetry();
      uploaded = await addProductImage(productId, file, auth);
    }
    if (!uploaded.ok) return { ok: false, message: uploaded.message };
    const urls = uploaded.data?.product_image_urls ?? [];
    serverOrderRef.current = urls;
    return { ok: true, url: urls[urls.length - 1] ?? null };
  };

  const setItemStatus = (
    id: string,
    status: 'uploading' | 'done' | 'failed',
    uploadedUrl?: string,
  ) => {
    updateGallery(
      galleryRef.current.map(item =>
        item.kind === 'pending' && item.id === id
          ? {
              ...item,
              status,
              ...(uploadedUrl !== undefined ? { uploadedUrl } : {}),
            }
          : item,
      ),
    );
  };

  const processUploadQueue = async (
    productId: number,
  ): Promise<{ failed: number; message: string | null }> => {
    const queued = galleryRef.current.filter(
      (item): item is PendingGalleryItem =>
        item.kind === 'pending' && item.status === 'queued',
    );
    let failed = 0;
    let message: string | null = null;
    for (const item of queued) {
      setItemStatus(item.id, 'uploading');
      const result = await attemptUpload(productId, item.file);
      if (result.ok) {
        setItemStatus(item.id, 'done', result.url ?? undefined);
      } else {
        setItemStatus(item.id, 'failed');
        failed += 1;
        message = result.message;
      }
    }
    return { failed, message };
  };

  const finalize = async (
    productId: number,
    options: { onDone: () => void },
  ) => {
    const desiredUrls = galleryRef.current
      .map(item => (item.kind === 'existing' ? item.url : item.uploadedUrl))
      .filter((url): url is string => Boolean(url));

    if (
      desiredUrls.length > 1 &&
      desiredUrls.join('\n') !== serverOrderRef.current.join('\n')
    ) {
      const reordered = await reorderProductImages(productId, desiredUrls, auth);
      if (reordered.ok && reordered.data?.product_image_urls) {
        serverOrderRef.current = reordered.data.product_image_urls;
      } else {
        showToast('Producto guardado, pero no se pudo aplicar el nuevo orden de imágenes.');
      }
    }

    setUploadFailure(null);
    options.onDone();
  };

  const discardFailed = (): number => {
    const failedItems = galleryRef.current.filter(
      (item): item is PendingGalleryItem =>
        item.kind === 'pending' && item.status === 'failed',
    );
    for (const item of failedItems) {
      revokePreview(item.previewUrl);
    }
    updateGallery(
      galleryRef.current.filter(
        item => !(item.kind === 'pending' && item.status === 'failed'),
      ),
    );
    setUploadFailure(null);
    return failedItems.length;
  };

  return {
    gallery,
    uploadFailure,
    setUploadFailure,
    handleFilesSelected,
    removeItem,
    makeCover,
    hasUnfinishedUploads,
    resetFailedToQueued,
    processUploadQueue,
    finalize,
    discardFailed,
  };
}
