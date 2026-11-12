import { formatPrice } from '../../../constants';
import type { ChartMetric, SalesByDayPoint } from '../../../utils/salesByDay';

interface SalesSummaryChipProps {
  metric: ChartMetric;
  periodTotal: number;
  selectedPoint: SalesByDayPoint | null;
  onClearSelection: () => void;
}

function formatMetricValue(metric: ChartMetric, total: number): string {
  return metric === 'revenue' ? formatPrice(String(total)) : `${total} pedidos`;
}

/**
 * Summary chip of the sales card: shows the selected bar value or the
 * aggregated total for the active period/metric.
 */
export function SalesSummaryChip({
  metric,
  periodTotal,
  selectedPoint,
  onClearSelection,
}: SalesSummaryChipProps) {
  return (
    <div className="chart-summary-chip">
      <span>
        {selectedPoint ? (
          <>
            <span className="selected-chip-label">{selectedPoint.fullLabel || selectedPoint.label}:</span>{' '}
            <strong>{formatMetricValue(metric, selectedPoint.total)}</strong>
            <button
              type="button"
              className="chip-clear-btn"
              onClick={(e) => {
                e.stopPropagation();
                onClearSelection();
              }}
              title="Ver total período"
              aria-label="Ver total período"
            >
              ×
            </button>
          </>
        ) : (
          <>
            Total período:{' '}
            <strong>{formatMetricValue(metric, periodTotal)}</strong>
          </>
        )}
      </span>
    </div>
  );
}

export default SalesSummaryChip;
