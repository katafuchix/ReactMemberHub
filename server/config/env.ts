import { config } from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
// server/config/env.ts -> repo root
config({ path: resolve(here, '../../.env') });
// fallback: カレントに .env があれば読む
config();

export const env = {
  PORT: Number(process.env.PORT ?? 8000),
  MONGODB_URI:
    process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/react-member-hub',
  JWT_SECRET: process.env.JWT_SECRET ?? 'dev-secret-change-me',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? '7d',
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  NODE_ENV: process.env.NODE_ENV ?? 'development',
};
