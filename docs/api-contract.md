# PARKO REST API CONTRACT

All responses return standard JSON format:
- Success: `{ "success": true, "data": ... }`
- Error: `{ "success": false, "error": "Error message" }`

## 1. Authentication
- `POST /api/auth/otp/request`: Request 6-digit demo OTP for a phone number. Returns demo OTP for simulation on screen.
- `POST /api/auth/otp/verify`: Verify OTP. Signs in or registers user; records phone_otp verification in `USER_VERIFICATION`.
- `POST /api/auth/register`: Register with email, phone, name, password.
- `POST /api/auth/login`: Login with email and password.
- `POST /api/auth/logout`: Clears authentication cookie/session.
- `GET /api/auth/me`: Get current authenticated user details and verifications.

## 2. Public Parking Listings (Privacy-Preserved)
- `GET /api/spaces/search`: Search active/approved listings in city.
  - Query params: `cityId`, `vehicleCategory`, `maxPrice`, `startTime`, `endTime`, `approvalMode`
  - Output fields: `space_id`, `title`, `description`, `vehicle_category`, `hourly_rate`, `access_method`, `approval_mode`, `approximate_latitude`, `approximate_longitude`, `city_name`, `currency`, `average_rating`, `total_reviews`.
  - **CRITICAL**: Never returns `exact_address`, `precise_latitude`, `precise_longitude`, `private_notes`.
- `GET /api/spaces/:id`: Public listing detail.
- `GET /api/spaces/:id/availability`: List available windows for a space.

## 3. Protected Route Disclosure (Pre-Booking)
- `GET /api/spaces/:id/route-preview`: Requires authentication and active booking intent.
  - Returns destination coordinate and approximate waypoints. Does NOT return text address or gate access codes.

## 4. Bookings & Checkout Workflow
- `POST /api/bookings`: Create booking hold.
  - Body: `{ spaceId, availabilityId, startTime, endTime }`
  - Validates slot availability, prevents overlaps.
  - For `instant`: sets status to `pending_payment` with 3-minute timer.
  - For `owner_approved`: sets status to `pending_approval` with 5/10/30-minute timer.
- `GET /api/bookings/my`: List bookings for current driver.
- `GET /api/bookings/:id`: Booking details.
- `POST /api/bookings/:id/pay`: Complete demo payment.
  - Body: `{ paymentMethod }`
  - Validates active hold, executes database transaction: inserts `PAYMENT_ATTEMPT` (successful), updates `BOOKING` status to `confirmed`, creates/links `BOOKING_ACCESS_DETAIL`.
- `POST /api/bookings/:id/cancel`: Cancel booking by driver (respects 2-hour / 2-minute rule).
- `GET /api/bookings/:id/access`: Retrieve `BOOKING_ACCESS_DETAIL`. Available ONLY to confirmed driver after payment between `release_at` and `expiry_at`.

## 5. Owner Operations
- `GET /api/owner/spaces`: List owner's spaces.
- `POST /api/owner/spaces`: Create new space (wizard submission). Inserts `PARKING_SPACE`, `PRIVATE_SPACE_LOCATION`, and `LISTING_VERIFICATION` (pending).
- `PUT /api/owner/spaces/:id`: Update space details.
- `POST /api/owner/spaces/:id/availability`: Add single window or expanded recurring windows into `AVAILABILITY_WINDOW`.
- `GET /api/owner/bookings`: View incoming booking requests.
- `POST /api/owner/bookings/:id/decide`: Approve or decline pending booking request.
- `POST /api/owner/bookings/:id/request-cancellation`: Owner requests cancellation with mandatory reason (creates DISPUTE record).

## 6. Reviews & Mutual Feedback
- `POST /api/reviews`: Submit review for completed booking. Validates caller is driver or host, rating 1-5.
- `GET /api/spaces/:id/reviews`: View reviews for a parking space.

## 7. Disputes
- `POST /api/disputes`: Submit dispute for a booking.
- `GET /api/disputes/my`: View user's filed disputes.

## 8. Admin Interface (Protected by `requireAdmin` and seeded user ID)
- `GET /api/admin/metrics`: Platform counts and key operational statistics.
- `GET /api/admin/verifications/listings`: Pending listings to review.
- `POST /api/admin/verifications/listings/:id/decide`: Approve / reject / request changes.
- `GET /api/admin/verifications/users`: User verification requests.
- `POST /api/admin/verifications/users/:id/decide`: Approve / reject user verification.
- `GET /api/admin/disputes`: Open disputes and owner-cancellation requests.
- `POST /api/admin/disputes/:id/resolve`: Resolve dispute / approve cancellation and release slot.
- `POST /api/admin/users/:id/status`: Suspend or activate user.
- `POST /api/admin/spaces/:id/status`: Suspend or restore parking space listing.
