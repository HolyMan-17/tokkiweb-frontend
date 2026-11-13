import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RefObject } from 'react';
import { ProductImageUploader } from './ProductImageUploader';
import { compressImage } from '../../../utils/compressImage';

vi.mock('../../../utils/compressImage', () => ({
  compressImage: vi.fn(),
}));

const mockCompress = vi.mocked(compressImage);

interface UploaderProps {
  previewUrl: string;
  imageFileRef: RefObject<File | null>;
  setPreviewUrl: ReturnType<typeof vi.fn>;
  showToast: ReturnType<typeof vi.fn>;
  onImageTooLarge: ReturnType<typeof vi.fn>;
  onRemoveCurrent: ReturnType<typeof vi.fn>;
}

function makeProps(overrides: Partial<UploaderProps> = {}): UploaderProps {
  return {
    previewUrl: '',
    imageFileRef: { current: null } as RefObject<File | null>,
    setPreviewUrl: vi.fn(),
    showToast: vi.fn(),
    onImageTooLarge: vi.fn(),
    onRemoveCurrent: vi.fn(),
    ...overrides,
  };
}

async function uploadFile(container: HTMLElement, file: File) {
  const input = container.querySelector('#product_image_input') as HTMLInputElement;
  const user = userEvent.setup({ applyAccept: false });
  await user.upload(input, file);
  return user;
}

describe('ProductImageUploader (integración con compressImage)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCompress.mockImplementation(async (file: File) => {
      return new File([file], 'comprimido.webp', { type: 'image/webp' });
    });
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:preview-url');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('guarda el archivo comprimido en imageFileRef y previsualiza con object URL', async () => {
    const props = makeProps();
    const original = new File([new Uint8Array(2 * 1024 * 1024)], 'gato.png', {
      type: 'image/png',
    });

    const { container } = render(<ProductImageUploader {...props} />);
    await uploadFile(container, original);

    await waitFor(() => {
      expect(mockCompress).toHaveBeenCalledWith(original);
      expect(props.imageFileRef.current?.name).toBe('comprimido.webp');
      expect(props.setPreviewUrl).toHaveBeenCalledWith('blob:preview-url');
    });
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
  });

  it('revoca el object URL anterior al seleccionar una nueva imagen', async () => {
    const props = makeProps();
    const first = new File([new Uint8Array(2 * 1024 * 1024)], 'una.jpg', { type: 'image/jpeg' });
    const second = new File([new Uint8Array(2 * 1024 * 1024)], 'dos.jpg', { type: 'image/jpeg' });

    const { container } = render(<ProductImageUploader {...props} />);
    await uploadFile(container, first);
    await waitFor(() => expect(props.setPreviewUrl).toHaveBeenCalledTimes(1));

    await uploadFile(container, second);

    await waitFor(() => expect(props.setPreviewUrl).toHaveBeenCalledTimes(2));
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview-url');
    expect(props.imageFileRef.current?.name).toBe('comprimido.webp');
  });

  it('mantiene el chequeo de formato: tipo no soportado no se comprime', async () => {
    const props = makeProps();
    const txt = new File(['hola'], 'notas.txt', { type: 'text/plain' });

    const { container } = render(<ProductImageUploader {...props} />);
    await uploadFile(container, txt);

    expect(props.showToast).toHaveBeenCalledWith('Formato no soportado. Usa JPG, PNG o WEBP.');
    expect(mockCompress).not.toHaveBeenCalled();
    expect(props.setPreviewUrl).not.toHaveBeenCalled();
  });

  it('mantiene el límite de 5 MB: llama onImageTooLarge y no comprime', async () => {
    const props = makeProps();
    const huge = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'enorme.jpg', {
      type: 'image/jpeg',
    });

    const { container } = render(<ProductImageUploader {...props} />);
    await uploadFile(container, huge);

    expect(props.onImageTooLarge).toHaveBeenCalledTimes(1);
    expect(mockCompress).not.toHaveBeenCalled();
    expect(props.setPreviewUrl).not.toHaveBeenCalled();
  });
});
