function getStationsElements() {
	return {
		list: document.getElementById("stationsList"),
		status: document.getElementById("stationsStatus")
	};
}

function getAddStationElements() {
	return {
		mapContainer: document.getElementById("addStationMapContainer"),
		mapCanvas: document.getElementById("addStationLeafletMap"),
		locationText: document.getElementById("addStationLocationText"),
		nameInput: document.getElementById("addStationName"),
		latitudeInput: document.getElementById("addStationLatitude"),
		longitudeInput: document.getElementById("addStationLongitude"),
		okButton: document.getElementById("addStationOkBtn"),
		status: document.getElementById("addStationStatus"),
		errorMessage: document.getElementById("addStationErrorMessage")
	};
}

var addStationMap = null;
var addStationMarker = null;

function normalizeStationRecords(rawStations) {
	if (!Array.isArray(rawStations)) {
		return [];
	}

	return rawStations
		.map(function (item) {
			if (!item || typeof item !== "object") {
				return null;
			}

			return {
				id: String(item.id || item.stationid || item.stationId || "").trim(),
				name: String(item.name || "").trim(),
				createdDate: String(item.created_date || item.createdDate || "").trim(),
				lastUsageDate: String(item.last_usage_date || item.lastusage || item.lastUsageDate || "").trim()
			};
		})
		.filter(function (station) {
			return station && station.name;
		});
}

function parseApiDateToTimestamp(value) {
	var text = String(value || "").trim();
	if (!text) {
		return 0;
	}

	var normalized = text.replace(" ", "T");
	var parsed = new Date(normalized).getTime();
	return Number.isFinite(parsed) ? parsed : 0;
}

function formatStationDate(value, emptyLabel) {
	var timestamp = parseApiDateToTimestamp(value);
	if (!timestamp) {
		return emptyLabel || "-";
	}

	return new Date(timestamp).toLocaleDateString([]);
}

function setAddStationStatus(message, options) {
	var elements = getAddStationElements();
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

function setAddStationErrorMessage(message) {
	var elements = getAddStationElements();
	if (!elements.errorMessage) {
		return;
	}

	var text = String(message || "").trim();
	elements.errorMessage.textContent = text;
	elements.errorMessage.classList.toggle("hidden", !text);
}

function updateAddStationCoordinateFields(latitude, longitude) {
	var elements = getAddStationElements();
	if (elements.latitudeInput) {
		elements.latitudeInput.value = latitude === null ? "" : String(latitude);
	}

	if (elements.longitudeInput) {
		elements.longitudeInput.value = longitude === null ? "" : String(longitude);
	}

	if (elements.locationText) {
		if (latitude !== null && longitude !== null) {
			elements.locationText.innerHTML = "Map (Leaflet OpenStreetMap)<br>Drag pin to select gas station location";
		} else {
			elements.locationText.innerHTML = "Map (Leaflet OpenStreetMap)<br>Drag pin to select gas station location";
		}
	}
}

function syncAddStationCoordinatesFromMap(latitude, longitude) {
	updateAddStationCoordinateFields(latitude, longitude);
}

function updateAddStationButtonState() {
	var elements = getAddStationElements();
	if (!elements.okButton || !elements.nameInput) {
		return;
	}

	var stationName = String(elements.nameInput.value || "").trim();
	elements.okButton.disabled = stationName.length === 0;
}

function initAddStationMap(latitude, longitude) {
	var elements = getAddStationElements();
	if (!elements.mapContainer || !elements.mapCanvas || typeof L === "undefined") {
		return false;
	}

	elements.mapContainer.style.display = "block";

	if (!addStationMap) {
		addStationMap = L.map("addStationLeafletMap", {
			center: [latitude, longitude],
			zoom: 15,
			zoomControl: true
		});

		L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
			attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
			maxZoom: 19
		}).addTo(addStationMap);
	} else {
		addStationMap.setView([latitude, longitude], 15);
	}

	if (addStationMarker) {
		addStationMarker.setLatLng([latitude, longitude]);
		if (addStationMarker.dragging) {
			addStationMarker.dragging.enable();
		}
	} else {
		addStationMarker = L.marker([latitude, longitude], {
			draggable: true
		}).addTo(addStationMap);
		addStationMarker.bindPopup("Gas Station");
		addStationMarker.on("drag", function (event) {
			var moved = event.target.getLatLng();
			syncAddStationCoordinatesFromMap(moved.lat, moved.lng);
		});
		addStationMarker.on("dragend", function (event) {
			var moved = event.target.getLatLng();
			syncAddStationCoordinatesFromMap(moved.lat, moved.lng);
		});
	}

	window.setTimeout(function () {
		if (addStationMap) {
			addStationMap.invalidateSize();
		}
	}, 0);

	syncAddStationCoordinatesFromMap(latitude, longitude);
	return true;
}

function parseAddStationCoordinate(value) {
	var number = Number(value);
	return Number.isFinite(number) ? number : null;
}

function getAddStationCoordinates() {
	var elements = getAddStationElements();

	return {
		latitude: parseAddStationCoordinate(elements.latitudeInput && elements.latitudeInput.value),
		longitude: parseAddStationCoordinate(elements.longitudeInput && elements.longitudeInput.value)
	};
}

async function saveNewStationToApi(stationName, latitude, longitude) {
	if (typeof window.apiPost === "undefined") {
		throw new Error("API communication not available");
	}

	var result = await apiPost("?o=station&a=add", {
		name: stationName,
		lat: latitude,
		long: longitude
	});

	if (result && result.success === false) {
		throw new Error(result.message || "Unable to save station");
	}

	return result;
}

