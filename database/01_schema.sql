-- Run only against a newly created, empty database selected by the client.
-- This file never creates, drops, or selects a database.


CREATE TABLE user (
  user_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(254) NOT NULL,
  phone VARCHAR(30) NULL,
  password_hash VARCHAR(255) NOT NULL DEFAULT '',
  account_status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  UNIQUE KEY uq_user_email (email),
  CONSTRAINT chk_user_account_status CHECK (account_status IN ('active', 'suspended', 'deactivated'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE city (
  city_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  city_name VARCHAR(100) NOT NULL,
  region VARCHAR(100) NULL,
  country VARCHAR(100) NOT NULL,
  timezone VARCHAR(64) NOT NULL,
  currency CHAR(3) NOT NULL,
  PRIMARY KEY (city_id),
  UNIQUE KEY uq_city_name_region_country (city_name, region, country)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE user_verification (
  verification_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  verification_type VARCHAR(30) NOT NULL,
  verification_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  verified_at DATETIME NULL,
  PRIMARY KEY (verification_id),
  KEY ix_user_verification_user_status (user_id, verification_status),
  CONSTRAINT fk_user_verification_user FOREIGN KEY (user_id) REFERENCES `user` (user_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_user_verification_type CHECK (verification_type IN ('phone_otp', 'email_confirmation')),
  CONSTRAINT chk_user_verification_status CHECK (verification_status IN ('pending', 'verified', 'rejected'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE parking_space (
  space_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  host_user_id INT UNSIGNED NOT NULL,
  city_id INT UNSIGNED NOT NULL,
  title VARCHAR(150) NOT NULL,
  description TEXT NULL,
  vehicle_category VARCHAR(40) NOT NULL,
  hourly_rate DECIMAL(10,2) NOT NULL,
  daily_rate DECIMAL(10,2) NULL,
  access_method VARCHAR(40) NOT NULL,
  approval_mode VARCHAR(20) NOT NULL DEFAULT 'instant',
  listing_status VARCHAR(24) NOT NULL DEFAULT 'pending_verification',
  approximate_latitude DECIMAL(10,7) NOT NULL,
  approximate_longitude DECIMAL(10,7) NOT NULL,
  PRIMARY KEY (space_id),
  KEY ix_parking_space_host (host_user_id),
  KEY ix_parking_space_city_status (city_id, listing_status),
  CONSTRAINT fk_parking_space_host FOREIGN KEY (host_user_id) REFERENCES `user` (user_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_parking_space_city FOREIGN KEY (city_id) REFERENCES city (city_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_parking_space_rates CHECK (hourly_rate >= 0 AND (daily_rate IS NULL OR daily_rate >= 0)),
  CONSTRAINT chk_parking_space_latitude CHECK (approximate_latitude BETWEEN -90 AND 90),
  CONSTRAINT chk_parking_space_longitude CHECK (approximate_longitude BETWEEN -180 AND 180),
  CONSTRAINT chk_parking_space_vehicle CHECK (vehicle_category IN ('compact_car', 'suv', 'two_wheeler', 'ev_car', 'all')),
  CONSTRAINT chk_parking_space_access CHECK (access_method IN ('open_driveway', 'barrier_gate', 'automated_code', 'host_meet', 'key_pass')),
  CONSTRAINT chk_parking_space_approval CHECK (approval_mode IN ('instant', 'manual_5min', 'manual_10min', 'manual_30min')),
  CONSTRAINT chk_parking_space_status CHECK (listing_status IN ('pending_verification', 'approved', 'rejected', 'suspended'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE private_space_location (
  space_id INT UNSIGNED NOT NULL,
  exact_address VARCHAR(500) NOT NULL,
  precise_latitude DECIMAL(10,7) NOT NULL,
  precise_longitude DECIMAL(10,7) NOT NULL,
  private_notes TEXT NULL,
  PRIMARY KEY (space_id),
  CONSTRAINT fk_private_space_location_space FOREIGN KEY (space_id) REFERENCES parking_space (space_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_private_space_latitude CHECK (precise_latitude BETWEEN -90 AND 90),
  CONSTRAINT chk_private_space_longitude CHECK (precise_longitude BETWEEN -180 AND 180)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE availability_window (
  availability_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  space_id INT UNSIGNED NOT NULL,
  start_time DATETIME NOT NULL,
  end_time DATETIME NOT NULL,
  availability_status VARCHAR(20) NOT NULL DEFAULT 'available',
  PRIMARY KEY (availability_id),
  UNIQUE KEY uq_availability_space_id (space_id, availability_id),
  KEY ix_availability_space_time (space_id, start_time, end_time),
  CONSTRAINT fk_availability_space FOREIGN KEY (space_id) REFERENCES parking_space (space_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_availability_time CHECK (end_time > start_time),
  CONSTRAINT chk_availability_status CHECK (availability_status IN ('available', 'unavailable', 'cancelled'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE listing_verification (
  listing_verification_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  space_id INT UNSIGNED NOT NULL,
  reviewer_user_id INT UNSIGNED NOT NULL,
  verification_status VARCHAR(24) NOT NULL DEFAULT 'pending',
  decision_at DATETIME NULL,
  PRIMARY KEY (listing_verification_id),
  KEY ix_listing_verification_space_status (space_id, verification_status),
  CONSTRAINT fk_listing_verification_space FOREIGN KEY (space_id) REFERENCES parking_space (space_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_listing_verification_reviewer FOREIGN KEY (reviewer_user_id) REFERENCES `user` (user_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_listing_verification_status CHECK (verification_status IN ('pending', 'approved', 'rejected', 'changes_requested'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE booking (
  booking_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  space_id INT UNSIGNED NOT NULL,
  driver_user_id INT UNSIGNED NOT NULL,
  availability_id INT UNSIGNED NOT NULL,
  start_time DATETIME NOT NULL,
  end_time DATETIME NOT NULL,
  booking_type VARCHAR(20) NOT NULL,
  booking_status VARCHAR(24) NOT NULL DEFAULT 'pending_approval',
  amount DECIMAL(10,2) NOT NULL,
  currency CHAR(3) NOT NULL,
  cancellation_reason VARCHAR(500) NULL,
  hold_expires_at DATETIME NULL,
  confirmed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (booking_id),
  KEY ix_booking_space_interval (space_id, start_time, end_time),
  KEY ix_booking_driver_status (driver_user_id, booking_status),
  KEY ix_booking_expiry (booking_status, hold_expires_at),
  CONSTRAINT fk_booking_space FOREIGN KEY (space_id) REFERENCES parking_space (space_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_booking_driver FOREIGN KEY (driver_user_id) REFERENCES `user` (user_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_booking_availability_same_space FOREIGN KEY (space_id, availability_id) REFERENCES availability_window (space_id, availability_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_booking_time CHECK (end_time > start_time),
  CONSTRAINT chk_booking_amount CHECK (amount >= 0),
  CONSTRAINT chk_booking_type CHECK (booking_type IN ('instant', 'owner_approved')),
  CONSTRAINT chk_booking_status CHECK (booking_status IN ('pending_approval', 'pending_payment', 'confirmed', 'completed', 'cancelled', 'declined', 'expired', 'cancellation_requested', 'no_show'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE payment_attempt (
  payment_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  booking_id INT UNSIGNED NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency CHAR(3) NOT NULL,
  payment_method VARCHAR(30) NOT NULL,
  payment_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  payment_reference VARCHAR(120) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (payment_id),
  UNIQUE KEY uq_payment_reference (payment_reference),
  KEY ix_payment_booking_status (booking_id, payment_status),
  CONSTRAINT fk_payment_attempt_booking FOREIGN KEY (booking_id) REFERENCES booking (booking_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_payment_amount CHECK (amount >= 0),
  CONSTRAINT chk_payment_method CHECK (payment_method IN ('upi', 'card', 'net_banking')),
  CONSTRAINT chk_payment_status CHECK (payment_status IN ('pending', 'successful', 'failed', 'refunded'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE booking_access_detail (
  access_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  booking_id INT UNSIGNED NOT NULL,
  access_instructions TEXT NOT NULL,
  release_at DATETIME NOT NULL,
  expiry_at DATETIME NOT NULL,
  PRIMARY KEY (access_id),
  UNIQUE KEY uq_booking_access_detail_booking (booking_id),
  CONSTRAINT fk_booking_access_detail_booking FOREIGN KEY (booking_id) REFERENCES booking (booking_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_booking_access_detail_expiry CHECK (expiry_at > release_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE review (
  review_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  booking_id INT UNSIGNED NOT NULL,
  reviewer_user_id INT UNSIGNED NOT NULL,
  reviewed_user_id INT UNSIGNED NOT NULL,
  rating TINYINT UNSIGNED NOT NULL,
  comment TEXT NULL,
  PRIMARY KEY (review_id),
  UNIQUE KEY uq_review_booking_reviewer (booking_id, reviewer_user_id),
  KEY ix_review_reviewed_user (reviewed_user_id),
  CONSTRAINT fk_review_booking FOREIGN KEY (booking_id) REFERENCES booking (booking_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_review_reviewer FOREIGN KEY (reviewer_user_id) REFERENCES `user` (user_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_review_reviewed_user FOREIGN KEY (reviewed_user_id) REFERENCES `user` (user_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_review_rating CHECK (rating BETWEEN 1 AND 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE dispute (
  dispute_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  booking_id INT UNSIGNED NOT NULL,
  reporter_user_id INT UNSIGNED NOT NULL,
  administrator_user_id INT UNSIGNED NULL,
  issue_type VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  dispute_status VARCHAR(20) NOT NULL DEFAULT 'open',
  resolution TEXT NULL,
  PRIMARY KEY (dispute_id),
  KEY ix_dispute_status (dispute_status),
  CONSTRAINT fk_dispute_booking FOREIGN KEY (booking_id) REFERENCES booking (booking_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_dispute_reporter FOREIGN KEY (reporter_user_id) REFERENCES `user` (user_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_dispute_administrator FOREIGN KEY (administrator_user_id) REFERENCES `user` (user_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_dispute_issue_type CHECK (issue_type IN ('space_occupied', 'access_denied', 'cleanliness', 'early_late_overstay', 'owner_cancellation', 'other')),
  CONSTRAINT chk_dispute_status CHECK (dispute_status IN ('open', 'under_review', 'resolved', 'rejected', 'closed'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
