import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { CartIcon, GearIcon } from './icons';

describe('CartIcon', () => {
  it('renders an svg with the shared cart markup', () => {
    const { container } = render(<CartIcon />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg).toHaveAttribute('width', '22');
    expect(svg).toHaveAttribute('height', '22');
    expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
    expect(svg).toHaveAttribute('fill', 'none');
    expect(svg).toHaveAttribute('stroke', 'currentColor');
    expect(svg).toHaveAttribute('stroke-width', '2.5');
    expect(svg).toHaveAttribute('stroke-linecap', 'round');
    expect(svg).toHaveAttribute('stroke-linejoin', 'round');

    const children = Array.from(svg!.children);
    expect(children.map((el) => el.tagName.toLowerCase())).toEqual([
      'circle',
      'circle',
      'path',
    ]);
    expect(children[2]).toHaveAttribute(
      'd',
      'M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6',
    );
  });

  it('accepts a custom size without altering the drawing', () => {
    const { container } = render(<CartIcon size={18} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '18');
    expect(svg).toHaveAttribute('height', '18');
    expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
    expect(svg?.getAttribute('stroke-width')).toBe('2.5');
  });
});

describe('GearIcon', () => {
  it('renders an svg with the shared gear markup', () => {
    const { container } = render(<GearIcon />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg).toHaveAttribute('width', '20');
    expect(svg).toHaveAttribute('height', '20');
    expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
    expect(svg).toHaveAttribute('stroke', 'currentColor');
    expect(svg).toHaveAttribute('stroke-width', '2.2');

    const children = Array.from(svg!.children);
    expect(children.map((el) => el.tagName.toLowerCase())).toEqual(['circle', 'path']);
    expect(children[0]).toHaveAttribute('cx', '12');
    expect(children[0]).toHaveAttribute('cy', '12');
    expect(children[0]).toHaveAttribute('r', '3');
    expect(children[1].getAttribute('d')).toContain('19.4 15');
  });
});

describe('icon collision guard', () => {
  it('renders distinct shapes and defaults per icon', () => {
    const cart = render(<CartIcon />).container.querySelector('svg')!;
    const gear = render(<GearIcon />).container.querySelector('svg')!;

    expect(cart.getAttribute('width')).not.toBe(gear.getAttribute('width'));
    expect(cart.getAttribute('stroke-width')).not.toBe(gear.getAttribute('stroke-width'));

    const cartPath = cart.querySelector('path')!.getAttribute('d') ?? '';
    const gearPath = gear.querySelector('path')!.getAttribute('d') ?? '';
    expect(cartPath).not.toBe(gearPath);
    expect(gearPath.length).toBeGreaterThan(cartPath.length);
  });
});
