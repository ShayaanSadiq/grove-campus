import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '../../.env') });

export function jwtSecret() {
  return process.env.JWT_SECRET || 'grove-dev-secret-change-me';
}

export function port() {
  return Number(process.env.PORT) || 4000;
}

export function clientOrigin() {
  return process.env.CLIENT_ORIGIN || 'http://localhost:5173';
}
