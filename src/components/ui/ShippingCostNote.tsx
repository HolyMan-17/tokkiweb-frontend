import './ShippingCostNote.css';

export const SHIPPING_COST_NOTE_TEXT =
  'Los costos de Delivery y Envío Nacional se cotizan por separado con el vendedor y no están incluidos en el total mostrado aquí.';

interface ShippingCostNoteProps {
  className?: string;
}

/**
 * Small storefront notice clarifying that shipping (Delivery / Envío
 * Nacional) is quoted separately and is NOT part of the displayed total.
 * Uses role="note" (supplementary info) so it never competes with the
 * live `role="status"` stock notices on cart/checkout.
 */
export function ShippingCostNote({ className }: ShippingCostNoteProps) {
  return (
    <p
      className={`shipping-cost-note${className ? ` ${className}` : ''}`}
      role="note"
    >
      <svg
        className="shipping-cost-note-icon"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
        <path d="M15 18H9" />
        <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14" />
        <circle cx="17" cy="18" r="2" />
        <circle cx="7" cy="18" r="2" />
      </svg>
      <span>{SHIPPING_COST_NOTE_TEXT}</span>
    </p>
  );
}

export default ShippingCostNote;
