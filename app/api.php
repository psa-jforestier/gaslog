<?php

include_once(__DIR__.'/include.php');
include_once(__DIR__.'/classUser.php');
include_once(__DIR__.'/utils.php');
$object = @$_REQUEST['o'];
$action = @$_REQUEST['a'];
$method = $_SERVER['REQUEST_METHOD'];
$json_data = [];

// Always use @$_P to get parameters, works also with json params
$_P = @$_REQUEST;

// o = vehicle | new_vehicle
$db = Database::getInstance($CONFIG['db']['dsn'], $CONFIG['db']['dbuser'], $CONFIG['db']['dbpassword']);
$content_type = isset($_SERVER["CONTENT_TYPE"]) ? trim($_SERVER["CONTENT_TYPE"]) : '';
if ($content_type === "application/json") { 
    $content = trim(file_get_contents("php://input"));     
    $json_data = json_decode($content, true, 512, JSON_INVALID_UTF8_IGNORE);
    // Merge json_data into $_P (the _REQUEST)
    if (is_array($json_data)) {
        foreach($json_data as $k => $v) {
            $_P[$k] = is_string($v) ? trim($v) : $v;
        }
    }
}



$userhash = @$_COOKIE['gaslog_userhash'];
if ($userhash != '')
{
    // Prorogate the cookie for another year
    setcookie('gaslog_userhash', $userhash, strtotime('+1 year'), '/');
}
header("cache-control: private, max-age=0, no-cache, no-store, must-revalidate"); // by default : no cache
if ($object == 'vehicles') 
{ // Get vehicles for the current user, used on the homepage to display the list of vehicles and on the refill form to select a vehicle
    include_once(__DIR__.'/classVehicle.php');
    $user = new User($db);
    $userinfo = $user->getUserInfoByUserHash($userhash);
    if ($userinfo === false)
    {
        // invalidate cookie, userhash not found, return error
        setcookie('gaslog_userhash', '', time() - 3600, '/');
        die('!! userhash not found?');
    }    
    // Get vehicles for the current user
    $vehicle = new Vehicle($db);
    $uservehicles = $vehicle->getVehiclesForUserHash($userhash);
    foreach ($uservehicles as &$v) { // in-place replacement of fuels string with array
        if (isset($v['fuels'])) {
            // Split the fuels string into an array
            $v['fuels'] = explode(',', $v['fuels']);
        }
    }

    echo json_encode(['success' => true, 'vehicles' => $uservehicles, 'user' => $userinfo]);
    exit;
}

if ($object == 'vehicle')
{ // Manage vehicle : details, delete, update
    include_once(__DIR__.'/classVehicle.php');
    $vehicleid = @$_P['vehicleid'];
    if (!$vehicleid) {
        echo json_encode(['success' => false, 'message' => 'Vehicle ID is required']);
        exit;
    }
    $user = new User($db);
    $userinfo = $user->getUserInfoByUserHash($userhash);
    if ($action == 'getdetails')
    {
        
        $vehicle = new Vehicle($db);
        $vehicledetails = $vehicle->getVehicleDetails($userinfo['id'], $vehicleid);
        if ($vehicledetails === false)
        {
            echo json_encode(['success' => false, 'message' => 'Vehicle not found']);
            exit;
        }
        $v = array(
            'id' => $vehicledetails['id'],
            'name' => $vehicledetails['name'],
            'brand' => $vehicledetails['brand'],
            'purchaseDate' => $vehicledetails['purchase_date'],
            'initialMileage' => $vehicledetails['initial_mileage'],
            'distanceUnit' => $vehicledetails['distance_unit'],
            'fuels' => explode(',', $vehicledetails['fuels'])
        );
        echo json_encode(['success' => true, 'vehicle' => $v]);
        exit;
    }
    if ($action == 'delete')
    {
        
        $vehicle = new Vehicle($db);
        $vehicle->deleteVehicle($userinfo['id'], $vehicleid);
        echo json_encode(['success' => true, 'message' => 'Vehicle deleted successfully']);
        exit;
    }
    if ($action == 'update')
    {
        $vehicle = new Vehicle($db);
        
        $vehicle->updateVehicle($userinfo['id'], $vehicleid, 
            @$_P['name'], 
            @$_P['brand'], 
            @$_P['purchaseDate'], 
            @$_P['initialMileage'], 
            @$_P['distanceUnit'], 
            implode(',', @$_P['fuels'])
        );
        echo json_encode(['success' => true, 'message' => 'Vehicle updated successfully']);
        exit;
    }
}

