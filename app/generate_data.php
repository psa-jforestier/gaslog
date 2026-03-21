<?php
/**
 * This script generate fake data for testing purposes.
 * It generates SQL insert for the refills table
 CREATE TABLE "refill" (
	"id"	INTEGER,
	"vehicle_id"	INTEGER NOT NULL,
	"user_id"	INTEGER NOT NULL,
	"refill_date"	TEXT NOT NULL,
	"station_id"	INTEGER,
	"fuel"	VARCHAR(16) NOT NULL,
	"unit_price"	REAL NOT NULL,
	"currency"	CHAR(1) NOT NULL,
	"quantity"	REAL NOT NULL,
	"total_price"	REAL NOT NULL,
	"mileage"	INTEGER,
	"station_info"	TEXT,
	PRIMARY KEY("id" AUTOINCREMENT)
)
 */

$vehicleid = 7;
$userid = 2;
$currency = "€";

$mileage_begin = 0;
$date_begin = strtotime("-10 years");
$date_end = time();
$fuel_price_min = 1.3;
$fuel_price_max = 2.2;
$fuels = array("SP95E10", "SP95E10","SP95E10","SP95E10","SP95E10","SP95E5");
$quantity_min = 20;
$quantity_max = 40;
$distance_min_per_refill = 300;
$distance_max_per_refill = 400;

$mileage = $mileage_begin;
$date = $date_begin;
$n = 0;
$fuel_price = $fuel_price_min;
while($date < $date_end) {
    $n++;
    $fuel = $fuels[array_rand($fuels)];
    $fuel_increment = (rand(-80,100) / 1000) ;
    $fuel_price += $fuel_increment;
    if ($fuel_price < $fuel_price_min) $fuel_price = $fuel_price_min;
    if ($fuel_price > $fuel_price_max) $fuel_price = $fuel_price_max;

    $quantity = rand($quantity_min * 10, $quantity_max * 10) / 10;
    $total_price = round($fuel_price * $quantity, 2);
    $distance = rand($distance_min_per_refill, $distance_max_per_refill) + $quantity;
    $mileage = round($mileage + $distance);
    $date += rand(7 * 24 * 3600, 30 * 24 * 3600); // between 1 week and 1 month

    echo "/** $n **/ INSERT INTO refill (vehicle_id, user_id, refill_date, mileage, fuel, quantity, unit_price, total_price, currency) VALUES ($vehicleid, $userid, \n  '" . date("Y-m-d H:i:s", $date) . "', $mileage, '$fuel', $quantity, $fuel_price, $total_price, '$currency');\n";
}   



