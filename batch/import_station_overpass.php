<?php
/**
 * This script is used to load gas station data
 * from OpenStreetMap using the Overpass API.
 * It takes a country code as an argument (e.g. "fr" for France) and imports the fuel stations in that country into the database.
 * Known to work with country : fr, be, ch, gb
 * The script will first check if a local JSON file with the Overpass data already exists (data/stations_overpass_$country.json). If it does, it will use that file for import. If not, it will download the data from the Overpass API and save it to that file for future use.
 * The script will then parse the JSON data, extract relevant information about each station (id, latitude, longitude, address, city, country, name, brand), and insert or update the station in the database.
 * The script will also output some statistics about the import process, such as the number of valid stations imported.
 * It can take 3 minutes to get the data from Overpass, then a few seconds to import in the database.
 * You can crontab this script to run periodically.
 * When the script is run, delete temporary files in the data/ directory to force a fresh download from Overpass, which will ensure that you get the latest data. You can also run the script with a specific country code to update only that country's data.
 * Example usage:
 *  php batch/import_station_overpass.php FR && rm data/stations_overpass_FR.json
 */

include_once dirname(__FILE__) . '/../app/.config.php';
include_once dirname(__FILE__) . '/.config.php';
include_once dirname(__FILE__) . '/../app/include.php';
include_once dirname(__FILE__) . '/../app/classStation.php';
include_once dirname(__FILE__) . '/../app/utils.php';
// get the country from the command line
$country = $argv[1] ?? null;
if ($country === null) {
    die("Usage: php import_station_overpass_fr.php <country_code>\n");
    // valid country : fr, be, ch, gb
}


$country = strtoupper($country);
$query = <<<EOT
[out:json][timeout:180];
area["ISO3166-1"="$country"]->.country;
(
  nwr["amenity"="fuel"](area.country);
);
out center tags;
EOT;

$rawdata = __DIR__ . "/../data/stations_overpass_$country.json";
if (!file_exists($rawdata))
{
  // download data from overpass API
  $url = "https://overpass-api.de/api/interpreter";
  $ch = curl_init($url);
  curl_setopt_array($ch, [
    CURLOPT_POST            => true,
    CURLOPT_RETURNTRANSFER  => true,
    CURLOPT_HTTPHEADER      => ["Content-Type: application/x-www-form-urlencoded; charset=UTF-8"],
    CURLOPT_POSTFIELDS      => http_build_query(["data" => $query], "", "&"),
    CURLOPT_CONNECTTIMEOUT  => 10,
    CURLOPT_TIMEOUT         => 180,
    CURLOPT_SSL_VERIFYPEER  => false,
    CURLOPT_SSL_VERIFYHOST  => false,
    CURLOPT_ACCEPT_ENCODING => '', // allow all encodings, so that the server can send gzip-compressed data, which is much faster to download and parse
    CURLOPT_USERAGENT       => "GasLog/1.0 (contact: gaslog@forestier.xyz)", // good practice for Overpass
  ]);
  DEBUG("Downloading data from Overpass API...");
  $raw = curl_exec($ch);
  $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  if ($raw === false)
  {
    $err = curl_error($ch);
    curl_close($ch);
    die("Request failed (curl): $err");
  }
  $timestamp = curl_getinfo($ch, CURLINFO_FILETIME);
  curl_close($ch);
  // save data to file for debugging
  if ($httpCode >= 400)
  {
    die("Request failed with HTTP code $httpCode");
  }
  DEBUG("Download completed with HTTP code $httpCode, saving to file...");
  file_put_contents($rawdata, $raw);
}

DEBUG("Using file $rawdata for import.");

$data = json_decode(file_get_contents($rawdata), true);
if ($data === null)
{
  die("Failed to parse JSON data from $rawdata");
}
DEBUG('Info : ' . $data['generator']);
DEBUG('Info : ' . $data['osm3s']['copyright']);
DEBUG("Processing " . count($data["elements"]) . " elements...");

