
Create a SQLite database schema from this information. Add comment when necessary for maintenance.

*General information*
All datetime are in format "yyyy-mm-dd hh:ii:ss".

**USER**
_This table list all users fully registered or waiting for full registration_
ID : incremental uniq id
email : varchar 255, user email address. must be uniq across the table.
name : varchar 255, the name of the user (can be null)
created_date : datetime, date of user creation
logged_date : datetime, date of last user login (can be null)
auth_code : varchar 6, temporary authentication code send by email to the user (can be null)
validation_date : dateime, when the user confirm the auth code (can be null)
userhash : a uniq hash of the user

**VEHICLE**
_Contains vehicles of a user_
ID : incremental uniq id
user_id : id of the user owning the vehicle
name : varchar 16, name of the vehicle
brand : varchar 16, brand of the vehicle (can be null)
created_date : datetime, date of vehicle creation
purchase_date : datetime, date of the vehicle purchase (can be null)
initial_mileage : integer, mileage of the vehicle when created (can be null)
last_mileage : integer, last milage of the vehicle (can be null)
distance_unit : char 2, distance unit used by the vehicle (km, mi) (can be null)
fuels : varchar, a string indicating what are the fuel types supported by the vehicle, separated by a ",". Example : "SP95E10,SP98" (can be null)

**REFILL**
_Contains refill of a vehicle of a user_
ID : incremental uniq id
vehicle_id : id of the refilled vehicle
user_id : id of the user who did the refill
refill_date : datetime of the refill
station_id : id of the gas station where the refill took place (can be null)
fuel : varchar 16, a string identifyin the fuel used by the user when refilling (example : "SP95E10")
unit_price : double, the price of a single quantity. Expressed for the currency
currency : char 1, currency (€, $, £) of the unit price and the total price
quantity : double, quantity alsways in Liter
total_price : double, the total price of the refill
mileage : integer, the mileage of the vehicle when refilling (can be null)

**STATION**
_Contains all the gas stations used by a user to refill his vehicle_
ID : incremental uniq id
user_id : id of the user who did the refill
name : varchar 32, name of the gas station
created_date : datetime, when the station was created
last_usage_date : datetime, last time the station was used (can be null)
latitude : double, latitude of the station (can be null)
longitude : double, longitude of the station (can be null)
pluscode : varchar 10, location in Open Location Code / Plus Code format (can be null)