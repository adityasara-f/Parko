# Parko API Contract

Requests and responses use JSON except for the `parko_token` HttpOnly session cookie. The browser must send credentials. The JWT is never returned in a response body.

## Health

- `GET /api/health`: process health response. It does not prove database connectivity.

## Authentication

- `POST /api/auth/otp/request`: development-only simulated OTP; returns the demo code and stores it in process memory. Disabled in production. No SMS is sent.
- `POST /api/auth/otp/verify`: development-only verification and phone registration; sets the session cookie. Disabled in production.
- `POST /api/auth/register`: create an email/password account; sets the session cookie. Email confirmation is recorded as pending; no email provider is configured.
- `POST /api/auth/login`: verify bcrypt password and set the session cookie.
- `POST /api/auth/logout`: clear the session cookie.
- `GET /api/auth/me`: return authenticated user and verification records.
- `PUT /api/auth/me`: update authenticated user's name and phone.

## Spaces

- `GET /api/spaces/search`: search approved spaces. Supports `cityId`, `vehicleCategory`, `maxPrice`, `approvalMode`, and `minRating`. Public results omit private location fields.
- `GET /api/spaces/:id`: public approved space detail.
- `GET /api/spaces/:id/availability`: current/future windows and blocking bookings.
- `GET /api/spaces/:id/route-preview`: returns precise map coordinates to any authenticated user. It does not require booking intent; this remains a privacy limitation.

## Bookings

- `POST /api/bookings`: authenticated driver creates an instant or owner-approved hold after availability and overlap checks.
- `GET /api/bookings/my`: authenticated driver's bookings.
- `GET /api/bookings/:id`: booking detail for driver, host, or admin.
- `POST /api/bookings/:id/pay`: local simulated payment and booking confirmation. Disabled in production; no payment provider is integrated.
- `POST /api/bookings/:id/cancel`: driver cancellation and simulated refund state.
- `GET /api/bookings/:id/access`: paid booking access details during the stored release/expiry interval, for the driver or admin.

## Owner

- `GET /api/owner/dashboard`, `/spaces`, `/bookings`: authenticated owner views.
- `POST /api/owner/spaces`: create a listing, private location, pending verification, and availability.
- `POST /api/owner/spaces/:id/availability`: add availability windows.
- `POST /api/owner/bookings/:id/decide`: approve or decline a pending owner approval.
- `POST /api/owner/bookings/:id/request-cancellation`: submit an admin-reviewed cancellation request.

## Reviews and disputes

- `POST /api/reviews`: participant review for a completed booking.
- `GET /api/reviews/space/:spaceId`: public reviews for the space.
- `POST /api/disputes`: participant dispute. Supported issue values: `space_occupied`, `access_denied`, `cleanliness`, `early_late_overstay`, `owner_cancellation`, `other`.
- `GET /api/disputes/my`: authenticated user's reported disputes.

## Admin

All admin endpoints require an authenticated user whose ID equals the server-only `ADMIN_USER_ID`. There is no role column or default administrator. The ID must be provisioned through a trusted process.

- `GET /api/admin/metrics`, `/listings`, `/users`, `/disputes`.
- `POST /api/admin/listings/:id/decide`, `/listings/:id/status`.
- `POST /api/admin/users/:id/verify`, `/users/:id/status`.
- `POST /api/admin/disputes/:id/resolve`.