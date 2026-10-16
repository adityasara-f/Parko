# Parko Architectural & Schema Decisions

## 1. Frozen Schema Adherence (12 Entities, 83 Attributes)
The database contract strictly enforces Review 1's 12 entities and 83 attributes:
- `USER` (7 attributes): `user_id`, `name`, `email`, `phone`, `password_hash`, `account_status`, `created_at`
- `CITY` (6 attributes): `city_id`, `city_name`, `region`, `country`, `timezone`, `currency`
- `PARKING_SPACE` (13 attributes): `space_id`, `host_user_id`, `city_id`, `title`, `description`, `vehicle_category`, `hourly_rate`, `daily_rate`, `access_method`, `approval_mode`, `listing_status`, `approximate_latitude`, `approximate_longitude`
- `PRIVATE_SPACE_LOCATION` (5 attributes): `space_id`, `exact_address`, `precise_latitude`, `precise_longitude`, `private_notes`
- `AVAILABILITY_WINDOW` (5 attributes): `availability_id`, `space_id`, `start_time`, `end_time`, `availability_status`
- `BOOKING` (11 attributes): `booking_id`, `space_id`, `driver_user_id`, `availability_id`, `start_time`, `end_time`, `booking_type`, `booking_status`, `amount`, `currency`, `cancellation_reason`
- `PAYMENT_ATTEMPT` (7 attributes): `payment_id`, `booking_id`, `amount`, `currency`, `payment_method`, `payment_status`, `payment_reference`
- `USER_VERIFICATION` (5 attributes): `verification_id`, `user_id`, `verification_type`, `verification_status`, `verified_at`
- `LISTING_VERIFICATION` (5 attributes): `listing_verification_id`, `space_id`, `reviewer_user_id`, `verification_status`, `decision_at`
- `BOOKING_ACCESS_DETAIL` (5 attributes): `access_id`, `booking_id`, `access_instructions`, `release_at`, `expiry_at`
- `REVIEW` (6 attributes): `review_id`, `booking_id`, `reviewer_user_id`, `reviewed_user_id`, `rating`, `comment`
- `DISPUTE` (8 attributes): `dispute_id`, `booking_id`, `reporter_user_id`, `administrator_user_id`, `issue_type`, `description`, `dispute_status`, `resolution`

Total = 7+6+13+5+5+11+7+5+5+5+6+8 = 83 attributes. No extra columns or tables added.

## 2. In-Memory Runtime Timers & State Limitations
- **OTPs**: Generated per login request in memory (Node.js cache with 5-minute expiry). Single-use. On verification, `USER_VERIFICATION` records `phone` verification.
- **Checkout Window (3 minutes)** and **Approval Window (5/10/30 minutes)**: Tracked via memory timers. On server restart, any orphaned `pending_payment` or `pending_approval` bookings that have elapsed are automatically marked `expired` during startup cleanup, preventing permanent availability blocking.
- **Pricing**: `hourly_rate` is authoritative. Total amount is calculated on the backend as `CEIL(duration_hours) * hourly_rate` (rounded to 2 decimal places).

## 3. Privacy & Security Model
- **Public Endpoints**: Only expose `PARKING_SPACE` with `approximate_latitude` and `approximate_longitude`. Never join or return `PRIVATE_SPACE_LOCATION` (`exact_address`, `precise_latitude`, `precise_longitude`, `private_notes`).
- **Route Preview**: After driver authentication and explicit listing selection, the driver can request a destination route preview (visual line / destination coordinate on map without text address).
- **Post-Confirmation Access**: Only when booking is `confirmed` and `PAYMENT_ATTEMPT` is `successful`, the authenticated driver can retrieve `BOOKING_ACCESS_DETAIL` if current time is between `release_at` and `expiry_at`.
- **Role Enforcement**: Administrator identity is derived server-side via `DEMO_ADMIN_USER_ID` environment variable (tied to seeded Admin User ID 1). No `role` column exists in `USER`.
