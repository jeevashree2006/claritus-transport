/**
 * Role codes. They must match the `roles.code` values inserted by database/seed.js
 * and the role list in client/src/config/roles.js.
 */
export const ROLES = Object.freeze({
  ADMIN: 'admin', // Administrator - full access
  MD: 'md', // Managing Director - view only: Agent workflow and Success rate
});

export const ROLE_NAMES = Object.freeze({
  [ROLES.ADMIN]: 'Administrator',
  [ROLES.MD]: 'Managing Director',
});
