**GasLog is a gas / fuel logging website.**

It allows users to track when he fills/refills/fuel/refuell up his/her car tak with fuel (gasoline, diesel).

The user journey is :
- user arrive at a gas station.
- he fills his reservory and pay for the gas
- then it start the GasLog application :
  - assuming the user is registered (but there is a "invite" scenario, where user can use the app without being logged at all)
  - he clicks on the "Refill" button to sart refill process
  - the app shows a form to indicate information for the refill :
    - vehicle (to be chosen from a drop down list of vehicles of the users)
    - date of refill (initialized with the current date time)
    - an option to choose the gas station
    - select the fuel he used for the refill (from a drop down list of all fuels available for the selected vehicle)
    - enter the unit price (float value) and the unit of it (€/L, $/Gal, $/L, p/L (Pence per Litre for England))
    - enter the quantity (float) and the unit (Liter, USGal)
    - enter the total price (float) and the currency (€, $, £)
    - enter the mileage (integer)
    - if the user wants to choose a gas station :
      - user can choose a gas station based on his location (by calling a geocoding api)
      - user can select one of the last gas station he choosen
      - user can add a new gas station by entering its name

The application also have the following features :
- login screen : optionnaly, user can create an account by entering his email address. Then a login journey is triggered :
  - when an email is entered, the app send a temporary auth code by email
  - the user have a few minutes to enter the code he received by email
  - then the account is fully registered
- vehicles management : user can create/modify a car he owns. He indicates a label, a brand name, a default fuel type (can be selected between several options : SP95E10, SP95E5, SP98, E85, Diesel, Premium Diesel, GPL, LGPL, CNG/GNV), and an initial mileage and the unit (miles, km), currency ($, €, £)
  - view history : user select a car, and he can see the history of his refill : date, station name, mileage, price per liter
  - view statistics : user select a car, and he can see the gas consumption of his vehicle for the last 100, 1000 and 10000 km. He can see also the min/max/avg price per liter for the last 100, 1000 and 10000 km.
- manage stations : user can see list of gas stations, rename one, add a new gas station by its name or picking one from its location or from a map
- settings : a page where user can change his language, import or export data (from/to json), delete all data

*Invite mode*
It is not mandatory for the user to create an account to use the app. If he stays in invite mode, all data are stored into JSON data in the local storage of the browser.

*Non functional requirements*
- application is available in English and in French
- use slick user interface, no fancy gradient
- must works on mobile and desktop (applying responsive design)
- if the user is registered (it is not mandatory to to so), all information came from the backend server via API. If he is not registered, information are stored and fetched from the browser local storage.

*user interface*
**main page**
"index.html" is the main page. It contains an indicator saying if user is logged ("Welcome $username") or not ("You are not logged").
Then it contains the main action buttons :
"Refill" : to start the refill process by showing the _refill screen_
"Vehicles" : to manage vehicles own by the user, redirect user to the _vehicles_ page
"Stations" : to manage gas stations used by the user, redirect user to the _stations_ page
"Login" : to create, or share an account, redirect user to the _login_ page
"Settings" : to modify user settings, redirect user to the _settings_ page
"About" : a link to the _about_ page

**Refill screen**
The refill screen is including in the main page, because the user experience must be very fast when he launch the app. There is no download time between the main page and the refill screen. It is a layer that is already loaded (but hidden) and is displayed when the refill process start.
The screen have:
- a drop down list with all vehicles owned by the user, sorted alphabetically, pre selected with the last vehicle he used 
- a datetime picker, initialized with the current date time (eventually, the user can change the date time). Format is the local date time format, up to the minute (no need for the seconds)
- a link to the "Choose a station" screen for the user to choose a gas station. When the user click on it, a preloaded _station picker_ screen appears to pick a gas station.
- a drop down list with all the allowed fuels of the vehicle (the user must select one of them). Pre-selected with the last fuel he used for this vehicle
- an input float number area to enter the total price paid by the user, and a drop down list to select the currency (€, $, £) pre selected with the last currency used
- an input float number area to enter the quantity, and a drop down list to select the unit (Liter, USGal), pre selected with the last quantity unit used by the user
- an input float number area to enter the unit price, and a drop down list to select the unit (€/L, $/Gal, $/L, p/L), pre selected with the last unit used by the user
- an input float number to enter the mileage of the vehicle at the time of the refill, followed by the distance unit of the vehicle (there is a default unit, like "km" or "ml" attached to a vehicle)
- An "OK" button to confirm and save the data, either in the backend server, or to the localstorage. When saved is done without error, the user is redirected to the page to see the vehicle history of the selected vehicle
- A "Cancel" button. Data are not saved, and the "refill screen" is closed and the user see again the "main page"

