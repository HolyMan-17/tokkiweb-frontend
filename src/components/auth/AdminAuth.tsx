import type { ReactNode } from 'react';
import { ClerkProvider, useUser } from '@clerk/react';
import { ADMIN_DEV_BYPASS, CLERK_PUBLISHABLE_KEY, ROLES } from '../../lib/auth';
import type { AppRole } from '../../lib/auth';
import { AdminAuthContext } from './AdminAuthContext';
import type { AdminAuthValue } from './AdminAuthContext';

// ─── Shared auth provider ─────────────────────────────────
// Hooks (like useUser) may only be called unconditionally inside a Clerk
// provider. To keep that guarantee we expose our own context, filled either
// from Clerk (when configured) or from the dev bypass. Consumers read this
// context via useAdminAuth() — never Clerk's hooks directly — so they work
// in both modes.

function roleFromMetadata(publicMetadata: Record<string, unknown> | undefined): AppRole {
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

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
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
    >
      <ClerkBridge>{children}</ClerkBridge>
    </ClerkProvider>
  );
}

export default AuthProvider;
