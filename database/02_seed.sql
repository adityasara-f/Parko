-- Vellore-only sample data for Decentralized Shared Parking Management System
-- Fictional demo records. Run once after the 12-table schema has been created.
USE decentralized_shared_parking;
START TRANSACTION;

INSERT INTO `USER` (user_id, name, email, phone, password_hash, account_status, created_at) VALUES
(1,'Arun Kumar','arun.host@example.test','+91-9000000001','DEMO_HASH_NOT_A_REAL_PASSWORD','active','2026-01-10 09:00:00'),
(2,'Priya Suresh','priya.host@example.test','+91-9000000002','DEMO_HASH_NOT_A_REAL_PASSWORD','active','2026-01-11 10:00:00'),
(3,'Karthik Raj','karthik.driver@example.test','+91-9000000003','DEMO_HASH_NOT_A_REAL_PASSWORD','active','2026-01-12 11:00:00'),
(4,'Nila Devi','nila.driver@example.test','+91-9000000004','DEMO_HASH_NOT_A_REAL_PASSWORD','active','2026-01-13 12:00:00'),
(5,'Sanjay Vel','sanjay.host@example.test','+91-9000000005','DEMO_HASH_NOT_A_REAL_PASSWORD','active','2026-01-14 13:00:00'),
(6,'Keerthana M','keerthana.driver@example.test','+91-9000000006','DEMO_HASH_NOT_A_REAL_PASSWORD','active','2026-01-15 14:00:00'),
(7,'Admin Demo','admin.demo@example.test','+91-9000000007','DEMO_HASH_NOT_A_REAL_PASSWORD','active','2026-01-16 15:00:00'),
(8,'Vijay Anand','vijay.driver@example.test','+91-9000000008','DEMO_HASH_NOT_A_REAL_PASSWORD','active','2026-01-17 16:00:00');

-- One city only: Vellore, Tamil Nadu, India
INSERT INTO CITY (city_id, city_name, region, country, timezone, currency) VALUES
(1,'Vellore','Tamil Nadu','India','Asia/Kolkata','INR');

INSERT INTO USER_VERIFICATION (verification_id, user_id, verification_type, verification_status, verified_at) VALUES
(1,1,'phone','verified','2026-01-10 10:00:00'),
(2,1,'identity','verified','2026-01-10 10:05:00'),
(3,2,'phone','verified','2026-01-11 10:30:00'),
(4,3,'phone','verified','2026-01-12 11:30:00'),
(5,4,'phone','pending',NULL),
(6,5,'identity','verified','2026-01-14 13:30:00'),
(7,6,'phone','verified','2026-01-15 14:30:00'),
(8,8,'identity','pending',NULL);

-- All six parking spaces belong to city_id = 1 (Vellore)
INSERT INTO PARKING_SPACE (space_id, host_user_id, city_id, title, description, vehicle_category, hourly_rate, daily_rate, access_method, approval_mode, listing_status, approximate_latitude, approximate_longitude) VALUES
(1,1,1,'Covered car parking near Vellore Fort','Demo covered space in a residential compound near the Fort area.','car',40.00,250.00,'host_handover','provider','active',12.920800,79.132500),
(2,2,1,'Two-wheeler parking near CMC area','Demo bike spot for visitors to the CMC area.','motorcycle',10.00,60.00,'self_service','automatic','active',12.924800,79.135500),
(3,5,1,'Car parking near Katpadi Railway Station','Demo driveway for commuters using the railway station.','car',50.00,320.00,'host_handover','provider','active',12.969200,79.155900),
(4,1,1,'Compact car space near VIT area','Demo outdoor parking suitable for compact cars.','compact_car',35.00,220.00,'self_service','automatic','active',12.971600,79.159000),
(5,5,1,'Visitor parking near Sathuvachari','Demo parking slot with advance booking.','car',45.00,280.00,'host_handover','provider','pending',12.936000,79.147000),
(6,2,1,'Bike parking near Vellore New Bus Stand','Demo marked two-wheeler space; currently unavailable.','motorcycle',8.00,50.00,'self_service','automatic','deactivated',12.916900,79.132200);

