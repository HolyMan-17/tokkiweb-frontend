import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  COMPRESS_THRESHOLD_BYTES,
  MAX_DIMENSION_PX,
  RETRY_THRESHOLD_BYTES,
  compressImage,
  computeScale,
  pickTargetMime,
  shouldCompress,
  swapExtension,
} from './compressImage';

function makeBlob(sizeBytes: number, type: string): Blob {
  return new Blob([new Uint8Array(sizeBytes)], { type });
}

function makeFile(name: string, sizeBytes: number, type = 'image/jpeg'): File {
  return new File([new Uint8Array(sizeBytes)], name, { type });
}

interface FakeImageSetup {
  width: number;
  height: number;
  fail: boolean;
}

let imageSetup: FakeImageSetup = { width: 3200, height: 2400, fail: false };
let blobScript: Array<Blob | null> = [];

class FakeImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  naturalWidth = 0;
  naturalHeight = 0;

  set src(_url: string) {
    queueMicrotask(() => {
      if (imageSetup.fail) {
        this.onerror?.();
        return;
      }
      this.naturalWidth = imageSetup.width;
      this.naturalHeight = imageSetup.height;
      this.onload?.();
    });
  }

  get src(): string {
    return '';
  }
}

const drawImageMock = vi.fn();
const encodeCalls: Array<{ type?: string; quality?: number }> = [];
const toBlobMock = vi.fn((callback: BlobCallback, type?: string, quality?: number) => {
  encodeCalls.push({ type, quality });
  const blob = blobScript.shift() ?? null;
  queueMicrotask(() => callback(blob));
});
const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

let originalToBlob: PropertyDescriptor | undefined;

beforeAll(() => {
  originalToBlob = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, 'toBlob');
  Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
    configurable: true,
    writable: true,
    value: toBlobMock,
  });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (
    this: HTMLCanvasElement,
  ) {
    return { drawImage: drawImageMock, canvas: this } as unknown as CanvasRenderingContext2D;
  });
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:compress-test-url');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  vi.stubGlobal('Image', FakeImage);
});

beforeEach(() => {
  vi.clearAllMocks();
  imageSetup = { width: 3200, height: 2400, fail: false };
  blobScript = [];
  encodeCalls.length = 0;
});

afterEach(() => {
  warnSpy.mockClear();
});

