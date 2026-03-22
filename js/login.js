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
    setupScanQRButton();
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
            text: qrstring,
            width: 200,
            height: 200
        });
    } else {
        // Fallback if QRCode library not loaded
        qrcodeContainer.innerHTML = "<p style='color: #666;'>QR Code: " + qrstring.substring(0, 20) + "...</p>";
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
    apiPost("?o=user&a=updatename", { name: newName })
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

function setupScanQRButton() {
    const scanQRBtn = document.getElementById("scanQRBtn");
    
    if (scanQRBtn) {
        scanQRBtn.addEventListener("click", function () {
            openQrScannerAndPair();
        });
    }
}

function submitPairRequest(decodedValue) {
    const form = document.createElement("form");
    form.method = "POST";
    form.action = API_ENDPOINT + "?o=user&a=pair";

    const qrcodeInput = document.createElement("input");
    qrcodeInput.type = "hidden";
    qrcodeInput.name = "qrcode";
    qrcodeInput.value = String(decodedValue || "");

    form.appendChild(qrcodeInput);
    document.body.appendChild(form);
    form.submit();
}

function openQrScannerAndPair() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("Camera is not available in this browser.");
        return;
    }

    if (typeof BarcodeDetector === "undefined") {
        alert("QR scanning is not supported by this browser.");
        return;
    }

    let isClosed = false;
    let stream = null;
    let rafId = 0;

    const overlay = document.createElement("div");
    overlay.style.cssText = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.92); z-index: 10001; display: flex; align-items: center; justify-content: center; padding: 1rem; box-sizing: border-box;";

    const panel = document.createElement("div");
    panel.style.cssText = "width: 100%; max-width: 520px; background: #111; color: #fff; border-radius: 12px; padding: 12px; box-sizing: border-box;";

    const title = document.createElement("h3");
    title.textContent = "Scan QR Code";
    title.style.cssText = "margin: 0 0 8px 0; font-size: 1.1rem;";

    const info = document.createElement("p");
    info.textContent = "Center the QR code in the camera frame.";
    info.style.cssText = "margin: 0 0 10px 0; color: #ddd; font-size: 0.95rem;";

    const video = document.createElement("video");
    video.setAttribute("playsinline", "true");
    video.autoplay = true;
    video.muted = true;
    video.style.cssText = "width: 100%; border-radius: 8px; background: #000;";

    const actions = document.createElement("div");
    actions.style.cssText = "display: flex; justify-content: flex-end; margin-top: 10px;";

    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "btn btn-cancel";
    cancelBtn.textContent = "Cancel";

    actions.appendChild(cancelBtn);
    panel.appendChild(title);
    panel.appendChild(info);
    panel.appendChild(video);
    panel.appendChild(actions);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    function closeScanner() {
        if (isClosed) {
            return;
        }

        isClosed = true;

        if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = 0;
        }

        if (stream) {
            stream.getTracks().forEach(function (track) {
                track.stop();
            });
            stream = null;
        }

        if (overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
        }
    }

    cancelBtn.addEventListener("click", function () {
        closeScanner();
    });

    navigator.mediaDevices.getUserMedia({
        video: {
            facingMode: {
                ideal: "environment"
            }
        },
        audio: false
    }).then(function (mediaStream) {
        stream = mediaStream;
        video.srcObject = mediaStream;

        return video.play();
    }).then(function () {
        const detector = new BarcodeDetector({ formats: ["qr_code"] });

        function scanFrame() {
            if (isClosed) {
                return;
            }

            detector.detect(video)
                .then(function (codes) {
                    if (isClosed) {
                        return;
                    }

                    if (codes && codes.length > 0 && codes[0].rawValue) {
                        const decodedValue = String(codes[0].rawValue);
                        closeScanner();
                        submitPairRequest(decodedValue);
                        return;
                    }

                    rafId = requestAnimationFrame(scanFrame);
                })
                .catch(function () {
                    rafId = requestAnimationFrame(scanFrame);
                });
        }

        scanFrame();
    }).catch(function (error) {
        console.error("Unable to start QR scanner:", error);
        closeScanner();
        alert("Unable to access camera for QR scan.");
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

window.showQRFullscreen = showQRFullscreen;
