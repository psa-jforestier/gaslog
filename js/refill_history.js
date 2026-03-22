function setRefillHistoryLoading(isLoading) {
    setElementHiddenById("refillHistoryLoading", !isLoading);
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

function formatRefillDate(value) {
    return formatDateTimeForDisplay(value);
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

    sortRefillsByDateDesc(refills).forEach(function (refill) {
            const row = document.createElement("tr");
            const values = [
                formatRefillDate(refill.date),
                formatMoneyValue(refill.totalPrice, refill.currency),
                formatNumberValue(refill.quantity) + (Number.isFinite(Number(refill.quantity)) ? " L" : ""),
                formatFuelPriceValue(refill.fuelPrice, refill.currency, refill.fuelPriceUnit),
                refill.fuelType || "-",
                formatNumberValue(refill.mileage, {
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
    updateVehiclePageLinks("#showGraphicsBtn", "graphics.html", vehicleId);
   
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
        const allRefills = normalizeRefillRecords(data.allrefills);

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
