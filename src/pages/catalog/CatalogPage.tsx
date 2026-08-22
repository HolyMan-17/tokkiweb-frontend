import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import './CatalogPage.css';
import sparklesImg from '../../assets/sparkles.gif';
import tokkiLogo from '../../assets/tokki_logo.avif';
import cherryBlossom from '../../assets/cherry_blossom.gif';
import branchCherry from '../../assets/branch_cherry.gif';
import { useProducts } from '../../store/localStore';
import type { Product } from '../../types';
import ProductCard from '../../components/ui/ProductCard';
import CatalogTopNav from '../../components/layout/CatalogTopNav';
import { CATEGORY_ICONS } from '../../components/ui/CategoryIcons';
import { CATEGORIES, slugify } from '../../constants';
import { ROUTES } from '../../lib/routes';

// ── helpers ──────────────────────────────────────────────────────────────────

function groupByCategory(products: Product[]): Record<string, Product[]> {
  return products.reduce<Record<string, Product[]>>((acc, p) => {
    (acc[p.category] ??= []).push(p);
    return acc;
  }, {});
}

// ── Carousel ──────────────────────────────────────────────────────────────────

// Cap the number of cards rendered per carousel track. Carousels are
// horizontally scrolled showcases, not full grids — each category's full
// inventory lives on its category page (the "Ver más" pill). Capping keeps
// the DOM small (Lighthouse flags tracks with dozens of children) and
// shrinks the synchronous layout pass that measures every track on mount.
const MAX_CARDS_PER_CAROUSEL = 16;

