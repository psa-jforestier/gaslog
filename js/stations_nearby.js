(function () {
    var DEFAULT_ZOOM = 15;
    var state = {
        nearbyMap: null,
        nearbyMarkersLayer: null,
        userMarker: null,
        nearbyStations: [],
        mapReloadTimer: 0,
        nearbyRequestSequence: 0
    };

    function setNearestStationSummary(message) {
        var element = document.getElementById("nearestStationLabel");
        if (!element) {
            return;
        }

        element.textContent = String(message || "").trim();
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

    function setMapDisabled(isDisabled) {
        var mapShell = document.getElementById("nearbyMapShell");
        if (!mapShell) {
            return;
        }

        mapShell.classList.toggle("is-disabled", !!isDisabled);
    }

    function normalizeStationName(value) {
        return String(value || "").trim();
    }

    function buildStationAddressFromLocationData(station) {
        if (!station || typeof station !== "object") {
            return "";
        }
        /**
        var street = normalizeStationName(station.street);
        var postCode = normalizeStationName(station.post_code);
        var city = normalizeStationName(station.city);
        var cityLine = [postCode, city].filter(Boolean).join(" ");
        return [street, cityLine].filter(Boolean).join(", ");
         */
        return station.street || '';
    }

    function escapeHtml(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\"/g, "&quot;")
            .replace(/'/g, "&#39;");
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
                address: buildStationAddressFromLocationData(station),
                city: normalizeStationName(station && station.post_code) + " " + normalizeStationName(station && station.city),
                latitude: latitude,
                longitude: longitude,
                distance: Number(station && station.distance)
            };
        }).filter(function (station) {
            return station && station.name;
        });
    }

    function getCurrentMapBoundingBox() {
        var bounds;
        var northWest;
        var southEast;

        if (!state.nearbyMap || typeof state.nearbyMap.getBounds !== "function") {
            return null;
        }

        bounds = state.nearbyMap.getBounds();
        northWest = bounds.getNorthWest();
        southEast = bounds.getSouthEast();

        return {
            lat: northWest.lat,
            long: northWest.lng,
            lat2: southEast.lat,
            long2: southEast.lng
        };
    }

    async function fetchNearbyStations(searchBounds) {
        var query;

        if (!searchBounds) {
            throw new Error("Missing map bounds for nearby station search.");
        }

        query = window.API_ENDPOINT + "?o=station&a=getnearest&lat=" +
            encodeURIComponent(Number(searchBounds.lat).toFixed(3)) + "&long=" +
            encodeURIComponent(Number(searchBounds.long).toFixed(3)) + "&lat2=" +
            encodeURIComponent(Number(searchBounds.lat2).toFixed(3)) + "&long2=" +
            encodeURIComponent(Number(searchBounds.long2).toFixed(3));

        var response = await fetch(query, {
            method: "GET",
            credentials: "same-origin"
        });

        if (!response.ok) {
            throw new Error("Unable to retrieve nearby stations.");
        }

        return await response.json();
    }

    function renderNearbyStationsList(stations) {
        var list = document.getElementById("nearbyStationsList");

        if (!list) {
            return;
        }

        list.innerHTML = "";

        if (!Array.isArray(stations) || stations.length === 0) {
            var emptyCard = document.createElement("div");
            emptyCard.className = "item-card nearby-station-card";
            emptyCard.innerHTML = "<p>No station found in the current map area.</p>";
            list.appendChild(emptyCard);
            return;
        }

        stations.forEach(function (station) {
            var card = document.createElement("div");
            card.className = "item-card nearby-station-card";
            card.title = station.name;

            var distanceLabel = formatNearbyStationDistance(station.distance);
            var row = document.createElement("div");
            row.className = "nearby-station-row";

            var title = document.createElement("p");
            title.className = "nearby-station-name";
            title.textContent = station.name;

            var details = document.createElement("p");
            details.className = "nearby-station-distance";
            details.textContent = distanceLabel ? "Distance: " + distanceLabel : "Distance unavailable";

            row.appendChild(title);
            row.appendChild(details);
            card.appendChild(row);

            card.addEventListener("click", function () {
                if (!state.nearbyMap || !station.marker) {
                    return;
                }

                state.nearbyMap.panTo([station.latitude, station.longitude]);
                station.marker.openPopup();
            });

            list.appendChild(card);
        });
    }

    function getMarkerPopupContent(station) {
        var distanceLabel = formatNearbyStationDistance(station.distance);
        var addressLabel = String(station && station.address || "").trim();
        var parts = ["<strong>" + escapeHtml(station.name) + "</strong>"];

        if (distanceLabel) {
            parts.push(" - " + escapeHtml(distanceLabel) + "");
        }
        if (addressLabel) {
            parts.push("<div>" + escapeHtml(addressLabel) + "</div>");
        }
        parts.push(station.city);
        parts.push("<div><a href=\"https://maps.google.com/maps?q=" + encodeURIComponent(station.latitude) + "," + encodeURIComponent(station.longitude) + "\" target=\"_blank\">Drive to it</a></div>");

        

        return parts.join("");
    }

    function renderNearbyStationsOnMap(stations) {
        if (!state.nearbyMarkersLayer || typeof L === "undefined") {
            return;
        }

        state.nearbyMarkersLayer.clearLayers();

        stations.forEach(function (station) {
            var marker = L.marker([station.latitude, station.longitude]);
            marker.bindPopup(getMarkerPopupContent(station));
            marker.addTo(state.nearbyMarkersLayer);
            station.marker = marker;
        });
    }

    async function reloadNearbyStationsForMap() {
        var searchBounds = getCurrentMapBoundingBox();
        var requestId = state.nearbyRequestSequence + 1;
        state.nearbyRequestSequence = requestId;

        setLocationStatus("Loading nearby stations...");

        try {
            var payload = await fetchNearbyStations(searchBounds);

            if (requestId !== state.nearbyRequestSequence) {
                return;
            }

            state.nearbyStations = normalizeNearbyStations(payload);
            renderNearbyStationsOnMap(state.nearbyStations);
            renderNearbyStationsList(state.nearbyStations);

            if (state.nearbyStations.length === 0) {
                setNearestStationSummary("No nearby station found in this area.");
                setLocationStatus("Move the map to search another area.");
                return;
            }

            setNearestStationSummary("" + state.nearbyStations.length + " nearby station(s) found.");
            setLocationStatus("Move the map to reload nearby stations in the current area.");
        } catch (error) {
            if (requestId !== state.nearbyRequestSequence) {
                return;
            }

            state.nearbyStations = [];
            if (state.nearbyMarkersLayer) {
                state.nearbyMarkersLayer.clearLayers();
            }
            renderNearbyStationsList([]);
            setNearestStationSummary("Nearby stations unavailable.");
            setLocationStatus("Unable to load nearby stations for this area.");
        }
    }

    function scheduleNearbyStationsReload() {
        if (!state.nearbyMap) {
            return;
        }

        if (state.mapReloadTimer) {
            window.clearTimeout(state.mapReloadTimer);
        }

        state.mapReloadTimer = window.setTimeout(function () {
            state.mapReloadTimer = 0;
            reloadNearbyStationsForMap();
        }, 250);
    }

    function ensureNearbyMap(latitude, longitude) {
        var mapElement = document.getElementById("stationNearbyMap");

        if (!mapElement || typeof L === "undefined") {
            throw new Error("Leaflet map is not available.");
        }

        if (!state.nearbyMap) {
            state.nearbyMap = L.map(mapElement, {
                center: [latitude, longitude],
                zoom: DEFAULT_ZOOM,
                zoomControl: true
            });

            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                maxZoom: 19,
                minZoom: 3
            }).addTo(state.nearbyMap);

            state.nearbyMarkersLayer = L.layerGroup().addTo(state.nearbyMap);
            state.nearbyMap.on("moveend", scheduleNearbyStationsReload);
        } else {
            state.nearbyMap.setView([latitude, longitude], DEFAULT_ZOOM, {
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

    function getCurrentPosition() {
        return new Promise(function (resolve, reject) {
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

    async function initNearbyStationsPage() {
        setMapDisabled(true);
        setNearestStationSummary("Allow location access to load nearby stations.");
        setLocationStatus("Locating you...");

        try {
            var position = await getCurrentPosition();
            ensureNearbyMap(position.coords.latitude, position.coords.longitude);
            setMapDisabled(false);
            await reloadNearbyStationsForMap();
        } catch (error) {
            setMapDisabled(true);
            setNearestStationSummary("Unable to access your location.");
            setLocationStatus("Please enable GPS/location permissions and reload this page.");
            renderNearbyStationsList([]);
        }
    }

    document.addEventListener("DOMContentLoaded", function () {
        initNearbyStationsPage();
    });
})();
