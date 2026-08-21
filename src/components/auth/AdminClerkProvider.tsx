import type { ReactNode } from 'react';
import { ClerkProvider, useUser } from '@clerk/react';
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
// <ClerkProvider>, so useUser() is always safe here.
function ClerkBridge({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, user } = useUser();
  return (
    <AdminAuthContext.Provider
      value={{
        configured: true,
        isLoaded,
        isSignedIn: isSignedIn ?? false,
        role: isSignedIn ? roleFromMetadata(user?.publicMetadata) : 'none',
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

interface AdminClerkProviderProps {
  children: ReactNode;
}

export function AdminClerkProvider({ children }: AdminClerkProviderProps) {
  // No Clerk key → fall back to the dev bypass so the panel stays usable
  // during local development. Never reached in production (this provider is
  // only mounted on admin routes, and prod always has a key).
  if (!CLERK_PUBLISHABLE_KEY) {
    const devValue: AdminAuthValue = {
      configured: false,
      isLoaded: true,
      isSignedIn: ADMIN_DEV_BYPASS,
      role: ADMIN_DEV_BYPASS ? ROLES.TECH : 'none',
    };
    return (
      <AdminAuthContext.Provider value={devValue}>
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
