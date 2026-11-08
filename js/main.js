"use strict";

/*
  PrepareKora — Homepage logic (self-contained).
  Loads only translation.js. API client inlined here so
  no extra scripts are required in index.html.

  Earlier section is paginated (5 per page).
  Today & Yesterday show all tests.
*/

(function () {

  /* ---------- API (inline) ---------- */

  const API_BASE = (function () {
    const host = window.location.hostname;
    const isLocal = host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0" || host === "" || host.endsWith(".local");
    return isLocal ? "http://localhost:8787/api" : "https://preparekora-api.yadavsubba2003.workers.dev/api";
  })();

  async function apiFetch(path) {
    const res = await fetch(API_BASE + path, {
      method: "GET",
      headers: { "Accept": "application/json" }
    });
    if (!res.ok) {
      const err = new Error("HTTP " + res.status);
      err.status = res.status;
      throw err;
    }
    return res.json();
  }

  /* ---------- State ---------- */

  const EARLIER_PAGE_SIZE = 5;

  const state = {
    tests: [],
    loaded: false,
    earlierPage: 0
  };

  /* ---------- DOM ---------- */

  const todayList = document.getElementById("todayTests");
  const yesterdayList = document.getElementById("yesterdayTests");
  const earlierList = document.getElementById("earlierTests");
  const emptyState = document.getElementById("archiveEmpty");

  const earlierPagination = document.getElementById("earlierPagination");
  const earlierPrevBtn = document.getElementById("earlierPrevBtn");
  const earlierNextBtn = document.getElementById("earlierNextBtn");
  const earlierPageInfo = document.getElementById("earlierPageInfo");

  const menuToggle = document.getElementById("menuToggle");
  const menuPanel = document.getElementById("menuPanel");
  const menuIcon = document.getElementById("menuIcon");

  const searchOpenBtn = document.getElementById("searchOpen");
  const searchCloseBtn = document.getElementById("searchClose");
  const searchOverlay = document.getElementById("searchOverlay");
  const searchInput = document.getElementById("searchInput");
  const searchResults = document.getElementById("searchResults");

  /* ---------- Utilities ---------- */

  function t(key, vars) {
    return (window.PK && window.PK.t) ? window.PK.t(key, vars) : key;
  }

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, function (ch) {
      const map = {
        "&": "&amp;", "<": "&lt;", ">": "&gt;",
        '"': "&quot;", "'": "&#039;"
      };
      return map[ch];
    });
  }

  function formatBadgeDate(ts) {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return { day: "—", month: "—" };
    const locale = (window.PK && window.PK.locale) ? window.PK.locale() : "en-IN";
    return {
      day: d.getDate(),
      month: d.toLocaleDateString(locale, { month: "short" })
    };
  }

  function groupFor(ts) {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return "earlier";
    const now = new Date();
    const midnight = function (x) {
      return new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
    };
    const diff = Math.round((midnight(now) - midnight(d)) / 86400000);
    if (diff <= 0) return "today";
    if (diff === 1) return "yesterday";
    return "earlier";
  }

  /* ---------- Card builder ---------- */

  function buildCard(test) {
    const dateParts = formatBadgeDate(test.createdAt);
    const card = document.createElement("article");
    card.className = "test-card";

    card.innerHTML = `
      <div class="date-badge" aria-hidden="true">
        <span class="date-day">${dateParts.day}</span>
        <span class="date-month">${escapeHTML(dateParts.month)}</span>
      </div>

      <div class="test-info">
        <h3 class="test-title">${escapeHTML(test.title)}</h3>
        <p class="test-publisher">${escapeHTML(
          t("byLine", { name: test.publisherName || "—" })
        )}</p>
        <div class="test-meta">
          <span>${Number(test.questionCount) || 0} ${escapeHTML(t("questionsUnit"))}</span>
          <span>${Number(test.minutes) || 0} ${escapeHTML(t("minutesUnit"))}</span>
        </div>
      </div>

      <a class="start-button"
         href="mock-test.html?test=${encodeURIComponent(test.id)}"
         aria-label="${escapeHTML(t("start"))} ${escapeHTML(test.title)}">
        ${escapeHTML(t("start"))}
      </a>
    `;

    return card;
  }

  /* ---------- Render ---------- */

  function render() {
    if (!state.loaded) {
      [todayList, yesterdayList, earlierList].forEach(function (el) {
        if (el) {
          el.innerHTML =
            '<div class="loading-state"><div class="spinner"></div>' +
            '<span>' + escapeHTML(t("loading")) + '</span></div>';
        }
      });
      if (emptyState) emptyState.hidden = true;
      if (earlierPagination) earlierPagination.hidden = true;
      return;
    }

    const groups = { today: [], yesterday: [], earlier: [] };
    state.tests.forEach(function (test) {
      groups[groupFor(test.createdAt)].push(test);
    });

    Object.keys(groups).forEach(function (key) {
      groups[key].sort(function (a, b) { return b.createdAt - a.createdAt; });
    });

    /* Today — all */
    if (todayList) {
      todayList.replaceChildren();
      groups.today.forEach(function (test) {
        todayList.appendChild(buildCard(test));
      });
    }

    /* Yesterday — all */
    if (yesterdayList) {
      yesterdayList.replaceChildren();
      groups.yesterday.forEach(function (test) {
        yesterdayList.appendChild(buildCard(test));
      });
    }

    /* Earlier — paginated */
    const totalEarlierPages = Math.max(1, Math.ceil(groups.earlier.length / EARLIER_PAGE_SIZE));

    if (state.earlierPage >= totalEarlierPages) {
      state.earlierPage = totalEarlierPages - 1;
    }
    if (state.earlierPage < 0) {
      state.earlierPage = 0;
    }

    const startIdx = state.earlierPage * EARLIER_PAGE_SIZE;
    const endIdx = startIdx + EARLIER_PAGE_SIZE;
    const earlierSlice = groups.earlier.slice(startIdx, endIdx);

    if (earlierList) {
      earlierList.replaceChildren();
      earlierSlice.forEach(function (test) {
        earlierList.appendChild(buildCard(test));
      });
    }

    /* Pagination */
    if (earlierPagination) {
      earlierPagination.hidden = groups.earlier.length <= EARLIER_PAGE_SIZE;
    }
    if (earlierPageInfo) {
      earlierPageInfo.textContent = "Page " + (state.earlierPage + 1) + " of " + totalEarlierPages;
    }
    if (earlierPrevBtn) {
      earlierPrevBtn.disabled = state.earlierPage === 0;
    }
    if (earlierNextBtn) {
      earlierNextBtn.disabled = state.earlierPage >= totalEarlierPages - 1;
    }

    /* Hide empty sections */
    document.querySelectorAll(".archive-section").forEach(function (section) {
      const group = section.getAttribute("data-group");
      if (group === "today") section.hidden = groups.today.length === 0;
      else if (group === "yesterday") section.hidden = groups.yesterday.length === 0;
      else if (group === "earlier") section.hidden = groups.earlier.length === 0;
    });

    if (emptyState) {
      emptyState.hidden = state.tests.length !== 0;
    }
  }

  /* ---------- Fetch ---------- */

  async function loadTests() {
    try {
      const res = await apiFetch("/tests");
      state.tests = Array.isArray(res.tests) ? res.tests : [];
      state.loaded = true;
      render();
    } catch (err) {
      state.tests = [];
      state.loaded = true;
      render();
      if (emptyState) {
        emptyState.hidden = false;
        emptyState.textContent = t("loadFailed");
      }
    }
  }

  /* ---------- Earlier pagination handlers ---------- */

  function scrollToEarlier() {
    const section = document.querySelector('[data-group="earlier"]');
    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  if (earlierPrevBtn) {
    earlierPrevBtn.addEventListener("click", function () {
      if (state.earlierPage > 0) {
        state.earlierPage--;
        render();
        scrollToEarlier();
      }
    });
  }

  if (earlierNextBtn) {
    earlierNextBtn.addEventListener("click", function () {
      const earlierCount = state.tests.filter(function (test) {
        return groupFor(test.createdAt) === "earlier";
      }).length;
      const totalPages = Math.max(1, Math.ceil(earlierCount / EARLIER_PAGE_SIZE));

      if (state.earlierPage < totalPages - 1) {
        state.earlierPage++;
        render();
        scrollToEarlier();
      }
    });
  }

  /* ---------- Mobile menu ---------- */

  const hamburgerSVG = '<path d="M4 7h16"></path><path d="M4 12h16"></path><path d="M4 17h16"></path>';
  const closeSVG = '<path d="m6 6 12 12"></path><path d="M18 6 6 18"></path>';

  function closeMenu() {
    if (!menuPanel || !menuToggle || !menuIcon) return;
    menuPanel.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuIcon.innerHTML = hamburgerSVG;
  }

  function openMenu() {
    if (!menuPanel || !menuToggle || !menuIcon) return;
    menuPanel.classList.add("open");
    menuToggle.setAttribute("aria-expanded", "true");
    menuIcon.innerHTML = closeSVG;
  }

  if (menuToggle && menuPanel && menuIcon) {
    menuToggle.addEventListener("click", function (e) {
      e.stopPropagation();
      if (menuPanel.classList.contains("open")) closeMenu();
      else openMenu();
    });

    document.addEventListener("click", function (e) {
      if (menuPanel.classList.contains("open") && !menuPanel.contains(e.target) && !menuToggle.contains(e.target)) {
        closeMenu();
      }
    });

    menuPanel.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", closeMenu);
    });
  }

  /* ---------- Search ---------- */

  function openSearch() {
    if (!searchOverlay) return;
    closeMenu();
    searchOverlay.classList.add("open");
    searchOverlay.setAttribute("aria-hidden", "false");
    setTimeout(function () { if (searchInput) searchInput.focus(); }, 50);
  }

  function closeSearch() {
    if (!searchOverlay) return;
    searchOverlay.classList.remove("open");
    searchOverlay.setAttribute("aria-hidden", "true");
    if (searchInput) searchInput.value = "";
    renderSearchResults("");
  }

  function renderSearchResults(query) {
    if (!searchResults) return;

    const q = query.trim().toLowerCase();
    searchResults.replaceChildren();

    if (!state.loaded) {
      const div = document.createElement("div");
      div.className = "search-empty";
      div.textContent = t("loading");
      searchResults.appendChild(div);
      return;
    }

    const matches = state.tests.filter(function (test) {
      const haystack = [
        test.title || "",
        test.publisherName || "",
        String(test.questionCount || ""),
        String(test.minutes || "")
      ].join(" ").toLowerCase();
      return haystack.indexOf(q) !== -1;
    });

    if (matches.length === 0) {
      const div = document.createElement("div");
      div.className = "search-empty";
      div.textContent = q ? t("noMatches") : t("searchHint");
      searchResults.appendChild(div);
      return;
    }

    matches.forEach(function (test) {
      const a = document.createElement("a");
      a.className = "search-result";
      a.href = "mock-test.html?test=" + encodeURIComponent(test.id);
      a.innerHTML = `
        <div class="search-result-title">${escapeHTML(test.title)}</div>
        <div class="search-result-meta">
          ${escapeHTML(t("byLine", { name: test.publisherName || "—" }))}
          &nbsp;·&nbsp;
          ${Number(test.questionCount) || 0} ${escapeHTML(t("questionsUnit"))}
          &nbsp;·&nbsp;
          ${Number(test.minutes) || 0} ${escapeHTML(t("minutesUnit"))}
        </div>
      `;
      searchResults.appendChild(a);
    });
  }

  if (searchOpenBtn) searchOpenBtn.addEventListener("click", openSearch);
  if (searchCloseBtn) searchCloseBtn.addEventListener("click", closeSearch);

  if (searchOverlay) {
    searchOverlay.addEventListener("click", function (e) {
      if (e.target === searchOverlay) closeSearch();
    });
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      closeMenu();
      if (searchOverlay && searchOverlay.classList.contains("open")) {
        closeSearch();
      }
    }
  });

  if (searchInput) {
    searchInput.addEventListener("input", function () {
      renderSearchResults(searchInput.value);
    });
  }

  /* ---------- Language change ---------- */

  document.addEventListener("pk:langchange", function () {
    render();
    if (searchOverlay && searchOverlay.classList.contains("open")) {
      renderSearchResults(searchInput ? searchInput.value : "");
    }
  });

  /* ---------- Init ---------- */

  const yearEl = document.getElementById("currentYear");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  render();
  loadTests();

})();
