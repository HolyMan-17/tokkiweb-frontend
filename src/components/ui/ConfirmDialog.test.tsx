import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import ConfirmDialog from './ConfirmDialog';

const BASE_PROPS = {
  title: '¿Eliminar producto?',
  message: 'Esta acción no se puede deshacer.',
  confirmLabel: 'Sí, eliminar',
};

// Harness with an outside "trigger" button so we can assert where focus
// comes from and where it returns when the dialog opens/closes.
function Harness({ open, variant = 'warning' as 'warning' | 'danger' | 'success' }: { open: boolean; variant?: 'warning' | 'danger' | 'success' }) {
  return (
    <>
      <button type="button" className="trigger">Abrir diálogo</button>
      <ConfirmDialog
        open={open}
        {...BASE_PROPS}
        variant={variant}
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    </>
  );
}

describe('ConfirmDialog — gestión de foco', () => {
  it('llama onCancel al presionar Escape', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<ConfirmDialog open {...BASE_PROPS} onConfirm={() => {}} onCancel={onCancel} />);

    await user.keyboard('{Escape}');

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('no reacciona a Escape cuando está cerrado', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<ConfirmDialog open={false} {...BASE_PROPS} onConfirm={() => {}} onCancel={onCancel} />);

    await user.keyboard('{Escape}');

    expect(onCancel).not.toHaveBeenCalled();
  });

  it('el foco inicial cae en el primer enfocable (botón cancelar)', () => {
    render(<Harness open />);

    expect(screen.getByRole('button', { name: 'Volver' })).toHaveFocus();
  });

  it('variante danger: el foco inicial va al botón seguro (cancelar), no al destructivo', () => {
    render(<Harness open variant="danger" />);

    expect(screen.getByRole('button', { name: 'Volver' })).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Sí, eliminar' })).not.toHaveFocus();
  });

  it('Tab cicla del último enfocable de vuelta al primero', async () => {
    const user = userEvent.setup();
    render(<Harness open />);

    // Foco inicial → Volver (1º). Tab → Sí, eliminar (2º y último).
    await user.tab();
    expect(screen.getByRole('button', { name: 'Sí, eliminar' })).toHaveFocus();

    // Tab otra vez desde el último → debe envolver al primero.
    await user.tab();
    expect(screen.getByRole('button', { name: 'Volver' })).toHaveFocus();
  });

  it('Shift+Tab desde el primer enfocable envuelve al último', async () => {
    const user = userEvent.setup();
    render(<Harness open />);

    expect(screen.getByRole('button', { name: 'Volver' })).toHaveFocus();

    // Shift+Tab desde el primero → debe envolver al último.
    await user.tab({ shift: true });
    expect(screen.getByRole('button', { name: 'Sí, eliminar' })).toHaveFocus();
  });

  it('el trap evita que Tab escape hacia el botón externo del documento', async () => {
    const user = userEvent.setup();
    render(<Harness open />);
    const trigger = screen.getByRole('button', { name: 'Abrir diálogo' });

    await user.tab(); // → confirmar (último)
    await user.tab(); // → wrap a cancelar, NO al trigger externo

    expect(trigger).not.toHaveFocus();
    expect(screen.getByRole('button', { name: 'Volver' })).toHaveFocus();
  });

  it('restaura el foco al disparador original al cerrarse', () => {
    const { rerender } = render(<Harness open={false} />);

    const trigger = screen.getByRole('button', { name: 'Abrir diálogo' });
    trigger.focus();
    expect(trigger).toHaveFocus();

    rerender(<Harness open />);
    expect(screen.getByRole('button', { name: 'Volver' })).toHaveFocus();

    rerender(<Harness open={false} />);
    expect(trigger).toHaveFocus();
  });
});
