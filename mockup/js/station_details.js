var stationMap = null;
var stationMarker = null;
var STATION_STORAGE_KEY = window.STATION_STORAGE_KEY;

function getStationDetailsElements() {
    return {
        status: document.getElementById("stationDetailsStatus"),
        name: document.getElementById("stationName"),
        latitude: document.getElementById("stationLatitude"),
        longitude: document.getElementById("stationLongitude"),
        mapContainer: document.getElementById("stationLocationMap"),
        mapCanvas: document.getElementById("stationLeafletMap"),
        locationText: document.getElementById("stationLocationText"),
        mapLinks: document.getElementById("stationMapLinks"),
        openStreetMapLink: document.getElementById("stationOpenStreetMapLink"),
        navigateLink: document.getElementById("stationNavigateLink"),
        saveButton: document.getElementById("stationSaveBtn"),
        firstUsage: document.getElementById("stationFirstUsage"),
        lastUsage: document.getElementById("stationLastUsage"),
        totalRefills: document.getElementById("stationTotalRefills"),
        errorMessage: document.getElementById("stationErrorMessage")
    };
}

function setStationDetailsStatus(message, options) {
    var elements = getStationDetailsElements();
    if (!elements.status) {
        return;
    }

    var settings = options || {};
    var text = String(message || "").trim();

    elements.status.innerHTML = "";

    if (settings.showHourglass) {
        var icon = document.createElement("span");
        icon.textContent = "\u231B ";
        icon.setAttribute("aria-hidden", "true");
        elements.status.appendChild(icon);
    }

    elements.status.appendChild(document.createTextNode(text));
    elements.status.classList.toggle("hidden", !text);
}

function setStationErrorMessage(message) {
    var elements = getStationDetailsElements();
    if (!elements.errorMessage) {
        return;
    }

    var text = String(message || "").trim();
    elements.errorMessage.textContent = text;
    elements.errorMessage.classList.toggle("hidden", !text);
}

function parseStationDate(value) {
    var text = String(value || "").trim();
    if (!text) {
        return null;
    }

    var timestamp = new Date(text.replace(" ", "T"));
    return Number.isNaN(timestamp.getTime()) ? null : timestamp;
}

function formatStationDateTime(value, fallbackText) {
    var parsedDate = parseStationDate(value);
    if (!parsedDate) {
        return fallbackText || "-";
    }

    return parsedDate.toLocaleDateString([]) + " " + parsedDate.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
    });
}

function formatStationLocation(latitude, longitude) {
    var lat = String(latitude || "").trim();
    var long = String(longitude || "").trim();

    if (!lat || !long) {
        return "Map (Leaflet OpenStreetMap)\nLocation unavailable";
    }

    return "Map (Leaflet OpenStreetMap)\nStation location: " + lat + "°, " + long + "°\nDrag pin to adjust location";
}

function parseStationCoordinate(value) {
    var number = Number(value);
    return Number.isFinite(number) ? number : null;
}

function getStationIdFromQuery() {
    if (typeof window.getQueryParam === "function") {
        return String(window.getQueryParam("stationid") || "").trim();
    }

    return String(new URLSearchParams(window.location.search).get("stationid") || "").trim();
}

function updateCoordinateFields(latitude, longitude) {
    var elements = getStationDetailsElements();
    if (elements.latitude) {
        elements.latitude.value = latitude === null ? "" : String(latitude);
    }

    if (elements.longitude) {
        elements.longitude.value = longitude === null ? "" : String(longitude);
    }
}

function getCoordinatesFromFields() {
    var elements = getStationDetailsElements();

    return {
        latitude: parseStationCoordinate(elements.latitude && elements.latitude.value),
        longitude: parseStationCoordinate(elements.longitude && elements.longitude.value)
    };
}

function readLocalStations() {
    try {
        var parsed = JSON.parse(localStorage.getItem(STATION_STORAGE_KEY) || "[]");
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        return [];
    }
}

function writeLocalStations(stations) {
    localStorage.setItem(STATION_STORAGE_KEY, JSON.stringify(Array.isArray(stations) ? stations : []));
}

function saveStationToLocalStorage(stationId, stationName, latitude, longitude) {
    var stations = readLocalStations();
    var normalizedId = String(stationId || "").trim();
    var normalizedName = String(stationName || "").trim();
    var existingIndex = stations.findIndex(function (station) {
        var candidateId = String(station && (station.stationId || station.stationid || station.id) || "").trim();
        return normalizedId !== "" && candidateId === normalizedId;
    });

    var nextStation = {
        stationId: normalizedId,
        name: normalizedName,
        latitude: latitude,
        longitude: longitude
    };

    if (existingIndex >= 0) {
        stations[existingIndex] = Object.assign({}, stations[existingIndex], nextStation);
    } else {
        stations.push(nextStation);
    }

    writeLocalStations(stations);
}

