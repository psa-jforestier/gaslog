function getVehicleIdFromQueryString() {
	const urlParams = new URLSearchParams(window.location.search);
	return urlParams.get("vehicleid");
}

var fuelPriceChartInstance = null;
var mileageChartInstance = null;
var fuelPricePointTimestamps = [];
var mileagePointTimestamps = [];
var isSyncingChartViewport = false;

function setGraphicsLoading(isLoading) {
	const loadingIndicator = document.getElementById("graphicsLoading");
	if (!loadingIndicator) {
		return;
	}

	loadingIndicator.classList.toggle("hidden", !isLoading);
}

function setGraphicsHeader(vehicleName) {
	const title = document.getElementById("graphicsPageTitle");
	if (!title) {
		return;
	}

	const name = String(vehicleName || "").trim();
	const label = name || "Vehicle";
	title.childNodes[0].textContent = label + " - Graphics ";
}

function setGraphicsSubtitle(text) {
	const subtitle = document.getElementById("graphicsPageSubtitle");
	if (!subtitle) {
		return;
	}

	subtitle.textContent = text;
}

function setShowHistoryLink(vehicleId) {
	const href = vehicleId
		? "refill_history.html?vehicleid=" + encodeURIComponent(vehicleId)
		: "refill_history.html";

	updateButtonLinksBySelector(".showHistoryBtn", href);
}

function renderFuelTypeLegend(fuelTypes) {
	const legend = document.getElementById("fuelTypeLegend");
	if (!legend) {
		return;
	}

	legend.innerHTML = "";

	if (!Array.isArray(fuelTypes) || fuelTypes.length === 0) {
		return;
	}

	fuelTypes.forEach(function (fuelType) {
		const item = document.createElement("span");
		item.style.display = "inline-flex";
		item.style.alignItems = "center";
		item.style.gap = "6px";

		const dot = document.createElement("span");
		dot.style.display = "inline-block";
		dot.style.width = "10px";
		dot.style.height = "10px";
		dot.style.borderRadius = "50%";
		dot.style.backgroundColor = getFuelTypeColor(fuelType);

		const label = document.createElement("span");
		label.textContent = fuelType;

		item.appendChild(dot);
		item.appendChild(label);
		legend.appendChild(item);
	});
}

function resetChart() {
	if (fuelPriceChartInstance) {
		fuelPriceChartInstance.destroy();
		fuelPriceChartInstance = null;
	}
	fuelPricePointTimestamps = [];
}

function resetMileageChart() {
	if (mileageChartInstance) {
		mileageChartInstance.destroy();
		mileageChartInstance = null;
	}
	mileagePointTimestamps = [];
}

function getActiveElementCenter(chart, pointIndex) {
	if (!chart || pointIndex < 0) {
		return { x: 0, y: 0 };
	}

	const meta = chart.getDatasetMeta(0);
	if (!meta || !Array.isArray(meta.data) || !meta.data[pointIndex]) {
		return { x: 0, y: 0 };
	}

	const element = meta.data[pointIndex];
	return {
		x: element.x,
		y: element.y
	};
}

function applyLinkedHover(targetChart, targetIndex) {
	if (!targetChart) {
		return;
	}

	if (targetIndex < 0) {
		targetChart.setActiveElements([]);
		targetChart.tooltip.setActiveElements([], { x: 0, y: 0 });
		targetChart.update("none");
		return;
	}

	const center = getActiveElementCenter(targetChart, targetIndex);
	targetChart.setActiveElements([{ datasetIndex: 0, index: targetIndex }]);
	targetChart.tooltip.setActiveElements([{ datasetIndex: 0, index: targetIndex }], center);
	targetChart.update("none");
}

function syncHoverByTimestamp(sourceChartType, sourcePointIndex) {
	if (sourceChartType === "fuel") {
		if (sourcePointIndex < 0) {
			applyLinkedHover(mileageChartInstance, -1);
			return;
		}

		const timestamp = fuelPricePointTimestamps[sourcePointIndex];
		const targetIndex = mileagePointTimestamps.indexOf(timestamp);
		applyLinkedHover(mileageChartInstance, targetIndex);
		return;
	}

	if (sourcePointIndex < 0) {
		applyLinkedHover(fuelPriceChartInstance, -1);
		return;
	}

	const timestamp = mileagePointTimestamps[sourcePointIndex];
	const targetIndex = fuelPricePointTimestamps.indexOf(timestamp);
	applyLinkedHover(fuelPriceChartInstance, targetIndex);
}

function syncChartViewport(sourceChartType) {
	if (isSyncingChartViewport) {
		return;
	}

	const sourceChart = sourceChartType === "fuel" ? fuelPriceChartInstance : mileageChartInstance;
	const targetChart = sourceChartType === "fuel" ? mileageChartInstance : fuelPriceChartInstance;

	if (!sourceChart || !targetChart || !sourceChart.scales || !sourceChart.scales.x) {
		return;
	}

	const sourceXMin = sourceChart.scales.x.min;
	const sourceXMax = sourceChart.scales.x.max;

	isSyncingChartViewport = true;
	try {
		targetChart.options.scales.x.min = sourceXMin;
		targetChart.options.scales.x.max = sourceXMax;
		targetChart.update("none");
	} finally {
		isSyncingChartViewport = false;
	}
}

