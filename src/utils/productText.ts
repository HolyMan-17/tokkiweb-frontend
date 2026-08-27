// Text sanitizers for admin product fields.
//
// Two-phase design — this is what makes multi-word names like
// "Peluche de Naruto" possible:
//   1. `sanitizeTextInput` runs on every keystroke: strips control chars and
//      caps length, but NEVER touches whitespace (a trailing space must
//      survive until the next word is typed).
//   2. `normalizeTextInput` runs on blur / submit: collapses repeated
//      whitespace and trims the ends.

export const PRODUCT_TEXT_MAX = 80;

export function sanitizeTextInput(value: string): string {
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\u0000-\u001F\u007F]/g, '').slice(0, PRODUCT_TEXT_MAX);
}

export function normalizeTextInput(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}
