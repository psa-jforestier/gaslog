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
    public $httpcode;
    public function __construct($db)
    {
        $this->db = $db->pdo;
    }

    private static function haversineMeters($lat1, $lon1, $lat2, $lon2)
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
