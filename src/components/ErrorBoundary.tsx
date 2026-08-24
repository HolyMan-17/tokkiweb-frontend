import { Component, type ErrorInfo, type ReactNode } from 'react';
import ErrorState from './ui/ErrorState';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Shown inside the fallback as context, e.g. "el catálogo" */
  sectionName?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

// Route-level crash guard. Render errors anywhere inside a wrapped route
// subtree fall back to the shared <ErrorState /> instead of a blank page.
// Data-fetching errors are handled per-screen with useAsync + <ErrorState />;
// this catches the unexpected (broken render, bad state, etc.).
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[Tokki] Error en la pantalla:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      const section = this.props.sectionName ?? 'esta sección';
      return (
        <div className="page">
          <ErrorState
            message={`Ocurrió un error inesperado al mostrar ${section}. Tus datos están a salvo.`}
          />
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
