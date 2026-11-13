import { render, screen, act, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import ProductFormModal, { RETRY_DELAY_MS } from './ProductFormModal';
import {
  createProduct,
  updateProduct,
  uploadProductImage,
  removeProductImage,
} from '../../../api/products';
import type { Product } from '../../../types';

vi.mock('../../../api/products', () => ({
  createProduct: vi.fn(),
  updateProduct: vi.fn(),
  uploadProductImage: vi.fn(),
  removeProductImage: vi.fn(),
}));

// El uploader real hace compresión de imagen (canvas/URL.createObjectURL),
// imposible en jsdom — se reemplaza por un stub que respeta su contrato:
// depositar el File elegido en imageFileRef.
vi.mock('./ProductImageUploader', async () => {
  const { createElement } = await import('react');
  function MockProductImageUploader({
    imageFileRef,
  }: {
    imageFileRef: { current: File | null };
  }) {
    return createElement('input', {
      type: 'file',
      'data-testid': 'mock-image-picker',
      onChange: (e: { target: HTMLInputElement }) => {
        const file = e.target.files?.[0] ?? null;
        e.target.value = '';
        if (file) imageFileRef.current = file;
      },
    });
  }
  return { ProductImageUploader: MockProductImageUploader, default: MockProductImageUploader };
});

const mockCreateProduct = vi.mocked(createProduct);
const mockUpdateProduct = vi.mocked(updateProduct);
const mockUploadProductImage = vi.mocked(uploadProductImage);
const mockRemoveProductImage = vi.mocked(removeProductImage);

const SAVED_PRODUCT: Product = {
  product_id: 7,
  product_name: 'Gloss Fresa',
  product_price: '3.50',
  product_description: 'Brillo labial kawaii de fresa',
  category: 'Maquillaje',
  qty_available: 10,
  in_stock: true,
};

type UploadResult = Awaited<ReturnType<typeof uploadProductImage>>;
type CreateResult = Awaited<ReturnType<typeof createProduct>>;

const UPLOAD_FAIL: UploadResult = { ok: false, message: '413 Payload Too Large' };
const UPLOAD_OK: UploadResult = { ok: true, data: { product_image_url: '/images/products/gloss.webp' } };
const CREATE_OK: CreateResult = { ok: true, data: SAVED_PRODUCT };

function renderModal(options: { editingProduct?: Product | null } = {}) {
  const onSuccess = vi.fn();
  const showToast = vi.fn();
  render(
    <ProductFormModal
      open
      editingProduct={options.editingProduct ?? null}
      auth={{ getToken: async () => 'token' }}
      onClose={vi.fn()}
      onSuccess={onSuccess}
      showToast={showToast}
      onImageTooLarge={vi.fn()}
    />,
  );
  return { onSuccess, showToast };
}

function makeImageFile() {
  return new File(['datos-de-imagen'], 'gloss.webp', { type: 'image/webp' });
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

function pickImage() {
  fireEvent.change(screen.getByTestId('mock-image-picker'), {
    target: { files: [makeImageFile()] },
  });
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

describe('ProductFormModal — recuperación al fallar la subida de imagen', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockCreateProduct.mockReset();
    mockUpdateProduct.mockReset();
    mockUploadProductImage.mockReset();
    mockRemoveProductImage.mockReset();
    vi.useFakeTimers();
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('ante doble fallo de subida mantiene el modal abierto con acciones de recuperación', async () => {
    mockCreateProduct.mockResolvedValue(CREATE_OK);
    mockUploadProductImage.mockResolvedValue(UPLOAD_FAIL);
    const { onSuccess, showToast } = renderModal();

    await fillValidForm();
    pickImage();
    await submit();

    expect(mockCreateProduct).toHaveBeenCalledTimes(1);
    expect(mockUploadProductImage).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Guardando…' })).toBeDisabled();

    await flushRetryDelay();

    expect(mockUploadProductImage).toHaveBeenCalledTimes(2);
    expect(screen.getByText(/No se pudo subir la imagen/i)).toBeInTheDocument();
    expect(screen.getByText(/413 Payload Too Large/)).toBeInTheDocument();
    expect(screen.getByText(/ya quedó guardado/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reintentar imagen' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Guardar sin imagen' })).toBeEnabled();
    expect(onSuccess).not.toHaveBeenCalled();
    expect(showToast).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('reintenta automáticamente una vez y cierra con éxito si el reintento funciona', async () => {
    mockCreateProduct.mockResolvedValue(CREATE_OK);
    mockUploadProductImage.mockResolvedValueOnce(UPLOAD_FAIL).mockResolvedValueOnce(UPLOAD_OK);
    const { onSuccess } = renderModal();

    await fillValidForm();
    pickImage();
    await submit();

    expect(mockUploadProductImage).toHaveBeenCalledTimes(1);

    await flushRetryDelay();

    expect(mockUploadProductImage).toHaveBeenCalledTimes(2);
    expect(mockCreateProduct).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenCalledWith('Producto agregado');
    expect(screen.queryByText(/No se pudo subir la imagen/i)).not.toBeInTheDocument();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('«Reintentar imagen» hace un nuevo intento y cierra al lograrlo sin recrear el producto', async () => {
    mockCreateProduct.mockResolvedValue(CREATE_OK);
    mockUploadProductImage
      .mockResolvedValueOnce(UPLOAD_FAIL)
      .mockResolvedValueOnce(UPLOAD_FAIL)
      .mockResolvedValueOnce(UPLOAD_OK);
    const { onSuccess, showToast } = renderModal();

    await fillValidForm();
    pickImage();
    await submit();
    await flushRetryDelay();

    expect(screen.getByText(/No se pudo subir la imagen/i)).toBeInTheDocument();

    await clickRecovery('Reintentar imagen');

    expect(mockUploadProductImage).toHaveBeenCalledTimes(3);
    expect(mockCreateProduct).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenCalledWith('Producto agregado');
    expect(showToast).not.toHaveBeenCalled();
    expect(screen.queryByText(/No se pudo subir la imagen/i)).not.toBeInTheDocument();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('«Guardar sin imagen» descarta la imagen, avisa por toast y cierra como guardado', async () => {
    mockCreateProduct.mockResolvedValue(CREATE_OK);
    mockUploadProductImage.mockResolvedValue(UPLOAD_FAIL);
    const { onSuccess, showToast } = renderModal();

    await fillValidForm();
    pickImage();
    await submit();
    await flushRetryDelay();

    await clickRecovery('Guardar sin imagen');

    expect(showToast).toHaveBeenCalledWith('Producto guardado, pero sin imagen');
    expect(onSuccess).toHaveBeenCalledWith('Producto guardado');
    expect(mockUploadProductImage).toHaveBeenCalledTimes(2);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('regresión: si falla createProduct solo se muestra toast y no se sube imagen', async () => {
    mockCreateProduct.mockResolvedValue({ ok: false, message: 'Error de validación del servidor' });
    const { onSuccess, showToast } = renderModal();

    await fillValidForm();
    pickImage();
    await submit();

    expect(showToast).toHaveBeenCalledWith('Error de validación del servidor');
    expect(mockUploadProductImage).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Reintentar imagen' })).not.toBeInTheDocument();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('reenviar el formulario con la imagen pendiente no vuelve a crear el producto', async () => {
    mockCreateProduct.mockResolvedValue(CREATE_OK);
    mockUploadProductImage
      .mockResolvedValueOnce(UPLOAD_FAIL)
      .mockResolvedValueOnce(UPLOAD_FAIL)
      .mockResolvedValueOnce(UPLOAD_OK);
    const { onSuccess } = renderModal();

    await fillValidForm();
    pickImage();
    await submit();
    await flushRetryDelay();

    await submit();

    expect(mockCreateProduct).toHaveBeenCalledTimes(1);
    expect(mockUploadProductImage).toHaveBeenCalledTimes(3);
    expect(onSuccess).toHaveBeenCalledWith('Producto agregado');
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('en modo edición el reintento automático exitoso cierra con «Producto actualizado»', async () => {
    const existing: Product = { ...SAVED_PRODUCT, product_id: 3 };
    mockUpdateProduct.mockResolvedValue({ ok: true, data: existing });
    mockUploadProductImage.mockResolvedValueOnce(UPLOAD_FAIL).mockResolvedValueOnce(UPLOAD_OK);
    const { onSuccess } = renderModal({ editingProduct: existing });

    pickImage();
    await submit();
    await flushRetryDelay();

    expect(mockUpdateProduct).toHaveBeenCalledTimes(1);
    expect(mockUploadProductImage).toHaveBeenCalledTimes(2);
    expect(onSuccess).toHaveBeenCalledWith('Producto actualizado');
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('«Reintentar imagen» que vuelve a fallar mantiene el error con el mensaje fresco', async () => {
    mockCreateProduct.mockResolvedValue(CREATE_OK);
    mockUploadProductImage
      .mockResolvedValueOnce({ ok: false, message: 'Sin conexión' })
      .mockResolvedValueOnce({ ok: false, message: 'Sin conexión' })
      .mockResolvedValue({ ok: false, message: '413 de nuevo' });
    const { onSuccess } = renderModal();

    await fillValidForm();
    pickImage();
    await submit();
    await flushRetryDelay();

    expect(screen.getByText(/Sin conexión/)).toBeInTheDocument();

    await clickRecovery('Reintentar imagen');

    expect(mockUploadProductImage).toHaveBeenCalledTimes(3);
    expect(screen.getByRole('button', { name: 'Guardando…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Reintentar imagen' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Guardar sin imagen' })).toBeDisabled();
    expect(onSuccess).not.toHaveBeenCalled();

    await flushRetryDelay();

    expect(mockUploadProductImage).toHaveBeenCalledTimes(4);
    expect(screen.getByText(/413 de nuevo/)).toBeInTheDocument();
    expect(screen.queryByText(/Sin conexión/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reintentar imagen' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Guardar sin imagen' })).toBeEnabled();
    expect(onSuccess).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });
});
