import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, beforeEach } from 'vitest';
import OrderDetailPage from './OrderDetailPage';
import { resetStoreForTests } from '../../../store/localStore';
import type { OrderDetail } from '../../../types';

const ORDER: OrderDetail = {
  order_id: 42,
  status: 'pending',
  client: {
    name: 'María',
    last_name: 'González',
    cedula: 'V-26345678',
    tlf_num: '+584121234567',
  },
  delivery_type: 'envio_nacional',
  payment_method: 'pago_movil',
  total_amount: '18.50',
  created_at: '2026-08-13T14:30:00.000Z',
  items: [
    {
      product_name: 'Bálsamo de Fresa',
      product_qty: 2,
      product_price: '3.50',
      product_total: '7.00',
    },
  ],
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/pedidos/42']}>
      <Routes>
        <Route path="/pedidos/:id" element={<OrderDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('OrderDetailPage — datos completos del pedido', () => {
  beforeEach(() => {
    window.localStorage.setItem('tokki_orders_v1', JSON.stringify([ORDER]));
    window.localStorage.setItem('tokki_products_v1', JSON.stringify([]));
  });

  it('muestra la cédula del cliente', async () => {
    renderPage();
    expect(await screen.findByText('V-26345678')).toBeInTheDocument();
  });

  it('muestra el tipo de entrega con etiqueta legible', async () => {
    renderPage();
    expect(await screen.findByText('Envío Nacional (Zoom)')).toBeInTheDocument();
    expect(screen.getByText('Entrega')).toBeInTheDocument();
  });

  it('muestra el método de pago con etiqueta legible', async () => {
    renderPage();
    expect(await screen.findByText('Pago Móvil')).toBeInTheDocument();
    expect(screen.getByText('Pago')).toBeInTheDocument();
  });

  it('muestra los datos básicos del pedido', async () => {
    renderPage();
    const headings = await screen.findAllByText(/Pedido #42/);
    expect(headings.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('María González')).toBeInTheDocument();
    expect(screen.getByText('+584121234567')).toBeInTheDocument();
    expect(screen.getByText('$18.50')).toBeInTheDocument();
  });

  it('oculta la fila de cédula cuando el pedido no la tiene', async () => {
    resetStoreForTests();
    const withoutCedula = {
      ...ORDER,
      client: { name: 'Luis', last_name: 'Pérez', tlf_num: '+584141112222' },
    };
    window.localStorage.setItem('tokki_orders_v1', JSON.stringify([withoutCedula]));
    renderPage();
    expect(await screen.findByText('Luis Pérez')).toBeInTheDocument();
    expect(screen.queryByText(/^V-\d|^E-\d|^J-\d/)).not.toBeInTheDocument();
  });
});
