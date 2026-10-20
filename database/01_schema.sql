
CREATE DATABASE IF NOT EXISTS decentralized_shared_parking
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

USE decentralized_shared_parking;

-- Re-run convenience for a clean development database.
-- Drop child tables before parent tables.
DROP TABLE IF EXISTS DISPUTE;
DROP TABLE IF EXISTS REVIEW;
DROP TABLE IF EXISTS BOOKING_ACCESS_DETAIL;
DROP TABLE IF EXISTS PAYMENT_ATTEMPT;
DROP TABLE IF EXISTS BOOKING;
DROP TABLE IF EXISTS LISTING_VERIFICATION;
DROP TABLE IF EXISTS AVAILABILITY_WINDOW;
DROP TABLE IF EXISTS PRIVATE_SPACE_LOCATION;
DROP TABLE IF EXISTS PARKING_SPACE;
DROP TABLE IF EXISTS USER_VERIFICATION;
DROP TABLE IF EXISTS CITY;
DROP TABLE IF EXISTS `USER`;

CREATE TABLE `USER` (
  user_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(254) NOT NULL,
  phone VARCHAR(30) NULL,
  password_hash VARCHAR(255) NOT NULL,
  account_status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_user PRIMARY KEY (user_id),
  CONSTRAINT uq_user_email UNIQUE (email),
  CONSTRAINT chk_user_account_status
    CHECK (account_status IN ('active', 'suspended', 'deactivated'))
) ENGINE=InnoDB;

CREATE TABLE CITY (
  city_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  city_name VARCHAR(100) NOT NULL,
  region VARCHAR(100) NULL,
  country VARCHAR(100) NOT NULL,
  timezone VARCHAR(64) NOT NULL,
  currency CHAR(3) NOT NULL,
  CONSTRAINT pk_city PRIMARY KEY (city_id),
  CONSTRAINT uq_city_name_region_country UNIQUE (city_name, region, country)
) ENGINE=InnoDB;

