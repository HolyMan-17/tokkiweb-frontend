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

export const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  Maquillaje: <img src={lipstickGif} alt="" className="category-emoji-img" width={84} height={80} loading="lazy" />,
  Skincare: <img src={cosmeticImg} alt="" className="category-emoji-img category-cosmetic" width={128} height={112} loading="lazy" />,
  Accesorios: <img src={ringImg} alt="" className="category-emoji-img" width={223} height={250} loading="lazy" />,
  'Lentes de Contacto': <img src={lentesImg} alt="" className="category-emoji-img category-lentes" width={224} height={145} loading="lazy" />,
  'Pines & Chapas': <img src={pinImg} alt="" className="category-emoji-img" width={158} height={167} loading="lazy" />,
  Ropa: <img src={dressImg} alt="" className="category-emoji-img category-dress" width={128} height={128} loading="lazy" />,
  'Dulces Asiáticos': <img src={treatGif} alt="" className="category-emoji-img category-treat" width={112} height={94} loading="lazy" />,
  'Peluches y Figuras': <img src={hoppingBear} alt="" className="category-emoji-img category-bear" width={112} height={112} loading="lazy" />,
  Otros: <img src={beatingHeart} alt="" className="category-emoji-img category-heart" width={190} height={180} loading="lazy" />,
};

export function getCategoryIcon(name: string): React.ReactNode | null {
  return CATEGORY_ICONS[name] ?? null;
}