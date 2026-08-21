import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { ADMIN_PATH } from '../../lib/auth';
import type { AppRole } from '../../lib/auth';
import { useAdminAuth } from './useAdminAuth';
import './AuthGate.css';

interface RequireRoleProps {
  roles: AppRole[];
  children: ReactNode;
  fallback?: ReactNode;
}

// Guards a subtree by role. Renders a loading state while Clerk resolves,
// redirects to sign-in when signed out, and shows a fallback (or a friendly
// message) when the user lacks the required role.
export function RequireRole({ roles, children, fallback }: RequireRoleProps) {
  const { configured, isLoaded, isSignedIn, role } = useAdminAuth();

  if (!isLoaded) {
    return (
      <div className="auth-gate auth-gate--loading">
        <span className="auth-spinner" aria-hidden="true" />
        <p>Cargando…</p>
      </div>
    );
  }

  if (!isSignedIn) {
    return configured ? <Navigate to={`${ADMIN_PATH}/sign-in`} replace /> : <AuthBlockedMessage />;
  }

  if (!roles.includes(role)) {
    if (fallback !== undefined) return <>{fallback}</>;
    return <AccessDeniedMessage />;
  }

  return <>{children}</>;
}

function AuthBlockedMessage() {
  return (
    <div className="auth-gate">
      <div className="auth-gate__icon" aria-hidden="true">🔒</div>
      <h2 className="auth-gate__title">Autenticación no configurada</h2>
      <p className="auth-gate__text">
        El panel de administración requiere Clerk. Agrega tu{' '}
        <code>VITE_CLERK_PUBLISHABLE_KEY</code> al archivo <code>.env</code>.
      </p>
    </div>
  );
}

function AccessDeniedMessage() {
  return (
    <div className="auth-gate">
      <div className="auth-gate__icon" aria-hidden="true">⛔</div>
      <h2 className="auth-gate__title">Acceso denegado</h2>
      <p className="auth-gate__text">
        No tienes permisos para ver esta sección.
      </p>
    </div>
  );
}

export default RequireRole;
