const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..', '..');
const readSql = (name) => fs.readFileSync(path.join(root, 'database', name), 'utf8');

test('schema is lowercase, fresh-database-only DDL without destructive statements', () => {
  const schema = readSql('01_schema.sql');
  const tables = [...schema.matchAll(/^CREATE TABLE `?([a-z_]+)`?/gim)].map((match) => match[1]);

  assert.equal(tables.length, 12);
  assert.equal(new Set(tables).size, 12);
  assert.doesNotMatch(schema, /^\s*(DROP|DELETE|TRUNCATE|ALTER|USE|CREATE DATABASE)\b/im);
});

test('schema supports UI and API values', () => {
  const schema = readSql('01_schema.sql');
  const values = [
    'compact_car', 'suv', 'two_wheeler', 'ev_car', 'all',
    'open_driveway', 'barrier_gate', 'automated_code', 'host_meet', 'key_pass',
    'instant', 'manual_5min', 'manual_10min', 'manual_30min',
    'pending_verification', 'approved', 'rejected', 'suspended',
    'owner_approved', 'pending_approval', 'pending_payment', 'cancellation_requested', 'expired',
    'upi', 'card', 'net_banking', 'phone_otp', 'email_confirmation',
    'space_occupied', 'access_denied', 'cleanliness', 'early_late_overstay', 'owner_cancellation'
  ];

  for (const value of values) assert.ok(schema.includes(value), `schema is missing ${value}`);
});

test('seed has no fake credentials or production administrator and uses valid demo values', () => {
  const seed = readSql('02_seed.sql');

  assert.doesNotMatch(seed, /DEMO_HASH_NOT_A_REAL_PASSWORD|Admin Demo|admin\.demo/i);
  assert.doesNotMatch(seed, /'scheduled'|'immediate'|'demo_card'|'demo_wallet'|'cash_demo'|'active'.*'provider'/);
  assert.match(seed, /'manual_30min'/);
  assert.match(seed, /'pending_approval'/);
  assert.match(seed, /'phone_otp'/);
});

test('seed inserts all twelve schema tables in lowercase', () => {
  const seed = readSql('02_seed.sql');
  const insertedTables = [...seed.matchAll(/^INSERT INTO `?([a-z_]+)`?/gim)].map((match) => match[1]);
  const expected = [
    'user', 'city', 'user_verification', 'parking_space', 'private_space_location',
    'availability_window', 'listing_verification', 'booking', 'payment_attempt',
    'booking_access_detail', 'review', 'dispute'
  ];

  assert.deepEqual(new Set(insertedTables), new Set(expected));
});

test('query, view, and diagnostic files do not switch databases or mutate rows', () => {
  for (const name of ['03_queries.sql', '04_views.sql', '05_tests.sql']) {
    const sql = readSql(name);
    assert.doesNotMatch(sql, /^\s*(DROP|DELETE|TRUNCATE|ALTER|INSERT|UPDATE|USE|CREATE DATABASE)\b/im, name);
  }
});

test('legacy booking migration only adds nullable lifecycle fields and an index', () => {
  const migration = readSql('06_add_booking_lifecycle_columns.sql');

  assert.match(migration, /ALTER TABLE booking/);
  assert.match(migration, /ADD COLUMN hold_expires_at DATETIME NULL/);
  assert.match(migration, /ADD COLUMN confirmed_at DATETIME NULL/);
  assert.match(migration, /ADD KEY ix_booking_expiry/);
  assert.doesNotMatch(migration, /^\s*(DROP|DELETE|TRUNCATE|UPDATE|INSERT|USE)\b/im);
});

test('active listing view and payment summary reflect application semantics', () => {
  const views = readSql('04_views.sql');

  assert.match(views, /listing_status = 'approved'/);
  assert.match(views, /ORDER BY latest\.payment_id DESC/);
  assert.doesNotMatch(views, /MAX\(p\.payment_status\)/);
});