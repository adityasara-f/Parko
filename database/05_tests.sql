-- Read-only diagnostics. Select the target database when connecting.

-- A. Row counts for all 12 entities
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

-- B. Orphan checks: each query should return zero rows
SELECT ps.space_id FROM parking_space ps LEFT JOIN `user` u ON u.user_id = ps.host_user_id WHERE u.user_id IS NULL;
SELECT b.booking_id FROM booking b LEFT JOIN availability_window a ON a.availability_id = b.availability_id AND a.space_id = b.space_id WHERE a.availability_id IS NULL;
SELECT p.payment_id FROM payment_attempt p LEFT JOIN booking b ON b.booking_id = p.booking_id WHERE b.booking_id IS NULL;
SELECT r.review_id FROM review r LEFT JOIN `user` u ON u.user_id = r.reviewer_user_id WHERE u.user_id IS NULL;

-- C. Business-rule checks: expected to return zero rows for these demo records
SELECT availability_id FROM availability_window WHERE end_time <= start_time;
SELECT booking_id FROM booking WHERE end_time <= start_time OR amount < 0;
SELECT review_id FROM review WHERE rating NOT BETWEEN 1 AND 5 OR reviewer_user_id = reviewed_user_id;

-- D. Reviews should reference completed bookings in this demo. Any rows here need review.
SELECT r.review_id, r.booking_id, b.booking_status
FROM review r JOIN booking b ON b.booking_id = r.booking_id
WHERE b.booking_status <> 'completed';

-- E. Check for overlapping active booking intervals on the same space.
-- This query reports pairs of overlapping confirmed/pending bookings; resolve any returned pairs.
SELECT b1.booking_id AS booking_a, b2.booking_id AS booking_b, b1.space_id
FROM booking b1
JOIN booking b2 ON b1.space_id = b2.space_id AND b1.booking_id < b2.booking_id
WHERE b1.booking_status IN ('pending_approval','pending_payment','confirmed','cancellation_requested')
  AND b2.booking_status IN ('pending_approval','pending_payment','confirmed','cancellation_requested')
  AND b1.start_time < b2.end_time AND b2.start_time < b1.end_time;

-- City-scope diagnostics for the optional Vellore fixtures.
SELECT COUNT(*) AS city_count FROM city;
SELECT COUNT(*) AS non_vellore_spaces
FROM parking_space ps JOIN city c ON c.city_id = ps.city_id
WHERE c.city_name <> 'Vellore';
