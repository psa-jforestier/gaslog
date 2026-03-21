var API_ENDPOINT = "/app/api.php";
var VEHICLE_STORAGE_KEY = "gaslogVehicle";
var VEHICLE_BRANDS = ["Audi", "BMW", "Citroen", "Ford", "Mercedes", "Peugeot", "Renault", "Tesla", "Toyota", "Volkswagen", "Other"];
var VEHICLE_FUELS = ["SP95E10", "SP95E5", "SP98", "E85", "Diesel", "Premium Diesel", "GPL", "LGPL", "CNG/GNV"];

function getCookie(name) {
    const value = "; " + document.cookie;
    const parts = value.split("; " + name + "=");
    if (parts.length === 2) {
        return parts.pop().split(";").shift();
    }
    return null;
}

function isUserLoggedIn() {
    
    const cookieValue = getCookie("gaslog_userhash");
    console.log("Checking login status, gaslog_userhash cookie value:", cookieValue);
    if (!cookieValue) {
        return false;
    }
    //return cookieValue.toLowerCase() === "true";
    return true;
}

function toggleNav() {
    document.getElementById("navSidebar").classList.toggle("active");
    document.getElementById("navOverlay").classList.toggle("active");
}

function getLocalVehicles() {
    var localValue = localStorage.getItem(VEHICLE_STORAGE_KEY);
    if (!localValue) {
        return [];
    }

    try {
        var parsed = JSON.parse(localValue);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        return [];
    }
}

function setLocalVehicles(vehicles) {
    localStorage.setItem(VEHICLE_STORAGE_KEY, JSON.stringify(Array.isArray(vehicles) ? vehicles : []));
}

function getLocalVehicleById(vehicleId) {
    var vehicles = getLocalVehicles();
    return vehicles.find(function (vehicle) {
        return String(vehicle.id) === String(vehicleId);
    }) || null;
}

function createLocalVehicle(vehicleData) {
    var vehicles = getLocalVehicles();
    var nextVehicle = Object.assign({}, vehicleData, { id: "vehicle-" + Date.now() });
    vehicles.push(nextVehicle);
    setLocalVehicles(vehicles);
    return nextVehicle;
}

function updateLocalVehicle(vehicleId, vehicleData) {
    var vehicles = getLocalVehicles();
    var index = vehicles.findIndex(function (vehicle) {
        return String(vehicle.id) === String(vehicleId);
    });

    if (index === -1) {
        throw new Error("Vehicle not found in local storage");
    }

    vehicles[index] = Object.assign({}, vehicleData, { id: vehicleId });
    setLocalVehicles(vehicles);
}

function deleteLocalVehicle(vehicleId) {
    var vehicles = getLocalVehicles().filter(function (vehicle) {
        return String(vehicle.id) !== String(vehicleId);
    });

    setLocalVehicles(vehicles);
}

/**
 * assume the date come from the API, yyyy-mm-dd hh:ii 
 * return a short localized date for display, or "Unknown" if the date is not valid
 */
function formatDateTimeForDisplay(dateString) {
    if (!dateString) {
        return "Unknown";
    }
    const d = new Date(dateString);
    if (isNaN(d.getTime())) {
        return "Unknown";
    }
    const locale = []; // use browser locale
    return d.toLocaleDateString(locale) + " " + d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
}

function formatDateForDateInput(dateString) {
    if (!dateString) {
        return "";
    }

    try {
        var date = new Date(dateString);
        if (isNaN(date.getTime())) {
            return "";
        }

        var year = date.getFullYear();
        var month = String(date.getMonth() + 1).padStart(2, "0");
        var day = String(date.getDate()).padStart(2, "0");
        return year + "-" + month + "-" + day;
    } catch (error) {
        return "";
    }
}

function renderVehicleBrandOptions(selectElement) {
    if (!selectElement) {
        return;
    }

    selectElement.innerHTML = "";

    var placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Select a brand";
    selectElement.appendChild(placeholder);

    VEHICLE_BRANDS.forEach(function (brand) {
        var option = document.createElement("option");
        option.value = brand;
        option.textContent = brand;
        selectElement.appendChild(option);
    });
}

