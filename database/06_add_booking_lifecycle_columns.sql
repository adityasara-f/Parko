-- Optional one-time upgrade for an existing pre-integration Parko schema.
-- Select the intended database when connecting. Do not run against a fresh
-- schema or until information_schema confirms these columns/index are absent.
-- Back up the database first. This migration is additive and never drops data.

ALTER TABLE booking
  ADD COLUMN hold_expires_at DATETIME NULL,
  ADD COLUMN confirmed_at DATETIME NULL,
  ADD KEY ix_booking_expiry (booking_status, hold_expires_at);