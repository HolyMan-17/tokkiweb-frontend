import { useCallback, useEffect, useMemo, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import './CatalogPage.css';
import sparklesImg from '../../assets/sparkles.webp';
import tokkiLogo from '../../assets/tokki_logo.avif';
import cherryBlossom from '../../assets/cherry_blossom.webp';
import branchCherry from '../../assets/branch_cherry.webp';
import bunnyDancingImg from '../../assets/bunny_dancing.webp';
import cashFlyingImg from '../../assets/cash_flying.webp';
import letterEnvelopeImg from '../../assets/letter_envelope.webp';
import { fetchAllProducts } from '../../api/products';
import { useAsync } from '../../hooks/useAsync';
import { DEFAULT_DOC_DESCRIPTION, DEFAULT_DOC_TITLE, usePageMeta } from '../../hooks/usePageMeta';
import type { Product } from '../../types';
import ProductCard from '../../components/ui/ProductCard';
import CatalogTopNav from '../../components/layout/CatalogTopNav';
import ErrorState from '../../components/ui/ErrorState';
import { CATEGORY_ICONS } from '../../components/ui/CategoryIcons';
import CategoryJumpBar from './CategoryJumpBar';
import { getCategorySectionId } from './categoryJumpUtils';
import { CATEGORIES, slugify } from '../../constants';
import { ROUTES } from '../../lib/routes';
import { TOKKI_WHATSAPP_PHONE } from '../../utils/whatsapp';

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
const INITIAL_CAROUSEL_IMAGES = 6;
const VERTICAL_ROOT_MARGIN = '350px 0px';

// Compute a card width so an exact whole number of cards fits the
// visible track width on every screen, and fill the row precisely.
// All layout reads happen BEFORE any style write (no forced reflow).
function computeCardWidth(track: HTMLDivElement): number {
  const styles = getComputedStyle(track);
  const available =
    track.clientWidth -
    (parseFloat(styles.paddingLeft) || 0) -
    (parseFloat(styles.paddingRight) || 0);
  const gap = parseFloat(styles.columnGap) || parseFloat(styles.gap) || 12;
  const isDesktop = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(min-width: 768px)').matches
    : false;
  const minWidth = isDesktop ? 210 : 148;
  const n = Math.max(2, Math.floor((available + gap) / (minWidth + gap)));
  return (available - (n - 1) * gap) / n;
}

function CategoryCarousel({ title, emoji, products, seeMoreTo, eagerSection = false, sectionId }: {
  title: string;
  emoji: React.ReactNode;
  products: Product[];
  seeMoreTo?: string;
  eagerSection?: boolean;
  sectionId?: string;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [isNearViewport, setIsNearViewport] = useState(
    () => Boolean(eagerSection) || typeof IntersectionObserver === 'undefined',
  );
  const [expandedTrack, setExpandedTrack] = useState(false);

  useEffect(() => {
    if (isNearViewport || typeof IntersectionObserver === 'undefined') return;
    const section = sectionRef.current;
    if (!section) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setIsNearViewport(true);
          observer.disconnect();
        }
      },
      { rootMargin: VERTICAL_ROOT_MARGIN },
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, [isNearViewport]);

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
    if (left > 8) setExpandedTrack(true);
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

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => applyWidth()) : null;
    ro?.observe(track);

    return () => {
      if (scrollRaf) cancelAnimationFrame(scrollRaf);
      track.removeEventListener('scroll', onScroll);
      ro?.disconnect();
    };
  }, [applyWidth, updateArrows]);

  const handleExpandTrack = useCallback(() => {
    setExpandedTrack(true);
  }, []);

  const scroll = (dir: 'left' | 'right') => {
    setExpandedTrack(true);
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

    track.scrollBy?.({
      left: dir === 'right' ? cardWidth : -cardWidth,
      behavior: 'smooth',
    });
  };

  return (
    <section className="category-section" id={sectionId} ref={sectionRef}>
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

      <div
        className="carousel-track"
        ref={trackRef}
        onPointerDown={handleExpandTrack}
        onTouchStart={handleExpandTrack}
        onFocusCapture={handleExpandTrack}
      >
        {products.slice(0, MAX_CARDS_PER_CAROUSEL).map((p, cardIndex) => (
          <div key={p.product_id} className="carousel-item">
            <ProductCard
              product={p}
              deferImage={!isNearViewport || (!expandedTrack && cardIndex >= INITIAL_CAROUSEL_IMAGES)}
            />
          </div>
        ))}
        {seeMoreTo && products.length > MAX_CARDS_PER_CAROUSEL && (
          <div className="carousel-item">
            <Link
              to={seeMoreTo}
              className="carousel-more-card"
              aria-label={`Ver todos los productos de ${title}`}
            >
              <div className="carousel-more-frame">
                <div className="carousel-more-icon-wrap">
                  <img
                    src={sparklesImg}
                    alt=""
                    className="carousel-more-sparkle"
                    width={32}
                    height={34}
                    loading="lazy"
                  />
                  <div className="carousel-more-arrow-circle">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                      <polyline points="12 5 19 12 12 19"></polyline>
                    </svg>
                  </div>
                </div>
              </div>
              <div className="carousel-more-body">
                <p className="carousel-more-title">Ver más</p>
                <p className="carousel-more-subtitle">
                  {title === 'Todos' ? 'Ver todo el catálogo' : `Explora ${title}`}
                </p>
                <span className="carousel-more-btn">
                  Ver todo →
                </span>
              </div>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

// ── National shipping notice ──────────────────────────────────────────────────

function ShippingNotice() {
  return (
    <div className="catalog-shipping-wrap">
      <div className="catalog-shipping" role="note">
        <span className="catalog-shipping-badge" aria-hidden="true">
          <img src={bunnyDancingImg} alt="" className="catalog-shipping-bunny" width={200} height={200} />
          <span className="catalog-shipping-truck">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
              <path d="M15 18H9" />
              <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14" />
              <circle cx="17" cy="18" r="2" />
              <circle cx="7" cy="18" r="2" />
            </svg>
          </span>
        </span>
        <div className="catalog-shipping-content">
          <p className="catalog-shipping-title">
            <strong>Envíos nacionales</strong>{' '}
            <span className="catalog-shipping-highlight">todos los días</span>
          </p>{' '}
          <p className="catalog-shipping-couriers">
            por <span className="catalog-shipping-chip">ZOOM</span> y{' '}
            <span className="catalog-shipping-chip">Tealca</span>
          </p>
        </div>{' '}
        <p className="catalog-shipping-stamp">
          <img
            src={cashFlyingImg}
            alt=""
            className="catalog-shipping-cash"
            width={222}
            height={200}
            aria-hidden="true"
          />
          <span className="catalog-shipping-stamp-text">Cobro a destino</span>
        </p>
      </div>
    </div>
  );
}

// ── WhatsApp contact sticker ──────────────────────────────────────────────────

const WHATSAPP_URL = `https://wa.me/${TOKKI_WHATSAPP_PHONE.replace(/\D/g, '')}`;

function WhatsAppNotice() {
  return (
    <div className="catalog-whatsapp-wrap">
      <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="catalog-whatsapp">
        <span className="catalog-whatsapp-stamp" aria-hidden="true">
          <img
            src={letterEnvelopeImg}
            alt=""
            className="catalog-whatsapp-envelope"
            width={200}
            height={200}
            loading="lazy"
          />
        </span>
        <span className="catalog-whatsapp-content">
          <span className="catalog-whatsapp-title">
            Resolvemos todas tus dudas
          </span>{' '}
          <span className="catalog-whatsapp-sub">
            por{' '}
            <span className="catalog-whatsapp-channel">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              WhatsApp
            </span>
          </span>
        </span>{' '}
        <span className="catalog-whatsapp-cta">
          ¡Escríbenos!
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </span>
      </a>
    </div>
  );
}

// ── Social circles ─────────────────────────────────────────────────────────────

function SocialCircles() {
  return (
    <div className="social-circles" aria-label="Redes sociales">
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

const SKELETON_SECTIONS = [0, 1];
const SKELETON_CARDS = [0, 1, 2, 3, 4, 5];

function CatalogSkeleton() {
  return (
    <div
      className="catalog-skeleton-wrapper"
      role="status"
      aria-busy="true"
      aria-label="Cargando productos"
    >
      {SKELETON_SECTIONS.map((sectionIdx) => (
        <div key={sectionIdx} className="catalog-skeleton-section">
          <div className="catalog-skeleton-header">
            <div className="skeleton catalog-skeleton-icon" />
            <div className="skeleton catalog-skeleton-title" />
          </div>
          <div className="catalog-skeleton-track">
            {SKELETON_CARDS.map((cardIdx) => (
              <div key={cardIdx} className="catalog-skeleton-card">
                <div className="skeleton catalog-skeleton-img" />
                <div className="catalog-skeleton-body">
                  <div className="skeleton catalog-skeleton-line" />
                  <div className="skeleton catalog-skeleton-line catalog-skeleton-line--short" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CatalogPage() {
  usePageMeta({
    title: DEFAULT_DOC_TITLE,
    description: DEFAULT_DOC_DESCRIPTION,
    canonicalPath: ROUTES.home,
  });
  const { data, isLoading, isError, retry } = useAsync(fetchAllProducts, []);
  const products = useMemo(() => data ?? [], [data]);
  const sortedProducts = useMemo(
    () => products.toSorted((a, b) => b.product_id - a.product_id),
    [products],
  );
  const grouped = useMemo(() => groupByCategory(sortedProducts), [sortedProducts]);
  const populatedCategories = useMemo(
    () => CATEGORIES.filter((cat) => (grouped[cat.name]?.length ?? 0) > 0),
    [grouped],
  );

  return (
    <>
      <CatalogTopNav products={isLoading || isError ? undefined : products} />

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
          <p className="hero-sub">Maquillaje • Skincare • Accesorios • Peluches • Figuras • Comida Asiatica & Más</p>
        </header>

        {/* ── National shipping notice ── */}
        <ShippingNotice />

        {isLoading ? (
          <CatalogSkeleton />
        ) : isError ? (
          <ErrorState onRetry={retry} />
        ) : (
          <>
            {/* ── Quick-jump pills for populated categories ── */}
            <CategoryJumpBar categories={populatedCategories} />

            {/* ── Carousels: Todos (all products) + one per category ── */}
            <div className="carousels-wrapper">
              <CategoryCarousel
                title="Todos"
                emoji={<img src={sparklesImg} alt="" className="category-sparkle" width={188} height={200} loading="lazy" />}
                products={sortedProducts}
                seeMoreTo={ROUTES.allProducts}
                eagerSection
              />

              {populatedCategories.map((cat, index) => (
                <CategoryCarousel
                  key={cat.name}
                  title={cat.name}
                  emoji={CATEGORY_ICONS[cat.name] ?? cat.emoji}
                  products={grouped[cat.name]}
                  seeMoreTo={ROUTES.category(slugify(cat.name))}
                  eagerSection={index === 0}
                  sectionId={getCategorySectionId(cat.name)}
                />
              ))}
            </div>

            {/* ── WhatsApp contact + social ── */}
            <WhatsAppNotice />
            <SocialCircles />

            {/* ── Footer ── */}
            <footer className="catalog-footer">
              <p className="catalog-footer-text">
                © 2026{' '}
                <a
                  href="https://oak-dev-11db6.web.app/"
                  target="_blank"
                  rel="noreferrer"
                  className="footer-dev-link"
                >
                  Tokki Shop
                </a>
              </p>
            </footer>
          </>
        )}
      </div>
    </>
  );
}
