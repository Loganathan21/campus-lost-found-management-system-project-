
const $ = (id) => document.getElementById(id);
const API_BASE_URL = (
  document.querySelector('meta[name="campusfind-api-url"]')?.content.trim() ||
  window.location.origin
).replace(/\/+$/, "");

const demoItems = [
  {
    id: "demo-1",
    name: "Wireless Headphones",
    category: "Electronics",
    status: "Lost",
    location: "Central Library",
    date: "2026-10-10",
    description: "Black over-ear headphones, possibly left near a study table.",
    email: "anto@gmail.com",
    image: "",
    emoji: "🎧"
  },
  {
    id: "demo-2",
    name: "Student ID Card",
    category: "Documents",
    status: "Found",
    location: "Main Canteen",
    date: "2026-10-11",
    description: "A student ID card was found near the entrance.",
    email: "karan@example.com",
    image: "",
    emoji: "🪪"
  },
  {
    id: "demo-3",
    name: "Blue Backpack",
    category: "Bags",
    status: "Found",
    location: "Computer Lab",
    date: "2026-10-12",
    description: "Blue backpack left beside the last row of computers.",
    email: "leka@example.com",
    image: "",
    emoji: "🎒"
  },
  {
    id: "demo-4",
    name: "House Keys",
    category: "Accessories",
    status: "Lost",
    location: "Sports Ground",
    date: "2026-10-09",
    description: "Small keyring with three keys.",
    email: "ajay@example.com",
    image: "",
    emoji: "🔑"
  },
  {
    id: "demo-5",
    name: "Scientific Calculator",
    category: "Electronics",
    status: "Recovered",
    location: "Engineering Block",
    date: "2026-10-08",
    description: "Scientific calculator returned to its owner.",
    email: "demo@example.com",
    image: "",
    emoji: "🧮"
  },
  {
    id: "demo-6",
    name: "Water Bottle",
    category: "Other",
    status: "Found",
    location: "Auditorium",
    date: "2026-10-12",
    description: "A reusable bottle was found after an event.",
    email: "demo@example.com",
    image: "",
    emoji: "🧴"
  }
];

let items = [...demoItems];
let authToken = sessionStorage.getItem("campusFindToken");
let currentUser = null;
let authMode = "login";

try {
  currentUser = JSON.parse(sessionStorage.getItem("campusFindUser") || "null");
} catch {
  sessionStorage.removeItem("campusFindUser");
}

async function apiRequest(url, { method = "GET", body, authenticated = false } = {}) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (authenticated && authToken) headers.Authorization = `Bearer ${authToken}`;

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${url}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body)
    });
  } catch {
    throw new Error("Cannot reach the CampusFind API. Make sure the backend is running and configured for this website.");
  }

  const responseText = await response.text();
  if (!responseText.trim()) {
    throw new Error("The CampusFind API returned an empty response. Check that the backend is running.");
  }

  let data;
  try {
    data = JSON.parse(responseText);
  } catch {
    if (response.status === 404) {
      throw new Error("CampusFind API returned 404. Deploy the backend and set the campusfind-api-url in index.html to its public URL.");
    }
    throw new Error("The CampusFind API returned an invalid response. The backend may not be deployed on this website.");
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("The CampusFind API returned an unexpected response format.");
  }

  if (!response.ok) {
    if (response.status === 401 && authenticated) {
      clearAuthentication();
      openAuthDialog();
    }
    throw new Error(data.message || `CampusFind API request failed (${response.status}).`);
  }
  return data;
}

function updateAuthUI() {
  const signedIn = Boolean(authToken && currentUser);
  $("signedInLabel").hidden = !signedIn;
  const role = currentUser?.role || "student";
  $("signedInLabel").textContent = signedIn
    ? `${currentUser.name || currentUser.email} · ${role[0].toUpperCase()}${role.slice(1)}`
    : "";
  $("authButton").hidden = signedIn;
  $("logoutButton").hidden = !signedIn;
  $("itemEmail").value = signedIn ? currentUser.email : "";
  $("itemEmail").placeholder = signedIn
    ? ""
    : "Sign in to use your account email";
}