if ($object == 'new_vehicle') 
{ // Add a new vehicle for the current user
  // yes, it could be a "add" method in the "vehicle", but this is not AI to decide
    include_once(__DIR__.'/classVehicle.php');
    $user = new User($db);
    $userinfo = $user->getUserInfoByUserHash($userhash);
    $userid = $userinfo['id'];
    $vehicle = new Vehicle($db);
    $fuels = implode(',', @$_P['fuels']);
    $res = $vehicle->addVehicle($userid, 
        @$_P['name'], 
        @$_P['brand'], 
        @$_P['purchaseDate'], 
        @$_P['initialMileage'], 
        @$_P['distanceUnit'], 
        $fuels
    );
    if ($res === -1) {
        echo json_encode(['success' => false, 'message' => 'Vehicle already exists']);
    }
    else if ($res === false) {
        echo json_encode(['success' => false, 'message' => 'Error adding vehicle']);
    }
    else {
        echo json_encode(['success' => true, 'vehicleId' => $res]);
    }
    exit;
}

if ($object == 'user') 
{ // Manage user : login, logout, get info, get code (for authent), confirm authent)
    include_once(__DIR__.'/classUser.php');
    $user = new User($db);
    if ($action == 'logout')
    {

        // Just delete the cookie, the user will be logged out
        setcookie('gaslog_userhash', '', time() - 3600, '/');
        echo json_encode(['success' => true, 'message' => 'Logged out successfully']);
        exit;
    }
    if ($action == 'getinfo') {
        // Get user information assuming the user is logged and 
        // the userhash is in the cookie
        $userinfo = $user->getUserInfoByUserHash($userhash);
        if ($userinfo === false)
        {
            echo json_encode(['success' => false, 'message' => 'Invalid userhash']);
        }
        else
        {
            echo json_encode(['success' => true, 'user' => $userinfo]);
        }
        exit;
    }
    if ($action == 'getcode') {
        $email = @$_P['email'];
        $name = @$_P['name'];
        
        $authcode = $user->generateAuthCode($email, $name);
        // TODO send an email to the user with the code, for now we just return the code in the response
        echo json_encode(['success' => true, 'auth_code' => $authcode]);
        exit;
    } else if ($action == 'confirmcode') {
        $email = @$_P['email'];
        $name = @$_P['name'];
        $code = @$_P['code'];

        $valid = $user->checkAuthCode($email, $code);
        if ($valid === true)
        {
            $user->confirmUser($email, $name);
            $userinfo = $user->login($email); // 
            if ($userinfo === false)
            {
                DIE('!!');
            }
            setcookie('gaslog_userhash', 
                $userinfo['userhash'], 
                strtotime('+1 year'),
                '/');
            echo json_encode(['success' => true, 'userhash' => $userinfo['userhash']]);
        }
        else
        {
            echo json_encode(['success' => false, 'message' => 'Invalid code']);
        }
        exit;
    }
    else if ($action == 'delete')
    {
        $userinfo = $user->getUserInfoByUserHash($userhash);
        include_once('classVehicle.php');
        include_once('classRefill.php');
        include_once('classStation.php');
        $vehicle = new Vehicle($db);
        $refill = new Refill($db);
        $station = new Station($db);
        $vehicle->deleteAllUserVehicles($userinfo['id']);
        $refill->deleteAllUserRefills($userinfo['id']);
        $station->deleteAllUserStations($userinfo['id']);
        $user->deleteUser($userinfo['id']);
        // delete cookie to force logout
        setcookie('gaslog_userhash', '', time() - 3600, '/');
        echo json_encode(['success' => true]);
        exit;
    }
    else if ($action == 'pair') {
        $qr = @$_P['qrcode'];
        $redirect = @$_P['redirect'] ?? 'index.html';
        if ($qr == '') {
            DIE_WITH_ERROR(400, 'ERR01 : QR code is required', 'index.html');
            
        }
        // qr looks like "gaslog://zzz"
        $prefix = 'gaslog://';
        if (substr($qr, 0, strlen($prefix)) !== $prefix) {
            DIE_WITH_ERROR(400, 'ERR02 : Invalid QR code schema', 'index.html');
        }
        $value = substr($qr, strlen($prefix));
        $userinfo = $user->getUserInfoByUserHash($value);
        if ($userinfo === false)        {
            DIE_WITH_ERROR(404, 'ERR03 :Invalid QR code value', 'index.html');
        }
        // user is valid, we force login by setting the cookie
        $user->login($userinfo['email']);
        setcookie('gaslog_userhash', $userinfo['userhash'], strtotime('+1 year'), '/');
        if ($redirect != '') {
            header('Location: ' . $redirect);
            echo "Welcome! You will be redirected shortly. If not, click <a href='$redirect'>here</a>.";
        } else {
            echo json_encode(['success' => true]);
        }
        exit;
    }
    
}