CREATE TABLE USER_VERIFICATION (
  verification_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  verification_type VARCHAR(30) NOT NULL,
  verification_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  verified_at DATETIME NULL,
  CONSTRAINT pk_user_verification PRIMARY KEY (verification_id),
  CONSTRAINT fk_user_verification_user
    FOREIGN KEY (user_id) REFERENCES `USER` (user_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_user_verification_type
    CHECK (verification_type IN ('phone', 'identity')),
  CONSTRAINT chk_user_verification_status
    CHECK (verification_status IN ('pending', 'verified', 'rejected', 'expired'))
) ENGINE=InnoDB;

CREATE TABLE PARKING_SPACE (
  space_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  host_user_id INT UNSIGNED NOT NULL,
  city_id INT UNSIGNED NOT NULL,
  title VARCHAR(150) NOT NULL,
  description TEXT NULL,
  vehicle_category VARCHAR(40) NOT NULL,
  hourly_rate DECIMAL(10,2) NULL,
  daily_rate DECIMAL(10,2) NULL,
  access_method VARCHAR(40) NOT NULL,
  approval_mode VARCHAR(20) NOT NULL DEFAULT 'automatic',
  listing_status VARCHAR(20) NOT NULL DEFAULT 'draft',
  approximate_latitude DECIMAL(9,6) NOT NULL,
  approximate_longitude DECIMAL(9,6) NOT NULL,
  CONSTRAINT pk_parking_space PRIMARY KEY (space_id),
  CONSTRAINT fk_parking_space_host
    FOREIGN KEY (host_user_id) REFERENCES `USER` (user_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_parking_space_city
    FOREIGN KEY (city_id) REFERENCES CITY (city_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_parking_space_rates
    CHECK (
      (hourly_rate IS NULL OR hourly_rate >= 0)
      AND (daily_rate IS NULL OR daily_rate >= 0)
      AND (hourly_rate IS NOT NULL OR daily_rate IS NOT NULL)
    ),
  CONSTRAINT chk_parking_space_latitude
    CHECK (approximate_latitude BETWEEN -90 AND 90),
  CONSTRAINT chk_parking_space_longitude
    CHECK (approximate_longitude BETWEEN -180 AND 180),
  CONSTRAINT chk_parking_space_approval_mode
    CHECK (approval_mode IN ('automatic', 'provider')),
  CONSTRAINT chk_parking_space_listing_status
    CHECK (listing_status IN ('draft', 'pending', 'active', 'rejected', 'deactivated'))
) ENGINE=InnoDB;

CREATE TABLE PRIVATE_SPACE_LOCATION (
  space_id INT UNSIGNED NOT NULL,
  exact_address VARCHAR(500) NOT NULL,
  precise_latitude DECIMAL(9,6) NULL,
  precise_longitude DECIMAL(9,6) NULL,
  private_notes TEXT NULL,
  CONSTRAINT pk_private_space_location PRIMARY KEY (space_id),
  CONSTRAINT fk_private_location_space
    FOREIGN KEY (space_id) REFERENCES PARKING_SPACE (space_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_private_latitude
    CHECK (precise_latitude IS NULL OR precise_latitude BETWEEN -90 AND 90),
  CONSTRAINT chk_private_longitude
    CHECK (precise_longitude IS NULL OR precise_longitude BETWEEN -180 AND 180)
) ENGINE=InnoDB;

CREATE TABLE AVAILABILITY_WINDOW (
  availability_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  space_id INT UNSIGNED NOT NULL,
  start_time DATETIME NOT NULL,
  end_time DATETIME NOT NULL,
  availability_status VARCHAR(20) NOT NULL DEFAULT 'available',
  CONSTRAINT pk_availability_window PRIMARY KEY (availability_id),
  -- Supports a composite FK from BOOKING to ensure the selected window belongs
  -- to the same parking space as the booking.
  CONSTRAINT uq_availability_space_id UNIQUE (space_id, availability_id),
  CONSTRAINT fk_availability_space
    FOREIGN KEY (space_id) REFERENCES PARKING_SPACE (space_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_availability_time CHECK (end_time > start_time),
  CONSTRAINT chk_availability_status
    CHECK (availability_status IN ('available', 'unavailable', 'cancelled')),
  INDEX ix_availability_space_time (space_id, start_time, end_time)
) ENGINE=InnoDB;

CREATE TABLE LISTING_VERIFICATION (
  listing_verification_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  space_id INT UNSIGNED NOT NULL,
  reviewer_user_id INT UNSIGNED NOT NULL,
  verification_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  decision_at DATETIME NULL,
  CONSTRAINT pk_listing_verification PRIMARY KEY (listing_verification_id),
  CONSTRAINT fk_listing_verification_space
    FOREIGN KEY (space_id) REFERENCES PARKING_SPACE (space_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_listing_verification_reviewer
    FOREIGN KEY (reviewer_user_id) REFERENCES `USER` (user_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_listing_verification_status
    CHECK (verification_status IN ('pending', 'approved', 'rejected'))
) ENGINE=InnoDB;

CREATE TABLE BOOKING (
  booking_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  space_id INT UNSIGNED NOT NULL,
  driver_user_id INT UNSIGNED NOT NULL,
  availability_id INT UNSIGNED NOT NULL,
  start_time DATETIME NOT NULL,
  end_time DATETIME NOT NULL,
  booking_type VARCHAR(20) NOT NULL,
  booking_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  amount DECIMAL(10,2) NOT NULL,
  currency CHAR(3) NOT NULL,
  cancellation_reason VARCHAR(500) NULL,
  CONSTRAINT pk_booking PRIMARY KEY (booking_id),
  CONSTRAINT fk_booking_space
    FOREIGN KEY (space_id) REFERENCES PARKING_SPACE (space_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_booking_driver
    FOREIGN KEY (driver_user_id) REFERENCES `USER` (user_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_booking_availability_same_space
    FOREIGN KEY (space_id, availability_id)
    REFERENCES AVAILABILITY_WINDOW (space_id, availability_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_booking_time CHECK (end_time > start_time),
  CONSTRAINT chk_booking_amount CHECK (amount >= 0),
  CONSTRAINT chk_booking_type CHECK (booking_type IN ('immediate', 'scheduled')),
  CONSTRAINT chk_booking_status
    CHECK (booking_status IN ('pending', 'confirmed', 'declined', 'cancelled', 'completed', 'no_show')),
  INDEX ix_booking_space_interval (space_id, start_time, end_time),
  INDEX ix_booking_driver_status (driver_user_id, booking_status)
) ENGINE=InnoDB;

CREATE TABLE PAYMENT_ATTEMPT (
  payment_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  booking_id INT UNSIGNED NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency CHAR(3) NOT NULL,
  payment_method VARCHAR(30) NOT NULL,
  payment_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  payment_reference VARCHAR(120) NULL,
  CONSTRAINT pk_payment_attempt PRIMARY KEY (payment_id),
  CONSTRAINT fk_payment_attempt_booking
    FOREIGN KEY (booking_id) REFERENCES BOOKING (booking_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_payment_amount CHECK (amount >= 0),
  CONSTRAINT chk_payment_method
    CHECK (payment_method IN ('demo_card', 'demo_wallet', 'cash_demo', 'other_demo')),
  CONSTRAINT chk_payment_status
    CHECK (payment_status IN ('pending', 'successful', 'failed', 'refunded')),
  INDEX ix_payment_booking_status (booking_id, payment_status)
) ENGINE=InnoDB;

CREATE TABLE BOOKING_ACCESS_DETAIL (
  access_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  booking_id INT UNSIGNED NOT NULL,
  access_instructions TEXT NOT NULL,
  release_at DATETIME NULL,
  expiry_at DATETIME NULL,
  CONSTRAINT pk_booking_access_detail PRIMARY KEY (access_id),
  CONSTRAINT uq_access_detail_booking UNIQUE (booking_id),
  CONSTRAINT fk_access_detail_booking
    FOREIGN KEY (booking_id) REFERENCES BOOKING (booking_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_access_detail_expiry
    CHECK (expiry_at IS NULL OR release_at IS NULL OR expiry_at > release_at)
) ENGINE=InnoDB;


CREATE TABLE REVIEW (
  review_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  booking_id INT UNSIGNED NOT NULL,
  reviewer_user_id INT UNSIGNED NOT NULL,
  reviewed_user_id INT UNSIGNED NOT NULL,
  rating TINYINT UNSIGNED NOT NULL,
  comment TEXT NULL,

  CONSTRAINT pk_review PRIMARY KEY (review_id),

  CONSTRAINT fk_review_booking
    FOREIGN KEY (booking_id) REFERENCES BOOKING (booking_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,

  CONSTRAINT fk_review_reviewer
    FOREIGN KEY (reviewer_user_id) REFERENCES `USER` (user_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,

  CONSTRAINT fk_review_reviewed_user
    FOREIGN KEY (reviewed_user_id) REFERENCES `USER` (user_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,

  CONSTRAINT chk_review_rating
    CHECK (rating BETWEEN 1 AND 5),

  CONSTRAINT uq_review_booking_reviewer
    UNIQUE (booking_id, reviewer_user_id)
) ENGINE=InnoDB;


CREATE TABLE DISPUTE (
  dispute_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  booking_id INT UNSIGNED NOT NULL,
  reporter_user_id INT UNSIGNED NOT NULL,
  administrator_user_id INT UNSIGNED NULL,
  issue_type VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  dispute_status VARCHAR(20) NOT NULL DEFAULT 'open',
  resolution TEXT NULL,
  CONSTRAINT pk_dispute PRIMARY KEY (dispute_id),
  CONSTRAINT fk_dispute_booking
    FOREIGN KEY (booking_id) REFERENCES BOOKING (booking_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_dispute_reporter
    FOREIGN KEY (reporter_user_id) REFERENCES `USER` (user_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_dispute_administrator
    FOREIGN KEY (administrator_user_id) REFERENCES `USER` (user_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_dispute_status
    CHECK (dispute_status IN ('open', 'under_review', 'resolved', 'rejected', 'closed')),
  INDEX ix_dispute_status (dispute_status)
) ENGINE=InnoDB;

-- Quick verification after execution:
SHOW TABLES;
