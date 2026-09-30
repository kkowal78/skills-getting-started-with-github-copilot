document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  function createParticipantItem(participant, activityName) {
    const listItem = document.createElement("li");
    listItem.className = "participant-item";

    const participantName = document.createElement("span");
    participantName.textContent = participant;
    listItem.appendChild(participantName);

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "remove-participant";
    removeButton.setAttribute("aria-label", `Remove ${participant} from ${activityName}`);
    removeButton.title = "Unregister participant";
    removeButton.dataset.activity = activityName;
    removeButton.dataset.email = participant;
    removeButton.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M4 7h16M10 11v6m4-6v6M5 7l1 14h12l1-14M9 7V4h6v3" />
      </svg>
    `;
    listItem.appendChild(removeButton);

    return listItem;
  }

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
        activityCard.dataset.maxParticipants = details.max_participants;
        activityCard.dataset.activityName = name;

        const spotsLeft = details.max_participants - details.participants.length;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> <span class="spots-left">${spotsLeft}</span> spots left</p>
          <div class="participants">
            <h5>Participants (${details.participants.length})</h5>
            <ul class="participant-list" aria-live="polite"></ul>
          </div>
        `;

        const participantList = activityCard.querySelector(".participant-list");
        details.participants.forEach((participant) => {
          participantList.appendChild(createParticipantItem(participant, name));
        });

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  activitiesList.addEventListener("click", async (event) => {
    const removeButton = event.target.closest(".remove-participant");
    if (!removeButton) return;

    removeButton.disabled = true;
    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(removeButton.dataset.activity)}/participants?email=${encodeURIComponent(removeButton.dataset.email)}`,
        { method: "DELETE" }
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || "An error occurred while unregistering");
      }

      const activityCard = removeButton.closest(".activity-card");
      const participantList = activityCard.querySelector(".participant-list");
      removeButton.closest(".participant-item").remove();
      activityCard.querySelector(".participants h5").textContent =
        `Participants (${participantList.children.length})`;
      activityCard.querySelector(".spots-left").textContent =
        activityCard.dataset.maxParticipants - participantList.children.length;
    } catch (error) {
      removeButton.disabled = false;
      messageDiv.textContent = error.message || "Failed to unregister participant. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
    }
  });

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        const activityCard = Array.from(activitiesList.querySelectorAll(".activity-card"))
          .find((card) => card.dataset.activityName === activity);

        if (activityCard) {
          const participantList = activityCard.querySelector(".participant-list");
          participantList.appendChild(createParticipantItem(email, activity));
          activityCard.querySelector(".participants h5").textContent =
            `Participants (${participantList.children.length})`;
          activityCard.querySelector(".spots-left").textContent =
            activityCard.dataset.maxParticipants - participantList.children.length;
        }

        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
