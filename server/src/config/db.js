/**
 * MySQL connection pool (mysql2/promise).
 * Import `pool` anywhere and always use `?` placeholders:
 *   const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
 */
import mysql from 'mysql2/promise';
import { env } from './env.js';

export const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.name,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: 'Z', // store and read DATETIME values as UTC
  dateStrings: false,
});

// Make the database session use UTC too, so CURRENT_TIMESTAMP defaults match `timezone: 'Z'`
// above. Without this, a MySQL server set to local time (e.g. IST) shows every
// database-filled time shifted by the UTC offset. TIMESTAMP columns convert automatically,
// so rows saved before this change also read back correctly.
pool.pool.on('connection', (connection) => {
  connection.query("SET time_zone = '+00:00'");
});

/** Runs a trivial query to prove the database is reachable. Throws if not. */
export async function testConnection() {
  const connection = await pool.getConnection();
  try {
    await connection.query('SELECT 1');
  } finally {
    connection.release();
  }
}
