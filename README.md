# Parko — Smart Shared Parking Marketplace Prototype
## Course Implementation & Demonstration Guide

Parko is a database-backed parking marketplace web application connecting drivers with available private parking spaces and driveways.

---

## 1. Frozen Schema Adherence (Exactly 12 Entities, 83 Attributes)

Verified against MySQL `information_schema.columns` (see `database/05_tests.sql`):
1. **`USER`** (7 attributes): `user_id`, `name`, `email`, `phone`, `password_hash`, `account_status`, `created_at`
2. **`CITY`** (6 attributes): `city_id`, `city_name`, `region`, `country`, `timezone`, `currency`
3. **`PARKING_SPACE`** (13 attributes): `space_id`, `host_user_id`, `city_id`, `title`, `description`, `vehicle_category`, `hourly_rate`, `daily_rate`, `access_method`, `approval_mode`, `listing_status`, `approximate_latitude`, `approximate_longitude`
4. **`PRIVATE_SPACE_LOCATION`** (5 attributes): `space_id`, `exact_address`, `precise_latitude`, `precise_longitude`, `private_notes`
5. **`AVAILABILITY_WINDOW`** (5 attributes): `availability_id`, `space_id`, `start_time`, `end_time`, `availability_status`
6. **`BOOKING`** (11 attributes): `booking_id`, `space_id`, `driver_user_id`, `availability_id`, `start_time`, `end_time`, `booking_type`, `booking_status`, `amount`, `currency`, `cancellation_reason`
7. **`PAYMENT_ATTEMPT`** (7 attributes): `payment_id`, `booking_id`, `amount`, `currency`, `payment_method`, `payment_status`, `payment_reference`
8. **`USER_VERIFICATION`** (5 attributes): `verification_id`, `user_id`, `verification_type`, `verification_status`, `verified_at`
9. **`LISTING_VERIFICATION`** (5 attributes): `listing_verification_id`, `space_id`, `reviewer_user_id`, `verification_status`, `decision_at`
10. **`BOOKING_ACCESS_DETAIL`** (5 attributes): `access_id`, `booking_id`, `access_instructions`, `release_at`, `expiry_at`
11. **`REVIEW`** (6 attributes): `review_id`, `booking_id`, `reviewer_user_id`, `reviewed_user_id`, `rating`, `comment`
12. **`DISPUTE`** (8 attributes): `dispute_id`, `booking_id`, `reporter_user_id`, `administrator_user_id`, `issue_type`, `description`, `dispute_status`, `resolution`

**Total Count**: Exactly **12 base tables** and **83 attributes**. No extra columns or persistent storage added.

---

## 2. Prerequisites
- **Node.js**: v18+ (Tested on v24.18)
- **MySQL Community Server**: 8.0+
- **MySQL Workbench** or command line client

---

## 3. Database Initialization

Execute the SQL scripts in `database/` in sequential order:
```powershell
mysql -u root -p < database/01_schema.sql
mysql -u root -p < database/02_seed.sql
mysql -u root -p < database/04_views.sql
mysql -u root -p < database/05_tests.sql
```

---

## 4. Environment Configuration
The backend reads from `server/.env`. A safe template is provided at `.env.example`:
```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=parko_db

JWT_SECRET=parko_super_secure_jwt_secret_token_2026_demo
DEMO_ADMIN_USER_ID=1
```

---

## 5. Running the Application

### 1. Start the Backend API Server:
```powershell
cd server
npm install
npm run build
npm run start   # or npm run dev
```
Accessible at: `http://localhost:5000`

### 2. Start the Frontend Application:
```powershell
cd client
npm install
npm run dev
```
Accessible at: `http://localhost:5173`

---

## 6. Demonstration Accounts & Sign-In

### Simulated Phone + OTP Sign-in (Default)
1. Navigate to `http://localhost:5173/login`.
2. Under **Phone & Demo OTP**, enter any phone number (e.g., `+919876543210` or a new number).
3. Click **Get Demo Code**. The backend generates an on-screen single-use demo code valid for 5 minutes.
4. Click **Sign In with OTP** to authenticate.

### Seeded Administrator Account
- **Email**: `admin@parko.com`
- **Password**: `password123`
- Tied to `user_id = 1` via backend `DEMO_ADMIN_USER_ID`. Grants access to `/admin` (Platform metrics, listing approvals, user verifications, disputes resolution).

### Seeded Demo Owner & Driver Accounts
- **Host / Owner Kavitha**: `kavitha@parko.com` / `password123` (Phone: `+919876543211`)
- **Host / Owner Rajesh**: `rajesh@parko.com` / `password123` (Phone: `+919876543212`)
- **Driver Suresh**: `suresh@parko.com` / `password123` (Phone: `+919876543214`)

---

## 7. Complete Demonstration Flow

1. **Guest Discovery & Welcome Overlay**:
   - Open `http://localhost:5173/`.
   - The welcome modal appears over the interactive Leaflet map.
   - Click **Find your parking** to dismiss.
   - Browse the split-screen view: filter by vehicle category, price slider, and instant booking mode.
2. **Pre-Booking Exact Route Disclosure**:
   - Select any parking space and click **Book Now**.
   - Authenticate (via OTP or password).
   - Once authenticated, the pre-booking map discloses the exact route destination coordinates without revealing private gate codes or text addresses.
3. **Instant Booking & Checkout Hold**:
   - Select duration and click **Reserve & Proceed**.
   - The slot enters `pending_payment` and a 3-minute checkout timer starts.
   - Click **Complete Demo Payment**.
   - The backend runs a database transaction: records `PAYMENT_ATTEMPT`, updates `BOOKING` to `confirmed`, and creates `BOOKING_ACCESS_DETAIL`.
4. **Post-Confirmation Access Details**:
   - Navigate to **My Bookings**.
   - Click **Access Details** to view the unlocked exact street address, keypad instructions, and host notes.
5. **Owner Workspace**:
   - Navigate to **Owner View**.
   - View listing statuses, approve/decline incoming booking requests, or launch the 4-step **List your space** wizard.
6. **Admin Portal**:
   - Sign in as `admin@parko.com` and click **Admin Portal**.
   - Review pending listings, inspect protected private coordinates, approve or suspend spaces, and resolve disputes or owner-cancellation requests.
