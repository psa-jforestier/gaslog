<?php

include_once '../app/.config.php';
include_once '.config.php';
include_once '../app/include.php';

$db = Database::getInstance($CONFIG['dbstation']['dsn'], 
    $CONFIG['dbstation']['dbuser'], 
    $CONFIG['dbstation']['dbpassword']);
// Check if we already download the file
$zipFile = __DIR__.'/../data/stations_raw.zip';
if (!file_exists($zipFile)) {
    // Get data from government API
    $url = "https://donnees.roulez-eco.fr/opendata/jour";
    echo "Downloading data from $url...\n";
    // Will not work with file_get_contents due to SSL issues, use cURL instead
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER  => true,    
        CURLOPT_CONNECTTIMEOUT  => 10,
        CURLOPT_TIMEOUT         => 25,
        CURLOPT_SSL_VERIFYPEER  => false,
        CURLOPT_SSL_VERIFYHOST  => false,
        CURLOPT_USERAGENT       => "GasLog/1.0 (contact: gaslog@forestier.xyz)", // good practice for Overpass
    ]);
    $raw = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    if ($raw === false) {
        $err = curl_error($ch);
        curl_close($ch);
        die("Request failed (curl): $err");
    }
    curl_close($ch);
    // save data to file for debugging
    file_put_contents(__DIR__.'/../data/stations_raw.zip', $raw);
}
$destName = __DIR__.'/../data/station_raw.xml';
if (!file_exists($destName)) {
    // it is supposed to be a zip file, try to unzip it
    echo "Unzipping data...\n";
    // Safe extraction of the zip content.
    // must contains one file only, and save it to a fixed name
    $zip = new ZipArchive();
    if ($zip->open(__DIR__.'/../data/stations_raw.zip') === true) {
        if ($zip->numFiles === 0) {
            die("The zip file is empty");
        }
        if ($zip->numFiles > 1) {
            die("The zip file contains more than one file, which is unexpected");
        }
        $innerName = $zip->getNameIndex(0);
        
        echo "Extracting file $innerName but save it to $destName from zip...\n";
        $content = $zip->getFromIndex(0);
        $zip->close();
        if ($content === false) {
            die("Failed to read file inside ZIP");
        }
        if (file_put_contents($destName, $content) === false) {
            die("Failed to write extracted file");
        }
    } else {
        die("Failed to unzip the downloaded file");
    }
}
echo "Loading data from $destName...\n";

// Load XML file and save into the DB
/** db schema
CREATE TABLE "stations" (
	"id"	INTEGER NOT NULL UNIQUE,
	"latitude"	REAL,
	"longitude"	REAL,
	"zipcode"	VARCHAR(16),
	"address"	TEXT,
	"city"	TEXT,
	"created_date"	TEXT NOT NULL,
	"updated_date"	TEXT,
	"name"	TEXT,
	PRIMARY KEY("id")
)
 */

// Start import here.
$xml = simplexml_load_file($destName);
if ($xml === false) {
    die("Failed to parse XML file: $destName\n");
}

// Expected root: <pdv_liste> with repeated <pdv> nodes.
$pdvNodes = isset($xml->pdv) ? $xml->pdv : [];
if (!is_iterable($pdvNodes)) {
    die("Invalid XML structure: expected <pdv_liste>/<pdv>\n");
}

$pdo = $db->pdo;
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

$selectStmt = $pdo->prepare('SELECT 1 FROM stations WHERE id = :id LIMIT 1');
$insertStmt = $pdo->prepare(
    'INSERT INTO stations (id, latitude, longitude, zipcode, address, city, created_date) '
    . 'VALUES (:id, :latitude, :longitude, :zipcode, :address, :city, :created_date)'
);
$updateStmt = $pdo->prepare(
    'UPDATE stations '
    . 'SET latitude = :latitude, longitude = :longitude, zipcode = :zipcode, address = :address, city = :city '
    . 'WHERE id = :id'
);

$processed = 0;
$inserted = 0;
$updated = 0;

$pdo->beginTransaction();
try {
    foreach ($pdvNodes as $pdv) {
        $id = (int)($pdv['id'] ?? 0);
        if ($id <= 0) {
            continue;
        }
        // as indicated in the doc https://www.prix-carburants.gouv.fr/rubrique/opendata/
        // the lat and long are in PTV_GEODECIMAL format
        // and we have to divide them by 100000 to get the actual coordinates

        $latitude = (float)($pdv['latitude'] ?? 0) / 100000;
        $longitude = (float)($pdv['longitude'] ?? 0) / 100000;
        $zipcode = trim((string)($pdv['cp'] ?? ''));
        $address = trim((string)($pdv->adresse ?? ''));
        $city = trim((string)($pdv->ville ?? ''));

        $selectStmt->execute([':id' => $id]);
        $exists = (bool)$selectStmt->fetchColumn();

        if ($exists) {
            $updateStmt->execute([
                ':id' => $id,
                ':latitude' => $latitude,
                ':longitude' => $longitude,
                ':zipcode' => $zipcode,
                ':address' => $address,
                ':city' => $city,
            ]);
            $updated++;
        } else {
            $insertStmt->execute([
                ':id' => $id,
                ':latitude' => $latitude,
                ':longitude' => $longitude,
                ':zipcode' => $zipcode,
                ':address' => $address,
                ':city' => $city,
                ':created_date' => date('Y-m-d H:i:s'),
            ]);
            $inserted++;
        }

        $processed++;
    }

    $pdo->commit();
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    throw $e;
}

echo "Import completed. Processed: $processed, inserted: $inserted, updated: $updated\n";
