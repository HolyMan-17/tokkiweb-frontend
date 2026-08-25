import { describe, expect, test } from 'vitest';
import { sanitizeTextInput, normalizeTextInput } from './productText';

describe('sanitizeTextInput (per-keystroke)', () => {
  test('keeps trailing spaces so multi-word names can be typed', () => {
    expect(sanitizeTextInput('Peluche ')).toBe('Peluche ');
  });

  test('keeps internal spacing exactly as typed', () => {
    expect(sanitizeTextInput('Peluche de Naru')).toBe('Peluche de Naru');
  });

  test('strips control characters only', () => {
    expect(sanitizeTextInput('Pin\u0000 X\u001F')).toBe('Pin X');
  });

  test('enforces the 80-char limit', () => {
    expect(sanitizeTextInput('a'.repeat(100)).length).toBe(80);
  });
});

describe('normalizeTextInput (blur / submit)', () => {
  test('collapses repeated whitespace and trims ends', () => {
    expect(normalizeTextInput('  Peluche   de  Naruto  ')).toBe('Peluche de Naruto');
  });

  test('preserves special characters like @', () => {
    expect(normalizeTextInput('Peluche de Naruto@')).toBe('Peluche de Naruto@');
  });
});
