
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const useSSL = process.env.DB_SSL === 'true';
const ca = process.env.DB_SSL_CA;

export const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'parko_db',

  waitForConnections: true,
  connectionLimit: 15,
  queueLimit: 0,
  dateStrings: true,

  ...(useSSL
    ? {
      ssl: {
        rejectUnauthorized: true,
        ...(ca ? { ca } : {})
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
      process.env.DB_NAME || 'parko_db'
    );
  } catch (error) {
    console.error('Failed to connect to MySQL database:', error);
    throw error;
  } finally {
    connection?.release();
  }
}
