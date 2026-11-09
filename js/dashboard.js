// ═══════════════════════════════════════════════════════════
// PrepareKora — Dashboard Logic
// Tabs, data loading, forms, confirmations
// ═══════════════════════════════════════════════════════════

(function () {
  "use strict";

  const TOKEN_KEY = "pk_user_id_token";
  const EXPIRES_KEY = "pk_user_expires_at";
  const USER_KEY = "pk_user_profile";

  let currentUser = null;
  let cachedAttempts = [];
  let confirmResolver = null;

  // ─────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────
  function $(id) { return document.getElementById(id); }

  function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function isLoggedIn() {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      const exp = parseInt(localStorage.getItem(EXPIRES_KEY) || "0", 10) || 0;
      if (!token) return false;
      if (exp && exp < Date.now()) return false;
      return true;
    } catch (e) {
      return false;
    }
  }

  function clearSession() {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(EXPIRES_KEY);
      localStorage.removeItem(USER_KEY);
    } catch (e) {}
  }

  function toast(msg, type) {
    if (typeof window.pkToast === "function") {
      window.pkToast(msg, type);
    }
  }

  async function api(path, options) {
    const base = window.PK_CONFIG?.API_BASE || "";
    const opts = {
      credentials: "include",
      headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
      ...options
    };
    if (options?.body && typeof options.body === "object") {
      opts.body = JSON.stringify(options.body);
    }
    const res = await fetch(base + path, opts);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (res.status === 401) {
        clearSession();
        window.location.href = "login.html";
        throw new Error("Session expired");
      }
      const err = new Error(data.error || data.message || `HTTP ${res.status}`);
      err.status = res.status;
      err.code = data.code;
      throw err;
    }
    return data;
  }

  // ─────────────────────────────────────────────────────────
  // TAB NAVIGATION
  // ─────────────────────────────────────────────────────────
  function initTabs() {
    const tabs = document.querySelectorAll(".dash-tab");
    const contents = document.querySelectorAll(".dash-tab-content");

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        const key = tab.getAttribute("data-tab");
        tabs.forEach((t) => t.classList.toggle("is-active", t === tab));
        contents.forEach((c) => c.classList.toggle("is-active", c.getAttribute("data-content") === key));
        loadTab(key);
      });
    });
  }

  function loadTab(key) {
    if (key === "overview") loadOverview();
    else if (key === "daily") loadDaily();
    else if (key === "history") loadHistory();
    else if (key === "results") loadResults();
    else if (key === "performance") loadPerformance();
    else if (key === "purchase") loadPurchase();
    else if (key === "notifications") loadNotifications();
    else if (key === "profile") loadProfile();
    else if (key === "support") loadSupport();
  }

  // ─────────────────────────────────────────────────────────
  // OVERVIEW
  // ─────────────────────────────────────────────────────────
  async function loadOverview() {
    try {
      const [profileRes, historyRes] = await Promise.all([
        api("/api/users/profile").catch(() => null),
        api("/api/users/test-history").catch(() => ({ attempts: [] }))
      ]);
      const profile = profileRes?.user || currentUser;
      const attempts = historyRes?.attempts || [];

      $("ovPlan").textContent = (profile?.plan || "free").toUpperCase();
      $("ovExpiry").textContent = profile?.planExpiresAt
        ? new Date(profile.planExpiresAt).toLocaleDateString("en-IN")
        : "—";
      $("ovAttempts").textContent = attempts.length;
      $("ovCorrect").textContent = profile?.stats?.totalCorrect || 0;

      const recent = attempts.slice(0, 5);
      const recentEl = $("ovRecent");
      if (recent.length === 0) {
        recentEl.innerHTML = '<div class="empty-state">No attempts yet. Start with a Forever Free test.</div>';
      } else {
        recentEl.innerHTML = recent.map(renderAttemptRow).join("");
      }
    } catch (err) {
      $("ovRecent").innerHTML = '<div class="empty-state">Could not load overview.</div>';
    }
  }

  function renderAttemptRow(a) {
    return `
      <div class="dash-row">
        <div class="dash-row-info">
          <p class="dash-row-title">${escapeHtml(a.testTitle || "Test")}</p>
          <p class="dash-row-meta">${escapeHtml(a.subject || "")} · ${a.attemptedAt ? new Date(a.attemptedAt).toLocaleDateString("en-IN") : ""}</p>
        </div>
        <div class="dash-row-score">${a.percentage || 0}%</div>
        <button class="btn btn-sm" type="button" data-view-attempt="${escapeHtml(a.id)}">View</button>
      </div>`;
  }

  function bindAttemptView(root) {
    root.querySelectorAll("[data-view-attempt]").forEach((btn) => {
      btn.addEventListener("click", () => viewAttempt(btn.getAttribute("data-view-attempt")));
    });
  }

  function viewAttempt(id) {
    try {
      sessionStorage.setItem("pk_view_result", JSON.stringify({ attemptId: id }));
    } catch (e) {}
    window.location.href = "mock-test.html?view=result&attemptId=" + encodeURIComponent(id);
  }

  // ─────────────────────────────────────────────────────────
  // DAILY TESTS
  // ─────────────────────────────────────────────────────────
  async function loadDaily() {
    const list = $("dailyList");
    try {
      const subjectsRes = await api("/api/public/subjects").catch(() => ({ subjects: [] }));
      const subjects = subjectsRes.subjects || [];
      if (subjects.length === 0) {
        list.innerHTML = '<div class="empty-state">No subjects available yet.</div>';
        return;
      }

      const today = new Date().toISOString().slice(0, 10);
      const slots = ["morning", "evening"];
      const items = [];

      for (const s of subjects) {
        for (const slot of slots) {
          const testId = `${today}_${slot}_${s.id}`;
          const label = slot === "morning" ? "6:00 AM" : "6:00 PM";
          items.push(`
            <div class="dash-row">
              <div class="dash-row-info">
                <p class="dash-row-title">${escapeHtml(s.name)} — ${label} slot</p>
                <p class="dash-row-meta">Daily test · ${today}</p>
              </div>
              <button class="btn btn-sm btn-primary" type="button" data-start-daily="${escapeHtml(testId)}">Attempt</button>
            </div>
          `);
        }
      }
      list.innerHTML = items.join("");

      list.querySelectorAll("[data-start-daily]").forEach((btn) => {
        btn.addEventListener("click", () => startDaily(btn, btn.getAttribute("data-start-daily")));
      });
    } catch (err) {
      list.innerHTML = '<div class="empty-state">Could not load daily tests.</div>';
    }
  }

  async function startDaily(btn, testId) {
    btn.disabled = true;
    try {
      const data = await api("/api/tests/start", {
        method: "POST",
        body: { testType: "daily", testId }
      });
      sessionStorage.setItem("pk_active_attempt", JSON.stringify(data));
      window.location.href = "mock-test.html";
    } catch (err) {
      if (err.code === "DAILY_QUOTA_EXCEEDED") {
        toast("Daily quota for this slot exceeded. Upgrade your plan.", "error");
      } else if (err.code === "SUBSCRIPTION_REQUIRED") {
        toast("This test requires an active subscription.", "error");
      } else if (err.code === "TEST_NOT_FOUND" || err.status === 404) {
        toast("This test hasn't been generated yet.", "error");
      } else {
        toast(err.message || "Could not start test.", "error");
      }
      btn.disabled = false;
    }
  }

  // ─────────────────────────────────────────────────────────
  // HISTORY
  // ─────────────────────────────────────────────────────────
  async function loadHistory() {
    const list = $("historyList");
    try {
      const res = await api("/api/users/test-history");
      cachedAttempts = res.attempts || [];
      if (cachedAttempts.length === 0) {
        list.innerHTML = '<div class="empty-state">No tests attempted yet.</div>';
        return;
      }
      list.innerHTML = cachedAttempts.map(renderAttemptRow).join("");
      bindAttemptView(list);
    } catch (err) {
      list.innerHTML = '<div class="empty-state">Could not load history.</div>';
    }
  }

  // ─────────────────────────────────────────────────────────
  // RESULTS
  // ─────────────────────────────────────────────────────────
  async function loadResults() {
    const list = $("resultsList");
    try {
      const res = await api("/api/users/test-history");
      const attempts = (res.attempts || []).filter((a) => a.score !== undefined && a.score !== null);
      if (attempts.length === 0) {
        list.innerHTML = '<div class="empty-state">No completed results yet.</div>';
        return;
      }
      list.innerHTML = attempts
        .map(
          (a) => `
        <div class="dash-row">
          <div class="dash-row-info">
            <p class="dash-row-title">${escapeHtml(a.testTitle || "Test")}</p>
            <p class="dash-row-meta">${escapeHtml(a.subject || "")} · ${a.score || 0} / ${a.totalMarks || 0} · ${a.percentage || 0}%</p>
          </div>
          <button class="btn btn-sm" type="button" data-view-attempt="${escapeHtml(a.id)}">Review</button>
        </div>`
        )
        .join("");
      bindAttemptView(list);
    } catch (err) {
      list.innerHTML = '<div class="empty-state">Could not load results.</div>';
    }
  }

  // ─────────────────────────────────────────────────────────
  // PERFORMANCE
  // ─────────────────────────────────────────────────────────
  async function loadPerformance() {
    try {
      const res = await api("/api/users/profile");
      const stats = res.user.stats || {};
      const total = (stats.totalCorrect || 0) + (stats.totalWrong || 0);
      const acc = total > 0 ? Math.round((stats.totalCorrect / total) * 100) : 0;
      $("perfAccuracy").textContent = `${acc}%`;
      $("perfCorrect").textContent = stats.totalCorrect || 0;
      $("perfWrong").textContent = stats.totalWrong || 0;
      $("perfUnattempted").textContent = "—";
    } catch (err) {
      // silently fail
    }
  }

  // ─────────────────────────────────────────────────────────
  // PURCHASE
  // ─────────────────────────────────────────────────────────
  async function loadPurchase() {
    const grid = $("planGrid");
    const historyEl = $("purchaseHistory");

    const plans = [
      { id: "free", name: "Free", label: "Free Forever", price: 0, days: 0, features: ["Forever Free tests", "1 daily test / slot"] },
      { id: "basic", name: "Basic", label: "Daily Practice", price: 19, days: 7, features: ["2 daily tests / slot"] },
      { id: "standard", name: "Standard", label: "Complete Preparation", price: 49, days: 15, popular: true, features: ["3 daily tests / slot", "All paid homepage tests"] },
      { id: "premium", name: "Premium", label: "Unlimited Preparation", price: 99, days: 30, features: ["All daily tests", "All paid homepage tests"] }
    ];

    grid.innerHTML = plans
      .map(
        (p) => `
        <div class="plan-card ${p.popular ? "is-popular" : ""}">
          ${p.popular ? '<span class="plan-card-label">Most popular</span>' : ""}
          <h3>${p.name}</h3>
          <p class="plan-card-desc">${p.label}</p>
          <div class="plan-card-price">₹${p.price}${p.days ? `<small>/${p.days} days</small>` : ""}</div>
          <ul class="plan-card-features">${p.features.map((f) => `<li>${f}</li>`).join("")}</ul>
          <button class="btn btn-primary btn-block" type="button" data-plan="${p.id}">
            ${p.id === "free" ? "Current plan" : "Upgrade"}
          </button>
        </div>`
      )
      .join("");

    grid.querySelectorAll("[data-plan]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const plan = btn.getAttribute("data-plan");
        if (plan === "free") {
          toast("You are already on the Free plan.", "info");
          return;
        }
        requestPurchase(btn, plan);
      });
    });

    try {
      const res = await api("/api/users/purchase-history");
      const purchases = res.purchases || [];
      if (purchases.length === 0) {
        historyEl.innerHTML = '<div class="empty-state">No purchase requests yet.</div>';
      } else {
        historyEl.innerHTML = purchases
          .map(
            (p) => `
          <div class="dash-row">
            <div class="dash-row-info">
              <p class="dash-row-title">${escapeHtml(p.planName || p.plan)} — ₹${p.price}</p>
              <p class="dash-row-meta">${new Date(p.createdAt).toLocaleDateString("en-IN")} · Status: ${escapeHtml(p.paymentStatus)}</p>
            </div>
          </div>`
          )
          .join("");
      }
    } catch (err) {
      historyEl.innerHTML = '<div class="empty-state">Could not load purchase history.</div>';
    }
  }

  async function requestPurchase(btn, plan) {
    btn.disabled = true;
    try {
      const data = await api("/api/users/purchase-request", {
        method: "POST",
        body: { plan }
      });
      if (data.whatsappUrl) {
        window.open(data.whatsappUrl, "_blank");
        toast("Purchase request created. Please complete on WhatsApp.", "success");
      } else {
        toast("Purchase request created but WhatsApp number not configured.", "error");
      }
    } catch (err) {
      toast(err.message || "Could not create purchase request.", "error");
    } finally {
      btn.disabled = false;
    }
  }

  // ─────────────────────────────────────────────────────────
  // PROFILE
  // ─────────────────────────────────────────────────────────
  async function loadProfile() {
    try {
      const res = await api("/api/users/profile");
      const u = res.user;
      $("profUserId").textContent = u.userId || "—";
      $("profName").textContent = u.displayName || "—";
      $("profEmail").textContent = u.email || "—";
      $("profCreated").textContent = u.createdAt
        ? new Date(u.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
        : "—";
      $("profPlan").textContent = (u.plan || "free").toUpperCase();

      $("setDisplayName").value = u.displayName || "";
      if (u.preferences?.language) $("langSelect").value = u.preferences.language;
    } catch (err) {}
  }

  // ─────────────────────────────────────────────────────────
  // NOTIFICATIONS
  // ─────────────────────────────────────────────────────────
  async function loadNotifications() {
    const list = $("notifList");
    try {
      const res = await api("/api/users/notifications");
      const notifications = res.notifications || [];
      const badge = $("notifBadge");
      if (res.unreadCount > 0) {
        badge.hidden = false;
        badge.textContent = res.unreadCount;
      } else {
        badge.hidden = true;
      }

      if (notifications.length === 0) {
        list.innerHTML = '<div class="empty-state">No notifications yet.</div>';
        return;
      }

      list.innerHTML = notifications
        .map(
          (n) => `
        <div class="notif-row ${n.read ? "" : "is-unread"}">
          <div class="notif-row-body">
            <p class="notif-row-title">${escapeHtml(n.title || "Notification")}</p>
            <p class="notif-row-msg">${escapeHtml(n.message || "")}</p>
            <p class="notif-row-time">${n.createdAt ? new Date(n.createdAt).toLocaleString("en-IN") : ""}</p>
          </div>
        </div>`
        )
        .join("");
    } catch (err) {
      list.innerHTML = '<div class="empty-state">Could not load notifications.</div>';
    }
  }

  // ─────────────────────────────────────────────────────────
  // SUPPORT
  // ─────────────────────────────────────────────────────────
  async function loadSupport() {
    const waLink = $("waSupportLink");
    try {
      const res = await api("/api/public/settings");
      const number = (res.settings?.whatsappNumber || "").replace(/\D/g, "");
      if (number) {
        waLink.href = `https://wa.me/${number}`;
      } else {
        waLink.href = "#";
        waLink.addEventListener("click", (e) => e.preventDefault(), { once: true });
      }
    } catch (e) {
      waLink.href = "#";
    }
  }

  // ─────────────────────────────────────────────────────────
  // FORM BINDINGS
  // ─────────────────────────────────────────────────────────
  function initForms() {
    // Display name
    $("displayNameForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = $("setDisplayName").value.trim();
      if (name.length < 2 || name.length > 80) {
        toast("Name must be 2–80 characters.", "error");
        return;
      }
      const btn = $("saveNameBtn");
      btn.disabled = true;
      try {
        await api("/api/users/profile", { method: "PATCH", body: { displayName: name } });
        toast("Display name updated.", "success");
        $("dashUserName").textContent = name;
      } catch (err) {
        toast(err.message || "Update failed.", "error");
      } finally {
        btn.disabled = false;
      }
    });

    // Password
    $("changePasswordForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const oldPassword = $("oldPassword").value;
      const newPassword = $("newPassword").value;
      const confirmNewPassword = $("confirmNewPassword").value;
      if (newPassword.length < 8) {
        toast("Password must be at least 8 characters.", "error");
        return;
      }
      if (newPassword !== confirmNewPassword) {
        toast("Passwords do not match.", "error");
        return;
      }
      const btn = $("savePasswordBtn");
      btn.disabled = true;
      try {
        await api("/api/users/change-password", {
          method: "POST",
          body: { oldPassword, newPassword, confirmPassword: confirmNewPassword }
        });
        toast("Password updated.", "success");
        $("changePasswordForm").reset();
      } catch (err) {
        toast(err.message || "Password change failed.", "error");
      } finally {
        btn.disabled = false;
      }
    });

    // Language
    $("saveLangBtn").addEventListener("click", async () => {
      const lang = $("langSelect").value;
      try {
        await api("/api/users/profile", {
          method: "PATCH",
          body: { preferences: { language: lang, notifications: true } }
        });
        localStorage.setItem("pk_lang", lang);
        toast("Language preference saved.", "success");
        if (typeof setLang === "function") setLang(lang);
      } catch (err) {
        toast(err.message || "Update failed.", "error");
      }
    });

    // Delete account
    $("deleteAccountBtn").addEventListener("click", async () => {
      const ok = await askConfirm("Delete account?", "This is permanent and cannot be undone. Type your password to confirm.");
      if (!ok) return;
      const password = prompt("Enter your password to confirm account deletion:");
      if (!password) return;
      try {
        await api("/api/users/delete-account", {
          method: "POST",
          body: { confirm: "DELETE", password }
        });
        clearSession();
        toast("Account deleted.", "success");
        setTimeout(() => (window.location.href = "index.html"), 1000);
      } catch (err) {
        toast(err.message || "Delete failed.", "error");
      }
    });

    // Support form
    $("supportForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const subject = $("supportSubject").value.trim();
      const message = $("supportMessage").value.trim();
      if (subject.length < 3 || message.length < 10) {
        toast("Please provide a subject and message.", "error");
        return;
      }
      const btn = $("supportSubmitBtn");
      btn.disabled = true;
      try {
        await api("/api/users/support", { method: "POST", body: { subject, message } });
        toast("Support request submitted.", "success");
        $("supportForm").reset();
      } catch (err) {
        toast(err.message || "Submit failed.", "error");
      } finally {
        btn.disabled = false;
      }
    });

    // Mark all read
    $("markAllReadBtn").addEventListener("click", async () => {
      try {
        await api("/api/users/notifications/read-all", { method: "POST" });
        loadNotifications();
      } catch (err) {
        toast("Failed to mark read.", "error");
      }
    });

    // Logout
    const logout = async () => {
      try {
        await api("/api/auth/logout", { method: "POST" });
      } catch (e) {}
      clearSession();
      window.location.href = "index.html";
    };
    $("logoutBtn").addEventListener("click", logout);
    $("logoutMobileBtn").addEventListener("click", (e) => {
      e.preventDefault();
      logout();
    });
  }

  // ─────────────────────────────────────────────────────────
  // CONFIRM MODAL
  // ─────────────────────────────────────────────────────────
  function askConfirm(title, message) {
    return new Promise((resolve) => {
      const modal = $("confirmModal");
      $("confirmTitle").textContent = title;
      $("confirmMessage").textContent = message;
      modal.classList.add("open");
      confirmResolver = resolve;

      const onOk = () => {
        modal.classList.remove("open");
        confirmResolver = null;
        resolve(true);
      };
      const onCancel = () => {
        modal.classList.remove("open");
        confirmResolver = null;
        resolve(false);
      };

      $("confirmOkBtn").onclick = onOk;
      $("confirmCancelBtn").onclick = onCancel;
    });
  }

  // ─────────────────────────────────────────────────────────
  // INIT
  // ─────────────────────────────────────────────────────────
  async function init() {
    if (!isLoggedIn()) {
      window.location.href = "login.html";
      return;
    }

    // Load fresh profile from server
    try {
      const res = await api("/api/users/profile");
      currentUser = res.user;
      if (currentUser) {
        $("dashUserName").textContent = currentUser.displayName || "User";
        $("dashUserId").textContent = currentUser.userId || "—";
        $("dashUserPlan").textContent = (currentUser.plan || "free").toUpperCase();
      }
    } catch (err) {
      // Will have redirected on 401
      return;
    }

    initTabs();
    initForms();
    loadOverview();

    const yearEl = $("currentYear");
    if (yearEl) yearEl.textContent = new Date().getFullYear();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
