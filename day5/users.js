// Elements
const loadBtn = document.getElementById("load-users");
const filterInput = document.getElementById("filter-input");
const statusEl = document.getElementById("status");
const usersList = document.getElementById("users-list");

// State
let users = [];

/**
 * Render a list of users to the DOM using createElement and textContent.
 * @param {Array} list - List of user objects to render.
 */
function renderUsers(list) {
  usersList.textContent = "";

  if (!list || list.length === 0) {
    const emptyLi = document.createElement("li");
    emptyLi.className = "empty-message";
    emptyLi.textContent = "No users match your filter.";
    usersList.appendChild(emptyLi);
    return;
  }

  list.forEach((user) => {
    const li = document.createElement("li");
    li.className = "user-item";

    const headerDiv = document.createElement("div");
    headerDiv.className = "user-header";

    const nameEl = document.createElement("h2");
    nameEl.className = "user-name";
    nameEl.textContent = user.name || "Unknown User";

    const emailEl = document.createElement("span");
    emailEl.className = "user-email";
    emailEl.textContent = user.email || "No email";

    headerDiv.appendChild(nameEl);
    headerDiv.appendChild(emailEl);

    const detailsDiv = document.createElement("div");
    detailsDiv.className = "user-details";

    const cityEl = document.createElement("span");
    cityEl.className = "user-city";
    const cityName = (user.address && user.address.city) ? user.address.city : "Unknown city";
    cityEl.textContent = `City: ${cityName}`;

    const companyEl = document.createElement("span");
    companyEl.className = "user-company";
    const companyName = (user.company && user.company.name) ? user.company.name : "Unknown company";
    companyEl.textContent = `Company: ${companyName}`;

    detailsDiv.appendChild(cityEl);
    detailsDiv.appendChild(companyEl);

    li.appendChild(headerDiv);
    li.appendChild(detailsDiv);

    usersList.appendChild(li);
  });
}

/**
 * Fetch users from JSONPlaceholder API and render them.
 */
async function loadUsers() {
  loadBtn.disabled = true;
  statusEl.className = "loading";
  statusEl.textContent = "Loading users...";

  try {
    const response = await fetch("https://jsonplaceholder.typicode.com/users");
    if (!response.ok) {
      throw new Error(`Failed to fetch users: HTTP ${response.status}`);
    }

    const data = await response.json();
    users = data;

    statusEl.className = "success";
    statusEl.textContent = `Successfully loaded ${users.length} users.`;

    // Filter current list if user already typed something into filter input
    const searchTerm = filterInput.value.trim().toLowerCase();
    if (searchTerm) {
      const filtered = users.filter((u) =>
        (u.name || "").toLowerCase().includes(searchTerm)
      );
      renderUsers(filtered);
    } else {
      renderUsers(users);
    }
  } catch (error) {
    statusEl.className = "error";
    statusEl.textContent = `Error: ${error.message}`;
    usersList.textContent = "";
  } finally {
    loadBtn.disabled = false;
  }
}

/**
 * Debounce helper function to delay function execution until a pause in invocations.
 * @param {Function} func - The function to debounce.
 * @param {number} delay - The delay in milliseconds.
 * @returns {Function} Debounced function.
 */
function debounce(func, delay = 250) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}

// Event Listeners
loadBtn.addEventListener("click", loadUsers);

filterInput.addEventListener(
  "input",
  debounce((event) => {
    const searchTerm = event.target.value.trim().toLowerCase();
    if (!users || users.length === 0) {
      return;
    }

    const filtered = users.filter((user) =>
      (user.name || "").toLowerCase().includes(searchTerm)
    );

    renderUsers(filtered);
  }, 250)
);
