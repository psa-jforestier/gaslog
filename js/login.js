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

    apiPost("?o=user&a=getcode", requestData)
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

    apiPost("?o=user&a=confirmcode", requestData)
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
}

function loadUserInfo() {
    fetchCurrentUser()
        .then(function (user) {
            if (user.email) {
                document.getElementById("userEmailDisplay").textContent = user.email;
                
                // Store original email for QR generation
                window.userEmail = user.email;
                
                // Generate QR code with hash of user (which is in the cookie received by the api)
                generateQRCode(getUserHash());
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

function generateQRCode(value) {
    //const emailHash = btoa(value); // Base64 encoding as simple hash for mockup
    const qrstring = "gaslog://" + value; // Custom URI scheme for pairing
    const redirectUrl = window.location;
    const pairUrl = window.location.protocol + "//" + window.location.host + "/app/api.php?o=user&a=pair&qrcode=" + encodeURIComponent(qrstring) + "&redirect=" + encodeURIComponent(redirectUrl);
    const qrcodeContainer = document.getElementById("qrcode");
    if (!qrcodeContainer) {
        return;
    }

    let pairUrlLine = document.getElementById("pairUrlLine");
    if (!pairUrlLine) {
        pairUrlLine = document.createElement("p");
        pairUrlLine.id = "pairUrlLine";
        pairUrlLine.style.cssText = "margin: 0 0 0.75rem 0; text-align: center; font-size: 0.5rem;";
        qrcodeContainer.parentNode.insertBefore(pairUrlLine, qrcodeContainer);
    }

    pairUrlLine.innerHTML = "or go to this URL :<br/><a href=\"" + pairUrl + "\">" + pairUrl + "</a>";

    // Clear any existing QR code
    qrcodeContainer.innerHTML = "";
    
    // Generate QR code
    if (typeof QRCode !== "undefined") {
        new QRCode(qrcodeContainer, {
            text: pairUrl, // Use the pairing URL for the QR code
            width: 200,
            height: 200
        });
    } else {
        // Fallback if QRCode library not loaded
        qrcodeContainer.innerHTML = "<p style='color: #666;'>QR Code: " + qrstring.substring(0, 20) + "...</p>";
    }
}

function getPairUrlForCurrentUser() {
    const pairingValue = getUserHash() || window.userEmail;
    if (!pairingValue) {
        return "";
    }

    const qrstring = "gaslog://" + pairingValue;
    const redirectUrl = window.location.href;
    return window.location.protocol + "//" + window.location.host + "/app/api.php?o=user&a=pair&qrcode=" + encodeURIComponent(qrstring) + "&redirect=" + encodeURIComponent(redirectUrl);
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
    apiPost("?o=user&a=update", { name: newName })
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
    apiGet("?o=user&a=logout")
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

function showQRFullscreen() {
    // Create fullscreen overlay
    const overlay = document.createElement("div");
    overlay.style.cssText = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); display: flex; align-items: center; justify-content: center; z-index: 10000; cursor: pointer;";
    
    const qrContainer = document.createElement("div");
    qrContainer.style.cssText = "background: white; padding: 20px; border-radius: 10px;";
    
    overlay.appendChild(qrContainer);
    
    // Generate larger QR code
    const pairUrl = getPairUrlForCurrentUser();
    if (typeof QRCode !== "undefined" && pairUrl) {
        new QRCode(qrContainer, {
            text: pairUrl,
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

window.showQRFullscreen = showQRFullscreen;
