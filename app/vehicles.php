<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vehicles - GasLog</title>
    <link rel="icon" type="image/png" href="../app/gaslog.png">
    <link rel="stylesheet" href="system-design.css">
</head>
<body>
    <!-- Burger Menu Button -->
    <button class="burger-btn" onclick="toggleNav()">
        <span></span>
        <span></span>
        <span></span>
    </button>

    <!-- Navigation Sidebar -->
    <nav class="nav-sidebar" id="navSidebar">
        <div class="nav-sidebar-header">
            <h2>GasLog</h2>
            <button class="nav-close" onclick="toggleNav()">×</button>
        </div>
        <div class="nav-menu">
            <a href="index.html">Refill</a>
            <a href="vehicles.html" class="active">Vehicles</a>
            <a href="stations.html">Stations</a>
            <a href="login.html">Login</a>
            <a href="settings.html">Settings</a>
        </div>
    </nav>
    <div class="nav-overlay" id="navOverlay" onclick="toggleNav()"></div>

    <div class="app-container">
        <!-- Header -->
        <div class="page-header">
            <h1>My Vehicles</h1>
            <p>Manage your vehicles</p>
        </div>

        <!-- Vehicles List -->
        <section class="content-section">
            <h2>Your Vehicles</h2>
            
            <div class="item-list">
                <div class="item-card" onclick="window.location.href='#vehicle-history'">
                    <h3>Peugeot 308</h3>
                    <p>Brand: Peugeot</p>
                    <div class="item-meta">
                        <span>Last mileage: 45,320 km</span>
                        <span>Fuels: SP95E10, SP98, Diesel</span>
                    </div>
                    <div class="item-meta">
                        <span>Last refill: 05/03/2026</span>
                    </div>
                </div>

                <div class="item-card" onclick="window.location.href='#vehicle-history'">
                    <h3>Tesla Model 3</h3>
                    <p>Brand: Tesla</p>
                    <div class="item-meta">
                        <span>Last mileage: 28,450 km</span>
                        <span>Electric vehicle</span>
                    </div>
                    <div class="item-meta">
                        <span>Last charge: 06/03/2026</span>
                    </div>
                </div>

                <div class="item-card" onclick="window.location.href='#vehicle-history'">
                    <h3>Ford Focus</h3>
                    <p>Brand: Ford</p>
                    <div class="item-meta">
                        <span>Last mileage: 112,890 km</span>
                        <span>Fuels: Diesel</span>
                    </div>
                    <div class="item-meta">
                        <span>Last refill: 02/03/2026</span>
                    </div>
                </div>
            </div>

            <div class="button-row">
                <button class="btn btn-primary" onclick="window.location.href='new_vehicle.html'">New Vehicle</button>
                <button class="btn btn-secondary" onclick="window.location.href='index.html'">Done</button>
            </div>
        </section>
    </div>

    <script>
        function toggleNav() {
            document.getElementById('navSidebar').classList.toggle('active');
            document.getElementById('navOverlay').classList.toggle('active');
        }
    </script>
</body>
</html>
