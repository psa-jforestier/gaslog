<?php
include_once __DIR__.'/include.php';

/**
 * **STATION**
_Contains all the gas stations used by a user to refill his vehicle_
ID : incremental uniq id
user_id : id of the user who did the refill
name : varchar 32, name of the gas station
created_date : datetime, when the station was created
last_usage_date : datetime, last time the station was used (can be null)
latitude : double, latitude of the station (can be null)
longitude : double, longitude of the station (can be null)
pluscode : varchar 10, location in Open Location Code / Plus Code format (can be null)
 */
class Station
{
    public $db;
    public $dbSations; // PDO object dedicted to the stations database
    public $httpcode;
    public function __construct($db)
    {
        $this->db = $db->pdo;
    }
    
    public function setDbStations($db)
    {
        $this->dbStations = $db->pdo;
    }


    public static function haversineMeters($lat1, $lon1, $lat2, $lon2)
    {
        $R = 6371000.0; // Earth radius in meters
        $toRad = function ($deg) { return $deg * M_PI / 180.0; };

        $dLat = $toRad($lat2 - $lat1);
        $dLon = $toRad($lon2 - $lon1);

        $a = pow(sin($dLat / 2), 2)
            + cos($toRad($lat1)) * cos($toRad($lat2)) * pow(sin($dLon / 2), 2);

        return 2.0 * $R * asin(min(1.0, sqrt($a)));
    }

