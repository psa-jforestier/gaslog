This page explains the API for GasLog

Endpoint : `/app/api.php`

*Security*

There is no "bearer" or "jwt" or other security concept. If an API must be used in logged mode, it is based on the value of the `gaslog_userhash` cookie transmitted on each request. For each working transaction, the `gaslog_userhash` cookie is renewed for one year.

*Query format*
When calling the API, in GET or POST, usually there is a `o` parameter to indicate the object (user, vehicle), and eventually a `a` parameter to indicate the action (get, delete).

*Response format*

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

*User*
To manage actions on user.

**Logout**
Purpose : Logout a user, by asking the browser to delete the "gaslog_userhash" cookie.
Method : GET
Query string parameters : `o=user&a=logout`
Return : `{"success":true}`

**Get Information**
Purpose : Get information about the user.
Method : GET
Query string parameters : `o=user&a=getinfo`
Return : `{"success":true, "user":{...}}`

**Get authentication code**
Purpose : Generate the authentication code and send it by email. It does not matter if the email already exists or not in the user database.
Method : POST
Query string parameters : `o=user&a=getcode`
JSON parameters : `{"email":"ppp@ppp.com", "name":"John Doe"}`
Return : `{"success":true}`

**Confirm the authentication code**
Purpose : Check the received authent code with the one send by email. If valid, update the name of the user. Also set the `gaslog_userhash` cookie with the user identifer.
Method : POST
Query string parameters : `o=user&a=confirmcode`
JSON parameters : `{"email":"ppp@ppp.com", "name":"John Doe", "code":"123456"}`
Return : `{"success":true, "userhash":"abc123"}`

**Delete**
Purpose : Delete all information about the user (vehicles, refills, stations), and log out the user by asking the browser to delete the  `gaslog_userhash` cookie.
Method : GET
Query string parameters : `o=user&a=delete`
Return : `{"success":true}`

*Vehicles*
This set of API will work only if the user is logged and exists. The `gaslog_userhash` cookie must match a user in the database.
**Get all vehicles of the user**
Purpose : return all the vehicles of the user
Method : GET
Query string parameters : `o=vehicles`
Return : `{"success":true, "vehicles": [...]}`
**Get details of a vehicle**
Purpose : return the details of a vehicle
Method : GET
Query string parameters : `o=vehicle&a=getdetails&vehicleid=123`
Return : `{"success":true, "vehicle": {...}}`
**Delete a vehicle**
Purpose : Delete a vehicle (the associated refill are not deleted)
Method : GET
Query string parameters : `o=vehicle&a=delete&vehicleid=123`
Return : `{"success":true}`
**Update a vehicle**
Purpose : Update information about a vehicle
Method : POST
Query string parameters : `o=vehicle&a=update&vehicleid=123`
JSON parameters : `{"name":"TheCar", "brand":"John Doe", "purchaseDate":"yyyy-mm-dd", "initialMileage":0, "distanceUnit":"km", "fuels": [...]}`
Return : `{"success":true}`
**Add a new vehicle**
Purpose : Create and add a new vehicle to a user. Fails if vehicle already exists (same name)
Method : POST
Query string parameters : `o=new_vehicle`
JSON parameters : `{"name":"TheCar", "brand":"John Doe", "purchaseDate":"yyyy-mm-dd", "initialMileage":0, "distanceUnit":"km", "fuels": [...]}`
Return : `{"success":true, "vehicleId":123}`


