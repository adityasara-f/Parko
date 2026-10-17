-- =====================================================================
-- PARKO DATABASE INTEGRITY TESTS
-- Automated SQL validation of constraints and entity contract
-- =====================================================================

USE parko_db;

-- Test 1: Verify Table Count is strictly 12 (Excluding SQL Views)
SELECT 
    CASE WHEN COUNT(*) = 12 THEN 'PASS: Exactly 12 base tables present' 
         ELSE CONCAT('FAIL: Found ', COUNT(*), ' base tables') END AS test_result
FROM information_schema.tables 
WHERE table_schema = 'parko_db' AND table_type = 'BASE TABLE';

-- Test 2: Verify Total Attributes Count across the 12 Base Tables is strictly 83
SELECT 
    CASE WHEN SUM(col_count) = 83 THEN 'PASS: Exactly 83 attributes present in 12 entities' 
         ELSE CONCAT('FAIL: Found ', SUM(col_count), ' attributes') END AS test_result
FROM (
    SELECT c.table_name, COUNT(*) AS col_count 
    FROM information_schema.columns c
    JOIN information_schema.tables t ON c.table_schema = t.table_schema AND c.table_name = t.table_name
    WHERE c.table_schema = 'parko_db' AND t.table_type = 'BASE TABLE'
    GROUP BY c.table_name
) AS t;

-- Test 3: Foreign Key and Cascade Check - Verify every parking space has a private location record
SELECT 
    CASE WHEN COUNT(*) = 0 THEN 'PASS: All parking spaces have corresponding private location records'
         ELSE 'FAIL: Parking spaces without private locations found' END AS test_result
FROM PARKING_SPACE ps
LEFT JOIN PRIVATE_SPACE_LOCATION psl ON ps.space_id = psl.space_id
WHERE psl.space_id IS NULL;

-- Test 4: Positive booking duration constraint check
SELECT 
    CASE WHEN COUNT(*) = 0 THEN 'PASS: No invalid booking durations exist'
         ELSE 'FAIL: Invalid booking intervals found' END AS test_result
FROM BOOKING
WHERE end_time <= start_time;

-- Test 5: Rating boundaries constraint check (1 to 5)
SELECT 
    CASE WHEN COUNT(*) = 0 THEN 'PASS: All ratings are between 1 and 5'
         ELSE 'FAIL: Invalid ratings found' END AS test_result
FROM REVIEW
WHERE rating < 1 OR rating > 5;
