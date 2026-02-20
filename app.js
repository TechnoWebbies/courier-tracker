// Simple localStorage keys
const STORAGE_KEY_SHIFTS = "courier_shifts";
const STORAGE_KEY_SETTINGS = "courier_settings";

const defaultSettings = {
  fuelCostPerKm: 0.15
};

function loadSettings() {
  const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
  if (!raw) return { ...defaultSettings };
  try {
    return { ...defaultSettings, ...JSON.parse(raw) };
  } catch {
    return { ...defaultSettings };
  }
}

function saveSettings(settings) {
  localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
}

function loadShifts() {
  const raw = localStorage.getItem(STORAGE_KEY_SHIFTS);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function renderHistory() {
  const shifts = loadShifts().sort((a, b) => b.id - a.id);
  if (!shifts.length) {
    historyEmpty.classList.remove("hidden");
    historyTable.classList.add("hidden");
    return;
  }

  historyEmpty.classList.add("hidden");
  historyTable.classList.remove("hidden");

  historyBody.innerHTML = "";
  shifts.forEach((s) => {
    const tr = document.createElement("tr");
    tr.dataset.id = s.id; // store ID on row
    const timeStr = `${s.startTime}–${s.endTime}`;
    tr.innerHTML = `
      <td>${s.date}</td>
      <td>${timeStr}</td>
      <td>${s.orders}</td>
      <td>${formatMoney(s.net)}</td>
      <td>${formatMoney(s.hourly)}</td>
    `;
    tr.addEventListener("click", () => openEditModal(s.id));
    historyBody.appendChild(tr);
  });
}


function saveShifts(shifts) {
  localStorage.setItem(STORAGE_KEY_SHIFTS, JSON.stringify(shifts));
}

// Helpers
function toHours(startTime, endTime) {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  const start = sh * 60 + sm;
  const end = eh * 60 + em;
  let diff = end - start;
  if (diff <= 0) diff += 24 * 60; // allow crossing midnight
  return diff / 60;
}

function formatMoney(value) {
  return value.toFixed(2) + " €";
}

// Tabs
const tabButtons = document.querySelectorAll(".tab-button");
const tabs = document.querySelectorAll(".tab");

tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.tab;
    tabButtons.forEach((b) => b.classList.remove("active"));
    tabs.forEach((t) => t.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(target).classList.add("active");
    if (target === "history") renderHistory();
    if (target === "stats") renderStats();
    if (target === "settings") initSettingsForm();
  });
});

// Init date to today
const dateInput = document.getElementById("date");
dateInput.value = new Date().toISOString().slice(0, 10);

// Settings form
const settingsForm = document.getElementById("settings-form");
const fuelCostInput = document.getElementById("fuelCost");

function initSettingsForm() {
  const settings = loadSettings();
  fuelCostInput.value = settings.fuelCostPerKm.toString();
}

settingsForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const fuelCost = parseFloat(fuelCostInput.value || "0");
  const settings = { fuelCostPerKm: isNaN(fuelCost) ? 0 : fuelCost };
  saveSettings(settings);
  alert("Settings saved");
});

// Shift form
const shiftForm = document.getElementById("shift-form");
const resCard = document.getElementById("shift-result");
const resHours = document.getElementById("res-hours");
const resCosts = document.getElementById("res-costs");
const resNet = document.getElementById("res-net");
const resHourly = document.getElementById("res-hourly");

shiftForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const settings = loadSettings();

  const date = document.getElementById("date").value;
  const startTime = document.getElementById("startTime").value;
  const endTime = document.getElementById("endTime").value;
  const orders = parseInt(document.getElementById("orders").value || "0", 10);
  const earnings = parseFloat(document.getElementById("earnings").value || "0");
  const distance = parseFloat(document.getElementById("distance").value || "0");
  const parking = parseFloat(document.getElementById("parking").value || "0");

  if (!date || !startTime || !endTime) {
    alert("Please fill date and times");
    return;
  }

  const hours = toHours(startTime, endTime);
  const totalCosts = distance * settings.fuelCostPerKm + parking;
  const net = earnings - totalCosts;
  const hourly = hours > 0 ? net / hours : 0;

  const shift = {
    id: Date.now(),
    date,
    startTime,
    endTime,
    orders,
    earnings,
    distance,
    parking,
    hours,
    totalCosts,
    net,
    hourly
  };

  const shifts = loadShifts();
  shifts.push(shift);
  saveShifts(shifts);

  resHours.textContent = hours.toFixed(2) + " h";
  resCosts.textContent = formatMoney(totalCosts);
  resNet.textContent = formatMoney(net);
  resHourly.textContent = formatMoney(hourly);
  resCard.classList.remove("hidden");

  shiftForm.reset();
  dateInput.value = date;
});

// History
const historyEmpty = document.getElementById("history-empty");
const historyTable = document.getElementById("history-table");
const historyBody = document.getElementById("history-body");

