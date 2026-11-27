import { render, screen, within, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import CatalogPage from './CatalogPage';

vi.mock('../../api/products', () => ({
  fetchAllProducts: vi.fn().mockResolvedValue([
    {
      product_id: 1,
      product_name: 'Mochi de Fresa',
      category: 'Dulces Asiáticos',
      product_price: '3.50',
      product_description: 'Delicioso mochi tradicional',
      qty_available: 10,
      in_stock: true,
      product_image_url: 'https://example.com/mochi.jpg',
    },
  ]),
}));

vi.mock('../../context/CartContext', () => ({
  useCart: () => ({
    items: [],
    itemCount: 0,
    addItem: vi.fn(),
    removeItem: vi.fn(),
    updateQuantity: vi.fn(),
    clearCart: vi.fn(),
    totalCount: 0,
    totalPrice: 0,
  }),
  useCartActions: () => ({
    addItem: vi.fn(),
    removeItem: vi.fn(),
    updateQuantity: vi.fn(),
    clearCart: vi.fn(),
  }),
}));

describe('CatalogPage — footer and social links', () => {
  it('renders footer with 2026 copyright and Tokki Shop link pointing to external url', async () => {
    render(
      <MemoryRouter>
        <CatalogPage />
      </MemoryRouter>
    );

    const devLink = await screen.findByRole('link', { name: /Tokki Shop/i });
    expect(devLink).toBeInTheDocument();
    expect(devLink).toHaveAttribute('href', 'https://oak-dev-11db6.web.app/');
    expect(screen.getByText(/2026/i)).toBeInTheDocument();
  });

  it('links directly to WhatsApp chat number instead of the WhatsApp catalog', async () => {
    render(
      <MemoryRouter>
        <CatalogPage />
      </MemoryRouter>
    );

    const waLink = await screen.findByRole('link', { name: /WhatsApp/i });
    expect(waLink).toBeInTheDocument();
    expect(waLink).toHaveAttribute('href', 'https://wa.me/584122698243');
  });
});

describe('CatalogPage — carousels sorting & ver mas prompt card', () => {
  it('renders products in descending order of product_id (most recently added first)', async () => {
    const { fetchAllProducts } = await import('../../api/products');
    vi.mocked(fetchAllProducts).mockResolvedValueOnce([
      {
        product_id: 1,
        product_name: 'Producto Antiguo',
        category: 'Maquillaje',
        product_price: '2.00',
        product_description: 'Desc',
        qty_available: 5,
        in_stock: true,
      },
      {
        product_id: 25,
        product_name: 'Producto Reciente',
        category: 'Maquillaje',
        product_price: '5.00',
        product_description: 'Desc 2',
        qty_available: 5,
        in_stock: true,
      },
    ]);

    render(
      <MemoryRouter>
        <CatalogPage />
      </MemoryRouter>
    );

    const recentItems = await screen.findAllByText('Producto Reciente');
    const oldItems = await screen.findAllByText('Producto Antiguo');
    expect(recentItems.length).toBeGreaterThan(0);
    expect(oldItems.length).toBeGreaterThan(0);

    // In the DOM, recent item should appear before the older item in the list
    expect(recentItems[0].compareDocumentPosition(oldItems[0])).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
  });

  it('does NOT render a "Ver más" card in track when category has <= 16 products', async () => {
    // Default mock has only 1 product
    render(
      <MemoryRouter>
        <CatalogPage />
      </MemoryRouter>
    );

    await screen.findByText('Mochi de Fresa');
    const moreCards = screen.queryAllByRole('link', { name: /Ver todos los productos/i });
    expect(moreCards.length).toBe(0);
  });

  it('renders a "Ver más" card with sparkles gif at the end when track has > 16 products', async () => {
    const { fetchAllProducts } = await import('../../api/products');
    const mock20Products = Array.from({ length: 20 }, (_, i) => ({
      product_id: i + 1,
      product_name: `Producto ${i + 1}`,
      category: 'Maquillaje',
      product_price: '5.00',
      product_description: 'Desc',
      qty_available: 5,
      in_stock: true,
    }));
    vi.mocked(fetchAllProducts).mockResolvedValueOnce(mock20Products);

    render(
      <MemoryRouter>
        <CatalogPage />
      </MemoryRouter>
    );

    const moreCards = await screen.findAllByRole('link', { name: /Ver todos los productos/i });
    expect(moreCards.length).toBeGreaterThanOrEqual(1);
    expect(moreCards[0]).toHaveAttribute('href', '/productos');

    // Verify sparkles gif is rendered inside the card
    const sparklesImgs = moreCards[0].querySelectorAll('img.carousel-more-sparkle');
    expect(sparklesImgs.length).toBe(1);
  });
});

describe('CatalogPage — aviso de envíos nacionales', () => {
  it('muestra el aviso legible de envíos nacionales por ZOOM y Tealca con cobro a destino', async () => {
    render(
      <MemoryRouter>
        <CatalogPage />
      </MemoryRouter>
    );

    const note = await screen.findByRole('note');
    expect(note).toBeInTheDocument();
    expect(note).toHaveTextContent(/Envíos nacionales/i);
    expect(note).toHaveTextContent(/todos los días/i);
    expect(note).toHaveTextContent(/ZOOM/);
    expect(note).toHaveTextContent(/Tealca/);
    expect(note).toHaveTextContent(/Cobro a destino/i);
  });

  it('ubica el aviso fuera del banner inicial y justo antes de la sección Todos', async () => {
    render(
      <MemoryRouter>
        <CatalogPage />
      </MemoryRouter>
    );

    await screen.findByRole('heading', { name: 'Todos' });
    const note = screen.getByRole('note');
    const hero = document.querySelector('.catalog-hero');
    const todosSection = document.querySelector('.category-section');

    expect(hero).not.toBeNull();
    expect(todosSection).not.toBeNull();
    expect(hero!.contains(note)).toBe(false);
    expect(hero!.compareDocumentPosition(note) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(note.compareDocumentPosition(todosSection!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('se lee como una frase natural, con el conejito Tokki decorativo y los couriers como stickers', async () => {
    render(
      <MemoryRouter>
        <CatalogPage />
      </MemoryRouter>
    );

    const note = await screen.findByRole('note');
    expect(note).toHaveTextContent(
      'Envíos nacionales todos los días por ZOOM y Tealca Cobro a destino',
    );

    // Mascot and cash badge are purely decorative: present, but hidden from assistive tech.
    const mascot = note.querySelector('img.catalog-shipping-bunny');
    expect(mascot).not.toBeNull();
    expect(mascot).toHaveAttribute('src', expect.stringMatching(/bunny_dancing/));
    expect(mascot).toHaveAttribute('alt', '');

    const cashBadge = note.querySelector('img.catalog-shipping-cash');
    expect(cashBadge).not.toBeNull();
    expect(cashBadge).toHaveAttribute('src', expect.stringMatching(/cash_flying/));
    expect(cashBadge).toHaveAttribute('alt', '');

    expect(within(note).getByText('ZOOM')).toHaveClass('catalog-shipping-chip');
    expect(within(note).getByText('Tealca')).toHaveClass('catalog-shipping-chip');
    expect(within(note).getByText('Cobro a destino')).toHaveClass('catalog-shipping-stamp-text');
  });
});

describe('CatalogPage — postal de contacto WhatsApp', () => {
  it('renderiza la postal clicable con el enlace de WhatsApp y el texto esperado', async () => {
    render(
      <MemoryRouter>
        <CatalogPage />
      </MemoryRouter>
    );

    const link = await screen.findByRole('link', { name: /Resolvemos todas tus dudas/i });
    expect(link).toHaveClass('catalog-whatsapp');
    expect(link).toHaveAttribute('href', 'https://wa.me/584122698243');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noreferrer');
    expect(link).toHaveTextContent(
      'Resolvemos todas tus dudas por WhatsApp ¡Escríbenos!',
    );
  });

  it('usa letter_envelope.webp decorativo y deja solo Instagram y TikTok en social-circles', async () => {
    render(
      <MemoryRouter>
        <CatalogPage />
      </MemoryRouter>
    );

    const link = await screen.findByRole('link', { name: /Resolvemos todas tus dudas/i });
    const envelope = link.querySelector('img.catalog-whatsapp-envelope');
    expect(envelope).not.toBeNull();
    expect(envelope).toHaveAttribute('src', expect.stringMatching(/letter_envelope/));
    expect(envelope).toHaveAttribute('alt', '');

    const carousels = document.querySelector('.carousels-wrapper');
    const socials = document.querySelector('.social-circles');
    expect(carousels).not.toBeNull();
    expect(socials).not.toBeNull();
    expect(carousels!.compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(link.compareDocumentPosition(socials!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    const socialLinks = within(socials as HTMLElement).getAllByRole('link');
    expect(socialLinks).toHaveLength(2);
    expect(socials!.querySelector('.social-whatsapp')).toBeNull();
    expect(within(socials as HTMLElement).getByRole('link', { name: 'Instagram' })).toBeInTheDocument();
    expect(within(socials as HTMLElement).getByRole('link', { name: 'TikTok' })).toBeInTheDocument();
  });
});

describe('CatalogPage — progressive carousel image loading', () => {
  it('mounts only the first 6 card images in Todos initially and loads the rest when scrolled/clicked', async () => {
    const { fetchAllProducts } = await import('../../api/products');
    const mock12Products = Array.from({ length: 12 }, (_, i) => ({
      product_id: i + 1,
      product_name: `Sticker Kawaii ${i + 1}`,
      category: 'Menos de un dolar',
      product_price: '0.75',
      product_description: 'Desc',
      qty_available: 10,
      in_stock: true,
      product_image_url: `https://example.com/p-${i + 1}.webp`,
    }));
    vi.mocked(fetchAllProducts).mockResolvedValueOnce(mock12Products);

    render(
      <MemoryRouter>
        <CatalogPage />
      </MemoryRouter>
    );

    await screen.findAllByText('Sticker Kawaii 12');

    const todosSection = document.querySelectorAll('.category-section')[0] as HTMLElement;
    expect(todosSection.querySelectorAll('.product-card')).toHaveLength(12);
    expect(todosSection.querySelectorAll('img.card-img')).toHaveLength(6);
    expect(todosSection.querySelectorAll('.card-img-deferred')).toHaveLength(6);

    fireEvent.click(within(todosSection).getByRole('button', { name: 'Siguiente' }));

    expect(todosSection.querySelectorAll('img.card-img')).toHaveLength(12);
    expect(todosSection.querySelectorAll('.card-img-deferred')).toHaveLength(0);
  });
});

describe('CatalogPage — category quick-jump pills', () => {
  it('renderiza solo las categorías activas en orden justo entre el aviso de envíos y los carruseles', async () => {
    const { fetchAllProducts } = await import('../../api/products');
    vi.mocked(fetchAllProducts).mockResolvedValueOnce([
      {
        product_id: 1,
        product_name: 'Gloss Mariposa',
        category: 'Maquillaje',
        product_price: '5.00',
        product_description: 'Brillo labial.',
        qty_available: 10,
        in_stock: true,
      },
      {
        product_id: 2,
        product_name: 'Cuaderno Conejito',
        category: 'Papeleria',
        product_price: '4.50',
        product_description: 'Libreta kawaii.',
        qty_available: 8,
        in_stock: true,
      },
      {
        product_id: 3,
        product_name: 'Caja Regalo Pastel',
        category: 'Bolsas o cajas de regalo',
        product_price: '3.00',
        product_description: 'Caja decorada.',
        qty_available: 12,
        in_stock: true,
      },
    ]);

    render(
      <MemoryRouter>
        <CatalogPage />
      </MemoryRouter>,
    );

    await screen.findAllByText('Cuaderno Conejito');

    const jumpNav = screen.getByRole('navigation', { name: 'Ir a una categoría' });
    const pillButtons = Array.from(jumpNav.querySelectorAll('button.category-jump-pill'));
    expect(pillButtons.map((b) => b.textContent?.trim())).toEqual([
      'Maquillaje',
      'Papeleria',
      'Bolsas o cajas de regalo',
    ]);

    expect(within(jumpNav).queryByRole('button', { name: 'Cosplays' })).toBeNull();
    expect(within(jumpNav).queryByRole('button', { name: 'Peluches' })).toBeNull();
    expect(within(jumpNav).queryByRole('button', { name: 'Zona KPOP' })).toBeNull();

    const shippingNote = screen.getByRole('note');
    const carouselsWrapper = document.querySelector('.carousels-wrapper');
    expect(carouselsWrapper).not.toBeNull();
    expect(
      shippingNote.compareDocumentPosition(jumpNav) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      jumpNav.compareDocumentPosition(carouselsWrapper!) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    const papeleriaSection = document.getElementById('category-section-papeleria');
    expect(papeleriaSection).not.toBeNull();
    const scrollIntoViewMock = vi.fn();
    papeleriaSection!.scrollIntoView = scrollIntoViewMock;

    fireEvent.click(within(jumpNav).getByRole('button', { name: 'Papeleria' }));
    expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
    expect(scrollIntoViewMock).toHaveBeenCalledWith({
      behavior: expect.stringMatching(/^(smooth|auto)$/),
      block: 'start',
    });
  });

  it('no renderiza la barra de categorías cuando solo hay 1 categoría activa', async () => {
    const { fetchAllProducts } = await import('../../api/products');
    vi.mocked(fetchAllProducts).mockResolvedValueOnce([
      {
        product_id: 1,
        product_name: 'Gloss Único',
        category: 'Maquillaje',
        product_price: '5.00',
        product_description: 'Solo una categoría.',
        qty_available: 10,
        in_stock: true,
      },
    ]);

    render(
      <MemoryRouter>
        <CatalogPage />
      </MemoryRouter>,
    );

    await screen.findAllByText('Gloss Único');
    expect(screen.queryByRole('navigation', { name: 'Ir a una categoría' })).toBeNull();
  });
});

describe('CatalogPage — hero-first skeleton loading', () => {
  it('renderiza hero, aviso de envíos y skeletons inmediatamente mientras cargan los productos', async () => {
    const { fetchAllProducts } = await import('../../api/products');
    vi.mocked(fetchAllProducts).mockReturnValueOnce(new Promise(() => {}));

    render(
      <MemoryRouter>
        <CatalogPage />
      </MemoryRouter>,
    );

    expect(document.querySelector('header.catalog-hero')).not.toBeNull();
    expect(document.querySelector('img.hero-logo')).not.toBeNull();
    expect(screen.getByRole('heading', { name: 'Tu tienda asiatica favorita' })).toBeInTheDocument();
    expect(screen.getByRole('note')).toBeInTheDocument();

    const busyRegion = document.querySelector('[aria-busy="true"]');
    expect(busyRegion).not.toBeNull();
    expect(document.querySelectorAll('.catalog-skeleton-card').length).toBeGreaterThan(0);

    expect(document.querySelector('.category-section')).toBeNull();
    expect(screen.queryByRole('link', { name: /Resolvemos todas tus dudas/i })).toBeNull();
  });

  it('mantiene visibles hero y aviso de envíos cuando falla la carga de productos', async () => {
    const { fetchAllProducts } = await import('../../api/products');
    vi.mocked(fetchAllProducts).mockRejectedValueOnce(new Error('Network error'));

    render(
      <MemoryRouter>
        <CatalogPage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('button', { name: /reintentar/i })).toBeInTheDocument();
    expect(document.querySelector('header.catalog-hero')).not.toBeNull();
    expect(screen.getByRole('note')).toBeInTheDocument();
  });
});
