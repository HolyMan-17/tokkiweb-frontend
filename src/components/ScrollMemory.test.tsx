import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ScrollMemory } from './ScrollMemory';
import { SCROLL_STORAGE_KEY, loadScrollMap, persistScrollMap } from '../store/scrollMemory';

const MAQUILLAJE = '/categorias/maquillaje';
const PRODUCTOS = '/productos';

function setScrollY(value: number) {
  Object.defineProperty(window, 'scrollY', { value, configurable: true, writable: true });
}

function scrollToMock() {
  return vi.mocked(window.scrollTo);
}

/** Offset a la que apunta una llamada a window.scrollTo (top del objeto). */
function scrollTopOf(call: unknown[]): number | undefined {
  const first = call[0];
  if (!first || typeof first !== 'object' || !('top' in first)) return undefined;
  const top = (first as ScrollToOptions).top;
  return typeof top === 'number' ? top : undefined;
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

function Probe() {
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <div>
      <span data-testid="path">{location.pathname}</span>
      <button type="button" onClick={() => navigate(PRODUCTOS)}>
        ir a productos
      </button>
      <button type="button" onClick={() => navigate(MAQUILLAJE)}>
        ir a maquillaje
      </button>
    </div>
  );
}

function renderMemory(initialEntries: string[]) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <ScrollMemory />
      <Probe />
    </MemoryRouter>
  );
}

