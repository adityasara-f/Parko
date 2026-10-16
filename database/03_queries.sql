-- =====================================================================
-- PARKO REQUIRED DEMONSTRATION QUERIES
-- Academic Database Systems Requirement Demonstrations:
-- SELECT, WHERE, ORDER BY, GROUP BY, HAVING, AGGREGATES, JOINS, SUBQUERIES
-- =====================================================================

USE parko_db;

-- 1. SELECT, WHERE, ORDER BY: Search available parking spaces sorted by lowest price
SELECT 
    space_id,
    title,
    vehicle_category,
    hourly_rate,
    approval_mode
FROM PARKING_SPACE
WHERE listing_status = 'approved' AND city_id = 1
ORDER BY hourly_rate ASC;

-- 2. JOINS: Join public listings with city and host details (No private location disclosed)
SELECT 
    ps.space_id,
    ps.title,
    c.city_name,
    u.name AS host_name,
    ps.vehicle_category,
    ps.hourly_rate
FROM PARKING_SPACE ps
INNER JOIN CITY c ON ps.city_id = c.city_id
INNER JOIN USER u ON ps.host_user_id = u.user_id
WHERE ps.listing_status = 'approved';

-- 3. GROUP BY, HAVING, AGGREGATES: Find hosts with average rating >= 4.5 and at least 1 review
SELECT 
    u.user_id,
    u.name AS host_name,
    COUNT(r.review_id) AS review_count,
    ROUND(AVG(r.rating), 2) AS avg_rating,
    MIN(r.rating) AS min_rating,
    MAX(r.rating) AS max_rating
FROM USER u
JOIN PARKING_SPACE ps ON u.user_id = ps.host_user_id
JOIN BOOKING b ON ps.space_id = b.space_id
JOIN REVIEW r ON b.booking_id = r.booking_id AND r.reviewed_user_id = u.user_id
GROUP BY u.user_id, u.name
HAVING COUNT(r.review_id) >= 1 AND AVG(r.rating) >= 4.0;

-- 4. SUBQUERY: Find parking spaces that currently have ZERO active/blocking bookings
SELECT 
    ps.space_id, 
    ps.title, 
    ps.hourly_rate 
FROM PARKING_SPACE ps 
WHERE ps.listing_status = 'approved'
  AND ps.space_id NOT IN (
      SELECT DISTINCT b.space_id 
      FROM BOOKING b 
      WHERE b.booking_status IN ('pending_approval', 'pending_payment', 'confirmed', 'cancellation_requested')
        AND NOW() BETWEEN b.start_time AND b.end_time
  );

-- 5. COMPLEX JOIN & AGGREGATE: Total revenue generated per vehicle category
SELECT 
    ps.vehicle_category,
    COUNT(b.booking_id) AS total_completed_bookings,
    SUM(b.amount) AS total_revenue_inr
FROM PARKING_SPACE ps
JOIN BOOKING b ON ps.space_id = b.space_id
WHERE b.booking_status = 'completed'
GROUP BY ps.vehicle_category
ORDER BY total_revenue_inr DESC;
