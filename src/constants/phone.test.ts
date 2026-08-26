import { describe, expect, test } from 'vitest';
import {
  COUNTRY_CODES,
  getCountryHint,
  normalizePhoneNumber,
  validatePhoneNumber,
  type CountryCode,
} from './index';

function findByShort(short: string): CountryCode {
  const found = COUNTRY_CODES.find((c) => c.short === short);
  if (!found) throw new Error(`Missing country fixture: ${short}`);
  return found;
}

// Entry without a custom hint — exercises the generated-placeholder fallback.
function bareEntry(digits: number): CountryCode {
  return {
    code: '+00',
    country: 'Testland',
    short: 'TS',
    digits,
    stripLeadingZero: false,
  };
}

describe('normalizePhoneNumber', () => {
  test('strips the leading trunk zero for stripLeadingZero countries (VE 0414… → 414…)', () => {
    const ve = findByShort('VE');
    expect(normalizePhoneNumber(ve, '04141234567')).toBe('4141234567');
  });

  test('removes formatting characters before normalizing', () => {
    const ve = findByShort('VE');
    expect(normalizePhoneNumber(ve, '(0414) 123-4567')).toBe('4141234567');
  });

  test('leaves numbers without a leading zero untouched (strip countries)', () => {
    const gb = findByShort('GB');
    expect(normalizePhoneNumber(gb, '7400 123456')).toBe('7400123456');
  });

  test('keeps the leading zero when stripLeadingZero is false', () => {
    const cl = findByShort('CL');
    expect(normalizePhoneNumber(cl, '09 1234 5678')).toBe('0912345678');
  });

  test('strips at most one leading zero', () => {
    const mx = findByShort('MX');
    expect(normalizePhoneNumber(mx, '0012221234567')).toBe('012221234567');
  });
});

describe('validatePhoneNumber', () => {
  test('valid number (after normalization) returns empty string', () => {
    const ve = findByShort('VE');
    expect(validatePhoneNumber(ve, '0414 123 4567')).toBe('');
  });

  test('empty input asks the user to enter their number (Spanish)', () => {
    const ve = findByShort('VE');
    expect(validatePhoneNumber(ve, '')).toBe('Ingresa tu número de teléfono.');
  });

  test('non-digit garbage input counts as empty', () => {
    const us = findByShort('US');
    expect(validatePhoneNumber(us, 'abc')).toBe('Ingresa tu número de teléfono.');
  });

  test('too-short numbers say how many digits are missing (singular)', () => {
    const ve = findByShort('VE');
    expect(validatePhoneNumber(ve, '0414 123 456')).toBe(
      'Faltan 1 dígito (412 123 4567).',
    );
  });

  test('pluralizes "dígitos" when more than one digit is missing', () => {
    const pe = findByShort('PE');
    expect(validatePhoneNumber(pe, '912 345')).toBe(
      'Faltan 3 dígitos (912 345 678).',
    );
  });

  test('too-long numbers point at the expected format', () => {
    const co = findByShort('CO');
    expect(validatePhoneNumber(co, '321 123 4567 9')).toBe(
      'El número es muy largo. Ej. 321 123 4567.',
    );
  });

  test('countries without a custom hint fall back to the generated placeholder in hints', () => {
    expect(validatePhoneNumber(bareEntry(10), '123')).toBe(
      'Faltan 7 dígitos (000 000 0000).',
    );
  });
});

describe('getCountryHint', () => {
  test('prefers the custom hint defined for the country', () => {
    const ve = findByShort('VE');
    expect(getCountryHint(ve)).toBe('412 123 4567');
  });

  test('falls back to a generated placeholder built from the digit count', () => {
    expect(getCountryHint(bareEntry(10))).toBe('000 000 0000');
  });

  test('generates a compact placeholder for small digit counts', () => {
    expect(getCountryHint(bareEntry(4))).toBe('0000');
    expect(getCountryHint(bareEntry(2))).toBe('00');
  });
});
