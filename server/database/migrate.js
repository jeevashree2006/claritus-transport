/**
 * Database migration runner.
 *
 *   npm run db:migrate
 *
 * 1. Creates the database (DB_NAME) if it doesn't exist and the user is allowed to.
 * 2. Runs every database/migrations/*.sql file in name order (001_, 002_, ...).
 * 3. Records each applied file in `schema_migrations`, so a file never runs twice and
 *    both developers end up with identical tables on the shared server.
 *
 * Rule: never edit a migration that has already been applied - add a new file.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import { env } from '../src/config/env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, 'migrations');
const LOCK_NAME = 'claritas_transport_migrations';

async function ensureDatabase() {
  const connection = await mysql.createConnection({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
  });
  try {
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS ${mysql.escapeId(env.db.name)}
         CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    console.log(`[migrate] Database "${env.db.name}" is ready.`);
  } catch (error) {
    // On a shared server a developer's user may not be allowed to create databases.
    // That's fine as long as the database already exists - the next step will tell.
    if (error.code === 'ER_DBACCESS_DENIED_ERROR' || error.code === 'ER_SPECIFIC_ACCESS_DENIED_ERROR') {
      console.warn(`[migrate] No permission to create "${env.db.name}"; assuming it already exists.`);
    } else {
      throw error;
    }
  } finally {
    await connection.end();
  }
}

async function run() {
  await ensureDatabase();

  const connection = await mysql.createConnection({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    database: env.db.name,
    multipleStatements: true, // a migration file may contain several statements
  });

  try {
    // Stop two developers from running migrations at the same moment.
    const [[lock]] = await connection.query('SELECT GET_LOCK(?, 30) AS acquired', [LOCK_NAME]);
    if (lock.acquired !== 1) {
      throw new Error('Another migration is running. Try again in a minute.');
    }

    await connection.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename    VARCHAR(255) NOT NULL,
        applied_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (filename)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    const [appliedRows] = await connection.query('SELECT filename FROM schema_migrations');
    const applied = new Set(appliedRows.map((row) => row.filename));

    const files = (await fs.readdir(MIGRATIONS_DIR))
      .filter((file) => file.toLowerCase().endsWith('.sql'))
      .sort((a, b) => a.localeCompare(b, 'en'));

    const pending = files.filter((file) => !applied.has(file));
    if (pending.length === 0) {
      console.log('[migrate] Nothing to do - all migrations are already applied.');
      return;
    }

    for (const file of pending) {
      const sql = await fs.readFile(path.join(MIGRATIONS_DIR, file), 'utf8');
      console.log(`[migrate] Applying ${file} ...`);
      // Note: MySQL commits DDL (CREATE/ALTER) immediately, so a failed file may be
      // partly applied. Fix it with a NEW migration rather than editing this one.
      await connection.query(sql);
      await connection.query('INSERT INTO schema_migrations (filename) VALUES (?)', [file]);
      console.log(`[migrate] Applied  ${file}`);
    }

    console.log(`[migrate] Done. ${pending.length} migration(s) applied.`);
  } finally {
    await connection.query('SELECT RELEASE_LOCK(?)', [LOCK_NAME]).catch(() => {});
    await connection.end();
  }
}

run().catch((error) => {
  console.error(`\n[migrate] Failed: ${error.code ? `${error.code} ` : ''}${error.message}\n`);
  process.exit(1);
});
