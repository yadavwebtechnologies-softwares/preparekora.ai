"use strict";

(function () {

  const API_BASE = (function () {
    const host = window.location.hostname;
    const isLocal = host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0" || host === "" || host.endsWith(".local");
    return isLocal ? "http://localhost:8787/api" : "https://preparekora-api.yadavsubba2003.workers.dev/api";
  })();

  const TOKEN_KEY = "pk_admin_id_token";
  const REFRESH_KEY = "pk_admin_refresh_token";
  const EXPIRES_KEY = "pk_admin_expires_at";
  const INACTIVITY_MS = 10 * 60 * 1000;
  const MAX_IMAGE_CHARS = 700000;

  /* ---------- Inline CSS ---------- */

  if (!document.getElementById("analysis-styles")) {
    const style = document.createElement("style");
    style.id = "analysis-styles";
    style.textContent =
      ".qcard{padding:16px;border:1px solid var(--border);border-radius:var(--radius);background:#fff;margin-bottom:10px;}" +
      ".qcard.is-hero{padding:22px;border-width:2px;border-color:var(--accent);}" +
      ".qhead{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px;flex-wrap:wrap;}" +
      ".qhead-left{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}" +
      ".qnum{font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);}" +
      ".qbadge{display:inline-flex;align-items:center;gap:6px;padding:3px 9px;border:1px solid var(--border);border-radius:999px;font-size:11px;font-weight:500;}" +
      ".qbadge.is-hot{background:var(--accent);border-color:var(--accent);color:#fff;}" +
      ".qbadge.level-easy{background:#f0fdf4;border-color:#15803d;color:#15803d;}" +
      ".qbadge.level-medium{background:#fef3c7;border-color:#b45309;color:#b45309;}" +
      ".qbadge.level-hard{background:#fef2f2;border-color:#b91c1c;color:#b91c1c;}" +
      ".qbadge.is-toughest{background:var(--accent);border-color:var(--accent);color:#fff;font-weight:700;letter-spacing:.04em;text-transform:uppercase;}" +
      ".qtext{margin:0 0 12px;font-size:14px;font-weight:600;line-height:1.5;overflow-wrap:anywhere;}" +
      ".qcard.is-hero .qtext{font-size:16px;}" +
      ".optrow{display:flex;align-items:center;gap:10px;padding:8px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px;margin-bottom:6px;background:#fff;}" +
      ".optrow.is-correct{border-color:#15803d;background:#f0fdf4;}" +
      ".optrow.is-correct .optkey{background:#15803d;border-color:#15803d;color:#fff;}" +
      ".optrow.is-correct .opttext{color:#14532d;font-weight:500;}" +
      ".optrow.has-wrong{border-color:#b91c1c;background:#fef2f2;}" +
      ".optrow.has-wrong .optkey{background:#b91c1c;border-color:#b91c1c;color:#fff;}" +
      ".optrow.is-trap{border-color:#b91c1c;background:#fef2f2;border-width:2px;}" +
      ".optkey{display:grid;place-items:center;width:20px;height:20px;flex-shrink:0;border:1px solid var(--border);border-radius:50%;background:#fff;color:var(--muted);font-size:10px;font-weight:600;}" +
      ".opttext{flex:1;overflow-wrap:anywhere;}" +
      ".optcount{flex-shrink:0;padding:2px 8px;border:1px solid var(--border);border-radius:999px;background:#fff;color:var(--muted);font-size:11px;font-weight:600;}" +
      ".optrow.is-correct .optcount{background:#15803d;border-color:#15803d;color:#fff;}" +
      ".optrow.has-wrong .optcount{background:#b91c1c;border-color:#b91c1c;color:#fff;}" +
      ".trap-tag{flex-shrink:0;padding:2px 8px;border:1px solid #b91c1c;border-radius:999px;background:#b91c1c;color:#fff;font-size:10px;font-weight:600;letter-spacing:.02em;}" +
      ".qfoot{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:10px;padding-top:10px;border-top:1px solid var(--border);flex-wrap:wrap;}" +
      ".qfoot-meta{color:var(--muted);font-size:12px;}" +
      ".qfoot-meta strong{color:var(--text);font-weight:600;}" +
      ".qfoot-actions{display:flex;gap:6px;flex-wrap:wrap;}" +
      ".hero-banner{display:flex;align-items:center;gap:12px;padding:12px 16px;margin-bottom:14px;border:1px solid var(--border);border-radius:var(--radius);background:var(--surface);}" +
      ".hero-banner-icon{display:grid;place-items:center;width:32px;height:32px;flex-shrink:0;border-radius:50%;background:var(--accent);color:#fff;}" +
      ".hero-banner-icon svg{width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;}" +
      ".hero-banner-text{flex:1;min-width:0;}" +
      ".hero-banner-text strong{display:block;font-size:13px;font-weight:600;}" +
      ".hero-banner-text span{display:block;margin-top:2px;color:var(--muted);font-size:11px;}" +
      ".hero-banner-pct{flex-shrink:0;font-size:24px;font-weight:700;letter-spacing:-.6px;font-variant-numeric:tabular-nums;}" +
      ".hero-banner-pct small{color:var(--muted);font-size:11px;font-weight:500;margin-left:2px;}" +
      ".future-note{margin-top:20px;padding:16px 18px;border:1px dashed var(--border);border-radius:var(--radius);background:var(--surface);text-align:center;}" +
      ".future-note p{margin:0;color:var(--muted);font-size:12px;line-height:1.6;}" +
      ".future-note strong{color:var(--text);font-weight:600;}" +
      ".analysis-user-row{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border);font-size:13px;}" +
      ".analysis-user-row:last-child{border-bottom:0;}" +
      ".analysis-user-name{flex:1;font-weight:600;overflow-wrap:anywhere;}" +
      ".analysis-user-choice{flex-shrink:0;padding:3px 9px;border:1px solid #b91c1c;border-radius:999px;background:#fef2f2;color:#b91c1c;font-size:11px;font-weight:600;}" +
      ".share-preview{padding:18px;background:var(--surface);border-radius:var(--radius);display:flex;align-items:center;justify-content:center;}" +
      ".share-preview canvas{max-width:100%;height:auto;border:1px solid var(--border);border-radius:8px;background:#fff;box-shadow:0 4px 20px rgba(0,0,0,.08);}" +
      ".share-actions{display:flex;gap:8px;margin-top:14px;flex-wrap:wrap;}" +
      ".share-actions .btn{flex:1;min-width:120px;}" +
      ".editor-fields{margin-top:12px;padding:12px;border:1px dashed var(--border);border-radius:6px;background:var(--surface);}" +
      ".editor-fields-label{display:block;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);margin-bottom:8px;}" +
      ".editor-row{display:flex;gap:8px;align-items:center;margin-bottom:8px;flex-wrap:wrap;}" +
      ".editor-row label{font-size:12px;font-weight:600;color:var(--text);min-width:100px;}" +
      ".editor-row input[type=text],.editor-row input[type=number]{flex:1;min-width:100px;padding:6px 8px;border:1px solid var(--border);border-radius:4px;background:#fff;font-size:12px;}" +
      ".editor-type-select{width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:6px;background:#fff;font-size:13px;font-weight:600;cursor:pointer;}" +
      ".editor-img-preview{max-width:120px;max-height:100px;border-radius:4px;border:1px solid var(--border);margin-top:6px;display:block;}" +
      ".editor-img-actions{display:flex;gap:6px;margin-top:6px;}" +
      "@media (max-width:560px){" +
        ".qcard.is-hero .qtext{font-size:14px;}" +
        ".optrow{font-size:12px;padding:7px 9px;}" +
        ".share-actions .btn{min-width:100%;}" +
        ".editor-row label{min-width:100%;}" +
      "}";
    document.head.appendChild(style);
  }

  if (!document.getElementById("active-live-styles")) {
    const style = document.createElement("style");
    style.id = "active-live-styles";
    style.textContent =
      "#activeMeta{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:500;color:var(--muted);}" +
      "#activeMeta.is-live{color:#dc2626;}" +
      "#activeMeta .active-dot{width:7px;height:7px;border-radius:50%;background:var(--muted);flex-shrink:0;display:none;}" +
      "#activeMeta.is-live .active-dot{display:inline-block;background:#dc2626;animation:pk-live-pulse 1.5s ease-in-out infinite;}" +
      "@keyframes pk-live-pulse{0%,100%{opacity:1;transform:scale(1);}50%{opacity:.35;transform:scale(1.4);}}";
    document.head.appendChild(style);
  }

  function storeTokens(idToken, refreshToken, expiresIn) {
    try {
      if (idToken) localStorage.setItem(TOKEN_KEY, idToken);
      if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
      if (expiresIn) localStorage.setItem(EXPIRES_KEY, String(Date.now() + Number(expiresIn) * 1000));
    } catch (e) {}
  }
  function getIdToken() { try { return localStorage.getItem(TOKEN_KEY) || ""; } catch (e) { return ""; } }
  function getRefreshToken() { try { return localStorage.getItem(REFRESH_KEY) || ""; } catch (e) { return ""; } }
  function getExpiresAt() { try { return parseInt(localStorage.getItem(EXPIRES_KEY) || "0", 10) || 0; } catch (e) { return 0; } }
  function clearTokens() {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_KEY);
      localStorage.removeItem(EXPIRES_KEY);
    } catch (e) {}
  }

  let refreshingPromise = null;
  async function refreshTokens() {
    if (refreshingPromise) return refreshingPromise;
    refreshingPromise = (async function () {
      const rt = getRefreshToken();
      if (!rt) throw new Error("No refresh token");
      const res = await fetch(API_BASE + "/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: rt })
      });
      if (!res.ok) { clearTokens(); throw new Error("Session expired"); }
      const data = await res.json();
      storeTokens(data.idToken, data.refreshToken, data.expiresIn);
      return data.idToken;
    })();
    try { return await refreshingPromise; } finally { refreshingPromise = null; }
  }

  async function ensureFreshToken() {
    const token = getIdToken();
    const expiresAt = getExpiresAt();
    if (token && expiresAt && expiresAt - Date.now() < 60000) {
      try { return await refreshTokens(); } catch (e) { return token; }
    }
    return token;
  }

  async function request(path, opts) {
    opts = opts || {};
    const headers = Object.assign({}, opts.headers || {});
    if (opts.body && !headers["Content-Type"]) headers["Content-Type"] = "application/json";

    if (!opts.noAuth) {
      const token = await ensureFreshToken();
      if (token) headers["Authorization"] = "Bearer " + token;
    }

    let res;
    try {
      res = await fetch(API_BASE + path, { method: opts.method || "GET", headers, body: opts.body });
    } catch (err) {
      const e = new Error("Network error. Check your connection.");
      e.status = 0;
      throw e;
    }

    if (res.status === 401 && !opts.noAuth) {
      try { await refreshTokens(); } catch (e) { clearTokens(); showLogin(); throw new Error("Session expired"); }
      headers["Authorization"] = "Bearer " + getIdToken();
      res = await fetch(API_BASE + path, { method: opts.method || "GET", headers, body: opts.body });
    }

    let data = null;
    try { data = await res.json(); } catch (e) {}

    if (!res.ok) {
      const e = new Error((data && data.error) || ("HTTP " + res.status));
      e.status = res.status;
      throw e;
    }
    return data;
  }

  const api = {
    login: function (email, password) { return request("/login", { method: "POST", noAuth: true, body: JSON.stringify({ email, password }) }); },
    me: function () { return request("/me"); },
    updateMe: function (name) { return request("/me", { method: "PUT", body: JSON.stringify({ displayName: name }) }); },
    listOwn: function () { return request("/admin/tests"); },
    getOwn: function (id) { return request("/admin/tests/" + encodeURIComponent(id)); },
    createTest: function (payload) { return request("/admin/tests", { method: "POST", body: JSON.stringify(payload) }); },
    updateTest: function (id, payload) { return request("/admin/tests/" + encodeURIComponent(id), { method: "PUT", body: JSON.stringify(payload) }); },
    deleteTest: function (id) { return request("/admin/tests/" + encodeURIComponent(id), { method: "DELETE" }); },
    publish: function (id) { return request("/admin/tests/" + encodeURIComponent(id) + "/publish", { method: "POST" }); },
    unpublish: function (id) { return request("/admin/tests/" + encodeURIComponent(id) + "/unpublish", { method: "POST" }); },
    getSubmissions: function (id) { return request("/admin/tests/" + encodeURIComponent(id) + "/submissions"); },
    getSettings: function () { return request("/settings", { noAuth: true }); },
    updateSettings: function (payload) { return request("/settings", { method: "PUT", body: JSON.stringify(payload) }); },
    getActiveSessions: function () { return request("/admin/sessions/active"); },
    listSubjects: function () { return request("/admin/subjects"); },
    createSubject: function (payload) { return request("/admin/subjects", { method: "POST", body: JSON.stringify(payload) }); },
    updateSubject: function (id, payload) { return request("/admin/subjects/" + encodeURIComponent(id), { method: "PUT", body: JSON.stringify(payload) }); },
    deleteSubject: function (id) { return request("/admin/subjects/" + encodeURIComponent(id), { method: "DELETE" }); },
    importQuestions: function (id, payload) { return request("/admin/subjects/" + encodeURIComponent(id) + "/import", { method: "POST", body: JSON.stringify(payload) }); },
    listQuestions: function (id, params) {
      const qs = [];
      if (params && params.search) qs.push("search=" + encodeURIComponent(params.search));
      if (params && params.limit) qs.push("limit=" + params.limit);
      if (params && params.offset) qs.push("offset=" + params.offset);
      const suffix = qs.length ? "?" + qs.join("&") : "";
      return request("/admin/subjects/" + encodeURIComponent(id) + "/questions" + suffix);
    },
    deleteQuestion: function (subjectId, questionId) {
      return request("/admin/subjects/" + encodeURIComponent(subjectId) + "/questions/" + encodeURIComponent(questionId), { method: "DELETE" });
    },
    getCronLogs: function () { return request("/admin/cron/logs"); },
    runCronNow: function () { return request("/admin/cron/generate", { method: "POST" }); },
    getDailyQuizConfig: function () { return request("/admin/cron/config"); },
    saveDailyQuizConfig: function (payload) { return request("/admin/cron/config", { method: "PUT", body: JSON.stringify(payload) }); }
  };

  function t(key, vars) { return (window.PK && window.PK.t) ? window.PK.t(key, vars) : key; }
  function esc(v) { return String(v).replace(/[&<>"']/g, function (c) { const m = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }; return m[c]; }); }
  function $id(id) { return document.getElementById(id); }

  function toast(message, kind) {
    const container = $id("toastContainer");
    if (!container) return;
    const el = document.createElement("div");
    el.className = "toast" + (kind ? " " + kind : "");
    el.textContent = message;
    container.appendChild(el);
    setTimeout(function () { el.remove(); }, 3200);
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
    return new Promise(function (resolve, reject) {
      const ta = document.createElement("textarea");
      ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); resolve(); } catch (e) { reject(e); } finally { document.body.removeChild(ta); }
    });
  }

  function publicTestUrl(id) {
    const base = window.location.origin + window.location.pathname.replace(/admin\.html$/, "");
    return base + "mock-test.html?test=" + encodeURIComponent(id);
  }

  function formatDuration(seconds) {
    const s = Number(seconds) || 0;
    if (s <= 0) return "—";
    const m = Math.floor(s / 60);
    const r = s % 60;
    if (m === 0) return r + "s";
    return m + "m " + String(r).padStart(2, "0") + "s";
  }

  function formatDateTime(ts) {
    if (!ts) return "—";
    const d = new Date(Number(ts));
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
  }

  function fileToBase64(file) {
    return new Promise(function (resolve, reject) {
      const reader = new FileReader();
      reader.onload = function () { resolve(String(reader.result || "")); };
      reader.onerror = function () { reject(new Error("Failed to read image")); };
      reader.readAsDataURL(file);
    });
  }

  function getQuestionType(q) {
    if (!q || typeof q !== "object") return "mcq";
    const t = q.type;
    if (t === "math" || t === "reasoning" || t === "mcq") return t;
    return "mcq";
  }

  const ADMIN_PAGE_SIZE = 5;
  const state = {
    admin: null, tests: [], editing: null, currentTab: "tests",
    submissionsTestId: null, submissionsCache: [],
    analysisTestId: null, analysisCache: null,
    searchQuery: "", testsPage: 0
  };
  const screens = {
    loading: $id("adminLoading"),
    login: $id("loginScreen"),
    dashboard: $id("dashboardScreen"),
    editor: $id("editorScreen"),
    submissions: $id("submissionsScreen"),
    analysis: $id("analysisScreen")
  };

  function showScreen(name) {
    Object.keys(screens).forEach(function (k) { if (screens[k]) screens[k].hidden = (k !== name); });
    window.scrollTo({ top: 0, behavior: "auto" });
    if (name === "dashboard") { if (typeof startActiveRefresh === "function") startActiveRefresh(); }
    else { if (typeof stopActiveRefresh === "function") stopActiveRefresh(); }
  }

  function showLogin() {
    stopInactivityTimer();
    state.admin = null; state.tests = []; state.editing = null;
    state.submissionsTestId = null; state.analysisTestId = null; state.analysisCache = null;
    state.searchQuery = ""; state.testsPage = 0;
    const u = $id("loginUser"), p = $id("loginPass"), e = $id("loginError");
    if (u) u.value = ""; if (p) p.value = ""; if (e) e.hidden = true;
    const s = $id("adminTestSearch"); if (s) s.value = "";
    showScreen("login");
  }

  /* ---------- INACTIVITY ---------- */

  let inactivityTimerId = null;
  function resetInactivityTimer() {
    if (inactivityTimerId) clearTimeout(inactivityTimerId);
    if (!getIdToken() && !getRefreshToken()) return;
    inactivityTimerId = setTimeout(handleInactivityTimeout, INACTIVITY_MS);
  }
  function startInactivityTimer() { resetInactivityTimer(); }
  function stopInactivityTimer() { if (inactivityTimerId) { clearTimeout(inactivityTimerId); inactivityTimerId = null; } }
  ["click", "keydown", "scroll", "touchstart"].forEach(function (ev) { document.addEventListener(ev, resetInactivityTimer, { passive: true }); });
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible") resetInactivityTimer(); });
  function handleInactivityTimeout() { stopInactivityTimer(); clearTokens(); state.admin = null; state.tests = []; state.editing = null; openSessionTimeoutModal(); }

  let sessionTimeoutModalEl = null;
  function ensureSessionTimeoutModal() {
    if (sessionTimeoutModalEl) return sessionTimeoutModalEl;
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.id = "sessionTimeoutOverlay";
    overlay.hidden = true;
    overlay.innerHTML = '<div class="modal"><h2>Session timed out</h2><p class="muted-text" style="margin-bottom:20px;">Your session has expired due to inactivity. Please log in again to continue.</p><div class="modal-actions"><button type="button" class="btn btn-primary" id="sessionTimeoutLoginBtn">Go to login</button></div></div>';
    document.body.appendChild(overlay);
    overlay.querySelector("#sessionTimeoutLoginBtn").addEventListener("click", function () { overlay.hidden = true; overlay.classList.remove("open"); showLogin(); });
    sessionTimeoutModalEl = overlay;
    return overlay;
  }
  function openSessionTimeoutModal() {
    const overlay = ensureSessionTimeoutModal();
    overlay.hidden = false; overlay.classList.add("open");
    setTimeout(function () { const b = overlay.querySelector("#sessionTimeoutLoginBtn"); if (b) b.focus(); }, 40);
  }

  let logoutModalEl = null;
  function ensureLogoutModal() {
    if (logoutModalEl) return logoutModalEl;
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.id = "logoutOverlay";
    overlay.hidden = true;
    overlay.innerHTML = '<div class="modal"><h2>Sign out?</h2><p class="muted-text" style="margin-bottom:20px;">You will need to sign in again to manage your tests.</p><div class="modal-actions"><button type="button" class="btn" id="logoutCancelBtn">Stay signed in</button><button type="button" class="btn btn-primary" id="logoutConfirmBtn">Sign out</button></div></div>';
    document.body.appendChild(overlay);
    const cancelBtn = overlay.querySelector("#logoutCancelBtn");
    const confirmBtn = overlay.querySelector("#logoutConfirmBtn");
    function close() { overlay.hidden = true; overlay.classList.remove("open"); }
    cancelBtn.addEventListener("click", close);
    overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !overlay.hidden) close(); });
    confirmBtn.addEventListener("click", function () { close(); clearTokens(); stopInactivityTimer(); showLogin(); });
    logoutModalEl = overlay;
    return overlay;
  }
  function openLogoutModal() {
    const overlay = ensureLogoutModal();
    overlay.hidden = false; overlay.classList.add("open");
    setTimeout(function () { const b = overlay.querySelector("#logoutCancelBtn"); if (b) b.focus(); }, 40);
  }

  /* ---------- LOGIN ---------- */

  const loginForm = $id("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      const email = $id("loginUser").value.trim();
      const password = $id("loginPass").value;
      const errEl = $id("loginError");
      const btn = $id("loginSubmit");
      errEl.hidden = true;
      if (!email || !password) { errEl.textContent = t("fillAllFields"); errEl.hidden = false; return; }
      btn.disabled = true;
      try {
        const res = await api.login(email, password);
        storeTokens(res.idToken, res.refreshToken, res.expiresIn);
        state.admin = res.admin;
        await enterDashboard();
        startInactivityTimer();
      } catch (err) {
        errEl.textContent = err.status === 401 ? t("invalidLogin") : err.status === 403 ? (err.message || "Not authorized") : (err.message || "Error");
        errEl.hidden = false;
      } finally { btn.disabled = false; }
    });
  }

  const signOutBtn = $id("signOutBtn");
  if (signOutBtn) signOutBtn.addEventListener("click", function () { openLogoutModal(); });

  const activeRefreshBtn = $id("activeRefreshBtn");
  if (activeRefreshBtn) activeRefreshBtn.addEventListener("click", refreshActiveCount);

  /* ---------- TABS ---------- */

  const tabTests = $id("tabTests"), tabSettings = $id("tabSettings"), tabSubjects = $id("tabSubjects"), tabDatabase = $id("tabDatabase"), tabCronLogs = $id("tabCronLogs");
  const panelTests = $id("panelTests"), panelSettings = $id("panelSettings"), panelSubjects = $id("panelSubjects"), panelDatabase = $id("panelDatabase"), panelCronLogs = $id("panelCronLogs");

  function setTab(tab) {
    state.currentTab = tab;
    if (tabTests) { const a = tab === "tests"; tabTests.classList.toggle("is-active", a); tabTests.setAttribute("aria-selected", String(a)); }
    if (tabSettings) { const a = tab === "settings"; tabSettings.classList.toggle("is-active", a); tabSettings.setAttribute("aria-selected", String(a)); }
    if (tabSubjects) { const a = tab === "subjects"; tabSubjects.classList.toggle("is-active", a); tabSubjects.setAttribute("aria-selected", String(a)); }
    if (tabDatabase) { const a = tab === "database"; tabDatabase.classList.toggle("is-active", a); tabDatabase.setAttribute("aria-selected", String(a)); }
    if (tabCronLogs) { const a = tab === "cronlogs"; tabCronLogs.classList.toggle("is-active", a); tabCronLogs.setAttribute("aria-selected", String(a)); }
    if (panelTests) panelTests.hidden = tab !== "tests";
    if (panelSettings) panelSettings.hidden = tab !== "settings";
    if (panelSubjects) panelSubjects.hidden = tab !== "subjects";
    if (panelDatabase) panelDatabase.hidden = tab !== "database";
    if (panelCronLogs) panelCronLogs.hidden = tab !== "cronlogs";
    if (tab === "settings") {
      if (window.PKLoader) window.PKLoader.show();
      Promise.all([loadSettings(), loadInterruptionSettings(), loadDailyQuizSettings()]).finally(function () { if (window.PKLoader) window.PKLoader.hide(); });
    }
    if (tab === "subjects") loadSubjects();
    if (tab === "database") {
      if (typeof window.initControlRoom === "function") window.initControlRoom();
    }
    if (tab === "cronlogs") loadCronLogs();
  }

  if (tabTests) tabTests.addEventListener("click", function () { setTab("tests"); });
  if (tabSettings) tabSettings.addEventListener("click", function () { setTab("settings"); });
  if (tabSubjects) tabSubjects.addEventListener("click", function () { setTab("subjects"); });
  if (tabDatabase) tabDatabase.addEventListener("click", function () { setTab("database"); });
  if (tabCronLogs) tabCronLogs.addEventListener("click", function () { setTab("cronlogs"); });

  const adminTestSearch = $id("adminTestSearch");
  const testsPagination = $id("testsPagination");
  const testsPrevBtn = $id("testsPrevBtn");
  const testsNextBtn = $id("testsNextBtn");
  const testsPageInfo = $id("testsPageInfo");

  if (adminTestSearch) {
    adminTestSearch.addEventListener("input", function () {
      state.searchQuery = adminTestSearch.value;
      state.testsPage = 0;
      renderTestsList();
    });
  }

  if (testsPrevBtn) {
    testsPrevBtn.addEventListener("click", function () {
      if (state.testsPage > 0) { state.testsPage--; renderTestsList(); }
    });
  }

  if (testsNextBtn) {
    testsNextBtn.addEventListener("click", function () {
      const query = state.searchQuery.trim().toLowerCase();
      const filtered = query ? state.tests.filter(function (test) { const haystack = [test.title || "", test.publisherName || "", test.status || ""].join(" ").toLowerCase(); return haystack.indexOf(query) !== -1; }) : state.tests;
      const totalPages = Math.max(1, Math.ceil(filtered.length / ADMIN_PAGE_SIZE));
      if (state.testsPage < totalPages - 1) { state.testsPage++; renderTestsList(); }
    });
  }

  /* ---------- ACTIVE NOW ---------- */

  let activeRefreshIntervalId = null;
  let activeMetaIntervalId = null;
  let activeLastUpdatedAt = 0;

  async function refreshActiveCount() {
    const countEl = $id("activeCount"), metaEl = $id("activeMeta"), refreshBtn = $id("activeRefreshBtn");
    if (!countEl || !metaEl) return;
    if (refreshBtn) refreshBtn.disabled = true;
    try {
      const res = await api.getActiveSessions();
      countEl.textContent = String(Number(res.active) || 0);
      activeLastUpdatedAt = Date.now();
      updateActiveMeta();
    } catch (err) {
      if (err.status === 401) return showLogin();
      countEl.textContent = "—";
      metaEl.textContent = "Could not load";
    } finally { if (refreshBtn) refreshBtn.disabled = false; }
  }
  function updateActiveMeta() {
    const metaEl = $id("activeMeta"), countEl = $id("activeCount");
    if (!metaEl || !activeLastUpdatedAt) return;
    const count = countEl ? (parseInt(countEl.textContent, 10) || 0) : 0;
    if (count <= 0) { metaEl.classList.remove("is-live"); metaEl.innerHTML = "<span>No active users</span>"; return; }
    metaEl.classList.add("is-live");
    const sec = Math.max(0, Math.floor((Date.now() - activeLastUpdatedAt) / 1000));
    let text;
    if (sec < 5) text = "Live · just now";
    else if (sec < 60) text = "Live · " + sec + "s ago";
    else text = "Live · " + Math.floor(sec / 60) + "m ago";
    metaEl.innerHTML = '<span class="active-dot"></span><span>' + text + "</span>";
  }
  function startActiveRefresh() { stopActiveRefresh(); refreshActiveCount(); activeRefreshIntervalId = setInterval(refreshActiveCount, 15000); activeMetaIntervalId = setInterval(updateActiveMeta, 1000); }
  function stopActiveRefresh() {
    if (activeRefreshIntervalId) { clearInterval(activeRefreshIntervalId); activeRefreshIntervalId = null; }
    if (activeMetaIntervalId) { clearInterval(activeMetaIntervalId); activeMetaIntervalId = null; }
  }

  /* ---------- DASHBOARD ---------- */

  async function enterDashboard() {
    if (!state.admin) return;
    const nameEl = $id("adminDisplayName");
    if (nameEl) nameEl.textContent = state.admin.displayName || "";
    if (window.PKLoader) window.PKLoader.show();
    showScreen("dashboard");
    setTab("tests");
    await loadTests();
    if (window.PKLoader) window.PKLoader.hide();
  }

  async function loadTests() {
    const loading = $id("testsLoading"), empty = $id("testsEmpty"), list = $id("testsList");
    if (!list) return;
    if (loading) loading.hidden = false;
    if (empty) empty.hidden = true;
    list.hidden = true; list.innerHTML = "";
    try {
      const res = await api.listOwn();
      state.tests = Array.isArray(res.tests) ? res.tests : [];
      if (loading) loading.hidden = true;
      renderTestsList();
    } catch (err) {
      if (loading) loading.hidden = true;
      if (err.status === 401) { showLogin(); return; }
      if (empty) { empty.hidden = false; empty.textContent = err.message || t("loadFailed"); }
    }
  }

  function renderTestsList() {
    const empty = $id("testsEmpty"), list = $id("testsList");
    if (!list) return;
    const query = state.searchQuery.trim().toLowerCase();
    const filtered = query ? state.tests.filter(function (test) { const haystack = [test.title || "", test.publisherName || "", test.status || ""].join(" ").toLowerCase(); return haystack.indexOf(query) !== -1; }) : state.tests;
    const totalPages = Math.max(1, Math.ceil(filtered.length / ADMIN_PAGE_SIZE));
    if (state.testsPage >= totalPages) state.testsPage = totalPages - 1;
    if (state.testsPage < 0) state.testsPage = 0;
    const startIdx = state.testsPage * ADMIN_PAGE_SIZE;
    const pageSlice = filtered.slice(startIdx, startIdx + ADMIN_PAGE_SIZE);
    list.replaceChildren();
    if (filtered.length === 0) {
      list.hidden = true;
      if (empty) {
        empty.hidden = false;
        if (state.tests.length === 0) empty.textContent = t("noTests");
        else if (query) empty.textContent = "No tests match \"" + state.searchQuery + "\"";
        else empty.textContent = t("noTests");
      }
    } else {
      list.hidden = false;
      if (empty) empty.hidden = true;
      pageSlice.forEach(function (test) { list.appendChild(renderTestCard(test)); });
    }
    if (testsPagination) testsPagination.hidden = filtered.length <= ADMIN_PAGE_SIZE;
    if (testsPageInfo) testsPageInfo.textContent = "Page " + (state.testsPage + 1) + " of " + totalPages;
    if (testsPrevBtn) testsPrevBtn.disabled = state.testsPage === 0;
    if (testsNextBtn) testsNextBtn.disabled = state.testsPage >= totalPages - 1;
  }

  function renderTestCard(test) {
    const card = document.createElement("div");
    card.className = "admin-test-card";
    const isPublished = test.status === "published";
    const perQuiz = Number(subject.dailyQuestionCount) || 0;

    card.innerHTML =
      '<div class="admin-test-info">' +
        '<p class="admin-test-title">' + esc(subject.name) + '</p>' +
        '<div class="admin-test-meta">' +
          '<span class="status-badge ' + (isActive ? "published" : "draft") + '">' + (isActive ? "Active" : "Inactive") + '</span>' +
          '<span>' + qCount + ' questions</span>' +
          '<span>' + (perQuiz > 0 ? (perQuiz + '/quiz') : 'default/quiz') + '</span>' +
          (subject.category ? '<span>' + esc(subject.category) + '</span>' : '') +
        '</div>' +
      '</div>' +
      '<div class="admin-test-actions"></div>';
    const actions = card.querySelector(".admin-test-actions");
    const subsBtn = document.createElement("button");
    subsBtn.type = "button"; subsBtn.className = "btn btn-sm"; subsBtn.textContent = "Submissions";
    subsBtn.addEventListener("click", function () { openSubmissions(test.id); });
    actions.appendChild(subsBtn);
    if (isPublished) {
      const copyBtn = document.createElement("button");
      copyBtn.type = "button"; copyBtn.className = "btn btn-sm"; copyBtn.textContent = t("copyUrl");
      copyBtn.addEventListener("click", function () {
        copyText(publicTestUrl(test.id)).then(function () { toast(t("urlCopied"), "success"); }).catch(function () { toast("Copy failed", "error"); });
      });
      actions.appendChild(copyBtn);
    }
    const editBtn = document.createElement("button");
    editBtn.type = "button"; editBtn.className = "btn btn-sm"; editBtn.textContent = t("edit");
    editBtn.addEventListener("click", function () { openEditor(test.id); });
    actions.appendChild(editBtn);
    const pubBtn = document.createElement("button");
    pubBtn.type = "button";
    pubBtn.className = "btn btn-sm" + (isPublished ? "" : " btn-primary");
    pubBtn.textContent = isPublished ? t("unpublish") : t("publish");
    pubBtn.addEventListener("click", async function () {
      pubBtn.disabled = true;
      try {
        if (isPublished) await api.unpublish(test.id);
        else await api.publish(test.id);
        toast(isPublished ? t("testUnpublished") : t("testPublished"), "success");
        await loadTests();
      } catch (err) {
        if (err.status === 401) return showLogin();
        toast(err.message || "Error", "error");
      } finally { pubBtn.disabled = false; }
    });
    actions.appendChild(pubBtn);
    const delBtn = document.createElement("button");
    delBtn.type = "button"; delBtn.className = "btn btn-sm"; delBtn.textContent = t("delete");
    delBtn.addEventListener("click", async function () {
      if (!window.confirm(t("confirmDelete"))) return;
      delBtn.disabled = true;
      try {
        await api.deleteTest(test.id);
        toast(t("testDeleted"));
        await loadTests();
      } catch (err) {
        if (err.status === 401) return showLogin();
        toast(err.message || "Error", "error");
      } finally { delBtn.disabled = false; }
    });
    actions.appendChild(delBtn);
    return card;
  }

  /* ---------- QUESTION BANK ---------- */

  async function loadSubjects() {
    const loading = $id("subjectsLoading"), empty = $id("subjectsEmpty"), list = $id("subjectsList");
    if (!list) return;
    if (loading) loading.hidden = false;
    if (empty) empty.hidden = true;
    list.hidden = true;
    list.innerHTML = "";
    try {
      const res = await api.listSubjects();
      const subjects = Array.isArray(res.subjects) ? res.subjects : [];
      if (loading) loading.hidden = true;
      if (subjects.length === 0) { if (empty) empty.hidden = false; return; }
      list.hidden = false;
      subjects.forEach(function (s) { list.appendChild(renderSubjectCard(s)); });
    } catch (err) {
      if (loading) loading.hidden = true;
      if (err && err.status === 401) return showLogin();
      if (empty) { empty.hidden = false; empty.textContent = "Could not load subjects: " + (err.message || "Error"); }
    }
  }

  function renderSubjectCard(subject) {
    const card = document.createElement("div");
    card.className = "admin-test-card";
    const isActive = subject.active !== false;
    const qCount = Number(subject.questionCount) || 0;
    card.innerHTML =
      '<div class="admin-test-info">' +
        '<p class="admin-test-title">' + esc(subject.name) + '</p>' +
        '<div class="admin-test-meta">' +
          '<span class="status-badge ' + (isActive ? "published" : "draft") + '">' + (isActive ? "Active" : "Inactive") + '</span>' +
          '<span>' + qCount + ' questions</span>' +
          (subject.category ? '<span>' + esc(subject.category) + '</span>' : '') +
        '</div>' +
      '</div>' +
      '<div class="admin-test-actions"></div>';
    const actions = card.querySelector(".admin-test-actions");
    const editBtn = document.createElement("button");
    editBtn.type = "button"; editBtn.className = "btn btn-sm"; editBtn.textContent = "Edit";
    editBtn.addEventListener("click", function () { openSubjectEditor(subject); });
    actions.appendChild(editBtn);
    const questionsBtn = document.createElement("button");
    questionsBtn.type = "button"; questionsBtn.className = "btn btn-sm"; questionsBtn.textContent = "Questions (" + qCount + ")";
    questionsBtn.addEventListener("click", function () { openQuestionsViewer(subject); });
    actions.appendChild(questionsBtn);
    const toggleBtn = document.createElement("button");
    toggleBtn.type = "button";
    toggleBtn.className = "btn btn-sm" + (isActive ? "" : " btn-primary");
    toggleBtn.textContent = isActive ? "Deactivate" : "Activate";
    toggleBtn.addEventListener("click", async function () {
      if (isActive && !window.confirm("Deactivate this subject? Its questions will be kept but not used for daily quizzes.")) return;
      toggleBtn.disabled = true;
      try {
        await api.updateSubject(subject.id, { active: !isActive });
        toast(isActive ? "Subject deactivated" : "Subject activated", "success");
        await loadSubjects();
      } catch (err) {
        if (err && err.status === 401) return showLogin();
        toast(err.message || "Error", "error");
      } finally { toggleBtn.disabled = false; }
    });
    actions.appendChild(toggleBtn);
    return card;
  }

  function openSubjectEditor(subject) {
    const isEdit = !!subject;
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.hidden = false;
    overlay.classList.add("open");
    overlay.innerHTML =
      '<div class="modal" style="max-width: 420px;">' +
        '<h2>' + (isEdit ? "Edit Subject" : "Add Subject") + '</h2>' +
        '<div class="form-field">' +
          '<label class="form-label">Name *</label>' +
          '<input type="text" class="form-input" id="subjectNameInput" maxlength="60" value="' + esc(subject ? subject.name : "") + '" placeholder="e.g. Assam GK">' +
        '</div>' +
        '<div class="form-field">' +
          '<label class="form-label">Category (optional)</label>' +
          '<input type="text" class="form-input" id="subjectCategoryInput" maxlength="40" value="' + esc(subject ? (subject.category || "") : "") + '" placeholder="e.g. GK, Math, Reasoning">' +
        '</div>' +
        '<div class="form-field">' +
          '<label class="form-label">Daily questions (5–30)</label>' +
          '<input type="number" class="form-input" id="subjectDailyCountInput" min="0" max="30" step="1" value="' + (subject ? (subject.dailyQuestionCount || 0) : 0) + '">' +
          '<p class="form-hint">Questions per quiz for this subject. Leave 0 to use the global default. Must be 0 or 5–30.</p>' +
        '</div>' +
        '<div class="form-field">' +
          '<label class="form-label">Order (optional)</label>' +
          '<input type="number" class="form-input" id="subjectOrderInput" min="0" value="' + (subject ? (subject.order || 0) : 0) + '">' +
          '<p class="form-hint">Lower number appears first.</p>' +
        '</div>' +
        '<p class="form-error" id="subjectEditorError" hidden></p>' +
        '<div class="modal-actions">' +
          '<button type="button" class="btn btn-sm" id="subjectEditorCancel">Cancel</button>' +
          '<button type="button" class="btn btn-primary btn-sm" id="subjectEditorSave">' + (isEdit ? "Save" : "Create") + '</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);
    const nameInput = overlay.querySelector("#subjectNameInput");
    const catInput = overlay.querySelector("#subjectCategoryInput");
    const dailyCountInput = overlay.querySelector("#subjectDailyCountInput");
    const orderInput = overlay.querySelector("#subjectOrderInput");
    const errEl = overlay.querySelector("#subjectEditorError");
    const saveBtn = overlay.querySelector("#subjectEditorSave");
    const cancelBtn = overlay.querySelector("#subjectEditorCancel");
    function close() { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }
    cancelBtn.addEventListener("click", close);
    overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });
    document.addEventListener("keydown", function handler(e) {
      if (e.key === "Escape") { close(); document.removeEventListener("keydown", handler); }
    });
    saveBtn.addEventListener("click", async function () {
      errEl.hidden = true;
      const name = nameInput.value.trim();
      if (!name || name.length < 2) { errEl.textContent = "Name must be at least 2 characters"; errEl.hidden = false; return; }
      if (name.length > 60) { errEl.textContent = "Name too long"; errEl.hidden = false; return; }

      const dqVal = Number(dailyCountInput.value) || 0;
      if (dqVal !== 0 && (dqVal < 5 || dqVal > 30)) {
        errEl.textContent = "Daily questions must be 0 (use default) or 5–30";
        errEl.hidden = false;
        return;
      }

      saveBtn.disabled = true;
      try {
        const payload = {
          name: name,
          category: catInput.value.trim(),
          order: Number(orderInput.value) || 0,
          dailyQuestionCount: dqVal
        };
        if (isEdit) { await api.updateSubject(subject.id, payload); toast("Subject updated", "success"); }
        else { await api.createSubject(payload); toast("Subject created", "success"); }
        close();
        await loadSubjects();
      } catch (err) {
        if (err && err.status === 401) { close(); return showLogin(); }
        errEl.textContent = err.message || "Save failed";
        errEl.hidden = false;
      } finally { saveBtn.disabled = false; }
    });
    setTimeout(function () { nameInput.focus(); }, 60);
  }

  const newSubjectBtn = $id("newSubjectBtn");
  if (newSubjectBtn) {
    newSubjectBtn.addEventListener("click", function () { openSubjectEditor(null); });
  }

  /* ---------- QUESTIONS VIEWER ---------- */

  async function openQuestionsViewer(subject) {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.hidden = false;
    overlay.classList.add("open");
    overlay.innerHTML =
      '<div class="modal" style="max-width: 720px; padding: 0;">' +
        '<div class="submission-detail-head" style="padding: 18px 20px 14px;">' +
          '<div>' +
            '<h2 style="margin: 0 0 3px; font-size: 16px;">' + esc(subject.name) + '</h2>' +
            '<p style="margin: 0; color: var(--muted); font-size: 12px;">Questions bank</p>' +
          '</div>' +
          '<button type="button" class="submission-detail-close" id="qvClose" aria-label="Close">' +
            '<svg viewBox="0 0 24 24"><path d="m6 6 12 12"></path><path d="M18 6 6 18"></path></svg>' +
          '</button>' +
        '</div>' +
        '<div style="padding: 14px 20px; display: flex; gap: 8px; flex-wrap: wrap; border-bottom: 1px solid var(--border);">' +
          '<button class="btn btn-primary btn-sm" id="qvImportBtn" type="button">+ Import JSON</button>' +
          '<div class="search-input-wrap" style="flex: 1; min-width: 160px; height: 38px;">' +
            '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"></circle><path d="m16 16 4.5 4.5"></path></svg>' +
            '<input type="search" id="qvSearch" placeholder="Search questions..." autocomplete="off" style="height: 36px;">' +
          '</div>' +
        '</div>' +
        '<div id="qvList" style="padding: 14px 20px; max-height: 500px; overflow-y: auto;">' +
          '<div class="loading-state"><div class="spinner"></div><span>Loading…</span></div>' +
        '</div>' +
        '<div style="padding: 12px 20px; border-top: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap;">' +
          '<span id="qvCount" style="font-size: 12px; color: var(--muted);">—</span>' +
          '<div style="display: flex; gap: 6px;">' +
            '<button class="btn btn-sm" id="qvPrev" type="button" disabled>← Prev</button>' +
            '<button class="btn btn-sm" id="qvNext" type="button" disabled>Next →</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);
    const listEl = overlay.querySelector("#qvList");
    const countEl = overlay.querySelector("#qvCount");
    const prevBtn = overlay.querySelector("#qvPrev");
    const nextBtn = overlay.querySelector("#qvNext");
    const searchEl = overlay.querySelector("#qvSearch");
    const importBtn = overlay.querySelector("#qvImportBtn");
    const closeBtn = overlay.querySelector("#qvClose");
    const PAGE_SIZE = 20;
    const qState = { offset: 0, search: "", total: 0 };
    function close() { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }
    closeBtn.addEventListener("click", close);
    overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });
    document.addEventListener("keydown", function handler(e) {
      if (e.key === "Escape") { close(); document.removeEventListener("keydown", handler); }
    });
    async function loadPage() {
      listEl.innerHTML = '<div class="loading-state"><div class="spinner"></div><span>Loading…</span></div>';
      try {
        const res = await api.listQuestions(subject.id, { limit: PAGE_SIZE, offset: qState.offset, search: qState.search });
        const questions = Array.isArray(res.questions) ? res.questions : [];
        qState.total = Number(res.total) || 0;
        if (questions.length === 0) {
          listEl.innerHTML = '<div class="empty-state" style="padding: 30px 16px;">' +
            (qState.search ? 'No questions match "' + esc(qState.search) + '"' : 'No questions yet. Click "Import JSON" to add.') +
            '</div>';
        } else {
          listEl.innerHTML = "";
          questions.forEach(function (q, idx) {
            const card = document.createElement("div");
            card.style.cssText = "padding: 12px; margin-bottom: 8px; border: 1px solid var(--border); border-radius: 8px; background: #ffffff;";
            const num = qState.offset + idx + 1;
            card.innerHTML =
              '<div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; margin-bottom: 6px;">' +
                '<div style="font-size: 13px; font-weight: 600; line-height: 1.4; overflow-wrap: anywhere;">' +
                  '<span style="color: var(--muted); margin-right: 6px;">Q' + num + '.</span>' + esc(q.q) +
                '</div>' +
                '<button class="btn btn-sm" type="button" data-del="' + esc(q.id) + '" style="color: #b91c1c; flex-shrink: 0;">Delete</button>' +
              '</div>' +
              '<div style="font-size: 11px; color: var(--muted);">' +
                (Array.isArray(q.options) ? q.options.map(function (o, i) {
                  var cls = i === q.answer ? "color: #15803d; font-weight: 600;" : "";
                  return '<div style="' + cls + '">' + String.fromCharCode(65 + i) + '. ' + esc(o) + (i === q.answer ? ' ✓' : '') + '</div>';
                }).join("") : '') +
              '</div>';
            const delBtn = card.querySelector("[data-del]");
            delBtn.addEventListener("click", async function () {
              if (!window.confirm("Delete this question? This cannot be undone.")) return;
              delBtn.disabled = true;
              try {
                await api.deleteQuestion(subject.id, q.id);
                toast("Question deleted", "success");
                await loadPage();
              } catch (err) {
                if (err && err.status === 401) return showLogin();
                toast(err.message || "Delete failed", "error");
                delBtn.disabled = false;
              }
            });
            listEl.appendChild(card);
          });
        }
        const start = qState.total === 0 ? 0 : qState.offset + 1;
        const end = Math.min(qState.offset + questions.length, qState.total);
        countEl.textContent = qState.total === 0 ? "No questions" : "Showing " + start + "–" + end + " of " + qState.total;
        prevBtn.disabled = qState.offset === 0;
        nextBtn.disabled = qState.offset + PAGE_SIZE >= qState.total;
      } catch (err) {
        if (err && err.status === 401) { close(); return showLogin(); }
        listEl.innerHTML = '<div class="empty-state" style="padding: 30px 16px;">' + esc(err.message || "Failed to load questions") + '</div>';
      }
    }
    prevBtn.addEventListener("click", function () {
      if (qState.offset === 0) return;
      qState.offset = Math.max(0, qState.offset - PAGE_SIZE);
      loadPage();
    });
    nextBtn.addEventListener("click", function () {
      if (qState.offset + PAGE_SIZE >= qState.total) return;
      qState.offset += PAGE_SIZE;
      loadPage();
    });
    let searchTimer = null;
    searchEl.addEventListener("input", function () {
      if (searchTimer) clearTimeout(searchTimer);
      searchTimer = setTimeout(function () {
        qState.search = searchEl.value;
        qState.offset = 0;
        loadPage();
      }, 300);
    });
    importBtn.addEventListener("click", function () {
      openBankImportModal(subject, function () { qState.offset = 0; loadPage(); });
    });
    await loadPage();
  }

  function openBankImportModal(subject, onDone) {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.hidden = false;
    overlay.classList.add("open");
    overlay.style.zIndex = "260";
    overlay.innerHTML =
      '<div class="modal" style="max-width: 640px;">' +
        '<h2>Import questions</h2>' +
        '<p style="margin: 0 0 12px; color: var(--muted); font-size: 13px;">Paste JSON array of questions for <strong>' + esc(subject.name) + '</strong>.</p>' +
        '<details style="margin-bottom: 12px; padding: 8px 10px; border: 1px solid var(--border); border-radius: 6px; background: var(--surface); font-size: 12px;">' +
          '<summary style="cursor: pointer; font-weight: 600; color: var(--muted);">Format example</summary>' +
          '<pre style="margin: 8px 0 0; padding: 10px; background: #fff; border-radius: 4px; border: 1px solid var(--border); font-size: 11px; overflow-x: auto;">' +
          '[{ "q": "Question text", "options": ["A", "B", "C", "D"], "answer": 0, "type": "mcq" }]' +
          '</pre>' +
        '</details>' +
        '<textarea id="impTa" class="import-textarea" placeholder="Paste JSON here..." style="min-height: 220px;"></textarea>' +
        '<p class="form-error" id="impErr" hidden></p>' +
        '<div class="modal-actions" style="margin-top: 14px;">' +
          '<button class="btn btn-sm" id="impCancel" type="button">Cancel</button>' +
          '<button class="btn btn-primary btn-sm" id="impConfirm" type="button">Import</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);
    const ta = overlay.querySelector("#impTa");
    const errEl = overlay.querySelector("#impErr");
    const confirmBtn = overlay.querySelector("#impConfirm");
    const cancelBtn = overlay.querySelector("#impCancel");
    function close() { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }
    cancelBtn.addEventListener("click", close);
    overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });
    document.addEventListener("keydown", function handler(e) {
      if (e.key === "Escape") { close(); document.removeEventListener("keydown", handler); }
    });
    setTimeout(function () { ta.focus(); }, 80);
    confirmBtn.addEventListener("click", async function () {
      errEl.hidden = true;
      const raw = ta.value.trim();
      if (!raw) { errEl.textContent = "Paste JSON first"; errEl.hidden = false; return; }
      let parsed;
      try { parsed = JSON.parse(raw); }
      catch (e) { errEl.textContent = "Invalid JSON: " + e.message; errEl.hidden = false; return; }
      const questions = Array.isArray(parsed) ? parsed : (parsed && Array.isArray(parsed.questions) ? parsed.questions : null);
      if (!questions || questions.length === 0) {
        errEl.textContent = "JSON must be an array of questions";
        errEl.hidden = false;
        return;
      }
      confirmBtn.disabled = true;
      confirmBtn.textContent = "Importing…";
      try {
        const res = await api.importQuestions(subject.id, { questions: questions });
        const added = Number(res.added) || 0;
        const skipped = Number(res.skipped) || 0;
        const errors = Array.isArray(res.errors) ? res.errors : [];
        let msg = "Imported " + added + " question(s).";
        if (skipped > 0) msg += " " + skipped + " duplicate(s) skipped.";
        if (errors.length > 0) msg += " " + errors.length + " error(s).";
        toast(msg, added > 0 ? "success" : "error");
        if (errors.length > 0) {
          errEl.innerHTML = "<strong>Errors:</strong><br>" + errors.slice(0, 5).map(esc).join("<br>");
          errEl.hidden = false;
          confirmBtn.disabled = false;
          confirmBtn.textContent = "Import";
          if (added > 0 && typeof onDone === "function") onDone();
          return;
        }
        close();
        if (typeof onDone === "function") onDone();
      } catch (err) {
        if (err && err.status === 401) { close(); return showLogin(); }
        errEl.textContent = err.message || "Import failed";
        errEl.hidden = false;
        confirmBtn.disabled = false;
        confirmBtn.textContent = "Import";
      }
    });
  }

  /* ---------- CRON LOGS ---------- */

  let cronLogsCache = [];

  async function loadCronLogs() {
    const loading = $id("cronLogsLoading"), empty = $id("cronLogsEmpty"), list = $id("cronLogsList");
    if (!list) return;
    if (loading) loading.hidden = false;
    if (empty) empty.hidden = true;
    list.hidden = true;
    list.innerHTML = "";
    try {
      const res = await api.getCronLogs();
      const logs = Array.isArray(res.logs) ? res.logs : [];
      cronLogsCache = logs;
      if (loading) loading.hidden = true;
      if (logs.length === 0) { if (empty) empty.hidden = false; return; }
      list.hidden = false;
      logs.forEach(function (log) { list.appendChild(renderCronLogCard(log)); });
    } catch (err) {
      if (loading) loading.hidden = true;
      if (err && err.status === 401) return showLogin();
      if (empty) { empty.hidden = false; empty.textContent = "Could not load cron logs: " + (err.message || "Error"); }
    }
  }

  function renderCronLogCard(log) {
    const card = document.createElement("div");
    card.className = "admin-test-card";
    const generatedCount = Number(log.generatedCount) || 0;
    const skippedCount = Number(log.skippedCount) || 0;
    card.innerHTML =
      '<div class="admin-test-info">' +
        '<p class="admin-test-title">' + esc(log.date) + '</p>' +
        '<div class="admin-test-meta">' +
          '<span class="status-badge published">' + generatedCount + ' generated</span>' +
          (skippedCount > 0 ? '<span style="color: #b45309; font-weight: 600;">' + skippedCount + ' skipped</span>' : '') +
        '</div>' +
      '</div>' +
      '<div class="admin-test-actions">' +
        '<button class="btn btn-sm" type="button" data-log-action="view">Details</button>' +
      '</div>';
    card.querySelector('[data-log-action="view"]').addEventListener("click", function () {
      openCronLogDetail(log);
    });
    return card;
  }

  function openCronLogDetail(log) {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.hidden = false;
    overlay.classList.add("open");
    overlay.innerHTML =
      '<div class="modal" style="max-width: 560px; padding: 0;">' +
        '<div class="submission-detail-head" style="padding: 18px 20px 14px;">' +
          '<div>' +
            '<h2 style="margin: 0 0 3px; font-size: 16px;">' + esc(log.date) + '</h2>' +
            '<p style="margin: 0; color: var(--muted); font-size: 12px;">Cron run details</p>' +
          '</div>' +
          '<button type="button" class="submission-detail-close" id="cronLogDetailClose" aria-label="Close">' +
            '<svg viewBox="0 0 24 24"><path d="m6 6 12 12"></path><path d="M18 6 6 18"></path></svg>' +
          '</button>' +
        '</div>' +
        '<div style="padding: 16px 20px; max-height: 500px; overflow-y: auto;" id="cronLogBody"></div>' +
      '</div>';
    document.body.appendChild(overlay);
    const body = overlay.querySelector("#cronLogBody");
    const generated = Array.isArray(log.generated) ? log.generated : [];
    const skipped = Array.isArray(log.skipped) ? log.skipped : [];
    let html = "";
    if (generated.length > 0) {
      html += '<h3 style="margin: 0 0 10px; font-size: 13px; font-weight: 600; color: #15803d;">✓ Generated (' + generated.length + ')</h3>';
      html += '<div style="margin-bottom: 16px;">';
      generated.forEach(function (g) {
        html += '<div style="padding: 10px 12px; border: 1px solid #bbf7d0; border-radius: 8px; background: #f0fdf4; margin-bottom: 6px; font-size: 13px;">' +
          '<strong>' + esc(g.name || g.id) + '</strong> — ' + (g.count || 0) + ' questions' +
        '</div>';
      });
      html += '</div>';
    }
    if (skipped.length > 0) {
      html += '<h3 style="margin: 0 0 10px; font-size: 13px; font-weight: 600; color: #b45309;">⚠ Skipped (' + skipped.length + ')</h3>';
      html += '<div>';
      skipped.forEach(function (s) {
        let reasonText = s.reason || "unknown";
        if (s.reason === "pool_too_small") reasonText = "Not enough questions in bank";
        if (s.reason === "error") reasonText = "Error: " + (s.detail || "unknown");
        html += '<div style="padding: 10px 12px; border: 1px solid #fef3c7; border-radius: 8px; background: #fffbeb; margin-bottom: 6px; font-size: 13px;">' +
          '<strong>' + esc(s.name || s.id) + '</strong><br>' +
          '<span style="color: var(--muted); font-size: 12px;">' + esc(reasonText) + '</span>' +
        '</div>';
      });
      html += '</div>';
    }
    if (generated.length === 0 && skipped.length === 0) {
      html = '<div class="empty-state">No data for this run.</div>';
    }
    body.innerHTML = html;
    function close() { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }
    overlay.querySelector("#cronLogDetailClose").addEventListener("click", close);
    overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });
    document.addEventListener("keydown", function handler(e) {
      if (e.key === "Escape") { close(); document.removeEventListener("keydown", handler); }
    });
  }

  const runCronNowBtn = $id("runCronNowBtn");
  if (runCronNowBtn) {
    runCronNowBtn.addEventListener("click", async function () {
      if (!window.confirm("Run daily quiz generation now? This will create today's quizzes for all active subjects.")) return;
      runCronNowBtn.disabled = true;
      runCronNowBtn.textContent = "Running…";
      try {
        const res = await api.runCronNow();
        const result = res.result || {};
        const genCount = result.generatedCount || 0;
        const skipCount = result.skippedCount || 0;
        let msg = "Done. " + genCount + " generated";
        if (skipCount > 0) msg += ", " + skipCount + " skipped";
        toast(msg, genCount > 0 ? "success" : "error");
        await loadCronLogs();
      } catch (err) {
        if (err && err.status === 401) return showLogin();
        toast(err.message || "Cron failed", "error");
      } finally {
        runCronNowBtn.disabled = false;
        runCronNowBtn.textContent = "Run Now";
      }
    });
  }

  /* ---------- DAILY QUIZ SETTINGS ---------- */

  async function loadDailyQuizSettings() {
    try {
      const res = await api.getDailyQuizConfig();
      const val = (res && Number(res.defaultQuestionsPerQuiz)) || 5;
      const input = $id("defaultQuestionsPerQuiz");
      if (input) input.value = String(val);
      const errEl = $id("dailyQuizError");
      if (errEl) errEl.hidden = true;
    } catch (err) {
      const input = $id("defaultQuestionsPerQuiz");
      if (input) input.value = "5";
    }
  }

  const dailyQuizForm = $id("dailyQuizForm");
  if (dailyQuizForm) {
    dailyQuizForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      const input = $id("defaultQuestionsPerQuiz");
      const errEl = $id("dailyQuizError");
      const btn = $id("saveDailyQuizBtn");
      const value = Number(input.value);
      errEl.hidden = true;
      if (!Number.isInteger(value) || value < 5 || value > 30) {
        errEl.textContent = "Must be between 5 and 30";
        errEl.hidden = false;
        return;
      }
      btn.disabled = true;
      try {
        await api.saveDailyQuizConfig({ defaultQuestionsPerQuiz: value });
        toast("Daily quiz settings saved", "success");
      } catch (err) {
        if (err && err.status === 401) return showLogin();
        errEl.textContent = err.message || "Save failed";
        errEl.hidden = false;
      } finally { btn.disabled = false; }
    });
  }


   /* ---------- SUBMISSIONS ---------- */

  async function openSubmissions(testId) {
    state.submissionsTestId = testId;
    showScreen("submissions");
    const titleEl = $id("submissionsTitle");
    const loadingEl = $id("submissionsLoading");
    const emptyEl = $id("submissionsEmpty");
    const bodyEl = $id("submissionsBody");
    const listEl = $id("submissionsList");
    if (titleEl) titleEl.textContent = "Loading…";
    if (loadingEl) loadingEl.hidden = false;
    if (emptyEl) emptyEl.hidden = true;
    if (bodyEl) bodyEl.hidden = true;
    if (listEl) listEl.innerHTML = "";
    if (window.PKLoader) window.PKLoader.show();
    try {
      const res = await api.getSubmissions(testId);
      if (titleEl) titleEl.textContent = res.testTitle || "Submissions";
      if (loadingEl) loadingEl.hidden = true;
      const list = Array.isArray(res.submissions) ? res.submissions : [];
      state.submissionsCache = list;
      if (list.length === 0) { if (emptyEl) emptyEl.hidden = false; return; }
      let totalPercent = 0, topPercent = 0;
      list.forEach(function (s) { totalPercent += Number(s.percent) || 0; if (Number(s.percent) > topPercent) topPercent = Number(s.percent); });
      const avgPercent = Math.round(totalPercent / list.length);
      const totalEl = $id("submissionsTotal"), avgEl = $id("submissionsAvg"), topEl = $id("submissionsTop");
      if (totalEl) totalEl.textContent = String(list.length);
      if (avgEl) avgEl.textContent = avgPercent + "%";
      if (topEl) topEl.textContent = topPercent + "%";
      if (listEl) list.forEach(function (s, idx) { listEl.appendChild(renderSubmissionRow(s, idx)); });
      if (bodyEl) bodyEl.hidden = false;
    } catch (err) {
      if (err.status === 401) return showLogin();
      if (loadingEl) loadingEl.hidden = true;
      if (emptyEl) { emptyEl.hidden = false; emptyEl.textContent = err.message || "Could not load submissions"; }
    } finally { if (window.PKLoader) window.PKLoader.hide(); }
  }

  function renderSubmissionRow(s, idx) {
    const row = document.createElement("div");
    row.className = "submission-row";
    const name = esc(s.userName || "—");
    const correct = Number(s.correct) || 0;
    const total = Number(s.total) || 0;
    const percent = Number(s.percent) || 0;
    let timeText = "—";
    if (s.submittedAt) {
      const diff = Date.now() - Number(s.submittedAt);
      const mins = Math.floor(diff / 60000);
      if (mins < 1) timeText = "just now";
      else if (mins < 60) timeText = mins + "m ago";
      else if (mins < 1440) timeText = Math.floor(mins / 60) + "h ago";
      else timeText = Math.floor(mins / 1440) + "d ago";
    }
    row.innerHTML =
      '<div class="submission-name">' + name + "</div>" +
      '<div class="submission-score"><strong>' + correct + "</strong><span>/ " + total + "</span></div>" +
      '<div class="submission-percent">' + percent + "%</div>" +
      '<div class="submission-time">' + esc(timeText) + "</div>";
    row.addEventListener("click", function () { openSubmissionDetail(idx); });
    return row;
  }

  function ensureSubmissionModal() {
    let overlay = $id("submissionDetailOverlay");
    if (overlay) return overlay;
    overlay = document.createElement("div");
    overlay.id = "submissionDetailOverlay";
    overlay.className = "modal-overlay";
    overlay.hidden = true;
    overlay.innerHTML = '<div class="submission-detail-modal"><div class="submission-detail-head"><div><h2 id="submissionDetailName">—</h2><p id="submissionDetailTest">—</p></div><button type="button" class="submission-detail-close" id="submissionDetailClose" aria-label="Close"><svg viewBox="0 0 24 24"><path d="m6 6 12 12"></path><path d="M18 6 6 18"></path></svg></button></div><div class="submission-detail-body" id="submissionDetailBody"></div></div>';
    document.body.appendChild(overlay);
    function close() { overlay.hidden = true; overlay.classList.remove("open"); }
    overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });
    const closeBtn = overlay.querySelector("#submissionDetailClose");
    if (closeBtn) closeBtn.addEventListener("click", close);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !overlay.hidden) close(); });
    return overlay;
  }

  function openSubmissionDetail(idx) {
    const s = state.submissionsCache[idx];
    if (!s) return;
    const overlay = ensureSubmissionModal();
    const nameEl = overlay.querySelector("#submissionDetailName");
    const testEl = overlay.querySelector("#submissionDetailTest");
    const bodyEl = overlay.querySelector("#submissionDetailBody");
    const correct = Number(s.correct) || 0;
    const wrong = Number(s.wrong) || 0;
    const unattempted = Number(s.unattempted) || 0;
    const total = Number(s.total) || 0;
    const percent = Number(s.percent) || 0;
    const attempted = correct + wrong;
    const accuracy = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;
    nameEl.textContent = s.userName || "—";
    const currentTest = state.tests.find(function (x) { return x.id === state.submissionsTestId; });
    testEl.textContent = currentTest ? currentTest.title : "Test";
    const timeTakenText = s.timeTaken > 0 ? formatDuration(s.timeTaken) : "Not recorded";
    const waText = s.userWhatsApp && s.userWhatsApp.trim() ? esc(s.userWhatsApp) : "Not provided";
    bodyEl.innerHTML =
      '<div class="submission-metrics">' +
        '<div class="submission-metric"><strong>' + correct + " / " + total + '</strong><span>Score</span></div>' +
        '<div class="submission-metric"><strong>' + percent + '%</strong><span>Percent</span></div>' +
        '<div class="submission-metric"><strong>' + accuracy + '%</strong><span>Accuracy</span></div>' +
      '</div>' +
      '<div class="submission-breakdown">' +
        '<div class="submission-breakdown-item correct"><strong>' + correct + '</strong><span>Correct</span></div>' +
        '<div class="submission-breakdown-item wrong"><strong>' + wrong + '</strong><span>Wrong</span></div>' +
        '<div class="submission-breakdown-item"><strong>' + unattempted + '</strong><span>Unattempted</span></div>' +
        '<div class="submission-breakdown-item"><strong>' + attempted + '</strong><span>Attempted</span></div>' +
      '</div>' +
      '<div class="submission-meta-list">' +
        '<div class="submission-meta-row"><span class="label">Time taken</span><span class="value' + (s.timeTaken > 0 ? "" : " muted") + '">' + esc(timeTakenText) + '</span></div>' +
        '<div class="submission-meta-row"><span class="label">Submitted</span><span class="value">' + esc(formatDateTime(s.submittedAt)) + '</span></div>' +
        '<div class="submission-meta-row"><span class="label">WhatsApp</span><span class="value' + (s.userWhatsApp && s.userWhatsApp.trim() ? "" : " muted") + '">' + waText + '</span></div>' +
      '</div>';
    overlay.hidden = false; overlay.classList.add("open");
    const closeBtn = overlay.querySelector("#submissionDetailClose");
    if (closeBtn) setTimeout(function () { closeBtn.focus(); }, 40);
  }

  const submissionsBackBtn = $id("submissionsBackBtn");
  if (submissionsBackBtn) {
    submissionsBackBtn.addEventListener("click", function () {
      state.submissionsTestId = null; state.submissionsCache = [];
      showScreen("dashboard"); loadTests();
    });
  }

  /* ---------- ANALYSIS ---------- */

  const openAnalysisBtn = $id("openAnalysisBtn");
  if (openAnalysisBtn) openAnalysisBtn.addEventListener("click", function () { if (state.submissionsTestId) openAnalysis(state.submissionsTestId); });

  const analysisBackBtn = $id("analysisBackBtn");
  if (analysisBackBtn) {
    analysisBackBtn.addEventListener("click", function () {
      if (state.submissionsTestId) openSubmissions(state.submissionsTestId);
      else { showScreen("dashboard"); loadTests(); }
    });
  }

  const analysisTabByQ = $id("analysisTabByQ");
  const analysisTabTough = $id("analysisTabTough");
  if (analysisTabByQ) analysisTabByQ.addEventListener("click", function () {
    analysisTabByQ.classList.add("is-active"); analysisTabByQ.setAttribute("aria-selected", "true");
    analysisTabTough.classList.remove("is-active"); analysisTabTough.setAttribute("aria-selected", "false");
    $id("analysisByQ").hidden = false; $id("analysisByTough").hidden = true;
  });
  if (analysisTabTough) analysisTabTough.addEventListener("click", function () {
    analysisTabTough.classList.add("is-active"); analysisTabTough.setAttribute("aria-selected", "true");
    analysisTabByQ.classList.remove("is-active"); analysisTabByQ.setAttribute("aria-selected", "false");
    $id("analysisByQ").hidden = true; $id("analysisByTough").hidden = false;
  });

  async function openAnalysis(testId) {
    state.analysisTestId = testId;
    showScreen("analysis");
    const loadingEl = $id("analysisLoading"), emptyEl = $id("analysisEmpty"), bodyEl = $id("analysisBody");
    if (loadingEl) loadingEl.hidden = false;
    if (emptyEl) emptyEl.hidden = true;
    if (bodyEl) bodyEl.hidden = true;
    if (window.PKLoader) window.PKLoader.show();
    try {
      const res = await api.getSubmissions(testId);
      if (loadingEl) loadingEl.hidden = true;
      const submissions = Array.isArray(res.submissions) ? res.submissions : [];
      const questions = Array.isArray(res.questions) ? res.questions : [];
      const testTitle = res.testTitle || "";
      const titleEl = $id("analysisTitle");
      if (titleEl) titleEl.textContent = testTitle ? ("Wrong Analysis · " + testTitle) : "Wrong Analysis";
      const cache = aggregateAnalysis(submissions, questions);
      state.analysisCache = cache;
      if (cache.totalSubsWithAnswers === 0) { if (emptyEl) emptyEl.hidden = false; if (window.PKLoader) window.PKLoader.hide(); return; }
      $id("analysisSubs").textContent = String(cache.totalSubsWithAnswers);
      $id("analysisWrong").textContent = String(cache.totalWrong);
      const toughest = cache.toughest;
      $id("analysisToughest").textContent = toughest ? ("Q" + (toughest.index + 1) + " · " + toughest.wrongPct + "%") : "—";
      renderAnalysisByQ();
      renderAnalysisByTough();
      if (bodyEl) bodyEl.hidden = false;
    } catch (err) {
      if (err.status === 401) return showLogin();
      if (loadingEl) loadingEl.hidden = true;
      if (emptyEl) { emptyEl.hidden = false; emptyEl.textContent = err.message || "Could not load analysis"; }
    } finally { if (window.PKLoader) window.PKLoader.hide(); }
  }

  function aggregateAnalysis(submissions, questions) {
    const perQ = questions.map(function (q, qi) {
      return {
        index: qi, q: q.q, options: Array.isArray(q.options) ? q.options.slice() : [],
        correct: q.answer, type: q.type || "mcq",
        optionCounts: (q.options || []).map(function () { return 0; }),
        correctCount: 0, wrongCount: 0, unattempted: 0, wrongUsers: []
      };
    });
    let totalWrong = 0;
    let totalSubsWithAnswers = 0;
    submissions.forEach(function (s) {
      if (!s.answers || typeof s.answers !== "object") return;
      totalSubsWithAnswers += 1;
      questions.forEach(function (q, qi) {
        const a = s.answers[qi] !== undefined ? s.answers[qi] : s.answers[String(qi)];
        const info = perQ[qi];
        if (a === undefined || a === null) { info.unattempted += 1; return; }
        if (typeof a !== "number") { info.unattempted += 1; return; }
        if (q.type === "math") {
          const tol = Number(q.tolerance) || 0;
          if (Math.abs(a - q.numericAnswer) <= tol) info.correctCount += 1;
          else { info.wrongCount += 1; info.wrongUsers.push({ name: s.userName || "—", chosen: a }); totalWrong += 1; }
          return;
        }
        if (a < 0 || a >= (q.options || []).length) { info.unattempted += 1; return; }
        info.optionCounts[a] = (info.optionCounts[a] || 0) + 1;
        if (a === q.answer) info.correctCount += 1;
        else { info.wrongCount += 1; info.wrongUsers.push({ name: s.userName || "—", chosen: a }); totalWrong += 1; }
      });
    });
    perQ.forEach(function (info) {
      const attempted = info.correctCount + info.wrongCount;
      info.attempted = attempted;
      info.wrongPct = attempted > 0 ? Math.round((info.wrongCount / attempted) * 100) : 0;
      let trapIdx = -1, trapCount = 0;
      info.optionCounts.forEach(function (count, oi) {
        if (oi === info.correct) return;
        if (count > trapCount) { trapCount = count; trapIdx = oi; }
      });
      info.trapOption = trapIdx; info.trapCount = trapCount;
      info.trapPct = info.wrongCount > 0 ? Math.round((trapCount / info.wrongCount) * 100) : 0;
      if (info.wrongPct >= 50) info.level = "hard";
      else if (info.wrongPct >= 20) info.level = "medium";
      else info.level = "easy";
    });
    const sorted = perQ.slice().sort(function (a, b) {
      if (b.wrongPct !== a.wrongPct) return b.wrongPct - a.wrongPct;
      return b.wrongCount - a.wrongCount;
    });
    const toughest = (sorted[0] && sorted[0].wrongCount > 0) ? sorted[0] : null;
    return { perQ, totalWrong, totalSubsWithAnswers, toughest };
  }

  function buildAnalysisCard(info, hero) {
    const isHot = info.wrongPct >= 40;
    const badgeClass = "qbadge" + (isHot ? " is-hot" : "");
    const levelClass = "qbadge level-" + info.level;
    const optionsHtml = info.options.map(function (opt, oi) {
      const isCorrect = oi === info.correct;
      const isTrap = oi === info.trapOption && info.trapCount > 0;
      const count = info.optionCounts[oi] || 0;
      let cls = "optrow";
      if (isCorrect) cls += " is-correct";
      else if (isTrap) cls += " is-trap";
      else if (count > 0) cls += " has-wrong";
      return '<div class="' + cls + '"><span class="optkey">' + "ABCD".charAt(oi) + '</span><span class="opttext">' + esc(opt) + "</span>" + (isTrap ? '<span class="trap-tag">Trap</span>' : "") + '<span class="optcount">' + count + "</span></div>";
    }).join("");
    const seeBtn = info.wrongCount > 0 ? '<button class="btn btn-sm" type="button" data-analysis-who="' + info.index + '">See ' + info.wrongCount + ' who got it wrong</button>' : '<span class="qfoot-meta">No wrong attempts</span>';
    const trapInfo = info.trapCount > 0 && info.trapOption >= 0 ? ' · <strong>Trap: ' + "ABCD".charAt(info.trapOption) + '</strong> (' + info.trapCount + '/' + info.wrongCount + ")" : "";
    const headLeft = hero
      ? '<div class="qhead-left"><span class="qnum">Q' + (info.index + 1) + '</span><span class="qbadge is-toughest">Toughest</span><span class="' + levelClass + '">' + info.level.toUpperCase() + "</span></div>"
      : '<div class="qhead-left"><span class="qnum">Q' + (info.index + 1) + '</span><span class="' + levelClass + '">' + info.level.toUpperCase() + "</span></div>";
    return '<div class="qcard' + (hero ? " is-hero" : "") + '">' +
      '<div class="qhead">' + headLeft + '<span class="' + badgeClass + '">' + info.wrongCount + " wrong of " + info.attempted + " attempted</span></div>" +
      '<p class="qtext">' + esc(info.q) + "</p>" + optionsHtml +
      '<div class="qfoot"><span class="qfoot-meta"><strong>' + info.wrongPct + "%</strong> wrong" + trapInfo + "</span>" +
      '<div class="qfoot-actions"><button class="btn btn-sm" type="button" data-analysis-share="' + info.index + '">Share</button>' + seeBtn + "</div></div></div>";
  }

  function attachAnalysisHandlers(root) {
    root.querySelectorAll("button[data-analysis-who]").forEach(function (btn) { btn.addEventListener("click", function () { openWho(parseInt(btn.getAttribute("data-analysis-who"), 10)); }); });
    root.querySelectorAll("button[data-analysis-share]").forEach(function (btn) { btn.addEventListener("click", function () { openShare(parseInt(btn.getAttribute("data-analysis-share"), 10)); }); });
  }
  function renderAnalysisByQ() {
    const wrap = $id("analysisByQ");
    if (!wrap || !state.analysisCache) return;
    wrap.innerHTML = state.analysisCache.perQ.map(function (info) { return buildAnalysisCard(info, false); }).join("");
    attachAnalysisHandlers(wrap);
  }
  function renderAnalysisByTough() {
    const wrap = $id("analysisByTough");
    if (!wrap || !state.analysisCache) return;
    const t = state.analysisCache.toughest;
    if (!t) { wrap.innerHTML = '<div class="empty-state">Not enough data yet.</div>'; return; }
    const banner = '<div class="hero-banner"><div class="hero-banner-icon"><svg viewBox="0 0 24 24"><path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg></div><div class="hero-banner-text"><strong>Toughest question of this test</strong><span>Based on wrong % among attempted students</span></div><div class="hero-banner-pct">' + t.wrongPct + "<small>%</small></div></div>";
    const card = buildAnalysisCard(t, true);
    const futureNote = '<div class="future-note"><p><strong>More analysis coming soon.</strong><br>Question-level time spent, option distribution trends across batches, and per-student comparison.</p></div>';
    wrap.innerHTML = banner + card + futureNote;
    attachAnalysisHandlers(wrap);
  }

  let whoModalEl = null;
  function ensureWhoModal() {
    if (whoModalEl) return whoModalEl;
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay"; overlay.id = "whoOverlay"; overlay.hidden = true;
    overlay.innerHTML = '<div class="modal" style="max-width:480px;padding:0;"><div class="submission-detail-head"><div><h2 id="whoTitle">—</h2><p id="whoSubtitle">—</p></div><button type="button" class="submission-detail-close" id="whoClose" aria-label="Close"><svg viewBox="0 0 24 24"><path d="m6 6 12 12"></path><path d="M18 6 6 18"></path></svg></button></div><div class="submission-detail-body" id="whoBody"></div></div>';
    document.body.appendChild(overlay);
    function close() { overlay.hidden = true; overlay.classList.remove("open"); }
    overlay.querySelector("#whoClose").addEventListener("click", close);
    overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !overlay.hidden) close(); });
    whoModalEl = overlay;
    return overlay;
  }
  function openWho(qi) {
    if (!state.analysisCache) return;
    const info = state.analysisCache.perQ[qi];
    if (!info) return;
    const overlay = ensureWhoModal();
    overlay.querySelector("#whoTitle").textContent = "Q" + (qi + 1) + " · " + info.wrongCount + " wrong";
    overlay.querySelector("#whoSubtitle").textContent = info.q;
    const bodyEl = overlay.querySelector("#whoBody");
    bodyEl.innerHTML = info.wrongUsers.length
      ? info.wrongUsers.map(function (u) { return '<div class="analysis-user-row"><span class="analysis-user-name">' + esc(u.name) + '</span><span class="analysis-user-choice">Chose ' + (info.type === "math" ? u.chosen : "ABCD".charAt(u.chosen)) + "</span></div>"; }).join("")
      : '<div class="empty-state">No wrong attempts</div>';
    overlay.hidden = false; overlay.classList.add("open");
    const c = overlay.querySelector("#whoClose"); if (c) setTimeout(function () { c.focus(); }, 40);
  }

  let shareModalEl = null;
  let currentShareQI = -1;
  function ensureShareModal() {
    if (shareModalEl) return shareModalEl;
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay"; overlay.id = "shareOverlay"; overlay.hidden = true;
    overlay.innerHTML = '<div class="modal" style="max-width:620px;padding:0;"><div class="submission-detail-head"><div><h2>Share question</h2><p>Preview the image before sharing</p></div><button type="button" class="submission-detail-close" id="shareClose" aria-label="Close"><svg viewBox="0 0 24 24"><path d="m6 6 12 12"></path><path d="M18 6 6 18"></path></svg></button></div><div class="submission-detail-body"><div class="share-preview"><canvas id="shareCanvas"></canvas></div><div class="share-actions"><button class="btn btn-primary" id="shareWaBtn" type="button">Share to WhatsApp</button><button class="btn" id="shareDlBtn" type="button">Download image</button><button class="btn" id="shareCopyBtn" type="button">Copy text</button></div></div></div>';
    document.body.appendChild(overlay);
    function close() { overlay.hidden = true; overlay.classList.remove("open"); }
    overlay.querySelector("#shareClose").addEventListener("click", close);
    overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !overlay.hidden) close(); });
    overlay.querySelector("#shareWaBtn").addEventListener("click", function () {
      if (!state.analysisCache) return;
      const info = state.analysisCache.perQ[currentShareQI];
      if (!info) return;
      window.open("https://wa.me/?text=" + encodeURIComponent(buildShareText(info)), "_blank");
    });
    overlay.querySelector("#shareDlBtn").addEventListener("click", function () {
      const canvas = overlay.querySelector("#shareCanvas");
      const link = document.createElement("a");
      link.download = "preparekora-q" + (currentShareQI + 1) + ".png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    });
    overlay.querySelector("#shareCopyBtn").addEventListener("click", function () {
      if (!state.analysisCache) return;
      const info = state.analysisCache.perQ[currentShareQI];
      if (!info) return;
      const btn = overlay.querySelector("#shareCopyBtn");
      copyText(buildShareText(info)).then(function () { btn.textContent = "Copied!"; setTimeout(function () { btn.textContent = "Copy text"; }, 1500); });
    });
    shareModalEl = overlay;
    return overlay;
  }
  function openShare(qi) {
    if (!state.analysisCache) return;
    const info = state.analysisCache.perQ[qi];
    if (!info) return;
    currentShareQI = qi;
    const overlay = ensureShareModal();
    buildShareCanvas(overlay.querySelector("#shareCanvas"), info);
    overlay.hidden = false; overlay.classList.add("open");
  }
  function buildShareText(info) {
    if (info.type === "math") {
      return "Q" + (info.index + 1) + ". " + info.q + "\n\n" + info.wrongCount + " of " + info.attempted + " got this wrong (" + info.wrongPct + "%)";
    }
    return "Q" + (info.index + 1) + ". " + info.q + "\n\n" + info.options.map(function (o, i) { return "ABCD".charAt(i) + ". " + o; }).join("\n") + "\n---------------------\n" + info.wrongCount + " of " + info.attempted + " got this wrong (" + info.wrongPct + "%)\nCorrect: " + "ABCD".charAt(info.correct);
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function wrapText(ctx, text, maxWidth) {
    const words = String(text).split(/\s+/);
    const lines = [];
    let line = "";
    words.forEach(function (word) {
      const cand = line ? line + " " + word : word;
      if (ctx.measureText(cand).width > maxWidth && line) { lines.push(line); line = word; }
      else line = cand;
    });
    if (line) lines.push(line);
    return lines;
  }
  function buildShareCanvas(canvas, info) {
    const testMeta = state.tests.find(function (x) { return x.id === state.analysisTestId; });
    const testTitle = testMeta ? testMeta.title : "";
    const publisher = testMeta ? testMeta.publisherName : "";
    const scale = 2, W = 720, H = 900;
    canvas.width = W * scale; canvas.height = H * scale;
    const ctx = canvas.getContext("2d");
    ctx.scale(scale, scale); ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "#e7e7e7"; ctx.lineWidth = 2;
    roundRect(ctx, 1, 1, W - 2, H - 2, 16); ctx.stroke();
    const pad = 40;
    let y = 60;
    ctx.font = "600 22px Arial, Helvetica, sans-serif"; ctx.fillStyle = "#111111";
    ctx.fillText("preparekora", pad, y);
    const bw = ctx.measureText("preparekora").width;
    ctx.font = "400 22px Arial, Helvetica, sans-serif"; ctx.fillStyle = "#858585"; ctx.fillText(".in", pad + bw, y);
    ctx.font = "600 11px Arial, Helvetica, sans-serif"; ctx.fillStyle = "#737373";
    ctx.textAlign = "right"; ctx.fillText("WRONG ANALYSIS", W - pad, y); ctx.textAlign = "left";
    y += 26;
    ctx.strokeStyle = "#e7e7e7"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(W - pad, y); ctx.stroke();
    y += 28;
    ctx.font = "400 13px Arial, Helvetica, sans-serif"; ctx.fillStyle = "#737373";
    if (testTitle) { wrapText(ctx, testTitle, W - pad * 2).slice(0, 2).forEach(function (line) { ctx.fillText(line, pad, y); y += 18; }); y += 6; }
    if (publisher) { ctx.font = "400 12px Arial, Helvetica, sans-serif"; ctx.fillStyle = "#737373"; ctx.fillText("By " + publisher, pad, y); }
    y += 24;
    ctx.strokeStyle = "#e7e7e7"; ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(W - pad, y); ctx.stroke();
    y += 26;
    ctx.font = "600 11px Arial, Helvetica, sans-serif"; ctx.fillStyle = "#737373";
    ctx.fillText("Q" + (info.index + 1), pad, y);
    const levelText = info.level.toUpperCase();
    ctx.font = "600 10px Arial, Helvetica, sans-serif";
    const levelColor = info.level === "hard" ? "#b91c1c" : info.level === "medium" ? "#b45309" : "#15803d";
    const levelBg = info.level === "hard" ? "#fef2f2" : info.level === "medium" ? "#fef3c7" : "#f0fdf4";
    const lw = ctx.measureText(levelText).width + 14;
    const levelX = pad + 30;
    ctx.fillStyle = levelBg; roundRect(ctx, levelX, y - 11, lw, 16, 8); ctx.fill();
    ctx.fillStyle = levelColor; ctx.fillText(levelText, levelX + 7, y);
    y += 20;
    ctx.font = "600 16px Arial, Helvetica, sans-serif"; ctx.fillStyle = "#111111";
    wrapText(ctx, info.q, W - pad * 2).forEach(function (line) { ctx.fillText(line, pad, y); y += 22; });
    y += 10;
    if (info.type !== "math") {
      const optH = 40;
      info.options.forEach(function (opt, oi) {
        const isCorrect = oi === info.correct;
        const isTrap = oi === info.trapOption && info.trapCount > 0;
        const count = info.optionCounts[oi] || 0;
        if (isCorrect) { ctx.strokeStyle = "#15803d"; ctx.lineWidth = 1.5; ctx.fillStyle = "#f0fdf4"; }
        else if (isTrap) { ctx.strokeStyle = "#b91c1c"; ctx.lineWidth = 2; ctx.fillStyle = "#fef2f2"; }
        else { ctx.strokeStyle = "#e7e7e7"; ctx.lineWidth = 1; ctx.fillStyle = "#ffffff"; }
        roundRect(ctx, pad, y, W - pad * 2, optH, 8); ctx.fill(); ctx.stroke();
        const keyX = pad + 14, keyY = y + optH / 2;
        ctx.beginPath(); ctx.arc(keyX + 10, keyY, 10, 0, Math.PI * 2);
        if (isCorrect) { ctx.fillStyle = "#15803d"; ctx.fill(); }
        else if (isTrap) { ctx.fillStyle = "#b91c1c"; ctx.fill(); }
        else { ctx.fillStyle = "#ffffff"; ctx.fill(); ctx.strokeStyle = "#e7e7e7"; ctx.lineWidth = 1; ctx.stroke(); }
        ctx.font = "600 11px Arial, Helvetica, sans-serif"; ctx.fillStyle = (isCorrect || isTrap) ? "#ffffff" : "#737373";
        ctx.textAlign = "center"; ctx.fillText("ABCD".charAt(oi), keyX + 10, keyY + 4); ctx.textAlign = "left";
        ctx.font = "500 13px Arial, Helvetica, sans-serif"; ctx.fillStyle = isCorrect ? "#14532d" : isTrap ? "#7f1d1d" : "#171717";
        const optStartX = pad + 40, optRightLimit = W - pad - 100;
        const optLines = wrapText(ctx, opt, optRightLimit - optStartX).slice(0, 2);
        let optY = y + (optLines.length === 1 ? optH / 2 + 4 : optH / 2 - 6);
        optLines.forEach(function (line) { ctx.fillText(line, optStartX, optY); optY += 15; });
        const badgeText = String(count);
        ctx.font = "600 11px Arial, Helvetica, sans-serif";
        const bw2 = ctx.measureText(badgeText).width + 16;
        const badgeX = W - pad - bw2 - 10;
        if (isCorrect) ctx.fillStyle = "#15803d"; else if (isTrap) ctx.fillStyle = "#b91c1c"; else ctx.fillStyle = "#f7f7f7";
        roundRect(ctx, badgeX, keyY - 9, bw2, 18, 9); ctx.fill();
        ctx.fillStyle = (isCorrect || isTrap) ? "#ffffff" : "#737373"; ctx.textAlign = "center";
        ctx.fillText(badgeText, badgeX + bw2 / 2, keyY + 4); ctx.textAlign = "left";
        if (isTrap) { ctx.font = "700 9px Arial, Helvetica, sans-serif"; ctx.fillStyle = "#b91c1c"; ctx.textAlign = "right"; ctx.fillText("TRAP", W - pad - 8, y - 4); ctx.textAlign = "left"; }
        y += optH + 8;
      });
    } else {
      ctx.font = "400 13px Arial, Helvetica, sans-serif"; ctx.fillStyle = "#737373";
      ctx.fillText("Numeric answer required (via keypad)", pad, y); y += 22;
    }
    y += 8;
    ctx.strokeStyle = "#e7e7e7"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(W - pad, y); ctx.stroke();
    y += 24;
    ctx.font = "600 13px Arial, Helvetica, sans-serif"; ctx.fillStyle = "#111111";
    ctx.fillText(info.wrongCount + " of " + info.attempted + " got this wrong", pad, y);
    ctx.font = "500 13px Arial, Helvetica, sans-serif"; ctx.fillStyle = "#737373";
    ctx.textAlign = "right"; ctx.fillText(info.wrongPct + "%", W - pad, y); ctx.textAlign = "left";
    const footerY = H - 30;
    ctx.strokeStyle = "#e7e7e7"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad, footerY - 16); ctx.lineTo(W - pad, footerY - 16); ctx.stroke();
    ctx.font = "400 11px Arial, Helvetica, sans-serif"; ctx.fillStyle = "#737373";
    ctx.fillText("preparekora.in", pad, footerY);
    ctx.textAlign = "right"; if (publisher) ctx.fillText("By " + publisher, W - pad, footerY); ctx.textAlign = "left";
  }

  /* ---------- SETTINGS ---------- */

  async function loadSettings() {
    const input = $id("displayNameInput");
    if (!input) return;
    try {
      const me = await api.me();
      state.admin = me;
      const nameEl = $id("adminDisplayName"); if (nameEl) nameEl.textContent = me.displayName || "";
      input.value = me.displayName || "";
      const errEl = $id("displayNameError"); if (errEl) errEl.hidden = true;
    } catch (err) { if (err.status === 401) showLogin(); }
  }

  const settingsForm = $id("settingsForm");
  if (settingsForm) {
    settingsForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      const input = $id("displayNameInput");
      const errEl = $id("displayNameError");
      const btn = $id("saveNameBtn");
      const value = input.value.trim();
      errEl.hidden = true;
      if (!value || value.length < 2) { errEl.textContent = t("nameTooShort"); errEl.hidden = false; return; }
      if (value.length > 60) { errEl.textContent = t("nameTooLong"); errEl.hidden = false; return; }
      btn.disabled = true;
      try {
        const res = await api.updateMe(value);
        state.admin = res;
        const nameEl = $id("adminDisplayName"); if (nameEl) nameEl.textContent = res.displayName;
        toast(t("nameUpdated"), "success");
      } catch (err) {
        if (err.status === 401) return showLogin();
        errEl.textContent = err.message || "Error"; errEl.hidden = false;
      } finally { btn.disabled = false; }
    });
  }

  async function loadInterruptionSettings() {
    try {
      const res = await api.getSettings();
      const cb = $id("interruptionEnabled"), dur = $id("interruptionDuration");
      if (cb) cb.checked = res.interruptionEnabled !== false;
      if (dur) dur.value = res.interruptionDuration || 5;
      const errEl = $id("interruptionError"); if (errEl) errEl.hidden = true;
    } catch (err) {}
  }

  const interruptionForm = $id("interruptionForm");
  if (interruptionForm) {
    interruptionForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      const errEl = $id("interruptionError"), btn = $id("saveInterruptionBtn");
      errEl.hidden = true;
      const enabled = $id("interruptionEnabled").checked;
      const duration = Number($id("interruptionDuration").value);
      if (!Number.isInteger(duration) || duration < 1 || duration > 120) {
        errEl.textContent = "Duration must be between 1 and 120 minutes"; errEl.hidden = false; return;
      }
      btn.disabled = true;
      try {
        await api.updateSettings({ interruptionEnabled: enabled, interruptionDuration: duration });
        toast("Settings saved", "success");
      } catch (err) {
        if (err.status === 401) return showLogin();
        errEl.textContent = err.message || "Save failed"; errEl.hidden = false;
      } finally { btn.disabled = false; }
    });
  }

  /* ---------- EDITOR ---------- */

  const newTestBtn = $id("newTestBtn");
  if (newTestBtn) {
    newTestBtn.addEventListener("click", function () {
      state.editing = { id: null, status: "draft", title: "", minutes: 10, questions: [blankQuestion()] };
      renderEditor();
      showScreen("editor");
    });
  }

  const editorBackBtn = $id("editorBackBtn");
  if (editorBackBtn) {
    editorBackBtn.addEventListener("click", function () {
      state.editing = null;
      showScreen("dashboard");
      loadTests();
    });
  }

  async function openEditor(id) {
    if (window.PKLoader) window.PKLoader.show();
    try {
      const res = await api.getOwn(id);
      if (!res || !res.test) throw new Error("Test not found");
      state.editing = {
        id: res.test.id, status: res.test.status, title: res.test.title,
        minutes: res.test.minutes,
        questions: (res.test.questions || []).map(function (q) {
          const type = getQuestionType(q);
          const hasOptions = Array.isArray(q.options) && q.options.length === 4 && typeof q.answer === "number";
          const detectedMathMode = type === "math" ? (hasOptions ? "options" : "keypad") : "options";
          return {
            type: type,
            q: q.q || "",
            latex: q.latex || "",
            imageBase64: q.imageBase64 || "",
            options: Array.isArray(q.options) && q.options.length === 4 ? q.options.slice() : ["", "", "", ""],
            optionImages: Array.isArray(q.optionImages) && q.optionImages.length === 4 ? q.optionImages.slice() : ["", "", "", ""],
            answer: typeof q.answer === "number" ? q.answer : 0,
            numericAnswer: (typeof q.numericAnswer === "number") ? q.numericAnswer : "",
            tolerance: (typeof q.tolerance === "number") ? q.tolerance : 0,
            mathMode: detectedMathMode
          };
        })
      };
      renderEditor();
      showScreen("editor");
    } catch (err) {
      if (err.status === 401) return showLogin();
      toast(err.message || "Error", "error");
    } finally { if (window.PKLoader) window.PKLoader.hide(); }
  }

  function blankQuestion() {
    return {
      type: "mcq", q: "", latex: "", imageBase64: "",
      options: ["", "", "", ""], optionImages: ["", "", "", ""], answer: 0,
      numericAnswer: "", tolerance: 0, mathMode: "options"
    };
  }

  function renderEditor() {
    if (!state.editing) return;
    const isPublished = state.editing.status === "published";
    $id("editorHeading").textContent = state.editing.id ? (isPublished ? "Edit test" : "Edit draft") : "New test";
    $id("editorTitle").value = state.editing.title || "";
    $id("editorMinutes").value = state.editing.minutes || 10;
    $id("editorError").hidden = true;
    const saveDraftBtn = $id("saveDraftBtn"), publishBtn = $id("publishBtn");
    if (saveDraftBtn) { saveDraftBtn.removeAttribute("data-i18n"); saveDraftBtn.textContent = isPublished ? "Save changes" : t("saveDraft"); }
    if (publishBtn) { publishBtn.removeAttribute("data-i18n"); publishBtn.textContent = isPublished ? t("unpublish") : t("publishNow"); publishBtn.className = isPublished ? "btn btn-sm" : "btn btn-primary btn-sm"; }
    renderQuestionsList();
  }

  function renderQuestionsList() {
    const container = $id("questionsContainer");
    if (!container || !state.editing) return;
    container.innerHTML = "";
    state.editing.questions.forEach(function (question, qi) {
      const block = document.createElement("div");
      block.className = "editor-question";
      const head = document.createElement("div");
      head.className = "editor-question-head";
      const numWrap = document.createElement("div");
      numWrap.className = "editor-question-num-wrap";
      const num = document.createElement("span");
      num.className = "editor-question-number";
      num.textContent = String(qi + 1);
      const label = document.createElement("span");
      label.className = "editor-question-label";
      label.textContent = "Question " + (qi + 1);
      numWrap.appendChild(num); numWrap.appendChild(label);
      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "editor-remove-btn";
      removeBtn.textContent = "Remove";
      removeBtn.addEventListener("click", function () {
        if (state.editing.questions.length <= 1) { toast(t("atLeastOneQuestion"), "error"); return; }
        state.editing.questions.splice(qi, 1);
        renderQuestionsList();
      });
      head.appendChild(numWrap); head.appendChild(removeBtn); block.appendChild(head);
      const typeRow = document.createElement("div");
      typeRow.className = "form-field";
      const typeLabel = document.createElement("label");
      typeLabel.className = "form-label";
      typeLabel.textContent = "Question type";
      const typeSelect = document.createElement("select");
      typeSelect.className = "editor-type-select";
      [["mcq", "MCQ (4 options)"], ["math", "Math (numeric answer)"], ["reasoning", "Reasoning (MCQ)"]].forEach(function (pair) {
        const opt = document.createElement("option");
        opt.value = pair[0]; opt.textContent = pair[1];
        if (question.type === pair[0]) opt.selected = true;
        typeSelect.appendChild(opt);
      });
      typeSelect.addEventListener("change", function () {
        question.type = typeSelect.value;
        renderQuestionsList();
      });
      typeRow.appendChild(typeLabel); typeRow.appendChild(typeSelect);
      block.appendChild(typeRow);
      const qField = document.createElement("div");
      qField.className = "form-field";
      const qLabel = document.createElement("label");
      qLabel.className = "form-label"; qLabel.textContent = "Question";
      const qInput = document.createElement("textarea");
      qInput.className = "form-textarea";
      qInput.rows = 2;
      qInput.value = question.q;
      qInput.placeholder = "Type the question";
      qInput.addEventListener("input", function () { question.q = qInput.value; });
      qField.appendChild(qLabel); qField.appendChild(qInput); block.appendChild(qField);
      const latexField = document.createElement("div");
      latexField.className = "form-field";
      const latexLabel = document.createElement("label");
      latexLabel.className = "form-label";
      latexLabel.innerHTML = 'LaTeX formula <span class="form-required">(optional)</span>';
      const latexInput = document.createElement("input");
      latexInput.type = "text";
      latexInput.className = "form-input";
      latexInput.placeholder = "e.g. SI = \\frac{P \\times R \\times T}{100}";
      latexInput.value = question.latex || "";
      latexInput.addEventListener("input", function () { question.latex = latexInput.value; });
      latexField.appendChild(latexLabel); latexField.appendChild(latexInput); block.appendChild(latexField);
      const imgField = document.createElement("div");
      imgField.className = "form-field";
      const imgLabel = document.createElement("label");
      imgLabel.className = "form-label";
      imgLabel.innerHTML = 'Question image <span class="form-required">(optional)</span>';
      imgField.appendChild(imgLabel);
      const imgActions = document.createElement("div");
      imgActions.className = "editor-img-actions";
      const imgFile = document.createElement("input");
      imgFile.type = "file";
      imgFile.accept = "image/*";
      imgFile.style.display = "none";
      const imgChooseBtn = document.createElement("button");
      imgChooseBtn.type = "button";
      imgChooseBtn.className = "btn btn-sm";
      imgChooseBtn.textContent = question.imageBase64 ? "Change image" : "Upload image";
      imgChooseBtn.addEventListener("click", function () { imgFile.click(); });
      imgFile.addEventListener("change", async function () {
        const f = imgFile.files && imgFile.files[0];
        if (!f) return;
        if (f.size > 500 * 1024) { toast("Image too large (max 500KB)", "error"); return; }
        try {
          const b64 = await fileToBase64(f);
          if (b64.length > MAX_IMAGE_CHARS) { toast("Image too large after encoding", "error"); return; }
          question.imageBase64 = b64;
          renderQuestionsList();
        } catch (e) { toast("Failed to read image", "error"); }
      });
      imgActions.appendChild(imgChooseBtn);
      if (question.imageBase64) {
        const rmImg = document.createElement("button");
        rmImg.type = "button"; rmImg.className = "btn btn-sm"; rmImg.textContent = "Remove";
        rmImg.addEventListener("click", function () { question.imageBase64 = ""; renderQuestionsList(); });
        imgActions.appendChild(rmImg);
      }
      imgActions.appendChild(imgFile);
      imgField.appendChild(imgActions);
      if (question.imageBase64) {
        const preview = document.createElement("img");
        preview.src = question.imageBase64;
        preview.className = "editor-img-preview";
        imgField.appendChild(preview);
      }
      block.appendChild(imgField);
      if (question.type === "math") {
        const modeRow = document.createElement("div");
        modeRow.className = "form-field";
        const modeLabel = document.createElement("label");
        modeLabel.className = "form-label";
        modeLabel.textContent = "Answer method";
        const modeWrap = document.createElement("div");
        modeWrap.style.display = "flex";
        modeWrap.style.gap = "16px";
        modeWrap.style.flexWrap = "wrap";
        [["options", "Options (4 choices)"], ["keypad", "Keypad (numeric)"]].forEach(function (pair) {
          const lab = document.createElement("label");
          lab.style.display = "flex";
          lab.style.alignItems = "center";
          lab.style.gap = "6px";
          lab.style.cursor = "pointer";
          lab.style.fontSize = "13px";
          const r = document.createElement("input");
          r.type = "radio";
          r.name = "mathmode-" + qi;
          r.value = pair[0];
          r.checked = (question.mathMode || "options") === pair[0];
          r.addEventListener("change", function () {
            question.mathMode = pair[0];
            renderQuestionsList();
          });
          lab.appendChild(r);
          lab.appendChild(document.createTextNode(pair[1]));
          modeWrap.appendChild(lab);
        });
        modeRow.appendChild(modeLabel);
        modeRow.appendChild(modeWrap);
        block.appendChild(modeRow);
        if ((question.mathMode || "options") === "options") {
          const optLabel = document.createElement("div");
          optLabel.className = "form-label";
          optLabel.style.marginTop = "14px";
          optLabel.textContent = "Options — click the circle to mark the correct answer";
          block.appendChild(optLabel);
          const optWrap = document.createElement("div");
          optWrap.className = "editor-options";
          question.options.forEach(function (_, oi) {
            const row = document.createElement("div");
            row.className = "editor-option" + (question.answer === oi ? " is-answer" : "");
            const radio = document.createElement("input");
            radio.type = "radio";
            radio.name = "answer-q" + qi;
            radio.checked = question.answer === oi;
            radio.className = "editor-option-radio";
            radio.setAttribute("aria-label", "Mark option " + "ABCD".charAt(oi) + " as correct");
            radio.addEventListener("change", function () {
              question.answer = oi;
              block.querySelectorAll(".editor-option").forEach(function (r, idx) { r.classList.toggle("is-answer", idx === oi); });
            });
            const key = document.createElement("span");
            key.className = "editor-option-key";
            key.textContent = "ABCD".charAt(oi);
            const input = document.createElement("input");
            input.type = "text";
            input.className = "editor-option-input";
            input.placeholder = "Option " + "ABCD".charAt(oi) + " (number or value)";
            input.value = question.options[oi];
            input.addEventListener("input", function () { question.options[oi] = input.value; });
            row.appendChild(radio); row.appendChild(key); row.appendChild(input);
            optWrap.appendChild(row);
          });
          block.appendChild(optWrap);
        } else {
          const numField = document.createElement("div");
          numField.className = "form-field";
          const numLabel = document.createElement("label");
          numLabel.className = "form-label";
          numLabel.textContent = "Numeric answer";
          const numInput = document.createElement("input");
          numInput.type = "number";
          numInput.className = "form-input";
          numInput.step = "any";
          numInput.value = question.numericAnswer === "" ? "" : String(question.numericAnswer);
          numInput.addEventListener("input", function () { question.numericAnswer = numInput.value; });
          numField.appendChild(numLabel); numField.appendChild(numInput);
          block.appendChild(numField);
          const tolField = document.createElement("div");
          tolField.className = "form-field";
          const tolLabel = document.createElement("label");
          tolLabel.className = "form-label";
          tolLabel.innerHTML = 'Tolerance <span class="form-required">(optional, default 0)</span>';
          const tolInput = document.createElement("input");
          tolInput.type = "number";
          tolInput.className = "form-input";
          tolInput.step = "any";
          tolInput.min = "0";
          tolInput.value = String(question.tolerance || 0);
          tolInput.addEventListener("input", function () { question.tolerance = Number(tolInput.value) || 0; });
          tolField.appendChild(tolLabel); tolField.appendChild(tolInput);
          block.appendChild(tolField);
        }
      } else {
        const optLabel = document.createElement("div");
        optLabel.className = "form-label";
        optLabel.style.marginTop = "14px";
        optLabel.textContent = "Options — click the circle to mark the correct answer";
        block.appendChild(optLabel);
        const optWrap = document.createElement("div");
        optWrap.className = "editor-options";
        question.options.forEach(function (_, oi) {
          const row = document.createElement("div");
          row.className = "editor-option" + (question.answer === oi ? " is-answer" : "");
          const radio = document.createElement("input");
          radio.type = "radio";
          radio.name = "answer-q" + qi;
          radio.checked = question.answer === oi;
          radio.className = "editor-option-radio";
          radio.setAttribute("aria-label", "Mark option " + "ABCD".charAt(oi) + " as correct");
          radio.addEventListener("change", function () {
            question.answer = oi;
            block.querySelectorAll(".editor-option").forEach(function (r, idx) { r.classList.toggle("is-answer", idx === oi); });
          });
          const key = document.createElement("span");
          key.className = "editor-option-key";
          key.textContent = "ABCD".charAt(oi);
          const input = document.createElement("input");
          input.type = "text";
          input.className = "editor-option-input";
          input.placeholder = "Option " + "ABCD".charAt(oi);
          input.value = question.options[oi];
          input.addEventListener("input", function () { question.options[oi] = input.value; });
          row.appendChild(radio); row.appendChild(key); row.appendChild(input);
          optWrap.appendChild(row);
        });
        block.appendChild(optWrap);
      }
      const expWrapper = document.createElement("div");
      expWrapper.className = "editor-fields";
      expWrapper.innerHTML = '<span class="editor-fields-label">Explanation (optional)</span>';
      const expText = document.createElement("textarea");
      expText.className = "form-textarea";
      expText.rows = 2;
      expText.placeholder = "Explain the correct answer";
      expText.value = question.explanation || "";
      expText.addEventListener("input", function () { question.explanation = expText.value; });
      expWrapper.appendChild(expText);
      const expLatexRow = document.createElement("div");
      expLatexRow.className = "editor-row";
      expLatexRow.style.marginTop = "8px";
      const expLatexLabel = document.createElement("label");
      expLatexLabel.textContent = "LaTeX:";
      const expLatexInput = document.createElement("input");
      expLatexInput.type = "text";
      expLatexInput.placeholder = "Optional LaTeX for explanation";
      expLatexInput.value = question.explanationLatex || "";
      expLatexInput.addEventListener("input", function () { question.explanationLatex = expLatexInput.value; });
      expLatexRow.appendChild(expLatexLabel); expLatexRow.appendChild(expLatexInput);
      expWrapper.appendChild(expLatexRow);
      block.appendChild(expWrapper);
      container.appendChild(block);
    });
  }

  const addQuestionBtn = $id("addQuestionBtn");
  if (addQuestionBtn) {
    addQuestionBtn.addEventListener("click", function () {
      if (!state.editing) return;
      state.editing.questions.push(blankQuestion());
      renderQuestionsList();
      const container = $id("questionsContainer");
      if (container && container.lastElementChild) container.lastElementChild.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    if (!$id("importJsonBtn")) {
      const importBtn = document.createElement("button");
      importBtn.id = "importJsonBtn";
      importBtn.type = "button";
      importBtn.className = "btn btn-sm";
      importBtn.textContent = "Import JSON";
      importBtn.addEventListener("click", openEditorImportModal);
      addQuestionBtn.parentNode.insertBefore(importBtn, addQuestionBtn);
    }
  }

  function ensureEditorImportModal() {
    let overlay = $id("importModalOverlay");
    if (overlay) return overlay;
    overlay = document.createElement("div");
    overlay.id = "importModalOverlay";
    overlay.className = "import-modal-overlay";
    overlay.hidden = true;
    overlay.innerHTML = '<div class="import-modal"><h2>Import questions from JSON</h2><p class="import-hint">Array of questions or object with <code>title</code>, <code>minutes</code>, <code>questions</code>.</p><p class="import-hint" style="margin-top:6px;">Each question supports: <code>type</code> (mcq|math|reasoning), <code>q</code>, <code>latex</code>, <code>imageBase64</code>, <code>options</code>, <code>answer</code>, <code>numericAnswer</code>, <code>tolerance</code>, <code>explanation</code>.</p><textarea id="importTextarea" class="import-textarea" placeholder="Paste JSON here..."></textarea><p class="form-error" id="importError" hidden></p><div class="import-modal-actions"><button type="button" class="btn" id="importCancelBtn">Cancel</button><button type="button" class="btn btn-primary" id="importConfirmBtn">Import</button></div></div>';
    document.body.appendChild(overlay);
    const cancel = overlay.querySelector("#importCancelBtn");
    const confirm = overlay.querySelector("#importConfirmBtn");
    const ta = overlay.querySelector("#importTextarea");
    const errEl = overlay.querySelector("#importError");
    function close() { overlay.hidden = true; }
    cancel.addEventListener("click", close);
    overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !overlay.hidden) close(); });
    confirm.addEventListener("click", function () {
      errEl.hidden = true;
      const raw = ta.value.trim();
      if (!raw) { errEl.textContent = "Paste JSON first"; errEl.hidden = false; return; }
      let parsed;
      try { parsed = JSON.parse(raw); }
      catch (e) { errEl.textContent = "Invalid JSON: " + e.message; errEl.hidden = false; return; }
      let rawQuestions = null, title = null, minutes = null;
      if (Array.isArray(parsed)) rawQuestions = parsed;
      else if (parsed && typeof parsed === "object") {
        rawQuestions = parsed.questions;
        if (typeof parsed.title === "string") title = parsed.title;
        if (typeof parsed.minutes === "number") minutes = parsed.minutes;
      }
      if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) { errEl.textContent = "JSON must contain questions array"; errEl.hidden = false; return; }
      const cleaned = [];
      for (let i = 0; i < rawQuestions.length; i++) {
        const rq = rawQuestions[i]; const n = i + 1;
        if (!rq || typeof rq !== "object") { errEl.textContent = "Question " + n + ": invalid"; errEl.hidden = false; return; }
        if (typeof rq.q !== "string" || !rq.q.trim()) { errEl.textContent = "Question " + n + ": missing q"; errEl.hidden = false; return; }
        const type = getQuestionType(rq);
        const obj = {
          type: type, q: rq.q.trim(), latex: rq.latex || "", imageBase64: rq.imageBase64 || "",
          options: ["", "", "", ""], optionImages: ["", "", "", ""], answer: 0,
          numericAnswer: "", tolerance: 0,
          explanation: rq.explanation || "", explanationLatex: rq.explanationLatex || "",
          explanationImageBase64: rq.explanationImageBase64 || ""
        };
        if (type === "math") {
          const hasOptions = Array.isArray(rq.options) && rq.options.length === 4 && typeof rq.answer === "number";
          const hasNumeric = typeof rq.numericAnswer === "number" && isFinite(rq.numericAnswer);
          if (!hasOptions && !hasNumeric) { errEl.textContent = "Question " + n + ": math needs options+answer or numericAnswer"; errEl.hidden = false; return; }
          if (hasOptions) {
            for (let j = 0; j < 4; j++) {
              if (typeof rq.options[j] !== "string" || !rq.options[j].trim()) { errEl.textContent = "Question " + n + ": option " + (j + 1) + " empty"; errEl.hidden = false; return; }
            }
            if (rq.answer < 0 || rq.answer > 3) { errEl.textContent = "Question " + n + ": answer must be 0-3"; errEl.hidden = false; return; }
            obj.options = rq.options.map(function (o) { return o.trim(); });
            obj.answer = rq.answer;
          } else {
            obj.numericAnswer = rq.numericAnswer;
            obj.tolerance = (typeof rq.tolerance === "number" && rq.tolerance >= 0) ? rq.tolerance : 0;
          }
        } else {
          if (!Array.isArray(rq.options) || rq.options.length !== 4) { errEl.textContent = "Question " + n + ": 4 options required"; errEl.hidden = false; return; }
          for (let j = 0; j < 4; j++) { if (typeof rq.options[j] !== "string" || !rq.options[j].trim()) { errEl.textContent = "Question " + n + ": option " + (j + 1) + " empty"; errEl.hidden = false; return; } }
          if (typeof rq.answer !== "number" || rq.answer < 0 || rq.answer > 3) { errEl.textContent = "Question " + n + ": answer must be 0-3"; errEl.hidden = false; return; }
          obj.options = rq.options.map(function (o) { return o.trim(); });
          obj.answer = rq.answer;
        }
        cleaned.push(obj);
      }
      if (!state.editing) { close(); return; }
      const hasExisting = state.editing.questions.length > 0 && !(state.editing.questions.length === 1 && !state.editing.questions[0].q.trim());
      if (hasExisting) {
        const ok = window.confirm("Import " + cleaned.length + " question(s)?\n\nOK = Append\nCancel = Replace");
        if (ok) state.editing.questions = state.editing.questions.concat(cleaned);
        else state.editing.questions = cleaned.slice();
      } else state.editing.questions = cleaned.slice();
      if (title && !$id("editorTitle").value.trim()) $id("editorTitle").value = title.trim().slice(0, 200);
      if (minutes && Number.isInteger(minutes) && minutes >= 1 && minutes <= 180) $id("editorMinutes").value = minutes;
      state.editing.title = $id("editorTitle").value;
      state.editing.minutes = Number($id("editorMinutes").value) || state.editing.minutes;
      renderQuestionsList();
      close();
      ta.value = "";
      toast("Imported " + cleaned.length + " question(s)", "success");
    });
    return overlay;
  }

  function openEditorImportModal() {
    if (!state.editing) return;
    const overlay = ensureEditorImportModal();
    overlay.hidden = false;
    const ta = overlay.querySelector("#importTextarea");
    setTimeout(function () { if (ta) ta.focus(); }, 50);
  }

  function collectEditor() {
    const title = $id("editorTitle").value.trim();
    const minutes = Number($id("editorMinutes").value);
    if (!title) return { error: "Test title is required" };
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 180) return { error: "Duration must be between 1 and 180 minutes" };
    const questions = [];
    for (let i = 0; i < state.editing.questions.length; i++) {
      const raw = state.editing.questions[i];
      const n = i + 1;
      const type = getQuestionType(raw);
      if (!raw.q || !raw.q.trim()) return { error: "Question " + n + ": text is required" };
      const out = { type: type, q: raw.q.trim() };
      if (raw.latex && raw.latex.trim()) out.latex = raw.latex.trim();
      if (raw.imageBase64) out.imageBase64 = raw.imageBase64;
      if (raw.explanation && raw.explanation.trim()) out.explanation = raw.explanation.trim();
      if (raw.explanationLatex && raw.explanationLatex.trim()) out.explanationLatex = raw.explanationLatex.trim();
      if (raw.explanationImageBase64) out.explanationImageBase64 = raw.explanationImageBase64;
      if (type === "math") {
        const mode = raw.mathMode || "options";
        if (mode === "options") {
          const opts = raw.options.map(function (o) { return (o || "").trim(); });
          if (opts.some(function (o) { return !o; })) return { error: "Question " + n + ": all 4 options required" };
          out.options = opts;
          if (typeof raw.answer !== "number" || raw.answer < 0 || raw.answer > 3) return { error: "Question " + n + ": select correct answer" };
          out.answer = raw.answer;
        } else {
          const num = Number(raw.numericAnswer);
          if (raw.numericAnswer === "" || !isFinite(num)) return { error: "Question " + n + ": numeric answer required" };
          out.numericAnswer = num;
          out.tolerance = (typeof raw.tolerance === "number" && raw.tolerance >= 0) ? raw.tolerance : 0;
        }
      } else {
        const opts = raw.options.map(function (o) { return (o || "").trim(); });
        if (opts.some(function (o) { return !o; })) return { error: "Question " + n + ": all 4 options required" };
        out.options = opts;
        if (raw.optionImages && raw.optionImages.some(function (x) { return x; })) out.optionImages = raw.optionImages;
        if (typeof raw.answer !== "number" || raw.answer < 0 || raw.answer > 3) return { error: "Question " + n + ": select correct answer" };
        out.answer = raw.answer;
      }
      questions.push(out);
    }
    if (questions.length === 0) return { error: "Add at least one question" };
    return { payload: { title: title, minutes: minutes, questions: questions } };
  }

  async function saveEditor(action) {
    const errEl = $id("editorError");
    errEl.hidden = true;
    const collected = collectEditor();
    if (collected.error) { errEl.textContent = collected.error; errEl.hidden = false; errEl.scrollIntoView({ behavior: "smooth", block: "center" }); return; }
    const payload = collected.payload;
    const saveDraftBtn = $id("saveDraftBtn"), publishBtn = $id("publishBtn");
    saveDraftBtn.disabled = true; publishBtn.disabled = true;
    try {
      if (state.editing.id) await api.updateTest(state.editing.id, payload);
      else { const created = await api.createTest(payload); state.editing.id = created.test.id; }
      if (action === "publish") { await new Promise(function (r) { setTimeout(r, 250); }); await api.publish(state.editing.id); toast(t("testPublished"), "success"); }
      else if (action === "unpublish") { await api.unpublish(state.editing.id); toast(t("testUnpublished")); }
      else { toast(t("testUpdated")); }
      state.editing = null;
      showScreen("dashboard");
      await loadTests();
    } catch (err) {
      if (err.status === 401) return showLogin();
      errEl.textContent = err.message || "Save failed";
      errEl.hidden = false;
      errEl.scrollIntoView({ behavior: "smooth", block: "center" });
    } finally { saveDraftBtn.disabled = false; publishBtn.disabled = false; }
  }

  const saveDraftBtn = $id("saveDraftBtn");
  if (saveDraftBtn) saveDraftBtn.addEventListener("click", function () { saveEditor("save"); });

  const publishBtn = $id("publishBtn");
  if (publishBtn) {
    publishBtn.addEventListener("click", function () {
      const isPublished = state.editing && state.editing.status === "published";
      if (isPublished) { if (!window.confirm("Unpublish this test?")) return; saveEditor("unpublish"); }
      else { if (!window.confirm(t("confirmPublish"))) return; saveEditor("publish"); }
    });
  }

  /* ---------- MOBILE MENU ---------- */

  const menuToggle = $id("menuToggle"), menuPanel = $id("menuPanel"), menuIcon = $id("menuIcon");
  const hamburgerSVG = '<path d="M4 7h16"></path><path d="M4 12h16"></path><path d="M4 17h16"></path>';
  const closeSVG = '<path d="m6 6 12 12"></path><path d="M18 6 6 18"></path>';
  function closeMenu() { if (!menuPanel || !menuToggle || !menuIcon) return; menuPanel.classList.remove("open"); menuToggle.setAttribute("aria-expanded", "false"); menuIcon.innerHTML = hamburgerSVG; }
  if (menuToggle && menuPanel && menuIcon) {
    menuToggle.addEventListener("click", function (e) {
      e.stopPropagation();
      if (menuPanel.classList.contains("open")) closeMenu();
      else { menuPanel.classList.add("open"); menuToggle.setAttribute("aria-expanded", "true"); menuIcon.innerHTML = closeSVG; }
    });
    document.addEventListener("click", function (e) { if (menuPanel.classList.contains("open") && !menuPanel.contains(e.target) && !menuToggle.contains(e.target)) closeMenu(); });
    menuPanel.querySelectorAll("a").forEach(function (link) { link.addEventListener("click", closeMenu); });
  }
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeMenu(); });

  document.addEventListener("pk:langchange", function () {
    if (screens.dashboard && !screens.dashboard.hidden && state.tests.length) renderTestsList();
    if (state.editing && screens.editor && !screens.editor.hidden) renderEditor();
    if (state.submissionsTestId && screens.submissions && !screens.submissions.hidden) openSubmissions(state.submissionsTestId);
  });

  const yearEl = $id("currentYear");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  (async function init() {
    showScreen("loading");
    if (getIdToken() || getRefreshToken()) {
      try {
        const me = await api.me();
        state.admin = me;
        await enterDashboard();
        startInactivityTimer();
        return;
      } catch (err) { clearTokens(); }
    }
    showLogin();
  })();

})();
