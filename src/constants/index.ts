// ─── Categories (name → emoji) ────────────────────────────
export const CATEGORIES: { name: string; emoji: string }[] = [
  { name: 'Maquillaje',          emoji: '💄' },
  { name: 'Skincare',            emoji: '🧴' },
  { name: 'Accesorios',          emoji: '💎' },
  { name: 'Lentes de Contacto',  emoji: '👁️' },
  { name: 'Pines & Chapas',      emoji: '📌' },
  { name: 'Ropa',                emoji: '👗' },
  { name: 'Dulces Asiáticos',    emoji: '🍡' },
  { name: 'Peluches y Figuras',  emoji: '🧸' },
  { name: 'Otros',               emoji: '🛍️' },
];

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-');
}

// ─── Delivery options ──────────────────────────────────────
export const DELIVERY_TYPES = [
  { value: 'standard', label: 'Envío Estándar' },
  { value: 'pickup',   label: 'Retiro en Tienda' },
] as const;

// ─── Payment methods ──────────────────────────────────────
export const PAYMENT_METHODS = [
  { value: 'pago_movil',    label: 'Pago Móvil' },
  { value: 'bank_transfer', label: 'Transferencia Bancaria' },
  { value: 'cash',          label: 'Efectivo' },
  { value: 'zelle',         label: 'Zelle' },
] as const;

