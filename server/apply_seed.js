const path = require('path');
const dotenv = require('dotenv');
const mysql = require('mysql2/promise');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'server/.env') });

const scripts = {
  schema: '01_schema.sql',
  seed: '02_seed.sql',
  views: '04_views.sql',
  diagnostics: '05_tests.sql'
};

async function main() {
  const mode = process.argv[2];
  if (!Object.hasOwn(scripts, mode)) {
    throw new Error('Choose exactly one mode: schema, seed, views, or diagnostics');
  }

  for (const name of ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME']) {
    if (!process.env[name]) throw new Error(`Missing required environment variable: ${name}`);
  }

  if (mode === 'schema' && process.env.NODE_ENV === 'production' && process.env.ALLOW_FRESH_SCHEMA !== 'true') {
    throw new Error('Fresh schema creation in production requires ALLOW_FRESH_SCHEMA=true');
  }

  const useSsl = process.env.DB_SSL === 'true';
  if (process.env.NODE_ENV === 'production' && !useSsl) {
    throw new Error('DB_SSL=true is required in production');
  }

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true,
    ...(useSsl ? {
      ssl: {
        rejectUnauthorized: true,
        ...(process.env.DB_SSL_CA ? { ca: process.env.DB_SSL_CA } : {})
      }
    } : {})
  });

  try {
    if (mode === 'schema') {
      const [tables] = await connection.query(
        'SELECT COUNT(*) AS table_count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_type = \'BASE TABLE\''
      );
      if (Number(tables[0].table_count) !== 0) {
        throw new Error('Refusing schema initialization: selected database already contains base tables');
      }
    }

    if (mode === 'seed') {
      const tables = [
        'user', 'city', 'user_verification', 'parking_space',
        'private_space_location', 'availability_window', 'listing_verification',
        'booking', 'payment_attempt', 'booking_access_detail', 'review', 'dispute'
      ];
      for (const table of tables) {
        const [rows] = await connection.query(`SELECT COUNT(*) AS row_count FROM \`${table}\``);
        if (Number(rows[0].row_count) !== 0) {
          throw new Error(`Refusing seed: ${table} table is not empty`);
        }
      }
    }

    const sqlPath = path.resolve(process.cwd(), 'database', scripts[mode]);
    const fs = require('fs');
    await connection.query(fs.readFileSync(sqlPath, 'utf8'));
    console.log(`Completed database mode: ${mode}`);
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(`Database utility failed (${error.code || 'configuration'}).`);
  process.exitCode = 1;
});