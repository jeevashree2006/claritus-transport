/**
 * Auth business logic: checking credentials, issuing JWTs, loading the signed-in user.
 */
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../../config/db.js';
import { env } from '../../config/env.js';
import { AppError } from '../../utils/AppError.js';

// Same message for "unknown user" and "wrong password" so usernames can't be guessed.
const INVALID_CREDENTIALS = 'Username or password is wrong.';

// Compared against when the username doesn't exist, so both paths take similar time.
const DUMMY_HASH = bcrypt.hashSync('claritas-dummy-password', 10);

const USER_COLUMNS = `
  u.id, u.name, u.username, u.email, u.is_active, u.last_login_at, r.code AS role
`;

/** Shape returned to the client - never includes password_hash. */
function toPublicUser(row) {
  return { id: row.id, name: row.name, username: row.username, role: row.role };
}

function signToken(user) {
  return jwt.sign({ sub: String(user.id), role: user.role, username: user.username }, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn,
  });
}

export async function login(username, password) {
  // Usernames are stored in lower case; the column collation is case-insensitive too.
  const normalized = username.trim().toLowerCase();

  const [rows] = await pool.query(
    `SELECT ${USER_COLUMNS}, u.password_hash
       FROM users u
       JOIN roles r ON r.id = u.role_id
      WHERE u.username = ?
      LIMIT 1`,
    [normalized]
  );
  const row = rows[0];

  const passwordOk = await bcrypt.compare(password, row ? row.password_hash : DUMMY_HASH);
  if (!row || !passwordOk) {
    throw new AppError(INVALID_CREDENTIALS, 401);
  }

  // Checked only after the password is correct, so this doesn't reveal which accounts exist.
  if (!row.is_active) {
    throw new AppError('Your account is inactive. Contact an administrator.', 403);
  }

  await pool.query('UPDATE users SET last_login_at = UTC_TIMESTAMP() WHERE id = ?', [row.id]);

  const user = toPublicUser(row);
  return { token: signToken(user), user };
}

export async function getUserById(id) {
  const [rows] = await pool.query(
    `SELECT ${USER_COLUMNS}
       FROM users u
       JOIN roles r ON r.id = u.role_id
      WHERE u.id = ?
      LIMIT 1`,
    [id]
  );
  const row = rows[0];

  // A deleted or deactivated user must not keep using an old token.
  if (!row || !row.is_active) {
    throw new AppError('Your session is not valid. Sign in again.', 401);
  }

  return toPublicUser(row);
}
