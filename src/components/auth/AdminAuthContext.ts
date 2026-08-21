import { createContext } from 'react';
import type { AppRole } from '../../lib/auth';

export interface AdminAuthValue {
  configured: boolean;
  isLoaded: boolean;
  isSignedIn: boolean;
  role: AppRole;
}

export const AdminAuthContext = createContext<AdminAuthValue>({
  configured: false,
  isLoaded: true,
  isSignedIn: false,
  role: 'none',
});
