export interface ChartPillOption<T extends string = string> {
  value: T;
  label: string;
}

interface ChartPillGroupProps<T extends string> {
  ariaLabel: string;
  options: readonly ChartPillOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

function pillButtonClass(isActive: boolean): string {
  return isActive ? 'pill-btn--active' : '';
}

/**
 * Row of exclusive filter pills used by the dashboard chart cards
 * (métrica, período y criterio de distribución).
 */
export function ChartPillGroup<T extends string>({
  ariaLabel,
  options,
  value,
  onChange,
}: ChartPillGroupProps<T>) {
  return (
    <div className="pill-group" role="tablist" aria-label={ariaLabel}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`pill-btn ${pillButtonClass(value === option.value)}`}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export default ChartPillGroup;
