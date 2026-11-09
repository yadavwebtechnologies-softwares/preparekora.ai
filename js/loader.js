// ═══════════════════════════════════════════════════════════
// PrepareKora — Test Archive Loader (v2 — search integration)
// ═══════════════════════════════════════════════════════════

(function () {
  "use strict";

  const EARLIER_PAGE_SIZE = 8;

  let allTests = [];
  let earlierPage = 1;

  // Expose for search (main.js uses window._pkAllTests)
  window._pkAllTests = [];

  // ─────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────
  function $(id) { return document.getElementById(id); }

  function setLoading(el, loading) {
    if (!el) return;
    el.classList.toggle("loading", !!loading);
    if (loading) el.setAttribute("aria-busy", "true");
    else el.removeAttribute("aria-busy");
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function todayISO() {
    return new Date().toISOString().slice(0, 10);
  }

  function yesterdayISO() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  }

  // ─────────────────────────────────────────────────────────
  // API CALL
  // ─────────────────────────────────────────────────────────
  async function apiGet(path) {
    const base = window.PK_CONFIG?.API_BASE || "";
    const res = await fetch(base + path, {
      credentials: "include",
      headers: { Accept: "application/json" }
    });
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return res.json();
  }

  // ─────────────────────────────────────────────────────────
  // BUILD TEST LIST
  // ─────────────────────────────────────────────────────────
  async function buildTestList() {
    const tests = [];

    let subjects = [];
    try {
      const res = await apiGet("/api/public/subjects");
      subjects = res.subjects || [];
    } catch (err) {
      console.error("[loader] subjects fetch failed:", err.message);
      return [];
    }

    for (const subj of subjects) {
      if (subj.hasForeverFree) {
        try {
          const ff = await apiGet(`/api/tests/subject/${encodeURIComponent(subj.id)}/forever-free`);
          if (ff.test) {
            tests.push({
              testType: "forever-free",
              testId: `forever-${subj.id}`,
              subjectId: subj.id,
              subjectName: subj.name,
              title: ff.test.testTitle || `${subj.name} — Forever Free Test`,
              duration: ff.test.duration || 15,
              totalMarks: ff.test.totalMarks || 0,
              questionCount: ff.test.questionCount || 0,
              isFree: true,
              publishedAt: 0,
              dateISO: null
            });
          }
        } catch (e) {}
      }

      try {
        const paid = await apiGet(`/api/public/homepage-tests/${encodeURIComponent(subj.id)}`);
        const paidTests = paid.tests || [];
        for (const t of paidTests) {
          if (t.isPaid === false) continue;
          const publishedAt = t.publishedAt || 0;
          const dateISO = publishedAt
            ? new Date(publishedAt).toISOString().slice(0, 10)
            : null;
          tests.push({
            testType: "homepage-paid",
            testId: t.id,
            subjectId: subj.id,
            subjectName: subj.name,
            title: t.title || `${subj.name} — Mock Test`,
            duration: t.duration || 30,
            totalMarks: t.totalMarks || 0,
            questionCount: t.questionCount || 0,
            isFree: false,
            publishedAt,
            dateISO
          });
        }
      } catch (e) {}
    }

    tests.sort((a, b) => (b.publishedAt || 0) - (a.publishedAt || 0));
    return tests;
  }

  // ─────────────────────────────────────────────────────────
  // GROUP TESTS
  // ─────────────────────────────────────────────────────────
  function groupTests(tests) {
    const today = todayISO();
    const yesterday = yesterdayISO();
    const groups = { today: [], yesterday: [], earlier: [] };

    for (const t of tests) {
      if (!t.dateISO) groups.today.push(t);
      else if (t.dateISO === today) groups.today.push(t);
      else if (t.dateISO === yesterday) groups.yesterday.push(t);
      else groups.earlier.push(t);
    }

    return groups;
  }

  // ─────────────────────────────────────────────────────────
  // RENDER TEST CARD
  // ─────────────────────────────────────────────────────────
  function renderTestCard(test) {
    const title = escapeHtml(test.title);
    const subject = escapeHtml(test.subjectName || "");
    const duration = test.duration || 0;
    const totalMarks = test.totalMarks || 0;
    const questionCount = test.questionCount || 0;

    const badgeHtml = test.isFree
      ? `<span class="badge badge-accent">Free</span>`
      : `<span class="badge badge-muted">Paid</span>`;

    let dateBadgeHtml = "";
    if (test.dateISO) {
      const d = new Date(test.dateISO + "T00:00:00");
      const day = d.getDate();
      const month = d.toLocaleDateString("en", { month: "short" }).toUpperCase();
      dateBadgeHtml = `
        <div class="date-badge">
          <span class="date-day">${day}</span>
          <span class="date-month">${month}</span>
        </div>`;
    } else {
      dateBadgeHtml = `
        <div class="date-badge">
          <svg class="pk-icon" viewBox="0 0 24 24" style="width:18px;height:18px;stroke:var(--accent);" aria-hidden="true">
            <path d="M5 13l4 4L19 7"/>
          </svg>
        </div>`;
    }

    const btnId = `startBtn_${test.testType}_${test.testId}`.replace(/[^a-zA-Z0-9_]/g, "_");

    return `
      <article class="test-card">
        ${dateBadgeHtml}
        <div class="test-info">
          <h3 class="test-title">${title}</h3>
          <p class="test-publisher">${subject} ${badgeHtml}</p>
          <div class="test-meta">
            <span>${questionCount} ${t("questions") || "questions"}</span>
            <span>${totalMarks} ${t("marks") || "marks"}</span>
            <span>${duration} ${t("minutes") || "min"}</span>
          </div>
        </div>
        <button
          class="start-button"
          type="button"
          id="${btnId}"
          data-test-type="${escapeHtml(test.testType)}"
          data-test-id="${escapeHtml(test.testId)}"
          data-subject-id="${escapeHtml(test.subjectId)}"
          data-is-free="${test.isFree ? "1" : "0"}"
        >
          ${t("start") || "Start"}
        </button>
      </article>`;
  }

  // ─────────────────────────────────────────────────────────
  // RENDER GROUP
  // ─────────────────────────────────────────────────────────
  function renderGroup(containerId, tests) {
    const el = $(containerId);
    if (!el) return;
    if (!tests || tests.length === 0) {
      el.innerHTML = "";
      const section = el.closest(".archive-section");
      if (section) section.style.display = "none";
      return;
    }
    const section = el.closest(".archive-section");
    if (section) section.style.display = "";
    el.innerHTML = tests.map(renderTestCard).join("");
  }

  // ─────────────────────────────────────────────────────────
  // RENDER EARLIER (with pagination)
  // ─────────────────────────────────────────────────────────
  function renderEarlier(earlierTests) {
    const listEl = $("earlierTests");
    const pagEl = $("earlierPagination");
    const pageInfoEl = $("earlierPageInfo");
    const prevBtn = $("earlierPrevBtn");
    const nextBtn = $("earlierNextBtn");
    const section = listEl?.closest(".archive-section");

    if (!listEl || !pagEl) return;

    if (earlierTests.length === 0) {
      if (section) section.style.display = "none";
      return;
    }
    if (section) section.style.display = "";

    const totalPages = Math.max(1, Math.ceil(earlierTests.length / EARLIER_PAGE_SIZE));
    if (earlierPage > totalPages) earlierPage = totalPages;
    if (earlierPage < 1) earlierPage = 1;

    const start = (earlierPage - 1) * EARLIER_PAGE_SIZE;
    const pageItems = earlierTests.slice(start, start + EARLIER_PAGE_SIZE);

    listEl.innerHTML = pageItems.map(renderTestCard).join("");

    if (totalPages > 1) {
      pagEl.hidden = false;
      if (pageInfoEl) pageInfoEl.textContent = `Page ${earlierPage} of ${totalPages}`;
      if (prevBtn) prevBtn.disabled = earlierPage <= 1;
      if (nextBtn) nextBtn.disabled = earlierPage >= totalPages;
    } else {
      pagEl.hidden = true;
    }
  }

  // ─────────────────────────────────────────────────────────
  // BIND PAGINATION
  // ─────────────────────────────────────────────────────────
  function bindPagination(groups) {
    const prevBtn = $("earlierPrevBtn");
    const nextBtn = $("earlierNextBtn");

    if (prevBtn && !prevBtn.dataset.bound) {
      prevBtn.dataset.bound = "1";
      prevBtn.addEventListener("click", () => {
        if (earlierPage > 1) {
          earlierPage--;
          renderEarlier(groups.earlier);
        }
      });
    }

    if (nextBtn && !nextBtn.dataset.bound) {
      nextBtn.dataset.bound = "1";
      nextBtn.addEventListener("click", () => {
        const totalPages = Math.ceil(groups.earlier.length / EARLIER_PAGE_SIZE);
        if (earlierPage < totalPages) {
          earlierPage++;
          renderEarlier(groups.earlier);
        }
      });
    }
  }

  // ─────────────────────────────────────────────────────────
  // START BUTTON CLICK
  // ─────────────────────────────────────────────────────────
  async function onStartClick(btn) {
    const testType = btn.getAttribute("data-test-type");
    const testId = btn.getAttribute("data-test-id");
    const subjectId = btn.getAttribute("data-subject-id");
    const isFree = btn.getAttribute("data-is-free") === "1";

    if (!isFree && !isLoggedIn()) {
      try {
        sessionStorage.setItem(
          "pk_redirect_after_login",
          JSON.stringify({ type: "test", testType, testId, subjectId })
        );
      } catch (e) {}
      window.location.href = "login.html";
      return;
    }

    btn.disabled = true;
    const originalText = btn.textContent;
    btn.innerHTML = `<span class="spinner" style="width:14px;height:14px;border-width:2px;"></span>`;

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
          try {
            sessionStorage.setItem(
              "pk_redirect_after_login",
              JSON.stringify({ type: "test", testType, testId, subjectId })
            );
          } catch (e) {}
          window.location.href = "login.html";
          return;
        }
        throw new Error(data.error || data.message || `HTTP ${res.status}`);
      }

      try {
        sessionStorage.setItem("pk_active_attempt", JSON.stringify(data));
      } catch (e) {}
      window.location.href = "mock-test.html";
    } catch (err) {
      if (typeof window.pkToast === "function") {
        window.pkToast(err.message || "Could not start test.", "error");
      }
      btn.disabled = false;
      btn.textContent = originalText;
    }
  }

  function bindStartButtons() {
    document.addEventListener("click", (e) => {
      const btn = e.target.closest(".start-button");
      if (!btn) return;
      e.preventDefault();
      onStartClick(btn);
    });
  }

  // ─────────────────────────────────────────────────────────
  // AUTH STATE HELPERS
  // ─────────────────────────────────────────────────────────
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

  function showToast(message, type) {
    let container = document.querySelector(".toast-container");
    if (!container) {
      container = document.createElement("div");
      container.className = "toast-container";
      document.body.appendChild(container);
    }
    const toast = document.createElement("div");
    toast.className = "toast" + (type ? " " + type : "");
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
  }

  window.pkToast = showToast;
  window.pkIsLoggedIn = isLoggedIn;

  // ─────────────────────────────────────────────────────────
  // LOAD ARCHIVE
  // ─────────────────────────────────────────────────────────
  async function loadArchive() {
    const wrap = $("testArchive");
    const emptyEl = $("archiveEmpty");
    if (!wrap) return;

    setLoading(wrap, true);
    if (emptyEl) emptyEl.hidden = true;

    try {
      allTests = await buildTestList();

      // Expose for search (main.js)
      window._pkAllTests = allTests;

      if (allTests.length === 0) {
        if (emptyEl) emptyEl.hidden = false;
        ["todayTests", "yesterdayTests", "earlierTests"].forEach((id) => {
          const el = $(id);
          if (el) {
            const section = el.closest(".archive-section");
            if (section) section.style.display = "none";
          }
        });
        return;
      }

      const groups = groupTests(allTests);
      earlierPage = 1;

      renderGroup("todayTests", groups.today);
      renderGroup("yesterdayTests", groups.yesterday);
      renderEarlier(groups.earlier);
      bindPagination(groups);
    } catch (err) {
      console.error("[loader] archive load failed:", err);
      if (emptyEl) {
        emptyEl.hidden = false;
        emptyEl.textContent = "Could not load tests. Please refresh.";
      }
    } finally {
      setLoading(wrap, false);
    }
  }

  window.pkLoadArchive = loadArchive;

  // ─────────────────────────────────────────────────────────
  // INIT
  // ─────────────────────────────────────────────────────────
  function init() {
    if (document.getElementById("testArchive")) {
      bindStartButtons();
      loadArchive();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