if ($object == 'refill') 
{ // Refill : add a new refill record for the user
    include_once(__DIR__.'/classRefill.php');
    $vehicleid = @$_P['vehicleid'];
    if (!$vehicleid) {
        echo json_encode(['success' => false, 'message' => 'Vehicle ID is required']);
        exit;
    }
    $user = new User($db);
    $userinfo = $user->getUserInfoByUserHash($userhash);
    $userid = $userinfo['id'];
    $refill = new Refill($db);
    if ($action == 'add')
    {
        // Fixup some data
        $unitprice = @$_P['unitPrice'] ?? false;
        $quantity = @$_P['quantity'] ?? false;
        $totalprice = @$_P['totalPrice'] ?? false;
        if ($unitprice == false)
        {
            $unitprice = $_P['unitPrice'] = floatval($totalprice) / floatval($quantity);
        }
        else if ($totalprice == false)
        {
            $totalprice = $_P['totalPrice'] = floatval($unitprice) * floatval($quantity);
        }
        else if ($quantity == false)
        {
            $quantity = $_P['quantity'] = floatval($totalprice) / floatval($unitprice);
        }
         
        if($unitprice == 0 && $quantity == 0 && $totalprice == 0) {
            die('!! No price or quantity provided');
        }
        // Convert fancy unit into the universal metrics for storage (e.g. liters, kilometers, etc.)
        $quantityunit = @$_P['quantityUnit'];
        switch ($quantityunit) {
            case 'L':
            case 'l':
            case 'Liter':
                // already in liters, do nothing
                break;
            case 'USGal':
                // Convert US gallons to liters
                $_P['quantity'] = floatval($_P['quantity']) * 3.785411784;
                break;
            default:
                die('!! Unsupported quantity unit');
        }
        
        // Add a new refill for the given vehicle and user        
        $res = $refill->addRefill(
            $vehicleid,
            $userid,
            @$_P['refillDate'] ?? Database::NOW(),
            @$_P['stationId'],
            @$_P['fuelType'],
            @$_P['totalPrice'] ?? 0.0,
            @$_P['currency'],
            @$_P['quantity'] ?? 0.0,
            //@$_P['quantityUnit'], no need for unit, we convert everything to liters before
            @$_P['unitPrice'] ?? 0.0,
            @$_P['mileage'] ?? 0.0,
            json_encode(@$_P['stationInfo'] ?? '')

        );
        if ($res === true) {
            echo json_encode(['success' => true]);
        }
        else {
            echo json_encode(['success' => false, 'message' => 'Error adding refill']);
        }
        exit;
    }

}

