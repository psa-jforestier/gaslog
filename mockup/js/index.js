window.cachedVehicles = [];
window.selectedVehicleId = null;

var DEFAULT_FUELS = Array.isArray(window.VEHICLE_FUELS) ? window.VEHICLE_FUELS : ["SP95E10", "SP95E5", "SP98", "E85", "Diesel", "Premium Diesel", "GPL", "LGPL", "CNG/GNV"];
var DEFAULT_CURRENCY = "€";
var DEFAULT_QUANTITY_UNIT = "Liter";
var DEFAULT_PRICE_UNIT = "€/L";

function getVehicleLabel(vehicle) {
    return (vehicle && (vehicle.label || vehicle.name || "")).trim();
}

function getVehicleDistanceUnit(vehicle) {
    if (!vehicle) {
        return "km";
    }

    return vehicle.distanceUnit || vehicle.distance_unit || "km";
}

function getVehicleMileage(vehicle) {
    if (!vehicle) {
        return "";
    }

    return vehicle.lastMileage || vehicle.last_mileage || vehicle.initialMileage || vehicle.initial_mileage || "";
}

function getVehicleFuels(vehicle) {
    if (!vehicle || !Array.isArray(vehicle.fuels) || vehicle.fuels.length === 0) {
        return DEFAULT_FUELS.slice();
    }

    return vehicle.fuels.slice();
}

function getVehicleById(vehicleId) {
    return window.cachedVehicles.find(function (vehicle) {
        return vehicle.id === vehicleId;
    }) || null;
}

