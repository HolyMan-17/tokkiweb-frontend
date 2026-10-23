import { describe, it, expect } from 'vitest';
import vercelConfig from '../../vercel.json';

interface VercelRewrite {
  source: string;
  destination?: string;
  has?: Array<{
    type: string;
    key: string;
    value: string;
  }>;
}

describe('vercel.json — Social crawler Open Graph rewrites', () => {
  it('tiene configurado el rewrite de crawlers para /products/:id apuntando a /api/og-product', () => {
    const rewrites = vercelConfig.rewrites as VercelRewrite[];
    const ogRewrite = rewrites.find(
      (r) => r.source === '/products/:id' && r.destination === '/api/og-product?id=:id',
    );

    expect(ogRewrite).toBeDefined();
    expect(ogRewrite?.has).toBeDefined();
    expect(ogRewrite?.has?.[0]?.type).toBe('header');
    expect(ogRewrite?.has?.[0]?.key.toLowerCase()).toBe('user-agent');
    
    // Verifies key crawlers are matched (WhatsApp, Discord, Facebook/Instagram, Twitter, Telegram)
    const regex = new RegExp(ogRewrite!.has![0].value.replace(/^\(\?i\)/, ''), 'i');
    expect(regex.test('WhatsApp/2.21.12.21 A')).toBe(true);
    expect(regex.test('Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)')).toBe(true);
    expect(regex.test('facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)')).toBe(true);
    expect(regex.test('Twitterbot/1.0')).toBe(true);
    expect(regex.test('TelegramBot (like TwitterBot)')).toBe(true);

    // Regular human browsers must NOT match the crawler regex
    expect(regex.test('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')).toBe(false);
    expect(regex.test('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1')).toBe(false);
  });

  it('tiene configurado el rewrite de crawlers para /categorias/:slug apuntando a /api/og-product', () => {
    const rewrites = vercelConfig.rewrites as VercelRewrite[];
    const ogRewrite = rewrites.find(
      (r) => r.source === '/categorias/:slug' && r.destination === '/api/og-product?category=:slug',
    );

    expect(ogRewrite).toBeDefined();
    expect(ogRewrite?.has).toBeDefined();
    expect(ogRewrite?.has?.[0]?.type).toBe('header');
    expect(ogRewrite?.has?.[0]?.key.toLowerCase()).toBe('user-agent');

    const regex = new RegExp(ogRewrite!.has![0].value.replace(/^\(\?i\)/, ''), 'i');
    expect(regex.test('WhatsApp/2.21.12.21 A')).toBe(true);
    expect(regex.test('facebookexternalhit/1.1')).toBe(true);
  });

  it('excluye /api/og-product del proxy general del backend para que Vercel ejecute la función serverless', () => {
    const rewrites = vercelConfig.rewrites as VercelRewrite[];
    const backendProxy = rewrites.find((r) =>
      r.destination?.includes('api.tokkishopve.com/api'),
    );

    expect(backendProxy).toBeDefined();
    // Must exclude og-product
    expect(backendProxy?.source).toContain('(?!og-product)');
  });

  it('mantiene el fallback SPA hacia /index.html al final de las reglas', () => {
    const rewrites = vercelConfig.rewrites;
    const lastRewrite = rewrites[rewrites.length - 1];

    expect(lastRewrite.destination).toBe('/index.html');
  });
});