function renderFuelButtons(containerElement) {
    if (!containerElement) {
        return;
    }

    containerElement.innerHTML = "";

    VEHICLE_FUELS.forEach(function (fuel) {
        var button = document.createElement("button");
        button.type = "button";
        button.className = "push-btn";
        button.setAttribute("data-fuel", fuel);
        button.textContent = fuel;
        containerElement.appendChild(button);
    });
}

function bindFuelButtons(containerElement) {
    if (!containerElement) {
        return;
    }

    containerElement.querySelectorAll(".push-btn").forEach(function (button) {
        button.addEventListener("click", function () {
            this.classList.toggle("is-active");
        });
    });
}

function getSelectedFuelsFromContainer(containerElement) {
    if (!containerElement) {
        return [];
    }

    return Array.from(containerElement.querySelectorAll(".push-btn.is-active")).map(function (button) {
        return button.getAttribute("data-fuel");
    });
}

function setSelectedFuelsInContainer(containerElement, fuels) {
    if (!containerElement || !Array.isArray(fuels)) {
        return;
    }

    containerElement.querySelectorAll(".push-btn").forEach(function (button) {
        var fuel = button.getAttribute("data-fuel");
        button.classList.toggle("is-active", fuels.includes(fuel));
    });
}

function getVehicleFormData(options) {
    var config = options || {};
    var fuelContainer = config.fuelContainer || document;
    var name = document.getElementById("vehicleName").value.trim();
    var brand = document.getElementById("vehicleBrand").value;
    var purchaseDate = document.getElementById("purchaseDate").value;
    var initialMileage = document.getElementById("initialMileage").value;
    var distanceUnit = document.getElementById("distanceUnit").value;
    var fuels = getSelectedFuelsFromContainer(fuelContainer);

    return {
        name: name,
        brand: brand,
        purchaseDate: purchaseDate,
        initialMileage: initialMileage ? parseInt(initialMileage, 10) : 0,
        distanceUnit: distanceUnit,
        fuels: fuels
    };
}

function populateVehicleForm(vehicleData, options) {
    var config = options || {};
    var fuelContainer = config.fuelContainer || document;
    var selectedName = vehicleData.name || vehicleData.label || "";

    document.getElementById("vehicleName").value = selectedName;
    document.getElementById("vehicleBrand").value = vehicleData.brand || "";
    document.getElementById("purchaseDate").value = formatDateForDateInput(vehicleData.purchaseDate);
    document.getElementById("initialMileage").value = vehicleData.initialMileage || vehicleData.lastMileage || "";
    document.getElementById("distanceUnit").value = vehicleData.distanceUnit || vehicleData.distance_unit || "km";

    if (vehicleData.fuels) {
        setSelectedFuelsInContainer(fuelContainer, vehicleData.fuels);
    }
}

function normalizeVehicles(rawVehicles) {
    if (!Array.isArray(rawVehicles)) {
        return [];
    }

    return rawVehicles
        .map(function (item, index) {
            if (typeof item === "string") {
                const label = item.trim();
                if (!label) {
                    return null;
                }

                return {
                    id: "vehicle-" + index,
                    label: label,
                    brand: label.split(" ")[0] || "",
                    model: label.split(" ").slice(1).join(" ") || ""
                };
            }

            if (item && typeof item === "object") {
                const label =
                    item.label ||
                    item.name ||
                    item.title ||
                    [item.brand, item.model].filter(Boolean).join(" ").trim();

                if (!label) {
                    return null;
                }

                return {
                    id: String(item.id || item.uuid || item.slug || "vehicle-" + index),
                    label: label,
                    brand: item.brand || item.make || label.split(" ")[0] || "",
                    model: item.model || label.split(" ").slice(1).join(" ") || "",
                    lastMileage: item.lastMileage || item.last_mileage || item.mileage || null,
                    fuels: item.fuels || item.fuelTypes || item.fuel_types || [],
                    lastRefill: item.lastRefill || item.last_refill || item.lastFillup || null
                };
            }

            return null;
        })
        .filter(Boolean);
}