// ─── Country codes (full international list) ───────────────
// `digits` = expected national (significant) number length EXCLUDING the
// country code and any trunk prefix "0". Values follow the ITU-T E.164
// numbering plan (e.g. LayerCall / libphonenumber reference data).
// `hint` = optional custom placeholder; when omitted it is generated from
// `digits`. `stripLeadingZero` = drop a leading "0" the user may type from
// local habit (e.g. VE "0414…" → "414…", UK "07…" → "7…").
export const COUNTRY_CODES = [
  // ── LatAm + Caribbean (store's primary region) ───────────
  { code: '+58', country: '🇻🇪 Venezuela', short: 'VE', digits: 10, hint: '412 123 4567', stripLeadingZero: true },
  { code: '+54', country: '🇦🇷 Argentina', short: 'AR', digits: 11, hint: '9 11 2345 6789', stripLeadingZero: true },
  { code: '+591', country: '🇧🇴 Bolivia',  short: 'BO', digits: 8,  hint: '712 34567', stripLeadingZero: true },
  { code: '+55', country: '🇧🇷 Brasil',    short: 'BR', digits: 11, hint: '11 96123 4567', stripLeadingZero: true },
  { code: '+56', country: '🇨🇱 Chile',     short: 'CL', digits: 9,  hint: '9 1234 5678', stripLeadingZero: false },
  { code: '+57', country: '🇨🇴 Colombia',  short: 'CO', digits: 10, hint: '321 123 4567', stripLeadingZero: false },
  { code: '+506', country: '🇨🇷 Costa Rica', short: 'CR', digits: 8,  hint: '8312 3456', stripLeadingZero: false },
  { code: '+53', country: '🇨🇺 Cuba',       short: 'CU', digits: 8,  hint: '5 123 4567', stripLeadingZero: false },
  { code: '+593', country: '🇪🇨 Ecuador',    short: 'EC', digits: 9,  hint: '99 123 4567', stripLeadingZero: false },
  { code: '+503', country: '🇸🇻 El Salvador', short: 'SV', digits: 8,  hint: '7123 4567', stripLeadingZero: false },
  { code: '+502', country: '🇬🇹 Guatemala',  short: 'GT', digits: 8,  hint: '5123 4567', stripLeadingZero: false },
  { code: '+504', country: '🇭🇳 Honduras',   short: 'HN', digits: 8,  hint: '9123 4567', stripLeadingZero: false },
  { code: '+52', country: '🇲🇽 México',      short: 'MX', digits: 10, hint: '222 123 4567', stripLeadingZero: true },
  { code: '+505', country: '🇳🇮 Nicaragua',  short: 'NI', digits: 8,  hint: '8123 4567', stripLeadingZero: false },
  { code: '+507', country: '🇵🇦 Panamá',     short: 'PA', digits: 8,  hint: '6123 4567', stripLeadingZero: false },
  { code: '+595', country: '🇵🇾 Paraguay',   short: 'PY', digits: 9,  hint: '961 456 789', stripLeadingZero: true },
  { code: '+51', country: '🇵🇪 Perú',        short: 'PE', digits: 9,  hint: '912 345 678', stripLeadingZero: false },
  { code: '+598', country: '🇺🇾 Uruguay',    short: 'UY', digits: 8,  hint: '94 231 234', stripLeadingZero: false },
  // ── North America (NANP) ─────────────────────────────────
  { code: '+1', country: '🇺🇸 Estados Unidos', short: 'US', digits: 10, hint: '305 123 4567', stripLeadingZero: false },
  { code: '+1', country: '🇨🇦 Canadá',          short: 'CA', digits: 10, hint: '506 234 5678', stripLeadingZero: false },
  { code: '+1', country: '🇩🇴 R. Dominicana',   short: 'DO', digits: 10, hint: '809 234 5678', stripLeadingZero: false },
  { code: '+1', country: '🇵🇷 Puerto Rico',     short: 'PR', digits: 10, hint: '787 234 5678', stripLeadingZero: false },
  { code: '+1', country: '🇯🇲 Jamaica',         short: 'JM', digits: 10, hint: '876 234 5678', stripLeadingZero: false },
  { code: '+1', country: '🇹🇹 Trinidad y Tobago', short: 'TT', digits: 10, hint: '868 234 5678', stripLeadingZero: false },
  { code: '+1', country: '🇧🇸 Bahamas',          short: 'BS', digits: 10, hint: '242 234 5678', stripLeadingZero: false },
  { code: '+1', country: '🇧🇧 Barbados',         short: 'BB', digits: 10, hint: '246 234 5678', stripLeadingZero: false },
  // ── Europe ───────────────────────────────────────────────
  { code: '+44', country: '🇬🇧 Reino Unido', short: 'GB', digits: 10, hint: '7400 123456', stripLeadingZero: true },
  { code: '+353', country: '🇮🇪 Irlanda',    short: 'IE', digits: 9,  hint: '85 012 3456', stripLeadingZero: true },
  { code: '+49', country: '🇩🇪 Alemania',    short: 'DE', digits: 11, hint: '1512 3456789', stripLeadingZero: true },
  { code: '+33', country: '🇫🇷 Francia',     short: 'FR', digits: 9,  hint: '6 12 34 56 78', stripLeadingZero: true },
  { code: '+34', country: '🇪🇸 España',      short: 'ES', digits: 9,  hint: '612 34 56 78', stripLeadingZero: false },
  { code: '+39', country: '🇮🇹 Italia',      short: 'IT', digits: 10, hint: '312 345 6789', stripLeadingZero: false },
  { code: '+31', country: '🇳🇱 Países Bajos', short: 'NL', digits: 9,  hint: '6 12345678', stripLeadingZero: true },
  { code: '+32', country: '🇧🇪 Bélgica',     short: 'BE', digits: 9,  hint: '450 00 12 34', stripLeadingZero: true },
  { code: '+41', country: '🇨🇭 Suiza',       short: 'CH', digits: 9,  hint: '78 123 45 67', stripLeadingZero: true },
  { code: '+43', country: '🇦🇹 Austria',     short: 'AT', digits: 9,  hint: '664 123456', stripLeadingZero: true },
  { code: '+46', country: '🇸🇪 Suecia',      short: 'SE', digits: 9,  hint: '70 123 45 67', stripLeadingZero: true },
  { code: '+47', country: '🇳🇴 Noruega',     short: 'NO', digits: 8,  hint: '40 61 23 45', stripLeadingZero: false },
  { code: '+45', country: '🇩🇰 Dinamarca',   short: 'DK', digits: 8,  hint: '34 41 23 45', stripLeadingZero: false },
  { code: '+358', country: '🇫🇮 Finlandia',  short: 'FI', digits: 9,  hint: '41 2345678', stripLeadingZero: true },
  { code: '+48', country: '🇵🇱 Polonia',     short: 'PL', digits: 9,  hint: '512 345 678', stripLeadingZero: false },
  { code: '+351', country: '🇵🇹 Portugal',   short: 'PT', digits: 9,  hint: '912 345 678', stripLeadingZero: false },
  { code: '+420', country: '🇨🇿 Chequia',    short: 'CZ', digits: 9,  hint: '601 123 456', stripLeadingZero: false },
  { code: '+40', country: '🇷🇴 Rumania',     short: 'RO', digits: 9,  hint: '712 034 567', stripLeadingZero: false },
  { code: '+30', country: '🇬🇷 Grecia',      short: 'GR', digits: 10, hint: '691 234 5678', stripLeadingZero: false },
  { code: '+36', country: '🇭🇺 Hungría',     short: 'HU', digits: 9,  hint: '20 123 4567', stripLeadingZero: true },
  { code: '+359', country: '🇧🇬 Bulgaria',   short: 'BG', digits: 8,  hint: '43 012 345', stripLeadingZero: true },
  { code: '+385', country: '🇭🇷 Croacia',    short: 'HR', digits: 9,  hint: '92 123 4567', stripLeadingZero: true },
  { code: '+421', country: '🇸🇰 Eslovaquia', short: 'SK', digits: 9,  hint: '912 123 456', stripLeadingZero: false },
  { code: '+386', country: '🇸🇮 Eslovenia',  short: 'SI', digits: 8,  hint: '31 234 567', stripLeadingZero: false },
  { code: '+381', country: '🇷🇸 Serbia',     short: 'RS', digits: 9,  hint: '60 1234567', stripLeadingZero: false },
  { code: '+380', country: '🇺🇦 Ucrania',    short: 'UA', digits: 9,  hint: '50 123 4567', stripLeadingZero: true },
  { code: '+370', country: '🇱🇹 Lituania',   short: 'LT', digits: 8,  hint: '612 34567', stripLeadingZero: false },
  { code: '+371', country: '🇱🇻 Letonia',    short: 'LV', digits: 8,  hint: '21 234 567', stripLeadingZero: false },
  { code: '+372', country: '🇪🇪 Estonia',    short: 'EE', digits: 8,  hint: '5123 4567', stripLeadingZero: false },
  { code: '+354', country: '🇮🇸 Islandia',   short: 'IS', digits: 7,  hint: '611 1234', stripLeadingZero: false },
  { code: '+352', country: '🇱🇺 Luxemburgo', short: 'LU', digits: 9,  hint: '628 123 456', stripLeadingZero: false },
  { code: '+357', country: '🇨🇾 Chipre',     short: 'CY', digits: 8,  hint: '96 123456', stripLeadingZero: false },
  { code: '+356', country: '🇲🇹 Malta',      short: 'MT', digits: 8,  hint: '9696 1234', stripLeadingZero: false },
  // ── Asia ─────────────────────────────────────────────────
  { code: '+91', country: '🇮🇳 India',        short: 'IN', digits: 10, hint: '81234 56789', stripLeadingZero: false },
  { code: '+92', country: '🇵🇰 Pakistán',     short: 'PK', digits: 10, hint: '301 2345678', stripLeadingZero: false },
  { code: '+880', country: '🇧🇩 Bangladesh',  short: 'BD', digits: 10, hint: '1812 345678', stripLeadingZero: false },
  { code: '+62', country: '🇮🇩 Indonesia',    short: 'ID', digits: 9,  hint: '812 345 678', stripLeadingZero: true },
  { code: '+63', country: '🇵🇭 Filipinas',    short: 'PH', digits: 10, hint: '905 123 4567', stripLeadingZero: false },
  { code: '+65', country: '🇸🇬 Singapur',     short: 'SG', digits: 8,  hint: '8123 4567', stripLeadingZero: false },
  { code: '+60', country: '🇲🇾 Malasia',      short: 'MY', digits: 9,  hint: '12 345 6789', stripLeadingZero: false },
  { code: '+66', country: '🇹🇭 Tailandia',    short: 'TH', digits: 9,  hint: '81 234 5678', stripLeadingZero: false },
  { code: '+84', country: '🇻🇳 Vietnam',      short: 'VN', digits: 9,  hint: '912 345 678', stripLeadingZero: false },
  { code: '+81', country: '🇯🇵 Japón',        short: 'JP', digits: 10, hint: '90 1234 5678', stripLeadingZero: true },
  { code: '+82', country: '🇰🇷 Corea del Sur', short: 'KR', digits: 10, hint: '10 2000 0000', stripLeadingZero: true },
  { code: '+86', country: '🇨🇳 China',        short: 'CN', digits: 11, hint: '131 2345 6789', stripLeadingZero: false },
  { code: '+852', country: '🇭🇰 Hong Kong',   short: 'HK', digits: 8,  hint: '5123 4567', stripLeadingZero: false },
  { code: '+886', country: '🇹🇼 Taiwán',      short: 'TW', digits: 9,  hint: '912 345 678', stripLeadingZero: false },
  { code: '+94', country: '🇱🇰 Sri Lanka',    short: 'LK', digits: 9,  hint: '71 234 5678', stripLeadingZero: false },
  { code: '+977', country: '🇳🇵 Nepal',       short: 'NP', digits: 10, hint: '984 1234567', stripLeadingZero: false },
  { code: '+855', country: '🇰🇭 Camboya',     short: 'KH', digits: 8,  hint: '91 234 567', stripLeadingZero: false },
  { code: '+7', country: '🇰🇿 Kazajistán',    short: 'KZ', digits: 10, hint: '771 000 9998', stripLeadingZero: true },
  { code: '+998', country: '🇺🇿 Uzbekistán',  short: 'UZ', digits: 9,  hint: '91 234 56 78', stripLeadingZero: false },
  { code: '+95', country: '🇲🇲 Birmania',     short: 'MM', digits: 8,  hint: '9 212 3456', stripLeadingZero: false },
  { code: '+90', country: '🇹🇷 Turquía',      short: 'TR', digits: 10, hint: '501 234 56 78', stripLeadingZero: false },
  // ── Middle East ──────────────────────────────────────────
  { code: '+971', country: '🇦🇪 EAU',        short: 'AE', digits: 9,  hint: '50 123 4567', stripLeadingZero: false },
  { code: '+966', country: '🇸🇦 Arabia Saudita', short: 'SA', digits: 9,  hint: '51 234 5678', stripLeadingZero: false },
  { code: '+972', country: '🇮🇱 Israel',      short: 'IL', digits: 9,  hint: '50 234 5678', stripLeadingZero: false },
  { code: '+974', country: '🇶🇦 Catar',       short: 'QA', digits: 8,  hint: '3312 3456', stripLeadingZero: false },
  { code: '+965', country: '🇰🇼 Kuwait',      short: 'KW', digits: 8,  hint: '500 12345', stripLeadingZero: false },
  { code: '+973', country: '🇧🇭 Baréin',      short: 'BH', digits: 8,  hint: '3600 1234', stripLeadingZero: false },
  { code: '+968', country: '🇴🇲 Omán',        short: 'OM', digits: 8,  hint: '9212 3456', stripLeadingZero: false },
  { code: '+962', country: '🇯🇴 Jordania',    short: 'JO', digits: 9,  hint: '7 9012 3456', stripLeadingZero: false },
  { code: '+961', country: '🇱🇧 Líbano',      short: 'LB', digits: 8,  hint: '71 123 456', stripLeadingZero: false },
  // ── Africa ───────────────────────────────────────────────
  { code: '+27', country: '🇿🇦 Sudáfrica',   short: 'ZA', digits: 9,  hint: '71 123 4567', stripLeadingZero: false },
  { code: '+234', country: '🇳🇬 Nigeria',    short: 'NG', digits: 10, hint: '802 123 4567', stripLeadingZero: false },
  { code: '+254', country: '🇰🇪 Kenia',      short: 'KE', digits: 9,  hint: '712 123456', stripLeadingZero: false },
  { code: '+20', country: '🇪🇬 Egipto',      short: 'EG', digits: 10, hint: '10 01234567', stripLeadingZero: false },
  { code: '+212', country: '🇲🇦 Marruecos',  short: 'MA', digits: 9,  hint: '6 50 12 34 56', stripLeadingZero: true },
  { code: '+213', country: '🇩🇿 Argelia',    short: 'DZ', digits: 9,  hint: '551 23 45 67', stripLeadingZero: false },
  { code: '+216', country: '🇹🇳 Túnez',      short: 'TN', digits: 8,  hint: '20 123 456', stripLeadingZero: false },
  { code: '+233', country: '🇬🇭 Ghana',      short: 'GH', digits: 9,  hint: '23 123 4567', stripLeadingZero: false },
  { code: '+255', country: '🇹🇿 Tanzania',   short: 'TZ', digits: 9,  hint: '621 234 567', stripLeadingZero: false },
  { code: '+256', country: '🇺🇬 Uganda',     short: 'UG', digits: 9,  hint: '712 345678', stripLeadingZero: false },
  { code: '+251', country: '🇪🇹 Etiopía',    short: 'ET', digits: 9,  hint: '91 123 4567', stripLeadingZero: false },
  { code: '+225', country: '🇨🇮 Costa de Marfil', short: 'CI', digits: 10, hint: '01 23 45 6789', stripLeadingZero: true },
  { code: '+221', country: '🇸🇳 Senegal',    short: 'SN', digits: 9,  hint: '70 123 45 67', stripLeadingZero: false },
  { code: '+260', country: '🇿🇲 Zambia',     short: 'ZM', digits: 9,  hint: '95 5123456', stripLeadingZero: false },
  { code: '+244', country: '🇦🇴 Angola',     short: 'AO', digits: 9,  hint: '923 456 789', stripLeadingZero: false },
  { code: '+258', country: '🇲🇿 Mozambique', short: 'MZ', digits: 9,  hint: '82 123 4567', stripLeadingZero: false },
  // ── Oceania ──────────────────────────────────────────────
  { code: '+61', country: '🇦🇺 Australia',       short: 'AU', digits: 9,  hint: '412 345 678', stripLeadingZero: false },
  { code: '+64', country: '🇳🇿 Nueva Zelanda',   short: 'NZ', digits: 9,  hint: '21 123 4567', stripLeadingZero: false },
  { code: '+679', country: '🇫🇯 Fiyi',           short: 'FJ', digits: 7,  hint: '990 1234', stripLeadingZero: false },
] as const;

