/**
 * Seeds the starting roles and users.
 *
 *   npm run db:seed
 *
 * Safe to run again: roles are inserted only if missing, and existing users are
 * kept exactly as they are (their passwords are NOT reset).
 */
import bcrypt from 'bcryptjs';
import { pool } from '../src/config/db.js';
import { env } from '../src/config/env.js';
import { ROLES, ROLE_NAMES } from '../src/config/roles.js';

const SEED_USERS = [
  { name: 'Administrator', username: 'admin', role: ROLES.ADMIN, password: env.seed.adminPassword },
  { name: 'Managing Director', username: 'md', role: ROLES.MD, password: env.seed.mdPassword },
];

async function seedRoles() {
  for (const [code, name] of Object.entries(ROLE_NAMES)) {
    const [result] = await pool.query('INSERT IGNORE INTO roles (code, name) VALUES (?, ?)', [code, name]);
    console.log(`[seed] Role "${code}" ${result.affectedRows ? 'created' : 'already exists'}.`);
  }
}

async function seedUsers() {
  const [roleRows] = await pool.query('SELECT id, code FROM roles');
  const roleIds = Object.fromEntries(roleRows.map((row) => [row.code, row.id]));

  for (const user of SEED_USERS) {
    const [existing] = await pool.query('SELECT id FROM users WHERE username = ? LIMIT 1', [user.username]);
    if (existing.length > 0) {
      console.log(`[seed] User "${user.username}" already exists - kept (password not changed).`);
      continue;
    }

    const passwordHash = await bcrypt.hash(user.password, 10);
    await pool.query(
      'INSERT INTO users (name, username, password_hash, role_id, is_active) VALUES (?, ?, ?, ?, 1)',
      [user.name, user.username, passwordHash, roleIds[user.role]]
    );
    console.log(`[seed] User "${user.username}" created with role "${user.role}".`);
  }
}

async function run() {
  try {
    await seedRoles();
    await seedUsers();
    console.log('[seed] Done.');
  } finally {
    await pool.end();
  }
}

run().catch((error) => {
  console.error(`\n[seed] Failed: ${error.code ? `${error.code} ` : ''}${error.message}`);
  if (error.code === 'ER_NO_SUCH_TABLE') {
    console.error('       Run "npm run db:migrate" first.');
  }
  console.error('');
  process.exit(1);
});
