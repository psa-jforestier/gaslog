function isUserLoggedIn() {
    if (typeof window.islogged === "boolean") {
        return window.islogged;
    }

    return String(window.islogged).toLowerCase() === "true";
}

function toggleNav() {
    document.getElementById("navSidebar").classList.toggle("active");
    document.getElementById("navOverlay").classList.toggle("active");
}

function showRefillForm() {
    if (isRefillDisabled()) {
        return;
    }

    document.getElementById("mainSection").classList.add("hidden");
    document.getElementById("refillSection").classList.remove("hidden");
}

function isRefillDisabled() {
    const refillBtn = document.getElementById("refillBtn");
    return Boolean(refillBtn && refillBtn.disabled);
}

function hideRefillForm() {
    document.getElementById("mainSection").classList.remove("hidden");
    document.getElementById("refillSection").classList.add("hidden");
}

function showStationPicker() {
    document.getElementById("stationPickerOverlay").classList.add("active");
}

function hideStationPicker() {
    document.getElementById("stationPickerOverlay").classList.remove("active");
}

function selectStation() {
    const selected = document.querySelector('input[name="station"]:checked');
    const newStation = document.getElementById("newStation").value;

    if (selected) {
        document.getElementById("selectedStation").textContent = selected.nextElementSibling.textContent;
    } else if (newStation) {
        document.getElementById("selectedStation").textContent = newStation;
    }

    hideStationPicker();
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
                    label: label
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
                    label: label
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

    return String(user.email || "").trim();
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

function getVehiclesFromDom() {
    const fallback = [];
    const radioInputs = document.querySelectorAll('input[name="vehicle"]');

    radioInputs.forEach(function (input, index) {
        const label = document.querySelector('label[for="' + input.id + '"]');
        if (!label) {
            return;
        }

        fallback.push({
            id: String(input.value || input.id || "vehicle-" + index),
            label: label.textContent.trim()
        });
    });

    return fallback;
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

    const localValue = localStorage.getItem("vehicle");
    if (!localValue) {
        return [];
    }

    try {
        return normalizeVehicles(JSON.parse(localValue));
    } catch (error) {
        return [];
    }
}

function renderVehicles(vehicles) {
    const radioGroup = document.querySelector("#mainSection .radio-group");
    const refillVehicleSelect = document.getElementById("refillVehicle");
    const refillBtn = document.getElementById("refillBtn");

    if (!radioGroup || !refillVehicleSelect ) {
        return;
    }

    radioGroup.innerHTML = "";
    refillVehicleSelect.innerHTML = "";

    vehicles.forEach(function (vehicle, index) {
        const radioId = "vehicle-option-" + index;

        const optionWrapper = document.createElement("div");
        optionWrapper.className = "radio-option";

        const input = document.createElement("input");
        input.type = "radio";
        input.id = radioId;
        input.name = "vehicle";
        input.value = vehicle.id;
        input.checked = index === 0;

        const label = document.createElement("label");
        label.setAttribute("for", radioId);
        label.textContent = vehicle.label;

        optionWrapper.appendChild(input);
        optionWrapper.appendChild(label);
        radioGroup.appendChild(optionWrapper);

        const option = document.createElement("option");
        option.value = vehicle.id;
        option.textContent = vehicle.label;
        option.selected = index === 0;
        refillVehicleSelect.appendChild(option);

        input.addEventListener("change", function () {
            refillVehicleSelect.value = vehicle.id;
        });
    });

    refillVehicleSelect.addEventListener("change", function () {
        const selectedRadio = document.querySelector(
            'input[name="vehicle"][value="' + refillVehicleSelect.value + '"]'
        );
        if (selectedRadio) {
            selectedRadio.checked = true;
        }
    });

    if (refillBtn) {
        refillBtn.disabled = vehicles.length === 0;
    }
}

async function initVehicles() {
    const fallbackVehicles = getVehiclesFromDom();

    try {
        const loadedVehicles = await loadVehicles();
        if (loadedVehicles.length >= 0) {
            // If the user start from scratch, there is 0 vehicle in localstorage
            renderVehicles(loadedVehicles);
            return;
        }
    } catch (error) {
        // Keep static mockup content as fallback when API/local data are unavailable.
    }

    renderVehicles(fallbackVehicles);
}

document.addEventListener("DOMContentLoaded", function () {
    initVehicles();
});

window.toggleNav = toggleNav;
window.showRefillForm = showRefillForm;
window.hideRefillForm = hideRefillForm;
window.showStationPicker = showStationPicker;
window.hideStationPicker = hideStationPicker;
window.selectStation = selectStation;