if ($object == 'refills') 
{ // Get refills for a given vehicle, used to display the list of refills for a vehicle
    include_once(__DIR__.'/classRefill.php');
    $vehicleid = @$_P['vehicleid'];
    if (!$vehicleid) {
        echo json_encode(['success' => false, 'message' => 'Vehicle ID is required']);
        exit;
    }
    $user = new User($db);
    $userinfo = $user->getUserInfoByUserHash($userhash);
    $userid = $userinfo['id'];
    $refill = new Refill($db);
    if ($action == 'shortstats') {
        $refills = $refill->getLastRefillsForVehicle($vehicleid, $userid);
        $stats_last_refills3 = $refill->getLastRefillsStatsByRefills($vehicleid, $userid, 3);
        $stats_last_refills10 = $refill->getLastRefillsStatsByRefills($vehicleid, $userid, 10);
        $stats_last_refills20000 = $refill->getLastRefillsStatsByKm($vehicleid, $userid, 20000);
        echo json_encode([
            'success' => true, 
            'refills' => $refills,
            'stats_last_refills3' => $stats_last_refills3,
            'stats_last_refills10' => $stats_last_refills10,
            'stats_last_refills20000' => $stats_last_refills20000
        ]);
        exit;
    }
    if ($action == 'allstats') {
        include_once('classVehicle.php');
        $vehicle = new Vehicle($db);
        $vehicledetails = $vehicle->getVehicleDetails($userinfo['id'], $vehicleid);
        if ($vehicledetails === false)
        {
            echo json_encode(['success' => false, 'message' => 'Vehicle not found']);
            exit;
        }
        $v = array(
            'id' => $vehicledetails['id'],
            'name' => $vehicledetails['name'],
            'brand' => $vehicledetails['brand'],
            'purchaseDate' => $vehicledetails['purchase_date'],
            'initialMileage' => $vehicledetails['initial_mileage'],
            'distanceUnit' => $vehicledetails['distance_unit'],
            'fuels' => explode(',', $vehicledetails['fuels'])
        );        
        
        $allrefills = $refill->getRefillsForVehicle($vehicleid, $userid);
        
        echo json_encode([
            'success' => true, 
            'allrefills' => $allrefills,
            'vehicle' => $v
            
        ]);
        exit;
    }
 
    
}
if ($object == 'stations')
{ // Get last stations used by the user
    include_once(__DIR__.'/classStation.php');
    $user = new User($db);
    $userinfo = $user->getUserInfoByUserHashOrFail($userhash);

    $station = new Station($db);
    $stations = $station->getUserStations($userinfo['id']);
    echo json_encode(['success' => true, 'stations' => $stations]);
    exit;
}

