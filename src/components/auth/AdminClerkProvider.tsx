import { useMemo, type ReactNode } from 'react';
import { ClerkProvider, useUser, useAuth } from '@clerk/react';
import { ui } from '@clerk/ui';
import { ADMIN_DEV_BYPASS, CLERK_PUBLISHABLE_KEY, ROLES } from '../../lib/auth';
import type { AppRole } from '../../lib/auth';
import { AdminAuthContext } from './AdminAuthContext';
import type { AdminAuthValue } from './AdminAuthContext';

// ─── Admin-only Clerk provider ───────────────────────────
// This module statically imports @clerk/react + @clerk/ui, so it MUST stay
// out of the storefront bundle. In App.tsx it is wrapped in React.lazy()
// and only mounted for routes under the hidden admin path. It overrides
// the lightweight storefront <AdminAuthContext> with real Clerk state so
// <RequireRole> / <Header variant="admin"> can do access control.

function roleFromMetadata(
  publicMetadata: Record<string, unknown> | undefined,
): AppRole {
  const role = publicMetadata?.role;
  if (role === ROLES.OWNER) return ROLES.OWNER;
  if (role === ROLES.TECH) return ROLES.TECH;
  return 'none';
}

// Reads Clerk and forwards the result into our context. Only rendered inside
// <ClerkProvider>, so useUser()/useAuth() are always safe here.
function ClerkBridge({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, user } = useUser();
  const { getToken } = useAuth();
  const role = isSignedIn ? roleFromMetadata(user?.publicMetadata) : 'none';
  const signedIn = isSignedIn ?? false;

  const value = useMemo<AdminAuthValue>(
    () => ({
      configured: true,
      isLoaded,
      isSignedIn: signedIn,
      role,
      getAdminToken: getToken,
    }),
    [isLoaded, signedIn, role, getToken],
  );

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
}

const DEV_FALLBACK_VALUE: AdminAuthValue = {
  configured: false,
  isLoaded: true,
  isSignedIn: ADMIN_DEV_BYPASS,
  role: ADMIN_DEV_BYPASS ? ROLES.TECH : 'none',
};

interface AdminClerkProviderProps {
  children: ReactNode;
}

export function AdminClerkProvider({ children }: AdminClerkProviderProps) {
  // No Clerk key → fall back to the dev bypass so the panel stays usable
  // during local development. Never reached in production (this provider is
  // only mounted on admin routes, and prod always has a key).
  if (!CLERK_PUBLISHABLE_KEY) {
    return (
      <AdminAuthContext.Provider value={DEV_FALLBACK_VALUE}>
        {children}
      </AdminAuthContext.Provider>
    );
  }

  return (
    <ClerkProvider
      publishableKey={CLERK_PUBLISHABLE_KEY}
      afterSignOutUrl="/"
      ui={ui}
    >
      <ClerkBridge>{children}</ClerkBridge>
    </ClerkProvider>
  );
}

export default AdminClerkProvider;
