
import mysql from 'mysql2/promise';
import { env } from './env';

export const pool = mysql.createPool({
  host: env.dbHost,
  port: env.dbPort,
  user: env.dbUser,
  password: env.dbPassword,
  database: env.dbName,

  waitForConnections: true,
  connectionLimit: 15,
  queueLimit: 0,
  dateStrings: true,

  ...(env.dbSsl
    ? {
      ssl: {
        rejectUnauthorized: true,
        ...(env.dbSslCa ? { ca: env.dbSslCa } : {})
      }
    }
    : {})
});

export async function testConnection(): Promise<void> {
  let connection: mysql.PoolConnection | undefined;

  try {
    connection = await pool.getConnection();

    console.log(
      'Connected to MySQL database:',
      env.dbName
    );
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code || 'connection_error';
    console.error('Failed to connect to MySQL database:', code);
    throw error;
  } finally {
    connection?.release();
  }
}