function clearAuthentication() {
  authToken = null;
  currentUser = null;
  sessionStorage.removeItem("campusFindToken");
  sessionStorage.removeItem("campusFindUser");
  updateAuthUI();
}

function openAuthDialog() {
  if (!$("authDialog").open) $("authDialog").showModal();
}

function setAuthMessage(message, isError = false) {
  const element = $("authMessage");
  element.textContent = message;
  element.className = "form-message " + (isError ? "error" : "success");
}

function setAuthMode(mode) {
  authMode = mode;
  const registering = mode === "register";
  $("authTitle").textContent = registering
    ? "Create your account"
    : "Sign in to CampusFind";
  $("nameField").hidden = !registering;
  $("roleField").hidden = !registering;
  $("authName").required = registering;
  $("authPassword").autocomplete = registering
    ? "new-password"
    : "current-password";
  $("authSubmit").textContent = registering ? "Create account" : "Sign in";
  $("authSwitchPrompt").textContent = registering
    ? "Already have an account?"
    : "New to CampusFind?";
  $("authSwitch").textContent = registering ? "Sign in" : "Create an account";
  setAuthMessage("");
}

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function formatDate(date) {
  if (!date) return "Date unavailable";

  const parsed = new Date(date + "T00:00:00");
  if (Number.isNaN(parsed.getTime())) return "Date unavailable";

  return parsed.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function formatTime(time) {
  if (!time || !/^\d{2}:\d{2}$/.test(time)) return "Time not provided";

  const [hours, minutes] = time.split(":").map(Number);
  const parsed = new Date();
  parsed.setHours(hours, minutes, 0, 0);
  return parsed.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit"
  });
}

function itemEmoji(item) {
  if (item.image) return "";

  const icons = {
    Electronics: "🎧",
    Accessories: "🔑",
    Documents: "🪪",
    Bags: "🎒",
    Other: "📦"
  };

  return item.emoji || icons[item.category] || "📦";
}

function updateStats() {
  $("totalCount").textContent = items.length;
  $("foundCount").textContent =
    items.filter(item => item.status === "Found").length;
  $("lostCount").textContent =
    items.filter(item => item.status === "Lost").length;
  $("recoveredCount").textContent =
    items.filter(item => item.status === "Recovered").length;
}

