// ═══════════════════════════════════════════════════════════
// PrepareKora — Auth (login + signup)
// Uses Firebase REST API via Worker. On success, stores ID token
// in localStorage for consistent cross-page auth state.
// ═══════════════════════════════════════════════════════════

(function () {
  "use strict";

  const TOKEN_KEY = "pk_user_id_token";
  const EXPIRES_KEY = "pk_user_expires_at";
  const USER_KEY = "pk_user_profile";
  const REDIRECT_KEY = "pk_redirect_after_login";

  // ─────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────
  function $(id) { return document.getElementById(id); }

  function showError(el, message) {
    if (!el) return;
    el.textContent = message;
    el.hidden = false;
  }
  function hideError(el) {
    if (!el) return;
    el.textContent = "";
    el.hidden = true;
  }

  function setFieldError(inputId, message) {
    const input = $(inputId);
    if (input) input.classList.add("is-invalid");
    const errEl = document.querySelector(`[data-error-for="${inputId}"]`);
    if (errEl) {
      errEl.textContent = message;
      errEl.hidden = false;
    }
  }
  function clearFieldError(inputId) {
    const input = $(inputId);
    if (input) input.classList.remove("is-invalid");
    const errEl = document.querySelector(`[data-error-for="${inputId}"]`);
    if (errEl) {
      errEl.textContent = "";
      errEl.hidden = true;
    }
  }

  function setLoading(btn, loading, loadingText) {
    if (!btn) return;
    const label = btn.querySelector(".btn-label");
    if (loading) {
      btn.disabled = true;
      if (label) {
        label.dataset.originalText = label.textContent;
        label.innerHTML = `<span class="spinner" style="width:14px;height:14px;border-width:2px;border-top-color:#fff;border-color:rgba(255,255,255,.4);border-top-color:#fff;"></span> ${loadingText || "Loading…"}`;
      }
    } else {
      btn.disabled = false;
      if (label && label.dataset.originalText) {
        label.textContent = label.dataset.originalText;
      }
    }
  }

  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
  }
  function validatePassword(pw) {
    return typeof pw === "string" && pw.length >= 8 && pw.length <= 128;
  }

  // ─────────────────────────────────────────────────────────
  // SESSION STORAGE
  // ─────────────────────────────────────────────────────────
  function saveSession(data) {
    // Worker returns { ok, user: {...} } but Firebase ID token is in the HttpOnly cookie.
    // For client-side detection (Sign in / Dashboard), we mirror the auth state via a
    // short-lived marker. Real auth is enforced by the cookie + Worker.
    try {
      const user = data.user || {};
      const expiresAt = Date.now() + 55 * 60 * 1000; // 55 min
      // Use a fake token so isLoggedIn() sees "true"
      localStorage.setItem(TOKEN_KEY, "session");
      localStorage.setItem(EXPIRES_KEY, String(expiresAt));
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch (e) {}
  }

  function clearSession() {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(EXPIRES_KEY);
      localStorage.removeItem(USER_KEY);
    } catch (e) {}
  }

  // ─────────────────────────────────────────────────────────
  // POST-LOGIN REDIRECT
  // ─────────────────────────────────────────────────────────
  function handlePostLoginRedirect() {
    try {
      const raw = sessionStorage.getItem(REDIRECT_KEY);
      if (!raw) return null;
      sessionStorage.removeItem(REDIRECT_KEY);
      const parsed = JSON.parse(raw);
      return parsed;
    } catch (e) {
      return null;
    }
  }

  async function resumeRedirect(intent) {
    if (!intent) {
      window.location.href = "dashboard.html";
      return;
    }
    if (intent.type === "test") {
      try {
        const base = window.PK_CONFIG?.API_BASE || "";
        const res = await fetch(base + "/api/tests/start", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            testType: intent.testType,
            testId: intent.testId,
            subjectId: intent.subjectId
          })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (typeof window.pkToast === "function") {
            window.pkToast(data.error || data.message || "Could not resume test.", "error");
          }
          window.location.href = "dashboard.html";
          return;
        }
        sessionStorage.setItem("pk_active_attempt", JSON.stringify(data));
        window.location.href = "mock-test.html";
        return;
      } catch (err) {
        window.location.href = "dashboard.html";
        return;
      }
    }
    window.location.href = "dashboard.html";
  }

  // ─────────────────────────────────────────────────────────
  // LOGIN FORM
  // ─────────────────────────────────────────────────────────
  function initLoginForm() {
    const form = $("loginForm");
    if (!form) return;

    const errBox = $("loginError");
    const btn = $("loginBtn");

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      hideError(errBox);
      clearFieldError("loginEmail");
      clearFieldError("loginPassword");

      const email = ($("loginEmail").value || "").trim().toLowerCase();
      const password = $("loginPassword").value || "";

      let valid = true;
      if (!validateEmail(email)) {
        setFieldError("loginEmail", t("errEmail") || "Please enter a valid email address.");
        valid = false;
      }
      if (!password) {
        setFieldError("loginPassword", t("errRequired") || "This field is required.");
        valid = false;
      }
      if (!valid) return;

      setLoading(btn, true, "Signing in…");

      try {
        const base = window.PK_CONFIG?.API_BASE || "";
        const res = await fetch(base + "/api/auth/login", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || data.message || "Login failed.");
        }

        saveSession(data);

        // If there's a pending intent, resume; otherwise go to dashboard
        const intent = handlePostLoginRedirect();
        if (intent) {
          await resumeRedirect(intent);
        } else {
          window.location.href = "dashboard.html";
        }
      } catch (err) {
        showError(errBox, err.message || "Login failed.");
        setLoading(btn, false);
      }
    });
  }

  // ─────────────────────────────────────────────────────────
  // SIGNUP FORM
  // ─────────────────────────────────────────────────────────
  function initSignupForm() {
    const form = $("signupForm");
    if (!form) return;

    const errBox = $("signupError");
    const btn = $("signupBtn");

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      hideError(errBox);
      ["signupName", "signupEmail", "signupPassword", "signupConfirm"].forEach(clearFieldError);

      const fullName = ($("signupName").value || "").trim();
      const email = ($("signupEmail").value || "").trim().toLowerCase();
      const password = $("signupPassword").value || "";
      const confirmPassword = $("signupConfirm").value || "";

      let valid = true;
      if (fullName.length < 2 || fullName.length > 80) {
        setFieldError("signupName", t("errName") || "Name must be 2–80 characters.");
        valid = false;
      }
      if (!validateEmail(email)) {
        setFieldError("signupEmail", t("errEmail") || "Please enter a valid email address.");
        valid = false;
      }
      if (!validatePassword(password)) {
        setFieldError("signupPassword", t("errPassword") || "Password must be at least 8 characters.");
        valid = false;
      }
      if (password !== confirmPassword) {
        setFieldError("signupConfirm", t("errMismatch") || "Passwords do not match.");
        valid = false;
      }
      if (!valid) return;

      setLoading(btn, true, "Creating account…");

      try {
        const base = window.PK_CONFIG?.API_BASE || "";
        const res = await fetch(base + "/api/auth/signup", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fullName, email, password, confirmPassword })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || data.message || "Signup failed.");
        }

        saveSession(data);
        window.location.href = "dashboard.html";
      } catch (err) {
        showError(errBox, err.message || "Signup failed.");
        setLoading(btn, false);
      }
    });
  }

  // ─────────────────────────────────────────────────────────
  // INIT
  // ─────────────────────────────────────────────────────────
  function init() {
    initLoginForm();
    initSignupForm();

    // Footer year
    const yearEl = document.getElementById("currentYear");
    if (yearEl) yearEl.textContent = new Date().getFullYear();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
