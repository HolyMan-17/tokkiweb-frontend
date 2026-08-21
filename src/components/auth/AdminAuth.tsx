import type { ReactNode } from 'react';
import { ADMIN_DEV_BYPASS, CLERK_PUBLISHABLE_KEY, ROLES } from '../../lib/auth';
import { AdminAuthContext } from './AdminAuthContext';
import type { AdminAuthValue } from './AdminAuthContext';

// ─── Storefront auth provider ───────────────────────────
// Clerk is NOT loaded here — it is lazy-mounted only under admin routes via
// <AdminClerkProvider> (see App.tsx). This keeps @clerk/* out of the
// storefront bundle entirely, so the catalog page ships no third-party JS.
//
// Consumers read auth state through useAdminAuth() (never Clerk's hooks
// directly). On admin routes <AdminClerkProvider> overrides this context
// with real Clerk state; on the storefront we report a lightweight default
// (signed-out unless the dev bypass is active) which is all the customer
// chrome needs to decide whether to reveal the hidden admin link.

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const configured = Boolean(CLERK_PUBLISHABLE_KEY);
  const value: AdminAuthValue = {
    configured,
    isLoaded: true,
    // Storefront never resolves Clerk. The dev bypass keeps the admin panel
    // usable in local development without a Clerk key.
    isSignedIn: ADMIN_DEV_BYPASS,
    role: ADMIN_DEV_BYPASS ? ROLES.TECH : 'none',
  };
  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export default AuthProvider;
