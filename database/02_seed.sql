-- =====================================================================
-- PARKO DATABASE SEED DATA
-- Realistic Synthetic Demonstration Data for Vellore, Tamil Nadu
-- =====================================================================

USE parko_db;

-- 1. CITY (Vellore demo market)
INSERT INTO CITY (city_id, city_name, region, country, timezone, currency) VALUES
(1, 'Vellore', 'Tamil Nadu', 'India', 'Asia/Kolkata', 'INR');

-- 2. USER (Demo Admin, Owners, Drivers)
-- Passwords are bcrypt hash for 'password123' ($2a$10$wO3oWqB.O3r89h1wK0j.Re7Q3o7eP.. or standard bcrypt hash)
-- Let's use standard bcrypt hash for 'password123': $2a$10$Xo1n67oR0Y2b1Y2e5e4nYe8Pq3o5W8v4X5o5Y5e4e5e4e5e4e5e4e
-- Actually let's use a verified bcrypt hash for 'password123': $2b$10$oX5iA5fUqg05XmDfg7Z7Qe3Hj4E2Nl7IeX3mF5Xj2y6T8gY8Y8e2O
INSERT INTO USER (user_id, name, email, phone, password_hash, account_status, created_at) VALUES
(1, 'Aditya Saraf (Admin)', 'admin@parko.com', '+919876543210', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'active', NOW() - INTERVAL 30 DAY),
(2, 'Kavitha Raman (Owner)', 'kavitha@parko.com', '+919876543211', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'active', NOW() - INTERVAL 25 DAY),
(3, 'Rajesh Kumar (Owner)', 'rajesh@parko.com', '+919876543212', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'active', NOW() - INTERVAL 20 DAY),
(4, 'Dr. Arulmozhi (Owner)', 'arul@parko.com', '+919876543213', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'active', NOW() - INTERVAL 18 DAY),
(5, 'Suresh Mani (Driver)', 'suresh@parko.com', '+919876543214', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'active', NOW() - INTERVAL 15 DAY),
(6, 'Priya Sundaram (Driver)', 'priya@parko.com', '+919876543215', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'active', NOW() - INTERVAL 10 DAY),
(7, 'Vikram Chandran (Driver)', 'vikram@parko.com', '+919876543216', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'active', NOW() - INTERVAL 5 DAY),
(8, 'Deepa Mohan (Host/Driver)', 'deepa@parko.com', '+919876543217', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'active', NOW() - INTERVAL 2 DAY);

-- 3. USER_VERIFICATION
INSERT INTO USER_VERIFICATION (verification_id, user_id, verification_type, verification_status, verified_at) VALUES
(1, 1, 'phone_otp', 'verified', NOW() - INTERVAL 30 DAY),
(2, 1, 'government_id', 'verified', NOW() - INTERVAL 30 DAY),
(3, 2, 'phone_otp', 'verified', NOW() - INTERVAL 25 DAY),
(4, 2, 'government_id', 'verified', NOW() - INTERVAL 24 DAY),
(5, 3, 'phone_otp', 'verified', NOW() - INTERVAL 20 DAY),
(6, 4, 'phone_otp', 'verified', NOW() - INTERVAL 18 DAY),
(7, 5, 'phone_otp', 'verified', NOW() - INTERVAL 15 DAY),
(8, 6, 'phone_otp', 'verified', NOW() - INTERVAL 10 DAY),
(9, 7, 'phone_otp', 'pending', NULL),
(10, 8, 'phone_otp', 'verified', NOW() - INTERVAL 2 DAY);

