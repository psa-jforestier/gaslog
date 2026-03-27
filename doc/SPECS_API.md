# This page explains the API for GasLog

Endpoint : `/app/api.php`

## Security

There is no "bearer" or "jwt" or other security concept. If an API must be used in logged mode, it is based on the value of the `gaslog_userhash` cookie transmitted on each request. For each working transaction, the `gaslog_userhash` cookie is renewed for one year.

## Query format
When calling the API, in GET or POST, usually there is a `o` parameter to indicate the object (user, vehicle), and eventually a `a` parameter to indicate the action (get, delete).

## Response format

The response are JSON string. The generic response is like :
```
{
    "success":true,
    "object":"value"
}
```

In case of error, the response is also a JSON string like :
```
{
    "success":false,
    "message":"plain text error message"
}
```
## Version
To get information about the API version
- Purpose : return info about the API. No need to be logged.
- Method : GET
- Query string parameters : `o=version`
- Return : `{"success":true,"version":"0.1.0","git_commit":"cb1bb18"}`

## User
To manage actions on user.

### Logout
- Purpose : Logout a user, by asking the browser to delete the "gaslog_userhash" cookie.
- Method : GET
- Query string parameters : `o=user&a=logout`
- Return : `{"success":true}`

### Get Information
- Purpose : Get information about the user.
- Method : GET
- Query string parameters : `o=user&a=getinfo`
- Return : `{"success":true, "user":{...}}`

### Get authentication code
- Purpose : Generate the authentication code and send it by email. It does not matter if the email already exists or not in the user database.
- Method : POST
- Query string parameters : `o=user&a=getcode`
- JSON parameters : `{"email":"ppp@ppp.com", "name":"John Doe"}`
- Return : `{"success":true}`

### Confirm the authentication code
- Purpose : Check the received authent code with the one send by email. If valid, update the name of the user. Also set the `gaslog_userhash` cookie with the user identifer.
- Method : POST
- Query string parameters : `o=user&a=confirmcode`
- JSON parameters : `{"email":"ppp@ppp.com", "name":"John Doe", "code":"123456"}`
- Return : `{"success":true, "userhash":"abc123"}`

### Pair
- Purpose : Use to verify if the user hash is valid. Mainly used for QR code pairing. If the code is valid (similar to `gaslog://abcdef`), the `gaslog_userhash` cookie is set.
Method : GET
- Query string parameters : `o=user&a=pair`
- GET parameters : `qrcode=xxx&redirect=zzz`
- Return : if no redirect : `{"success":true}` else a HTTP 301 redirection to the redirect parameter.

### Delete
- Purpose : Delete all information about the user (vehicles, refills, stations), and log out the user by asking the browser to delete the  `gaslog_userhash` cookie.
- Method : GET
- Query string parameters : `o=user&a=delete`
- Return : `{"success":true}`

### Update
- Purpose : Update user information (mainly the name)
- Method : POST
- Query string parameters : `o=user&a=update`
- JSON parameters : `{"name":"The UsernameCar"}`
- Return : `{"success":true}`

## Vehicles
This set of API will work only if the user is logged and exists. The `gaslog_userhash` cookie must match a user in the database.

### Get all vehicles of the user
- Purpose : return all the vehicles of the user
- Method : GET
- Query string parameters : `o=vehicles`
- Return : `{"success":true, "vehicles": [...]}`

### Get details of a vehicle
- Purpose : return the details of a vehicle
- Method : GET
- Query string parameters : `o=vehicle&a=getdetails&vehicleid=123`
- Return : `{"success":true, "vehicle": {...}}`

### Delete a vehicle
- Purpose : Delete a vehicle (the associated refill are not deleted)
- Method : GET
- Query string parameters : `o=vehicle&a=delete&vehicleid=123`
- Return : `{"success":true}`

### Update a vehicle
- Purpose : Update information about a vehicle
- Method : POST
- Query string parameters : `o=vehicle&a=update&vehicleid=123`
- JSON parameters : `{"name":"TheCar", "brand":"John Doe", "purchaseDate":"yyyy-mm-dd", "initialMileage":0, "distanceUnit":"km", "fuels": [...]}`
- Return : `{"success":true}`

