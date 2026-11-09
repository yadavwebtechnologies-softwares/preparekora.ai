// ═══════════════════════════════════════════════════════════
// PrepareKora — Global Frontend Script
// Shared utilities for all pages
// ═══════════════════════════════════════════════════════════

// ───────────────────────────────────────────────────────────
// CONFIG
// ───────────────────────────────────────────────────────────
const PK_CONFIG = {
  API_BASE: "https://preparekora-worker.yadavsubba2003.workers.dev",
  SESSION_KEY: "pk_session_data",
};

// Expose globally for page scripts
window.PK_CONFIG = PK_CONFIG;

// ───────────────────────────────────────────────────────────
// API HELPER — fetch with credentials + error handling
// ───────────────────────────────────────────────────────────
async function apiFetch(path, options = {}) {
  const url = path.startsWith("http") ? path : `${PK_CONFIG.API_BASE}${path}`;
  const opts = {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  };

  if (options.body && typeof options.body === "object") {
    opts.body = JSON.stringify(options.body);
  }

  try {
    const res = await fetch(url, opts);
    let data;
    try {
      data = await res.json();
    } catch {
      data = { ok: false, error: `HTTP ${res.status}` };
    }

    if (!res.ok) {
      const err = new Error(data.error || `Request failed (${res.status})`);
      err.status = res.status;
      err.code = data.code;
      err.data = data;
      throw err;
    }
    return data;
  } catch (err) {
    if (!err.status) {
      err.status = 0;
      err.message = err.message || "Network error. Please check your connection.";
    }
    throw err;
  }
}

// ───────────────────────────────────────────────────────────
// TOAST NOTIFICATIONS
// ───────────────────────────────────────────────────────────
function showToast(message, type = "info", duration = 3500) {
  let container = document.getElementById("toastContainer");
  if (!container) {
    container = document.createElement("div");
    container.id = "toastContainer";
    container.className = "toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(100%)";
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

window.showToast = showToast;

// ───────────────────────────────────────────────────────────
// LOADING STATE HELPERS (spec Part 7)
// ───────────────────────────────────────────────────────────
function setSectionLoading(el, loading) {
  if (!el) return;
  if (loading) {
    el.classList.add("loading");
    el.setAttribute("aria-busy", "true");
  } else {
    el.classList.remove("loading");
    el.setAttribute("aria-busy", "false");
  }
}

window.setSectionLoading = setSectionLoading;

// ───────────────────────────────────────────────────────────
// FORM VALIDATION
// ───────────────────────────────────────────────────────────
function setFieldError(input, message) {
  if (!input) return;
  input.classList.add("error");
  input.setAttribute("aria-invalid", "true");
  const errEl = input.parentElement.querySelector(".form-error");
  if (errEl) {
    errEl.textContent = message;
    errEl.classList.add("visible");
  }
}

function clearFieldError(input) {
  if (!input) return;
  input.classList.remove("error");
  input.removeAttribute("aria-invalid");
  const errEl = input.parentElement.querySelector(".form-error");
  if (errEl) {
    errEl.textContent = "";
    errEl.classList.remove("visible");
  }
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

function validatePassword(pw) {
  return typeof pw === "string" && pw.length >= 8 && pw.length <= 128;
}

window.setFieldError = setFieldError;
window.clearFieldError = clearFieldError;
window.validateEmail = validateEmail;
window.validatePassword = validatePassword;

// ───────────────────────────────────────────────────────────
// BUTTON LOADING STATE
// ───────────────────────────────────────────────────────────
function setButtonLoading(btn, loading, loadingText = "Please wait…") {
  if (!btn) return;
  if (loading) {
    btn.dataset.originalText = btn.textContent;
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner-inline"></span>${loadingText}`;
  } else {
    btn.disabled = false;
    btn.textContent = btn.dataset.originalText || "Submit";
  }
}

window.setButtonLoading = setButtonLoading;

// ───────────────────────────────────────────────────────────
// AUTH STATE
// ───────────────────────────────────────────────────────────
async function getCurrentUser() {
  try {
    const res = await apiFetch("/api/auth/me");
    return res.user;
  } catch (err) {
    if (err.status === 401) return null;
    throw err;
  }
}

function isLoggedIn() {
  return !!localStorage.getItem(PK_CONFIG.SESSION_KEY);
}

function saveSession(user) {
  localStorage.setItem(PK_CONFIG.SESSION_KEY, JSON.stringify({ user, at: Date.now() }));
}

function getSession() {
  try {
    return JSON.parse(localStorage.getItem(PK_CONFIG.SESSION_KEY) || "null");
  } catch {
    return null;
  }
}

function clearSession() {
  localStorage.removeItem(PK_CONFIG.SESSION_KEY);
}

window.getCurrentUser = getCurrentUser;
window.isLoggedIn = isLoggedIn;
window.saveSession = saveSession;
window.getSession = getSession;
window.clearSession = clearSession;

// ───────────────────────────────────────────────────────────
// MOBILE NAV TOGGLE
// ───────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.getElementById("navToggle");
  const menu = document.getElementById("navMobile");
  if (toggle && menu) {
    toggle.addEventListener("click", () => {
      toggle.classList.toggle("open");
      menu.classList.toggle("open");
    });
  }

  // Footer year
  const yearEl = document.getElementById("currentYear");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Restore user session on header if logged in
  const session = getSession();
  if (session && session.user) {
    updateHeaderForLoggedInUser(session.user);
  }
});

// ───────────────────────────────────────────────────────────
// UPDATE HEADER (if logged in)
// ───────────────────────────────────────────────────────────
function updateHeaderForLoggedInUser(user) {
  const navCta = document.querySelector(".nav-cta");
  const navMobile = document.getElementById("navMobile");
  if (navCta) {
    navCta.innerHTML = `
      <a href="dashboard.html">Dashboard</a>
      <a href="#" class="btn btn-outline btn-sm" onclick="handleGlobalLogout(event)">Logout</a>
    `;
  }
  if (navMobile) {
    const loginLink = navMobile.querySelector('a[href="login.html"]');
    const signupLink = navMobile.querySelector('a[href="signup.html"]');
    if (loginLink) loginLink.outerHTML = '<a href="dashboard.html">Dashboard</a>';
    if (signupLink) signupLink.outerHTML = '<a href="#" onclick="handleGlobalLogout(event)">Logout</a>';
  }
}

async function handleGlobalLogout(e) {
  if (e) e.preventDefault();
  try {
    await apiFetch("/api/auth/logout", { method: "POST" });
  } catch {}
  clearSession();
  showToast("Logged out successfully", "success");
  setTimeout(() => window.location.href = "index.html", 500);
}

window.handleGlobalLogout = handleGlobalLogout;
window.updateHeaderForLoggedInUser = updateHeaderForLoggedInUser;

// ───────────────────────────────────────────────────────────
// ESCAPE HTML (safe rendering)
// ───────────────────────────────────────────────────────────
function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

window.escapeHtml = escapeHtml;

// ───────────────────────────────────────────────────────────
// DEBOUNCE
// ───────────────────────────────────────────────────────────
function debounce(fn, delay = 300) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(this, args), delay);
  };
}

window.debounce = debounce;
