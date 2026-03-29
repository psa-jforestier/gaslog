-- GasLog SQLite Database Schema - to store the Gas Stations location
-- All datetime values are stored in format: "yyyy-mm-dd hh:ii:ss"
-- No foreign keys or cascaded deletes used as per requirements
CREATE TABLE "stations" (
	"id"	INTEGER NOT NULL UNIQUE,
	"latitude"	REAL,
	"longitude"	REAL,
	"zipcode"	VARCHAR(16),
	"address"	NUMERIC,
	"city"	TEXT,
	"country"	VARCHAR(3),
	"created_date"	TEXT NOT NULL,
	"updated_date"	TEXT,
	"name"	TEXT,
	"brand"	TEXT,
	PRIMARY KEY("id")
)