### Add a new vehicle
- Purpose : Create and add a new vehicle to a user. Fails if vehicle already exists (same name)
- Method : POST
- Query string parameters : `o=new_vehicle`
- JSON parameters : `{"name":"TheCar", "brand":"John Doe", "purchaseDate":"yyyy-mm-dd", "initialMileage":0, "distanceUnit":"km", "fuels": [...]}`
- Return : `{"success":true, "vehicleId":123}`

## Refill
Manage refill/refuel of a vehicle. A `vehicleid` is always mandatory.

### Add a refill
- Purpose : add a refill to a vehicle of a user.
- Method : POST
- Query string parameters : `o=refill&a=add`
- JSON parameters : a lot ... 
- Return : `{"success":true}`

### Get refills statistic, short version
- Purpose : Return a limited set of the last refills and some statistics of (based on the last 3 refills, last 10 refills and the last 20.000km) refill/refuel of a vehicle
- Method : GET
- Query string parameters : `o=refills&a=shortstats`
- Return : `{"success":true, "refills":[...], "stats_last_refills3":[...], "stats_last_refills10":[...], "stats_last_refills20000":[...]}`

### Get all refills
- Purpose : Return the list of all refills of a vehicle, and the vehicle information.
- Method : GET
- Query string parameters : `o=refills&a=allstats`
- Return : `{"success":true, "allrefills":[...], "vehicle":[...]}`

## Gas Station
This set manage gas stations.

### Get last stations
- Purpose : Return the list of gas stations used by the user
- Method : GET
- Query string parameters : `o=stations`
- Return : `{"success":true, "stations":[...]}`

### Get nearest stations
- Purpose : Return the list of gas stations near the user. It call the Overpass API from an Openstreetmap server. Latitude and longitude are truncated to 3 digits.  The radius of the search is hard coded to 2km. This API can be called even in non-logged mode (there is no check for login user). The result of the API can be set in browser cache.
- Method : GET
- Query string parameters : `o=getnearest&lat=n.nnn&long=n.nnn` (circle search)
- Query string parameters : `o=getnearest&lat=n.nnn&long=n.nnn&lat2=n.nnn&long2=n.nnn` (square search)
- JSON parameters : a lot ... 
- Return : `{"success":true, "stations":[...]}` . Can fail with HTTP 429 (too many calls) or 504 (error when calling the Overpass API)

### Add a station
- Purpose : Add a station manually entered by the user. The number of station per user is limited, so a new station will remove the oldest one. Raise an error if the station already exists (same name)
- Method : POST
- Query string parameters : `o=station&a=add`
- JSON parameters : `{"name":"TheStation", "lat":12.345, "long":"-12.345}`
- Return : `{"success":true, "stationId":1234}`

### Update a station
- Purpose : update the name, or the coordinate of a station. May fails if the user already have a station with the same name.
- Method : POST
- Query string parameters : `o=station&a=update&stationid=xx`
- JSON parameters : `{"name":"TheStation", "lat":12.345, "long":"-12.345}`
- Return : `{"success":true}`

### Delete a station
- Purpose : Delete a station. Refill associated to this station will be orphans.
- Method : GET
- Query string parameters : `o=station&a=delete&stationid=xx`
- JSON parameters : `{"name":"TheStation", "lat":12.345, "long":"-12.345}`
- Return : `{"success":true}`

### Get a station and its details
- Purpose : return details of a station.
- Method : GET
- Query string parameters: `o=station&a=get&stationid=xx`
- Return : `{"success":true,"station":{"id":"12","name":"The Station","created_date":"2026-03-14 18:16:23","last_usage_date":null,"latitude":"48.9725494","longitude":"2.207494","pluscode":null,"total_refills":"0","last_refill":null}}`

## Download/upload data
The set of API allow to user to export / import all known information about him : user information, vehicles, refills, stations.

### Download data
- Purpose : create a JSON file and send it as an attachment. Contains all know information about the user.
- Method : GET
- Query string parameters : `o=data&a=download`
- Return : `{"success":true, "user":{...}, "vehicles":[...], "stations":[...], "date_exported": "yyyy-mm-dd hh:ii:ss"}`