function normalizeRefillsForChart(refills) {
	if (!Array.isArray(refills)) {
		return [];
	}

	return refills
		.map(function (refill) {
			if (!refill || typeof refill !== "object") {
				return null;
			}

			const refillDate = refill.refill_date || refill.refillDate || refill.date || "";
			const parsedDate = new Date(String(refillDate).replace(" ", "T"));
			const unitPrice = Number(refill.unit_price || refill.unitPrice || refill.fuel_price || refill.fuelPrice);
			const fuelType = String(refill.fuel || refill.fuel_type || refill.fuelType || "Unknown");

			if (Number.isNaN(parsedDate.getTime()) || !Number.isFinite(unitPrice)) {
				return null;
			}

			return {
				timestamp: parsedDate.getTime(),
				dateLabel: formatDateTimeForDisplay(refillDate),
				fuelPrice: unitPrice,
				fuelType: fuelType
			};
		})
		.filter(Boolean)
		.sort(function (left, right) {
			return left.timestamp - right.timestamp;
		});
}

function getFuelTypeColor(fuelType) {
	const palette = {
        /** as stated by https://www.radiofrance.fr/franceinter/nouveaux-noms-et-nouveaux-symboles-pour-les-carburants-du-changement-a-la-pompe-cette-semaine-8231926 */
		SP95E10: "#56BA49",
		SP95E5: "#004A26",
		SP98: "#004A26",
		Diesel: "#E8E515",
		"Premium Diesel": "#F5871F",
		E85: "#29C0D6",
		GPL: "#196C92",
		LGPL: "#196C92",
		"CNG/GNV": "#196C92"
	};

	return palette[fuelType] || "#9aa6b2";
}

function normalizeRefillsForMileageChart(refills) {
	if (!Array.isArray(refills)) {
		return [];
	}

	return refills
		.map(function (refill) {
			if (!refill || typeof refill !== "object") {
				return null;
			}

			const refillDate = refill.refill_date || refill.refillDate || refill.date || "";
			const parsedDate = new Date(String(refillDate).replace(" ", "T"));
			const mileage = Number(refill.mileage || refill.odometer || refill.last_mileage || refill.lastMileage);

			if (Number.isNaN(parsedDate.getTime()) || !Number.isFinite(mileage)) {
				return null;
			}

			return {
				timestamp: parsedDate.getTime(),
				dateLabel: formatDateTimeForDisplay(refillDate),
				mileage: mileage
			};
		})
		.filter(Boolean)
		.sort(function (left, right) {
			return left.timestamp - right.timestamp;
		});
}

function renderFuelPriceChart(refills) {
	const chartCanvas = document.getElementById("fuelPriceChart");
	if (!chartCanvas) {
		return;
	}

	resetChart();

	if (typeof Chart === "undefined") {
		renderFuelTypeLegend([]);
		return;
	}

	const points = normalizeRefillsForChart(refills);
	if (points.length === 0) {
		renderFuelTypeLegend([]);
		return;
	}

	const labels = points.map(function (point) {
		return point.dateLabel;
	});

	const prices = points.map(function (point) {
		return point.fuelPrice;
	});

	const pointColors = points.map(function (point) {
		return getFuelTypeColor(point.fuelType);
	});

	const distinctFuelTypes = Array.from(new Set(points.map(function (point) {
		return point.fuelType;
	})));
	renderFuelTypeLegend(distinctFuelTypes);

	fuelPricePointTimestamps = points.map(function (point) {
		return point.timestamp;
	});

	fuelPriceChartInstance = new Chart(chartCanvas, {
		type: "line",
		data: {
			labels: labels,
			datasets: [{
				label: "Fuel price",
				data: prices,
				borderColor: "#2a6fb2",
				backgroundColor: "rgba(42, 111, 178, 0.18)",
				pointBackgroundColor: pointColors,
				pointBorderColor: pointColors,
				borderWidth: 2,
				pointRadius: 3,
				pointHoverRadius: 5,
				tension: 0.2,
				fill: true
			}]
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
            animation: false,
			onHover: function (_, activeElements) {
				const activeIndex = Array.isArray(activeElements) && activeElements.length > 0
					? activeElements[0].index
					: -1;
				syncHoverByTimestamp("fuel", activeIndex);
			},
			plugins: {
				legend: {
					display: true
				},
				tooltip: {
					callbacks: {
						label: function (context) {
							return "Fuel price: " + Number(context.parsed.y).toFixed(3);
						}
					}
				},
				zoom: {
					pan: {
						enabled: true,
						mode: "x",
						onPan: function () {
							syncChartViewport("fuel");
						},
						onPanComplete: function () {
							syncChartViewport("fuel");
						}
					},
					zoom: {
						wheel: {
							enabled: true
						},
						pinch: {
							enabled: true
						},
						drag: {
							enabled: false,
							backgroundColor: "rgba(42, 111, 178, 0.15)",
							borderColor: "rgba(42, 111, 178, 0.55)",
							borderWidth: 1
						},
						mode: "x",
						onZoom: function () {
							syncChartViewport("fuel");
						},
						onZoomComplete: function () {
							syncChartViewport("fuel");
						}
					}
				}
			},
			scales: {
				x: {
					title: {
						display: true,
						text: "Refill date and time"
					},
					ticks: {
						maxRotation: 45,
						minRotation: 20,
						autoSkip: true,
						maxTicksLimit: 8
					}
				},
				y: {
					title: {
						display: true,
						text: "Fuel price"
					},
					ticks: {
						callback: function (value) {
							return Number(value).toFixed(3);
						}
					},
					beginAtZero: false
				}
			}
		}
	});
}

