<?php

include_once __DIR__.'/include.php';

class Refill
{
    public $db;
    public function __construct($db)
    {
        $this->db = $db->pdo;
    }

    private static $REFILL_INFO = "refill_date, station_id, fuel, unit_price, currency, quantity, total_price, mileage, station_info";

    /**
      * Add refill to the database. Volume / Quantity must be in liters
     */
    public function addRefill($vehicleid, $userid, 
        $date, $stationId, $fuel, $totalPrice, 
        $currency, $quantity, $unitPrice, $mileage, 
        $stationInfo)
    {
        $stmt = $this->db->prepare("
        insert into refill 
               (vehicle_id,  user_id, refill_date,  station_id, mileage,  fuel,      total_price, currency,  unit_price, quantity, station_info) 
        values (:vehicleid, :userid,        :date, :stationId, :mileage, :fuelType, :totalPrice, :currency, :unitPrice, :quantity, :stationInfo)");
        $stmt->execute([
            'vehicleid' => $vehicleid,
            'userid' => $userid,
            'date' => $date,
            'stationId' => $stationId,
            'mileage' => $mileage,
            'fuelType' => $fuel,
            'totalPrice' => $totalPrice,
            'currency' => $currency,
            'unitPrice' => $unitPrice,
            'quantity' => $quantity,
            'stationInfo' => $stationInfo
        ]); 
        return true;
    }

    public function getRefillsForVehicle($vehicleid, $userid)
    {
        $stmt = $this->db->prepare("select " . self::$REFILL_INFO . " from refill where vehicle_id = :vehicleid and user_id = :userid order by refill_date desc, id desc");
        $stmt->execute(['vehicleid' => $vehicleid, 'userid' => $userid]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getLastRefillsForVehicle($vehicleid, $userid, $limit = 5)
    {
        $stmt = $this->db->prepare("select " . self::$REFILL_INFO . " from refill 
            where vehicle_id = :vehicleid and user_id = :userid order by refill_date desc, id desc limit :limit");
        $stmt->bindValue(':vehicleid', $vehicleid, PDO::PARAM_INT);
        $stmt->bindValue(':userid', $userid, PDO::PARAM_INT);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    private function getStatsFromReffils($refills)
    {
        $fuel_consumption_L_per_100km = 0;
        $cost_per_100km = 0;
        $fuel_price_per_L = 0;
        
        $distance_min = $refills[0]['mileage'];
        $distance_max = $refills[0]['mileage'];
        
        foreach($refills as $d)
        {
            if ($d['mileage'] < $distance_min) $distance_min = $d['mileage'];
            if ($d['mileage'] > $distance_max) $distance_max = $d['mileage'];
            $fuel_price_per_L += $d['unit_price'];
            $cost_per_100km += $d['total_price'];
            $fuel_consumption_L_per_100km += $d['quantity'];
        }
        $distance = $distance_max - $distance_min;
        $fuel_price_per_L = $fuel_price_per_L / count($refills);
        $cost_per_100km = 100 * ($cost_per_100km - end($refills)['total_price']) / $distance;
        $fuel_consumption_L_per_100km = 100 * ($fuel_consumption_L_per_100km - end($refills)['quantity']) / $distance;
        return [
            'distance' => $distance,
            'fuel_price_per_L' => $fuel_price_per_L,
            'cost_per_100km' => $cost_per_100km,
            'fuel_consumption_L_per_100km' => $fuel_consumption_L_per_100km
        ];
    }
    public function getLastRefillsStatsByRefills($vehicleid, $userid, $nrefill = 5)
    {
        $stmt = $this->db->prepare("select * from refill 
            where vehicle_id = :vehicleid and user_id = :userid order by refill_date desc, id desc limit :nrefill");
        $stmt->bindValue(':vehicleid', $vehicleid, PDO::PARAM_INT);
        $stmt->bindValue(':userid', $userid, PDO::PARAM_INT);
        $stmt->bindValue(':nrefill', $nrefill, PDO::PARAM_INT);
        $stmt->execute();
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
        if (count($data) < 2)
        {
            return false; // we need at least 2 refill to calculate stats
        }
        return $this->getStatsFromReffils($data);
        
    }

    public function getLastRefillsStatsByKm($vehicleid, $userid, $km = 1000)
    {
        $stmt = $this->db->prepare("select * from refill 
            where vehicle_id = :vehicleid and user_id = :userid
            and mileage >= (
                select max(mileage) from refill 
                where vehicle_id = :vehicleid and user_id = :userid) - :km
            order by refill_date desc, id desc");
        $stmt->bindValue(':vehicleid', $vehicleid, PDO::PARAM_INT);
        $stmt->bindValue(':userid', $userid, PDO::PARAM_INT);
        $stmt->bindValue(':km', $km, PDO::PARAM_INT);
        $stmt->execute();
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
        if (count($data) <  2)
        {
            return false; // we need at least 2 refills to calculate stats
        }
        return $this->getStatsFromReffils($data);
    }

    public function deleteAllUserRefills($userid)
    {
        $stmt = $this->db->prepare("delete from refill where user_id = :userid");
        $stmt->execute(['userid' => $userid]);
        return true;
    }

}