-- Fictional/demo addresses only; public listings should show approximate locations.
INSERT INTO PRIVATE_SPACE_LOCATION (space_id, exact_address, precise_latitude, precise_longitude, private_notes) VALUES
(1,'Demo private address 1, Vellore, Tamil Nadu',12.920910,79.132610,'Call host after arrival.'),
(2,'Demo private address 2, Vellore, Tamil Nadu',12.924910,79.135610,'Park only in the marked bike area.'),
(3,'Demo private address 3, Katpadi, Vellore, Tamil Nadu',12.969310,79.156010,'Enter through the side gate.'),
(4,'Demo private address 4, Vellore, Tamil Nadu',12.971710,79.159110,'Leave the driveway clear.'),
(5,'Demo private address 5, Sathuvachari, Vellore, Tamil Nadu',12.936110,79.147110,'Listing awaits approval.'),
(6,'Demo private address 6, Vellore, Tamil Nadu',12.917010,79.132310,'Listing currently unavailable.');

INSERT INTO AVAILABILITY_WINDOW (availability_id, space_id, start_time, end_time, availability_status) VALUES
(1,1,'2026-09-01 08:00:00','2026-12-31 20:00:00','available'),
(2,2,'2026-09-01 06:00:00','2026-12-31 22:00:00','available'),
(3,3,'2026-10-01 08:00:00','2026-12-31 20:00:00','available'),
(4,4,'2026-10-01 07:00:00','2026-12-31 23:00:00','available'),
(5,5,'2026-10-20 09:00:00','2026-11-30 18:00:00','available'),
(6,6,'2026-09-01 08:00:00','2026-12-31 20:00:00','unavailable');

INSERT INTO LISTING_VERIFICATION (listing_verification_id, space_id, reviewer_user_id, verification_status, decision_at) VALUES
(1,1,7,'approved','2026-02-01 10:00:00'),
(2,2,7,'approved','2026-02-02 10:00:00'),
(3,3,7,'approved','2026-02-03 10:00:00'),
(4,4,7,'approved','2026-02-04 10:00:00'),
(5,5,7,'pending',NULL),
(6,6,7,'rejected','2026-02-06 10:00:00');

INSERT INTO BOOKING (booking_id, space_id, driver_user_id, availability_id, start_time, end_time, booking_type, booking_status, amount, currency, cancellation_reason) VALUES
(1,1,3,1,'2026-09-10 09:00:00','2026-09-10 12:00:00','scheduled','completed',120.00,'INR',NULL),
(2,2,4,2,'2026-09-12 10:00:00','2026-09-12 14:00:00','immediate','completed',40.00,'INR',NULL),
(3,3,6,3,'2026-10-05 09:00:00','2026-10-05 12:00:00','scheduled','completed',150.00,'INR',NULL),
(4,4,8,4,'2026-10-08 13:00:00','2026-10-08 15:00:00','immediate','cancelled',70.00,'INR','Driver changed plans'),
(5,1,4,1,'2026-10-22 10:00:00','2026-10-22 12:00:00','scheduled','confirmed',80.00,'INR',NULL),
(6,3,3,3,'2026-10-25 08:00:00','2026-10-25 10:00:00','scheduled','pending',100.00,'INR',NULL),
(7,2,8,2,'2026-10-12 08:00:00','2026-10-12 10:00:00','immediate','completed',20.00,'INR',NULL),
(8,4,6,4,'2026-10-14 17:00:00','2026-10-14 19:00:00','scheduled','no_show',70.00,'INR',NULL);