function saveNewStationToLocalStorage(stationName, latitude, longitude) {
	var STATION_STORAGE_KEY = window.STATION_STORAGE_KEY;
	if (!STATION_STORAGE_KEY) {
		throw new Error("Storage key not available");
	}

	try {
		var stations = JSON.parse(localStorage.getItem(STATION_STORAGE_KEY) || "[]");
		if (!Array.isArray(stations)) {
			stations = [];
		}

		var newStation = {
			id: "local_" + Date.now(),
			stationId: "local_" + Date.now(),
			name: stationName,
			latitude: latitude,
			longitude: longitude,
			createdDate: new Date().toISOString()
		};

		stations.push(newStation);
		localStorage.setItem(STATION_STORAGE_KEY, JSON.stringify(stations));
	} catch (error) {
		throw new Error("Unable to save station locally: " + error.message);
	}
}

async function handleAddStationSave() {
	var elements = getAddStationElements();
	var stationName = String(elements.nameInput && elements.nameInput.value || "").trim();
	var coords = getAddStationCoordinates();
	var isLoggedIn = typeof window.isUserLoggedIn === "function" && window.isUserLoggedIn();

	if (!stationName) {
		setAddStationStatus("Station name is required.");
		return;
	}

	if (coords.latitude === null || coords.longitude === null) {
		setAddStationStatus("Please drag the marker to select a location.");
		return;
	}

	if (elements.okButton) {
		elements.okButton.disabled = true;
	}

	setAddStationStatus("Saving station...", { showHourglass: true });
	setAddStationErrorMessage("");

	try {
		if (isLoggedIn) {
			await saveNewStationToApi(stationName, coords.latitude, coords.longitude);
		} else {
			saveNewStationToLocalStorage(stationName, coords.latitude, coords.longitude);
		}

		window.location.href = "stations.html";
	} catch (error) {
		console.error("Unable to save station:", error);
		setAddStationStatus("");
		var errorText = error && error.message ? error.message : "Unable to save station.";
		setAddStationErrorMessage(errorText);
		if (elements.okButton) {
			elements.okButton.disabled = false;
		}
	}
}

function bindAddStationEventListeners() {
	var elements = getAddStationElements();

	if (elements.okButton) {
		elements.okButton.addEventListener("click", function () {
			handleAddStationSave();
		});
	}

	if (elements.nameInput) {
		elements.nameInput.addEventListener("input", function () {
			updateAddStationButtonState();
		});
	}
}

function initAddStationWithGeolocation() {
	var elements = getAddStationElements();
	
	bindAddStationEventListeners();

	if (!navigator.geolocation) {
		console.warn("Geolocation not supported, using default location");
		initAddStationMap(48.8566, 2.3522);
		return;
	}

	setAddStationStatus("Getting your location...", { showHourglass: true });

	navigator.geolocation.getCurrentPosition(
		function onSuccess(position) {
			var latitude = position.coords.latitude;
			var longitude = position.coords.longitude;
			setAddStationStatus("");
			initAddStationMap(latitude, longitude);
		},
		function onError(error) {
			console.warn("Geolocation error:", error);
			setAddStationStatus("");
			initAddStationMap(48.8566, 2.3522);
		},
		{
			enableHighAccuracy: false,
			timeout: 10000,
			maximumAge: 300000
		}
	);
}

function setStationsStatus(message, options) {
	var elements = getStationsElements();
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
	elements.status.classList.toggle("hidden", !message);
}

function createStationCard(station) {
	var card = document.createElement("div");
	card.className = "item-card";
	card.onclick = function () {
		window.location.href = station.id
			? "station_details.html?stationid=" + encodeURIComponent(station.id)
			: "station_details.html";
	};

	var title = document.createElement("h3");
	title.textContent = station.name;

	var meta = document.createElement("div");
	meta.className = "item-meta";

	var firstUsed = document.createElement("span");
	firstUsed.textContent = "First used: " + formatStationDate(station.createdDate, "Unknown");

	var lastUsed = document.createElement("span");
	lastUsed.textContent = "Last used: " + formatStationDate(station.lastUsageDate, "Never");

	meta.appendChild(firstUsed);
	meta.appendChild(lastUsed);
	card.appendChild(title);
	card.appendChild(meta);

	return card;
}

function renderStations(stations) {
	var elements = getStationsElements();
	if (!elements.list) {
		return;
	}

	elements.list.innerHTML = "";

	stations.forEach(function (station) {
		elements.list.appendChild(createStationCard(station));
	});
}

async function loadStationsFromApi() {
	var payload = await apiGet("?o=stations");

	if (Array.isArray(payload)) {
		return normalizeStationRecords(payload);
	}

	if (payload && payload.success === false) {
		throw new Error(payload.message || "Failed to load stations");
	}

	if (payload && Array.isArray(payload.stations)) {
		return normalizeStationRecords(payload.stations);
	}

	if (payload && Array.isArray(payload.data)) {
		return normalizeStationRecords(payload.data);
	}

	return [];
}

async function initStationsPage() {
	if (typeof window.isUserLoggedIn !== "function" || !window.isUserLoggedIn()) {
		return;
	}

	setStationsStatus("Loading stations...", { showHourglass: true });

	try {
		var stations = await loadStationsFromApi();
		renderStations(stations);

		if (stations.length === 0) {
			setStationsStatus("No stations found.");
			return;
		}

		setStationsStatus("");
	} catch (error) {
		console.error("Unable to load stations:", error);
		setStationsStatus("Unable to load stations from the API.");
	}
}

document.addEventListener("DOMContentLoaded", function () {
	initStationsPage();
	initAddStationWithGeolocation();
});
