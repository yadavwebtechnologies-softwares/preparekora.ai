// ═══════════════════════════════════════════════════════════
// PrepareKora — Homepage Logic
// Loads subjects, forever-free test, paid tests
// ═══════════════════════════════════════════════════════════

const PAID_TESTS_PER_PAGE = 8;

// ───────────────────────────────────────────────────────────
// LOAD SUBJECTS
// ───────────────────────────────────────────────────────────
async function loadSubjects() {
  const section = document.getElementById("subjectsContainer");
  const grid = document.getElementById("subjectsGrid");
  const empty = document.getElementById("subjectsEmpty");
  const error = document.getElementById("subjectsError");

  if (!section || !grid) return;

  setSectionLoading(section, true);
  empty?.classList.add("hidden");
  error?.classList.add("hidden");
  grid.innerHTML = "";

  try {
    const res = await apiFetch("/api/public/subjects");
    const subjects = res.subjects || [];

    if (subjects.length === 0) {
      empty?.classList.remove("hidden");
      return;
    }

    grid.innerHTML = subjects.map((s) => renderSubjectCard(s)).join("");

    // Attach event listeners for each subject's forever-free test
    subjects.forEach((s) => {
      if (s.hasForeverFree) {
        const btn = document.getElementById(`free-btn-${s.id}`);
        if (btn) {
          btn.addEventListener("click", () => startForeverFreeTest(s.id, s.name));
        }
      }
      loadPaidTestsForSubject(s.id);
    });
  } catch (err) {
    console.error("Failed to load subjects:", err);
    error?.classList.remove("hidden");
  } finally {
    setSectionLoading(section, false);
  }
}

// ───────────────────────────────────────────────────────────
// RENDER SUBJECT CARD
// ───────────────────────────────────────────────────────────
function renderSubjectCard(subject) {
  const id = escapeHtml(subject.id);
  const name = escapeHtml(subject.name);
  const nameAs = subject.nameAs ? escapeHtml(subject.nameAs) : "";
  const description = escapeHtml(subject.description || "");

  return `
    <div class="card" id="subject-card-${id}" data-subject-id="${id}">
      <h3 class="card-title">${name}</h3>
      ${nameAs ? `<p style="font-size: var(--font-size-sm); color: var(--text-muted); margin-bottom: var(--space-3);">${nameAs}</p>` : ""}
      ${description ? `<p class="card-text" style="margin-bottom: var(--space-4);">${description}</p>` : ""}

      <!-- Forever Free Test -->
      <div style="border: 1px solid var(--border); border-radius: var(--radius); padding: var(--space-4); margin-bottom: var(--space-4); background: var(--bg-subtle);">
        <div class="flex items-center justify-between" style="margin-bottom: var(--space-3);">
          <div>
            <span class="badge badge-green">Forever Free</span>
            <span style="font-size: var(--font-size-xs); color: var(--text-muted); margin-left: var(--space-2);">No login required</span>
          </div>
        </div>
        ${subject.hasForeverFree
          ? `<button class="btn btn-accent btn-sm btn-block" id="free-btn-${id}" data-subject-id="${id}">Start Free Test</button>`
          : `<p style="font-size: var(--font-size-sm); color: var(--text-muted);">Free test not yet available for this subject.</p>`
        }
      </div>

      <!-- Paid Tests List -->
      <div id="paid-tests-${id}" class="loading-section loading" style="min-height: 60px;">
        <div class="loading-spinner" role="status" aria-label="Loading tests"></div>
        <div id="paid-tests-list-${id}"></div>
        <div id="paid-tests-pagination-${id}" class="mt-4" style="display: flex; gap: var(--space-2); justify-content: center; flex-wrap: wrap;"></div>
      </div>
    </div>
  `;
}

// ───────────────────────────────────────────────────────────
// LOAD PAID TESTS FOR SUBJECT + PAGINATION
// ───────────────────────────────────────────────────────────
const subjectPaginationState = {}; // subjectId → currentPage