**station picker**
The _station picker_ screen is including in the main page, because the user experience must be very fast when he launch the app. There is no download time between the _refill screen_ and the _station picker_. It is a layer that is already loaded (but hidden) and is displayed when the station picker process start. This screen allow user to select a station from his location or select an existing station (a station he already visited in the past), or a new station he just come to.
It displays :
- A link "From your current location" to use the user location (GPS) and, via a Geolocation API call retreive the name of the nearest gas station. When user select this option, the name of the gas station is indicated on the screen
- the list of last station used by the user. The user have to select one of them (radio button)
- text area labeled "New station" for the user to manually enter the name of the station
- an OK button, only activated if the user have selected an existing station from the list, or entered a name in the "New station" field, or retreive a station from its location. On click on the OK button :
  - if there is a name in the "New station" field (must not already exists under the same name), the name is added to the station list of the user. 
  - if the user selected a station from its location, the name is added to the station list of the user. 
  - then the _station picker_ is closed, and the selected station is set on the _refill screen_.

**Vehicles**
This page (vehicles.htlm) list all vehicles owned by the user, and allow him to add a new vehicle. The page displays :
- the list of each vehicles, sorted by name. When clicking on one of them, the user is redirected to the _vehicle history_ page of the selected vehicle.
- a button "New vehicle" redirect the user the the _new vehicle_ page to add a new vehicle
- a "Done" button to go back to the main page (and eventually reload it to reflect the modified vehicle)

**New Vehicle**
This page (new_vehicle.html) allow users to create a new vehicle from a formular. The page displays :
- a text area to enter the name of the vehicle
- a dropdown list to select a well known brand of vehicle (or "other")
- a date time picker to enter the purchase date of the vehicle (only dd/mm/yyyy, no need for hours/minutes/seconds)
- an input float number to enter the mileage of the vehicle at the time of the creation, followed by a drop down list where the user can chose what is the distance unit of the vehicle (can be "km" or "ml")
- then an area of push button to select which fuels is available for this vehicle. The user can select  one or more fuel from : SP95E10, SP95E5, SP98, E85, Diesel, Premium Diesel, GPL, LGPL, CNG/GNV
- an "OK" button to confirm :
  - if the vehicle does not exists (based on the name entered by the user), the vehicle is added to the list of vehicles owned by the user, and the user is redirected to the _main screen_.
  - if the vehicle exists, an error message indicate there is already a vehicle with the same name, and the user stay on the screen.
- a "Cancel" button to go back to the _main screen_

**Vehicle history**
This page (vehicle_history.html) display vehicle history and statistics, and allow user to change vehicle info, or to delete it.
The page is called with the vehicle identifier (?vehicleid) in the query string of the page.
When this page load, if the user is logged (isUserLoggedIn() return true), the detail of the vehicle is received from a GET API call to "o=vehicle&a=getdetails&vehicleid=$vehicleid". All fields are initialized with data returned from the API.
On this page it is displayed :
- a text area to modify the name of the vehicle
- a place holder to receive a graphic of vehicle data over time (see _statistics_ bellow)
- a dropdown list to modify the brand of the vehicle (same list as the new vehicle page)
- a date time picker to modify the purchase date of the vehicle (only dd/mm/yyyy, no need for hours/minutes/seconds)
- an input float number to modifiy the mileage of the vehicle at the time of the creation, followed by a drop down list where the user can chose what is the distance unit of the vehicle (can be "km" or "ml")
- then an area of push button to modify which fuels is available for this vehicle. The user can select  one or more fuel from : SP95E10, SP95E5, SP98, E85, Diesel, Premium Diesel, GPL, LGPL, CNG/GNV
- an "OK" button to confirm :
  - if all values are correct, the vehicle is updated and the user is redirect to the vehicle list.
