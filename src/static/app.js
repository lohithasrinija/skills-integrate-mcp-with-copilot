document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const authContainer = document.getElementById("auth-container");
  const activitiesContainer = document.getElementById("activities-container");
  const signupContainer = document.getElementById("signup-container");
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");
  const toggleAuthBtn = document.getElementById("toggle-auth-btn");
  const forgotPasswordBtn = document.getElementById("forgot-password-btn");
  const logoutBtn = document.getElementById("logout-btn");
  const userInfo = document.getElementById("user-info");
  const userNameSpan = document.getElementById("user-name");

  let currentUser = null;

  // Check login status on load
  async function checkLoginStatus() {
    try {
      const response = await fetch("/current_user");
      if (response.ok) {
        currentUser = await response.json();
        if (currentUser) {
          showLoggedIn();
          fetchActivities();
        } else {
          showAuth();
        }
      } else {
        showAuth();
      }
    } catch (error) {
      showAuth();
    }
  }

  function showAuth() {
    authContainer.style.display = "block";
    activitiesContainer.style.display = "none";
    signupContainer.style.display = "none";
    userInfo.style.display = "none";
  }

  function showLoggedIn() {
    authContainer.style.display = "none";
    activitiesContainer.style.display = "block";
    signupContainer.style.display = "block";
    userInfo.style.display = "block";
    userNameSpan.textContent = currentUser.name;
  }

  // Auth form handlers
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const sapId = document.getElementById("login-sap-id").value;
    const password = document.getElementById("login-password").value;

    try {
      const response = await fetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ sap_id: sapId, password: password })
      });
      const result = await response.json();
      if (response.ok) {
        currentUser = await (await fetch("/current_user")).json();
        showLoggedIn();
        fetchActivities();
        showMessage(result.message, "success");
      } else {
        showMessage(result.detail, "error");
      }
    } catch (error) {
      showMessage("Login failed", "error");
    }
  });

  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(registerForm);
    const data = Object.fromEntries(formData);

    try {
      const response = await fetch("/register", {
        method: "POST",
        body: new URLSearchParams(data)
      });
      const result = await response.json();
      if (response.ok) {
        showMessage(result.message, "success");
        toggleAuthForms();
      } else {
        showMessage(result.detail, "error");
      }
    } catch (error) {
      showMessage("Registration failed", "error");
    }
  });

  toggleAuthBtn.addEventListener("click", () => {
    const loginContainer = document.getElementById("login-form-container");
    const registerContainer = document.getElementById("register-form-container");
    if (loginContainer.style.display !== "none") {
      loginContainer.style.display = "none";
      registerContainer.style.display = "block";
      toggleAuthBtn.textContent = "Already have an account?";
    } else {
      loginContainer.style.display = "block";
      registerContainer.style.display = "none";
      toggleAuthBtn.textContent = "Need to Register?";
    }
  });

  forgotPasswordBtn.addEventListener("click", async () => {
    const sapId = document.getElementById("login-sap-id").value;
    if (!sapId) {
      showMessage("Please enter your SAP ID", "error");
      return;
    }
    try {
      const response = await fetch("/forgot_password", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ sap_id: sapId })
      });
      const result = await response.json();
      showMessage(result.message, "info");
    } catch (error) {
      showMessage("Failed to send reset", "error");
    }
  });

  logoutBtn.addEventListener("click", async () => {
    try {
      await fetch("/logout", { method: "POST" });
      currentUser = null;
      showAuth();
      showMessage("Logged out", "info");
    } catch (error) {
      showMessage("Logout failed", "error");
    }
  });

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML with delete icons instead of bullet points
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (sapId) =>
                      `<li><span class="participant-email">${sapId}</span><button class="delete-btn" data-activity="${name}" data-sap-id="${sapId}">❌</button></li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons
      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const sapId = button.getAttribute("data-sap-id");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/unregister`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to unregister. Please try again.", "error");
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to sign up. Please try again.", "error");
    }
  });

  // Utility functions
  function showMessage(message, type) {
    messageDiv.textContent = message;
    messageDiv.className = type;
    messageDiv.classList.remove("hidden");
    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  function toggleAuthForms() {
    const loginContainer = document.getElementById("login-form-container");
    const registerContainer = document.getElementById("register-form-container");
    loginContainer.style.display = "block";
    registerContainer.style.display = "none";
    toggleAuthBtn.textContent = "Need to Register?";
  }

  // Initialize app
  checkLoginStatus();