function getVehicleIdFromHash() {
    var hash = window.location.hash.replace(/^#/, "");

    if (!hash) {
        return "";
    }

    return new URLSearchParams(hash).get("vehicleid") || "";
}

function updateVehicleHash(vehicleId) {
    var nextHash = vehicleId ? "vehicleid=" + encodeURIComponent(vehicleId) : "";

    if (nextHash) {
        if (window.location.hash !== "#" + nextHash) {
            history.replaceState(null, "", "#" + nextHash);
        }
        return;
    }

    if (window.location.hash) {
        history.replaceState(null, "", window.location.pathname + window.location.search);
    }
}

function populateVehicleSelect(selectElement, vehicles, selectedVehicleId, includePlaceholder) {
    if (!selectElement) {
        return;
    }

    selectElement.innerHTML = "";

    if (includePlaceholder) {
        var placeholder = document.createElement("option");
        placeholder.value = "";
        placeholder.textContent = "Choose a vehicle";
        placeholder.selected = !selectedVehicleId;
        selectElement.appendChild(placeholder);
    }

    vehicles.forEach(function (vehicle) {
        var option = document.createElement("option");
        option.value = vehicle.id;
        option.textContent = getVehicleLabel(vehicle);
        option.selected = vehicle.id === selectedVehicleId;
        selectElement.appendChild(option);
    });
}

function populateFuelSelect(vehicleId) {
    var fuelSelect = document.getElementById("refillFuel");
    var preferences = getRefillPreferences();
    var lastFuelByVehicle = preferences.lastFuelByVehicle || {};
    var vehicle = getVehicleById(vehicleId);
    var fuels = getVehicleFuels(vehicle);
    var selectedFuel = lastFuelByVehicle[vehicleId];

    if (!fuelSelect) {
        return;
    }

    fuelSelect.innerHTML = "";

    fuels.forEach(function (fuel, index) {
        var option = document.createElement("option");
        option.value = fuel;
        option.textContent = fuel;
        option.selected = selectedFuel ? fuel === selectedFuel : index === 0;
        fuelSelect.appendChild(option);
    });

    if (fuelSelect.options.length > 0 && fuelSelect.selectedIndex === -1) {
        fuelSelect.selectedIndex = 0;
    }
}

function applyVehicleToForm(vehicleId, options) {
    var config = options || {};
    var vehicle = getVehicleById(vehicleId);
    var vehicleSelector = document.getElementById("vehicleSelector");
    var mileageInput = document.getElementById("refillMileage");
    var mileageUnit = document.getElementById("mileageUnit");
    var preferences = getRefillPreferences();

    if (!vehicle) {
        return;
    }

    window.selectedVehicleId = vehicleId;

    if (vehicleSelector) {
        vehicleSelector.value = vehicleId;
    }

    if (mileageUnit) {
        mileageUnit.textContent = getVehicleDistanceUnit(vehicle);
    }

    if (mileageInput && !config.preserveMileage) {
        mileageInput.value = getVehicleMileage(vehicle);
    }

    populateFuelSelect(vehicleId);

    document.getElementById("currency").value = preferences.lastCurrency || DEFAULT_CURRENCY;
    document.getElementById("quantityUnit").value = preferences.lastQuantityUnit || DEFAULT_QUANTITY_UNIT;
    document.getElementById("priceUnit").value = preferences.lastPriceUnit || DEFAULT_PRICE_UNIT;
}

function showRefillForm(vehicleId) {
    var form = document.getElementById("refillForm");
    var hint = document.getElementById("vehicleSelectorHint");

    if (!vehicleId || !form) {
        return;
    }

    form.classList.remove("hidden");
    if (hint) {
        hint.classList.add("hidden");
    }

    if (typeof window.resetSelectedStationForRefill === "function") {
        window.resetSelectedStationForRefill();
    }

    document.getElementById("refillDate").value = getCurrentDateTimeLocalValue();
    applyVehicleToForm(vehicleId);
    updateVehicleHash(vehicleId);
}

function hideRefillForm() {
    var form = document.getElementById("refillForm");
    var vehicleSelector = document.getElementById("vehicleSelector");
    var hint = document.getElementById("vehicleSelectorHint");

    if (form) {
        form.classList.add("hidden");
    }

    if (vehicleSelector) {
        vehicleSelector.value = "";
    }

    if (hint) {
        hint.classList.remove("hidden");
    }

    if (typeof window.resetSelectedStationForRefill === "function") {
        window.resetSelectedStationForRefill();
    }

    window.selectedVehicleId = null;
    updateVehicleHash("");
}

function renderVehicles(vehicles) {
    var vehicleSelector = document.getElementById("vehicleSelector");
    var emptyState = document.getElementById("vehiclesEmptyState");
    var hint = document.getElementById("vehicleSelectorHint");
    window.cachedVehicles = vehicles;

    var preferences = getRefillPreferences();
    var lastVehicleId = preferences.lastVehicleId;
    var hashVehicleId = getVehicleIdFromHash();
    var selectedVehicleId = vehicles.some(function (vehicle) {
        return vehicle.id === hashVehicleId;
    }) ? hashVehicleId : "";

    if (!selectedVehicleId) {
        selectedVehicleId = vehicles.some(function (vehicle) {
            return vehicle.id === lastVehicleId;
        }) ? lastVehicleId : "";
    }

    populateVehicleSelect(vehicleSelector, vehicles, selectedVehicleId, true);

    if (emptyState) {
        emptyState.classList.toggle("hidden", vehicles.length !== 0);
    }

    if (hint) {
        hint.classList.toggle("hidden", vehicles.length === 0);
    }

    if (vehicles.length === 0) {
        hideRefillForm();
        return;
    }

    if (selectedVehicleId) {
        showRefillForm(selectedVehicleId);
    }
}

function handleHashChange() {
    var vehicleId = getVehicleIdFromHash();

    if (!vehicleId) {
        hideRefillForm();
        return;
    }

    if (!getVehicleById(vehicleId)) {
        return;
    }

    showRefillForm(vehicleId);
}

function saveCurrentPreferences() {
    var vehicleId = document.getElementById("vehicleSelector").value;
    var preferences = getRefillPreferences();

    preferences.lastVehicleId = vehicleId;
    preferences.lastCurrency = document.getElementById("currency").value;
    preferences.lastQuantityUnit = document.getElementById("quantityUnit").value;
    preferences.lastPriceUnit = document.getElementById("priceUnit").value;
    preferences.lastFuelByVehicle = preferences.lastFuelByVehicle || {};

    if (vehicleId) {
        preferences.lastFuelByVehicle[vehicleId] = document.getElementById("refillFuel").value;
    }

    saveRefillPreferences(preferences);
}

function formatRefillDateForApi(datetimeLocalValue) {
    if (!datetimeLocalValue) {
        return "";
    }

    return datetimeLocalValue.replace("T", " ");
}

function getSelectedStationIdForPayload() {
    if (typeof window.getSelectedStationForRefill !== "function") {
        return null;
    }

    var stationSelection = window.getSelectedStationForRefill();
    var stationId = stationSelection && stationSelection.stationId;
    return stationId ? String(stationId) : null;
}

function buildStationInfoForPayload() {
    if (typeof window.getSelectedStationForRefill !== "function") {
        return "{}";
    }

    var stationSelection = window.getSelectedStationForRefill() || {};
    var source = String(stationSelection.source || "").trim();
    var stationName = String(stationSelection.name || "").trim();

    if (source === "recent" && stationName) {
        //return JSON.stringify({ recent: stationName });
        return ({ recent: stationName });
    }

    if (source === "location" && stationName) {
        return ({
            nearest: stationName,
            lat: String(stationSelection.latitude || ""),
            long: String(stationSelection.longitude || ""),
            id: String(stationSelection.nearestId || "")
        });
    }

    return "{}";
}

function buildRefillPayload() {
    return {
        refillDate: formatRefillDateForApi(document.getElementById("refillDate").value),
        stationId: getSelectedStationIdForPayload(),
        stationInfo: buildStationInfoForPayload(),
        fuelType: document.getElementById("refillFuel").value,
        totalPrice: document.getElementById("refillTotalPrice").value,
        currency: document.getElementById("currency").value,
        quantity: document.getElementById("refillQuantity").value,
        quantityUnit: document.getElementById("quantityUnit").value,
        unitPrice: document.getElementById("refillUnitPrice").value,
        priceUnit: document.getElementById("priceUnit").value,
        mileage: document.getElementById("refillMileage").value
    };
}

function isRefillAmountCoherent() {
    var totalPriceRaw = document.getElementById("refillTotalPrice").value;
    var quantityRaw = document.getElementById("refillQuantity").value;
    var unitPriceRaw = document.getElementById("refillUnitPrice").value;

    if (totalPriceRaw === "" && quantityRaw === "" && unitPriceRaw === "")
        return false; // If all fields are empty, we consider the coherence check as failed, to encourage users to fill at least two of them.
    if (totalPriceRaw === "")
    {
        totalPriceRaw = document.getElementById("refillTotalPrice").value = parseFloat(quantityRaw) * parseFloat(unitPriceRaw);
    } else if (quantityRaw === "")
    {
        quantityRaw = document.getElementById("refillQuantity").value = parseFloat(totalPriceRaw) / parseFloat(unitPriceRaw);
    } else if (unitPriceRaw === "")
    {
        unitPriceRaw = document.getElementById("refillUnitPrice").value = parseFloat(totalPriceRaw) / parseFloat(quantityRaw);
    }

    // Apply the coherence check only when all 3 fields are completed.
    if (!totalPriceRaw || !quantityRaw || !unitPriceRaw) {
        return true;
    }

    var totalPrice = parseFloat(totalPriceRaw);
    var quantity = parseFloat(quantityRaw);
    var unitPrice = parseFloat(unitPriceRaw);

    if (!Number.isFinite(totalPrice) || !Number.isFinite(quantity) || !Number.isFinite(unitPrice)) {
        return false;
    }

    var computedTotal = quantity * unitPrice;
    var tolerance = Math.abs(totalPrice) * 0.1;
    return Math.abs(computedTotal - totalPrice) <= tolerance;
}

async function postRefill(vehicleId) {
    const data = await apiPost("?o=refill&a=add&vehicleid=" + encodeURIComponent(vehicleId), buildRefillPayload());
    if (data && data.success === false) {
        throw new Error(data.message || "Failed to save refill");
    }
}

function bindEvents() {
    var navToggleButton = document.getElementById("navToggleBtn");
    var navCloseButton = document.getElementById("navCloseBtn");
    var navOverlay = document.getElementById("navOverlay");
    var vehicleSelector = document.getElementById("vehicleSelector");
    var refillForm = document.getElementById("refillForm");
    var refillCancelButton = document.getElementById("refillCancelBtn");

    if (navToggleButton) {
        navToggleButton.addEventListener("click", toggleNav);
    }

    if (navCloseButton) {
        navCloseButton.addEventListener("click", toggleNav);
    }

    if (navOverlay) {
        navOverlay.addEventListener("click", toggleNav);
    }

    vehicleSelector.addEventListener("change", function () {
        if (!this.value) {
            hideRefillForm();
            return;
        }

        showRefillForm(this.value);
    });

    if (refillCancelButton) {
        refillCancelButton.addEventListener("click", hideRefillForm);
    }

    refillForm.addEventListener("submit", async function (event) {
        event.preventDefault();
        var vehicleId = document.getElementById("vehicleSelector").value;

        if (!vehicleId) {
            alert("Please choose a vehicle");
            return;
        }

        if (!isRefillAmountCoherent()) {
            alert("The values you entered are probably incorrect");
            return;
        }

        try {
            await postRefill(vehicleId);
        } catch (error) {
            alert(error.message || "Failed to save refill. Please try again.");
            return;
        }

        saveCurrentPreferences();
        window.location.href = "vehicle_history.html?vehicleid=" + encodeURIComponent(vehicleId);
    });
}

function setVehicleLoading(isLoading) {
    var loadingIndicator = document.getElementById("vehicleLoading");

    if (!loadingIndicator) {
        return;
    }

    loadingIndicator.classList.toggle("hidden", !isLoading);
}

async function initVehicles() {
    var usingApi = typeof isUserLoggedIn === "function" && isUserLoggedIn();

    if (usingApi) {
        setVehicleLoading(true);
    } else {
        setVehicleLoading(false);
    }

    try {
        var loadedVehicles = await loadVehicles();
        renderVehicles(sortVehiclesByName(loadedVehicles));
    } catch (error) {
        renderVehicles([]);
    } finally {
        setVehicleLoading(false);
    }
}

document.addEventListener("DOMContentLoaded", function () {
    bindEvents();
    if (typeof window.initStationPicker === "function") {
        window.initStationPicker();
    }
    initVehicles();
    document.getElementById("refillDate").value = getCurrentDateTimeLocalValue();
});

window.addEventListener("hashchange", handleHashChange);

window.toggleNav = toggleNav;
window.showRefillForm = showRefillForm;
window.hideRefillForm = hideRefillForm;