afterAll(() => {
  warnSpy.mockRestore();
  if (originalToBlob) {
    Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', originalToBlob);
  } else {
    delete (HTMLCanvasElement.prototype as { toBlob?: unknown }).toBlob;
  }
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('constantes exportadas', () => {
  it('expone los umbrales y límites especificados', () => {
    expect(COMPRESS_THRESHOLD_BYTES).toBe(1024 * 1024);
    expect(MAX_DIMENSION_PX).toBe(1600);
    expect(RETRY_THRESHOLD_BYTES).toBe(1536 * 1024);
  });
});

describe('shouldCompress', () => {
  it('no comprime archivos de 1 MB o menos', () => {
    expect(shouldCompress(COMPRESS_THRESHOLD_BYTES)).toBe(false);
    expect(shouldCompress(COMPRESS_THRESHOLD_BYTES - 1)).toBe(false);
  });

  it('comprime archivos mayores a 1 MB', () => {
    expect(shouldCompress(COMPRESS_THRESHOLD_BYTES + 1)).toBe(true);
  });
});

describe('computeScale', () => {
  it('escala para que el lado más largo quede en 1600 px', () => {
    expect(computeScale(3200, 2400)).toBe(0.5);
    expect(computeScale(1000, 2000)).toBe(0.8);
  });

  it('nunca amplía (escala 1 para imágenes de 1600 px o menos)', () => {
    expect(computeScale(800, 600)).toBe(1);
    expect(computeScale(MAX_DIMENSION_PX, MAX_DIMENSION_PX)).toBe(1);
  });
});

describe('pickTargetMime', () => {
  it('mantiene WebP cuando el primer encode produce WebP', () => {
    expect(pickTargetMime(makeBlob(10, 'image/webp'))).toBe('image/webp');
  });

  it('cae a JPEG con blob nulo o de otro tipo (Safari viejo)', () => {
    expect(pickTargetMime(null)).toBe('image/jpeg');
    expect(pickTargetMime(makeBlob(10, 'image/png'))).toBe('image/jpeg');
  });
});

describe('swapExtension', () => {
  it('reemplaza la extensión del nombre original según el mime elegido', () => {
    expect(swapExtension('foto.jpg', 'image/webp')).toBe('foto.webp');
    expect(swapExtension('foto.PNG', 'image/jpeg')).toBe('foto.jpg');
    expect(swapExtension('sinextension', 'image/webp')).toBe('sinextension.webp');
  });
});

describe('compressImage', () => {
  it('devuelve el MISMO archivo si pesa 1 MB o menos y no toca canvas', async () => {
    const file = makeFile('chica.jpg', COMPRESS_THRESHOLD_BYTES);

    const result = await compressImage(file);

    expect(result).toBe(file);
    expect(drawImageMock).not.toHaveBeenCalled();
    expect(toBlobMock).not.toHaveBeenCalled();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('reduce un archivo grande al máximo de 1600 px en su lado más largo', async () => {
    const compressed = makeBlob(800 * 1024, 'image/webp');
    blobScript = [compressed];

    const result = await compressImage(makeFile('foto.jpg', 3 * 1024 * 1024));

    expect(drawImageMock).toHaveBeenCalledTimes(1);
    const drawnArgs = drawImageMock.mock.calls[0] as unknown[];
    expect(drawnArgs[0]).toBeInstanceOf(FakeImage);
    expect(drawnArgs.slice(1)).toEqual([0, 0, 1600, 1200]);
    expect(result.name).toBe('foto.webp');
    expect(result.type).toBe('image/webp');
    expect(result.size).toBe(compressed.size);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:compress-test-url');
  });

  it('escala también retratos verticales (1000×2000 → 800×1600)', async () => {
    imageSetup = { width: 1000, height: 2000, fail: false };
    blobScript = [makeBlob(700 * 1024, 'image/webp')];

    await compressImage(makeFile('retrato.jpg', 2 * 1024 * 1024));

    const portraitArgs = drawImageMock.mock.calls[0] as unknown[];
    expect(portraitArgs[0]).toBeInstanceOf(FakeImage);
    expect(portraitArgs.slice(1)).toEqual([0, 0, 800, 1600]);
  });

  it('usa JPEG 0.82 como fallback cuando el encode WebP falla (blob nulo)', async () => {
    const jpegBlob = makeBlob(700 * 1024, 'image/jpeg');
    blobScript = [null, jpegBlob];

    const result = await compressImage(makeFile('foto.png', 2 * 1024 * 1024));

    expect(encodeCalls[0]?.type).toBe('image/webp');
    expect(encodeCalls[0]?.quality).toBe(0.82);
    expect(encodeCalls[1]?.type).toBe('image/jpeg');
    expect(encodeCalls[1]?.quality).toBe(0.82);
    expect(result.name).toBe('foto.jpg');
    expect(result.type).toBe('image/jpeg');
    expect(result.size).toBe(jpegBlob.size);
  });

  it('usa JPEG 0.82 cuando toBlob responde con un tipo distinto a WebP', async () => {
    blobScript = [makeBlob(700 * 1024, 'image/png'), makeBlob(700 * 1024, 'image/jpeg')];

    const result = await compressImage(makeFile('foto.png', 2 * 1024 * 1024));

    expect(encodeCalls[1]?.type).toBe('image/jpeg');
    expect(result.name).toBe('foto.jpg');
    expect(result.type).toBe('image/jpeg');
  });

  it('reintenta una vez a calidad 0.7 si el WebP resultante supera 1.5 MB', async () => {
    blobScript = [makeBlob(2 * 1024 * 1024, 'image/webp'), makeBlob(900 * 1024, 'image/webp')];

    const result = await compressImage(makeFile('pesada.jpg', 4 * 1024 * 1024));

    expect(toBlobMock).toHaveBeenCalledTimes(2);
    expect(encodeCalls[1]?.type).toBe('image/webp');
    expect(encodeCalls[1]?.quality).toBe(0.7);
    expect(result.size).toBe(900 * 1024);
  });

  it('el segundo pase mantiene la familia mime que funcionó (JPEG → JPEG 0.7)', async () => {
    blobScript = [
      null,
      makeBlob(2 * 1024 * 1024, 'image/jpeg'),
      makeBlob(800 * 1024, 'image/jpeg'),
    ];

    const result = await compressImage(makeFile('pesada.jpg', 4 * 1024 * 1024));

    expect(encodeCalls[2]?.type).toBe('image/jpeg');
    expect(encodeCalls[2]?.quality).toBe(0.7);
    expect(result.type).toBe('image/jpeg');
  });

  it('devuelve el archivo original si la imagen no se puede cargar', async () => {
    imageSetup = { width: 3200, height: 2400, fail: true };
    const original = makeFile('rota.jpg', 2 * 1024 * 1024);

    const result = await compressImage(original);

    expect(result).toBe(original);
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it('devuelve el archivo original si ningún encode produce blob', async () => {
    blobScript = [null, null];
    const original = makeFile('vacia.jpg', 2 * 1024 * 1024);

    const result = await compressImage(original);

    expect(result).toBe(original);
    expect(warnSpy).not.toHaveBeenCalled();
  });
});
