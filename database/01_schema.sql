-- =====================================================================
-- PARKO DATABASE SCHEMA
-- Exactly 12 Entities and 83 Attributes (Frozen Schema Contract)
-- =====================================================================

DROP DATABASE IF EXISTS parko_db;
CREATE DATABASE parko_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE parko_db;

-- 1. USER (7 attributes)
CREATE TABLE USER (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    account_status ENUM('active', 'suspended', 'pending') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. CITY (6 attributes)
CREATE TABLE CITY (
    city_id INT AUTO_INCREMENT PRIMARY KEY,
    city_name VARCHAR(100) NOT NULL,
    region VARCHAR(100) NOT NULL,
    country VARCHAR(100) NOT NULL,
    timezone VARCHAR(50) NOT NULL,
    currency VARCHAR(10) NOT NULL
) ENGINE=InnoDB;

-- 3. PARKING_SPACE (13 attributes)
CREATE TABLE PARKING_SPACE (
    space_id INT AUTO_INCREMENT PRIMARY KEY,
    host_user_id INT NOT NULL,
    city_id INT NOT NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    vehicle_category ENUM('two_wheeler', 'compact_car', 'suv', 'ev_car', 'all') NOT NULL,
    hourly_rate DECIMAL(10,2) NOT NULL,
    daily_rate DECIMAL(10,2) NOT NULL,
    access_method ENUM('key_pass', 'barrier_gate', 'automated_code', 'host_meet', 'open_driveway') NOT NULL,
    approval_mode ENUM('instant', 'manual_5min', 'manual_10min', 'manual_30min') NOT NULL DEFAULT 'instant',
    listing_status ENUM('pending_verification', 'approved', 'rejected', 'suspended') NOT NULL DEFAULT 'pending_verification',
    approximate_latitude DECIMAL(10,7) NOT NULL,
    approximate_longitude DECIMAL(10,7) NOT NULL,
    CONSTRAINT fk_space_host FOREIGN KEY (host_user_id) REFERENCES USER(user_id) ON DELETE RESTRICT,
    CONSTRAINT fk_space_city FOREIGN KEY (city_id) REFERENCES CITY(city_id) ON DELETE RESTRICT,
    INDEX idx_space_city_status (city_id, listing_status),
    INDEX idx_space_coords (approximate_latitude, approximate_longitude)
) ENGINE=InnoDB;

-- 4. PRIVATE_SPACE_LOCATION (5 attributes)
CREATE TABLE PRIVATE_SPACE_LOCATION (
    space_id INT PRIMARY KEY,
    exact_address VARCHAR(255) NOT NULL,
    precise_latitude DECIMAL(10,7) NOT NULL,
    precise_longitude DECIMAL(10,7) NOT NULL,
    private_notes TEXT,
    CONSTRAINT fk_private_space FOREIGN KEY (space_id) REFERENCES PARKING_SPACE(space_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 5. AVAILABILITY_WINDOW (5 attributes)
CREATE TABLE AVAILABILITY_WINDOW (
    availability_id INT AUTO_INCREMENT PRIMARY KEY,
    space_id INT NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    availability_status ENUM('available', 'partially_booked', 'booked', 'cancelled') NOT NULL DEFAULT 'available',
    CONSTRAINT fk_avail_space FOREIGN KEY (space_id) REFERENCES PARKING_SPACE(space_id) ON DELETE CASCADE,
    CONSTRAINT chk_avail_times CHECK (end_time > start_time),
    UNIQUE KEY unq_avail_space (availability_id, space_id),
    INDEX idx_avail_window (space_id, start_time, end_time, availability_status)
) ENGINE=InnoDB;

-- 6. BOOKING (11 attributes)
CREATE TABLE BOOKING (
    booking_id INT AUTO_INCREMENT PRIMARY KEY,
    space_id INT NOT NULL,
    driver_user_id INT NOT NULL,
    availability_id INT NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    booking_type ENUM('instant', 'owner_approved') NOT NULL,
    booking_status ENUM('pending_approval', 'pending_payment', 'confirmed', 'completed', 'cancelled', 'declined', 'expired', 'cancellation_requested') NOT NULL DEFAULT 'pending_approval',
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    cancellation_reason VARCHAR(255),
    CONSTRAINT fk_booking_space FOREIGN KEY (space_id) REFERENCES PARKING_SPACE(space_id) ON DELETE RESTRICT,
    CONSTRAINT fk_booking_driver FOREIGN KEY (driver_user_id) REFERENCES USER(user_id) ON DELETE RESTRICT,
    CONSTRAINT fk_booking_avail_space FOREIGN KEY (availability_id, space_id) REFERENCES AVAILABILITY_WINDOW(availability_id, space_id) ON DELETE RESTRICT,
    CONSTRAINT chk_booking_times CHECK (end_time > start_time),
    INDEX idx_booking_space_times (space_id, start_time, end_time, booking_status),
    INDEX idx_booking_driver (driver_user_id, booking_status)
) ENGINE=InnoDB;

-- 7. PAYMENT_ATTEMPT (7 attributes)
CREATE TABLE PAYMENT_ATTEMPT (
    payment_id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    payment_method ENUM('card', 'upi', 'net_banking', 'wallet') NOT NULL,
    payment_status ENUM('pending', 'successful', 'failed', 'refunded') NOT NULL DEFAULT 'pending',
    payment_reference VARCHAR(100) NOT NULL UNIQUE,
    CONSTRAINT fk_payment_booking FOREIGN KEY (booking_id) REFERENCES BOOKING(booking_id) ON DELETE RESTRICT,
    INDEX idx_payment_booking (booking_id, payment_status)
) ENGINE=InnoDB;

-- 8. USER_VERIFICATION (5 attributes)
CREATE TABLE USER_VERIFICATION (
    verification_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    verification_type ENUM('phone_otp', 'government_id', 'driving_license', 'email_confirmation') NOT NULL,
    verification_status ENUM('pending', 'verified', 'rejected') NOT NULL DEFAULT 'pending',
    verified_at DATETIME,
    CONSTRAINT fk_user_verif FOREIGN KEY (user_id) REFERENCES USER(user_id) ON DELETE CASCADE,
    INDEX idx_user_verif (user_id, verification_status)
) ENGINE=InnoDB;

-- 9. LISTING_VERIFICATION (5 attributes)
CREATE TABLE LISTING_VERIFICATION (
    listing_verification_id INT AUTO_INCREMENT PRIMARY KEY,
    space_id INT NOT NULL,
    reviewer_user_id INT NOT NULL,
    verification_status ENUM('pending', 'approved', 'rejected', 'changes_requested') NOT NULL DEFAULT 'pending',
    decision_at DATETIME,
    CONSTRAINT fk_listing_verif_space FOREIGN KEY (space_id) REFERENCES PARKING_SPACE(space_id) ON DELETE CASCADE,
    CONSTRAINT fk_listing_verif_reviewer FOREIGN KEY (reviewer_user_id) REFERENCES USER(user_id) ON DELETE RESTRICT,
    INDEX idx_listing_verif_space (space_id, verification_status)
) ENGINE=InnoDB;

-- 10. BOOKING_ACCESS_DETAIL (5 attributes)
CREATE TABLE BOOKING_ACCESS_DETAIL (
    access_id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL UNIQUE,
    access_instructions TEXT NOT NULL,
    release_at DATETIME NOT NULL,
    expiry_at DATETIME NOT NULL,
    CONSTRAINT fk_access_booking FOREIGN KEY (booking_id) REFERENCES BOOKING(booking_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 11. REVIEW (6 attributes)
CREATE TABLE REVIEW (
    review_id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL,
    reviewer_user_id INT NOT NULL,
    reviewed_user_id INT NOT NULL,
    rating TINYINT UNSIGNED NOT NULL,
    comment TEXT,
    CONSTRAINT fk_review_booking FOREIGN KEY (booking_id) REFERENCES BOOKING(booking_id) ON DELETE CASCADE,
    CONSTRAINT fk_review_reviewer FOREIGN KEY (reviewer_user_id) REFERENCES USER(user_id) ON DELETE RESTRICT,
    CONSTRAINT fk_review_reviewed FOREIGN KEY (reviewed_user_id) REFERENCES USER(user_id) ON DELETE RESTRICT,
    CONSTRAINT chk_rating_range CHECK (rating >= 1 AND rating <= 5),
    CONSTRAINT unq_booking_reviewer UNIQUE (booking_id, reviewer_user_id)
) ENGINE=InnoDB;

-- 12. DISPUTE (8 attributes)
CREATE TABLE DISPUTE (
    dispute_id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL,
    reporter_user_id INT NOT NULL,
    administrator_user_id INT,
    issue_type ENUM('space_occupied', 'access_denied', 'cleanliness', 'early_late_overstay', 'owner_cancellation', 'other') NOT NULL,
    description TEXT NOT NULL,
    dispute_status ENUM('open', 'under_investigation', 'resolved', 'dismissed') NOT NULL DEFAULT 'open',
    resolution TEXT,
    CONSTRAINT fk_dispute_booking FOREIGN KEY (booking_id) REFERENCES BOOKING(booking_id) ON DELETE RESTRICT,
    CONSTRAINT fk_dispute_reporter FOREIGN KEY (reporter_user_id) REFERENCES USER(user_id) ON DELETE RESTRICT,
    CONSTRAINT fk_dispute_admin FOREIGN KEY (administrator_user_id) REFERENCES USER(user_id) ON DELETE RESTRICT,
    INDEX idx_dispute_status (dispute_status)
) ENGINE=InnoDB;
