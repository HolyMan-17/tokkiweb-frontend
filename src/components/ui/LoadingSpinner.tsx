import './LoadingSpinner.css';

interface LoadingSpinnerProps {
  fullPage?: boolean;
}

export function LoadingSpinner({ fullPage = false }: LoadingSpinnerProps) {
  const spinner = (
    <div className="spinner-container">
      <div className="spinner"></div>
    </div>
  );
  
  if (fullPage) {
    return <div className="spinner-full-page">{spinner}</div>;
  }
  
  return spinner;
}

export default LoadingSpinner;
