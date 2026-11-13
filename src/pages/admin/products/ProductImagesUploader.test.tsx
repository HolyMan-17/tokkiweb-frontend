import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProductImagesUploader, MAX_PRODUCT_IMAGES, type GalleryItem } from './ProductImagesUploader';
import { compressImage } from '../../../utils/compressImage';

vi.mock('../../../utils/compressImage', () => ({
  compressImage: vi.fn(),
}));

const mockCompress = vi.mocked(compressImage);

function makeProps(overrides: Partial<Parameters<typeof ProductImagesUploader>[0]> = {}) {
  return {
    gallery: [] as GalleryItem[],
    onFilesSelected: vi.fn(),
    onRemoveItem: vi.fn(),
    onMakeCover: vi.fn(),
    showToast: vi.fn(),
    onImageTooLarge: vi.fn(),
    ...overrides,
  };
}

function pendingItem(index: number): GalleryItem {
  return {
    id: `pending-${index}`,
    kind: 'pending',
    file: new File(['x'], `foto-${index}.png`, { type: 'image/png' }),
    previewUrl: `blob:preview-${index}`,
    status: 'queued',
  };
}

function existingItem(index: number): GalleryItem {
  return {
    id: `existing-${index}`,
    kind: 'existing',
    url: `http://x/images/products/${index}.webp`,
    previewUrl: `http://x/images/products/${index}.webp`,
  };
}

async function pickFiles(container: HTMLElement, files: File[]) {
  const input = container.querySelector('#product_images_input') as HTMLInputElement;
  const user = userEvent.setup({ applyAccept: false });
  // user.upload acepta un archivo por llamada; en inputs [multiple] cada
  // llamada añade al selection previo.
  for (const file of files) {
    await user.upload(input, file);
  }
  return user;
}

