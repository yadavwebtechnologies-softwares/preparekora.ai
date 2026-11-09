// ═══════════════════════════════════════════════════════════
// PrepareKora — Main Global Logic
// Mobile menu, auth button, search overlay, footer year
// ═══════════════════════════════════════════════════════════

(function () {
  "use strict";

  // ─────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────
  function $(id) { return document.getElementById(id); }
  function $sel(sel) { return document.querySelector(sel); }
  function $all(sel) { return document.querySelectorAll(sel); }

  function isLoggedIn() {
    try {
      const token = localStorage.getItem("pk_user_id_token");
      const exp = parseInt(localStorage.getItem("pk_user_expires_at") || "0", 10) || 0;
      if (!token) return false;
      if (exp && exp < Date.now()) return false;
      return true;
    } catch (e) {
      return false;
    }
  }

  // ─────────────────────────────────────────────────────────
  // MOBILE MENU
  // ─────────────────────────────────────────────────────────
  function initMenu() {
    const toggle = $("menuToggle");
    const panel = $("menuPanel");
    if (!toggle || !panel) return;

    toggle.addEventListener("click", () => {
      const isOpen = panel.classList.toggle("open");
      toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
      toggle.setAttribute("aria-label", isOpen ? "Close navigation menu" : "Open navigation menu");
    });

    // Close on outside click
    document.addEventListener("click", (e) => {
      if (!panel.classList.contains("open")) return;
      if (panel.contains(e.target) || toggle.contains(e.target)) return;
      panel.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    });

    // Close on Escape
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && panel.classList.contains("open")) {
        panel.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.focus();
      }
    });
  }

  // ─────────────────────────────────────────────────────────
  // AUTH BUTTON (Sign in / Dashboard)
  // ─────────────────────────────────────────────────────────
  function initAuthButton() {
    const logged = isLoggedIn();
    const label = logged ? "Dashboard" : "Sign in";
    const href = logged ? "dashboard.html" : "login.html";

    const btn = $("authActionBtn");
    if (btn) {
      btn.textContent = label;
      btn.href = href;
      btn.style.display = "";
    }

    const btnM = $("authActionBtnMobile");
    if (btnM) {
      btnM.textContent = label;
      btnM.href = href;
    }
  }

  // ─────────────────────────────────────────────────────────
  // SEARCH OVERLAY
  // ─────────────────────────────────────────────────────────
  function initSearch() {
    const overlay = $("searchOverlay");
    const input = $("searchInput");
    const closeBtn = $("searchClose");
    const results = $("searchResults");

    if (!overlay || !input || !closeBtn || !results) return;

    function open() {
      overlay.classList.add("open");
      overlay.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
      setTimeout(() => input.focus(), 50);
    }

    function close() {
      overlay.classList.remove("open");
      overlay.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
      input.value = "";
      results.innerHTML =
        '<div class="search-empty" data-i18n="searchHint">Search for a mock test or teacher.</div>';
      if (typeof applyTranslations === "function") applyTranslations();
    }

    closeBtn.addEventListener("click", close);

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && overlay.classList.contains("open")) close();
      // Open search with "/" key
      if (e.key === "/" && !overlay.classList.contains("open")) {
        const tag = (e.target.tagName || "").toLowerCase();
        if (tag === "input" || tag === "textarea" || tag === "select") return;
        e.preventDefault();
        open();
      }
    });

    // Search functionality (simple client-side filter on loaded tests)
    let debounceTimer = null;
    input.addEventListener("input", () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        runSearch(input.value.trim().toLowerCase());
      }, 200);
    });

    function runSearch(query) {
      if (!query) {
        results.innerHTML =
          '<div class="search-empty" data-i18n="searchHint">Search for a mock test or teacher.</div>';
        if (typeof applyTranslations === "function") applyTranslations();
        return;
      }

      const tests = window._pkAllTests || [];
      const matches = tests.filter((t) => {
        const hay = `${t.title || ""} ${t.subjectName || ""}`.toLowerCase();
        return hay.includes(query);
      }).slice(0, 20);

      if (matches.length === 0) {
        results.innerHTML = `<div class="search-empty">No results for "${escapeHtml(query)}".</div>`;
        return;
      }

      results.innerHTML = matches
        .map(
          (t) => `
        <a class="search-result" href="#" data-test-type="${escapeHtml(t.testType)}" data-test-id="${escapeHtml(t.testId)}" data-subject-id="${escapeHtml(t.subjectId || "")}" data-is-free="${t.isFree ? "1" : "0"}">
          <div class="search-result-title">${escapeHtml(t.title || "Test")}</div>
          <div class="search-result-meta">${escapeHtml(t.subjectName || "")} • ${t.questionCount || 0} questions • ${t.duration || 0} min</div>
        </a>`
        )
        .join("");

      // Bind click → start test
      results.querySelectorAll(".search-result").forEach((a) => {
        a.addEventListener("click", async (e) => {
          e.preventDefault();
          await startTestFromSearch(a);
        });
      });
    }

    async function startTestFromSearch(a) {
      const testType = a.getAttribute("data-test-type");
      const testId = a.getAttribute("data-test-id");
      const subjectId = a.getAttribute("data-subject-id");
      const isFree = a.getAttribute("data-is-free") === "1";

      if (!isFree && !isLoggedIn()) {
        sessionStorage.setItem(
          "pk_redirect_after_login",
          JSON.stringify({ type: "test", testType, testId, subjectId })
        );
        window.location.href = "login.html";
        return;
      }

      try {
        const base = window.PK_CONFIG?.API_BASE || "";
        const res = await fetch(base + "/api/tests/start", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ testType, testId, subjectId })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (res.status === 401) {
            sessionStorage.setItem(
              "pk_redirect_after_login",
              JSON.stringify({ type: "test", testType, testId, subjectId })
            );
            window.location.href = "login.html";
            return;
          }
          throw new Error(data.error || data.message || `HTTP ${res.status}`);
        }
        sessionStorage.setItem("pk_active_attempt", JSON.stringify(data));
        window.location.href = "mock-test.html";
      } catch (err) {
        if (typeof window.pkToast === "function") {
          window.pkToast(err.message || "Could not start test.", "error");
        }
      }
    }

    // Expose opener so a search icon button can trigger it
    window.pkOpenSearch = open;
  }

  // ─────────────────────────────────────────────────────────
  // ESCAPE HTML
  // ─────────────────────────────────────────────────────────
  function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // ─────────────────────────────────────────────────────────
  // FOOTER YEAR
  // ─────────────────────────────────────────────────────────
  function initFooterYear() {
    const el = $("currentYear");
    if (el) el.textContent = new Date().getFullYear();
  }

  // ─────────────────────────────────────────────────────────
  // INIT
  // ─────────────────────────────────────────────────────────
  function init() {
    initMenu();
    initAuthButton();
    initSearch();
    initFooterYear();

    // Re-apply translations after any dynamic changes
    if (typeof applyTranslations === "function") applyTranslations();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
