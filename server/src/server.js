/**
 * Entry point: checks the database connection, then starts listening.
 */
import app from './app.js';
import { env } from './config/env.js';
import { pool, testConnection } from './config/db.js';

async function start() {
  try {
    await testConnection();
    console.log(`[db] Connected to MySQL at ${env.db.host}:${env.db.port}/${env.db.name}`);
  } catch (error) {
    console.error(
      `\n[db] Could not connect to MySQL at ${env.db.host}:${env.db.port}/${env.db.name}\n` +
        `     ${error.code || ''} ${error.message}\n` +
        '     Check DB_HOST, DB_PORT, DB_USER, DB_PASSWORD and DB_NAME in server/.env,\n' +
        '     and run "npm run db:setup" if the database has not been created yet.\n'
    );
    process.exit(1);
  }

  const server = app.listen(env.port, () => {
    console.log(`[api] Claritas Transport API listening on http://localhost:${env.port}`);
  });

  // Close cleanly on Ctrl+C / container stop.
  const shutdown = () => {
    server.close(async () => {
      await pool.end().catch(() => {});
      process.exit(0);
    });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start();
