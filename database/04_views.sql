-- =====================================================================
-- PARKO DATABASE VIEWS
-- Derived SQL views exposing safe representations
-- =====================================================================

USE parko_db;

-- 1. Public Active Parking Spaces (SAFE VIEW - strictly no private address or coordinates)
DROP VIEW IF EXISTS v_public_active_spaces;
CREATE VIEW v_public_active_spaces AS
SELECT 
    ps.space_id,
    ps.title,
    ps.description,
    ps.vehicle_category,
    ps.hourly_rate,
    ps.access_method,
    ps.approval_mode,
    ps.approximate_latitude,
    ps.approximate_longitude,
    c.city_name,
    c.currency,
    u.name AS host_name,
    COALESCE(ROUND(AVG(r.rating), 1), 0.0) AS average_rating,
    COUNT(r.review_id) AS total_reviews
FROM PARKING_SPACE ps
JOIN CITY c ON ps.city_id = c.city_id
JOIN USER u ON ps.host_user_id = u.user_id
LEFT JOIN BOOKING b ON ps.space_id = b.space_id
LEFT JOIN REVIEW r ON b.booking_id = r.booking_id AND r.reviewed_user_id = ps.host_user_id
WHERE ps.listing_status = 'approved' AND u.account_status = 'active'
GROUP BY ps.space_id, c.city_id, u.user_id;

-- 2. Booking Summary View (For analytics & auditing)
DROP VIEW IF EXISTS v_booking_summaries;
CREATE VIEW v_booking_summaries AS
SELECT 
    b.booking_id,
    b.space_id,
    ps.title AS space_title,
    b.driver_user_id,
    driver.name AS driver_name,
    ps.host_user_id,
    host.name AS host_name,
    b.start_time,
    b.end_time,
    TIMESTAMPDIFF(MINUTE, b.start_time, b.end_time) AS duration_minutes,
    b.booking_type,
    b.booking_status,
    b.amount,
    b.currency,
    pa.payment_status,
    pa.payment_reference
FROM BOOKING b
JOIN PARKING_SPACE ps ON b.space_id = ps.space_id
JOIN USER driver ON b.driver_user_id = driver.user_id
JOIN USER host ON ps.host_user_id = host.user_id
LEFT JOIN PAYMENT_ATTEMPT pa ON b.booking_id = pa.booking_id;

-- 3. Host Activity and Earnings Summary
DROP VIEW IF EXISTS v_host_earnings_summary;
CREATE VIEW v_host_earnings_summary AS
SELECT 
    u.user_id AS host_user_id,
    u.name AS host_name,
    COUNT(DISTINCT ps.space_id) AS total_spaces,
    COUNT(DISTINCT CASE WHEN b.booking_status = 'completed' THEN b.booking_id END) AS completed_bookings,
    COALESCE(SUM(CASE WHEN b.booking_status = 'completed' THEN b.amount ELSE 0 END), 0.00) AS total_earned,
    'INR' AS currency
FROM USER u
JOIN PARKING_SPACE ps ON u.user_id = ps.host_user_id
LEFT JOIN BOOKING b ON ps.space_id = b.space_id
GROUP BY u.user_id, u.name;
