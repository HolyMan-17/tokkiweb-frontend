import { describeStockAdjustment, type StockAdjustment } from '../../utils/stock';
import './StockNotice.css';

interface StockNoticeProps {
  changes: StockAdjustment[];
  onDismiss?: () => void;
}

/** Branded banner listing the stock adjustments applied to the cart. */
export default function StockNotice({ changes, onDismiss }: StockNoticeProps) {
  if (changes.length === 0) return null;

  return (
    <div className="stock-notice card" role="status">
      <p className="stock-notice-title">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        Ajustamos tu carrito:
      </p>
      <ul className="stock-notice-list">
        {changes.map(change => (
          <li key={`${change.productId}-${change.type}`}>
            {describeStockAdjustment(change)}
          </li>
        ))}
      </ul>
      {onDismiss && (
        <button
          type="button"
          className="btn btn-primary btn-sm stock-notice-dismiss"
          onClick={onDismiss}
        >
          Entendido
        </button>
      )}
    </div>
  );
}