function CategoryCarousel({ title, emoji, products, seeMoreTo }: {
  title: string;
  emoji: React.ReactNode;
  products: Product[];
  seeMoreTo?: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Compute a card width so an exact whole number of cards fits the
  // visible track width on every screen, and fill the row precisely.
  // All layout reads happen BEFORE any style write (no forced reflow).
  const computeCardWidth = (track: HTMLDivElement): number => {
    const styles = getComputedStyle(track);
    const available =
      track.clientWidth -
      (parseFloat(styles.paddingLeft) || 0) -
      (parseFloat(styles.paddingRight) || 0);
    const gap = parseFloat(styles.columnGap) || parseFloat(styles.gap) || 12;
    const isDesktop = window.matchMedia('(min-width: 768px)').matches;
    const minWidth = isDesktop ? 210 : 148;
    const n = Math.max(2, Math.floor((available + gap) / (minWidth + gap)));
    return (available - (n - 1) * gap) / n;
  };

  // Read layout (scroll position/width), then update arrow state. Called from
  // scroll events — throttled with rAF so reads never follow a write in the
  // same task (which is what forces reflow).
  const updateArrows = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    // Read all geometry in one batch — no style write precedes these reads,
    // so the browser never has to compute layout twice (no forced reflow).
    const maxScroll = track.scrollWidth - track.clientWidth;
    const left = track.scrollLeft;
    setCanScrollLeft(left > 0);
    setCanScrollRight(left < maxScroll - 1);
  }, []);

  // One measure+apply pass per frame: read ALL geometry first (card width +
  // arrow state), then write the CSS var once at the end. Writing before all
  // reads are done is what invalidates layout and forces a synchronous
  // reflow on the next read — so reads and writes are never interleaved.
  const applyWidth = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    // ── reads (no writes in between) ──
    const width = computeCardWidth(track);
    const maxScroll = track.scrollWidth - track.clientWidth;
    const left = track.scrollLeft;
    // ── single write (invalidates layout, but no read follows) ──
    track.style.setProperty('--carousel-card-width', `${width}px`);
    setCanScrollLeft(left > 0);
    setCanScrollRight(left < maxScroll - 1);
  }, []);

  // Measure on mount (synchronously, before paint — prevents the 148px
  // fallback flash / CLS) and react to size changes via ResizeObserver.
  // No polling: no rAF loops, no setTimeout re-measures.
  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    applyWidth();

    let scrollRaf = 0;
    const onScroll = () => {
      if (scrollRaf) return;
      scrollRaf = requestAnimationFrame(() => {
        scrollRaf = 0;
        updateArrows();
      });
    };
    track.addEventListener('scroll', onScroll, { passive: true });

    const ro = new ResizeObserver(() => applyWidth());
    ro.observe(track);

    return () => {
      if (scrollRaf) cancelAnimationFrame(scrollRaf);
      track.removeEventListener('scroll', onScroll);
      ro.disconnect();
    };
  }, [applyWidth, updateArrows]);

  const scroll = (dir: 'left' | 'right') => {
    const track = trackRef.current;
    if (!track) return;

    // Read the CSS var (no layout read — it's a style value) and slide by
    // exactly one whole card plus the gap. Fallback only if unset.
    const trackStyle = getComputedStyle(track);
    const gap = parseFloat(trackStyle.columnGap) || parseFloat(trackStyle.gap) || 12;
    const varCardWidth = parseFloat(trackStyle.getPropertyValue('--carousel-card-width'));
    const cardWidth = Number.isFinite(varCardWidth) && varCardWidth > 0
      ? varCardWidth + gap
      : track.clientWidth * 0.8;

    track.scrollBy({
      left: dir === 'right' ? cardWidth : -cardWidth,
      behavior: 'smooth',
    });
  };

  return (
    <section className="category-section">
      <div className="category-header">
        <h2 className="category-title">
          <span className="category-emoji">{emoji}</span>
          {title}
        </h2>
        <div className="category-header-actions">
          {seeMoreTo && (
            <Link to={seeMoreTo} className="see-more-btn">
              Ver más
            </Link>
          )}
          <div className="carousel-controls">
            <button
              className={`carousel-btn${canScrollLeft ? '' : ' disabled'}`}
              onClick={() => scroll('left')}
              aria-label="Anterior"
            >
              ‹
            </button>
            <button
              className={`carousel-btn${canScrollRight ? '' : ' disabled'}`}
              onClick={() => scroll('right')}
              aria-label="Siguiente"
            >
              ›
            </button>
          </div>
        </div>
      </div>

      <div className="carousel-track" ref={trackRef}>
        {products.slice(0, MAX_CARDS_PER_CAROUSEL).map(p => (
          <div key={p.product_id} className="carousel-item">
            <ProductCard product={p} />
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Social circles ─────────────────────────────────────────────────────────────

function SocialCircles() {
  return (
    <div className="social-circles" aria-label="Redes sociales">
      <a
        href="https://www.whatsapp.com/catalog/584122698243/?app_absent=0"
        target="_blank"
        rel="noreferrer"
        className="social-circle social-whatsapp"
        aria-label="WhatsApp"
      >
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      </a>
      <a
        href="https://www.instagram.com/tokki.shopve/"
        target="_blank"
        rel="noreferrer"
        className="social-circle social-instagram"
        aria-label="Instagram"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
        </svg>
      </a>
      <a
        href="https://www.tiktok.com/@tokki.shopve"
        target="_blank"
        rel="noreferrer"
        className="social-circle social-tiktok"
        aria-label="TikTok"
      >
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
        </svg>
      </a>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const SCROLL_KEY = 'tokki_catalog_scroll';

export default function CatalogPage() {
  const products = useProducts();
  const grouped = groupByCategory(products);

  // Restore the scroll position when returning from a category page, and
  // remember it when leaving so "Volver" lands where the user was.
  useLayoutEffect(() => {
    const saved = Number(sessionStorage.getItem(SCROLL_KEY) || '0');
    if (saved > 0) {
      requestAnimationFrame(() => window.scrollTo(0, saved));
    }
    return () => {
      sessionStorage.setItem(SCROLL_KEY, String(window.scrollY));
    };
  }, []);

  return (
    <>
      <CatalogTopNav />

      <div className="catalog-page">
        {/* ── Hero ── */}
        <header className="catalog-hero">
          <div className="hero-bg" aria-hidden="true">
            <span className="hero-aurora hero-aurora--one" />
            <span className="hero-aurora hero-aurora--two" />
            <span className="hero-aurora hero-aurora--three" />
            <span className="hero-blob hero-blob--one" />
            <span className="hero-blob hero-blob--two" />
            <span className="hero-blob hero-blob--three" />
            <span className="hero-bubble" style={{ left: '8%',  '--delay': '0s',  '--dur': '11s' } as React.CSSProperties} />
            <span className="hero-bubble" style={{ left: '22%', '--delay': '3s',  '--dur': '13s' } as React.CSSProperties} />
            <span className="hero-bubble" style={{ left: '41%', '--delay': '6s',  '--dur': '10s' } as React.CSSProperties} />
            <span className="hero-bubble" style={{ left: '63%', '--delay': '1.5s','--dur': '14s' } as React.CSSProperties} />
            <span className="hero-bubble" style={{ left: '79%', '--delay': '8s',  '--dur': '12s' } as React.CSSProperties} />
            <span className="hero-bubble" style={{ left: '92%', '--delay': '4.5s','--dur': '11.5s' } as React.CSSProperties} />
          </div>
          <div className="hero-deco hero-deco--left">
            <img src={cherryBlossom} alt="" className="hero-cherry" width={224} height={224} loading="lazy" />
          </div>
          <div className="hero-deco hero-deco--right">
            <img src={branchCherry} alt="" className="hero-branch" width={200} height={242} loading="lazy" />
          </div>
          <img src={tokkiLogo} alt="Tokki Shop" className="hero-logo" width={420} height={420} fetchPriority="high" />
          <h1 className="hero-title">Tu tienda asiatica favorita</h1>
          <p className="hero-sub">Maquillaje • Skincare • Accesorios • Peluches y Figuras • Dulces Asiáticos & Más</p>
        </header>

        {/* ── Carousels: Todos (all products) + one per category ── */}
        <div className="carousels-wrapper">
          <CategoryCarousel
            title="Todos"
            emoji={<img src={sparklesImg} alt="" className="category-sparkle" width={188} height={200} loading="lazy" />}
            products={products}
            seeMoreTo={ROUTES.allProducts}
          />

          {CATEGORIES.map(cat => {
            const products = grouped[cat.name] ?? [];
            if (products.length === 0) return null;
            return (
              <CategoryCarousel
                key={cat.name}
                title={cat.name}
                emoji={CATEGORY_ICONS[cat.name] ?? cat.emoji}
                products={products}
                seeMoreTo={ROUTES.category(slugify(cat.name))}
              />
            );
          })}
        </div>

        {/* ── Social ── */}
        <SocialCircles />
      </div>
    </>
  );
}
