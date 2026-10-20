-- Basic verification and integrity checks
USE decentralized_shared_parking;

-- A. Row counts for all 12 entities
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

-- B. Orphan checks: each query should return zero rows
SELECT ps.space_id FROM PARKING_SPACE ps LEFT JOIN `USER` u ON u.user_id = ps.host_user_id WHERE u.user_id IS NULL;
SELECT b.booking_id FROM BOOKING b LEFT JOIN AVAILABILITY_WINDOW a ON a.availability_id = b.availability_id AND a.space_id = b.space_id WHERE a.availability_id IS NULL;
SELECT p.payment_id FROM PAYMENT_ATTEMPT p LEFT JOIN BOOKING b ON b.booking_id = p.booking_id WHERE b.booking_id IS NULL;
SELECT r.review_id FROM REVIEW r LEFT JOIN `USER` u ON u.user_id = r.reviewer_user_id WHERE u.user_id IS NULL;

-- C. Business-rule checks: expected to return zero rows for these demo records
SELECT availability_id FROM AVAILABILITY_WINDOW WHERE end_time <= start_time;
SELECT booking_id FROM BOOKING WHERE end_time <= start_time OR amount < 0;
SELECT review_id FROM REVIEW WHERE rating NOT BETWEEN 1 AND 5 OR reviewer_user_id = reviewed_user_id;

-- D. Reviews should reference completed bookings in this demo. Any rows here need review.
SELECT r.review_id, r.booking_id, b.booking_status
FROM REVIEW r JOIN BOOKING b ON b.booking_id = r.booking_id
WHERE b.booking_status <> 'completed';

-- E. Check for overlapping active booking intervals on the same space.
-- This query reports pairs of overlapping confirmed/pending bookings; resolve any returned pairs.
SELECT b1.booking_id AS booking_a, b2.booking_id AS booking_b, b1.space_id
FROM BOOKING b1
JOIN BOOKING b2 ON b1.space_id = b2.space_id AND b1.booking_id < b2.booking_id
WHERE b1.booking_status IN ('pending','confirmed')
  AND b2.booking_status IN ('pending','confirmed')
  AND b1.start_time < b2.end_time AND b2.start_time < b1.end_time;

-- F. Demonstrate that a duplicate email is rejected: keep commented unless testing in a transaction.
-- INSERT INTO `USER` (name,email,password_hash) VALUES ('Duplicate Test','aarav.host@example.test','DEMO_ONLY');

-- G. Demonstrate a CHECK constraint failure safely by testing manually, not in this script:
-- INSERT INTO REVIEW (booking_id, reviewer_user_id, reviewed_user_id, rating)
-- VALUES (1,3,1,9);

-- G. City-scope validation: both queries should confirm Vellore-only data.
SELECT COUNT(*) AS city_count FROM CITY; -- expected: 1
SELECT COUNT(*) AS non_vellore_spaces FROM PARKING_SPACE ps JOIN CITY c ON c.city_id = ps.city_id WHERE c.city_name <> 'Vellore'; -- expected: 0
