import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import App from './App';

// The catalog is the landing target after navigating home from the 404.
vi.mock('./api/products', () => ({
  fetchAllProducts: vi.fn().mockResolvedValue([]),
}));

function renderAppAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

describe('App — rutas desconocidas', () => {
  it('muestra la página 404 en vez de redirigir silenciosamente al inicio', () => {
    renderAppAt('/tokki-admin/secretos/no-existe');
    // The hidden admin prefix must NOT swallow unknown sub-paths into the
    // panel either — anything unmatched gets the branded 404.
    expect(screen.getByText('404')).toBeInTheDocument();
    expect(screen.getByText(/p[aá]gina no encontrada/i)).toBeInTheDocument();
  });

  it('no redirige: la URL se conserva para poder corregir el enlace', () => {
    renderAppAt('/ruta-vieja-rota');
    expect(screen.getByText('404')).toBeInTheDocument();
  });
});
