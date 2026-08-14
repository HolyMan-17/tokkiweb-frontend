import './QuantitySelector.css';

interface QuantitySelectorProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max: number;
}

export function QuantitySelector({ value, onChange, min = 1, max }: QuantitySelectorProps) {
  const handleDecrement = (e: React.MouseEvent) => {
    e.preventDefault();
    if (value > min) onChange(value - 1);
  };

  const handleIncrement = (e: React.MouseEvent) => {
    e.preventDefault();
    if (value < max) onChange(value + 1);
  };

  return (
    <div className="qty-selector">
      <button 
        className="qty-btn" 
        onClick={handleDecrement}
        disabled={value <= min}
        aria-label="Disminuir"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </button>
      
      <span className="qty-value">{value}</span>
      
      <button 
        className="qty-btn" 
        onClick={handleIncrement}
        disabled={value >= max}
        aria-label="Aumentar"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </button>
    </div>
  );
}

export default QuantitySelector;