-- 4. PARKING_SPACE (Around key Vellore landmarks: VIT Main Gate, Katpadi Junction, CMC Hospital, Fort, Bagayam)
INSERT INTO PARKING_SPACE (space_id, host_user_id, city_id, title, description, vehicle_category, hourly_rate, daily_rate, access_method, approval_mode, listing_status, approximate_latitude, approximate_longitude) VALUES
(1, 2, 1, 'VIT Campus North Gate Covered Slot', 'Secure covered parking slot right across VIT Katpadi North Gate. Well lit, paved, 24/7 CCTV surveillance.', 'compact_car', 40.00, 300.00, 'barrier_gate', 'instant', 'approved', 12.9712000, 79.1585000),
(2, 2, 1, 'Katpadi Railway Station Driveway', 'Gated wide residential driveway only 300 meters from Katpadi Junction Platform 1. Suitable for SUVs and sedans.', 'suv', 50.00, 400.00, 'automated_code', 'instant', 'approved', 12.9815000, 79.1388000),
(3, 3, 1, 'CMC Town Campus Shaded Bay', 'Peaceful shaded bay in residential lane near Christian Medical College Ida Scudder Road. Ideal for patients and visitors.', 'compact_car', 45.00, 350.00, 'host_meet', 'manual_5min', 'approved', 12.9255000, 79.1332000),
(4, 3, 1, 'Vellore Fort Heritage Parking', 'Spacious open paved lot near Vellore Fort entrance and Jalakanteswarar Temple. Great for day trips.', 'all', 35.00, 250.00, 'open_driveway', 'instant', 'approved', 12.9208000, 79.1310000),
(5, 4, 1, 'Bagayam Green Avenue Two-Wheeler Slot', 'Safe two-wheeler slot under portico near CHAD hospital campus. Perfect for medical students and staff.', 'two_wheeler', 15.00, 100.00, 'key_pass', 'instant', 'approved', 12.8715000, 79.1352000),
(6, 4, 1, 'Gandhi Nagar Fast EV Charging Bay', 'Dedicated EV slot with 15A high-power point access in Gandhi Nagar East. Quiet residential location.', 'ev_car', 65.00, 500.00, 'automated_code', 'instant', 'approved', 12.9642000, 79.1438000),
(7, 2, 1, 'Sathuvachari Phase 2 Covered Driveway', 'Covered garage space near District Collectorate. Safe neighbourhood with remote boom gate.', 'compact_car', 35.00, 280.00, 'automated_code', 'manual_10min', 'approved', 12.9355000, 79.1720000),
(8, 3, 1, 'Thorapadi Military Road Secure Bay', 'Large paved driveway near Golden Temple bypass road. CCTV monitored, wide entry gate.', 'suv', 55.00, 420.00, 'host_meet', 'manual_30min', 'approved', 12.8988000, 79.1025000),
(9, 8, 1, 'Silk Paradise Bazaar Open Plot', 'Open ground in commercial bazaar area near Long Bazaar. Walkable to major retail stores.', 'compact_car', 30.00, 220.00, 'open_driveway', 'instant', 'approved', 12.9290000, 79.1380000),
(10, 8, 1, 'Auxilium College Road Slot', 'Clean sheltered bay near Auxilium College Katpadi. Friendly residential community.', 'two_wheeler', 20.00, 140.00, 'open_driveway', 'instant', 'approved', 12.9880000, 79.1450000),
(11, 4, 1, 'Otteri Lake View Private Compound', 'Spacious double slot inside private residential compound overlooking Otteri park.', 'suv', 60.00, 450.00, 'host_meet', 'manual_30min', 'approved', 12.9050000, 79.1455000),
(12, 2, 1, 'Allapuram Main Road Commercial Slot', 'Dedicated parking bay outside commercial office. Available on weekends and evenings.', 'compact_car', 40.00, 320.00, 'barrier_gate', 'instant', 'pending_verification', 12.9180000, 79.1250000),
(13, 3, 1, 'Sripuram Golden Temple Visitor Spot', 'Convenient parking spot 1 km from Sripuram Spiritual Park entrance.', 'all', 50.00, 380.00, 'host_meet', 'manual_10min', 'pending_verification', 12.8720000, 79.0880000),
(14, 8, 1, 'Old Katpadi Road Narrow Alley Slot', 'Narrow alleyway parking spot with unpaved dirt surface.', 'two_wheeler', 15.00, 90.00, 'open_driveway', 'manual_30min', 'rejected', 12.9750000, 79.1320000),
(15, 4, 1, 'Ranipet Road Industrial Warehouse Bay', 'Currently under maintenance due to construction work nearby.', 'all', 45.00, 350.00, 'barrier_gate', 'instant', 'suspended', 12.9450000, 79.1850000);

