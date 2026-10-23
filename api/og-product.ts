import { buildProductOgHtml, buildFallbackOgHtml } from '../src/utils/ogProduct';
import type { Product } from '../src/types';

export interface NodeReq {
  query?: Record<string, string | string[]>;
  url?: string;
  headers?: Record<string, string | string[] | undefined>;
}

export interface NodeRes {
  status: (code: number) => NodeRes;
  setHeader: (name: string, value: string) => NodeRes;
  send: (body: string) => NodeRes;
  end: (body?: string) => NodeRes;
}

const DEFAULT_BACKEND_URL = 'https://api.tokkishopve.com';
const DEFAULT_SITE_URL = 'https://www.tokkishopve.com';

function extractId(req: Request | NodeReq): string | null {
  if ('url' in req && req.url) {
    try {
      const url = new URL(req.url, 'http://localhost');
      const fromParam = url.searchParams.get('id');
      if (fromParam) return fromParam;
    } catch {
      // Fall through to query inspection
    }
  }
  if ('query' in req && req.query) {
    const fromQuery = req.query.id;
    if (typeof fromQuery === 'string') return fromQuery;
    if (Array.isArray(fromQuery) && fromQuery[0]) return fromQuery[0];
  }
  return null;
}

export default async function handler(
  req: Request | NodeReq,
  res?: NodeRes,
): Promise<Response | void> {
  const siteUrl = process.env.VITE_PUBLIC_SITE_URL || DEFAULT_SITE_URL;
  const backendBase = (process.env.BACKEND_URL || DEFAULT_BACKEND_URL).replace(/\/+$/, '');

  const idParam = extractId(req);
  const productId = idParam ? parseInt(idParam, 10) : NaN;

  let html: string;
  const status = 200;

  if (isNaN(productId) || productId <= 0) {
    html = buildFallbackOgHtml({ siteUrl });
  } else {
    try {
      const apiEndpoint = `${backendBase}/api/products/${productId}`;
      const response = await fetch(apiEndpoint, {
        headers: { Accept: 'application/json' },
      });

      if (response.ok) {
        const payload = (await response.json()) as { success?: boolean; data?: Product };
        if (payload?.success && payload.data) {
          html = buildProductOgHtml(payload.data, { siteUrl });
        } else {
          html = buildFallbackOgHtml({
            siteUrl,
            targetUrl: `${siteUrl}/products/${productId}`,
          });
        }
      } else {
        html = buildFallbackOgHtml({
          siteUrl,
          targetUrl: `${siteUrl}/products/${productId}`,
        });
      }
    } catch {
      html = buildFallbackOgHtml({
        siteUrl,
        targetUrl: `${siteUrl}/products/${productId}`,
      });
    }
  }

  // Node.js Serverless runtime
  if (res && typeof res.setHeader === 'function') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader(
      'Cache-Control',
      'public, max-age=60, s-maxage=3600, stale-while-revalidate=86400',
    );
    res.status(status).send(html);
    return;
  }

  // Web API / Edge runtime
  return new Response(html, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=60, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