    public function getUserStations($userId)
    {
        $stmt = $this->db->prepare("SELECT * FROM station WHERE user_id = :user_id ORDER BY last_usage_date DESC LIMIT 100");
        $stmt->execute(['user_id' => $userId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function deleteStation($userid, $stationId)
    {
        $stmt = $this->db->prepare("DELETE FROM station WHERE id = :id AND user_id = :user_id");
        $stmt->execute(['id' => $stationId, 'user_id' => $userid]);
        return $stmt->rowCount() > 0;
    }
    public function addStation($userId, $name, $lat = null, $long = null)
    {
        $now = Database::NOW();
        $stmt = $this->db->prepare("INSERT INTO station (user_id, name, latitude, longitude, created_date) VALUES (:user_id, :name, :latitude, :longitude, :created_date)");
        $stmt->execute([
            'user_id' => $userId,
            'name' => $name,
            'latitude' => $lat,
            'longitude' => $long,
            'created_date' => $now
        ]);
        return $this->db->lastInsertId();
    }

    public static function getStationInfoFromGovernmentByAPI($stationId)
    {
        // Call the fr government API to get station info by id
        $url = "https://www.prix-carburants.gouv.fr/map/recuperer_infos_pdv/{$stationId}";
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
            return false;
        }
        curl_close($ch);
        if ($httpCode == 200)   
        {
            // use regex to extract the station name from the response, it is in the format "pdv_nom":"Station Name"
            // the name is under <h3 class="fr-text--md">...</h3>
            $name = '';
            if (preg_match('/<h3 class="fr-text--md">([^<]+)<\/h3>/', $raw, $matches)) {
                $name = html_entity_decode($matches[1], ENT_QUOTES | ENT_HTML5, 'UTF-8');                
            }
            // the brand is under <strong>....</strong><br />
            $brand = '';
            if (preg_match('/<strong>([^<]+)<\/strong><br \/>/', $raw, $matches)) {
                $brand = html_entity_decode($matches[1], ENT_QUOTES | ENT_HTML5, 'UTF-8');                
            }
        }
        return ['name' => $name, 'brand' => $brand, 'http_code' => $httpCode, 'raw_result'=>substr($raw,0,16)];
    }
    
    /**
     * This function search the gas station from the local db (it may be different
     * than the GasLog database, to have better segregation). This standalone
     * database must be feeded by the <batch>
     * If "usecache" is set to false, the function will call the
     * government api for every station returned by the query, to get the name
     * and brand info (which are not get from the import), then will store them
     * in the database.
     * If set to true, it will onl use brand/name from the database.
     * Note : the search is rectangular, not circle for better perf and simplier 
     * sql statement.
     */
    public function getGasStationFromLocalDB($lat, $long, $lat2 = false, $long2 = false, $radius = 1000, $usecache=true)
    {
        if ($lat2 === false && $radius !== false)
        { 
            // Convert meters to degrees
            $latDelta = $radius / 111000; 
            $lonDelta = $radius / (111000 * cos(deg2rad($lat)));
            $lat1 = $lat - $latDelta; 
            $lat2 = $lat + $latDelta;

            $lon1 = $long - $lonDelta; 
            $lon2 = $long + $lonDelta;
        }
        else
        {
            // square search
            if ($lat > $lat2)
            {
                $lat1 = $lat2;
                $lon1 = $long2;
                $lat2 = $lat;
                $lon2 = $long;                
            }
            else
            {
                $lat1 = $lat;
                $lon1 = $long;
                $lat2 = $lat2;
                $lon2 = $long2;
            }
        }

        $stmt = $this->dbStations->prepare("
            SELECT *, 0 as distance_m
            FROM stations
            WHERE latitude  BETWEEN :lat1 AND :lat2
            AND longitude BETWEEN :lon1 AND :lon2
            LIMIT 100
        ");
        
        $stmt->execute([':lat1' => $lat1, ':lat2' => $lat2, ':lon1' => $lon1, ':lon2' => $lon2]);
        
        $stations = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) { 
            $id = $row['id'];
            
            $name = $row['name'];
            $brand = $row['brand'];
            if (!$usecache || $name == '' || $name == null)
            {
                
                $stationInfo = Station::getStationInfoFromGovernmentByAPI($id);
            
                if ($stationInfo['name'] != '')
                {
                    $name = $stationInfo['name'];
                    $brand = $stationInfo['brand'];
                    $stupdate = $this->dbStations->prepare("update stations
                    set name = :name, brand = :brand
                    where id = :id
                    ");
                    $stupdate->execute(['id'=>$row['id'], 'name'=>$name, 'brand'=>$brand]);
                }
                
            }
            
            if ($name == $brand)
                $brand = '';
            else
                $name = $brand . ' '.$name;
            $distance = self::haversineMeters($lat, $long, $row['latitude'], $row['longitude']);
            $stations[] = [
                "id" => $row['id'],
                "lat" => $row['latitude'],
                "long" => $row['longitude'],
                "name" => $name,
                "city" => $row['city'],
                "country" => 'fr', // we know that all stations in the local DB are in France
                "house_number" =>'',
                "post_code" => $row['zipcode'],
                "street" => $row['address'],
                "distance" => $distance ,
            ];
            
        }
        return $stations;
    }
    /**
     * getGasStation($lat, $long, $radius)
     *
     * Queries Overpass API for OSM gas stations (amenity=fuel) within a radius around lat/long.
     * Returns an array of stations with:
     *  - id, lat, long, name
     *  - city, country, house_number, post_code, street
     *
     * Notes:
     * - Overpass returns nodes with lat/lon, and ways/relations with a "center" when using "out center".
     * - Address fields in OSM are usually stored in tags like:
     *   addr:city, addr:country, addr:housenumber, addr:postcode, addr:street
     *
     * @param float $lat
     * @param float $long
     * @param int   $radius Radius in meters
     * @return array
     * @throws RuntimeException on HTTP/JSON errors
     */
    function getGasStation($lat, $long, $radius = 1000)
    {
        $lat = (float)$lat;
        $long = (float)$long;
        $radius = (int)$radius;

        // Overpass QL query: fuel stations around given point (nodes + ways + relations)
        // "out center tags" -> ways/relations include center.{lat,lon}; tags included.
        $query = <<<QL
    [out:json][timeout:25];
    (
    node(around:$radius,$lat,$long)["amenity"="fuel"];
    way(around:$radius,$lat,$long)["amenity"="fuel"];
    relation(around:$radius,$lat,$long)["amenity"="fuel"];
    );
    out center tags;
    QL;

            $query = <<<QL
    [out:json][timeout:25];
    (
    nwr(around:$radius,$lat,$long)["amenity"="fuel"];
    );
    out center tags;
    QL;

        $endpoint = "https://overpass.private.coffee/api/interpreter";
        $endpoint = "https://overpass-api.de/api/interpreter";


        // --- HTTP POST (cURL) ---
        $ch = curl_init($endpoint);
        curl_setopt_array($ch, [
            CURLOPT_POST            => true,
            CURLOPT_RETURNTRANSFER  => true,
            CURLOPT_HTTPHEADER      => ["Content-Type: application/x-www-form-urlencoded; charset=UTF-8"],
            CURLOPT_POSTFIELDS      => http_build_query(["data" => $query], "", "&"),
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
            throw new RuntimeException("Overpass request failed (curl): $err");
        }
        curl_close($ch);
        $this->httpcode = $httpCode;
        if ($httpCode < 200 || $httpCode >= 300) {
            throw new RuntimeException("Overpass request failed (HTTP $httpCode): $raw");
        }

        // --- JSON decode ---
        $json = json_decode($raw, true);
        if (!is_array($json) || !isset($json["elements"]) || !is_array($json["elements"])) {
            throw new RuntimeException("Invalid Overpass JSON response");
        }

        $stations = [];

        foreach ($json["elements"] as $el) {
            // Normalize coordinates:
            // - node: lat/lon
            // - way/relation: center.lat/center.lon (because of "out center")
            $type = $el["type"] ?? null;
            $id = $el["id"] ?? null;
            $tags = $el["tags"] ?? [];

            if (!$type || !$id) continue;

            $pLat = null;
            $pLon = null;

            if ($type === "node") {
                $pLat = $el["lat"] ?? null;
                $pLon = $el["lon"] ?? null;
            } else {
                // way or relation
                if (isset($el["center"]["lat"], $el["center"]["lon"])) {
                    $pLat = $el["center"]["lat"];
                    $pLon = $el["center"]["lon"];
                }
            }

            if ($pLat === null || $pLon === null) continue;

            $pLat = (float)$pLat;
            $pLon = (float)$pLon;

            $distance = self::haversineMeters($lat, $long, $pLat, $pLon);

            // Map address tags -> requested fields
            $station = [
                "id"           => $type . "/" . $id,
                "lat"          => $pLat,
                "long"         => $pLon,
                "name"         => $tags["name"] ?? null,

                "city"         => $tags["addr:city"] ?? null,
                "country"      => $tags["addr:country"] ?? null,
                "house_number" => $tags["addr:housenumber"] ?? null,
                "post_code"    => $tags["addr:postcode"] ?? null,
                "street"       => $tags["addr:street"] ?? null,
                "distance"     => $distance, // meters (float)
            ];

            $stations[] = $station;
        }

        // Sort by distance ascending (nearest first)
        usort($stations, function ($a, $b) {
         return $a["distance"] <=> $b["distance"];
        });

        // Return top 5 closest stations
        $stations = array_slice($stations, 0, 5);

        return $stations;
    }

    public function deleteAllUserStations($userId)
    {
        $stmt = $this->db->prepare("DELETE FROM station WHERE user_id = :user_id");
        $stmt->execute(['user_id' => $userId]);
        return true;
    }
    
    public function isStationWithSameNameExists($userId, $name)
    {
        $stmt = $this->db->prepare("SELECT COUNT(*) FROM station WHERE user_id = :user_id AND name = :name");
        $stmt->execute(['user_id' => $userId, 'name' => $name]);
        return $stmt->fetchColumn() > 0;
    }
    public function getStationDetails($userid, $stationid)
    {
        $stmt = $this->db->prepare("SELECT * FROM station WHERE id = :id AND user_id = :user_id");
        $stmt->execute(['id' => $stationid, 'user_id' => $userid]);
        $station = $stmt->fetch(PDO::FETCH_ASSOC); // the station should exists
        unset($station['user_id']); // we don't need to return user_id
        // now try to get some stat info about this station
        $stmt = $this->db->prepare("select count(*) as total_refills, max(refill_date) as last_refill from refill where station_id = :station_id");
        $stmt->execute(['station_id' => $stationid]);
        $stats = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($stats) {
            $station['total_refills'] = $stats['total_refills'];
            $station['last_refill'] = $stats['last_refill'];
        }

        return $station;
    }

    public function updateStation($userid, $stationid, $name, $lat, $long)
    {
        $stmt = $this->db->prepare("UPDATE station SET name = :name, latitude = :lat, longitude = :long WHERE id = :id AND user_id = :user_id");
        $stmt->execute(['name' => $name, 'lat' => $lat, 'long' => $long, 'id' => $stationid, 'user_id' => $userid]);
        return $stmt->rowCount() > 0;
    }
}
