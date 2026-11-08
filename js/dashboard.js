"use strict";

(function () {

  const API_BASE = (function () {
    const host = window.location.hostname;
    const isLocal = host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0" || host === "" || host.endsWith(".local");
    return isLocal ? "http://localhost:8787/api" : "https://preparekora-api.yadavsubba2003.workers.dev/api";
  })();

  const TOKEN_KEY = "pk_user_id_token";
  const EXPIRES_KEY = "pk_user_expires_at";
  const INACTIVITY_MS = 5 * 60 * 1000;

  const $id = (id) => document.getElementById(id);

  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY) || ""; } catch (e) { return ""; }
  }
  function clearTokens() {
    try { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(EXPIRES_KEY); } catch (e) {}
  }
  function redirectToLogin(reason) {
    stopInactivityTimer();
    clearTokens();
    const url = (reason === "signout") ? "login.html?logout=1" : "login.html";
    window.location.replace(url);
  }
  function esc(v) {
    return String(v).replace(/[&<>"']/g, function (c) {
      const m = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
      return m[c];
    });
  }
  function toast(msg, kind) {
    const c = $id("toastContainer");
    if (!c) return;
    const el = document.createElement("div");
    el.className = "toast" + (kind ? " " + kind : "");
    el.textContent = msg;
    c.appendChild(el);
    setTimeout(function () { el.remove(); }, 3000);
  }
  function formatAttemptDate(ts) {
    if (!ts) return "—";
    const d = new Date(Number(ts));
    if (isNaN(d.getTime())) return "—";
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return mins + "m ago";
    if (mins < 1440) return Math.floor(mins / 60) + "h ago";
    if (mins < 10080) return Math.floor(mins / 1440) + "d ago";
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  }
  function formatTimeTaken(sec) {
    const s = Number(sec) || 0;
    if (s <= 0) return "—";
    const m = Math.floor(s / 60);
    const r = s % 60;
    if (m === 0) return r + "s";
    return m + "m " + String(r).padStart(2, "0") + "s";
  }

  /* ---------- PROFILE ---------- */

  async function fetchProfile(token) {
    const res = await fetch(API_BASE + "/user/profile", { headers: { "Authorization": "Bearer " + token } });
    if (res.status === 401 || res.status === 403) throw { code: "unauth" };
    if (!res.ok) throw { code: "http", status: res.status };
    return await res.json();
  }
  async function updateProfileName(token, name) {
    const res = await fetch(API_BASE + "/user/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
      body: JSON.stringify({ name: name })
    });
    if (res.status === 401 || res.status === 403) throw { code: "unauth" };
    let data = null;
    try { data = await res.json(); } catch (e) {}
    if (!res.ok) throw { code: "http", message: (data && data.error) || "Save failed" };
    return data;
  }
  async function fetchUserStreak(token) {
    try {
      const res = await fetch(API_BASE + "/daily-quizzes/today", { headers: { "Authorization": "Bearer " + token } });
      if (!res.ok) return 0;
      const data = await res.json();
      return data && data.stats ? Number(data.stats.streak) || 0 : 0;
    } catch (e) { return 0; }
  }

  let currentProfile = null;

  function renderProfile(profile) {
    currentProfile = profile;
    const nameEl = $id("profileName");
    const emailEl = $id("profileEmail");
    const avatarEl = $id("dashAvatar");
    const streakEl = $id("dashStreak");

    if (nameEl) nameEl.textContent = profile.name || "User";
    if (emailEl) emailEl.textContent = profile.email || "";

    if (avatarEl) {
      avatarEl.innerHTML = "";
      if (profile.photoURL) {
        const img = document.createElement("img");
        img.src = profile.photoURL;
        img.alt = "";
        img.referrerPolicy = "no-referrer";
        avatarEl.appendChild(img);
      } else {
        const initial = (profile.name || "U").trim().charAt(0).toUpperCase();
        avatarEl.innerHTML = '<span class="sidebar-avatar-fallback">' + esc(initial) + '</span>';
      }
    }

    if (streakEl && profile.streak && profile.streak > 0) {
      streakEl.textContent = "🔥 " + profile.streak + "-day streak";
      streakEl.hidden = false;
    }

    const nameInput = $id("displayNameInput");
    if (nameInput) nameInput.value = profile.name || "";
  }

  /* ---------- TODAY'S QUIZZES ---------- */

  async function loadTodayQuizzes() {
    const wrap = $id("quizzesPanelContent");
    if (!wrap) return;
    const token = getToken();
    if (!token) { redirectToLogin(); return; }

    wrap.innerHTML = '<div class="loading-state" style="padding: 40px 20px;"><div class="spinner"></div><span>Loading…</span></div>';

    try {
      const res = await fetch(API_BASE + "/daily-quizzes/today", { headers: { "Authorization": "Bearer " + token } });
      if (res.status === 401 || res.status === 403) { redirectToLogin(); return; }
      if (!res.ok) {
        wrap.innerHTML = '<div class="empty-state" style="padding: 40px 20px;">Could not load quizzes.</div>';
        return;
      }
      const data = await res.json();
      const quizzes = Array.isArray(data.quizzes) ? data.quizzes : [];
      const date = data.date || "";
      const slot = data.slot || "";

      if (quizzes.length === 0) {
        wrap.innerHTML = '<div class="empty-state" style="padding: 40px 20px;">No quizzes available right now. Check back soon.</div>';
        return;
      }

      wrap.innerHTML = "";
      const grid = document.createElement("div");
      grid.className = "quiz-grid";

      quizzes.forEach(function (q) {
        const card = document.createElement("div");
        card.className = "quiz-card";

        if (q.attempted) {
          card.innerHTML =
            '<p class="quiz-card-title">' + esc(q.subjectName) + '</p>' +
            '<div class="quiz-card-meta">' +
              '<span class="quiz-attempted-pill">✓ ' + q.score + '/' + q.total + '</span>' +
              '<span class="quiz-percent">' + q.percent + '%</span>' +
            '</div>';
          card.addEventListener("click", function () {
            window.location.href = "result.html?date=" + encodeURIComponent(date) + "&subject=" + encodeURIComponent(q.subjectId) + "&slot=" + encodeURIComponent(slot);
          });
        } else {
          card.innerHTML =
            '<p class="quiz-card-title">' + esc(q.subjectName) + '</p>' +
            '<div class="quiz-card-meta">' +
              '<button class="quiz-start-pill" type="button">Start Quiz →</button>' +
            '</div>';
          card.querySelector(".quiz-start-pill").addEventListener("click", function (e) {
            e.stopPropagation();
            window.location.href = "quiz.html?date=" + encodeURIComponent(date) + "&subject=" + encodeURIComponent(q.subjectId) + "&slot=" + encodeURIComponent(slot);
          });
          card.addEventListener("click", function () {
            window.location.href = "quiz.html?date=" + encodeURIComponent(date) + "&subject=" + encodeURIComponent(q.subjectId) + "&slot=" + encodeURIComponent(slot);
          });
        }
        grid.appendChild(card);
      });
      wrap.appendChild(grid);
    } catch (err) {
      wrap.innerHTML = '<div class="empty-state" style="padding: 40px 20px;">Network error.</div>';
    }
  }

  /* ---------- ATTEMPTS ---------- */

  async function loadAttempts() {
    const token = getToken();
    if (!token) return;
    const loadingEl = $id("attemptsLoading");
    const emptyEl = $id("attemptsEmpty");
    const listEl = $id("attemptsList");
    if (loadingEl) loadingEl.hidden = false;
    if (emptyEl) emptyEl.hidden = true;
    if (listEl) listEl.innerHTML = "";

    try {
      const [mockRes, quizRes] = await Promise.all([
        fetch(API_BASE + "/user/attempts", { headers: { "Authorization": "Bearer " + token } }).then(function (r) { return r.ok ? r.json() : { attempts: [] }; }).catch(function () { return { attempts: [] }; }),
        fetch(API_BASE + "/user/quiz-attempts", { headers: { "Authorization": "Bearer " + token } }).then(function (r) { return r.ok ? r.json() : { attempts: [] }; }).catch(function () { return { attempts: [] }; })
      ]);

      const mockAttempts = (Array.isArray(mockRes.attempts) ? mockRes.attempts : []).map(function (a) { return Object.assign({}, a, { _type: "mock" }); });
      const quizAttempts = (Array.isArray(quizRes.attempts) ? quizRes.attempts : []).map(function (a) { return Object.assign({}, a, { _type: "quiz" }); });
      const all = mockAttempts.concat(quizAttempts);
      all.sort(function (a, b) { return (b.submittedAt || 0) - (a.submittedAt || 0); });

      if (loadingEl) loadingEl.hidden = true;
      if (all.length === 0) { if (emptyEl) emptyEl.hidden = false; return; }
      if (!listEl) return;

      all.forEach(function (a) {
        const card = document.createElement("div");
        card.className = "admin-test-card";
        card.style.cursor = "pointer";

        let title, subtitle, href;
        if (a._type === "quiz") {
          title = a.subjectName || "Quiz";
          subtitle = "Daily Quiz · " + a.date + (a.slot ? (" (" + a.slot + ")") : "");
          href = "result.html?date=" + encodeURIComponent(a.date) + "&subject=" + encodeURIComponent(a.subjectId) + (a.slot ? ("&slot=" + encodeURIComponent(a.slot)) : "");
        } else {
          title = a.testTitle || "Mock Test";
          subtitle = "Mock Test";
          href = "mock-test.html?test=" + encodeURIComponent(a.testId) + "&review=" + encodeURIComponent(a.id);
        }

        card.innerHTML =
          '<div class="admin-test-info">' +
            '<p class="admin-test-title">' + esc(title) + '</p>' +
            '<div class="admin-test-meta">' +
              '<span class="status-badge ' + (a._type === "quiz" ? "draft" : "published") + '">' + esc(subtitle) + '</span>' +
              '<span>' + a.correct + '/' + a.total + ' (' + a.percent + '%)</span>' +
              '<span>' + formatTimeTaken(a.timeTaken) + '</span>' +
              '<span>' + formatAttemptDate(a.submittedAt) + '</span>' +
            '</div>' +
          '</div>';

        card.addEventListener("click", function () { window.location.href = href; });
        listEl.appendChild(card);
      });
    } catch (err) {
      if (loadingEl) loadingEl.hidden = true;
      if (emptyEl) { emptyEl.hidden = false; emptyEl.textContent = "Could not load attempts."; }
    }
  }

  /* ---------- SIDEBAR NAV ---------- */

  const panels = {
    quizzes: { btn: $id("navQuizzes"), panel: $id("panelQuizzes") },
    attempts: { btn: $id("navAttempts"), panel: $id("panelAttempts") },
    settings: { btn: $id("navSettings"), panel: $id("panelSettings") },
    help: { btn: $id("navHelp"), panel: $id("panelHelp") },
    purchase: { btn: $id("navPurchase"), panel: $id("panelPurchase") }
  };

  function activate(name) {
    Object.keys(panels).forEach(function (k) {
      const p = panels[k];
      if (!p.btn || !p.panel) return;
      const isActive = (k === name);
      p.btn.classList.toggle("is-active", isActive);
      p.panel.hidden = !isActive;
    });
    closeSidebarMobile();
    if (name === "attempts") loadAttempts();
    if (name === "quizzes") loadTodayQuizzes();
  }

  Object.keys(panels).forEach(function (k) {
    const p = panels[k];
    if (!p.btn) return;
    p.btn.addEventListener("click", function () { activate(k); });
  });

  /* ---------- MOBILE SIDEBAR ---------- */

  const dashSidebar = $id("dashSidebar");
  const dashBackdrop = $id("dashBackdrop");
  const dashMenuToggle = $id("dashMenuToggle");

  function openSidebarMobile() {
    if (dashSidebar) dashSidebar.classList.add("open");
    if (dashBackdrop) dashBackdrop.classList.add("open");
  }
  function closeSidebarMobile() {
    if (dashSidebar) dashSidebar.classList.remove("open");
    if (dashBackdrop) dashBackdrop.classList.remove("open");
  }
  if (dashMenuToggle) dashMenuToggle.addEventListener("click", openSidebarMobile);
  if (dashBackdrop) dashBackdrop.addEventListener("click", closeSidebarMobile);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeSidebarMobile(); });

  /* ---------- SIGN OUT ---------- */

  function openSignOutModal() {
    const overlay = $id("signOutOverlay");
    if (!overlay) return;
    overlay.hidden = false;
    overlay.classList.add("open");
    setTimeout(function () { const b = $id("signOutCancelBtn"); if (b) b.focus(); }, 40);
  }
  function closeSignOutModal() {
    const overlay = $id("signOutOverlay");
    if (!overlay) return;
    overlay.hidden = true;
    overlay.classList.remove("open");
  }

  /* ---------- SETTINGS ---------- */

  function bindSettings() {
    const form = $id("settingsForm");
    if (!form) return;
    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      const input = $id("displayNameInput");
      const errEl = $id("displayNameError");
      const btn = $id("saveNameBtn");
      const value = input.value.trim();
      errEl.hidden = true;
      if (!value || value.length < 2) { errEl.textContent = "Name must be at least 2 characters"; errEl.hidden = false; return; }
      if (value.length > 60) { errEl.textContent = "Name is too long"; errEl.hidden = false; return; }
      if (currentProfile && value === currentProfile.name) { errEl.textContent = "Already your name"; errEl.hidden = false; return; }
      btn.disabled = true;
      try {
        const token = getToken();
        if (!token) { redirectToLogin(); return; }
        const updated = await updateProfileName(token, value);
        renderProfile(Object.assign({}, updated, { streak: currentProfile ? currentProfile.streak : 0 }));
        toast("Name updated", "success");
      } catch (err) {
        if (err && err.code === "unauth") { redirectToLogin(); return; }
        errEl.textContent = (err && err.message) || "Could not save";
        errEl.hidden = false;
      } finally { btn.disabled = false; }
    });
  }

  /* ---------- INACTIVITY ---------- */

  let inactivityTimerId = null;
  function resetInactivityTimer() {
    if (inactivityTimerId) clearTimeout(inactivityTimerId);
    if (!getToken()) return;
    inactivityTimerId = setTimeout(handleInactivityTimeout, INACTIVITY_MS);
  }
  function startInactivityTimer() {
    resetInactivityTimer();
    ["click", "keydown", "scroll", "touchstart", "mousemove"].forEach(function (ev) {
      document.addEventListener(ev, resetInactivityTimer, { passive: true });
    });
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "visible") resetInactivityTimer();
    });
  }
  function stopInactivityTimer() {
    if (inactivityTimerId) { clearTimeout(inactivityTimerId); inactivityTimerId = null; }
  }
  function handleInactivityTimeout() {
    stopInactivityTimer();
    let overlay = $id("sessionTimeoutOverlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "sessionTimeoutOverlay";
      overlay.className = "modal-overlay";
      overlay.hidden = true;
      overlay.innerHTML = '<div class="modal"><h2>Session timed out</h2><p class="muted-text" style="margin-bottom: 20px;">Please sign in again.</p><div class="modal-actions"><button type="button" class="btn btn-primary" id="sessionTimeoutLoginBtn">Go to login</button></div></div>';
      document.body.appendChild(overlay);
      overlay.querySelector("#sessionTimeoutLoginBtn").addEventListener("click", function () { redirectToLogin("signout"); });
    }
    overlay.hidden = false;
    overlay.classList.add("open");
  }

  /* ---------- INIT ---------- */

  async function init() {
    const yearEl = $id("currentYear");
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    bindSettings();

    const signOutBtn = $id("signOutBtn");
    if (signOutBtn) signOutBtn.addEventListener("click", openSignOutModal);
    const cancelBtn = $id("signOutCancelBtn");
    const confirmBtn = $id("signOutConfirmBtn");
    const overlay = $id("signOutOverlay");
    if (cancelBtn) cancelBtn.addEventListener("click", closeSignOutModal);
    if (overlay) overlay.addEventListener("click", function (e) { if (e.target === overlay) closeSignOutModal(); });
    if (confirmBtn) confirmBtn.addEventListener("click", function () { closeSignOutModal(); redirectToLogin("signout"); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeSignOutModal(); });

    const token = getToken();
    if (!token) { redirectToLogin(); return; }
    startInactivityTimer();

    try {
      const [profile, streak] = await Promise.all([fetchProfile(token), fetchUserStreak(token)]);
      profile.streak = streak;
      renderProfile(profile);
      loadTodayQuizzes();
    } catch (err) {
      if (err && err.code === "unauth") { redirectToLogin(); return; }
      const wrap = $id("quizzesPanelContent");
      if (wrap) wrap.innerHTML = '<div class="empty-state" style="padding: 40px 20px;">Could not load profile. <a href="login.html" style="color: var(--accent);">Sign in again</a></div>';
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
