(function () {
    var STATION_STORAGE_KEY = "gaslogStations";
    var DEFAULT_STATIONS = [
        //"Total - Avenue des Champs",
        //"Shell - Route de Paris",
        //"BP - Centre Ville"
    ];

    var state = {
        locationStationName: "",
        locationLatitude: "",
        locationLongitude: "",
        locationStationApiId: ""
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
            nearestStationRadio: document.getElementById("nearestStationRadio"),
            nearestStationLabel: document.getElementById("nearestStationLabel"),
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

        if (checked.id === "nearestStationRadio" || checked.value === NEW_STATION_RADIO_VALUE) {
            return "";
        }

        return normalizeStationName(checked.value);
    }

    function getCheckedRecentStationId() {
        var checked = getSelectedStationRadio();

        if (!checked || checked.id === "nearestStationRadio" || checked.value === NEW_STATION_RADIO_VALUE) {
            return "";
        }

        return String(checked.dataset.stationId || "").trim();
    }

    function getStationCandidate() {
        var elements = getPickerElements();
        var checkedRadio = getSelectedStationRadio();
        var newStation = normalizeStationName(elements.newStationInput && elements.newStationInput.value);

        if (!checkedRadio) {
            return { source: "", name: "" };
        }

        if (checkedRadio.value === NEW_STATION_RADIO_VALUE) {
            return newStation ? { source: "new", name: newStation, stationId: "" } : { source: "", name: "", stationId: "" };
        }

        if (checkedRadio.id === "nearestStationRadio") {
            var nearestName = normalizeStationName(checkedRadio.value);
            return nearestName ? {
                source: "location",
                name: nearestName,
                stationId: "TODO_NEAREST",
                latitude: String(state.locationLatitude || "").trim(),
                longitude: String(state.locationLongitude || "").trim(),
                nearestId: String(state.locationStationApiId || "").trim()
            } : { source: "", name: "", stationId: "" };
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

        state.locationStationName = "";
        state.locationStationApiId = "";

        if (elements.nearestStationRadio) {
            elements.nearestStationRadio.checked = false;
            elements.nearestStationRadio.disabled = true;
            elements.nearestStationRadio.value = "";
        }

        if (elements.nearestStationLabel) {
            elements.nearestStationLabel.textContent = "Searching nearest station...";
        }

        if (elements.newStationRadio) {
            elements.newStationRadio.checked = false;
        }

        if (elements.newStationInput) {
            elements.newStationInput.value = "";
        }

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
        body.set("lat", state.locationLatitude);
        body.set("long", state.locationLongitude);

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
    state.locationLatitude = "";
    state.locationLongitude = "";
    state.locationStationApiId = "";
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

    function extractNearestStationCandidate(payload) {
        if (Array.isArray(payload)) {
            return payload[0] || null;
        }

        if (payload && Array.isArray(payload.stations)) {
            return payload.stations[0] || null;
        }

        if (payload && Array.isArray(payload.data)) {
            return payload.data[0] || null;
        }

        if (payload && typeof payload === "object") {
            return payload;
        }

        return null;
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

    function bindNearestRadioChange() {
        var nearestRadio = document.getElementById("nearestStationRadio");

        if (!nearestRadio || nearestRadio.dataset.bound === "true") {
            return;
        }

        nearestRadio.addEventListener("change", function () {
            if (this.checked) {
                state.locationStationName = normalizeStationName(this.value);
            }
            updateOkButtonState();
        });

        nearestRadio.dataset.bound = "true";
    }

    async function getNearestStationInfo(latitude, longitude) {
        var query = window.API_ENDPOINT + "?o=station&a=getnearest&lat=" + 
            encodeURIComponent(latitude.toFixed(3)) + "&long=" + 
            encodeURIComponent(longitude.toFixed(3));
        var response = await fetch(query, { method: "GET" });

        if (!response.ok) {
            throw new Error("Unable to retrieve nearest station.");
        }

        var payload = await response.json();
        var station = extractNearestStationCandidate(payload);

        if (!station) {
            throw new Error("No nearby station found.");
        }

        var name = buildStationLabelFromLocationData(station);
        if (!name) {
            name = "Fuel Station (" + latitude.toFixed(3) + ", " + longitude.toFixed(3) + ")";
        }

        return {
            name: name,
            id: String(station.id || station.stationid || station.stationId || "").trim()
        };
    }

    async function selectStationFromLocation() {
        var elements = getPickerElements();

        try {
            var position = await getCurrentPosition();
            state.locationLatitude = String(position.coords.latitude);
            state.locationLongitude = String(position.coords.longitude);
            var nearestStation = await getNearestStationInfo(position.coords.latitude, position.coords.longitude);
            var stationName = nearestStation && nearestStation.name;
            state.locationStationApiId = nearestStation && nearestStation.id ? String(nearestStation.id) : "";

            state.locationStationName = stationName;

            if (elements.nearestStationRadio) {
                elements.nearestStationRadio.disabled = false;
                elements.nearestStationRadio.value = stationName;

                if (!getSelectedStationRadio()) {
                    elements.nearestStationRadio.checked = true;
                }
            }

            if (elements.nearestStationLabel) {
                elements.nearestStationLabel.textContent = stationName;
            }

            setLocationStatus("");

            updateOkButtonState();
        } catch (error) {
            state.locationStationName = "";
            state.locationLatitude = "";
            state.locationLongitude = "";
            state.locationStationApiId = "";

            if (elements.nearestStationRadio) {
                elements.nearestStationRadio.checked = false;
                elements.nearestStationRadio.disabled = true;
                elements.nearestStationRadio.value = "";
            }

            if (elements.nearestStationLabel) {
                elements.nearestStationLabel.textContent = "Nearest station unavailable";
            }

            setLocationStatus("Unable to retrieve a nearby station from your location.");
            updateOkButtonState();
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
                updateOkButtonState();
            });
        }

        var newStationRadio = document.getElementById("newStationRadio");
        if (newStationRadio) {
            newStationRadio.addEventListener("change", function () {
                updateOkButtonState();
            });
        }

        bindNearestRadioChange();

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