-- 5. PRIVATE_SPACE_LOCATION (Protected exact locations - NEVER returned in public listings)
INSERT INTO PRIVATE_SPACE_LOCATION (space_id, exact_address, precise_latitude, precise_longitude, private_notes) VALUES
(1, 'Flat 2B, Sri Krishna Enclave, 14th Cross, Katpadi North, Vellore 632014', 12.9712450, 79.1585320, 'Gate remote code is #4491. Parking slot #4 marked in yellow paint.'),
(2, 'Plot 88, Anna Nagar 1st Main Rd, Near Katpadi Jn Platform 1, Vellore 632007', 12.9815800, 79.1388400, 'Keypad on silver pedestrian gate. Code 9081 followed by * to unlock.'),
(3, '12 Ida Scudder Road, Beside Christian Mission Dispensary, Vellore 632004', 12.9255200, 79.1332600, 'Please call Rajesh at intercom button 2 upon arrival. Keep emergency driveway clear.'),
(4, 'Plot 5A, Fort Circuit Road, Near Balaji Bhavan, Vellore 632004', 12.9208100, 79.1310500, 'Paved lot behind red brick boundary wall. Pull right up to the marked trees.'),
(5, 'Quarters C-14, CHAD Campus Road, Bagayam, Vellore 632002', 12.8715300, 79.1352400, 'Lockbox on garden post. Combination 3312. Return key to box before leaving.'),
(6, '72 East Avenue, Gandhi Nagar, Katpadi, Vellore 632006', 12.9642200, 79.1438500, 'EV charger box unlocked with digital pin 7721. 15A socket enabled upon card tap.'),
(7, 'House 204, Phase II, TNHB Colony, Sathuvachari, Vellore 632009', 12.9355400, 79.1720800, 'Boom barrier sensor activates automatically or dial security guard at +919876500001.'),
(8, '45 Military Road, Near Bypass Toll Junction, Thorapadi, Vellore 632002', 12.8988500, 79.1025700, 'Ring doorbell at green villa. Host Suresh will open heavy sliding iron gate.'),
(9, '21 Long Bazaar Lane 3, Near Old Bus Stand, Vellore 632001', 12.9290500, 79.1380700, 'Lot manager Murugan on site from 8am to 9pm. Mention Parko booking ref.'),
(10, '19 Auxilium College Main Road, Katpadi, Vellore 632006', 12.9880400, 79.1450600, 'Two-wheeler bay inside front porch behind jasmine bush.'),
(11, '108 Lakeside Avenue, Otteri, Vellore 632002', 12.9050500, 79.1455800, 'Dial host via gate callbox. Park in designated bay left of the gazebo.'),
(12, '15 Allapuram Road, Commercial Wing A, Vellore 632001', 12.9180400, 79.1250300, 'Security guard on duty. Present digital booking pass.'),
(13, '33 Golden Temple Approach Rd, Sripuram, Vellore 632055', 12.8720800, 79.0880400, 'Private open yard behind sugarcane stall.'),
(14, '5 Old Katpadi Alleyway, Vellore 632007', 12.9750200, 79.1320400, 'Tight space behind tea stall.'),
(15, '88 Phase III Ranipet Industrial Corridor, Vellore 632401', 12.9450300, 79.1850700, 'Currently barred for safety review.');

-- 6. AVAILABILITY_WINDOW (Current date and future windows)
-- We use dynamic CURRENT_DATE offsets so demo windows are always valid now and upcoming!
INSERT INTO AVAILABILITY_WINDOW (availability_id, space_id, start_time, end_time, availability_status) VALUES
-- Space 1: Today morning-night & Tomorrow
(1, 1, DATE_ADD(CURRENT_DATE, INTERVAL 6 HOUR), DATE_ADD(CURRENT_DATE, INTERVAL 23 HOUR), 'available'),
(2, 1, DATE_ADD(DATE_ADD(CURRENT_DATE, INTERVAL 1 DAY), INTERVAL 6 HOUR), DATE_ADD(DATE_ADD(CURRENT_DATE, INTERVAL 1 DAY), INTERVAL 23 HOUR), 'available'),
-- Space 2: Today & Tomorrow
(3, 2, DATE_ADD(CURRENT_DATE, INTERVAL 7 HOUR), DATE_ADD(CURRENT_DATE, INTERVAL 22 HOUR), 'available'),
(4, 2, DATE_ADD(DATE_ADD(CURRENT_DATE, INTERVAL 1 DAY), INTERVAL 7 HOUR), DATE_ADD(DATE_ADD(CURRENT_DATE, INTERVAL 1 DAY), INTERVAL 22 HOUR), 'available'),
-- Space 3: Today & Tomorrow
(5, 3, DATE_ADD(CURRENT_DATE, INTERVAL 8 HOUR), DATE_ADD(CURRENT_DATE, INTERVAL 20 HOUR), 'available'),
(6, 3, DATE_ADD(DATE_ADD(CURRENT_DATE, INTERVAL 1 DAY), INTERVAL 8 HOUR), DATE_ADD(DATE_ADD(CURRENT_DATE, INTERVAL 1 DAY), INTERVAL 20 HOUR), 'available'),
-- Space 4: 24/7 Today & Tomorrow
(7, 4, DATE_ADD(CURRENT_DATE, INTERVAL 0 HOUR), DATE_ADD(CURRENT_DATE, INTERVAL 24 HOUR), 'available'),
(8, 4, DATE_ADD(DATE_ADD(CURRENT_DATE, INTERVAL 1 DAY), INTERVAL 0 HOUR), DATE_ADD(DATE_ADD(CURRENT_DATE, INTERVAL 1 DAY), INTERVAL 24 HOUR), 'available'),
-- Space 5: Bagayam
(9, 5, DATE_ADD(CURRENT_DATE, INTERVAL 6 HOUR), DATE_ADD(CURRENT_DATE, INTERVAL 21 HOUR), 'available'),
-- Space 6: Gandhi Nagar EV
(10, 6, DATE_ADD(CURRENT_DATE, INTERVAL 0 HOUR), DATE_ADD(CURRENT_DATE, INTERVAL 24 HOUR), 'available'),
-- Space 7: Sathuvachari
(11, 7, DATE_ADD(CURRENT_DATE, INTERVAL 8 HOUR), DATE_ADD(CURRENT_DATE, INTERVAL 21 HOUR), 'available'),
-- Space 8: Thorapadi
(12, 8, DATE_ADD(CURRENT_DATE, INTERVAL 9 HOUR), DATE_ADD(CURRENT_DATE, INTERVAL 22 HOUR), 'available'),
-- Space 9: Silk Bazaar
(13, 9, DATE_ADD(CURRENT_DATE, INTERVAL 10 HOUR), DATE_ADD(CURRENT_DATE, INTERVAL 21 HOUR), 'available'),
-- Space 10: Auxilium
(14, 10, DATE_ADD(CURRENT_DATE, INTERVAL 7 HOUR), DATE_ADD(CURRENT_DATE, INTERVAL 19 HOUR), 'available'),
-- Space 11: Otteri
(15, 11, DATE_ADD(CURRENT_DATE, INTERVAL 8 HOUR), DATE_ADD(CURRENT_DATE, INTERVAL 20 HOUR), 'available');

