# Parko Architecture Decisions

## Database contract

The application schema is defined in `database/01_schema.sql` and uses lowercase table names for Linux/MySQL portability. It retains the 12 original marketplace tables and adds three booking timestamps: `hold_expires_at`, `confirmed_at`, and `created_at`. Booking expiry and the cancellation grace period must not depend on a specific Express process remaining alive.

The SQL scripts do not create or select a database. The operator creates an empty database, configures `DB_NAME`, and explicitly runs the schema once. The initializer refuses a selected database that already contains base tables. It never drops or migrates existing data. The fictional seed is optional, one-time, and contains no admin account or usable password hashes.

## Runtime behavior

- Booking holds use persisted `hold_expires_at`; the API expires holds whose deadline has passed. In-process timers are best-effort and not the source of truth.
- Confirmation time is persisted as `confirmed_at` for the short cancellation grace period.
- Demo OTP remains an in-memory, local-development simulation and is disabled in production. It is not SMS authentication.
- Payment remains simulated and is disabled in production. A real payment provider is required before production checkout can be enabled.

## Security boundaries

- Public listing responses expose approximate coordinates only.
- Access details require a successful payment record and an active `release_at`/`expiry_at` window.
- Route preview currently returns precise coordinates to any authenticated user and does not verify booking intent. Restrict this before treating precise location as private.
- Admin authorization compares the authenticated user ID with the server-only `ADMIN_USER_ID`. No default ID or database role is supplied; configure a trusted account through an independently reviewed provisioning process.
- JWT signing and MySQL credentials are required server-side environment variables. Production MySQL requires TLS.

## Deployment

The Vite frontend and Express API use Vercel Services in one project. Top-level rewrites route `/api` to the API service and other paths to the client. Vercel Services are Beta; confirm availability and route behavior in Preview before production promotion.