/**
 * Role codes - must match server/src/config/roles.js and the `roles` table.
 */
export const ROLES = Object.freeze({
  ADMIN: 'admin',
  MD: 'md',
});

/** Label shown in the topbar under the user's name. */
export const ROLE_LABELS = Object.freeze({
  [ROLES.ADMIN]: 'Administrator',
  [ROLES.MD]: 'Managing director',
});

/** Where each role lands after sign-in, or when it opens a page it can't access. */
export const ROLE_HOME = Object.freeze({
  [ROLES.ADMIN]: '/dashboard',
  [ROLES.MD]: '/agent-workflow',
});

export function getHomePath(role) {
  return ROLE_HOME[role] || '/login';
}
