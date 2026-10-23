import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const port = Number(process.env.DB_PORT);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('DB_PORT must be an integer between 1 and 65535');
}

const jwtSecret = required('JWT_SECRET');
if (Buffer.byteLength(jwtSecret, 'utf8') < 32) {
  throw new Error('JWT_SECRET must contain at least 32 bytes');
}

const adminUserIdValue = (process.env.ADMIN_USER_ID ?? process.env.DEMO_ADMIN_USER_ID)?.trim();
const adminUserId = adminUserIdValue ? Number(adminUserIdValue) : null;
if (adminUserIdValue && (!Number.isSafeInteger(adminUserId) || adminUserId! < 1)) {
  throw new Error('ADMIN_USER_ID must be a positive integer when configured');
}

const dbSsl = process.env.DB_SSL === 'true';
if (process.env.NODE_ENV === 'production' && !dbSsl) {
  throw new Error('DB_SSL=true is required in production');
}

export const env = {
  dbHost: required('DB_HOST'),
  dbPort: port,
  dbUser: required('DB_USER'),
  dbPassword: required('DB_PASSWORD'),
  dbName: required('DB_NAME'),
  dbSsl,
  dbSslCa: process.env.DB_SSL_CA,
  jwtSecret,
  adminUserId,
  clientUrl: process.env.CLIENT_URL,
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT) || 5000,
};

export function isAdminUserId(userId: number): boolean {
  return env.adminUserId !== null && userId === env.adminUserId;
}