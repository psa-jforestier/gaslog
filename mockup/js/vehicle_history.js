function getVehicleIdFromQueryString() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("vehicleid");
}
var fuelContainer = null;

function setRefillHistoryLoading(isLoading) {
    const loadingIndicator = document.getElementById("refillHistoryLoading");

    if (!loadingIndicator) {
        return;
    }

    loadingIndicator.classList.toggle("hidden", !isLoading);
}

function getRefillHistoryBody() {
    return document.getElementById("refillHistoryBody");
}

function setStatsCellValue(cellId, value, formatOptions) {
    const cell = document.getElementById(cellId);
    if (!cell) {
        return;
    }

    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
        cell.textContent = "-";
        return;
    }

    cell.textContent = formatRefillNumber(numericValue, formatOptions);
}

function renderRefillStats(statsPayload) {
    const stats3 = statsPayload && statsPayload.stats_last_refills3 ? statsPayload.stats_last_refills3 : null;
    const stats10 = statsPayload && statsPayload.stats_last_refills10 ? statsPayload.stats_last_refills10 : null;
    const stats20000 = statsPayload && statsPayload.stats_last_refills20000 ? statsPayload.stats_last_refills20000 : null;

    setStatsCellValue("statsFuelConsumption3", stats3 && stats3.fuel_consumption_L_per_100km);
    setStatsCellValue("statsFuelConsumption10", stats10 && stats10.fuel_consumption_L_per_100km);
    setStatsCellValue("statsFuelConsumption20000", stats20000 && stats20000.fuel_consumption_L_per_100km);

    setStatsCellValue("statsCostPer100km3", stats3 && stats3.cost_per_100km);
    setStatsCellValue("statsCostPer100km10", stats10 && stats10.cost_per_100km);
    setStatsCellValue("statsCostPer100km20000", stats20000 && stats20000.cost_per_100km);

    const fuelPriceFormat = {
        minimumFractionDigits: 3,
        maximumFractionDigits: 3
    };

    setStatsCellValue("statsFuelPrice3", stats3 && stats3.fuel_price_per_L, fuelPriceFormat);
    setStatsCellValue("statsFuelPrice10", stats10 && stats10.fuel_price_per_L, fuelPriceFormat);
    setStatsCellValue("statsFuelPrice20000", stats20000 && stats20000.fuel_price_per_L, fuelPriceFormat);
}

function formatRefillDate(value) {
    return formatDateTimeForDisplay(value); // return date time formatted to locale
}

function formatRefillNumber(value, options) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
        return "-";
    }

    return new Intl.NumberFormat(undefined, options || {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(numericValue);
}

function formatRefillMoney(value, currency, suffix) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
        return "-";
    }

    const amount = formatRefillNumber(numericValue);
    const currencyLabel = typeof currency === "string" ? currency.trim() : "";
    const suffixLabel = typeof suffix === "string" ? suffix.trim() : "";

    if (suffixLabel) {
        return currencyLabel ? amount + " " + currencyLabel + suffixLabel : amount + " " + suffixLabel;
    }

    return currencyLabel ? amount + " " + currencyLabel : amount;
}

function formatFuelPriceMoney(value, currency, suffix) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
        return "-";
    }

    const amount = formatRefillNumber(numericValue, {
        minimumFractionDigits: 3,
        maximumFractionDigits: 3
    });
    const currencyLabel = typeof currency === "string" ? currency.trim() : "";
    const suffixLabel = typeof suffix === "string" ? suffix.trim() : "";

    if (suffixLabel) {
        return currencyLabel ? amount + " " + currencyLabel + suffixLabel : amount + " " + suffixLabel;
    }

    return currencyLabel ? amount + " " + currencyLabel : amount;
}

function normalizeRefills(payload) {
    if (!Array.isArray(payload)) {
        return [];
    }

    return payload.map(function (item) {
        if (!item || typeof item !== "object") {
            return null;
        }

        return {
            date: item.refill_date || item.refillDate || item.date || item.created_at || item.createdAt || "",
            totalPrice: item.total_price || item.totalPrice || item.price_total || item.priceTotal,
            quantity: item.quantity || item.volume || item.qty,
            fuelPrice: item.unit_price || item.unitPrice || item.fuel_price || item.fuelPrice || item.price_per_unit,
            fuelType: item.fuel || item.fuel_type || item.fuelType || "-",
            mileage: item.mileage || item.odometer || item.last_mileage || item.lastMileage,
            currency: item.currency || item.currency_code || item.currencyCode || "",
            fuelPriceUnit: item.fuel_price_unit || item.fuelPriceUnit || "/L"
        };
    }).filter(Boolean);
}

