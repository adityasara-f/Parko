-- Reporting views for the application schema. Select the target database
-- when connecting; this file never creates, drops, or selects a database.

CREATE OR REPLACE VIEW vw_active_parking_spaces AS
SELECT ps.space_id, ps.title, ps.description, ps.vehicle_category,
       ps.hourly_rate, ps.daily_rate, ps.access_method, ps.approval_mode,
       ps.approximate_latitude, ps.approximate_longitude,
       c.city_name, c.region, c.country, host.user_id AS host_user_id, host.name AS host_name
FROM parking_space ps
JOIN city c ON c.city_id = ps.city_id
JOIN `user` host ON host.user_id = ps.host_user_id
WHERE ps.listing_status = 'approved';

CREATE OR REPLACE VIEW vw_booking_summary AS
SELECT b.booking_id, b.booking_type, b.booking_status, b.start_time, b.end_time,
       b.amount, b.currency, driver.user_id AS driver_user_id, driver.name AS driver_name,
       ps.space_id, ps.title AS space_title, host.user_id AS host_user_id, host.name AS host_name
FROM booking b
JOIN `user` driver ON driver.user_id = b.driver_user_id
JOIN parking_space ps ON ps.space_id = b.space_id
JOIN `user` host ON host.user_id = ps.host_user_id;

CREATE OR REPLACE VIEW vw_host_performance AS
SELECT host.user_id AS host_user_id, host.name AS host_name,
       COUNT(DISTINCT ps.space_id) AS total_spaces,
       COUNT(DISTINCT CASE WHEN b.booking_status = 'completed' THEN b.booking_id END) AS completed_bookings,
       ROUND(AVG(CASE WHEN r.reviewed_user_id = host.user_id THEN r.rating END),2) AS average_rating
FROM `user` host
LEFT JOIN parking_space ps ON ps.host_user_id = host.user_id
LEFT JOIN booking b ON b.space_id = ps.space_id
LEFT JOIN review r ON r.booking_id = b.booking_id
GROUP BY host.user_id, host.name;

CREATE OR REPLACE VIEW vw_payment_summary AS
SELECT b.booking_id, b.booking_status, b.amount AS booking_amount, b.currency,
       COUNT(p.payment_id) AS payment_attempt_count,
    COALESCE(SUM(CASE WHEN p.payment_status = 'successful' THEN p.amount ELSE 0 END), 0) AS successful_payment_total,
    (SELECT latest.payment_status
     FROM payment_attempt latest
     WHERE latest.booking_id = b.booking_id
     ORDER BY latest.payment_id DESC
     LIMIT 1) AS latest_payment_status
FROM booking b
LEFT JOIN payment_attempt p ON p.booking_id = b.booking_id
GROUP BY b.booking_id, b.booking_status, b.amount, b.currency;

-- Try the views
SELECT * FROM vw_active_parking_spaces;
SELECT * FROM vw_booking_summary;
SELECT * FROM vw_host_performance;
SELECT * FROM vw_payment_summary;
