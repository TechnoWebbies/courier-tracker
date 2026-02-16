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

// Init
initSettingsForm();
