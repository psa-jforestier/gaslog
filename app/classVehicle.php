<?php

include_once __DIR__.'/include.php';

class Vehicle
{
    public $db;
    public function __construct($db)
    {
        $this->db = $db->pdo;
    }

    public function getVehiclesForUserHash($userhash)
    {
        $stmt = $this->db->prepare("select v.* from vehicle v join user u on v.user_id = u.id where u.userhash = :userhash order by upper(v.name)");
        $stmt->execute(['userhash' => $userhash]);
        $vehicles = $stmt->fetchAll(PDO::FETCH_ASSOC);
        return $vehicles;
    }

    public function getVehicleDetails($userid, $vehicleid)
    {
        $stmt = $this->db->prepare("select * from vehicle where id = :vehicleid and user_id = :userid");
        $stmt->execute(['vehicleid' => $vehicleid, 'userid' => $userid]);
        $vehicle = $stmt->fetch(PDO::FETCH_ASSOC);
        return $vehicle;
    }

    public function deleteVehicle($userid, $vehicleid)
    {
        $stmt = $this->db->prepare("delete from vehicle where id = :vehicleid and user_id = :userid");
        $stmt->execute(['vehicleid' => $vehicleid, 'userid' => $userid]);
    }

    public function updateVehicle($userid, $vehicleid, $name, $brand, $purchase_date, $initial_mileage, $distance_unit, $fuels)
    {
        $stmt = $this->db->prepare("update vehicle set name = :name, brand = :brand, purchase_date = :purchase_date, initial_mileage = :initial_mileage, distance_unit = :distance_unit, fuels = :fuels where id = :vehicleid and user_id = :userid");
        $stmt->execute([
            'name' => $name,
            'brand' => $brand,
            'purchase_date' => $purchase_date,
            'initial_mileage' => $initial_mileage,
            'distance_unit' => $distance_unit,
            'fuels' => $fuels,
            'vehicleid' => $vehicleid,
            'userid' => $userid
        ]);
    }

    public function addVehicle($userid, $name, $brand, $purchase_date, $initial_mileage, $distance_unit, $fuels)
    {
        // Search if the vehicle already exists for the user
        $stmt = $this->db->prepare("select id from vehicle where user_id = :userid and upper(name) = upper(:name)");
        $stmt->execute(['userid' => $userid, 'name' => $name]); 
        $existing = $stmt->fetch();
        if ($existing) {
            return -1; // Vehicle already exists
        }

        $stmt = $this->db->prepare("insert into vehicle (user_id, name, brand, purchase_date, initial_mileage, distance_unit, fuels, created_date) values (:userid, :name, :brand, :purchase_date, :initial_mileage, :distance_unit, :fuels, :created_date)");
        $stmt->execute([
            'userid' => $userid,
            'name' => $name,
            'brand' => $brand,
            'purchase_date' => $purchase_date,
            'initial_mileage' => $initial_mileage,
            'distance_unit' => $distance_unit,
            'fuels' => $fuels,
            'created_date' => Database::NOW()
        ]);
        return $this->db->lastInsertId();
    }

    public function deleteAllUserVehicles($userid)
    {
        $stmt = $this->db->prepare("delete from vehicle where user_id = :userid");
        $stmt->execute(['userid' => $userid]);
        return true;
    }

}