function renderMileageChart(refills) {
	const chartCanvas = document.getElementById("mileageChart");
	if (!chartCanvas) {
		return;
	}

	resetMileageChart();

	if (typeof Chart === "undefined") {
		return;
	}

	const points = normalizeRefillsForMileageChart(refills);
	if (points.length === 0) {
		return;
	}

	const labels = points.map(function (point) {
		return point.dateLabel;
	});

	const mileages = points.map(function (point) {
		return point.mileage;
	});

	mileagePointTimestamps = points.map(function (point) {
		return point.timestamp;
	});

	mileageChartInstance = new Chart(chartCanvas, {
		type: "line",
		data: {
			labels: labels,
			datasets: [{
				label: "Mileage",
				data: mileages,
				borderColor: "#1f8a4c",
				backgroundColor: "rgba(31, 138, 76, 0.18)",
				borderWidth: 2,
				pointRadius: 3,
				pointHoverRadius: 5,
				tension: 0.2,
				fill: true
			}]
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			animation: false,
			onHover: function (_, activeElements) {
				const activeIndex = Array.isArray(activeElements) && activeElements.length > 0
					? activeElements[0].index
					: -1;
				syncHoverByTimestamp("mileage", activeIndex);
			},
			plugins: {
				legend: {
					display: true
				},
				tooltip: {
					callbacks: {
						label: function (context) {
							return "Mileage: " + Number(context.parsed.y).toFixed(0);
						}
					}
				},
				zoom: {
					pan: {
						enabled: true,
						mode: "x",
						onPan: function () {
							syncChartViewport("mileage");
						},
						onPanComplete: function () {
							syncChartViewport("mileage");
						}
					},
					zoom: {
						wheel: {
							enabled: true
						},
						pinch: {
							enabled: true
						},
						drag: {
							enabled: false,
							backgroundColor: "rgba(31, 138, 76, 0.15)",
							borderColor: "rgba(31, 138, 76, 0.55)",
							borderWidth: 1
						},
						mode: "x",
						onZoom: function () {
							syncChartViewport("mileage");
						},
						onZoomComplete: function () {
							syncChartViewport("mileage");
						}
					}
				}
			},
			scales: {
				x: {
					title: {
						display: true,
						text: "Refill date and time"
					},
					ticks: {
						maxRotation: 45,
						minRotation: 20,
						autoSkip: true,
						maxTicksLimit: 8
					}
				},
				y: {
					title: {
						display: true,
						text: "Mileage"
					},
					beginAtZero: false
				}
			}
		}
	});
}

async function loadGraphicsData(vehicleId) {
	setShowHistoryLink(vehicleId);

	if (!vehicleId) {
		setGraphicsHeader("Vehicle");
		setGraphicsSubtitle("No vehicle id provided in URL");
		resetChart();
		resetMileageChart();
		return;
	}

	if (!isUserLoggedIn()) {
		const localVehicle = getLocalVehicleById(vehicleId);
		const localName = localVehicle && (localVehicle.name || localVehicle.label);

		setGraphicsHeader(localName || "Vehicle");
		setGraphicsSubtitle("Log in to load data from API");
		resetChart();
		resetMileageChart();
		return;
	}

	setGraphicsLoading(true);

	try {
		const response = await fetch(
			API_ENDPOINT + "?o=refills&a=allstats&vehicleid=" + encodeURIComponent(vehicleId),
			{ method: "GET" }
		);

		if (!response.ok) {
			throw new Error("Failed to load graphics data");
		}

		const data = await response.json();

		if (!data || data.success === false) {
			throw new Error((data && data.message) || "Failed to load graphics data");
		}

		const vehicleName = data.vehicle && data.vehicle.name ? data.vehicle.name : "Vehicle";
		const refills = Array.isArray(data.allrefills) ? data.allrefills : [];

		setGraphicsHeader(vehicleName);
		setGraphicsSubtitle(refills.length + " refill" + (refills.length === 1 ? "" : "s") + " loaded from API");
		renderFuelPriceChart(refills);
		renderMileageChart(refills);
	} catch (error) {
		console.error("Error loading graphics data:", error);
		setGraphicsHeader("Vehicle");
		setGraphicsSubtitle("Unable to load data");
		resetChart();
		resetMileageChart();
	} finally {
		setGraphicsLoading(false);
	}
}

document.addEventListener("DOMContentLoaded", function () {
	const vehicleId = getVehicleIdFromQueryString();
	loadGraphicsData(vehicleId);
});