async function saveStationToApi(stationId, stationName, latitude, longitude) {
    return await apiPost("?o=station&a=update&stationid=" + encodeURIComponent(stationId), {
        name: stationName,
        lat: latitude,
        long: longitude
    });
}

async function handleStationSave() {
    var elements = getStationDetailsElements();
    var stationId = getStationIdFromQuery();
    var stationName = String(elements.name && elements.name.value || "").trim();
    var coords = getCoordinatesFromFields();
    var isLoggedIn = typeof window.isUserLoggedIn === "function" && window.isUserLoggedIn();

    if (!stationName) {
        setStationDetailsStatus("Station name is required.");
        return;
    }

    if (elements.saveButton) {
        elements.saveButton.disabled = true;
    }

    setStationDetailsStatus("Saving station...", { showHourglass: true });
    setStationErrorMessage("");

    try {
        if (isLoggedIn) {
            if (!stationId) {
                throw new Error("Missing stationid in URL");
            }

            var result = await saveStationToApi(stationId, stationName, coords.latitude, coords.longitude);
            if (result && result.success === false) {
                throw new Error(result.message || "Unable to save station");
            }
        } else {
            saveStationToLocalStorage(stationId, stationName, coords.latitude, coords.longitude);
        }

        window.location.href = "stations.html";
    } catch (error) {
        console.error("Unable to save station:", error);
        setStationDetailsStatus("");
        var errorText = error && error.message ? error.message : "Unable to save station.";
        setStationErrorMessage(errorText);
        if (elements.saveButton) {
            elements.saveButton.disabled = false;
        }
    }
}

function bindStationSaveButton() {
    var elements = getStationDetailsElements();
    if (!elements.saveButton) {
        return;
    }

    elements.saveButton.addEventListener("click", function () {
        handleStationSave();
    });
}

function updateStationMapLinks(latitude, longitude) {
    var elements = getStationDetailsElements();
    if (!elements.mapLinks || !elements.openStreetMapLink || !elements.navigateLink) {
        return;
    }

    if (latitude === null || longitude === null) {
        elements.mapLinks.classList.add("hidden");
        elements.openStreetMapLink.href = "#";
        elements.navigateLink.href = "#";
        return;
    }

    var lat = String(latitude);
    var lng = String(longitude);
    elements.openStreetMapLink.href = "https://www.openstreetmap.org/?mlat=" + encodeURIComponent(lat) + "&mlon=" + encodeURIComponent(lng) + "#map=18/" + encodeURIComponent(lat) + "/" + encodeURIComponent(lng);
    elements.navigateLink.href = "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(lat + "," + lng);
    elements.mapLinks.classList.remove("hidden");
}

function syncStationCoordinatesFromMap(latitude, longitude) {
    var elements = getStationDetailsElements();
    updateCoordinateFields(latitude, longitude);
    updateStationMapLinks(latitude, longitude);

    if (elements.locationText) {
        elements.locationText.innerHTML = formatStationLocation(latitude, longitude).replace(/\n/g, "<br>");
    }
}

function showStationMap(latitude, longitude, stationName) {
    var elements = getStationDetailsElements();
    if (!elements.mapContainer || !elements.mapCanvas || !elements.locationText || typeof L === "undefined") {
        return false;
    }

    elements.mapContainer.style.display = "block";
    elements.mapCanvas.classList.remove("hidden");
    elements.locationText.classList.add("hidden");

    if (!stationMap) {
        stationMap = L.map("stationLeafletMap", {
            center: [latitude, longitude],
            zoom: 15,
            zoomControl: true
        });

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19
        }).addTo(stationMap);
    } else {
        stationMap.setView([latitude, longitude], 15);
    }

    if (stationMarker) {
        stationMarker.setLatLng([latitude, longitude]);
        stationMarker.bindPopup(String(stationName || "Station"));
        if (stationMarker.dragging) {
            stationMarker.dragging.enable();
        }
    } else {
        stationMarker = L.marker([latitude, longitude], {
            draggable: true
        }).addTo(stationMap);
        stationMarker.bindPopup(String(stationName || "Station"));
        stationMarker.on("drag", function (event) {
            var moved = event.target.getLatLng();
            syncStationCoordinatesFromMap(moved.lat, moved.lng);
        });
        stationMarker.on("dragend", function (event) {
            var moved = event.target.getLatLng();
            syncStationCoordinatesFromMap(moved.lat, moved.lng);
        });
    }

    window.setTimeout(function () {
        if (stationMap) {
            stationMap.invalidateSize();
        }
    }, 0);

    return true;
}

