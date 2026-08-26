import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import OrdersDashboardPage from './OrdersDashboardPage';
import { fetchOrderSummaries } from '../../../api/orders';
import { AdminAuthContext } from '../../../components/auth/AdminAuthContext';
import type { OrderSummary } from '../../../types';

vi.mock('../../../api/orders', async importOriginal => ({
  ...(await importOriginal<typeof import('../../../api/orders')>()),
  fetchOrderSummaries: vi.fn(),
}));

const mockFetchOrderSummaries = vi.mocked(fetchOrderSummaries);

const SUMMARIES: OrderSummary[] = [
  {
    order_id: 7,
    name: 'María',
    last_name: 'González',
    cedula: 'V-26345678',
    tlf_num: '+584146999670',
    total_amount: '18.50',
    status: 'pending',
    item_count: 3,
    created_at: '2026-08-13T14:30:00.000Z',
    delivery_type: 'envio_nacional',
    payment_method: 'pago_movil',
  },
  {
    order_id: 6,
    name: 'Sofía',
    last_name: 'Hernández',
    tlf_num: '+584147778899',
    total_amount: '15.50',
    status: 'approved',
    item_count: 1,
    created_at: '2026-08-14T08:10:00.000Z',
    delivery_type: 'delivery',
    payment_method: 'zelle',
  },
];

function renderPage() {
  return render(
    <AdminAuthContext.Provider
      value={{
        configured: true,
        isLoaded: true,
        isSignedIn: true,
        role: 'owner',
        getAdminToken: async () => 'clerk-token',
      }}
    >
      <MemoryRouter>
        <OrdersDashboardPage />
      </MemoryRouter>
    </AdminAuthContext.Provider>,
  );
}

beforeEach(() => {
  mockFetchOrderSummaries.mockReset();
});

describe('OrdersDashboardPage — listado vía API', () => {
  it('renderiza los pedidos devueltos por listOrders', async () => {
    mockFetchOrderSummaries.mockResolvedValue(SUMMARIES);
    renderPage();

    expect(await screen.findByText('#7')).toBeInTheDocument();
    expect(screen.getByText('María González')).toBeInTheDocument();
    expect(screen.getByText('#6')).toBeInTheDocument();
    expect(screen.getByText('3 artículos')).toBeInTheDocument();
    expect(screen.getByText('1 artículo')).toBeInTheDocument();
  });

  it('muestra los chips de entrega y pago por fila con etiquetas legibles', async () => {
    mockFetchOrderSummaries.mockResolvedValue(SUMMARIES);
    renderPage();

    // Fila #7: envio_nacional / pago_movil
    expect(await screen.findByText('Envío Nacional (Zoom)')).toBeInTheDocument();
    expect(screen.getByText('Pago Móvil')).toBeInTheDocument();
    // Fila #6: delivery / zelle
    expect(screen.getByText('Delivery')).toBeInTheDocument();
    expect(screen.getByText('Zelle')).toBeInTheDocument();
  });

  it('pide el listado con el token de admin', async () => {
    mockFetchOrderSummaries.mockResolvedValue(SUMMARIES);
    renderPage();

    await screen.findByText('#7');
    expect(mockFetchOrderSummaries).toHaveBeenCalledTimes(1);
    const auth = mockFetchOrderSummaries.mock.calls[0][0];
    expect(await auth?.getToken?.()).toBe('clerk-token');
  });

  it('muestra el estado vacío cuando no hay pedidos', async () => {
    mockFetchOrderSummaries.mockResolvedValue([]);
    renderPage();

    expect(await screen.findByText(/No se encontraron pedidos con este filtro/)).toBeInTheDocument();
  });
});
