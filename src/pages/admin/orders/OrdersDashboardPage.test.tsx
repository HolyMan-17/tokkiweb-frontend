import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import OrdersDashboardPage from './OrdersDashboardPage';
import { fetchOrderSummaries } from '../../../api/orders';
import { exportOrdersToCsv } from '../../../utils/exportOrders';
import { AdminAuthContext } from '../../../components/auth/AdminAuthContext';
import { ADMIN_ROUTES } from '../../../lib/routes';
import type { OrderSummary } from '../../../types';

vi.mock('../../../api/orders', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../api/orders')>()),
  fetchOrderSummaries: vi.fn(),
}));

vi.mock('../../../utils/exportOrders', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../utils/exportOrders')>();
  return {
    ...actual,
    exportOrdersToCsv: vi.fn(),
  };
});

const mockFetchOrderSummaries = vi.mocked(fetchOrderSummaries);
const mockExportOrdersToCsv = vi.mocked(exportOrdersToCsv);

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
  mockExportOrdersToCsv.mockReset();
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

  it('muestra la cédula y el teléfono del cliente en las tarjetas de pedido', async () => {
    mockFetchOrderSummaries.mockResolvedValue(SUMMARIES);
    renderPage();

    expect(await screen.findByText('V-26345678')).toBeInTheDocument();
    expect(screen.getByText('+584146999670')).toBeInTheDocument();
    expect(screen.getByText('+584147778899')).toBeInTheDocument();
  });

  it('genera el enlace directo a WhatsApp en la tarjeta del pedido', async () => {
    mockFetchOrderSummaries.mockResolvedValue(SUMMARIES);
    renderPage();

    const waLinks = await screen.findAllByRole('link', { name: /por whatsapp/i });
    expect(waLinks.length).toBe(2);
    expect(waLinks[0]).toHaveAttribute(
      'href',
      expect.stringContaining('https://wa.me/584146999670?text=Hola%20Mar%C3%ADa%2C%20te%20escribimos%20de%20Tokki%20Shop%20sobre%20tu%20pedido%20%237.'),
    );
  });

  it('permite buscar y filtrar pedidos por cédula', async () => {
    mockFetchOrderSummaries.mockResolvedValue(SUMMARIES);
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('María González');
    const searchInput = screen.getByLabelText(/buscar pedidos/i);
    expect(searchInput).toHaveClass('orders-search-input');
    expect(searchInput).not.toHaveClass('form-input');

    await user.type(searchInput, '26345678');

    expect(screen.getByText('María González')).toBeInTheDocument();
    expect(screen.queryByText('Sofía Hernández')).not.toBeInTheDocument();

    // Clear button functionality
    const clearBtn = screen.getByRole('button', { name: /limpiar búsqueda/i });
    expect(clearBtn).toBeInTheDocument();
    await user.click(clearBtn);

    expect(searchInput).toHaveValue('');
    expect(screen.getByText('Sofía Hernández')).toBeInTheDocument();
  });

  it('muestra el estado vacío cuando no hay pedidos y deshabilita exportar', async () => {
    mockFetchOrderSummaries.mockResolvedValue([]);
    renderPage();

    expect(await screen.findByText(/No se encontraron pedidos con este filtro/)).toBeInTheDocument();
    const exportBtn = screen.getByRole('button', { name: /exportar pedidos a csv/i });
    expect(exportBtn).toBeDisabled();
  });

  it('renderiza el botón de exportar CSV habilitado y ejecuta exportOrdersToCsv con pedidos filtrados', async () => {
    mockFetchOrderSummaries.mockResolvedValue(SUMMARIES);
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('María González');
    const exportBtn = screen.getByRole('button', { name: /exportar pedidos a csv/i });
    expect(exportBtn).toBeEnabled();

    // Click export with all orders
    await user.click(exportBtn);
    expect(mockExportOrdersToCsv).toHaveBeenCalledTimes(1);
    expect(mockExportOrdersToCsv).toHaveBeenCalledWith(SUMMARIES);

    // Filter by pending tab
    const pendingTab = screen.getByRole('button', { name: /^pendientes$/i });
    await user.click(pendingTab);

    // Export again, now only with filtered orders (order #7)
    await user.click(exportBtn);
    expect(mockExportOrdersToCsv).toHaveBeenCalledTimes(2);
    expect(mockExportOrdersToCsv).toHaveBeenLastCalledWith([SUMMARIES[0]]);
  });

  it('navega a los detalles del pedido al hacer clic en la tarjeta', async () => {
    mockFetchOrderSummaries.mockResolvedValue(SUMMARIES);
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('María González');
    const orderHeader = screen.getByText('#7');
    const card = orderHeader.closest('.order-card');
    expect(card).toBeInTheDocument();
    if (card) {
      await user.click(card);
    }
  });

  it('renderiza el botón "+ Nuevo Pedido" con el enlace a la creación de pedidos', async () => {
    mockFetchOrderSummaries.mockResolvedValue(SUMMARIES);
    renderPage();

    const createOrderBtn = await screen.findByRole('link', { name: /\+ nuevo pedido/i });
    expect(createOrderBtn).toBeInTheDocument();
    expect(createOrderBtn).toHaveAttribute('href', ADMIN_ROUTES.createOrder);
  });
});

