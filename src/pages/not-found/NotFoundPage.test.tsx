import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import NotFoundPage from './NotFoundPage';

function renderAt(path = '/esta-ruta-no-existe') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <NotFoundPage />
    </MemoryRouter>,
  );
}

describe('NotFoundPage — 404 con marca', () => {
  it('muestra un encabezado 404 y mensaje en español', () => {
    renderAt();
    expect(screen.getByText('404')).toBeInTheDocument();
    expect(screen.getByText(/p[aá]gina no encontrada/i)).toBeInTheDocument();
  });

  it('ofrece un enlace de vuelta a la tienda', () => {
    renderAt();
    const link = screen.getByRole('link', { name: /volver a la tienda/i });
    expect(link).toHaveAttribute('href', '/');
  });

  it('anuncia el contenido para lectores de pantalla', () => {
    renderAt();
    expect(screen.getByRole('main')).toBeInTheDocument();
  });
});