function hideStationMap() {
    var elements = getStationDetailsElements();
    if (!elements.mapCanvas || !elements.locationText || !elements.mapContainer) {
        return;
    }

    elements.mapCanvas.classList.add("hidden");
    elements.locationText.classList.remove("hidden");
    elements.mapContainer.style.display = "flex";
    updateStationMapLinks(null, null);
}

function populateStationDetails(station) {
    var elements = getStationDetailsElements();
    if (!station || typeof station !== "object") {
        return;
    }

    if (elements.name) {
        elements.name.value = String(station.name || "").trim();
    }

    if (elements.locationText) {
        elements.locationText.innerHTML = formatStationLocation(station.latitude, station.longitude).replace(/\n/g, "<br>");
    }

    var latitude = parseStationCoordinate(station.latitude);
    var longitude = parseStationCoordinate(station.longitude);
    updateCoordinateFields(latitude, longitude);
    updateStationMapLinks(latitude, longitude);

    if (latitude !== null && longitude !== null) {
        showStationMap(latitude, longitude, station.name);
    } else {
        hideStationMap();
    }

    if (elements.firstUsage) {
        elements.firstUsage.textContent = formatStationDateTime(station.created_date || station.createdDate, "Unknown");
    }

    if (elements.lastUsage) {
        elements.lastUsage.textContent = formatStationDateTime(
            station.last_refill || station.last_usage_date || station.lastUsageDate,
            "Never"
        );
    }

    if (elements.totalRefills) {
        var totalRefills = Number(station.total_refills || station.totalRefills || 0);
        elements.totalRefills.textContent = totalRefills + (totalRefills === 1 ? " time" : " times");
    }
}

async function loadStationDetailsFromApi(stationId) {
    var payload = await apiGet("?o=station&a=get&stationid=" + encodeURIComponent(stationId));

    if (payload && payload.success === false) {
        throw new Error(payload.message || "Failed to load station");
    }

    if (payload && payload.station && typeof payload.station === "object") {
        return payload.station;
    }

    if (payload && typeof payload === "object") {
        return payload;
    }

    throw new Error("Invalid station payload");
}

async function initStationDetailsPage() {
    if (typeof window.isUserLoggedIn !== "function" || !window.isUserLoggedIn()) {
        return;
    }

    var stationId = getStationIdFromQuery();

    if (!stationId) {
        setStationDetailsStatus("No station selected.");
        return;
    }

    setStationDetailsStatus("Loading station details...", { showHourglass: true });

    try {
        var station = await loadStationDetailsFromApi(stationId);
        populateStationDetails(station);
        setStationDetailsStatus("");
    } catch (error) {
        console.error("Unable to load station details:", error);
        setStationDetailsStatus("Unable to load station details from the API.");
    }
}

function confirmDelete() {
    if (!confirm("Do you want to delete this station?")) {
        return;
    }

    var stationId = getStationIdFromQuery();
    var isLoggedIn = typeof window.isUserLoggedIn === "function" && window.isUserLoggedIn();

    if (isLoggedIn) {
        if (!stationId) {
            alert("Cannot delete: missing station ID.");
            return;
        }

        setStationDetailsStatus("Deleting station...", { showHourglass: true });

        apiPost("?o=station&a=delete&stationid=" + encodeURIComponent(stationId), {})
            .then(function (result) {
                if (result && result.success === false) {
                    setStationDetailsStatus("");
                    setStationErrorMessage(result.message || "Unable to delete station.");
                    return;
                }

                window.location.href = "stations.html";
            })
            .catch(function (error) {
                console.error("Unable to delete station:", error);
                setStationDetailsStatus("");
                setStationErrorMessage(error && error.message ? error.message : "Unable to delete station.");
            });
    } else {
        if (stationId) {
            var stations = readLocalStations();
            var filtered = stations.filter(function (station) {
                var candidateId = String(station && (station.stationId || station.stationid || station.id) || "").trim();
                return candidateId !== stationId;
            });
            writeLocalStations(filtered);
        }

        window.location.href = "stations.html";
    }
}

document.addEventListener("DOMContentLoaded", function () {
    bindStationSaveButton();
    initStationDetailsPage();
});

window.confirmDelete = confirmDelete;
