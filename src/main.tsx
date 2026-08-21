import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import App from './App.tsx';

// Local fonts (design system: DynaPuff display + Sour Gummy body)
import '@fontsource/dynapuff/400.css';
import '@fontsource/dynapuff/500.css';
import '@fontsource/dynapuff/600.css';
import '@fontsource/dynapuff/700.css';
import '@fontsource/sour-gummy/400.css';
import '@fontsource/sour-gummy/500.css';
import '@fontsource/sour-gummy/600.css';
import '@fontsource/sour-gummy/700.css';

// Preload the critical latin font files so they're ready before first paint.
// fontsource loads with font-display: swap, which causes a layout shift when
// the font arrives late — preloading eliminates that swap entirely.
import dynapuff700 from '@fontsource/dynapuff/files/dynapuff-latin-700-normal.woff2?url';
import dynapuff400 from '@fontsource/dynapuff/files/dynapuff-latin-400-normal.woff2?url';
import sourGummy400 from '@fontsource/sour-gummy/files/sour-gummy-latin-400-normal.woff2?url';
import sourGummy700 from '@fontsource/sour-gummy/files/sour-gummy-latin-700-normal.woff2?url';

const CRITICAL_FONTS = [dynapuff700, dynapuff400, sourGummy400, sourGummy700];
for (const href of CRITICAL_FONTS) {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'font';
  link.type = 'font/woff2';
  link.crossOrigin = 'anonymous';
  link.href = href;
  document.head.appendChild(link);
}

import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
    <Analytics />
    <SpeedInsights />
  </StrictMode>,
);