// ─── Auth & admin routing config ───────────────────────────
// The admin panel lives at a hidden, non-guessable path. Real access control
// is enforced by Clerk (roles via user.publicMetadata.role), not by the URL.

export const ADMIN_PATH = '/tokki-admin';

export const CLERK_PUBLISHABLE_KEY = import.meta.env
  .VITE_CLERK_PUBLISHABLE_KEY as string | undefined;

// Roles understood by the app (set in Clerk Dashboard → Users → public metadata):
//   owner -> full admin panel
//   tech  -> full admin panel + Dev Tools
export const ROLES = {
  OWNER: 'owner',
  TECH: 'tech',
} as const;

export type AppRole = (typeof ROLES)[keyof typeof ROLES] | 'none';

// DEV ONLY: when Clerk isn't configured yet, this lets you keep developing the
// admin UI without hitting a login wall. NEVER set this to "true" in production.
export const ADMIN_DEV_BYPASS =
  import.meta.env.VITE_ADMIN_DEV_BYPASS === 'true';

export interface AdminAccess {
  configured: boolean;
  isLoaded: boolean;
  isSignedIn: boolean;
  role: AppRole;
}
