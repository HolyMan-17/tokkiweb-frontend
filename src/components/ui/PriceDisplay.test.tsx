import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import PriceDisplay from './PriceDisplay';

describe('PriceDisplay', () => {
  it('muestra únicamente el precio base cuando no hay descuento activo', () => {
    const { container } = render(
      <PriceDisplay product={{ product_price: '12.50', discount_percent: 0 }} showBadge />,
    );

    expect(screen.getByText('$12.50')).toBeInTheDocument();
    expect(container.querySelector('.tokki-price__original')).toBeNull();
    expect(container.querySelector('.tokki-price__badge')).toBeNull();
    expect(container.querySelector('.tokki-price--discounted')).toBeNull();
  });

  it('muestra precio con descuento resaltado, precio original tachado y burbuja -XX% cuando showBadge es true', () => {
    const { container } = render(
      <PriceDisplay
        product={{ product_price: '10.00', discount_percent: 25 }}
        showBadge
        size="detail"
      />,
    );

    expect(container.querySelector('.tokki-price')).toHaveClass('tokki-price--discounted');
    expect(container.querySelector('.tokki-price')).toHaveClass('tokki-price--detail');
    expect(screen.getByText('$7.50')).toHaveClass('tokki-price__current--discounted');

    const original = container.querySelector('del.tokki-price__original');
    expect(original).toHaveTextContent('$10.00');
    expect(original).toHaveAttribute('aria-label', 'Precio original $10.00');

    const badge = screen.getByText('-25%');
    expect(badge).toHaveClass('tokki-price__badge');
    expect(badge).toHaveAttribute('aria-label', '25% de descuento');
  });

  it('oculta la burbuja en línea cuando showBadge es false', () => {
    const { container } = render(
      <PriceDisplay
        product={{ product_price: '4.99', discount_percent: 20 }}
        showBadge={false}
        size="card"
      />,
    );

    expect(screen.getByText('$3.99')).toBeInTheDocument();
    expect(container.querySelector('del.tokki-price__original')).toHaveTextContent('$4.99');
    expect(container.querySelector('.tokki-price__badge')).toBeNull();
  });
});
