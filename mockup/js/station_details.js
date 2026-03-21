function confirmDelete() {
    if (confirm("Do you want to delete this station?")) {
        alert("Station deleted");
        window.location.href = "stations.html";
    }
}

window.confirmDelete = confirmDelete;