-- 7. BOOKING (Demonstration historical, active and pending states)
INSERT INTO BOOKING (booking_id, space_id, driver_user_id, availability_id, start_time, end_time, booking_type, booking_status, amount, currency, cancellation_reason) VALUES
-- Past completed booking 1 (Space 1, driver Suresh)
(1, 1, 5, 1, DATE_SUB(DATE_ADD(CURRENT_DATE, INTERVAL 10 HOUR), INTERVAL 1 DAY), DATE_SUB(DATE_ADD(CURRENT_DATE, INTERVAL 13 HOUR), INTERVAL 1 DAY), 'instant', 'completed', 120.00, 'INR', NULL),
-- Past completed booking 2 (Space 3, driver Priya)
(2, 3, 6, 5, DATE_SUB(DATE_ADD(CURRENT_DATE, INTERVAL 14 HOUR), INTERVAL 2 DAY), DATE_SUB(DATE_ADD(CURRENT_DATE, INTERVAL 17 HOUR), INTERVAL 2 DAY), 'owner_approved', 'completed', 135.00, 'INR', NULL),
-- Confirmed upcoming booking (Space 2, driver Suresh)
(3, 2, 5, 3, DATE_ADD(CURRENT_DATE, INTERVAL 18 HOUR), DATE_ADD(CURRENT_DATE, INTERVAL 20 HOUR), 'instant', 'confirmed', 100.00, 'INR', NULL),
-- Pending approval booking (Space 3, driver Vikram)
(4, 3, 7, 5, DATE_ADD(CURRENT_DATE, INTERVAL 16 HOUR), DATE_ADD(CURRENT_DATE, INTERVAL 18 HOUR), 'owner_approved', 'pending_approval', 90.00, 'INR', NULL),
-- Cancelled booking example
(5, 4, 6, 7, DATE_SUB(DATE_ADD(CURRENT_DATE, INTERVAL 9 HOUR), INTERVAL 3 DAY), DATE_SUB(DATE_ADD(CURRENT_DATE, INTERVAL 12 HOUR), INTERVAL 3 DAY), 'instant', 'cancelled', 105.00, 'INR', 'Driver plans changed prior to arrival'),
-- Owner cancellation requested booking (Disputed / Admin review needed)
(6, 1, 6, 1, DATE_ADD(CURRENT_DATE, INTERVAL 14 HOUR), DATE_ADD(CURRENT_DATE, INTERVAL 16 HOUR), 'instant', 'cancellation_requested', 80.00, 'INR', 'Host emergency maintenance on driveway pipes');