// Edit shift
const editModal = document.getElementById("edit-modal");
const editForm = document.getElementById("edit-form");
const editIdInput = document.getElementById("edit-id");
const editDate = document.getElementById("edit-date");
const editStartTime = document.getElementById("edit-startTime");
const editEndTime = document.getElementById("edit-endTime");
const editOrders = document.getElementById("edit-orders");
const editEarnings = document.getElementById("edit-earnings");
const editDistance = document.getElementById("edit-distance");
const editParking = document.getElementById("edit-parking");
const editCancel = document.getElementById("edit-cancel");

function openEditModal(id) {
  const shifts = loadShifts();
  const shift = shifts.find((s) => s.id === id || s.id === Number(id));
  if (!shift) return;

  editIdInput.value = shift.id;
  editDate.value = shift.date;
  editStartTime.value = shift.startTime;
  editEndTime.value = shift.endTime;
  editOrders.value = shift.orders;
  editEarnings.value = shift.earnings;
  editDistance.value = shift.distance;
  editParking.value = shift.parking;

  editModal.classList.remove("hidden");
}

editCancel.addEventListener("click", () => {
  editModal.classList.add("hidden");
});

editForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const settings = loadSettings();
  const id = Number(editIdInput.value);

  const date = editDate.value;
  const startTime = editStartTime.value;
  const endTime = editEndTime.value;
  const orders = parseInt(editOrders.value || "0", 10);
  const earnings = parseFloat(editEarnings.value || "0");
  const distance = parseFloat(editDistance.value || "0");
  const parking = parseFloat(editParking.value || "0");

  if (!date || !startTime || !endTime) {
    alert("Please fill date and times");
    return;
  }

  const hours = toHours(startTime, endTime);
  const totalCosts = distance * settings.fuelCostPerKm + parking;
  const net = earnings - totalCosts;
  const hourly = hours > 0 ? net / hours : 0;

  const shifts = loadShifts();
  const index = shifts.findIndex((s) => s.id === id);
  if (index === -1) {
    alert("Shift not found");
    return;
  }

  shifts[index] = {
    ...shifts[index],
    date,
    startTime,
    endTime,
    orders,
    earnings,
    distance,
    parking,
    hours,
    totalCosts,
    net,
    hourly
  };

  saveShifts(shifts);
  editModal.classList.add("hidden");
  renderHistory();
  renderStats();
});

function renderHistory() {
  const shifts = loadShifts().sort((a, b) => b.id - a.id);
  if (!shifts.length) {
    historyEmpty.classList.remove("hidden");
    historyTable.classList.add("hidden");
    return;
  }

  historyEmpty.classList.add("hidden");
  historyTable.classList.remove("hidden");

  historyBody.innerHTML = "";
  shifts.forEach((s) => {
    const tr = document.createElement("tr");
    const timeStr = `${s.startTime}–${s.endTime}`;
    tr.innerHTML = `
      <td>${s.date}</td>
      <td>${timeStr}</td>
      <td>${s.orders}</td>
      <td>${formatMoney(s.net)}</td>
      <td>${formatMoney(s.hourly)}</td>
    `;
    historyBody.appendChild(tr);
  });
}

// Stats (current ISO week)
const statsWeek = document.getElementById("stats-week");
const statsHours = document.getElementById("stats-hours");
const statsOrders = document.getElementById("stats-orders");
const statsNet = document.getElementById("stats-net");
const statsHourly = document.getElementById("stats-hourly");

function getIsoWeek(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return (
    1 +
    Math.round(
      ((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) /
        7
    )
  );
}

function renderStats() {
  const shifts = loadShifts();
  if (!shifts.length) {
    statsWeek.textContent = "-";
    statsHours.textContent = "0 h";
    statsOrders.textContent = "0";
    statsNet.textContent = formatMoney(0);
    statsHourly.textContent = formatMoney(0);
    return;
  }

  const today = new Date().toISOString().slice(0, 10);
  const currentWeek = getIsoWeek(today);

  let hours = 0;
  let orders = 0;
  let net = 0;

  shifts.forEach((s) => {
    if (getIsoWeek(s.date) === currentWeek) {
      hours += s.hours;
      orders += s.orders;
      net += s.net;
    }
  });

  const hourly = hours > 0 ? net / hours : 0;

  statsWeek.textContent = currentWeek.toString();
  statsHours.textContent = hours.toFixed(2) + " h";
  statsOrders.textContent = orders.toString();
  statsNet.textContent = formatMoney(net);
  statsHourly.textContent = formatMoney(hourly);
}

function downloadJSON(data, filename) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const exportBtn = document.getElementById("exportJson");
if (exportBtn) {
  exportBtn.addEventListener("click", () => {
    const shifts = loadShifts();
    const settings = loadSettings();
    const backup = { shifts, settings, createdAt: new Date().toISOString() };
    downloadJSON(backup, "courier-tracker-backup.json");
  });
}

const importInput = document.getElementById("importJson");
if (importInput) {
  importInput.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const data = JSON.parse(e.target.result);
        if (!data || !Array.isArray(data.shifts) || !data.settings) {
          alert("Invalid backup file");
          return;
        }
        saveShifts(data.shifts);
        saveSettings(data.settings);
        alert("Backup restored. History and stats will use the new data.");
        initSettingsForm();
      } catch (err) {
        console.error(err);
        alert("Could not read backup file");
      }
    };
    reader.readAsText(file);
  });
}



// Init
initSettingsForm();


