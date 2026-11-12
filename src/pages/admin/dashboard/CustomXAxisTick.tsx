import type { TimePeriod } from '../../../utils/salesByDay';

interface CustomXAxisTickProps {
  x?: number;
  y?: number;
  payload?: {
    value?: string;
  };
  period?: TimePeriod;
}

export function CustomXAxisTick({ x = 0, y = 0, payload, period = 'day' }: CustomXAxisTickProps) {
  const value = String(payload?.value ?? '');

  if (period === 'week' && value.includes(' - ')) {
    const [start, end] = value.split(' - ');
    return (
      <g transform={`translate(${x},${y})`}>
        <text
          x={0}
          y={0}
          textAnchor="middle"
          fill="var(--color-text-muted)"
          fontSize={10}
          fontWeight={500}
        >
          <tspan x={0} dy={10}>{start}</tspan>
          <tspan x={0} dy={12}>{`- ${end}`}</tspan>
        </text>
      </g>
    );
  }

  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={period === 'month' ? 8 : 10}
        textAnchor="middle"
        fill="var(--color-text-muted)"
        fontSize={period === 'month' ? 11 : 12}
        fontWeight={500}
      >
        {value}
      </text>
    </g>
  );
}

export default CustomXAxisTick;
