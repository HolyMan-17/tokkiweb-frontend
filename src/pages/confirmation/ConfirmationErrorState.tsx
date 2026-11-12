import { ErrorState } from '../../components/ui/ErrorState';

interface ConfirmationErrorStateProps {
  /** The receipt could not be found (404) instead of a transient failure. */
  notFound: boolean;
  onRetry: () => void;
  onHome: () => void;
}

/**
 * Error branch of the confirmation page — either a missing receipt (404) or a
 * recoverable failure with a retry action. Both share the "Volver al inicio" escape.
 */
export function ConfirmationErrorState({ notFound, onRetry, onHome }: ConfirmationErrorStateProps) {
  return (
    <div className="page confirmation-page animate-fadeIn text-center">
      {notFound ? (
        <ErrorState
          title="Pedido no encontrado"
          message="No encontramos los datos de tu pedido. Si acabas de comprar, revisa tu historial o vuelve al inicio."
        />
      ) : (
        <ErrorState onRetry={onRetry} />
      )}
      <button className="btn btn-primary btn-lg btn-block mt-xl" onClick={onHome}>
        Volver al inicio
      </button>
    </div>
  );
}

export default ConfirmationErrorState;
