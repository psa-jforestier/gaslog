function getVehicleIdFromQueryString() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("vehicleid");
}

function setRefillHistoryLoading(isLoading) {
    const loadingIndicator = document.getElementById("refillHistoryLoading");

    if (!loadingIndicator) {
        return;
    }

    loadingIndicator.classList.toggle("hidden", !isLoading);
}

function setVehicleHeaderName(vehicleName) {
    const title = document.getElementById("vehicleNameTitle");
    if (!title) {
        return;
    }

    const name = String(vehicleName || "").trim();
    const label = name || "Vehicle";
    title.childNodes[0].textContent = label + " - Refill History ";
}

function setRefillSubtitle(text) {
    const subtitle = document.getElementById("refillHistorySubtitle");
    if (!subtitle) {
        return;
    }

    subtitle.textContent = text;
}

function getRefillHistoryBody() {
    return document.getElementById("refillHistoryBody");
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

function formatRefillDate(value) {
    return formatDateTimeForDisplay(value);
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
            date: item.refill_date || item.refillDate || item.date || "",
            totalPrice: item.total_price || item.totalPrice,
            quantity: item.quantity || item.volume || item.qty,
            fuelPrice: item.unit_price || item.unitPrice || item.fuel_price || item.fuelPrice,
            fuelType: item.fuel || item.fuel_type || item.fuelType || "-",
            mileage: item.mileage || item.odometer || "",
            currency: item.currency || item.currency_code || item.currencyCode || "",
            fuelPriceUnit: item.fuel_price_unit || item.fuelPriceUnit || "/L"
        };
    }).filter(Boolean);
}

function getRefillSortValue(refill) {
    if (!refill || !refill.date) {
        return 0;
    }

    const timestamp = new Date(String(refill.date).replace(" ", "T")).getTime();
    return Number.isNaN(timestamp) ? 0 : timestamp;
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

    refills
        .slice()
        .sort(function (left, right) {
            return getRefillSortValue(right) - getRefillSortValue(left);
        })
        .forEach(function (refill) {
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

function setShowGraphicsLink(vehicleId) {
    const href = vehicleId
        ? "graphics.html?vehicleid=" + encodeURIComponent(vehicleId)
        : "graphics.html";
    updateButtonLinksBySelector("#showGraphicsBtn", href);
   
}

async function loadRefillHistory(vehicleId) {
    if (!vehicleId) {
        setVehicleHeaderName("Vehicle");
        setRefillSubtitle("No vehicle id provided in URL");
        renderRefillHistoryRows([], "No refill history found.");
        return;
    }

    setShowGraphicsLink(vehicleId);

    if (!isUserLoggedIn()) {
        const localVehicle = getLocalVehicleById(vehicleId);
        setVehicleHeaderName(localVehicle && (localVehicle.name || localVehicle.label) ? (localVehicle.name || localVehicle.label) : "Vehicle");
        setRefillSubtitle("Log in to load refill history from API");
        renderRefillHistoryRows([], "Log in to load refill history.");
        return;
    }

    setRefillHistoryLoading(true);

    try {
        const response = await fetch(
            API_ENDPOINT + "?o=refills&a=allstats&vehicleid=" + encodeURIComponent(vehicleId),
            { method: "GET" }
        );

        if (!response.ok) {
            throw new Error("Failed to load refill history");
        }

        const data = await response.json();

        if (!data || data.success === false) {
            throw new Error((data && data.message) || "Failed to load refill history");
        }

        const vehicleName = data.vehicle && data.vehicle.name ? data.vehicle.name : "Vehicle";
        const allRefills = normalizeRefills(data.allrefills);

        setVehicleHeaderName(vehicleName);
        setRefillSubtitle(allRefills.length + " refill" + (allRefills.length === 1 ? "" : "s") + " found");
        renderRefillHistoryRows(allRefills, "No refill history found.");
    } catch (error) {
        console.error("Error loading refill history:", error);
        setVehicleHeaderName("Vehicle");
        setRefillSubtitle("Unable to load refill history");
        renderRefillHistoryRows([], "Unable to load refill history.");
    } finally {
        setRefillHistoryLoading(false);
    }
}

document.addEventListener("DOMContentLoaded", function () {
    const vehicleId = getVehicleIdFromQueryString();
    loadRefillHistory(vehicleId);
});
