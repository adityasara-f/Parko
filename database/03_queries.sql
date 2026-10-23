-- Read-only examples for the application schema. Select the target database
-- when connecting; this file never creates, drops, or selects a database.

-- 1. Publicly listed spaces
SELECT * FROM parking_space WHERE listing_status = 'approved';

-- 2. Filter and order by hourly price
SELECT space_id, title, hourly_rate, daily_rate
FROM parking_space
WHERE listing_status = 'approved'
ORDER BY hourly_rate ASC;

-- 3. Rate aggregates
SELECT COUNT(*) AS priced_spaces,
       ROUND(AVG(hourly_rate), 2) AS average_hourly_rate,
       MIN(hourly_rate) AS lowest_hourly_rate,
       MAX(hourly_rate) AS highest_hourly_rate
FROM parking_space;

-- 4. Spaces by city
SELECT c.city_name, COUNT(ps.space_id) AS space_count
FROM city c LEFT JOIN parking_space ps ON ps.city_id = c.city_id
GROUP BY c.city_id, c.city_name
ORDER BY space_count DESC;

-- 5. Cities with at least two spaces
SELECT c.city_name, COUNT(ps.space_id) AS space_count
FROM city c JOIN parking_space ps ON ps.city_id = c.city_id
GROUP BY c.city_id, c.city_name
HAVING COUNT(ps.space_id) >= 2;

-- 6. Booking, driver, space, and host
SELECT b.booking_id, b.booking_status, b.start_time, b.end_time,
       d.name AS driver_name, ps.title AS parking_space, h.name AS host_name,
       b.amount, b.currency
FROM booking b
JOIN `user` d ON d.user_id = b.driver_user_id
JOIN parking_space ps ON ps.space_id = b.space_id
JOIN `user` h ON h.user_id = ps.host_user_id
ORDER BY b.start_time;

-- 7. Completed booking counts per space
SELECT ps.space_id, ps.title,
       COUNT(CASE WHEN b.booking_status = 'completed' THEN 1 END) AS completed_bookings
FROM parking_space ps LEFT JOIN booking b ON b.space_id = ps.space_id
GROUP BY ps.space_id, ps.title
ORDER BY completed_bookings DESC;

-- 8. Spaces priced above the average
SELECT space_id, title, hourly_rate
FROM parking_space
WHERE hourly_rate > (SELECT AVG(hourly_rate) FROM parking_space)
ORDER BY hourly_rate DESC;

-- 9. Users who have booked
SELECT u.user_id, u.name, u.email
FROM `user` u
WHERE EXISTS (SELECT 1 FROM booking b WHERE b.driver_user_id = u.user_id);

-- 10. Payment totals by status
SELECT payment_status, COUNT(*) AS attempts, SUM(amount) AS total_amount
FROM payment_attempt
GROUP BY payment_status
ORDER BY attempts DESC;

-- 11. Reviews per host
SELECT host.name AS host_name, ROUND(AVG(r.rating), 2) AS average_rating,
       COUNT(r.review_id) AS review_count
FROM `user` host
JOIN parking_space ps ON ps.host_user_id = host.user_id
LEFT JOIN booking b ON b.space_id = ps.space_id AND b.booking_status = 'completed'
LEFT JOIN review r ON r.booking_id = b.booking_id AND r.reviewed_user_id = host.user_id
GROUP BY host.user_id, host.name
ORDER BY average_rating DESC;

-- 12. Bookings with payment attempts
SELECT b.booking_id, b.booking_status, b.amount AS booking_amount,
       p.payment_id, p.payment_status, p.payment_method
FROM booking b LEFT JOIN payment_attempt p ON p.booking_id = b.booking_id
ORDER BY b.booking_id, p.payment_id;

-- 13. Open or under-review disputes
SELECT d.dispute_id, d.issue_type, d.dispute_status, b.booking_id,
       reporter.name AS reporter, admin.name AS administrator
FROM dispute d
JOIN booking b ON b.booking_id = d.booking_id
JOIN `user` reporter ON reporter.user_id = d.reporter_user_id
LEFT JOIN `user` admin ON admin.user_id = d.administrator_user_id
WHERE d.dispute_status IN ('open', 'under_review')
ORDER BY d.dispute_id;

-- 14. Price bands
SELECT space_id, title, hourly_rate,
       CASE WHEN hourly_rate < 25 THEN 'Budget'
            WHEN hourly_rate < 60 THEN 'Standard'
            ELSE 'Premium' END AS price_band
FROM parking_space
WHERE listing_status = 'approved'
ORDER BY hourly_rate;

-- 15. Booking counts by operational status
SELECT
  SUM(booking_status = 'completed') AS completed_count,
  SUM(booking_status = 'confirmed') AS confirmed_count,
  SUM(booking_status = 'pending_approval') AS pending_approval_count,
  SUM(booking_status = 'pending_payment') AS pending_payment_count,
  SUM(booking_status = 'cancelled') AS cancelled_count,
  SUM(booking_status = 'no_show') AS no_show_count
FROM booking;
