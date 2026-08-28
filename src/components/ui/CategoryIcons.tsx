// ─── Category icons — single source of truth ────────────────────────────────
// Maps each category name to its brand asset (gif/png). Used by both the
// catalog carousels and the category page header so they always match.

import lipstickGif from '../../assets/lipstick.gif';
import cosmeticImg from '../../assets/cosmetic.avif';
import ringImg from '../../assets/ring.avif';
import lentesImg from '../../assets/lentes_contacto.avif';
import dressImg from '../../assets/dress.avif';
import pinImg from '../../assets/pin.avif';
import treatGif from '../../assets/treat.gif';
import hoppingBear from '../../assets/hopping_bear.gif';
import beatingHeart from '../../assets/beating_heart.gif';
import kpopImg from '../../assets/kpop.png';
import giftGif from '../../assets/gift.gif';

export const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  Maquillaje: <img src={lipstickGif} alt="" className="category-emoji-img" width={84} height={80} loading="lazy" />,
  Skincare: <img src={cosmeticImg} alt="" className="category-emoji-img category-cosmetic" width={128} height={112} loading="lazy" />,
  Accesorios: <img src={ringImg} alt="" className="category-emoji-img" width={223} height={250} loading="lazy" />,
  'Lentes de Contacto': <img src={lentesImg} alt="" className="category-emoji-img category-lentes" width={224} height={145} loading="lazy" />,
  'Pines & Chapas': <img src={pinImg} alt="" className="category-emoji-img" width={158} height={167} loading="lazy" />,
  Ropa: <img src={dressImg} alt="" className="category-emoji-img category-dress" width={128} height={128} loading="lazy" />,
  'Dulces & Comida Asiatica': <img src={treatGif} alt="" className="category-emoji-img category-treat" width={112} height={94} loading="lazy" />,
  'Dulces Asiáticos': <img src={treatGif} alt="" className="category-emoji-img category-treat" width={112} height={94} loading="lazy" />,
  'Peluches y Figuras': <img src={hoppingBear} alt="" className="category-emoji-img category-bear" width={112} height={112} loading="lazy" />,
  'Zona KPOP': <img src={kpopImg} alt="" className="category-emoji-img category-kpop" width={160} height={160} loading="lazy" />,
  'Bolsas o cajas de regalo': <img src={giftGif} alt="" className="category-emoji-img category-gift" width={140} height={134} loading="lazy" />,
  Otros: <img src={beatingHeart} alt="" className="category-emoji-img category-heart" width={190} height={180} loading="lazy" />,
};

const CATEGORY_ALIASES: Record<string, string> = {
  kpop: 'Zona KPOP',
  'k-pop': 'Zona KPOP',
  'zona-kpop': 'Zona KPOP',
  'zona kpop': 'Zona KPOP',
  'zona k-pop': 'Zona KPOP',
  'bolsas o cajas de regalo': 'Bolsas o cajas de regalo',
  'bolsas-o-cajas-de-regalo': 'Bolsas o cajas de regalo',
  'cajas de regalo': 'Bolsas o cajas de regalo',
  'bolsas de regalo': 'Bolsas o cajas de regalo',
  'caja de regalo': 'Bolsas o cajas de regalo',
  'bolsa de regalo': 'Bolsas o cajas de regalo',
  regalo: 'Bolsas o cajas de regalo',
  regalos: 'Bolsas o cajas de regalo',
  gift: 'Bolsas o cajas de regalo',
  gifts: 'Bolsas o cajas de regalo',
  'dulces & comida asiatica': 'Dulces & Comida Asiatica',
  'dulces y comida asiatica': 'Dulces & Comida Asiatica',
  'dulces y comida asiática': 'Dulces & Comida Asiatica',
  'dulces-&-comida-asiatica': 'Dulces & Comida Asiatica',
  'dulces-y-comida-asiatica': 'Dulces & Comida Asiatica',
  'dulces asiaticos': 'Dulces & Comida Asiatica',
  'dulces asiáticos': 'Dulces & Comida Asiatica',
  'dulces-asiaticos': 'Dulces & Comida Asiatica',
  dulces: 'Dulces & Comida Asiatica',
  'comida asiatica': 'Dulces & Comida Asiatica',
  'comida asiática': 'Dulces & Comida Asiatica',
  snacks: 'Dulces & Comida Asiatica',
};

export function getCategoryIcon(name: string): React.ReactNode | null {
  if (!name || typeof name !== 'string') return null;
  if (CATEGORY_ICONS[name]) return CATEGORY_ICONS[name];
  const trimmed = name.trim();
  if (CATEGORY_ICONS[trimmed]) return CATEGORY_ICONS[trimmed];

  const lower = trimmed.toLowerCase();
  const aliasTarget = CATEGORY_ALIASES[lower];
  if (aliasTarget && CATEGORY_ICONS[aliasTarget]) {
    return CATEGORY_ICONS[aliasTarget];
  }

  const matchedKey = Object.keys(CATEGORY_ICONS).find(
    (k) => k.toLowerCase() === lower,
  );
  return matchedKey ? CATEGORY_ICONS[matchedKey] : null;
}