function saveSettings() {
    alert("Settings saved successfully!");
    window.location.href = "index.html";
}

function setDeleteAccountWarning(message) {
    const warning = document.getElementById("deleteAccountWarning");
    if (!warning) {
        return;
    }

    warning.textContent = message;
}

async function loadDeleteAccountWarning() {
    if (!isUserLoggedIn()) {
        setDeleteAccountWarning("This information will be deleted from your browser local storage.");
        return;
    }

    try {
        const response = await fetch(API_ENDPOINT + "?o=user&a=getinfo", {
            method: "GET",
            credentials: "include"
        });

        if (!response.ok) {
            throw new Error("Failed to load user info");
        }

        const data = await response.json();
        const user = data && data.user ? data.user : data;

        if (!user || data.success === false) {
            throw new Error((data && data.message) || "Failed to load user info");
        }

        const email = user && user.email ? user.email : "your account";
        setDeleteAccountWarning("Your account associated to " + email + " will be deleted.");
    } catch (error) {
        console.error("Error loading delete warning user info:", error);
        setDeleteAccountWarning("Your account will be deleted.");
    }
}

function importData() {
    if (confirm("Importing data will replace all your current data. Continue?")) {
        document.getElementById("importFile").click();
    }
}

function getDownloadFilenameFromResponse(response) {
    const headerValue = response.headers.get("Content-Disposition") || response.headers.get("content-disposition");
    if (!headerValue) {
        return "gaslog-export.json";
    }

    const utf8Match = headerValue.match(/filename\*=UTF-8''([^;]+)/i);
    if (utf8Match && utf8Match[1]) {
        try {
            return decodeURIComponent(utf8Match[1]);
        } catch (error) {
            return utf8Match[1];
        }
    }

    const plainMatch = headerValue.match(/filename="?([^";]+)"?/i);
    if (plainMatch && plainMatch[1]) {
        return plainMatch[1];
    }

    return "gaslog-export.json";
}

async function exportData() {
    try {
        const response = await fetch(API_ENDPOINT + "?o=data&a=download", {
            method: "GET",
            credentials: "same-origin"
        });

        if (!response.ok) {
            throw new Error("Failed to export data");
        }

        const blob = await response.blob();
        const filename = getDownloadFilenameFromResponse(response);

        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
        console.error("Export data failed:", error);
        alert("Unable to export data. Please try again.");
    }
}

async function deleteUserAccount() {
    const response = await fetch(API_ENDPOINT + "?o=user&a=delete", {
        method: "POST",
        credentials: "include"
    });

    if (!response.ok) {
        throw new Error("Failed to delete account");
    }

    return await response.json();
}

async function confirmDeleteData() {
    if (confirm("Are you sure you want to delete all your data? This action cannot be undone.")) {
        if (confirm("Are you REALLY sure? All vehicles, refills, and stations will be permanently deleted.")) {
            try {
                if (isUserLoggedIn()) {
                    const payload = await deleteUserAccount();
                    if (payload && payload.success === false) {
                        throw new Error(payload.message || "Failed to delete account");
                    }
                }

                alert("All data deleted");
                window.location.href = "index.html";
            } catch (error) {
                console.error("Delete data failed:", error);
                alert("Unable to delete your data. Please try again.");
            }
        }
    }
}

window.saveSettings = saveSettings;
window.importData = importData;
window.confirmDeleteData = confirmDeleteData;
window.exportData = exportData;

document.addEventListener("DOMContentLoaded", function () {
    loadDeleteAccountWarning();
});