function renderItems() {
  const query = $("searchInput").value.trim().toLowerCase();
  const category = $("categoryFilter").value;
  const status = $("statusFilter").value;

  const filtered = items.filter(item => {
    const searchable = [
      item.name,
      item.category,
      item.location,
      item.description
    ].join(" ").toLowerCase();

    const matchesSearch = searchable.includes(query);
    const matchesCategory =
      category === "All" || item.category === category;
    const matchesStatus =
      status === "All" || item.status === status;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  $("itemsGrid").innerHTML = filtered.map(item => {
    const badgeClass = item.status.toLowerCase();
    const art = item.image
      ? `<img src="${escapeHTML(item.image)}"
          alt="${escapeHTML(item.name)}"
          style="width:100%;height:100%;object-fit:cover"
          loading="lazy">`
      : `<span class="item-emoji">${itemEmoji(item)}</span>`;

    const contactButton = item.email && item.email !== "demo@example.com"
      ? `<button class="small-btn" type="button"
          data-contact="${escapeHTML(item.id)}">Contact reporter</button>`
      : "";

    const recoverButton = item.status !== "Recovered" &&
      !String(item.id).startsWith("demo-")
      ? `<button class="small-btn"
          data-recover="${escapeHTML(item.id)}">Mark recovered</button>`
      : "";

    return `
      <article class="item-card" data-item="${escapeHTML(item.id)}">
        <div class="item-art">${art}</div>
        <div class="item-content">
          <div class="item-top">
            <span class="status-pill ${badgeClass}">
              ${escapeHTML(item.status)}
            </span>
            <span class="category-label">
              ${escapeHTML(item.category)}
            </span>
          </div>
          <h3>${escapeHTML(item.name)}</h3>
          <p class="item-description">
            ${escapeHTML(item.description)}
          </p>
          <div class="item-meta">
            <span>⌖ ${escapeHTML(item.location)}</span>
            <span>${formatDate(item.date)}</span>
          </div>
          <div class="item-contact">
            <button class="small-btn" type="button"
              data-details="${escapeHTML(item.id)}">View details</button>
            ${contactButton}
            ${recoverButton}
          </div>
        </div>
      </article>
    `;
  }).join("");

  $("emptyState").hidden = filtered.length !== 0;
  updateStats();
}

function showItemDetails(item, showContact = false) {
  const statusDescription = {
    Lost: "Still missing",
    Found: "Found and waiting to be claimed",
    Recovered: "Returned to its owner"
  }[item.status] || "Status unavailable";
  const imageMarkup = item.image
    ? `<img class="detail-img" src="${escapeHTML(item.image)}" alt="${escapeHTML(item.name)}">`
    : "";
  const contactMarkup = item.email && item.email !== "demo@example.com"
    ? showContact
      ? `<div class="reporter-contact">
          <p>Reporter contact</p>
          <a href="mailto:${encodeURIComponent(item.email)}?subject=${encodeURIComponent("CampusFind: " + item.name)}">${escapeHTML(item.email)}</a>
        </div>`
      : `<a class="small-btn" href="mailto:${encodeURIComponent(item.email)}?subject=${encodeURIComponent("CampusFind: " + item.name)}">Email reporter</a>`
    : "";

  $("itemDialogContent").innerHTML = `
    ${imageMarkup}
    <span class="status-pill ${escapeHTML(item.status.toLowerCase())}">
      ${escapeHTML(item.status)}
    </span>
    <h2 id="detailName">${escapeHTML(item.name)}</h2>
    <p class="detail-status">${escapeHTML(statusDescription)}</p>
    <dl class="detail-list">
      <dt>Category</dt><dd>${escapeHTML(item.category)}</dd>
      <dt>Location</dt><dd>${escapeHTML(item.location)}</dd>
      <dt>Date</dt><dd>${formatDate(item.date)}</dd>
      <dt>Approximate time</dt><dd>${formatTime(item.time)}</dd>
      <dt>Description</dt><dd>${escapeHTML(item.description)}</dd>
    </dl>
    ${contactMarkup}
  `;

  $("itemDialog").showModal();
}

function showMessage(message, isError = false) {
  const el = $("formMessage");
  el.textContent = message;
  el.className = "form-message " + (isError ? "error" : "success");
}

function readImage(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve("");

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      return reject(new Error("Use a JPG, PNG, or WebP image."));
    }

    if (file.size > 1024 * 1024) {
      return reject(new Error("Image must be 1 MB or smaller."));
    }

    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read the image."));
    reader.readAsDataURL(file);
  });
}

$("reportForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  if (!authToken || !currentUser) {
    showMessage("Sign in before submitting a report.", true);
    openAuthDialog();
    return;
  }

  const submitButton = form.querySelector('button[type="submit"]');
  const originalText = submitButton.textContent;

  submitButton.disabled = true;
  submitButton.textContent = "Submitting...";

  try {
    const imageFile = $("itemImage").files[0];
    const image = await readImage(imageFile);

    const newItem = {
      name: $("itemName").value.trim(),
      category: $("itemCategory").value,
      status: $("itemStatus").value,
      location: $("itemLocation").value.trim(),
      date: $("itemDate").value,
      time: $("itemTime").value,
      description: $("itemDescription").value.trim(),
      email: currentUser.email,
      image
    };

    if (newItem.date > new Date().toLocaleDateString("en-CA")) {
      throw new Error("Please select today or an earlier date.");
    }

    const result = await apiRequest("/api/reports", {
      method: "POST",
      body: newItem,
      authenticated: true
    });
    items.unshift(result.report);

    renderItems();
    form.reset();
    $("itemDate").value = new Date().toLocaleDateString("en-CA");
    updateAuthUI();

    showMessage("Report submitted successfully!");
    $("items").scrollIntoView({ behavior: "smooth" });
  } catch (error) {
    showMessage(error.message || "Unable to submit this report.", true);
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = originalText;
  }
});

["searchInput", "categoryFilter", "statusFilter"].forEach(id => {
  $(id).addEventListener("input", renderItems);
  $(id).addEventListener("change", renderItems);
});

