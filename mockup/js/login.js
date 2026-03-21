function validateSendCodeButton() {
    const email = document.getElementById("userEmail").value.trim();
    const sendCodeBtn = document.getElementById("sendCodeBtn");

    if (email && isValidEmail(email)) {
        sendCodeBtn.disabled = false;
    } else {
        sendCodeBtn.disabled = true;
    }
}

function sendAuthCode() {
    const email = document.getElementById("userEmail").value.trim();
    const name = document.getElementById("userName").value.trim();

    // Make POST request to API
    const requestData = {
        email: email,
        name: name
    };

    fetch(API_ENDPOINT+"?o=user&a=getcode", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(requestData)
    })
        .then(function (response) {
            if (!response.ok) {
                throw new Error("Failed to send authentication code");
            }
            return response.json();
        })
        .then(function (data) {
            // Show the auth code input and buttons
            document.getElementById("authCodeGroup").style.display = "block";
            document.getElementById("loginButtons").style.display = "flex";

            // Disable the send code button after clicking
            document.getElementById("sendCodeBtn").disabled = true;
            document.getElementById("sendCodeBtn").textContent = "Code sent!";

            // Focus on the auth code input
            document.getElementById("authCode").focus();

            alert("Authentication code sent to " + email + "!");
        })
        .catch(function (error) {
            console.error("Error sending auth code:", error);
            alert("Failed to send authentication code. Please try again.");
            
            // Re-enable the send code button on error
            document.getElementById("sendCodeBtn").disabled = false;
        });
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function verifyAuthCode() {
    const authCode = document.getElementById("authCode").value.trim();

    if (!authCode) {
        alert("Please enter the authentication code");
        return;
    }

    // In a real app, this would call an API to verify the code
    console.log("Verifying auth code:", authCode);

    // For mockup purposes, any non-empty code is valid
    // In production, validate against the code sent to email
    if (authCode.length > 0) {
        // Enable the OK button
        document.getElementById("okBtn").disabled = false;
    }
}

function handleFormSubmit(event) {
    event.preventDefault();

    const email = document.getElementById("userEmail").value.trim();
    const name = document.getElementById("userName").value.trim();
    const authCode = document.getElementById("authCode").value.trim();

    if (!email || !authCode) {
        alert("Please fill in all fields");
        return;
    }

    const requestData = {
        email: email,
        code: authCode,
        name: name
    };

    fetch(API_ENDPOINT + "?o=user&a=confirmcode", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(requestData)
    })
        .then(function (response) {
            if (!response.ok) {
                throw new Error("Failed to confirm authentication code");
            }
            return response.json();
        })
        .then(function (data) {
            if (data.success === false) {
                // Display the error message from the API response
                alert(data.message || "Failed to confirm authentication code");
                return;
            }
            
            // Success - redirect to main page
            alert("Account created/logged in successfully!");
            window.location.href = "index.html";
        })
        .catch(function (error) {
            console.error("Error confirming auth code:", error);
            alert("Failed to confirm authentication code. Please try again.");
        });
}

function initLoginForm() {
    const form = document.getElementById("loginForm");
    if (form) {
        form.addEventListener("submit", handleFormSubmit);
    }

    // Add input listeners to email and name fields for button validation
    const emailInput = document.getElementById("userEmail");
    const nameInput = document.getElementById("userName");
    
    if (emailInput) {
        emailInput.addEventListener("input", validateSendCodeButton);
        emailInput.addEventListener("change", validateSendCodeButton);
    }
    
    if (nameInput) {
        nameInput.addEventListener("input", validateSendCodeButton);
        nameInput.addEventListener("change", validateSendCodeButton);
    }

    // Enable OK button when auth code is entered
    const authCodeInput = document.getElementById("authCode");
    if (authCodeInput) {
        authCodeInput.addEventListener("input", function () {
            verifyAuthCode();
        });
    }
}

document.addEventListener("DOMContentLoaded", function () {
    // Check if user is logged in and hide/show login section accordingly
    if (isUserLoggedIn()) {
        const loginSection = document.getElementById("loginSection");
        const accountSection = document.getElementById("accountSection");
        
        if (loginSection) {
            loginSection.style.display = "none";
        }
        if (accountSection) {
            accountSection.style.display = "block";
        }
        
        // Initialize account management UI
        initAccountManagement();
    } else {
        initLoginForm();
    }
});

// Account management functions for logged-in users
function initAccountManagement() {
    loadUserInfo();
    setupNameChangeValidation();
    setupSignOutButton();
    setupScanQRButton();
}