- a "Cancel" button to go back to the vehicle list
- a danger area, with a "Delete this vehicle button". On confirmation, the vehicle is delete and the user is redirected to the vehicle list.

***Statistics***
In the _vehicle history_ page, the chart placeholder for the vehicle statistics contains the following statistics, in a table layout :
- Fuel consumption : 3 numerical metrics in L/100km, for the 3 last refills, for the last 10 refill, for the last 20 000km
- Cost per 100km : 3 numerical metrics in €/100km, for the 3 last refills, for the last 10 refill, for the last 20 000km
- Cost per month : 3 numerical metrics in €/100, for the last 3 months, for the last 6 month, for the last 12 month
- Fuel price : 3x3 numerical metrics in €/L, for the last 3 months, for the last 6 month, for the last 12 month. For minimum, average, and maximum price per litre.
- Refill interval : 3x3 numerical metrics indicating for the last 3 months, the last 6 month, and the last 12 month, the how many day (average) between refill, how many kilometre (average)
There is a link "Show graphics" (_show graphics_) to go to the graphics.html page.
Then there is table of the last 5 refills, with the date/time, the total price, the quantity, the unitary fuel price, the fuel type and the mileage. A link "view all refill" leads the user to the "refill_history.html" (_refill history_) page.

***Refill history***
This page list , from newest to oldest, all the refills for a vehicle.

**Stations**
This page (stations.html) list all stations used by the user, and allow him to add a new station. The page displays :
- the list of all stations used by the user. When the user click on a station from this list, it is redirected to the _station details_ page. Stations are sorted by name.
- a section to add a new station, where a Map is displayed (from Leaflet openstreetmap). The map is centered on the user location, and can be moved, zoomed in and out. If there is a gas station in the middle of the map, the name of the gas station is copied to the "name" text area bellow.
- a "name" text area to enter the station name (it can be filled by the map, or modified by the user).
- a "OK" button, only valid if a "name" is entered. When clicked, the _stations_ page is reloaded and the new station is added to the user stations.
- a "Cancel" button to go back to the _main screen_.

**Station details**
This page (station_details.html) allow user to see the details of one of his station. The page dispays :
- the name of the selected station, in a text area (it can be changed)
- a map centered on the location of the station if available. The user can move the map or the pin in the map to precisly set the location of the station.
- an information indicating when this station was added ("First usage of this station : dd/mm/yyyy hh:ii")
- an information indicating when this station was last used ("Last usage of this station : dd/mm/yyyy hh:ii")
- an "OK" button, used to confirm the change of the name or the location, and go back to the list of station _stations_ page.
- a "Cancel" button to no change anything on this station and go back to the _stations_ page.
- a "Delete this station" button. When clicked, a confirmation asking "Do you want to delete this station ?", if user says yes, the station is deleted and the user is redirected to the _stations_ page.

**Login**
This page (login.html) allow user to register a new account, change details of his account, or share his account with someone else via a QR code exchange.
If the user is not logged, the page displays :
- a formular asking for user email and a user name
- a button "Send authentication code" to send an email to the user with a temporary auth code
- a text area to enter the received auth code (the text area is only active when the code has been send)
- an "OK" button, only active when the code has been verified
- a "Cancel" button to cancel registration and go back to the _main page_ screen.
If the user is already registered, the page display :
- the email address of the user
- a text area with the user name (user can change its name)
- a "OK" button, only active if the user changed his name. When clicked, the name is changed and the user is redirected to the _main page_.
- a "Cancel" button, when clicked the user is redirected to the _main page_ without any change.
- a QR code, which contains a hash of the user email address.
- a text indicating : "Scan this QR code with an other device to pair the application to this account". If the user click on the QR code, it is displayed full screen. The QR code is fully generated via JS on the browser side.
- a button "Scan QR" to allow users to trigger his device camera and scan the QR code, decode it. If the hash of the email encoded in the QR code is valid, then the user session is associated to this email, and two users will share the same vehicles and refill information.
- a button "Sign Out". After confirmation on click, the user is disconnected and he go back to the _main screen_ but in the _invite mode_ (not logged).

