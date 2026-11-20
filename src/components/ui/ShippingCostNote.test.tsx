import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ShippingCostNote, { SHIPPING_COST_NOTE_TEXT } from './ShippingCostNote';

describe('ShippingCostNote', () => {
  it('explica que Delivery y Envío Nacional se cotizan aparte y no están incluidos en el total', () => {
    render(<ShippingCostNote />);

    const note = screen.getByRole('note');
    expect(note).toHaveClass('shipping-cost-note');
    expect(note).toHaveTextContent(/delivery/i);
    expect(note).toHaveTextContent(/env[ií]o nacional/i);
    expect(note).toHaveTextContent(/por separado con el vendedor/i);
    expect(note).toHaveTextContent(/no est[aá]n incluidos/i);
    expect(note).toHaveTextContent(SHIPPING_COST_NOTE_TEXT);
  });

  it('no usa role="status" para no competir con los avisos de stock', () => {
    render(<ShippingCostNote />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('acepta una clase extra para ajustar el espaciado según la página', () => {
    render(<ShippingCostNote className="mt-md" />);
    expect(screen.getByRole('note')).toHaveClass('shipping-cost-note', 'mt-md');
  });
});
