/**
 * Loads server/.env and exposes a typed, validated config object.
 * The process stops with a clear message if a required variable is missing,
 * so a half-configured server never starts.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Always read server/.env, no matter which folder the command was started from.
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const REQUIRED = ['DB_HOST', 'DB_USER', 'DB_NAME', 'JWT_SECRET'];
const missing = REQUIRED.filter((key) => !process.env[key] || !process.env[key].trim());

if (missing.length > 0) {
  console.error(
    `\n[config] Missing required environment variable(s): ${missing.join(', ')}\n` +
      '         Copy server/.env.example to server/.env and fill in the values.\n'
  );
  process.exit(1);
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',

  db: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || '',
    name: process.env.DB_NAME,
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  },

  seed: {
    adminPassword: process.env.SEED_ADMIN_PASSWORD || 'Admin@123',
    mdPassword: process.env.SEED_MD_PASSWORD || 'Md@12345',
  },
};

export const isProduction = env.nodeEnv === 'production';