function getRefillSortValue(refill) {
    if (!refill || !refill.date) {
        return 0;
    }

    const timestamp = new Date(refill.date).getTime();
    if (!Number.isNaN(timestamp)) {
        return timestamp;
    }

    const normalizedValue = String(refill.date).replace(" ", "T");
    const fallbackTimestamp = new Date(normalizedValue).getTime();
    return Number.isNaN(fallbackTimestamp) ? 0 : fallbackTimestamp;
}

function getMostRecentRefills(refills, limit) {
    if (!Array.isArray(refills)) {
        return [];
    }

    return refills
        .slice()
        .sort(function (left, right) {
            return getRefillSortValue(right) - getRefillSortValue(left);
        })
        .slice(0, limit);
}

function renderRefillHistoryRows(refills, emptyMessage) {
    const tableBody = getRefillHistoryBody();

    if (!tableBody) {
        return;
    }

    tableBody.innerHTML = "";

    if (!Array.isArray(refills) || refills.length === 0) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");
        cell.colSpan = 6;
        cell.className = "refill-history-empty";
        cell.textContent = emptyMessage || "No refill history found.";
        row.appendChild(cell);
        tableBody.appendChild(row);
        return;
    }

    refills.forEach(function (refill) {
        const row = document.createElement("tr");
        const values = [
            formatRefillDate(refill.date),
            formatRefillMoney(refill.totalPrice, refill.currency),
            formatRefillNumber(refill.quantity) + (Number.isFinite(Number(refill.quantity)) ? " L" : ""),
            formatFuelPriceMoney(refill.fuelPrice, refill.currency, refill.fuelPriceUnit),
            refill.fuelType || "-",
            formatRefillNumber(refill.mileage, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            })
        ];

        values.forEach(function (value) {
            const cell = document.createElement("td");
            cell.textContent = value;
            row.appendChild(cell);
        });

        tableBody.appendChild(row);
    });
}

async function loadRefillHistory(vehicleId) {
    if (!vehicleId) {
        renderRefillStats(null);
        renderRefillHistoryRows([], "No refill history found.");
        return;
    }

    if (!isUserLoggedIn()) {
        setRefillHistoryLoading(false);
        renderRefillStats(null);
        renderRefillHistoryRows([], "Log in to load refill history.");
        return;
    }

    setRefillHistoryLoading(true);

    try {
        const response = await fetch(
            API_ENDPOINT + "?o=refills&a=shortstats&vehicleid=" + encodeURIComponent(vehicleId),
            { method: "GET" }
        );

        if (!response.ok) {
            throw new Error("Failed to load refill history");
        }

        const data = await response.json();

        if (data && data.success === false) {
            throw new Error(data.message || "Failed to load refill history");
        }

        renderRefillStats(data);
        renderRefillHistoryRows(getMostRecentRefills(normalizeRefills(data && data.refills), 5), "No refill history found.");
    } catch (error) {
        console.error("Error loading refill history:", error);
        renderRefillStats(null);
        renderRefillHistoryRows([], "Unable to load refill history.");
    } finally {
        setRefillHistoryLoading(false);
    }
}

async function loadVehicleDetails(vehicleId) {
    if (!vehicleId) {
        alert("No vehicle ID provided");
        window.location.href = "vehicles.html";
        return;
    }

    if (isUserLoggedIn()) {
        try {
            const response = await fetch(
                API_ENDPOINT + "?o=vehicle&a=getdetails&vehicleid=" + encodeURIComponent(vehicleId),
                { method: "GET" }
            );

            if (!response.ok) {
                throw new Error("Failed to load vehicle details");
            }

            const data = await response.json();

            if (data.success === false) {
                alert(data.message || "Failed to load vehicle details");
                window.location.href = "vehicles.html";
                return;
            }

            populateForm(data.vehicle || data);
        } catch (error) {
            console.error("Error loading vehicle details:", error);
            alert("Failed to load vehicle details. Please try again.");
        }
    } else {
        // Load from local storage
        loadVehicleFromLocalStorage(vehicleId);
    }
}

function loadVehicleFromLocalStorage(vehicleId) {
    try {
        const vehicle = getLocalVehicleById(vehicleId);
        if (!vehicle) {
            alert("No vehicle found");
            window.location.href = "vehicles.html";
            return;
        }

        populateForm(vehicle);
    } catch (error) {
        console.error("Error loading vehicle from local storage:", error);
        alert("Failed to load vehicle details");
        window.location.href = "vehicles.html";
    }
}

function setAllRefillsLink(vehicleId) {
    const href = vehicleId
        ? "refill_history.html?vehicleid=" + encodeURIComponent(vehicleId)
        : "refill_history.html";
    updateButtonLinksBySelector("#allRefillsLink", href);
}