describe('ScrollMemory — restauración de scroll por ruta', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    setScrollY(0);
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      value: 4000,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.sessionStorage.clear();
    delete (window.history as { scrollRestoration?: string }).scrollRestoration;
  });

  it('restaura el offset recordado al montar', () => {
    persistScrollMap({ [MAQUILLAJE]: 640 });
    renderMemory([MAQUILLAJE]);
    expect(scrollToMock()).toHaveBeenCalledWith({ top: 640, behavior: 'instant' });
  });

  it('abre en el inicio una ruta sin offset recordado', () => {
    renderMemory([MAQUILLAJE]);
    expect(scrollToMock()).toHaveBeenCalledWith({ top: 0, behavior: 'instant' });
  });

  it('guarda el offset de salida al navegar a otra ruta', () => {
    renderMemory([MAQUILLAJE]);

    setScrollY(800);
    act(() => {
      window.dispatchEvent(new Event('scroll'));
    });
    fireEvent.click(screen.getByRole('button', { name: 'ir a productos' }));

    expect(screen.getByTestId('path')).toHaveTextContent(PRODUCTOS);
    expect(loadScrollMap()[MAQUILLAJE]).toBe(800);
  });

  it('restaura el offset guardado al volver a la ruta', () => {
    renderMemory([MAQUILLAJE]);

    setScrollY(800);
    act(() => {
      window.dispatchEvent(new Event('scroll'));
    });
    fireEvent.click(screen.getByRole('button', { name: 'ir a productos' }));
    fireEvent.click(screen.getByRole('button', { name: 'ir a maquillaje' }));

    expect(scrollToMock()).toHaveBeenCalledWith({ top: 800, behavior: 'instant' });
  });

  it('sobrevive a una carga corrupta de sessionStorage', () => {
    window.sessionStorage.setItem(SCROLL_STORAGE_KEY, '{not json');
    expect(() => renderMemory([MAQUILLAJE])).not.toThrow();
    expect(scrollToMock()).toHaveBeenCalledWith({ top: 0, behavior: 'instant' });
  });

  it('se monta sin scrollRestoration en el navegador', () => {
    expect('scrollRestoration' in window.history).toBe(false);
    expect(() => renderMemory([MAQUILLAJE])).not.toThrow();
  });

  it('desactiva la restauración nativa cuando el navegador la expone', () => {
    Object.defineProperty(window.history, 'scrollRestoration', {
      value: 'auto',
      configurable: true,
      writable: true,
    });

    renderMemory([MAQUILLAJE]);
    expect(window.history.scrollRestoration).toBe('manual');
  });

  it('reaplica el offset mientras llega el contenido asíncrono', async () => {
    persistScrollMap({ [MAQUILLAJE]: 640 });
    renderMemory([MAQUILLAJE]);

    const callsBefore = scrollToMock().mock.calls.length;
    await act(async () => {
      await nextFrame();
    });

    expect(scrollToMock().mock.calls.length).toBeGreaterThan(callsBefore);
  });

  it('deja de reaplicar el offset cuando el usuario toma el control', async () => {
    persistScrollMap({ [MAQUILLAJE]: 640 });
    renderMemory([MAQUILLAJE]);

    await act(async () => {
      await nextFrame();
    });

    act(() => {
      window.dispatchEvent(new Event('wheel'));
    });
    const callsAfterWheel = scrollToMock().mock.calls.length;

    await act(async () => {
      await nextFrame();
      await nextFrame();
    });

    expect(scrollToMock().mock.calls.length).toBe(callsAfterWheel);
  });

  it('no pisa el scroll del usuario después de una restauración', async () => {
    persistScrollMap({ [MAQUILLAJE]: 640 });
    renderMemory([MAQUILLAJE]);

    // El usuario se desplaza a una posición que NO es la restaurada.
    setScrollY(300);
    act(() => {
      window.dispatchEvent(new Event('scroll'));
    });

    const callsAfterUserScroll = scrollToMock().mock.calls.length;

    await act(async () => {
      await nextFrame();
      await nextFrame();
    });

    // La restauración abortó: la página no vuelve al offset recordado.
    expect(scrollToMock().mock.calls.length).toBe(callsAfterUserScroll);
    expect(
      scrollToMock()
        .mock.calls.slice(callsAfterUserScroll)
        .some((call) => scrollTopOf(call) === 640),
    ).toBe(false);
  });

  it('no ancla al usuario arriba en una pantalla sin offset recordado', async () => {
    renderMemory([MAQUILLAJE]);

    // Sin offset recordado la pantalla abre arriba, pero el usuario puede
    // desplazarse con normalidad: la app no lo devuelve al inicio.
    setScrollY(500);
    act(() => {
      window.dispatchEvent(new Event('scroll'));
    });

    const callsAfterUserScroll = scrollToMock().mock.calls.length;

    await act(async () => {
      await nextFrame();
      await nextFrame();
    });

    expect(scrollToMock().mock.calls.length).toBe(callsAfterUserScroll);
    expect(
      scrollToMock()
        .mock.calls.slice(callsAfterUserScroll)
        .some((call) => scrollTopOf(call) === 0),
    ).toBe(false);
  });

  it('guarda el offset real del usuario al salir, no el de la restauración', async () => {
    persistScrollMap({ [MAQUILLAJE]: 640 });
    renderMemory([MAQUILLAJE]);

    // Deja que la restauración se asiente en 640.
    await act(async () => {
      await nextFrame();
    });

    // El usuario se desplaza a 800.
    setScrollY(800);
    act(() => {
      window.dispatchEvent(new Event('scroll'));
    });

    await act(async () => {
      await nextFrame();
    });

    fireEvent.click(screen.getByRole('button', { name: 'ir a productos' }));

    // Lo que se guarda es la posición del usuario (800), no el objetivo de
    // la restauración (640).
    expect(loadScrollMap()[MAQUILLAJE]).toBe(800);
  });

  it('guarda la posición viva aunque el evento de scroll aún no se haya despachado', () => {
    renderMemory([MAQUILLAJE]);

    // El navegador aplaza el evento 'scroll' al siguiente frame: si la
    // navegación ocurre en el mismo tick, el offset rastreado todavía es
    // el anterior. La posición viva es la que manda.
    setScrollY(900);

    fireEvent.click(screen.getByRole('button', { name: 'ir a productos' }));

    expect(loadScrollMap()[MAQUILLAJE]).toBe(900);
  });

  it('captura la posición en la interacción que puede navegar', () => {
    renderMemory([MAQUILLAJE]);

    // El clic llega antes que el evento de scroll: la posición se toma en
    // el momento de la interacción, no un frame más tarde.
    setScrollY(750);
    fireEvent.click(screen.getByRole('button', { name: 'ir a productos' }));

    expect(loadScrollMap()[MAQUILLAJE]).toBe(750);
  });
});