function getDisplayNameFromUser(user) {
    if (!user || typeof user !== "object") {
        return "";
    }

    const name = String(user.name || "").trim();
    if (name) {
        return name;
    }

    const email = String(user.email || "").trim();
    return email;
}

function updateMainScreenWelcome(user) {
    const userStatus = document.getElementById("userStatus");
    if (!userStatus) {
        return;
    }

    const displayName = getDisplayNameFromUser(user);
    if (!displayName) {
        return;
    }

    userStatus.textContent = "Welcome " + displayName;
}

async function loadVehicles() {
    if (isUserLoggedIn()) {
        const response = await fetch(API_ENDPOINT + "?o=vehicles", { method: "GET" });

        if (!response.ok) {
            throw new Error("Unable to load vehicles from API");
        }

        const payload = await response.json();

        if (payload && payload.user) {
            window.currentUser = payload.user;
            updateMainScreenWelcome(payload.user);
        }

        if (Array.isArray(payload)) {
            return normalizeVehicles(payload);
        }

        if (payload && Array.isArray(payload.data)) {
            return normalizeVehicles(payload.data);
        }

        if (payload && Array.isArray(payload.vehicles)) {
            return normalizeVehicles(payload.vehicles);
        }

        return [];
    }

    return normalizeVehicles(getLocalVehicles());
}

function formatFuels(fuels) {
    if (!fuels || !Array.isArray(fuels) || fuels.length === 0) {
        return "No fuel info";
    }
    return "Fuels: " + fuels.join(", ");
}

function formatDate(dateString) {
    if (!dateString) {
        return "Unknown";
    }
    
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            return dateString;
        }
        
        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const year = date.getFullYear();
        return day + "/" + month + "/" + year;
    } catch (error) {
        return dateString;
    }
}

function sortVehiclesByName(vehicles) {
    if (!Array.isArray(vehicles)) {
        return [];
    }
    
    return vehicles.slice().sort(function (a, b) {
        const labelA = (a.label || "").toLowerCase();
        const labelB = (b.label || "").toLowerCase();
        
        if (labelA < labelB) {
            return -1;
        }
        if (labelA > labelB) {
            return 1;
        }
        return 0;
    });
}

/**
 * Update all QuerySelectr to use a new href on click, useful for example when we want to update the link of all "View all refill" buttons on the vehicle history page to point to the correct vehicle id
 * @param {A} selector  "#id" or ".class" of the button(s) to update
 * @param {*} newhref new link
 */
function updateButtonLinksBySelector(selector, newhref) {
    const btns = document.querySelectorAll(selector);
    btns.forEach(function (btn) {
        btn.href = newhref;
        btn.onclick = function () {
            window.location.href = newhref ;
        };
    });
}

window.toggleNav = toggleNav;
window.VEHICLE_STORAGE_KEY = VEHICLE_STORAGE_KEY;
window.VEHICLE_BRANDS = VEHICLE_BRANDS;
window.VEHICLE_FUELS = VEHICLE_FUELS;
window.getLocalVehicles = getLocalVehicles;
window.setLocalVehicles = setLocalVehicles;
window.getLocalVehicleById = getLocalVehicleById;
window.createLocalVehicle = createLocalVehicle;
window.updateLocalVehicle = updateLocalVehicle;
window.deleteLocalVehicle = deleteLocalVehicle;
window.formatDateForDateInput = formatDateForDateInput;
window.renderVehicleBrandOptions = renderVehicleBrandOptions;
window.renderFuelButtons = renderFuelButtons;
window.bindFuelButtons = bindFuelButtons;
window.getSelectedFuelsFromContainer = getSelectedFuelsFromContainer;
window.setSelectedFuelsInContainer = setSelectedFuelsInContainer;
window.getVehicleFormData = getVehicleFormData;
window.populateVehicleForm = populateVehicleForm;
