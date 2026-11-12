import { formatPrice } from '../../../constants';
import type { ChartMetric } from '../../../utils/salesByDay';

interface TooltipPayloadItem {
  value?: number | string;
  name?: string;
  payload?: {
    label?: string;
    fullLabel?: string;
    total?: number;
  };
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
  metric?: ChartMetric;
}

export function CustomTooltip({ active, payload, label, metric = 'revenue' }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    const item = payload[0];
    const val = Number(item.value ?? 0);
    const displayLabel = item.payload?.fullLabel || label || '';
    return (
      <div className="chart-tooltip">
        {displayLabel && <p className="tooltip-label">{displayLabel}</p>}
        <p className="tooltip-value">
          {metric === 'revenue' ? formatPrice(String(val)) : `${val} ${val === 1 ? 'pedido' : 'pedidos'}`}
        </p>
      </div>
    );
  }
  return null;
}

export default CustomTooltip;
