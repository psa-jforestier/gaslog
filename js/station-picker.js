(function () {
    var STATION_STORAGE_KEY = window.STATION_STORAGE_KEY;
    var DEFAULT_STATIONS = [
        //"Total - Avenue des Champs",
        //"Shell - Route de Paris",
        //"BP - Centre Ville"
    ];
    var NEARBY_MAP_DEFAULT_ZOOM = 15;
    var NEARBY_MAP_SINGLE_STATION_ZOOM = 16;
    var NEARBY_MAP_MAX_FIT_ZOOM = 16;

    var state = {
        userLatitude: "",
        userLongitude: "",
        nearbyStations: [],
        selectedNearbyStation: null,
        nearbyRequestSequence: 0,
        mapReloadTimer: 0,
        nearbyMap: null,
        nearbyMarkersLayer: null,
        userMarker: null,
        preferredNearbyStationName: "",
        preferredNearbyStationId: "",
        ignoreNextMapMoveReload: false
    };

    var currentSelectedStation = null;

    var NEW_STATION_RADIO_VALUE = "__new__";

    function parseLastUsageToTimestamp(value) {
        var text = String(value || "").trim();

        if (!text) {
            return 0;
        }

        // Expected format: yyyy-mm-dd hh:ii
        var match = text.match(/^(\d{4})-(\d{2})-(\d{2})[\sT](\d{2}):(\d{2})$/);
        if (!match) {
            return 0;
        }

        var year = parseInt(match[1], 10);
        var month = parseInt(match[2], 10) - 1;
        var day = parseInt(match[3], 10);
        var hour = parseInt(match[4], 10);
        var minute = parseInt(match[5], 10);

        var timestamp = new Date(year, month, day, hour, minute, 0, 0).getTime();
        return Number.isFinite(timestamp) ? timestamp : 0;
    }

    function normalizeStationsFromApi(rawStations) {
        if (!Array.isArray(rawStations)) {
            return [];
        }

        var sortedByLastUsage = rawStations.slice().sort(function (left, right) {
            var leftTime = parseLastUsageToTimestamp(left && left.lastusage);
            var rightTime = parseLastUsageToTimestamp(right && right.lastusage);
            return rightTime - leftTime;
        });

        var stationEntries = [];

        sortedByLastUsage.forEach(function (item) {
            var name = "";
            var stationId = "";

            if (typeof item === "string") {
                name = normalizeStationName(item);
            } else if (item && typeof item === "object") {
                // Expected fields: stationid, name, lastusage, latitude, longitude, pluscode
                name = normalizeStationName(item.name);
                stationId = String(item.stationid || item.stationId || item.id || "").trim();
            }

            if (name && !containsStationName(stationEntries, name)) {
                stationEntries.push({
                    name: name,
                    stationId: stationId
                });
            }
        });

        return stationEntries;
    }

    async function loadStationsFromApi() {
        var response = await fetch(window.API_ENDPOINT  + "?o=stations", { method: "GET" });

        if (!response.ok) {
            throw new Error("Unable to load stations from API");
        }

        var payload = await response.json();

        if (Array.isArray(payload)) {
            return normalizeStationsFromApi(payload);
        }

        if (payload && Array.isArray(payload.stations)) {
            return normalizeStationsFromApi(payload.stations);
        }

        if (payload && Array.isArray(payload.data)) {
            return normalizeStationsFromApi(payload.data);
        }

        return [];
    }

    async function loadRecentStations() {
        var loggedIn = typeof window.isUserLoggedIn === "function" && window.isUserLoggedIn();

        if (!loggedIn) {
            setRecentStationsLoading(false);
            return readStationsFromStorage();
        }

        setRecentStationsLoading(true);

        try {
            var apiStations = await loadStationsFromApi();
            if (apiStations.length > 0) {
                writeStationsToStorage(apiStations);
                return apiStations;
            }
        } catch (error) {
            // API endpoint may not be available yet.
        } finally {
            setRecentStationsLoading(false);
        }

        return readStationsFromStorage();
    }

    function readStationsFromStorage() {
        try {
            var raw = JSON.parse(localStorage.getItem(STATION_STORAGE_KEY) || "[]");
            var uniqueStations = [];

            if (!Array.isArray(raw)) {
                return DEFAULT_STATIONS.map(function (name) {
                    return {
                        name: normalizeStationName(name),
                        stationId: ""
                    };
                });
            }

            raw.forEach(function (station) {
                var normalizedName = "";
                var stationId = "";

                if (typeof station === "string") {
                    normalizedName = normalizeStationName(station);
                } else if (station && typeof station === "object") {
                    normalizedName = normalizeStationName(station.name);
                    stationId = String(station.stationId || station.stationid || station.id || "").trim();
                }

                if (normalizedName && !containsStationName(uniqueStations, normalizedName)) {
                    uniqueStations.push({
                        name: normalizedName,
                        stationId: stationId
                    });
                }
            });

            if (uniqueStations.length === 0) {
                return DEFAULT_STATIONS.map(function (name) {
                    return {
                        name: normalizeStationName(name),
                        stationId: ""
                    };
                });
            }

            return uniqueStations;
        } catch (error) {
            return DEFAULT_STATIONS.map(function (name) {
                return {
                    name: normalizeStationName(name),
                    stationId: ""
                };
            });
        }
    }

    function writeStationsToStorage(stations) {
        var safeStations = Array.isArray(stations) ? stations : [];
        localStorage.setItem(STATION_STORAGE_KEY, JSON.stringify(safeStations));
    }

    function normalizeStationName(value) {
        return String(value || "").trim();
    }

    function containsStationName(stations, candidateName) {
        var normalizedCandidate = normalizeStationName(candidateName).toLowerCase();

        return stations.some(function (station) {
            var stationName = typeof station === "string" ? station : station && station.name;
            return String(stationName || "").trim().toLowerCase() === normalizedCandidate;
        });
    }

    function getPickerElements() {
        return {
            overlay: document.getElementById("stationPickerOverlay"),
            newStationInput: document.getElementById("newStation"),
            newStationRadio: document.getElementById("newStationRadio"),
            nearestStationLabel: document.getElementById("nearestStationLabel"),
            nearestStationMap: document.getElementById("stationPickerNearestMap"),
            locationResult: document.getElementById("locationStationResult"),
            recentStationsLoading: document.getElementById("recentStationsLoading"),
            recentStationsContainer: document.getElementById("recentStationsContainer"),
            okButton: document.getElementById("stationPickerOkBtn"),
            selectedStationLabel: document.getElementById("selectedStation")
        };
    }

    function setRecentStationsLoading(isLoading) {
        var elements = getPickerElements();

        if (!elements.recentStationsLoading) {
            return;
        }

        elements.recentStationsLoading.classList.toggle("hidden", !isLoading);
    }

    function getSelectedStationRadio() {
        return document.querySelector('input[name="station"]:checked');
    }

    function getCheckedRecentStationName() {
        var checked = getSelectedStationRadio();

        if (!checked) {
            return "";
        }

        if (checked.value === NEW_STATION_RADIO_VALUE) {
            return "";
        }

        return normalizeStationName(checked.value);
    }

    function getCheckedRecentStationId() {
        var checked = getSelectedStationRadio();

        if (!checked || checked.value === NEW_STATION_RADIO_VALUE) {
            return "";
        }

        return String(checked.dataset.stationId || "").trim();
    }

    function clearStationRadioSelection(exceptElement) {
        var radios = document.querySelectorAll('input[name="station"]');

        Array.prototype.forEach.call(radios, function (radio) {
            if (exceptElement && radio === exceptElement) {
                return;
            }

            radio.checked = false;
        });
    }

    function setNearestStationSummary(message) {
        var elements = getPickerElements();
        if (!elements.nearestStationLabel) {
            return;
        }

        elements.nearestStationLabel.textContent = String(message || "").trim();
    }

    function setLocationMapDisabled(isDisabled) {
        var elements = getPickerElements();
        if (!elements.nearestStationMap || !elements.nearestStationMap.parentNode) {
            return;
        }

        elements.nearestStationMap.parentNode.classList.toggle("is-disabled", !!isDisabled);
    }

    function escapeHtml(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function formatNearbyStationDistance(distance) {
        var numericDistance = Number(distance);

        if (!Number.isFinite(numericDistance) || numericDistance < 0) {
            return "";
        }

        if (numericDistance >= 1000) {
            return (numericDistance / 1000).toFixed(1) + " km";
        }

        return Math.round(numericDistance) + " m";
    }

    function normalizeNearbyStations(payload) {
        var rawStations = [];

        if (Array.isArray(payload)) {
            rawStations = payload;
        } else if (payload && Array.isArray(payload.stations)) {
            rawStations = payload.stations;
        } else if (payload && Array.isArray(payload.data)) {
            rawStations = payload.data;
        }

        return rawStations.map(function (station) {
            var latitude = Number(station && station.lat);
            var longitude = Number(station && station.long);

            if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
                return null;
            }

            return {
                id: String(station && (station.id || station.stationid || station.stationId) || "").trim(),
                name: buildStationLabelFromLocationData(station),
                latitude: latitude,
                longitude: longitude,
                distance: Number(station && station.distance),
                raw: station || {}
            };
        }).filter(function (station) {
            return station && station.name;
        });
    }

    function getNearbyStationPopupContent(station) {
        var title = escapeHtml(station && station.name);
        var distance = formatNearbyStationDistance(station && station.distance);
        var details = distance ? "<div>Distance: " + escapeHtml(distance) + "</div>" : "";
        return "<strong>" + title + "</strong>" + details + "<div>Tap to select</div>";
    }

    function closeAllNearbyPopups() {
        state.nearbyStations.forEach(function (station) {
            if (station && station.marker && typeof station.marker.closePopup === "function") {
                station.marker.closePopup();
            }
        });
    }

    function clearNearbyStationSelection(options) {
        var settings = options || {};

        state.selectedNearbyStation = null;
        closeAllNearbyPopups();

        if (!settings.preserveSummary) {
            setNearestStationSummary("Allow location access, then tap a pin to select a nearby station.");
        }

        updateOkButtonState();
    }

    function setNearbyStationSelection(station) {
        if (!station) {
            clearNearbyStationSelection();
            return;
        }

        state.selectedNearbyStation = {
            id: String(station.id || "").trim(),
            name: normalizeStationName(station.name),
            latitude: String(station.latitude),
            longitude: String(station.longitude),
            distance: station.distance
        };

        clearStationRadioSelection();
        closeAllNearbyPopups();

        if (station.marker && typeof station.marker.openPopup === "function") {
            station.marker.openPopup();
        }

        setNearestStationSummary("Selected nearby station: " + state.selectedNearbyStation.name);
        setLocationStatus("Move the map to reload nearby stations around the current center.");
        updateOkButtonState();
    }

    function applyPreferredNearbySelection(stations) {
        var preferredId = String(state.preferredNearbyStationId || "").trim();
        var preferredName = normalizeStationName(state.preferredNearbyStationName).toLowerCase();
        var match = null;

        if (!preferredId && !preferredName) {
            return;
        }

        match = stations.find(function (station) {
            if (preferredId && station.id === preferredId) {
                return true;
            }

            return preferredName && normalizeStationName(station.name).toLowerCase() === preferredName;
        }) || null;

        if (match) {
            setNearbyStationSelection(match);
        }

        state.preferredNearbyStationId = "";
        state.preferredNearbyStationName = "";
    }

    function renderNearbyStationsOnMap(stations) {
        if (!state.nearbyMarkersLayer || typeof L === "undefined") {
            return;
        }

        state.nearbyMarkersLayer.clearLayers();

        stations.forEach(function (station) {
            var marker = L.marker([station.latitude, station.longitude]);
            marker.bindPopup(getNearbyStationPopupContent(station));
            marker.on("click", function () {
                setNearbyStationSelection(station);
            });
            marker.addTo(state.nearbyMarkersLayer);
            station.marker = marker;
        });
    }

    function fitNearbyStationsOnMap(stations) {
        var bounds;

        if (!state.nearbyMap || typeof L === "undefined" || !Array.isArray(stations) || stations.length === 0) {
            return;
        }

        state.ignoreNextMapMoveReload = true;

        if (stations.length === 1) {
            state.nearbyMap.setView([
                stations[0].latitude,
                stations[0].longitude
            ], NEARBY_MAP_SINGLE_STATION_ZOOM, {
                animate: false
            });
            return;
        }

        bounds = L.latLngBounds(stations.map(function (station) {
            return [station.latitude, station.longitude];
        }));

        state.nearbyMap.fitBounds(bounds, {
            padding: [24, 24],
            animate: false,
            maxZoom: NEARBY_MAP_MAX_FIT_ZOOM
        });
    }

    async function fetchNearbyStations(latitude, longitude) {
        var query = window.API_ENDPOINT + "?o=station&a=getnearest&lat=" +
            encodeURIComponent(Number(latitude).toFixed(3)) + "&long=" +
            encodeURIComponent(Number(longitude).toFixed(3));
        var response = await fetch(query, {
            method: "GET",
            credentials: "same-origin"
        });

        if (!response.ok) {
            throw new Error("Unable to retrieve nearby stations.");
        }

        return await response.json();
    }

    async function reloadNearbyStationsForMap(latitude, longitude) {
        var requestId = state.nearbyRequestSequence + 1;
        state.nearbyRequestSequence = requestId;
        setLocationStatus("Loading nearby stations...");

        try {
            var payload = await fetchNearbyStations(latitude, longitude);

            if (requestId !== state.nearbyRequestSequence) {
                return;
            }

            state.nearbyStations = normalizeNearbyStations(payload);
            renderNearbyStationsOnMap(state.nearbyStations);
            fitNearbyStationsOnMap(state.nearbyStations);

            if (state.nearbyStations.length === 0) {
                clearNearbyStationSelection({ preserveSummary: true });
                setNearestStationSummary("No nearby station found in this area.");
                setLocationStatus("Move the map to search another area.");
                return;
            }

            if (state.selectedNearbyStation) {
                var stillVisible = state.nearbyStations.find(function (station) {
                    return station.id && station.id === state.selectedNearbyStation.id;
                }) || null;

                if (stillVisible) {
                    setNearbyStationSelection(stillVisible);
                    return;
                }
            }

            clearNearbyStationSelection({ preserveSummary: true });
            setNearestStationSummary("Tap a pin to select a nearby station.");
            setLocationStatus("Move the map to reload nearby stations around the current center.");
            applyPreferredNearbySelection(state.nearbyStations);
        } catch (error) {
            if (requestId !== state.nearbyRequestSequence) {
                return;
            }

            state.nearbyStations = [];
            if (state.nearbyMarkersLayer) {
                state.nearbyMarkersLayer.clearLayers();
            }
            clearNearbyStationSelection({ preserveSummary: true });
            setNearestStationSummary("Nearby stations unavailable.");
            setLocationStatus("Unable to load nearby stations for this area.");
        }
    }

    function scheduleNearbyStationsReload() {
        if (!state.nearbyMap) {
            return;
        }

        if (state.ignoreNextMapMoveReload) {
            state.ignoreNextMapMoveReload = false;
            return;
        }

        if (state.mapReloadTimer) {
            window.clearTimeout(state.mapReloadTimer);
        }

        state.mapReloadTimer = window.setTimeout(function () {
            state.mapReloadTimer = 0;
            var center = state.nearbyMap.getCenter();
            reloadNearbyStationsForMap(center.lat, center.lng);
        }, 180);
    }

    function ensureNearbyMap(latitude, longitude) {
        var elements = getPickerElements();

        if (!elements.nearestStationMap || typeof L === "undefined") {
            throw new Error("Leaflet map is not available.");
        }

        if (!state.nearbyMap) {
            state.nearbyMap = L.map(elements.nearestStationMap, {
                center: [latitude, longitude],
                zoom: NEARBY_MAP_DEFAULT_ZOOM,
                zoomControl: false,
                scrollWheelZoom: false,
                doubleClickZoom: false,
                boxZoom: false,
                keyboard: false,
                touchZoom: false,
                tap: true
            });

            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                maxZoom: 19,
                minZoom: 3
            }).addTo(state.nearbyMap);

            state.nearbyMarkersLayer = L.layerGroup().addTo(state.nearbyMap);
            state.nearbyMap.on("moveend", scheduleNearbyStationsReload);
        } else {
            state.ignoreNextMapMoveReload = true;
            state.nearbyMap.setView([latitude, longitude], NEARBY_MAP_DEFAULT_ZOOM, {
                animate: false
            });
        }

        if (!state.userMarker) {
            state.userMarker = L.circleMarker([latitude, longitude], {
                radius: 6,
                color: "#2a6fb2",
                fillColor: "#2a6fb2",
                fillOpacity: 0.9,
                weight: 2
            }).addTo(state.nearbyMap);
            state.userMarker.bindPopup("Your location");
        } else {
            state.userMarker.setLatLng([latitude, longitude]);
        }

        window.setTimeout(function () {
            if (state.nearbyMap) {
                state.nearbyMap.invalidateSize();
            }
        }, 0);
    }

    function getStationCandidate() {
        var elements = getPickerElements();
        var checkedRadio = getSelectedStationRadio();
        var newStation = normalizeStationName(elements.newStationInput && elements.newStationInput.value);

        if (state.selectedNearbyStation && state.selectedNearbyStation.name) {
            return {
                source: "location",
                name: normalizeStationName(state.selectedNearbyStation.name),
                stationId: "",
                latitude: String(state.selectedNearbyStation.latitude || "").trim(),
                longitude: String(state.selectedNearbyStation.longitude || "").trim(),
                nearestId: String(state.selectedNearbyStation.id || "").trim()
            };
        }

        if (!checkedRadio) {
            return { source: "", name: "" };
        }

        if (checkedRadio.value === NEW_STATION_RADIO_VALUE) {
            return newStation ? { source: "new", name: newStation, stationId: "" } : { source: "", name: "", stationId: "" };
        }

        var checkedName = getCheckedRecentStationName();
        if (checkedName) {
            return { source: "recent", name: checkedName, stationId: getCheckedRecentStationId() };
        }

        return { source: "", name: "", stationId: "" };
    }

    function updateOkButtonState() {
        var elements = getPickerElements();
        var candidate = getStationCandidate();

        if (!elements.okButton) {
            return;
        }

        elements.okButton.disabled = !candidate.name;
    }

    function setLocationStatus(message) {
        var locationResult = document.getElementById("locationStationResult");

        if (!locationResult) {
            return;
        }

        if (message) {
            locationResult.textContent = message;
            locationResult.classList.remove("hidden");
            return;
        }

        locationResult.textContent = "";
        locationResult.classList.add("hidden");
    }

    function renderRecentStations(stations, preselectedName, preselectedStationId) {
        var elements = getPickerElements();
        var container = elements.recentStationsContainer;
        var selectedName = normalizeStationName(preselectedName);
        var selectedStationId = String(preselectedStationId || "").trim();

        if (!container) {
            return;
        }

        container.innerHTML = "";

        if (!Array.isArray(stations) || stations.length === 0) {
            var emptyInfo = document.createElement("p");
            emptyInfo.className = "text-muted mb-0";
            emptyInfo.textContent = "No recent station yet.";
            container.appendChild(emptyInfo);
            return;
        }

        stations.forEach(function (station, index) {
            var stationName = normalizeStationName(station && station.name);
            var stationId = String(station && station.stationId || "").trim();

            if (!stationName) {
                return;
            }

            var optionWrapper = document.createElement("div");
            optionWrapper.className = "radio-option";

            var radioId = "recentStation" + index;
            var input = document.createElement("input");
            input.type = "radio";
            input.id = radioId;
            input.name = "station";
            input.value = stationName;
            input.dataset.stationId = stationId;

            var isNameMatch = !!selectedName && stationName.toLowerCase() === selectedName.toLowerCase();
            var isStationIdMatch = !!selectedStationId && !!stationId && selectedStationId === stationId;
            input.checked = isStationIdMatch || isNameMatch;

            input.addEventListener("change", function () {
                clearNearbyStationSelection({ preserveSummary: true });
                setNearestStationSummary("Tap a pin to select a nearby station.");
                updateOkButtonState();
            });

            var label = document.createElement("label");
            label.setAttribute("for", radioId);
            label.textContent = stationName;

            optionWrapper.appendChild(input);
            optionWrapper.appendChild(label);
            container.appendChild(optionWrapper);
        });
    }

    async function showStationPicker() {
        var elements = getPickerElements();
        var overlay = elements.overlay;
        var preferences = window.getRefillPreferences ? window.getRefillPreferences() : {};
        var preselectedName = normalizeStationName(preferences.lastStationName);
        var preselectedStationId = String(preferences.lastStationId || "").trim();

        if (overlay) {
            overlay.classList.remove("hidden");
            overlay.classList.add("active");
        }

        if (elements.newStationRadio) {
            elements.newStationRadio.checked = false;
        }

        if (elements.newStationInput) {
            elements.newStationInput.value = "";
        }

        clearStationRadioSelection();
        clearNearbyStationSelection({ preserveSummary: true });
        setNearestStationSummary("Allow location access, then tap a pin to select a nearby station.");
        setLocationStatus("Locating you...");
        setLocationMapDisabled(true);
        state.preferredNearbyStationId = preferences.lastStationSource === "location" ? String(preferences.lastNearestStationApiId || "") : "";
        state.preferredNearbyStationName = preferences.lastStationSource === "location" ? preselectedName : "";

        renderRecentStations(await loadRecentStations(), preselectedName, preselectedStationId);
        selectStationFromLocation();

        updateOkButtonState();
    }

    function hideStationPicker() {
        var overlay = document.getElementById("stationPickerOverlay");

        if (!overlay) {
            return;
        }

        overlay.classList.remove("active");
        overlay.classList.add("hidden");
    }

    function clearSelectedStationForRefill() {
        currentSelectedStation = null;

        var elements = getPickerElements();
        if (elements.selectedStationLabel) {
            elements.selectedStationLabel.textContent = "No station selected";
            elements.selectedStationLabel.classList.remove("has-station");
        }
    }

    function moveStationFirst(stations, selectedName) {
        var normalizedName = normalizeStationName(selectedName);

        if (!normalizedName) {
            return stations.slice();
        }

        var filtered = stations.filter(function (station) {
            var stationName = normalizeStationName(station && station.name);
            return stationName.toLowerCase() !== normalizedName.toLowerCase();
        });

        var selectedEntry = stations.find(function (station) {
            return normalizeStationName(station && station.name).toLowerCase() === normalizedName.toLowerCase();
        });

        if (selectedEntry) {
            filtered.unshift(selectedEntry);
        }

        return filtered;
    }

    function saveSelectedStation(candidate) {
        var elements = getPickerElements();
        var selectedName = normalizeStationName(candidate && candidate.name);
        var selectedStationId = String(candidate && candidate.stationId || "").trim();
        var source = candidate && candidate.source;
        var stations = readStationsFromStorage();

        if (!selectedName) {
            return false;
        }

        if (source === "new" && containsStationName(stations, selectedName)) {
            alert("This station already exists in your list.");
            return false;
        }

        if (source === "new" || source === "location") {
            if (!containsStationName(stations, selectedName)) {
                stations.push({
                    name: selectedName,
                    stationId: selectedStationId
                });
            }
        }

        stations = stations.map(function (station) {
            var stationName = normalizeStationName(station && station.name);
            if (stationName.toLowerCase() === selectedName.toLowerCase()) {
                return {
                    name: stationName,
                    stationId: selectedStationId || String(station && station.stationId || "").trim()
                };
            }

            return station;
        });

        if (source === "recent" && selectedStationId) {
            stations = stations.map(function (station) {
                var stationName = normalizeStationName(station && station.name);
                if (stationName.toLowerCase() === selectedName.toLowerCase()) {
                    return {
                        name: stationName,
                        stationId: selectedStationId
                    };
                }

                return station;
            });
        }

        stations = moveStationFirst(stations, selectedName);
        writeStationsToStorage(stations);

        if (elements.selectedStationLabel) {
            elements.selectedStationLabel.textContent = selectedName;
            elements.selectedStationLabel.classList.add("has-station");
        }

        if (window.getRefillPreferences && window.saveRefillPreferences) {
            var preferences = window.getRefillPreferences();
            preferences.lastStationName = selectedName;
            preferences.lastStationId = selectedStationId;
            preferences.lastStationSource = source || "";
            preferences.lastStationLat = source === "location" ? String(candidate.latitude || "") : "";
            preferences.lastStationLong = source === "location" ? String(candidate.longitude || "") : "";
            preferences.lastNearestStationApiId = source === "location" ? String(candidate.nearestId || "") : "";
            window.saveRefillPreferences(preferences);
        }

        currentSelectedStation = {
            name: selectedName,
            stationId: selectedStationId,
            source: source || "",
            latitude: source === "location" ? String(candidate.latitude || "") : "",
            longitude: source === "location" ? String(candidate.longitude || "") : "",
            nearestId: source === "location" ? String(candidate.nearestId || "") : ""
        };

        return true;
    }

    async function createStationFromApi(name) {
        var body = new URLSearchParams();
        body.set("name", name);
        body.set("lat", state.userLatitude);
        body.set("long", state.userLongitude);

        var response = await fetch(window.API_ENDPOINT + "?o=station&a=add", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
            },
            body: body.toString()
        });

        if (!response.ok) {
            throw new Error("Unable to add station.");
        }

        try {
            var payload = await response.json();
            if (payload && payload.success === false) {
                throw new Error(payload.message || "Unable to add station.");
            }

            if (payload && payload.stationId) {
                return String(payload.stationId).trim();
            }
        } catch (error) {
            if (error && error.message && error.message !== "Unable to add station.") {
                throw error;
            }
        }

        return "";
    }

    function getCurrentPosition() {
        return new Promise(function (resolve, reject) {
            state.userLatitude = "";
            state.userLongitude = "";
            if (!navigator.geolocation) {
                reject(new Error("Geolocation is not supported by your browser."));
                return;
            }

            navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 8000,
                maximumAge: 60000
            });
        });
    }

    function buildStationLabelFromLocationData(station) {
        if (!station || typeof station !== "object") {
            return "";
        }

        var stationName = normalizeStationName(station.name);
        if (stationName) {
            return stationName;
        }

        var parts = [
            station.house_number,
            station.street,
            station.post_code,
            station.city,
            station.country
        ].map(function (item) {
            return normalizeStationName(item);
        }).filter(Boolean);

        return parts.join(", ");
    }

    async function selectStationFromLocation() {
        try {
            var position = await getCurrentPosition();
            state.userLatitude = String(position.coords.latitude);
            state.userLongitude = String(position.coords.longitude);
            ensureNearbyMap(position.coords.latitude, position.coords.longitude);
            setLocationMapDisabled(false);
            setNearestStationSummary("Tap a pin to select a nearby station.");
            setLocationStatus("Move the map to reload nearby stations around the current center.");
            await reloadNearbyStationsForMap(position.coords.latitude, position.coords.longitude);
        } catch (error) {
            state.userLatitude = "";
            state.userLongitude = "";
            setLocationMapDisabled(true);
            clearNearbyStationSelection({ preserveSummary: true });
            setNearestStationSummary("Nearby stations unavailable.");
            setLocationStatus("Unable to retrieve your location or nearby stations.");
        }
    }

    function bindStationPickerEvents() {
        var overlay = document.getElementById("stationPickerOverlay");
        var chooseStationBtn = document.getElementById("chooseStationBtn");
        var selectedStation = document.getElementById("selectedStation");
        var closeBtn = document.getElementById("stationPickerCloseBtn");
        var cancelBtn = document.getElementById("stationPickerCancelBtn");
        var okBtn = document.getElementById("stationPickerOkBtn");
        var newStationInput = document.getElementById("newStation");

        if (chooseStationBtn) {
            chooseStationBtn.addEventListener("click", showStationPicker);
        }

        if (selectedStation) {
            selectedStation.addEventListener("click", showStationPicker);
            selectedStation.addEventListener("keydown", function (event) {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    showStationPicker();
                }
            });
        }

        if (closeBtn) {
            closeBtn.addEventListener("click", hideStationPicker);
        }

        if (cancelBtn) {
            cancelBtn.addEventListener("click", hideStationPicker);
        }

        if (overlay) {
            overlay.addEventListener("click", function (event) {
                if (event.target === overlay) {
                    hideStationPicker();
                }
            });
        }

        if (newStationInput) {
            newStationInput.addEventListener("input", function () {
                var newStationRadio = document.getElementById("newStationRadio");
                if (newStationRadio && this.value.trim() !== "") {
                    newStationRadio.checked = true;
                }
                clearNearbyStationSelection({ preserveSummary: true });
                setNearestStationSummary("Tap a pin to select a nearby station.");
                updateOkButtonState();
            });
        }

        var newStationRadio = document.getElementById("newStationRadio");
        if (newStationRadio) {
            newStationRadio.addEventListener("change", function () {
                clearNearbyStationSelection({ preserveSummary: true });
                setNearestStationSummary("Tap a pin to select a nearby station.");
                updateOkButtonState();
            });
        }

        if (okBtn) {
            okBtn.addEventListener("click", async function () {
                var candidate = getStationCandidate();
                if (!candidate.name) {
                    return;
                }

                if (candidate.source === "new") {
                    try {
                        candidate.stationId = await createStationFromApi(candidate.name);
                    } catch (error) {
                        alert(error.message || "Unable to add station.");
                        return;
                    }
                }

                if (!saveSelectedStation(candidate)) {
                    return;
                }

                hideStationPicker();
            });
        }
    }

    function initStationPicker() {
        bindStationPickerEvents();
        if (!localStorage.getItem(STATION_STORAGE_KEY)) {
            writeStationsToStorage(DEFAULT_STATIONS.map(function (name) {
                return {
                    name: normalizeStationName(name),
                    stationId: ""
                };
            }));
        }
    }

    function getSelectedStationForRefill() {
        if (!currentSelectedStation) {
            return { name: "", stationId: "", source: "" };
        }

        return {
            name: normalizeStationName(currentSelectedStation.name),
            stationId: String(currentSelectedStation.stationId || "").trim(),
            source: String(currentSelectedStation.source || "").trim(),
            latitude: String(currentSelectedStation.latitude || "").trim(),
            longitude: String(currentSelectedStation.longitude || "").trim(),
            nearestId: String(currentSelectedStation.nearestId || "").trim()
        };
    }

    window.initStationPicker = initStationPicker;
    window.getSelectedStationForRefill = getSelectedStationForRefill;
    window.resetSelectedStationForRefill = clearSelectedStationForRefill;
})();