import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import EmptyState from './EmptyState';

describe('EmptyState component', () => {
  it('renders title, subtitle, icon and action', () => {
    render(
      <EmptyState
        icon={<span data-testid="empty-icon">🐰</span>}
        title="Sin resultados"
        subtitle="Intenta con otro término de búsqueda"
        action={<button>Volver</button>}
      />,
    );

    expect(screen.getByText('Sin resultados')).toBeInTheDocument();
    expect(screen.getByText('Intenta con otro término de búsqueda')).toBeInTheDocument();
    expect(screen.getByTestId('empty-icon')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Volver' })).toBeInTheDocument();
  });
});
