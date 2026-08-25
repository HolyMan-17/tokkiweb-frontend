import { createContext } from 'react';
import type { AppRole } from '../../lib/auth';

export interface AdminAuthValue {
  configured: boolean;
  isLoaded: boolean;
  isSignedIn: boolean;
  role: AppRole;
  /** Resolves a Clerk session JWT for Authorization headers on admin API
   *  calls. Undefined when Clerk isn't mounted (storefront / dev bypass). */
  getAdminToken?: () => Promise<string | null>;
}

export const AdminAuthContext = createContext<AdminAuthValue>({
  configured: false,
  isLoaded: true,
  isSignedIn: false,
  role: 'none',
});
