const fs = require('fs');
const mysql = require('mysql2/promise');

async function main() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'password' in process.env ? process.env.DB_PASSWORD : 'root',
    multipleStatements: true
  }).catch(() => {
    return mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'Adity@2787',
      multipleStatements: true
    });
  });

  console.log('Connected to MySQL. Re-initializing parko_db schema, seed and views...');
  await connection.query('SET FOREIGN_KEY_CHECKS = 0;');
  
  const schema = fs.readFileSync('../database/01_schema.sql', 'utf8');
  await connection.query(schema);
  console.log('✅ Schema created.');

  const seed = fs.readFileSync('../database/02_seed.sql', 'utf8');
  await connection.query(seed);
  console.log('✅ Seed data inserted.');

  const views = fs.readFileSync('../database/04_views.sql', 'utf8');
  await connection.query(views);
  console.log('✅ Views created.');

  await connection.query('SET FOREIGN_KEY_CHECKS = 1;');
  console.log('🎉 Database fully initialized!');
  await connection.end();
}

main().catch(err => {
  console.error('Error applying seed:', err.message, err.code);
  process.exit(1);
});
