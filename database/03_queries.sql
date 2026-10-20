-- Required DBMS query demonstrations
USE decentralized_shared_parking;

-- 1. SELECT all active parking spaces
SELECT * FROM PARKING_SPACE WHERE listing_status = 'active';

-- 2. WHERE + ORDER BY: spaces in ascending hourly price
SELECT space_id, title, hourly_rate, daily_rate
FROM PARKING_SPACE
WHERE listing_status = 'active' AND hourly_rate IS NOT NULL
ORDER BY hourly_rate ASC;

-- 3. Aggregate functions: total, average, minimum and maximum hourly rate
SELECT COUNT(*) AS priced_spaces,
       ROUND(AVG(hourly_rate),2) AS average_hourly_rate,
       MIN(hourly_rate) AS lowest_hourly_rate,
       MAX(hourly_rate) AS highest_hourly_rate
FROM PARKING_SPACE
WHERE hourly_rate IS NOT NULL AND listing_status = 'active';

-- 4. GROUP BY: spaces by city (the project contains Vellore only)
SELECT c.city_name, COUNT(ps.space_id) AS space_count
FROM CITY c LEFT JOIN PARKING_SPACE ps ON ps.city_id = c.city_id
GROUP BY c.city_id, c.city_name
ORDER BY space_count DESC;

-- 5. HAVING: show Vellore when it has at least two parking spaces
SELECT c.city_name, COUNT(ps.space_id) AS space_count
FROM CITY c JOIN PARKING_SPACE ps ON ps.city_id = c.city_id
GROUP BY c.city_id, c.city_name
HAVING COUNT(ps.space_id) >= 2;

-- 6. JOIN: booking with driver, parking space and host
SELECT b.booking_id, b.booking_status, b.start_time, b.end_time,
       d.name AS driver_name, ps.title AS parking_space, h.name AS host_name,
       b.amount, b.currency
FROM BOOKING b
JOIN `USER` d ON d.user_id = b.driver_user_id
JOIN PARKING_SPACE ps ON ps.space_id = b.space_id
JOIN `USER` h ON h.user_id = ps.host_user_id
ORDER BY b.start_time;

-- 7. LEFT JOIN: show every space and any completed booking count
SELECT ps.space_id, ps.title,
       COUNT(CASE WHEN b.booking_status = 'completed' THEN 1 END) AS completed_bookings
FROM PARKING_SPACE ps LEFT JOIN BOOKING b ON b.space_id = ps.space_id
GROUP BY ps.space_id, ps.title
ORDER BY completed_bookings DESC;

-- 8. Subquery: spaces priced above the overall average hourly rate
SELECT space_id, title, hourly_rate
FROM PARKING_SPACE
WHERE hourly_rate > (SELECT AVG(hourly_rate) FROM PARKING_SPACE WHERE hourly_rate IS NOT NULL)
ORDER BY hourly_rate DESC;

-- 9. Correlated subquery: users who have made at least one booking
SELECT u.user_id, u.name, u.email
FROM `USER` u
WHERE EXISTS (SELECT 1 FROM BOOKING b WHERE b.driver_user_id = u.user_id);

-- 10. Payment summary by status
SELECT payment_status, COUNT(*) AS attempts, SUM(amount) AS total_amount
FROM PAYMENT_ATTEMPT
GROUP BY payment_status
ORDER BY attempts DESC;

-- 11. Reviews and average rating per space host
SELECT host.name AS host_name, ROUND(AVG(r.rating),2) AS average_rating,
       COUNT(r.review_id) AS review_count
FROM `USER` host
JOIN PARKING_SPACE ps ON ps.host_user_id = host.user_id
LEFT JOIN BOOKING b ON b.space_id = ps.space_id AND b.booking_status = 'completed'
LEFT JOIN REVIEW r ON r.booking_id = b.booking_id AND r.reviewed_user_id = host.user_id
GROUP BY host.user_id, host.name
ORDER BY average_rating DESC;

-- 12. Bookings with payment details (including bookings without a payment attempt)
SELECT b.booking_id, b.booking_status, b.amount AS booking_amount,
       p.payment_id, p.payment_status, p.payment_method
FROM BOOKING b LEFT JOIN PAYMENT_ATTEMPT p ON p.booking_id = b.booking_id
ORDER BY b.booking_id, p.payment_id;

-- 13. Open or under-review disputes
SELECT d.dispute_id, d.issue_type, d.dispute_status, b.booking_id,
       reporter.name AS reporter, admin.name AS administrator
FROM DISPUTE d
JOIN BOOKING b ON b.booking_id = d.booking_id
JOIN `USER` reporter ON reporter.user_id = d.reporter_user_id
LEFT JOIN `USER` admin ON admin.user_id = d.administrator_user_id
WHERE d.dispute_status IN ('open','under_review')
ORDER BY d.dispute_id;

-- 14. CASE expression: classify price bands
SELECT space_id, title, hourly_rate,
       CASE WHEN hourly_rate < 25 THEN 'Budget'
            WHEN hourly_rate < 60 THEN 'Standard'
            ELSE 'Premium' END AS price_band
FROM PARKING_SPACE
WHERE listing_status = 'active' AND hourly_rate IS NOT NULL
ORDER BY hourly_rate;

-- 15. Conditional aggregation: booking counts by status
SELECT
  SUM(booking_status = 'completed') AS completed_count,
  SUM(booking_status = 'confirmed') AS confirmed_count,
  SUM(booking_status = 'pending') AS pending_count,
  SUM(booking_status = 'cancelled') AS cancelled_count,
  SUM(booking_status = 'no_show') AS no_show_count
FROM BOOKING;