if ($object == 'station')
{ // Manage station : nearest, add, delete, update
    include_once(__DIR__.'/classStation.php');
    if ($action == 'getnearest')
    {
        
        $station = new Station($db);
        $lat = round(@$_P['lat'], 3); // 3 digit precision (~100m)
        $long = round(@$_P['long'], 3);
        $radius = 2000; // fixed radius
        try {
            $stations = $station->getGasStation($lat, $long, $radius);
        } catch (RuntimeException $e) {
            http_response_code($station->httpcode);
            if ($station->httpcode === 504 || $station->httpcode === 429) {
                // If we have an HTTP code, include it in the error message
                echo json_encode(['success' => false, 'message' => 'Try to get station later']);
            } else {
                echo json_encode(['success' => false, 'message' => 'Error fetching stations: ' . $e->getMessage()]);
            }
            exit; 
        }
        $cacheduration = 3600 * 24;
        header('cache-control: public, max-age=' . $cacheduration . ', s-maxage=' . $cacheduration);
        header("ETag: $lat/$long");
        echo json_encode(['success' => true, 'stations' => $stations]);
        exit;
    }
    else if ($action == 'add')
    {
        $user = new User($db);
        $userinfo = $user->getUserInfoByUserHashOrFail($userhash);

        $station = new Station($db);
        if ($station->isStationWithSameNameExists($userinfo['id'], @$_P['name'])) {
            echo json_encode(['success' => false, 'message' => 'A station with the same name already exists']);
            exit;
        }
        // Limit the number of stations per user to 10. The station never used is replaced by the new one
        $stations = $station->getUserStations($userinfo['id']);
        if (count($stations) >= $CONFIG['app']['maxstation']) {
            // Find the station with the oldest last_usage_date (or created_date if last_usage_date is null)
            usort($stations, function ($a, $b) {
                $dateA = $a['last_usage_date'] ?? $a['created_date'];
                $dateB = $b['last_usage_date'] ?? $b['created_date'];
                return strtotime($dateA) <=> strtotime($dateB);
            });
            // Delete the oldest stations
            for($i = 0; $i < count($stations) - $CONFIG['app']['maxstation']; $i++) {                
                $oldestStationId = $stations[$i]['id'];
                
                $station->deleteStation($userinfo['id'], $oldestStationId);
            }
            $stations = $station->getUserStations($userinfo['id']);
        }
        $id = $station->addStation(
            $userinfo['id'],
            @$_P['name'],
            @$_P['lat'],
            @$_P['long']
        );
        if ($id) {
            echo json_encode(['success' => true, 'stationId' => $id]);
        }
        else {
            echo json_encode(['success' => false, 'message' => 'Error adding station']);
        }
        exit;
    }
    else if ($action == 'get')
    {
        $user = new User($db);
        $userinfo = $user->getUserInfoByUserHashOrFail($userhash);

        $station = new Station($db);
        $stationId = @$_P['stationid'];
        $stationDetails = $station->getStationDetails($userinfo['id'], $stationId);
        if ($stationDetails) {
            echo json_encode(['success' => true, 'station' => $stationDetails]);
        }
        else {
            echo json_encode(['success' => false, 'message' => 'Station not found']);
        }
        exit;    
    }
    else if ($action == 'delete')
    {
        $user = new User($db);
        $userinfo = $user->getUserInfoByUserHashOrFail($userhash);
        $station = new Station($db);
        $stationId = @$_P['stationid'];
        $res = $station->deleteStation($userinfo['id'], $stationId);
        if ($res) {
            echo json_encode(['success' => true]);
            exit;
        }
        else {
            echo json_encode(['success' => false, 'message' => 'Error deleting station']);
            exit;
        }   
    }
    else if ($action == 'update')
    {
        $user = new User($db);
        $userinfo = $user->getUserInfoByUserHashOrFail($userhash);

        $station = new Station($db);
        $stationId = @$_P['stationid'];
        $name = @$_P['name'];
        $lat = @$_P['lat'];
        $long = @$_P['long'];
        if ($station->isStationWithSameNameExists($userinfo['id'], $name)) {
            echo json_encode(['success' => false, 'message' => 'A station with the same name already exists']);
            exit;
        }
        $res = $station->updateStation($userinfo['id'], $stationId, $name, $lat, $long);
        if ($res) {
            echo json_encode(['success' => true]);
        }
        else {
            echo json_encode(['success' => false, 'message' => 'Error updating station']);
        }
        exit;
    }
}

if ($object == 'data')
{
    if ($action == 'download')
    {
        $user = new User($db);
        $userinfo = $user->getUserInfoByUserHashOrFail($userhash);
        include_once('classVehicle.php');
        include_once('classRefill.php');
        include_once('classStation.php');
        $vehicle = new Vehicle($db);
        $vehicles = $vehicle->getVehiclesForUserHash($userhash);
        
        $refill = new Refill($db);
        foreach ($vehicles as &$v) { // in-place replacement of fuels string with array
            if (isset($v['fuels'])) {
                // Split the fuels string into an array
                $v['fuels'] = explode(',', $v['fuels']);
            }
            unset($v['user_id']); // no need to export the user_id, we have the userhash
            $v['refills'] = $refill->getRefillsForVehicle($v['id'], $userinfo['id']);
        }
        $station = new Station($db);
        $stations = $station->getUserStations($userinfo['id']);

        header('Content-Disposition: attachment; filename="gaslog_data_' . date("Y-m-d") . '.json"');
        header('Content-Type: application/json');
        echo json_encode([
            'success' => true, 
            'user' => $userinfo,
            'vehicles' => $vehicles, // vehicles and refills
            'stations' => $stations,
            'date_exported' => date("Y-m-d H:i:s")
        ], JSON_PRETTY_PRINT);
        exit;
    }
}
http_response_code(400);
die("!! unkown API call");
?>