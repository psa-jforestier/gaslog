# GasLog

#### Fuel tracking for everyday drivers

GasLog is a web application for tracking vehicle fuel refills. It helps users record refill events, monitor costs and consumption trends, and manage related entities such as vehicles and gas stations.

## Purpose Of The Application

The application is designed to:

- Log refills with key data (vehicle, date/time, station, fuel type, quantity, unit price, total price, mileage).
- Manage multiple vehicles and their fuel compatibility.
- Track station usage and station details.
- Display refill history and summary statistics (consumption, price, intervals).
- Support account-based usage with data synchronization, while also allowing guest usage.

GasLog supports two usage modes:

- Logged-in mode: data is stored and retrieved through the backend API.
- Invite (guest) mode: data is stored locally in the browser.

## Underlying Technologies

### Frontend

- HTML pages for each main screen (home, vehicles, stations, history, login, settings, etc.).
- CSS for styling and responsive layout.
- JavaScript split by page under `js/` (for example, `index.js`, `vehicles.js`, `stations.js`) plus shared app logic.

### Backend

- PHP 7 (no framework), with API endpoints exposed from `app/api.php`.
- JSON-based API responses and request payloads.
- Session/login state based on a cookie (`gaslog_userhash`) for authenticated API flows.

### Data Layer

- PDO-based database abstraction.
- SQLite as the default storage engine.
- MySQL support planned/optional per project specs.

### Browser Storage

- Local Storage for guest mode data persistence.
- Cookies for session and user preferences (language, theme, last-used values).

### External Integrations

- Leaflet + OpenStreetMap for map display and station selection.
- Overpass API for nearby gas station lookup.
- Browser geolocation APIs for location-based station features.
- Chart.js and Hammer.js for graphics
- QRCode.js to generate QR code