**Settings**
This page (settings.html) can be used by the user to change settings :
- a drop down list "Language" with all available language ("FR", "EN")
- a drop down list "Color theme" with all available color theme, to be choosen between "Automatic", "Light", "Dark".
- an "OK" button to confirm language and color choice. When clicked, the language and color are saved in the browser cookie
- a "Cancel" button to go back to the _main screen_
- an "Export data" button, will generate a JSON file with all the vehicles, refill, gas station of the user
- an "Import data" button. When clicked, after confirmation (because all data will be erased), the user can upload a JSON file, same format than the exported file.
- a button "Delete my data". After confirmation, the all the data of the user are delete. And the account too is deleted.

**About**
This page display about, faq, copyright etc.

*** System design ***
A single HTML page "system-design.html", with an associated CSS, is used to display how the application can look like. This page, containing the following user interface element, in the 2 available color theme (light and dark) :
- ok button
- cancel button
- danger button
- date time picker
- date picker
- number text area to enter a float
- push button (like the one used to select fuel type). A push button, like a checkbox, have two state : selected and not selected. When user click on it, it change its state.
- a drop down list, used to select vehicle or fuel type.

*Software stack*

- Frontend is in html/js/css. JS must be splitted in files, a JS file per HTML page, plus common lib js (one lib for managing the local storage, one lib to manage API call if needed). JQuery can be used
- browser cookie information : contains the user PHPSESSID if the user is logged, the last vehicle he used, the last fuel type used by each of his vehicle, last unit used, last quantity unit used, last currency used, language, color theme
- browser local storage information 
- Backend is in PHP 7, no framework, database via an abstraction layer using PDO (sqlite by default, mysql eventually)

*Business Model*
| Feature | Community Edition | Docker Edition | Muscle Car Edition | Girly Car Edition | Fleet Edition | Enterprise Edition |
|--------|------------------|---------------|--------------------|------------------|---------------|-------------------|
| 💰 **Price** | Free | 10€/year 💵 | 10€/year 💵 | 10€/year 💵 | 100€/year for 50 users 💵💵 | 1000€/year for 100 users 💵💵💵|
| 👤 **Usage** | For individuals | For developers, IT teams | For individuals | For individuals | For fleet managers & fleet users, local rental companies | National rental companies |
| 🚗 **Nb of vehicles per user** | 5 | 5 | 50 | 50 | 50 | Customized |
| 🏷️ **Vehicle brand** | General | General | Premium | Cute | Customized | Customized |
| 🔐 **User registration** | Email + OTP | Email + OTP | Email + OTP | Email + OTP | Custom email provider + OTP, local user DB | SSO / IdP (SAML, OIDC) |
| 🌐 **Connectivity** | Online & offline | Online & offline | Online & offline | Online & offline | Online & offline | Online & offline |
| 🔁 **Data sharing** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| ☁️ **Hosting** | European Cloud | DIY | DIY | DIY | DIY | North America Cloud, European Cloud, Asian Cloud, DIY |
| 🎨 **User interface** | Default UI | Default UI | Muscle Car UI 🚙🏍️| Girly Car UI 🥰| Customized | Customized |
| 🗄️ **Database** | Managed | SQLite, MySQL | Managed | Managed | Managed | SQLite, MySQL, Managed MySQL |
| ⚡ **Performance** | 👍 Good | 🛠️ DIY | 👍 Good | 👍 Good | 👍 Good | 🚀 Best, 🛠️ DIY |

