-- GasLog SQLite Database Schema
-- All datetime values are stored in format: "yyyy-mm-dd hh:ii:ss"
-- No foreign keys or cascaded deletes used as per requirements

-- ===========================
-- USER Table
-- ===========================
-- Stores all users (registered or awaiting registration)
CREATE TABLE IF NOT EXISTS user (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255),
    created_date TEXT NOT NULL,
    logged_date TEXT,
    auth_code VARCHAR(6),
    validation_date TEXT,
    userhash VARCHAR(64) NOT NULL UNIQUE
);

-- Index for email lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_email ON user(email);
CREATE UNIQUE INDEX IF NOT EXISTS idx_userhash ON user(userhash);

-- ===========================
-- VEHICLE Table
-- ===========================
-- Stores vehicles owned by users
CREATE TABLE IF NOT EXISTS vehicle (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name VARCHAR(16) NOT NULL,
    brand VARCHAR(16),
    created_date TEXT NOT NULL,
    purchase_date TEXT,
    initial_mileage INTEGER,
    last_mileage INTEGER,
    distance_unit CHAR(2),
    fuels VARCHAR
);

-- Index for user_id lookups
CREATE INDEX IF NOT EXISTS idx_vehicle_user_id ON vehicle(user_id);
-- Index for vehicle name and user combination
CREATE UNIQUE INDEX IF NOT EXISTS idx_vehicle_user_name ON vehicle(user_id, name);

-- ===========================
-- STATION Table
-- ===========================
-- Stores gas stations used by users
CREATE TABLE IF NOT EXISTS station (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name VARCHAR(32) NOT NULL,
    created_date TEXT NOT NULL,
    last_usage_date TEXT,
    latitude REAL,
    longitude REAL,
    pluscode VARCHAR(10)
);

-- Index for user_id lookups
CREATE INDEX IF NOT EXISTS idx_station_user_id ON station(user_id);

-- ===========================
-- REFILL Table
-- ===========================
-- Stores refill records for vehicles
CREATE TABLE IF NOT EXISTS refill (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vehicle_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    refill_date TEXT NOT NULL,
    station_id INTEGER,
    fuel VARCHAR(16) NOT NULL,
    unit_price REAL NOT NULL,
    currency CHAR(1) NOT NULL,
    quantity REAL NOT NULL,
    total_price REAL NOT NULL,
    mileage INTEGER,
    station_info	TEXT
);

-- Index for vehicle_id lookups
CREATE INDEX IF NOT EXISTS idx_refill_vehicle_id ON refill(vehicle_id);
-- Index for user_id lookups
CREATE INDEX IF NOT EXISTS idx_refill_user_id ON refill(user_id);
-- Index for refill date queries (useful for statistics)
CREATE INDEX IF NOT EXISTS idx_refill_date ON refill(refill_date);
-- Index for station_id lookups
CREATE INDEX IF NOT EXISTS idx_refill_station_id ON refill(station_id);
