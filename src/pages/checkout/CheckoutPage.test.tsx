import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach } from 'vitest';
import CheckoutPage from './CheckoutPage';
import { CartProvider } from '../../context/CartContext';
import { MOCK_PRODUCTS } from '../../mock/data';

function seedCart() {
  window.localStorage.setItem(
    'tokki_cart_v1',
    JSON.stringify([{ product: MOCK_PRODUCTS[0], quantity: 1 }]),
  );
}

function renderPage() {
  return render(
    <MemoryRouter>
      <CartProvider>
        <CheckoutPage />
      </CartProvider>
    </MemoryRouter>,
  );
}

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Nombre'), 'María');
  await user.type(screen.getByLabelText('Apellido'), 'González');
  await user.type(screen.getByLabelText('Teléfono'), '4121234567');
}

describe('CheckoutPage — campo Cédula', () => {
  beforeEach(() => {
    seedCart();
  });

  it('muestra el campo cédula con un selector V-, E-, J-', () => {
    renderPage();
    const select = screen.getByLabelText(/tipo de cédula/i) as HTMLSelectElement;
    const options = Array.from(select.options).map(o => o.value);
    expect(options).toEqual(['V-', 'E-', 'J-']);
    expect(screen.getByLabelText('Cédula')).toBeInTheDocument();
  });

  it('muestra la vista previa con una cédula válida', async () => {
    const user = userEvent.setup();
    renderPage();
    await fillValidForm(user);
    await user.type(screen.getByLabelText('Cédula'), '26345678');
    expect(screen.getByText('V-26345678')).toBeInTheDocument();
  });

  it('bloquea el envío con una cédula demasiado corta', async () => {
    const user = userEvent.setup();
    renderPage();
    await fillValidForm(user);
    await user.type(screen.getByLabelText('Cédula'), '123');
    await user.click(screen.getByRole('button', { name: /confirmar pedido/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/cedula invalido/i);
    // El pedido no se creó: seguimos en el checkout.
    expect(screen.getByRole('button', { name: /confirmar pedido/i })).toBeInTheDocument();
  });

  it('solo acepta hasta 9 dígitos en el campo cédula', async () => {
    const user = userEvent.setup();
    renderPage();
    const input = screen.getByLabelText('Cédula') as HTMLInputElement;
    await user.type(input, 'abc12x345y6789z');
    expect(input.value).toBe('123456789');
    expect(input.value).toMatch(/^\d*$/);
  });
});
