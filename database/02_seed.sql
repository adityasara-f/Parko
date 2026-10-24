-- Optional fictional development fixtures. Run only once in an empty database.
-- Empty password_hash values are intentionally unusable for password login.

START TRANSACTION;

INSERT INTO `user` (user_id, name, email, phone, password_hash, account_status, created_at) VALUES
(1,'Arun Kumar','arun.host@example.test','+91-9000000001','','active','2026-01-10 09:00:00'),
(2,'Priya Suresh','priya.host@example.test','+91-9000000002','','active','2026-01-11 10:00:00'),
(3,'Karthik Raj','karthik.driver@example.test','+91-9000000003','','active','2026-01-12 11:00:00'),
(4,'Nila Devi','nila.driver@example.test','+91-9000000004','','active','2026-01-13 12:00:00'),
(5,'Sanjay Vel','sanjay.host@example.test','+91-9000000005','','active','2026-01-14 13:00:00'),
(6,'Keerthana M','keerthana.driver@example.test','+91-9000000006','','active','2026-01-15 14:00:00'),
(7,'Vijay Anand','vijay.demo@example.test','+91-9000000007','','active','2026-01-16 15:00:00'),
(8,'Vijay Driver','vijay.driver@example.test','+91-9000000008','','active','2026-01-17 16:00:00');

-- One city only: Vellore, Tamil Nadu, India
INSERT INTO city (city_id, city_name, region, country, timezone, currency) VALUES
(1,'Vellore','Tamil Nadu','India','Asia/Kolkata','INR');

INSERT INTO user_verification (verification_id, user_id, verification_type, verification_status, verified_at) VALUES
(1,1,'phone_otp','pending',NULL),
(2,1,'email_confirmation','pending',NULL),
(3,2,'phone_otp','pending',NULL),
(4,3,'phone_otp','pending',NULL),
(5,4,'phone_otp','pending',NULL),
(6,5,'email_confirmation','pending',NULL),
(7,6,'phone_otp','pending',NULL),
(8,8,'email_confirmation','pending',NULL);

-- All six parking spaces belong to city_id = 1 (Vellore)
INSERT INTO parking_space (space_id, host_user_id, city_id, title, description, vehicle_category, hourly_rate, daily_rate, access_method, approval_mode, listing_status, approximate_latitude, approximate_longitude) VALUES
(1,1,1,'Covered car parking near Vellore Fort','Demo covered space in a residential compound near the Fort area.','compact_car',40.00,250.00,'host_meet','manual_30min','approved',12.920800,79.132500),
(2,2,1,'Two-wheeler parking near CMC area','Demo bike spot for visitors to the CMC area.','two_wheeler',10.00,60.00,'open_driveway','instant','approved',12.924800,79.135500),
(3,5,1,'Car parking near Katpadi Railway Station','Demo driveway for commuters using the railway station.','compact_car',50.00,320.00,'host_meet','manual_30min','approved',12.969200,79.155900),
(4,1,1,'Compact car space near VIT area','Demo outdoor parking suitable for compact cars.','compact_car',35.00,220.00,'open_driveway','instant','approved',12.971600,79.159000),
(5,5,1,'Visitor parking near Sathuvachari','Demo parking slot with advance booking.','compact_car',45.00,280.00,'host_meet','manual_10min','pending_verification',12.936000,79.147000),
(6,2,1,'Bike parking near Vellore New Bus Stand','Demo marked two-wheeler space; currently unavailable.','two_wheeler',8.00,50.00,'open_driveway','instant','rejected',12.916900,79.132200);

-- Fictional/demo addresses only; public listings should show approximate locations.
INSERT INTO private_space_location (space_id, exact_address, precise_latitude, precise_longitude, private_notes) VALUES
(1,'Demo private address 1, Vellore, Tamil Nadu',12.920910,79.132610,'Call host after arrival.'),
(2,'Demo private address 2, Vellore, Tamil Nadu',12.924910,79.135610,'Park only in the marked bike area.'),
(3,'Demo private address 3, Katpadi, Vellore, Tamil Nadu',12.969310,79.156010,'Enter through the side gate.'),
(4,'Demo private address 4, Vellore, Tamil Nadu',12.971710,79.159110,'Leave the driveway clear.'),
(5,'Demo private address 5, Sathuvachari, Vellore, Tamil Nadu',12.936110,79.147110,'Listing awaits approval.'),
(6,'Demo private address 6, Vellore, Tamil Nadu',12.917010,79.132310,'Listing currently unavailable.');

INSERT INTO availability_window (availability_id, space_id, start_time, end_time, availability_status) VALUES
(1,1,'2026-09-01 08:00:00','2026-12-31 20:00:00','available'),
(2,2,'2026-09-01 06:00:00','2026-12-31 22:00:00','available'),
(3,3,'2026-10-01 08:00:00','2026-12-31 20:00:00','available'),
(4,4,'2026-10-01 07:00:00','2026-12-31 23:00:00','available'),
(5,5,'2026-10-20 09:00:00','2026-11-30 18:00:00','available'),
(6,6,'2026-09-01 08:00:00','2026-12-31 20:00:00','unavailable');

INSERT INTO listing_verification (listing_verification_id, space_id, reviewer_user_id, verification_status, decision_at) VALUES
(1,1,7,'approved','2026-02-01 10:00:00'),
(2,2,7,'approved','2026-02-02 10:00:00'),
(3,3,7,'approved','2026-02-03 10:00:00'),
(4,4,7,'approved','2026-02-04 10:00:00'),
(5,5,7,'pending',NULL),
(6,6,7,'rejected','2026-02-06 10:00:00');

