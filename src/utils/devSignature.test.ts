import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { printDevSignature, DEV_ASCII_ART, DEV_CONTACT_MESSAGE } from './devSignature';

describe('devSignature utility', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('contains the exact ASCII art for BY MANUEL', () => {
    expect(DEV_ASCII_ART).toContain('██████╗ ██╗   ██╗');
    expect(DEV_ASCII_ART).toContain('███╗   ███╗ █████╗');
    expect(DEV_ASCII_ART).toContain('╚═════╝    ╚═╝');
  });

  it('contains the bilingual business inquiries message with the developer email', () => {
    expect(DEV_CONTACT_MESSAGE).toContain('macg022004@gmail.com');
    expect(DEV_CONTACT_MESSAGE).toContain('For business inquiries, website development or other projects email me at macg022004@gmail.com');
    expect(DEV_CONTACT_MESSAGE).toContain('Para consultas de negocio, desarrollo de paginas web u otros proyectos por favor envie un correo a: macg022004@gmail.com');
  });

  it('prints the styled ASCII art and contact information to console.log', () => {
    printDevSignature();
    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const firstCallArgs = consoleSpy.mock.calls[0];
    const logString = String(firstCallArgs[0]);
    expect(logString).toContain(DEV_ASCII_ART);
    expect(logString).toContain(DEV_CONTACT_MESSAGE);
  });
});
