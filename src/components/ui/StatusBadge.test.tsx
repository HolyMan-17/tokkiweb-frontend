import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StatusBadge } from './StatusBadge';

describe('StatusBadge', () => {
  it('renders "Pendiente" for pending status', () => {
    render(<StatusBadge status="pending" />);
    expect(screen.getByText('Pendiente')).toBeInTheDocument();
  });

  it('renders "Aprobado" for approved status', () => {
    render(<StatusBadge status="approved" />);
    expect(screen.getByText('Aprobado')).toBeInTheDocument();
  });

  it('renders "Cancelado" for canceled status', () => {
    render(<StatusBadge status="canceled" />);
    expect(screen.getByText('Cancelado')).toBeInTheDocument();
  });

  it('safely falls back to "Pendiente" when status is undefined or unknown', () => {
    render(<StatusBadge status={undefined} />);
    expect(screen.getByText('Pendiente')).toBeInTheDocument();

    render(<StatusBadge status="unknown_status" />);
    expect(screen.getAllByText('Pendiente')).toHaveLength(2);
  });
});
