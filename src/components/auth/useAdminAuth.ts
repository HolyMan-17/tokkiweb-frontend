import { useContext } from 'react';
import { AdminAuthContext } from './AdminAuthContext';
import type { AdminAuthValue } from './AdminAuthContext';

// Safe to call anywhere under <AuthProvider> — never throws.
export function useAdminAuth(): AdminAuthValue {
  return useContext(AdminAuthContext);
}

export default useAdminAuth;
