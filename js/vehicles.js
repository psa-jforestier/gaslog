function renderVehicles(vehicles) {
    const vehicleList = document.getElementById("vehicleList");

    if (!vehicleList) {
        return;
    }

    vehicleList.innerHTML = "";

    if (vehicles.length === 0) {
        vehicleList.innerHTML = '<p class="text-muted" style="text-align: center; padding: 20px;">No vehicles found. Add your first vehicle!</p>';
        return;
    }

    vehicles.forEach(function (vehicle) {
        const card = document.createElement("div");
        card.className = "item-card";
        card.onclick = function () {
            window.location.href = buildVehiclePageHref("vehicle_history.html", vehicle.id);
        };

        const title = document.createElement("h3");
        title.textContent = vehicle.label;
        card.appendChild(title);

        if (vehicle.brand) {
            const brandPara = document.createElement("p");
            brandPara.textContent = "Brand: " + vehicle.brand;
            card.appendChild(brandPara);
        }

        const metaRow1 = document.createElement("div");
        metaRow1.className = "item-meta";

        if (vehicle.lastMileage) {
            const mileageSpan = document.createElement("span");
            mileageSpan.textContent = "Last mileage: " + vehicle.lastMileage.toLocaleString() + " km";
            metaRow1.appendChild(mileageSpan);
        }

        const fuelsSpan = document.createElement("span");
        fuelsSpan.textContent = formatFuels(vehicle.fuels);
        metaRow1.appendChild(fuelsSpan);

        card.appendChild(metaRow1);

        if (vehicle.lastRefill) {
            const metaRow2 = document.createElement("div");
            metaRow2.className = "item-meta";

            const refillSpan = document.createElement("span");
            refillSpan.textContent = "Last refill: " + formatDate(vehicle.lastRefill);
            metaRow2.appendChild(refillSpan);

            card.appendChild(metaRow2);
        }

        vehicleList.appendChild(card);
    });
}

function setVehiclesLoading(isLoading) {
    setElementHiddenById("vehiclesLoading", !isLoading);
}

async function initVehicles() {
    const usingApi = typeof isUserLoggedIn === "function" && isUserLoggedIn();

    if (usingApi) {
        setVehiclesLoading(true);
    } else {
        setVehiclesLoading(false);
    }

    try {
        const vehicles = await loadVehicles();
        renderVehicles(sortVehiclesByName(vehicles));
    } catch (error) {
        console.error("Failed to load vehicles:", error);
        renderVehicles([]);
    } finally {
        setVehiclesLoading(false);
    }
}

document.addEventListener("DOMContentLoaded", function () {
    initVehicles();
});