INSERT INTO booking (booking_id, space_id, driver_user_id, availability_id, start_time, end_time, booking_type, booking_status, amount, currency, cancellation_reason, confirmed_at) VALUES
(1,1,3,1,'2026-09-10 09:00:00','2026-09-10 12:00:00','owner_approved','completed',120.00,'INR',NULL,'2026-09-10 08:00:00'),
(2,2,4,2,'2026-09-12 10:00:00','2026-09-12 14:00:00','instant','completed',40.00,'INR',NULL,'2026-09-12 09:00:00'),
(3,3,6,3,'2026-10-05 09:00:00','2026-10-05 12:00:00','owner_approved','completed',150.00,'INR',NULL,'2026-10-05 08:00:00'),
(4,4,8,4,'2026-10-08 13:00:00','2026-10-08 15:00:00','instant','cancelled',70.00,'INR','Driver changed plans',NULL),
(5,1,4,1,'2026-10-22 10:00:00','2026-10-22 12:00:00','owner_approved','confirmed',80.00,'INR',NULL,'2026-10-22 09:00:00'),
(6,3,3,3,'2026-10-25 08:00:00','2026-10-25 10:00:00','owner_approved','pending_approval',100.00,'INR',NULL,NULL),
(7,2,8,2,'2026-10-12 08:00:00','2026-10-12 10:00:00','instant','completed',20.00,'INR',NULL,'2026-10-12 07:00:00'),
(8,4,6,4,'2026-10-14 17:00:00','2026-10-14 19:00:00','owner_approved','no_show',70.00,'INR',NULL,'2026-10-14 16:00:00');

INSERT INTO payment_attempt (payment_id, booking_id, amount, currency, payment_method, payment_status, payment_reference) VALUES
(1,1,120.00,'INR','card','successful','VLR-DEMO-PAY-001'),
(2,2,40.00,'INR','upi','successful','VLR-DEMO-PAY-002'),
(3,3,150.00,'INR','card','successful','VLR-DEMO-PAY-003'),
(4,4,70.00,'INR','card','refunded','VLR-DEMO-PAY-004'),
(5,5,80.00,'INR','upi','successful','VLR-DEMO-PAY-005'),
(6,6,100.00,'INR','card','pending','VLR-DEMO-PAY-006'),
(7,7,20.00,'INR','net_banking','successful','VLR-DEMO-PAY-007'),
(8,8,70.00,'INR','card','failed','VLR-DEMO-PAY-008');

INSERT INTO booking_access_detail (access_id, booking_id, access_instructions, release_at, expiry_at) VALUES
(1,1,'Demo access: meet the host at the entrance.','2026-09-10 08:30:00','2026-09-10 12:30:00'),
(2,2,'Demo access: use the marked two-wheeler area.','2026-09-12 09:45:00','2026-09-12 14:15:00'),
(3,3,'Demo access: enter through the side gate.','2026-10-05 08:30:00','2026-10-05 12:30:00'),
(4,5,'Demo access instructions are released after confirmation.','2026-10-22 09:30:00','2026-10-22 12:30:00'),
(5,7,'Demo access: park in the numbered bike slot.','2026-10-12 07:45:00','2026-10-12 10:15:00');

INSERT INTO review (review_id, booking_id, reviewer_user_id, reviewed_user_id, rating, comment) VALUES
(1,1,3,1,5,'Smooth check-in and covered parking.'),
(2,1,1,3,5,'Respectful driver; space left clean.'),
(3,2,4,2,4,'Convenient Vellore location and easy access.'),
(4,3,6,5,4,'Good parking space near the station.'),
(5,3,5,6,5,'Booking was handled responsibly.'),
(6,7,8,2,4,'Good value for a short stop.');

INSERT INTO dispute (dispute_id, booking_id, reporter_user_id, administrator_user_id, issue_type, description, dispute_status, resolution) VALUES
(1,4,8,NULL,'other','Driver cancelled and requested confirmation of refund.','resolved','Demo refund marked as processed.'),
(2,8,6,NULL,'space_occupied','Driver could not access the space at the expected time.','under_review',NULL),
(3,3,6,NULL,'access_denied','Driver reported unclear entry instructions.','closed','Host instructions updated for future bookings.');

COMMIT;

-- Expected city count is 1 and all parking spaces should belong to Vellore.
SELECT city_id, city_name, region, country FROM city;
SELECT c.city_name, COUNT(ps.space_id) AS parking_spaces
FROM city c LEFT JOIN parking_space ps ON ps.city_id = c.city_id
GROUP BY c.city_id, c.city_name;

-- Row counts for all 12 tables
SELECT 'user' AS table_name, COUNT(*) AS row_count FROM `user`
UNION ALL SELECT 'city', COUNT(*) FROM city
UNION ALL SELECT 'user_verification', COUNT(*) FROM user_verification
UNION ALL SELECT 'parking_space', COUNT(*) FROM parking_space
UNION ALL SELECT 'private_space_location', COUNT(*) FROM private_space_location
UNION ALL SELECT 'availability_window', COUNT(*) FROM availability_window
UNION ALL SELECT 'listing_verification', COUNT(*) FROM listing_verification
UNION ALL SELECT 'booking', COUNT(*) FROM booking
UNION ALL SELECT 'payment_attempt', COUNT(*) FROM payment_attempt
UNION ALL SELECT 'booking_access_detail', COUNT(*) FROM booking_access_detail
UNION ALL SELECT 'review', COUNT(*) FROM review
UNION ALL SELECT 'dispute', COUNT(*) FROM dispute;