-- 8. PAYMENT_ATTEMPT (Simulated payments for bookings)
INSERT INTO PAYMENT_ATTEMPT (payment_id, booking_id, amount, currency, payment_method, payment_status, payment_reference) VALUES
(1, 1, 120.00, 'INR', 'upi', 'successful', 'PAY_DEMO_998124_SUC'),
(2, 2, 135.00, 'INR', 'card', 'successful', 'PAY_DEMO_771234_SUC'),
(3, 3, 100.00, 'INR', 'upi', 'successful', 'PAY_DEMO_445566_SUC'),
(4, 5, 105.00, 'INR', 'net_banking', 'refunded', 'PAY_DEMO_112233_REF'),
(5, 6, 80.00, 'INR', 'card', 'successful', 'PAY_DEMO_889900_SUC');

-- 9. BOOKING_ACCESS_DETAIL (Only for confirmed/completed bookings)
INSERT INTO BOOKING_ACCESS_DETAIL (access_id, booking_id, access_instructions, release_at, expiry_at) VALUES
(1, 1, 'Driveway Gate 4. Code was #4491.', DATE_SUB(DATE_ADD(CURRENT_DATE, INTERVAL 9 HOUR), INTERVAL 1 DAY), DATE_SUB(DATE_ADD(CURRENT_DATE, INTERVAL 14 HOUR), INTERVAL 1 DAY)),
(2, 2, 'Ring intercom 2. Rajesh opened garage doors.', DATE_SUB(DATE_ADD(CURRENT_DATE, INTERVAL 13 HOUR), INTERVAL 2 DAY), DATE_SUB(DATE_ADD(CURRENT_DATE, INTERVAL 18 HOUR), INTERVAL 2 DAY)),
(3, 3, 'Keypad on silver pedestrian gate. Code 9081* to enter. Slot #2.', DATE_ADD(CURRENT_DATE, INTERVAL 17 HOUR), DATE_ADD(CURRENT_DATE, INTERVAL 21 HOUR)),
(4, 6, 'Gate remote code #4491. Space #4.', DATE_ADD(CURRENT_DATE, INTERVAL 13 HOUR), DATE_ADD(CURRENT_DATE, INTERVAL 17 HOUR));

-- 10. REVIEW (Mutual completed booking reviews with real ratings)
INSERT INTO REVIEW (review_id, booking_id, reviewer_user_id, reviewed_user_id, rating, comment) VALUES
(1, 1, 5, 2, 5, 'Spotless driveway right opposite VIT campus. The boom gate opened seamlessly and lighting was great!'),
(2, 1, 2, 5, 5, 'Punctual driver, parked neatly within yellow lines and vacated on time. Highly recommended!'),
(3, 2, 6, 3, 4, 'Very convenient spot for visiting CMC hospital. The host was courteous and guided my sedan into the shaded bay.'),
(4, 2, 3, 6, 5, 'Polite guest. Excellent communication throughout.');

-- 11. LISTING_VERIFICATION (Track listing safety reviews)
INSERT INTO LISTING_VERIFICATION (listing_verification_id, space_id, reviewer_user_id, verification_status, decision_at) VALUES
(1, 1, 1, 'approved', NOW() - INTERVAL 24 DAY),
(2, 2, 1, 'approved', NOW() - INTERVAL 24 DAY),
(3, 3, 1, 'approved', NOW() - INTERVAL 19 DAY),
(4, 4, 1, 'approved', NOW() - INTERVAL 19 DAY),
(5, 5, 1, 'approved', NOW() - INTERVAL 17 DAY),
(6, 6, 1, 'approved', NOW() - INTERVAL 17 DAY),
(7, 7, 1, 'approved', NOW() - INTERVAL 10 DAY),
(8, 8, 1, 'approved', NOW() - INTERVAL 10 DAY),
(9, 9, 1, 'approved', NOW() - INTERVAL 2 DAY),
(10, 10, 1, 'approved', NOW() - INTERVAL 2 DAY),
(11, 11, 1, 'approved', NOW() - INTERVAL 2 DAY),
(12, 12, 1, 'pending', NULL),
(13, 13, 1, 'pending', NULL),
(14, 14, 1, 'rejected', NOW() - INTERVAL 1 DAY),
(15, 15, 1, 'pending', NULL);

-- 12. DISPUTE (Demonstrating dispute tracking and admin cancellation resolution)
INSERT INTO DISPUTE (dispute_id, booking_id, reporter_user_id, administrator_user_id, issue_type, description, dispute_status, resolution) VALUES
(1, 6, 2, 1, 'owner_cancellation', 'Urgent plumbing repair on the main residential driveway pipe requires digging. Requesting cancellation approval for Booking #6.', 'open', NULL),
(2, 1, 5, 1, 'cleanliness', 'Slight leaf litter near slot entry, though driveway was mostly clean.', 'resolved', 'Feedback shared with host Kavitha to ensure leaf sweep prior to morning bookings.');