async function loadPaidTestsForSubject(subjectId) {
  const container = document.getElementById(`paid-tests-${subjectId}`);
  const list = document.getElementById(`paid-tests-list-${subjectId}`);
  const pagination = document.getElementById(`paid-tests-pagination-${subjectId}`);
  if (!container || !list || !pagination) return;

  setSectionLoading(container, true);

  try {
    const res = await apiFetch(`/api/public/homepage-tests/${encodeURIComponent(subjectId)}`);
    let tests = res.tests || [];

    // Filter out free tests (paid only — free is already pinned)
    tests = tests.filter((t) => t.isPaid !== false);

    if (tests.length === 0) {
      list.innerHTML = `<p style="font-size: var(--font-size-sm); color: var(--text-muted);">No paid tests published yet.</p>`;
      pagination.innerHTML = "";
      return;
    }

    // Sort by publishedAt desc
    tests.sort((a, b) => (b.publishedAt || 0) - (a.publishedAt || 0));

    const totalPages = Math.ceil(tests.length / PAID_TESTS_PER_PAGE);
    const currentPage = Math.min(subjectPaginationState[subjectId] || 1, totalPages);
    subjectPaginationState[subjectId] = currentPage;

    const start = (currentPage - 1) * PAID_TESTS_PER_PAGE;
    const pageItems = tests.slice(start, start + PAID_TESTS_PER_PAGE);

    list.innerHTML = pageItems.map((t) => renderPaidTestRow(t, subjectId)).join("");

    // Attach click handlers
    pageItems.forEach((t) => {
      const btn = document.getElementById(`start-test-${t.id}`);
      if (btn) {
        btn.addEventListener("click", () => startPaidTest(t.id, subjectId));
      }
    });

    // Render pagination
    if (totalPages > 1) {
      pagination.innerHTML = renderPagination(subjectId, currentPage, totalPages);
      pagination.querySelectorAll("button[data-page]").forEach((btn) => {
        btn.addEventListener("click", () => {
          subjectPaginationState[subjectId] = parseInt(btn.dataset.page, 10);
          loadPaidTestsForSubject(subjectId);
        });
      });
    } else {
      pagination.innerHTML = "";
    }
  } catch (err) {
    console.error(`Failed to load paid tests for ${subjectId}:`, err);
    list.innerHTML = `<p style="font-size: var(--font-size-sm); color: var(--error);">Could not load tests.</p>`;
    pagination.innerHTML = "";
  } finally {
    setSectionLoading(container, false);
  }
}