INSERT INTO PAYMENT_ATTEMPT (payment_id, booking_id, amount, currency, payment_method, payment_status, payment_reference) VALUES
(1,1,120.00,'INR','demo_card','successful','VLR-DEMO-PAY-001'),
(2,2,40.00,'INR','demo_wallet','successful','VLR-DEMO-PAY-002'),
(3,3,150.00,'INR','demo_card','successful','VLR-DEMO-PAY-003'),
(4,4,70.00,'INR','demo_card','refunded','VLR-DEMO-PAY-004'),
(5,5,80.00,'INR','demo_wallet','successful','VLR-DEMO-PAY-005'),
(6,6,100.00,'INR','demo_card','pending','VLR-DEMO-PAY-006'),
(7,7,20.00,'INR','cash_demo','successful','VLR-DEMO-PAY-007'),
(8,8,70.00,'INR','demo_card','failed','VLR-DEMO-PAY-008');

INSERT INTO BOOKING_ACCESS_DETAIL (access_id, booking_id, access_instructions, release_at, expiry_at) VALUES
(1,1,'Demo access: meet the host at the entrance.','2026-09-10 08:30:00','2026-09-10 12:30:00'),
(2,2,'Demo access: use the marked two-wheeler area.','2026-09-12 09:45:00','2026-09-12 14:15:00'),
(3,3,'Demo access: enter through the side gate.','2026-10-05 08:30:00','2026-10-05 12:30:00'),
(4,5,'Demo access instructions are released after confirmation.','2026-10-22 09:30:00','2026-10-22 12:30:00'),
(5,7,'Demo access: park in the numbered bike slot.','2026-10-12 07:45:00','2026-10-12 10:15:00');

INSERT INTO REVIEW (review_id, booking_id, reviewer_user_id, reviewed_user_id, rating, comment) VALUES
(1,1,3,1,5,'Smooth check-in and covered parking.'),
(2,1,1,3,5,'Respectful driver; space left clean.'),
(3,2,4,2,4,'Convenient Vellore location and easy access.'),
(4,3,6,5,4,'Good parking space near the station.'),
(5,3,5,6,5,'Booking was handled responsibly.'),
(6,7,8,2,4,'Good value for a short stop.');

INSERT INTO DISPUTE (dispute_id, booking_id, reporter_user_id, administrator_user_id, issue_type, description, dispute_status, resolution) VALUES
(1,4,8,7,'refund_request','Driver cancelled and requested confirmation of refund.','resolved','Demo refund marked as processed.'),
(2,8,6,7,'no_show','Driver could not access the space at the expected time.','under_review',NULL),
(3,3,6,NULL,'access_issue','Driver reported unclear entry instructions.','closed','Host instructions updated for future bookings.');

COMMIT;

-- Expected city count is 1 and all parking spaces should belong to Vellore.
SELECT city_id, city_name, region, country FROM CITY;
SELECT c.city_name, COUNT(ps.space_id) AS parking_spaces
FROM CITY c LEFT JOIN PARKING_SPACE ps ON ps.city_id = c.city_id
GROUP BY c.city_id, c.city_name;

-- Row counts for all 12 tables
SELECT 'USER' AS table_name, COUNT(*) AS row_count FROM `USER`
UNION ALL SELECT 'CITY', COUNT(*) FROM CITY
UNION ALL SELECT 'USER_VERIFICATION', COUNT(*) FROM USER_VERIFICATION
UNION ALL SELECT 'PARKING_SPACE', COUNT(*) FROM PARKING_SPACE
UNION ALL SELECT 'PRIVATE_SPACE_LOCATION', COUNT(*) FROM PRIVATE_SPACE_LOCATION
UNION ALL SELECT 'AVAILABILITY_WINDOW', COUNT(*) FROM AVAILABILITY_WINDOW
UNION ALL SELECT 'LISTING_VERIFICATION', COUNT(*) FROM LISTING_VERIFICATION
UNION ALL SELECT 'BOOKING', COUNT(*) FROM BOOKING
UNION ALL SELECT 'PAYMENT_ATTEMPT', COUNT(*) FROM PAYMENT_ATTEMPT
UNION ALL SELECT 'BOOKING_ACCESS_DETAIL', COUNT(*) FROM BOOKING_ACCESS_DETAIL
UNION ALL SELECT 'REVIEW', COUNT(*) FROM REVIEW
UNION ALL SELECT 'DISPUTE', COUNT(*) FROM DISPUTE;