function setShowGraphicsLink(vehicleId) {
        const href = vehicleId
        ? "graphics.html?vehicleid=" + encodeURIComponent(vehicleId)
        : "graphics.html";
    updateButtonLinksBySelector("#showGraphicsLink", href);
}

function populateForm(vehicleData) {
    populateVehicleForm(vehicleData, { fuelContainer: fuelContainer });

    // Update page title
    const pageTitle = document.getElementById("pageTitle");
    if (pageTitle) {
        pageTitle.textContent = (vehicleData.name || "Vehicle") + " - History";
    }

    // Store original data for comparison
    window.originalVehicleData = vehicleData;
}

function getFormData() {
    return getVehicleFormData({ fuelContainer: fuelContainer });
}

async function updateVehicleViaAPI(vehicleId, vehicleData) {
    const response = await fetch(API_ENDPOINT + "?o=vehicle&a=update&vehicleid=" + encodeURIComponent(vehicleId), {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(vehicleData)
    });

    if (!response.ok) {
        throw new Error("Failed to update vehicle");
    }

    return await response.json();
}

function updateVehicleInLocalStorage(vehicleId, vehicleData) {
    try {
        updateLocalVehicle(vehicleId, vehicleData);
    } catch (error) {
        throw new Error("Failed to update vehicle in local storage: " + error.message);
    }
}

async function handleFormSubmit(event) {
    event.preventDefault();

    const vehicleId = getVehicleIdFromQueryString();
    if (!vehicleId) {
        alert("No vehicle ID found");
        return;
    }

    const vehicleData = getFormData();

    // Validation
    if (!vehicleData.name) {
        alert("Please enter a vehicle name");
        return;
    }

    if (vehicleData.fuels.length === 0) {
        alert("Please select at least one fuel type");
        return;
    }

    try {
        if (isUserLoggedIn()) {
            const apiResponse = await updateVehicleViaAPI(vehicleId, vehicleData);

            if (apiResponse && apiResponse.success === false) {
                alert(apiResponse.message || "Failed to update vehicle");
                return;
            }
        } else {
            updateVehicleInLocalStorage(vehicleId, vehicleData);
        }

        // Redirect to vehicles list on success
        window.location.href = "vehicles.html";
    } catch (error) {
        console.error("Error updating vehicle:", error);
        alert("Failed to update vehicle. Please try again.");
    }
}

async function deleteVehicleViaAPI(vehicleId) {
    const response = await fetch(API_ENDPOINT + "?o=vehicle&a=delete&vehicleid=" + encodeURIComponent(vehicleId), {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        }
    });

    if (!response.ok) {
        throw new Error("Failed to delete vehicle");
    }

    return await response.json();
}

function deleteVehicleFromLocalStorage(vehicleId) {
    try {
        deleteLocalVehicle(vehicleId);
    } catch (error) {
        throw new Error("Failed to delete vehicle from local storage: " + error.message);
    }
}

async function handleDeleteVehicle() {
    const vehicleId = getVehicleIdFromQueryString();
    if (!vehicleId) {
        alert("No vehicle ID found");
        return;
    }

    const vehicleName = document.getElementById("vehicleName").value.trim() || "this vehicle";
    
    if (!confirm("Are you sure you want to delete " + vehicleName + "? This action cannot be undone.")) {
        return;
    }

    try {
        if (isUserLoggedIn()) {
            const apiResponse = await deleteVehicleViaAPI(vehicleId);

            if (apiResponse && apiResponse.success === false) {
                alert(apiResponse.message || "Failed to delete vehicle");
                return;
            }
        } else {
            deleteVehicleFromLocalStorage(vehicleId);
        }

        // Redirect to vehicles list on success
        alert("Vehicle deleted successfully");
        window.location.href = "vehicles.html";
    } catch (error) {
        console.error("Error deleting vehicle:", error);
        alert("Failed to delete vehicle. Please try again.");
    }
}

function initVehicleHistoryPage() {
    fuelContainer = document.getElementById("fuelButtons");
    renderVehicleBrandOptions(document.getElementById("vehicleBrand"));
    renderFuelButtons(fuelContainer);
    bindFuelButtons(fuelContainer);

    // Handle form submission
    const form = document.getElementById("vehicleHistoryForm");
    if (form) {
        form.addEventListener("submit", handleFormSubmit);
    }

    // Handle delete button
    const deleteBtn = document.getElementById("deleteVehicleBtn");
    if (deleteBtn) {
        deleteBtn.addEventListener("click", handleDeleteVehicle);
    }

    // Load vehicle details
    const vehicleId = getVehicleIdFromQueryString();
    setAllRefillsLink(vehicleId);
    setShowGraphicsLink(vehicleId);
    loadRefillHistory(vehicleId);
    loadVehicleDetails(vehicleId);
}

document.addEventListener("DOMContentLoaded", function () {
    initVehicleHistoryPage();
});
