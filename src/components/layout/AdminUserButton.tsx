import { UserButton } from '@clerk/react';

// Thin wrapper around Clerk's <UserButton>. Lives in its own module so that
// when <Header variant="admin"> lazy-loads it, @clerk/react is pulled into a
// dedicated chunk instead of the customer-facing bundle.

export function AdminUserButton() {
  return <UserButton />;
}

export default AdminUserButton;