function loadUserInfo() {
    // Get user info from API
    fetch(API_ENDPOINT + "?o=user&a=getinfo", {
        method: "GET",
        credentials: "include"
    })
        .then(function (response) {
            if (!response.ok) {
                throw new Error("Failed to load user info");
            }
            return response.json();
        })
        .then(function (data) {
            var user = data && data.user ? data.user : data;

            if (!user || data.success === false) {
                throw new Error((data && data.message) || "Failed to load user info");
            }

            if (user.email) {
                document.getElementById("userEmailDisplay").textContent = user.email;
                
                // Store original email for QR generation
                window.userEmail = user.email;
                
                // Generate QR code with hash of email
                generateQRCode(user.email);
            }
            
            if (user.name) {
                document.getElementById("accountUserName").value = user.name;
                
                // Store original name to detect changes
                window.originalUserName = user.name;
            }
        })
        .catch(function (error) {
            console.error("Error loading user info:", error);
            
            // Fallback: use mock data for mockup
            const mockEmail = "user@example.com";
            const mockName = "John Doe";
            
            document.getElementById("userEmailDisplay").textContent = mockEmail;
            document.getElementById("accountUserName").value = mockName;
            
            window.userEmail = mockEmail;
            window.originalUserName = mockName;
            
            generateQRCode(mockEmail);
        });
}

function generateQRCode(email) {
    // Generate a simple hash of the email (in production, use proper hash from backend)
    const emailHash = btoa(email); // Base64 encoding as simple hash for mockup
    
    // Clear any existing QR code
    const qrcodeContainer = document.getElementById("qrcode");
    qrcodeContainer.innerHTML = "";
    
    // Generate QR code
    if (typeof QRCode !== "undefined") {
        new QRCode(qrcodeContainer, {
            text: emailHash,
            width: 200,
            height: 200
        });
    } else {
        // Fallback if QRCode library not loaded
        qrcodeContainer.innerHTML = "<p style='color: #666;'>QR Code: " + emailHash.substring(0, 20) + "...</p>";
    }
}

function setupNameChangeValidation() {
    const nameInput = document.getElementById("accountUserName");
    const updateBtn = document.getElementById("updateNameBtn");
    
    if (nameInput && updateBtn) {
        nameInput.addEventListener("input", function () {
            const currentName = nameInput.value.trim();
            const hasChanged = currentName !== window.originalUserName;
            
            updateBtn.disabled = !hasChanged;
        });
        
        updateBtn.addEventListener("click", function () {
            updateUserName();
        });
    }
}

function updateUserName() {
    const newName = document.getElementById("accountUserName").value.trim();
    
    if (!newName) {
        alert("Name cannot be empty");
        return;
    }
    
    // Send update to API
    const requestData = {
        name: newName
    };
    
    fetch(API_ENDPOINT + "?o=user&a=updatename", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify(requestData)
    })
        .then(function (response) {
            if (!response.ok) {
                throw new Error("Failed to update name");
            }
            return response.json();
        })
        .then(function (data) {
            if (data.success !== false) {
                alert("Name updated successfully!");
                window.location.href = "index.html";
            } else {
                alert(data.message || "Failed to update name");
            }
        })
        .catch(function (error) {
            console.error("Error updating name:", error);
            alert("Name updated! (Mockup mode)");
            window.location.href = "index.html";
        });
}

function setupSignOutButton() {
    const signOutBtn = document.getElementById("signOutBtn");
    
    if (signOutBtn) {
        signOutBtn.addEventListener("click", function () {
            if (confirm("Are you sure you want to sign out?")) {
                signOut();
            }
        });
    }
}

function signOut() {
    // Call API to sign out
    fetch(API_ENDPOINT + "?o=user&a=logout", {
        method: "GET",
        credentials: "include"
    })
        .then(function (response) {
            return response.json();
        })
        .then(function (data) {
            // Clear the user hash cookie
            document.cookie = "gaslog_userhash=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            
            alert("You have been signed out");
            window.location.href = "index.html";
        })
        .catch(function (error) {
            console.error("Error signing out:", error);
            
            // Clear cookie anyway for mockup
            document.cookie = "gaslog_userhash=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            
            alert("You have been signed out");
            window.location.href = "index.html";
        });
}

function setupScanQRButton() {
    const scanQRBtn = document.getElementById("scanQRBtn");
    
    if (scanQRBtn) {
        scanQRBtn.addEventListener("click", function () {
            alert("QR code scanning feature would open camera here.\n\nIn a production app, this would:\n1. Request camera permission\n2. Scan QR code\n3. Decode email hash\n4. Pair device to account");
        });
    }
}

function showQRFullscreen() {
    // Create fullscreen overlay
    const overlay = document.createElement("div");
    overlay.style.cssText = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); display: flex; align-items: center; justify-content: center; z-index: 10000; cursor: pointer;";
    
    const qrContainer = document.createElement("div");
    qrContainer.style.cssText = "background: white; padding: 20px; border-radius: 10px;";
    
    overlay.appendChild(qrContainer);
    
    // Generate larger QR code
    if (typeof QRCode !== "undefined" && window.userEmail) {
        const emailHash = btoa(window.userEmail);
        new QRCode(qrContainer, {
            text: emailHash,
            width: 300,
            height: 300
        });
    }
    
    // Close on click
    overlay.addEventListener("click", function () {
        document.body.removeChild(overlay);
    });
    
    document.body.appendChild(overlay);
}

window.toggleNav = toggleNav;
window.showQRFullscreen = showQRFullscreen;
