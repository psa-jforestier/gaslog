var fuelContainer = null;

async function saveVehicleToAPI(vehicleData) {
    return await apiPost("?o=new_vehicle", vehicleData);
}

function saveVehicleToLocalStorage(vehicleData) {
    createLocalVehicle(vehicleData);
}

async function handleFormSubmit(event) {
    event.preventDefault();

    const vehicleData = getVehicleFormData({ fuelContainer: fuelContainer });

    // Validation
    if (!vehicleData.name) {
        alert("Please enter a vehicle name");
        return;
    }

    if (vehicleData.fuels.length === 0) {
        alert("Please select at least one fuel type");
        return;
    }

    try {
        if (isUserLoggedIn()) {
            const apiResponse = await saveVehicleToAPI(vehicleData);
            
            // Check if API returned an error
            if (apiResponse && apiResponse.success === false) {
                alert(apiResponse.message || "Failed to save vehicle");
                return;
            }
        } else {
            saveVehicleToLocalStorage(vehicleData);
        }

        // Redirect to vehicles page on success
        window.location.href = "vehicles.html";
    } catch (error) {
        console.error("Error saving vehicle:", error);
        alert("Failed to save vehicle. Please try again.");
    }
}

function initNewVehicleForm() {
    fuelContainer = document.getElementById("fuelButtons");
    renderVehicleBrandOptions(document.getElementById("vehicleBrand"));
    renderFuelButtons(fuelContainer);
    bindFuelButtons(fuelContainer);

    // Handle form submission
    const form = document.getElementById("newVehicleForm");
    if (form) {
        form.addEventListener("submit", handleFormSubmit);
    }
}

document.addEventListener("DOMContentLoaded", function () {
    initNewVehicleForm();
});
