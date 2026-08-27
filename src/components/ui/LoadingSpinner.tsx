import './LoadingSpinner.css';

interface LoadingSpinnerProps {
  fullPage?: boolean;
}

const SPINNER_ELEMENT = (
  <div className="spinner-container">
    <div className="spinner"></div>
  </div>
);

export function LoadingSpinner({ fullPage = false }: LoadingSpinnerProps) {
  if (fullPage) {
    return <div className="spinner-full-page">{SPINNER_ELEMENT}</div>;
  }

  return SPINNER_ELEMENT;
}

export default LoadingSpinner;