describe('ProductImagesUploader (integración con compressImage)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCompress.mockImplementation(async (file: File) =>
      new File([file], 'comprimido.webp', { type: 'image/webp' }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('muestra el estado vacío con la pista de formatos y el contador 0/5', () => {
    render(<ProductImagesUploader {...makeProps()} />);

    expect(screen.getByText('Fotos del Producto (0/5)')).toBeInTheDocument();
    expect(screen.getByText('Agregar')).toBeInTheDocument();
    expect(screen.getByText('JPG, PNG, WEBP')).toBeInTheDocument();
    expect(document.querySelector('.images-uploader-slot')).toBeNull();
  });

  it('valida y comprime los archivos elegidos antes de entregarlos', async () => {
    const props = makeProps();
    const original = new File([new Uint8Array(2 * 1024 * 1024)], 'gato.png', { type: 'image/png' });

    const { container } = render(<ProductImagesUploader {...props} />);
    await pickFiles(container, [original]);

    await waitFor(() => {
      expect(mockCompress).toHaveBeenCalledWith(original);
      expect(props.onFilesSelected).toHaveBeenCalledTimes(1);
    });
    const delivered = props.onFilesSelected.mock.calls[0][0] as File[];
    expect(delivered).toHaveLength(1);
    expect(delivered[0].name).toBe('comprimido.webp');
  });

  it('entrega varios archivos en orden con múltiples compresiones', async () => {
    const props = makeProps();
    const a = new File(['a'], 'una.jpg', { type: 'image/jpeg' });
    const b = new File(['b'], 'dos.jpg', { type: 'image/jpeg' });

    const { container } = render(<ProductImagesUploader {...props} />);
    const input = container.querySelector('#product_images_input') as HTMLInputElement;
    // Los navegadores entregan una selección múltiple como UN solo evento change.
    fireEvent.change(input, { target: { files: [a, b] } });

    await waitFor(() => {
      expect(mockCompress).toHaveBeenCalledTimes(2);
      expect(props.onFilesSelected).toHaveBeenCalledTimes(1);
    });
    const delivered = props.onFilesSelected.mock.calls[0][0] as File[];
    expect(delivered).toHaveLength(2);
    expect(delivered[0].name).toBe('comprimido.webp');
    expect(delivered[1].name).toBe('comprimido.webp');
  });

  it('rechaza archivos con formato no soportado sin entregar nada', async () => {
    const props = makeProps();
    const txt = new File(['hola'], 'notas.txt', { type: 'text/plain' });
    const ok = new File(['ok'], 'bien.png', { type: 'image/png' });

    const { container } = render(<ProductImagesUploader {...props} />);
    await pickFiles(container, [txt, ok]);

    await waitFor(() => expect(props.showToast).toHaveBeenCalled());
    expect(props.showToast).toHaveBeenCalledWith('Formato no soportado (notas.txt). Usa JPG, PNG o WEBP.');
    expect(mockCompress).toHaveBeenCalledTimes(1);
    const delivered = props.onFilesSelected.mock.calls[0][0] as File[];
    expect(delivered).toHaveLength(1);
  });

  it('mantiene el límite de 5 MB por archivo: llama onImageTooLarge y no lo comprime', async () => {
    const props = makeProps();
    const huge = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'enorme.jpg', { type: 'image/jpeg' });

    const { container } = render(<ProductImagesUploader {...props} />);
    await pickFiles(container, [huge]);

    expect(props.onImageTooLarge).toHaveBeenCalledTimes(1);
    expect(mockCompress).not.toHaveBeenCalled();
    expect(props.onFilesSelected).not.toHaveBeenCalled();
  });

  it('oculta el botón Agregar y avisa al llegar al máximo de 5 imágenes', () => {
    const gallery: GalleryItem[] = [0, 1, 2, 3, 4].map(pendingItem);
    render(<ProductImagesUploader {...makeProps({ gallery })} />);

    expect(screen.getByText(`Fotos del Producto (5/${MAX_PRODUCT_IMAGES})`)).toBeInTheDocument();
    expect(screen.getByText(`Máximo ${MAX_PRODUCT_IMAGES} imágenes`)).toBeInTheDocument();
    expect(document.querySelector('#product_images_input')).toBeNull();
  });

  it('recorta la selección que exceda el espacio restante y avisa', async () => {
    const props = makeProps({ gallery: [pendingItem(1), pendingItem(2), pendingItem(3)] });
    const files = [1, 2, 3].map((n) => new File([String(n)], `f${n}.png`, { type: 'image/png' }));

    const { container } = render(<ProductImagesUploader {...props} />);
    const input = container.querySelector('#product_images_input') as HTMLInputElement;
    fireEvent.change(input, { target: { files } });

    await waitFor(() => expect(props.onFilesSelected).toHaveBeenCalled());
    expect(props.showToast).toHaveBeenCalledWith('Solo puedes agregar 2 imágenes más.');
    const delivered = props.onFilesSelected.mock.calls[0][0] as File[];
    expect(delivered).toHaveLength(2);
    expect(mockCompress).toHaveBeenCalledTimes(2);
  });

  it('etiqueta la primera imagen como portada y pide el cambio con las demás', () => {
    const gallery: GalleryItem[] = [existingItem(1), existingItem(2), existingItem(3)];
    const props = makeProps({ gallery });
    render(<ProductImagesUploader {...props} />);

    expect(document.querySelector('.images-uploader-cover-badge')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Hacer portada la imagen 2' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hacer portada la imagen 3' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Hacer portada la imagen 1' })).not.toBeInTheDocument();

    const second = screen.getByRole('button', { name: 'Hacer portada la imagen 2' });
    second.click();
    expect(props.onMakeCover).toHaveBeenCalledWith('existing-2');
  });

  it('pide quitar una imagen con su etiqueta accesible', () => {
    const gallery: GalleryItem[] = [pendingItem(1), pendingItem(2)];
    const props = makeProps({ gallery });
    render(<ProductImagesUploader {...props} />);

    screen.getByRole('button', { name: 'Quitar imagen 2' }).click();
    expect(props.onRemoveItem).toHaveBeenCalledWith('pending-2');
  });

  it('muestra el estado de subida fallida en la ranura pendiente', () => {
    const failed: GalleryItem = { ...pendingItem(1), status: 'failed' };
    render(<ProductImagesUploader {...makeProps({ gallery: [failed] })} />);

    expect(screen.getByText('Falló')).toBeInTheDocument();
  });
});