// Re-exported type with an explicit optional hint so callers can rely on
// getCountryHint() for the placeholder regardless of whether one is set.
export interface CountryCodeEntry {
  code: string;
  country: string;
  short: string;
  digits: number;
  hint?: string;
  stripLeadingZero: boolean;
}

export type CountryCode = CountryCodeEntry;

// Builds a readable placeholder from the digit count (e.g. 10 → "000 000 0000").
function buildHint(digits: number): string {
  const tail = '0'.repeat(Math.min(4, digits));
  const head = digits - 4;
  if (head <= 0) return tail;
  const groups: string[] = [];
  for (let i = 0; i < head; i += 3) {
    groups.push('0'.repeat(Math.min(3, head - i)));
  }
  return `${groups.join(' ')} ${tail}`;
}

export function getCountryHint(country: CountryCode): string {
  return country.hint ?? buildHint(country.digits);
}

// Normalizes a locally-typed phone number to the digits that pair with the
// selected country code (strips a leading "0" trunk prefix where the country
// drops it in E.164, e.g. VE "0414…" → "414…").
export function normalizePhoneNumber(country: CountryCode, raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (country.stripLeadingZero && digits.startsWith('0')) {
    return digits.slice(1);
  }
  return digits;
}

// Validates the national number for its country. Returns an empty string when
// valid, or a friendly Spanish hint explaining what's wrong.
export function validatePhoneNumber(country: CountryCode, raw: string): string {
  const digits = normalizePhoneNumber(country, raw);
  if (!digits) return 'Ingresa tu número de teléfono.';
  if (digits.length < country.digits) {
    const missing = country.digits - digits.length;
    return `Faltan ${missing} dígito${missing === 1 ? '' : 's'} (${getCountryHint(country)}).`;
  }
  if (digits.length > country.digits) {
    return `El número es muy largo. Ej. ${getCountryHint(country)}.`;
  }
  return '';
}

// ─── Currency formatting ──────────────────────────────────
const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
});

export function formatPrice(price: string | number): string {
  return currencyFormatter.format(Number(price));
}

// ─── Date formatting ──────────────────────────────────────
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-VE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-VE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
