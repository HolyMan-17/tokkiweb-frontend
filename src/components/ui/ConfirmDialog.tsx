import { useEffect, useRef, type ReactNode } from 'react';
import './ConfirmDialog.css';

export type ConfirmDialogVariant = 'warning' | 'danger' | 'success';

// Everything that can take keyboard focus inside the dialog. The dialog only
// renders two buttons today, but this keeps the trap correct if more are added.
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  variant?: ConfirmDialogVariant;
  onConfirm: () => void;
  onCancel: () => void;
}

// Shared kawaii confirmation dialog — the single place the shop asks for
// confirmation (archive products, approve/cancel orders, …). Replaces all
// native window.confirm() / alert() calls so every pop-up matches the brand.
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Volver',
  variant = 'warning',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  // Latest onCancel without re-subscribing the document keydown listener.
  const onCancelRef = useRef(onCancel);
  useEffect(() => {
    onCancelRef.current = onCancel;
  }, [onCancel]);

  // Modal lifecycle & focus management:
  // Open via showModal() for top-layer modal behavior, focus trapping, and backdrop.
  // Snapshot previous focus before opening, move focus to the safe action (cancel),
  // and restore focus when the dialog closes.
  useEffect(() => {
    if (!open) return undefined;

    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;

    const dialog = dialogRef.current;
    if (dialog) {
      if (typeof dialog.showModal === 'function') {
        if (!dialog.open) {
          dialog.showModal();
        }
      } else {
        dialog.setAttribute('open', '');
      }
    }

    const firstFocusable = dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    firstFocusable?.focus();

    return () => {
      if (dialog) {
        if (typeof dialog.close === 'function') {
          if (dialog.open) {
            dialog.close();
          }
        } else {
          dialog.removeAttribute('open');
        }
      }
      previouslyFocusedRef.current?.focus();
    };
  }, [open]);

  // Keyboard: Escape closes; Tab/Shift+Tab trapping ensures consistent focus wrapping
  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onCancelRef.current();
        return;
      }
      if (event.key !== 'Tab') return;

      const root = dialogRef.current;
      if (!root) return;
      const focusables = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const current = document.activeElement;
      const inside = current instanceof HTMLElement && root.contains(current);
      const atEdge = event.shiftKey ? current === first : current === last;

      if (!inside || atEdge) {
        event.preventDefault();
        const target = event.shiftKey ? last : first;
        target.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  if (!open) return null;

  const icon =
    variant === 'success' ? (
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ) : variant === 'danger' ? (
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
      </svg>
    ) : (
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    );

  return (
    <dialog
      ref={dialogRef}
      className="confirm-dialog animate-slideUp"
      aria-labelledby="confirm-title"
      onCancel={(e) => {
        e.preventDefault();
        onCancelRef.current();
      }}
    >
      <div className={`confirm-icon confirm-icon--${variant}`}>{icon}</div>
      <h2 id="confirm-title" className="confirm-title font-display">
        {title}
      </h2>
      <p className="confirm-text">{message}</p>
      <div className="confirm-actions">
        <button type="button" className="btn btn-outline" onClick={onCancel}>
          {cancelLabel}
        </button>
        <button
          type="button"
          className={`btn ${variant === 'danger' ? 'btn-danger' : variant === 'success' ? 'btn-success' : 'btn-primary'}`}
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}

export default ConfirmDialog;