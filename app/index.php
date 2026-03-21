<?php
/**
 * This is the main screen of GasLog
 * See SPECS.md, __main screen__
 * 
 */

include_once __DIR__.'/include.php';

$db = Database::getInstance($CONFIG['db']['dsn'], $CONFIG['db']['dbuser'], $CONFIG['db']['dbpassword']);

// Check if user is logged
$user = new User($db);
$current_userhash = @$_COOKIE['gaslog_userhash'];
if ($current_userhash == '')
    $islogged = false;
else
{
    $userinfo = $user->getUserInfoByUserHash($current_userhash);
    if ($userinfo === false)
        $islogged = false;
    else
    {
        $islogged = true;
        //@session_start();
        //$_SESSION['user_id'] = $userinfo['id'];
    }
}


$HTML['title'] = 'GasLog - Fuel Tracking';
$HTML['islogged'] = ($islogged === true ? "true" : "false");
if (!$islogged)  {
    $HTML['welcome1'] = 'Welcome to GasLog !<br/>You are using the application in invitee mode. Go to the Menu, then Login to create an account.';
    $HTML['welcome2'] = 'But you can use the app unconnected, all the data will be stored to the local storage.';
    $HTML['username'] = '';
}
else
{
    $HTML['welcome1'] = 'Welcome back';
    $HTML['welcome2'] = '';
    $HTML['username'] = '??'; // $user->getUsername().' !';
}
?>
<?php include "header.phtml"; ?>
    <div class="app-container">
        <!-- Header -->
        <div class="page-header">
            <h1>GasLog</h1>
            <p id="userStatus">
                <?= T($HTML['welcome1'])?>
                <?= T($HTML['welcome2'])?>
                <?= $HTML['username']?>
            </p>
            <!-- Alternative: <p>You are not logged</p> -->
        </div>

        <!-- Main Section: Vehicle Selection -->
        <section class="content-section" id="mainSection">
            <h2>Select a Vehicle</h2>
            
            <div class="radio-group">
                <div class="radio-option">
                    <input type="radio" id="vehicle1" name="vehicle" value="peugeot" checked>
                    <label for="vehicle1">Peugeot 308</label>
                </div>
                <div class="radio-option">
                    <input type="radio" id="vehicle2" name="vehicle" value="tesla">
                    <label for="vehicle2">Tesla Model 3</label>
                </div>
                <div class="radio-option">
                    <input type="radio" id="vehicle3" name="vehicle" value="ford">
                    <label for="vehicle3">Ford Focus</label>
                </div>
            </div>
            
            <div class="button-row">
                <button id="refillBtn" class="btn btn-primary" onclick="showRefillForm()">Refill</button>
            </div>
        </section>

        <!-- Refill Form (Hidden by default) -->
        <section class="content-section hidden" id="refillSection">
            <h2>Fill Up Your Vehicle</h2>
            
            <form>
                <div class="form-group">
                    <label for="refillVehicle">Vehicle</label>
                    <select id="refillVehicle">
                        <option selected>Peugeot 308</option>
                        <option>Tesla Model 3</option>
                        <option>Ford Focus</option>
                    </select>
                </div>

                <div class="form-group">
                    <label for="refillDate">Date & Time</label>
                    <input type="datetime-local" id="refillDate" value="2026-03-07T12:30">
                </div>

                <div class="form-group">
                    <label>Gas Station</label>
                    <button type="button" class="btn btn-link" onclick="showStationPicker()">Choose a station</button>
                    <p class="text-muted" id="selectedStation">No station selected</p>
                </div>

                <div class="form-group">
                    <label for="refillFuel">Fuel Type</label>
                    <select id="refillFuel">
                        <option selected>SP95E10</option>
                        <option>SP98</option>
                        <option>Diesel</option>
                        <option>E85</option>
                        <option>GPL</option>
                    </select>
                </div>

                <div class="form-group">
                    <label for="refillUnitPrice">Unit Price</label>
                    <div class="input-group">
                        <input type="number" id="refillUnitPrice" step="0.01" placeholder="1.839">
                        <select id="priceUnit">
                            <option>€/L</option>
                            <option>$/Gal</option>
                            <option>$/L</option>
                            <option>p/L</option>
                        </select>
                    </div>
                </div>

                <div class="form-group">
                    <label for="refillQuantity">Quantity</label>
                    <div class="input-group">
                        <input type="number" id="refillQuantity" step="0.01" placeholder="45.5">
                        <select id="quantityUnit">
                            <option>Liter</option>
                            <option>USGal</option>
                        </select>
                    </div>
                </div>

                <div class="form-group">
                    <label for="refillTotalPrice">Total Price</label>
                    <div class="input-group">
                        <input type="number" id="refillTotalPrice" step="0.01" placeholder="83.67">
                        <select id="currency">
                            <option>€</option>
                            <option>$</option>
                            <option>£</option>
                        </select>
                    </div>
                </div>

                <div class="form-group">
                    <label for="refillMileage">Mileage</label>
                    <div class="input-suffix">
                        <input type="number" id="refillMileage" placeholder="45320">
                        <span>km</span>
                    </div>
                </div>

                <div class="button-row">
                    <button type="button" class="btn btn-cancel" onclick="hideRefillForm()">Cancel</button>
                    <button type="submit" class="btn btn-ok">OK</button>
                </div>
            </form>
        </section>

        <!-- Station Picker Overlay (Hidden by default) -->
        <div class="overlay hidden" id="stationPickerOverlay">
            <div class="modal">
                <button class="modal-close" onclick="hideStationPicker()">×</button>
                <h2>Choose a Station</h2>
                
                <div class="form-group">
                    <button type="button" class="btn btn-secondary" style="width: 100%;">From your current location</button>
                </div>

                <div class="form-group">
                    <label>Recent Stations</label>
                    <div class="radio-group">
                        <div class="radio-option">
                            <input type="radio" id="station1" name="station" value="total">
                            <label for="station1">Total - Avenue des Champs</label>
                        </div>
                        <div class="radio-option">
                            <input type="radio" id="station2" name="station" value="shell">
                            <label for="station2">Shell - Route de Paris</label>
                        </div>
                        <div class="radio-option">
                            <input type="radio" id="station3" name="station" value="bp">
                            <label for="station3">BP - Centre Ville</label>
                        </div>
                    </div>
                </div>

                <div class="form-group">
                    <label for="newStation">New Station</label>
                    <input type="text" id="newStation" placeholder="Enter station name">
                </div>

                <div class="button-row">
                    <button type="button" class="btn btn-cancel" onclick="hideStationPicker()">Cancel</button>
                    <button type="button" class="btn btn-ok" onclick="selectStation()">OK</button>
                </div>
            </div>
        </div>
    </div>

    <script src="js/index.js"></script>
</body>
</html>
