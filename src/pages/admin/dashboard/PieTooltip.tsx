interface TooltipPayloadItem {
  value?: number | string;
  name?: string;
}

interface PieTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}

export function PieTooltip({ active, payload }: PieTooltipProps) {
  if (active && payload && payload.length) {
    const item = payload[0];
    const val = Number(item.value ?? 0);
    return (
      <div className="chart-tooltip">
        <p className="tooltip-label">{item.name}</p>
        <p className="tooltip-value">
          {val} {val === 1 ? 'pedido' : 'pedidos'}
        </p>
      </div>
    );
  }
  return null;
}

export default PieTooltip;
