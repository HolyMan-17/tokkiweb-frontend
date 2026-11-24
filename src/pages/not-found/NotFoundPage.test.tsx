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
  it('muestra la marca Tokki Shop, el código 404 y el mensaje solicitado', () => {
    renderAt();
    expect(screen.getByText('Tokki Shop')).toBeInTheDocument();
    expect(screen.getByText('404')).toBeInTheDocument();
    expect(
      screen.getByText('La página solicitada no fue encontrada, por favor regresa al inicio'),
    ).toBeInTheDocument();
  });

  it('ofrece un enlace a la página principal', () => {
    renderAt();
    const link = screen.getByRole('link', { name: /volver al inicio/i });
    expect(link).toHaveAttribute('href', '/');
  });

  it('anuncia el contenido para lectores de pantalla', () => {
    renderAt();
    expect(screen.getByRole('main')).toBeInTheDocument();
  });
});
