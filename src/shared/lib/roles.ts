import type { CurrentUser } from "@shared/api/contracts";

export const ROLE_ADMIN = 10;
export const ROLE_ROOT = 100;

export function isAdminUser(user: CurrentUser | null | undefined) {
  return (user?.role ?? 0) >= ROLE_ADMIN;
}

export function isRootUser(user: CurrentUser | null | undefined) {
  return (user?.role ?? 0) >= ROLE_ROOT;
}
