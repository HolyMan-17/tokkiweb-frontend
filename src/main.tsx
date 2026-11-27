import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';

// Local fonts (design system: DynaPuff display + Sour Gummy body — latin subset only
// so cyrillic-ext/latin-ext @font-face rules never bloat the render-blocking CSS)
import '@fontsource/dynapuff/latin-400.css';
import '@fontsource/dynapuff/latin-500.css';
import '@fontsource/dynapuff/latin-600.css';
import '@fontsource/dynapuff/latin-700.css';
import '@fontsource/sour-gummy/latin-400.css';
import '@fontsource/sour-gummy/latin-500.css';
import '@fontsource/sour-gummy/latin-600.css';
import '@fontsource/sour-gummy/latin-700.css';

import './index.css';
import { printDevSignature } from './utils/devSignature';

printDevSignature();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);