$db = Database::getInstance(
  $CONFIG['dbstations']['dsn'],
  $CONFIG['dbstations']['dbuser'],
  $CONFIG['dbstations']['dbpassword']
);
$pdo = $db->pdo;
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
// select, insert and update prepared statements
$selectStmt = $pdo->prepare('SELECT 1 FROM stations WHERE id = :id LIMIT 1');

$insertStmt = $pdo->prepare(
    'INSERT INTO stations (id, latitude, longitude, zipcode, address, city, country, updated_date, created_date, name, brand) '
    . 'VALUES (:id, :latitude, :longitude, :zipcode, :address, :city, :country, :updated_date, :created_date, :name, :brand)'
);
$updateStmt = $pdo->prepare(
    'UPDATE stations '
    . 'SET latitude = :latitude, longitude = :longitude, zipcode = :zipcode, address = :address, city = :city, country = :country, updated_date = :updated_date, name = :name, brand = :brand '
    . 'WHERE id = :id'
);
$now = Database::NOW();
$elements = $data["elements"];
$nbvalid = 0;
$nbnoname = 0;
$processed = 0;
$inserted = 0;
$updated = 0;

$pdo->beginTransaction();
try {
  foreach ($elements as $station)
  {
    //var_dump($station);
    $id = $station['id'];
    $tags = $station['tags'];
    $brand = $name = null;
    $brand = $tags["brand"] ?? $tags["operator"] ?? null;
    $name = $tags["name"] ?? $tags["owner"] ?? $brand ?? null;
    // address rectifier
    $zipcode = $address = $city = null;
    $zipcode = $tags["addr:postcode"] ?? null;
    $address = $tags["addr:street"] ?? $tags["address"] ?? null;
    $city = $tags["addr:city"] ?? $zipcode ?? null; // if city is missing, try to use zipcode as city (not ideal but better than nothing)

    if (isset($tags['addr:housenumber']))
    {
      if (isset($tags["addr:street"]))
      {
        $address = $tags['addr:housenumber'] . ' ' . $tags["addr:street"];
      }
      else
      {
        $address = null; // if housenumber is present but street is missing, it's better to set address to null than to have a wrong address like "123"
      }      
    }
    else if (isset($tags["contact:street"]))
    {
      if (isset($tags["contact:housenumber"]))
      {
        $address = $tags['contact:housenumber'] . ' ' . $tags["contact:street"];
      }
      else
      {
        $address = $tags["contact:street"];
      }
    }
    if ($name === null)
    {
      $name = '?';
      $nbnoname++;      
    }
    else
    {
      $nbvalid++;
    }


    if ($station['type'] === "node")
    {
      $pLat = $station["lat"] ?? null;
      $pLon = $station["lon"] ?? null;
    }
    else
    {
      // way or relation
      if (isset($station["center"]["lat"], $station["center"]["lon"]))
      {
        $pLat = $station["center"]["lat"];
        $pLon = $station["center"]["lon"];
      }
    }

    $selectStmt->execute([':id' => $id]);
    $exists = (bool)$selectStmt->fetchColumn();
    $sqlParams = [
      ':id' => $id,
      ':latitude' => $pLat,
      ':longitude' => $pLon,
      ':zipcode' => $zipcode,
      ':address' => $address,
      ':city' => $city,
      ':country'=> $country,
      ':updated_date' => $now,
      ':name' => $name,
      ':brand' => $brand,
    ];
    if ($exists)
    {
      $updateStmt->execute($sqlParams);
      $updated++;
    }
    else
    {
      $insertStmt->execute($sqlParams + [':created_date' => $now]);
      $inserted++;
      
    }
  }
  $pdo->commit();
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    throw $e;
}
DEBUG("Valid stations: $nbvalid");
DEBUG("Stations without name: $nbnoname");
DEBUG("Inserted stations: $inserted");
DEBUG("Updated stations: $updated");
