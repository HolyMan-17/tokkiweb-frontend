import { render, screen, act, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import ProductFormModal, { RETRY_DELAY_MS } from './ProductFormModal';
import {
  createProduct,
  updateProduct,
  addProductImage,
  removeProductImageByUrl,
  reorderProductImages,
} from '../../../api/products';
import type { Product } from '../../../types';

vi.mock('../../../api/products', () => ({
  createProduct: vi.fn(),
  updateProduct: vi.fn(),
  addProductImage: vi.fn(),
  removeProductImageByUrl: vi.fn(),
  reorderProductImages: vi.fn(),
}));

vi.mock('../../../utils/compressImage', () => ({
  compressImage: vi.fn(),
}));

import { compressImage } from '../../../utils/compressImage';

const mockCreateProduct = vi.mocked(createProduct);
const mockUpdateProduct = vi.mocked(updateProduct);
const mockAddProductImage = vi.mocked(addProductImage);
const mockRemoveProductImageByUrl = vi.mocked(removeProductImageByUrl);
const mockReorderProductImages = vi.mocked(reorderProductImages);
const mockCompress = vi.mocked(compressImage);

const SAVED_PRODUCT: Product = {
  product_id: 7,
  product_name: 'Gloss Fresa',
  product_price: '3.50',
  product_description: 'Brillo labial kawaii de fresa',
  category: 'Maquillaje',
  qty_available: 10,
  in_stock: true,
};

type AddResult = Awaited<ReturnType<typeof addProductImage>>;
type RemoveResult = Awaited<ReturnType<typeof removeProductImageByUrl>>;
type ReorderResult = Awaited<ReturnType<typeof reorderProductImages>>;
type CreateResult = Awaited<ReturnType<typeof createProduct>>;

const galleryPayload = (urls: string[]) => ({
  ok: true,
  data: { product_id: 7, product_image_urls: urls, product_image_url: urls[0] ?? null },
}) as AddResult;

const UPLOAD_FAIL: AddResult = { ok: false, message: '413 Payload Too Large' };
const CREATE_OK: CreateResult = { ok: true, data: SAVED_PRODUCT };

function renderModal(options: { editingProduct?: Product | null } = {}) {
  const onSuccess = vi.fn();
  const showToast = vi.fn();
  const onClose = vi.fn();
  const utils = render(
    <ProductFormModal
      open
      editingProduct={options.editingProduct ?? null}
      auth={{ getToken: async () => 'token' }}
      onClose={onClose}
      onSuccess={onSuccess}
      showToast={showToast}
      onImageTooLarge={vi.fn()}
    />,
  );
  return { onSuccess, showToast, onClose, unmount: utils.unmount };
}

function makeImageFile(name: string) {
  return new File(['datos-de-imagen'], name, { type: 'image/webp' });
}

// user-event queda bloqueado bajo fake timers (el asyncWrapper de RTL espera un
// setTimeout falsificado que nadie avanza en vitest), así que las interacciones
// se disparan con fireEvent + act, igual que ProductDetailPage.test.tsx.
async function fillValidForm() {
  fireEvent.change(screen.getByLabelText('Nombre del Producto'), {
    target: { value: 'Gloss Fresa' },
  });
  fireEvent.change(screen.getByLabelText('Precio ($)'), {
    target: { value: '3.50' },
  });
  fireEvent.change(screen.getByLabelText('Cantidad Disponible'), {
    target: { value: '10' },
  });
}

async function addImages(files: File[]) {
  const input = document.querySelector('#product_images_input') as HTMLInputElement;
  fireEvent.change(input, { target: { files } });
  // La compresión del uploader resuelve en microtareas: vaciarlas aquí para
  // que el guardado vea la galería actualizada.
  await act(async () => {});
}

async function submit() {
  fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
  await act(async () => {});
}

async function clickRecovery(name: string) {
  fireEvent.click(screen.getByRole('button', { name }));
  await act(async () => {});
}

async function flushRetryDelay() {
  await act(async () => {
    vi.advanceTimersByTime(RETRY_DELAY_MS);
  });
}

describe('ProductFormModal — recuperación al fallar la subida de imágenes', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockCreateProduct.mockReset();
    mockUpdateProduct.mockReset();
    mockAddProductImage.mockReset();
    mockRemoveProductImageByUrl.mockReset();
    mockReorderProductImages.mockReset();
    mockCompress.mockReset();
    mockCompress.mockImplementation(async (file: File) =>
      new File([file], 'comprimido.webp', { type: 'image/webp' }));
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:preview-url');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.useFakeTimers();
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('ante doble fallo de subida mantiene el modal abierto con acciones de recuperación', async () => {
    mockCreateProduct.mockResolvedValue(CREATE_OK);
    mockAddProductImage.mockResolvedValue(UPLOAD_FAIL);
    const { onSuccess, showToast } = renderModal();

    await fillValidForm();
    await addImages([makeImageFile('gloss.webp')]);
    await submit();

    expect(mockCreateProduct).toHaveBeenCalledTimes(1);
    expect(mockAddProductImage).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Guardando…' })).toBeDisabled();

    await flushRetryDelay();

    expect(mockAddProductImage).toHaveBeenCalledTimes(2);
    expect(screen.getByText(/No se pudo subir 1 imagen/i)).toBeInTheDocument();
    expect(screen.getByText(/413 Payload Too Large/)).toBeInTheDocument();
    expect(screen.getByText(/ya quedó guardado/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Continuar sin ellas' })).toBeEnabled();
    expect(screen.getByText('Falló')).toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();
    expect(showToast).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('reintenta automáticamente una vez y cierra con éxito si el reintento funciona', async () => {
    mockCreateProduct.mockResolvedValue(CREATE_OK);
    mockAddProductImage
      .mockResolvedValueOnce(UPLOAD_FAIL)
      .mockResolvedValueOnce(galleryPayload(['/images/products/gloss.webp']));
    const { onSuccess } = renderModal();

    await fillValidForm();
    await addImages([makeImageFile('gloss.webp')]);
    await submit();

    expect(mockAddProductImage).toHaveBeenCalledTimes(1);

    await flushRetryDelay();

    expect(mockAddProductImage).toHaveBeenCalledTimes(2);
    expect(mockCreateProduct).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenCalledWith('Producto agregado');
    expect(screen.queryByText(/No se pudo subir/i)).not.toBeInTheDocument();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('«Reintentar» hace un nuevo intento y cierra al lograrlo sin recrear el producto', async () => {
    mockCreateProduct.mockResolvedValue(CREATE_OK);
    mockAddProductImage
      .mockResolvedValueOnce(UPLOAD_FAIL)
      .mockResolvedValueOnce(UPLOAD_FAIL)
      .mockResolvedValueOnce(galleryPayload(['/images/products/gloss.webp']));
    const { onSuccess, showToast } = renderModal();

    await fillValidForm();
    await addImages([makeImageFile('gloss.webp')]);
    await submit();
    await flushRetryDelay();

    expect(screen.getByText(/No se pudo subir 1 imagen/i)).toBeInTheDocument();

    await clickRecovery('Reintentar');

    expect(mockAddProductImage).toHaveBeenCalledTimes(3);
    expect(mockCreateProduct).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenCalledWith('Producto agregado');
    expect(showToast).not.toHaveBeenCalled();
    expect(screen.queryByText(/No se pudo subir/i)).not.toBeInTheDocument();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('«Continuar sin ellas» descarta las fallidas, avisa por toast y cierra como guardado', async () => {
    mockCreateProduct.mockResolvedValue(CREATE_OK);
    mockAddProductImage.mockResolvedValue(UPLOAD_FAIL);
    const { onSuccess, showToast } = renderModal();

    await fillValidForm();
    await addImages([makeImageFile('gloss.webp')]);
    await submit();
    await flushRetryDelay();

    await clickRecovery('Continuar sin ellas');

    expect(showToast).toHaveBeenCalledWith('Producto guardado; se descartó 1 imagen.');
    expect(onSuccess).toHaveBeenCalledWith('Producto guardado');
    expect(mockAddProductImage).toHaveBeenCalledTimes(2);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('regresión: si falla createProduct solo se muestra toast y no se sube imagen', async () => {
    mockCreateProduct.mockResolvedValue({ ok: false, message: 'Error de validación del servidor' });
    const { onSuccess, showToast } = renderModal();

    await fillValidForm();
    await addImages([makeImageFile('gloss.webp')]);
    await submit();

    expect(showToast).toHaveBeenCalledWith('Error de validación del servidor');
    expect(mockAddProductImage).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('reenviar el formulario con imágenes pendientes no vuelve a crear el producto', async () => {
    mockCreateProduct.mockResolvedValue(CREATE_OK);
    mockAddProductImage
      .mockResolvedValueOnce(UPLOAD_FAIL)
      .mockResolvedValueOnce(UPLOAD_FAIL)
      .mockResolvedValueOnce(galleryPayload(['/images/products/gloss.webp']));
    const { onSuccess } = renderModal();

    await fillValidForm();
    await addImages([makeImageFile('gloss.webp')]);
    await submit();
    await flushRetryDelay();

    // El reenvío reinicia las fallidas y reintenta: falla → espera → falla de nuevo.
    await submit();
    await flushRetryDelay();

    expect(mockCreateProduct).toHaveBeenCalledTimes(1);
    expect(mockAddProductImage).toHaveBeenCalledTimes(3);
    expect(onSuccess).toHaveBeenCalledWith('Producto agregado');
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('en modo edición el reintento automático exitoso cierra con «Producto actualizado»', async () => {
    const existing: Product = { ...SAVED_PRODUCT, product_id: 3 };
    mockUpdateProduct.mockResolvedValue({ ok: true, data: existing });
    mockAddProductImage
      .mockResolvedValueOnce(UPLOAD_FAIL)
      .mockResolvedValueOnce(galleryPayload(['/images/products/gloss.webp']));
    const { onSuccess } = renderModal({ editingProduct: existing });

    await addImages([makeImageFile('gloss.webp')]);
    await submit();
    await flushRetryDelay();

    expect(mockUpdateProduct).toHaveBeenCalledTimes(1);
    expect(mockAddProductImage).toHaveBeenCalledTimes(2);
    expect(onSuccess).toHaveBeenCalledWith('Producto actualizado');
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('«Reintentar» que vuelve a fallar mantiene el error con el mensaje fresco', async () => {
    mockCreateProduct.mockResolvedValue(CREATE_OK);
    mockAddProductImage
      .mockResolvedValueOnce({ ok: false, message: 'Sin conexión' })
      .mockResolvedValueOnce({ ok: false, message: 'Sin conexión' })
      .mockResolvedValue({ ok: false, message: '413 de nuevo' });
    const { onSuccess } = renderModal();

    await fillValidForm();
    await addImages([makeImageFile('gloss.webp')]);
    await submit();
    await flushRetryDelay();

    expect(screen.getByText(/Sin conexión/)).toBeInTheDocument();

    await clickRecovery('Reintentar');

    expect(mockAddProductImage).toHaveBeenCalledTimes(3);
    expect(screen.getByRole('button', { name: 'Guardando…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Continuar sin ellas' })).toBeDisabled();
    expect(onSuccess).not.toHaveBeenCalled();

    await flushRetryDelay();

    expect(mockAddProductImage).toHaveBeenCalledTimes(4);
    expect(screen.getByText(/413 de nuevo/)).toBeInTheDocument();
    expect(screen.queryByText(/Sin conexión/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Continuar sin ellas' })).toBeEnabled();
    expect(onSuccess).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });
});

describe('ProductFormModal — galería de varias imágenes', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockCreateProduct.mockReset();
    mockUpdateProduct.mockReset();
    mockAddProductImage.mockReset();
    mockRemoveProductImageByUrl.mockReset();
    mockReorderProductImages.mockReset();
    mockCompress.mockReset();
    mockCompress.mockImplementation(async (file: File) => file);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:preview-url');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.useFakeTimers();
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('sube las imágenes en secuencia tras crear el producto, en el orden del carrusel', async () => {
    mockCreateProduct.mockResolvedValue(CREATE_OK);
    const uploadedUrls: string[] = [];
    mockAddProductImage.mockImplementation(async (_id, file) => {
      uploadedUrls.push(`/images/products/${file.name}`);
      return galleryPayload(uploadedUrls);
    });
    const { onSuccess } = renderModal();

    await fillValidForm();
    await addImages([makeImageFile('a.webp'), makeImageFile('b.webp')]);
    await submit();

    expect(mockCreateProduct).toHaveBeenCalledTimes(1);
    expect(mockAddProductImage).toHaveBeenCalledTimes(2);
    expect(mockAddProductImage.mock.calls[0][1].name).toBe('a.webp');
    expect(mockAddProductImage.mock.calls[1][1].name).toBe('b.webp');
    expect(onSuccess).toHaveBeenCalledWith('Producto agregado');
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('con fallo parcial solo reintenta la imagen fallida al pulsar «Reintentar»', async () => {
    mockCreateProduct.mockResolvedValue(CREATE_OK);
    mockAddProductImage
      .mockResolvedValueOnce(galleryPayload(['/images/products/a.webp']))
      .mockResolvedValueOnce(UPLOAD_FAIL)
      .mockResolvedValueOnce(UPLOAD_FAIL)
      .mockResolvedValueOnce(galleryPayload(['/images/products/a.webp', '/images/products/b.webp']));
    const { onSuccess } = renderModal();

    await fillValidForm();
    await addImages([makeImageFile('a.webp'), makeImageFile('b.webp')]);
    await submit();
    await flushRetryDelay();

    expect(mockAddProductImage).toHaveBeenCalledTimes(3);
    expect(screen.getByText(/No se pudo subir 1 imagen/i)).toBeInTheDocument();

    await clickRecovery('Reintentar');

    expect(mockAddProductImage).toHaveBeenCalledTimes(4);
    expect(mockAddProductImage.mock.calls[3][1].name).toBe('b.webp');
    expect(onSuccess).toHaveBeenCalledWith('Producto agregado');
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('al fallar varias imágenes el aviso usa plural y el descarte también', async () => {
    mockCreateProduct.mockResolvedValue(CREATE_OK);
    mockAddProductImage.mockResolvedValue(UPLOAD_FAIL);
    const { onSuccess, showToast } = renderModal();

    await fillValidForm();
    await addImages([makeImageFile('a.webp'), makeImageFile('b.webp')]);
    await submit();
    // Cada imagen hace intento + reintento, así que son dos esperas de 1200 ms.
    await flushRetryDelay();
    await flushRetryDelay();

    expect(mockAddProductImage).toHaveBeenCalledTimes(4);
    expect(screen.getByText(/No se pudieron subir 2 imágenes/i)).toBeInTheDocument();

    await clickRecovery('Continuar sin ellas');

    expect(showToast).toHaveBeenCalledWith('Producto guardado; se descartaron 2 imágenes.');
    expect(onSuccess).toHaveBeenCalledWith('Producto guardado');
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('«Quitar» una imagen existente llama al DELETE por URL y mantiene el modal abierto', async () => {
    const existing: Product = {
      ...SAVED_PRODUCT,
      product_id: 3,
      product_image_url: 'http://x/images/products/a.webp',
      product_image_urls: [
        'http://x/images/products/a.webp',
        'http://x/images/products/b.webp',
      ],
    };
    mockRemoveProductImageByUrl.mockResolvedValue(
      galleryPayload(['http://x/images/products/a.webp']) as RemoveResult,
    );
    const { onSuccess, showToast } = renderModal({ editingProduct: existing });

    expect(screen.getByText('Fotos del Producto (2/5)')).toBeInTheDocument();
    // La imagen 1 es portada y no tiene botón de quitar; se quita la imagen 2.
    fireEvent.click(screen.getByRole('button', { name: 'Quitar imagen 2' }));
    await act(async () => {});

    expect(mockRemoveProductImageByUrl).toHaveBeenCalledTimes(1);
    expect(mockRemoveProductImageByUrl.mock.calls[0][0]).toBe(3);
    expect(mockRemoveProductImageByUrl.mock.calls[0][1]).toBe('http://x/images/products/b.webp');
    expect(showToast).toHaveBeenCalledWith('Imagen eliminada');
    // Regresión: quitar una imagen ya no cierra el modal ni dispara onSuccess.
    expect(onSuccess).not.toHaveBeenCalled();
    expect(screen.getByText('Fotos del Producto (1/5)')).toBeInTheDocument();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('aplica el cambio de portada existente como reordenamiento en el guardado', async () => {
    const existing: Product = {
      ...SAVED_PRODUCT,
      product_id: 3,
      product_image_urls: [
        'http://x/images/products/a.webp',
        'http://x/images/products/b.webp',
      ],
    };
    mockUpdateProduct.mockResolvedValue({ ok: true, data: existing });
    mockReorderProductImages.mockResolvedValue(
      galleryPayload(['http://x/images/products/b.webp', 'http://x/images/products/a.webp']) as ReorderResult,
    );
    const { onSuccess } = renderModal({ editingProduct: existing });

    fireEvent.click(screen.getByRole('button', { name: 'Hacer portada la imagen 2' }));
    await submit();

    expect(mockUpdateProduct).toHaveBeenCalledTimes(1);
    expect(mockAddProductImage).not.toHaveBeenCalled();
    expect(mockReorderProductImages).toHaveBeenCalledTimes(1);
    expect(mockReorderProductImages.mock.calls[0][1]).toEqual([
      'http://x/images/products/b.webp',
      'http://x/images/products/a.webp',
    ]);
    expect(onSuccess).toHaveBeenCalledWith('Producto actualizado');
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('ordena el servidor tras subir cuando una imagen nueva se hizo portada', async () => {
    const existing: Product = {
      ...SAVED_PRODUCT,
      product_id: 3,
      product_image_url: 'http://x/images/products/a.webp',
      product_image_urls: ['http://x/images/products/a.webp'],
    };
    mockUpdateProduct.mockResolvedValue({ ok: true, data: existing });
    // subida ok: servidor termina [a, nueva]
    mockAddProductImage.mockResolvedValue(
      galleryPayload(['http://x/images/products/a.webp', 'http://x/images/products/nueva.webp']),
    );
    mockReorderProductImages.mockResolvedValue(
      galleryPayload(['http://x/images/products/nueva.webp', 'http://x/images/products/a.webp']) as ReorderResult,
    );
    const { onSuccess } = renderModal({ editingProduct: existing });

    await addImages([makeImageFile('nueva.webp')]);
    // la nueva queda al final; la movemos a portada
    fireEvent.click(screen.getByRole('button', { name: 'Hacer portada la imagen 2' }));
    await submit();

    expect(mockAddProductImage).toHaveBeenCalledTimes(1);
    expect(mockReorderProductImages).toHaveBeenCalledTimes(1);
    expect(mockReorderProductImages.mock.calls[0][1]).toEqual([
      'http://x/images/products/nueva.webp',
      'http://x/images/products/a.webp',
    ]);
    expect(onSuccess).toHaveBeenCalledWith('Producto actualizado');
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('avisa con toast (sin cerrar) cuando el reordenamiento falla tras guardar', async () => {
    const existing: Product = {
      ...SAVED_PRODUCT,
      product_id: 3,
      product_image_urls: [
        'http://x/images/products/a.webp',
        'http://x/images/products/b.webp',
      ],
    };
    mockUpdateProduct.mockResolvedValue({ ok: true, data: existing });
    mockReorderProductImages.mockResolvedValue({ ok: false, message: 'Conflicto' } as ReorderResult);
    const { onSuccess, showToast } = renderModal({ editingProduct: existing });

    fireEvent.click(screen.getByRole('button', { name: 'Hacer portada la imagen 2' }));
    await submit();

    expect(showToast).toHaveBeenCalledWith(
      'Producto guardado, pero no se pudo aplicar el nuevo orden de imágenes.',
    );
    expect(onSuccess).toHaveBeenCalledWith('Producto actualizado');
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('revoca los object URL de vista previa al desmontar', async () => {
    mockCreateProduct.mockResolvedValue(CREATE_OK);
    mockAddProductImage.mockResolvedValue(galleryPayload(['/images/products/a.webp']));
    const { unmount } = renderModal();

    await fillValidForm();
    await addImages([makeImageFile('a.webp')]);
    await act(async () => {});

    unmount();

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview-url');
    expect(errorSpy).not.toHaveBeenCalled();
  });
});
