import './ErrorState.css';

interface ErrorStateProps {
  title?: string;
  message?: string;
  retryLabel?: string;
  onRetry?: () => void;
}

// Shared kawaii error screen — the single place a failed data load or a
// crashed route renders its fallback. Pair with <LoadingSpinner /> so every
// screen has the full pending → success/error lifecycle.
export function ErrorState({
  title = '¡Ups! Algo salió mal',
  message = 'No pudimos cargar esta sección. Revisa tu conexión e inténtalo de nuevo.',
  retryLabel = 'Reintentar',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="error-state animate-fadeIn" role="alert">
      <div className="error-state__icon" aria-hidden="true">
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      </div>
      <h2 className="error-state__title font-display">{title}</h2>
      <p className="error-state__message">{message}</p>
      {onRetry && (
        <button type="button" className="btn btn-primary mt-md" onClick={onRetry}>
          {retryLabel}
        </button>
      )}
    </div>
  );
}

export default ErrorState;