$("itemsGrid").addEventListener("click", async (event) => {
  const contactButton = event.target.closest("[data-contact]");
  if (contactButton) {
    const item = items.find(entry => entry.id === contactButton.dataset.contact);
    if (item) showItemDetails(item, true);
    return;
  }

  const detailsButton = event.target.closest("[data-details]");
  if (detailsButton) {
    const item = items.find(entry => entry.id === detailsButton.dataset.details);
    if (item) showItemDetails(item);
    return;
  }

  const button = event.target.closest("[data-recover]");
  if (!button) return;

  if (!authToken || !currentUser) {
    openAuthDialog();
    return;
  }

  const item = items.find(
    entry => entry.id === button.dataset.recover
  );

  if (!item) return;

  button.disabled = true;
  try {
    await apiRequest(`/api/reports/${encodeURIComponent(item.id)}/status`, {
      method: "PATCH",
      body: { status: "Recovered" },
      authenticated: true
    });
    item.status = "Recovered";
    renderItems();
  } catch (error) {
    showMessage(error.message || "Unable to update this report.", true);
  } finally {
    button.disabled = false;
  }
});

$("authButton").addEventListener("click", () => {
  setAuthMode("login");
  openAuthDialog();
});

$("logoutButton").addEventListener("click", clearAuthentication);

$("authSwitch").addEventListener("click", () => {
  setAuthMode(authMode === "login" ? "register" : "login");
});

$("authForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = $("authSubmit");
  button.disabled = true;
  setAuthMessage("");

  try {
    const registering = authMode === "register";
    const result = await apiRequest(
      registering ? "/api/auth/register" : "/api/auth/login",
      {
        method: "POST",
        body: {
          name: $("authName").value.trim(),
          email: $("authEmail").value.trim(),
          password: $("authPassword").value,
          role: $("authRole").value
        }
      }
    );

    if (registering) {
      $("authPassword").value = "";
      setAuthMode("login");
      setAuthMessage(result.message);
      $("authEmail").focus();
      return;
    }

    authToken = result.token;
    currentUser = result.user;
    sessionStorage.setItem("campusFindToken", authToken);
    sessionStorage.setItem("campusFindUser", JSON.stringify(currentUser));
    updateAuthUI();
    $("authPassword").value = "";
    $("authDialog").close();
    showMessage(`Signed in as ${currentUser.email}.`);
  } catch (error) {
    setAuthMessage(error.message || "Unable to authenticate.", true);
  } finally {
    button.disabled = false;
  }
});

$("closeAuthDialog").addEventListener("click", () => {
  $("authDialog").close();
});

$("authDialog").addEventListener("click", (event) => {
  if (event.target === $("authDialog")) $("authDialog").close();
});

async function loadSharedReports() {
  try {
    const result = await apiRequest("/api/reports");
    if (!Array.isArray(result.reports)) {
      throw new Error("The backend returned an invalid reports response.");
    }
    items = [...result.reports, ...demoItems];
    $("backendStatus").textContent = "Connected to the shared MySQL database.";
    $("backendStatus").classList.remove("error");
    renderItems();
  } catch (error) {
    $("backendStatus").textContent =
      `Shared reports unavailable: ${error.message} Start the backend and check MySQL settings.`;
    $("backendStatus").classList.add("error");
  }
}

$("closeItemDialog").addEventListener("click", () => {
  $("itemDialog").close();
});

$("itemDialog").addEventListener("click", (event) => {
  if (event.target === $("itemDialog")) $("itemDialog").close();
});

$("itemDate").max = new Date().toLocaleDateString("en-CA");
$("itemDate").value = $("itemDate").max;
updateAuthUI();
renderItems();
loadSharedReports();

// Optional mouse-based 3D tilt on devices with a fine pointer.
const visual = $("heroVisual");

if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
  visual.addEventListener("pointermove", event => {
    const rect = visual.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;

    visual.style.transform =
      `rotateX(${-y * 5}deg) rotateY(${x * 5}deg)`;
  });

  visual.addEventListener("pointerleave", () => {
    visual.style.transform = "";
  });
}
