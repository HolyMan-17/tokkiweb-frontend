// ─── Category icons — single source of truth ────────────────────────────────
// Maps each category name to its brand asset (gif/png). Used by both the
// catalog carousels and the category page header so they always match.

import lipstickGif from '../../assets/lipstick.gif';
import cosmeticImg from '../../assets/cosmetic.avif';
import ringImg from '../../assets/ring.png';
import lentesImg from '../../assets/lentes_contacto.webp';
import dressImg from '../../assets/dress.png';
import pinImg from '../../assets/pin.png';
import treatGif from '../../assets/treat.gif';
import hoppingBear from '../../assets/hopping_bear.gif';
import beatingHeart from '../../assets/beating_heart.gif';

export const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  Maquillaje: <img src={lipstickGif} alt="" className="category-emoji-img" width={285} height={270} loading="lazy" />,
  Skincare: <img src={cosmeticImg} alt="" className="category-emoji-img category-cosmetic" width={396} height={347} loading="lazy" />,
  Accesorios: <img src={ringImg} alt="" className="category-emoji-img" width={362} height={405} loading="lazy" />,
  'Lentes de Contacto': <img src={lentesImg} alt="" className="category-emoji-img category-lentes" width={386} height={250} loading="lazy" />,
  'Pines & Chapas': <img src={pinImg} alt="" className="category-emoji-img" width={243} height={257} loading="lazy" />,
  Ropa: <img src={dressImg} alt="" className="category-emoji-img category-dress" width={461} height={461} loading="lazy" />,
  'Dulces Asiáticos': <img src={treatGif} alt="" className="category-emoji-img category-treat" width={250} height={209} loading="lazy" />,
  'Peluches y Figuras': <img src={hoppingBear} alt="" className="category-emoji-img category-bear" width={250} height={250} loading="lazy" />,
  Otros: <img src={beatingHeart} alt="" className="category-emoji-img category-heart" width={300} height={284} loading="lazy" />,
};

export function getCategoryIcon(name: string): React.ReactNode | null {
  return CATEGORY_ICONS[name] ?? null;
}