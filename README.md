# Parko

Parko is a React/Vite parking marketplace frontend with an Express/MySQL API. The application supports public space search, maps, authentication, owner listings, bookings, reviews, disputes, and administration.

## Requirements

- Node.js 20.19+ or 22.12+
- npm
- MySQL 8.0.16+ (InnoDB and enforced `CHECK` constraints)

## Local setup

Install each app from the repository root:

```powershell
npm ci --prefix server
npm ci --prefix client
Copy-Item .env.example server/.env
```

Edit `server/.env` with local values. Keep it private; `.env` files are ignored by Git. `DB_NAME` should refer to a new, empty database for the setup below. `JWT_SECRET` must be a random value of at least 32 bytes. `ADMIN_USER_ID` is optional for ordinary user flows; set it to the ID of a trusted admin account to enable admin-only workflows. Never use a seeded/demo user as a production administrator.

Create a fresh local database explicitly (this command does not use or alter an existing schema):

```powershell
mysql -u root -p -e "CREATE DATABASE parko_db CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci"
```

Set `DB_NAME=parko_db` in `server/.env`, then initialize only that empty database:

```powershell
npm run db:init
```

The initializer refuses to create tables if the selected database already contains base tables. It never drops tables. The SQL scripts do not issue `CREATE DATABASE` or `USE`; the connection selects the target database. `01_schema.sql` is for a newly created empty database only.

For a production schema initialization, set `ALLOW_FRESH_SCHEMA=true` only for the one-time run against the new empty database, then remove it. Do not set it for normal application runtime.

Optional fictional development fixtures can be loaded separately, once, into an empty schema:

```powershell
npm run db:seed
npm run db:views
npm run db:diagnostics
```

The seed creates no administrator or password-enabled account. Fixture users have empty password hashes, so password login is intentionally unavailable for those accounts. Local demo OTP can create a development user. Diagnostics are read-only SELECTs and do not automatically assert that results are empty.

For an existing database created from the earlier Parko schema, do not run `01_schema.sql`. First inspect its schema and take a verified backup. `database/06_add_booking_lifecycle_columns.sql` is an optional one-time additive migration for the two durable booking timestamps and their expiry index. It is not run by startup or any package script; apply it only after confirming the target is the prior application schema and the columns/index are absent. The teammate schema has additional incompatibilities and is not repaired by this migration.

Start the API and frontend in separate terminals from the repository root:

```powershell
npm run server
```

```powershell
npm run client
```

The API listens at `http://localhost:5000`; Vite serves `http://localhost:5173` and proxies relative `/api` requests to the API.

## Build and tests

```powershell
npm run build
npm test
```

These commands compile both apps and run database-free SQL contract tests. They do not connect to MySQL. The API workflow test mutates data and is intentionally separate:

```powershell
$env:RUN_MUTATING_API_TESTS = "true"
$env:NODE_ENV = "development"
$env:API_TEST_BASE_URL = "http://localhost:5000"
$env:ADMIN_USER_ID = "7"
$env:API_TEST_ADMIN_PHONE = "<phone-for-seed-user-7>"
$env:API_TEST_HOST_PHONE = "<phone-for-seed-user-2>"
npm run test:api
```

Run it only against a disposable, isolated database initialized with the optional seed and an API using those same test-only variables. It creates and updates bookings, payments, disputes, and listings. Do not point it at production or a personal database. The test OTP flow is simulated and local-only.

## Demo-only behavior

- Phone OTP is simulated, in-memory, returns the code to the local UI, sends no SMS, and is disabled when `NODE_ENV=production`.
- Payment is simulated, has no payment provider, and is disabled when `NODE_ENV=production`.
- Do not describe either as production authentication or payment processing. Integrate a real OTP provider and payment gateway before enabling those production workflows.
- Booking hold deadlines and confirmation timestamps are persisted in MySQL. The API checks for expired holds before serving API requests; in-memory timers only provide best-effort prompt updates.
- Precise location and access details require a successful payment record and an active release/expiry window.

## Environment variables

All application variables are server-side. Do not prefix database credentials or `JWT_SECRET` with `VITE_`.

Required: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRET`. Production also requires `DB_SSL=true`. `DB_SSL_CA` may contain the database provider's CA certificate when required. `ADMIN_USER_ID` is optional, but must identify a trusted provisioned admin account to enable admin routes and listing review. `CLIENT_URL` is optional for local cross-origin development; same-origin production requests do not need CORS. `NODE_ENV` and `PORT` have application defaults, but production must set `NODE_ENV=production`.

For compatibility with an existing local `.env`, `DEMO_ADMIN_USER_ID` is temporarily accepted as a deprecated alias for `ADMIN_USER_ID`; new setups should use only `ADMIN_USER_ID`.

The example file contains placeholders only. Configure production variables in Vercel project settings, scoped to the server service and appropriate environments. Do not commit `.env`, certificates, database dumps, cookies, or credentials.

## Fresh database and safety

The five SQL files are ordered by purpose, not an automatic migration chain:

1. `database/01_schema.sql`: create the 12 lowercase InnoDB tables in an already-created empty database.
2. `database/02_seed.sql`: optional fictional development data only; explicit IDs mean it is a one-time import.
3. `database/03_queries.sql`: read-only query examples.
4. `database/04_views.sql`: reporting views; safe to reapply with `CREATE OR REPLACE VIEW`.
5. `database/05_tests.sql`: read-only diagnostic queries; inspect their result sets manually.

Never run the fresh-schema setup against a database containing data. It intentionally refuses non-empty databases, but take a verified backup before any database operation. This project does not currently include a data migration from the older `parko_db` schema or the untracked SQL dumps.

## Vercel: one public domain

The root `vercel.json` defines two Vercel Services (currently Beta): the Vite client and Express server. Both are in one Vercel project. Top-level rewrites send `/api` and `/api/*` to the server service and all other paths to the client service. Service routing preserves the original `/api/...` path expected by Express. The client service has an SPA fallback to `index.html` for routes such as `/login` and `/owner`.

1. Import the existing GitHub repository as a new Vercel project, using the repository root as the project root so the root `vercel.json` is applied.
2. Confirm the project supports/enables Vercel Services and that service roots resolve to `client/` and `server/`.
3. Configure the production/preview server variables in Vercel. For remote MySQL, use a reachable managed MySQL instance, set `DB_SSL=true`, and provide its CA if required. Use separate preview credentials/database; do not point previews at production data.
4. Deploy a Preview and verify build logs, `/`, deep links (`/login`, `/owner`), `/api/health`, authentication cookie behavior, and database-backed flows. Demo OTP and simulated payments intentionally return 503 in production.
5. Add `parko.adityasaraf.com` to the Vercel project and apply the DNS records Vercel displays. The browser and API remain under this same hostname.
6. Promote only after Preview checks and database checks pass. No hosted deployment or DNS changes are performed by this repository.

Vercel Services are Beta. Confirm current availability and behavior in the target Vercel project before committing to this layout. No hosted deployment has been verified by these instructions.

## Rollback

Before production schema work, take and verify a restorable database backup. Prefer forward-only additive DB changes; do not couple a code rollback to destructive schema rollback. Vercel can roll back/promote a prior deployment from the project's deployment controls. If a deployment fails, restore the previous deployment and keep the database intact; investigate the schema separately before retrying.