// ───────────────────────────────────────────────────────────
// RENDER PAID TEST ROW
// ───────────────────────────────────────────────────────────
function renderPaidTestRow(test, subjectId) {
  const testId = escapeHtml(test.id);
  const title = escapeHtml(test.title);
  const date = test.publishedAt
    ? new Date(test.publishedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : "";

  return `
    <div style="display: flex; justify-content: space-between; align-items: center; padding: var(--space-3) 0; border-bottom: 1px solid var(--border-subtle); gap: var(--space-3); flex-wrap: wrap;">
      <div style="flex: 1; min-width: 150px;">
        <div style="font-weight: var(--font-weight-medium); font-size: var(--font-size-sm);">${title}</div>
        <div style="font-size: var(--font-size-xs); color: var(--text-muted); margin-top: var(--space-1);">
          ${test.duration} min • ${test.totalMarks} marks ${date ? "• " + date : ""}
        </div>
      </div>
      <button class="btn btn-outline btn-sm" id="start-test-${testId}" data-test-id="${testId}" data-subject-id="${escapeHtml(subjectId)}">Start</button>
    </div>
  `;
}

// ───────────────────────────────────────────────────────────
// PAGINATION RENDER
// ───────────────────────────────────────────────────────────
function renderPagination(subjectId, current, total) {
  const buttons = [];
  buttons.push(`<button class="btn btn-outline btn-sm" data-page="${current - 1}" ${current === 1 ? "disabled" : ""}>Previous</button>`);
  for (let i = 1; i <= total; i++) {
    const active = i === current;
    buttons.push(
      `<button class="btn ${active ? "btn-primary" : "btn-outline"} btn-sm" data-page="${i}" ${active ? "disabled" : ""}>${i}</button>`
    );
  }
  buttons.push(`<button class="btn btn-outline btn-sm" data-page="${current + 1}" ${current === total ? "disabled" : ""}>Next</button>`);
  return buttons.join("");
}

// ───────────────────────────────────────────────────────────
// START FOREVER FREE TEST
// ───────────────────────────────────────────────────────────
async function startForeverFreeTest(subjectId, subjectName) {
  const btn = document.getElementById(`free-btn-${subjectId}`);
  if (btn) setButtonLoading(btn, true, "Loading…");

  try {
    // Check if test exists
    const check = await apiFetch(`/api/tests/subject/${encodeURIComponent(subjectId)}/forever-free`);
    if (!check.test) {
      showToast("Free test is not available for this subject yet.", "error");
      return;
    }

    // Start the test
    const res = await apiFetch("/api/tests/start", {
      method: "POST",
      body: {
        testType: "forever-free",
        subjectId,
      },
    });

    // Store attempt in sessionStorage and redirect to mock-test page
    sessionStorage.setItem("pk_active_attempt", JSON.stringify(res));
    window.location.href = "mock-test.html";
  } catch (err) {
    showToast(err.message || "Could not start test.", "error");
  } finally {
    if (btn) setButtonLoading(btn, false);
  }
}

// ───────────────────────────────────────────────────────────
// START PAID TEST
// ───────────────────────────────────────────────────────────
async function startPaidTest(testId, subjectId) {
  // Check login first
  if (!isLoggedIn()) {
    showToast("Please log in to access paid tests.", "info");
    sessionStorage.setItem("pk_redirect_after_login", JSON.stringify({
      type: "paid-test",
      testId,
      subjectId,
    }));
    setTimeout(() => window.location.href = "login.html", 800);
    return;
  }

  const btn = document.getElementById(`start-test-${testId}`);
  if (btn) setButtonLoading(btn, true, "Loading…");

  try {
    const res = await apiFetch("/api/tests/start", {
      method: "POST",
      body: {
        testType: "homepage-paid",
        testId,
        subjectId,
      },
    });

    sessionStorage.setItem("pk_active_attempt", JSON.stringify(res));
    window.location.href = "mock-test.html";
  } catch (err) {
    if (err.status === 401) {
      showToast("Please log in to continue.", "info");
      setTimeout(() => window.location.href = "login.html", 800);
    } else if (err.code === "SUBSCRIPTION_REQUIRED") {
      showToast("This Mock Test Requires an Upgrade. Upgrade to Standard or Premium.", "error", 5000);
    } else {
      showToast(err.message || "Could not start test.", "error");
    }
  } finally {
    if (btn) setButtonLoading(btn, false);
  }
}

// ───────────────────────────────────────────────────────────
// LOAD PUBLIC SETTINGS (hero, about)
// ───────────────────────────────────────────────────────────
async function loadPublicSettings() {
  try {
    const res = await apiFetch("/api/public/settings");
    const s = res.settings || {};

    if (s.heroHeading) {
      const el = document.getElementById("heroHeading");
      if (el) el.textContent = s.heroHeading;
    }
    if (s.heroDescription) {
      const el = document.getElementById("heroDescription");
      if (el) el.textContent = s.heroDescription;
    }
    if (s.aboutContent) {
      const el = document.getElementById("aboutContent");
      if (el) el.textContent = s.aboutContent;
    }
  } catch (err) {
    console.warn("Could not load public settings:", err.message);
  }
}

// ───────────────────────────────────────────────────────────
// INIT
// ───────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  loadSubjects();
  loadPublicSettings();
});

// Expose for inline onclick handlers
window.loadSubjects = loadSubjects;
window.startForeverFreeTest = startForeverFreeTest;
window.startPaidTest = startPaidTest;
