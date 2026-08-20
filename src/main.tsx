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
