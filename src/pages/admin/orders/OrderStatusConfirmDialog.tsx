import ConfirmDialog, { type ConfirmDialogVariant } from '../../../components/ui/ConfirmDialog';
import type { PendingOrderAction } from './useOrderStatusActions';

interface OrderStatusConfirmDialogProps {
  action: PendingOrderAction;
  onConfirm: () => void;
  onCancel: () => void;
}

const ACTION_COPY: Record<
  PendingOrderAction,
  {
    variant: ConfirmDialogVariant;
    title: string;
    message: string;
    confirmLabel: string;
  }
> = {
  approve: {
    variant: 'success',
    title: '¿Aprobar este pedido?',
    message: 'Al aprobar el pedido se confirma la venta.',
    confirmLabel: 'Sí, aprobar',
  },
  cancel: {
    variant: 'danger',
    title: '¿Cancelar este pedido?',
    message: 'Al cancelar el pedido se restaurará el stock de los productos.',
    confirmLabel: 'Sí, cancelar',
  },
};

/** Confirmation dialog shown before approving or cancelling an order. */
export function OrderStatusConfirmDialog({
  action,
  onConfirm,
  onCancel,
}: OrderStatusConfirmDialogProps) {
  const copy = ACTION_COPY[action];

  return (
    <ConfirmDialog
      open
      variant={copy.variant}
      title={copy.title}
      message={
        <>
          {copy.message}
          {' '}Esta acción <strong>no se puede revertir</strong>.
        </>
      }
      confirmLabel={copy.confirmLabel}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}

export default OrderStatusConfirmDialog;
