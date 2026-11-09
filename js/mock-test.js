// ═══════════════════════════════════════════════════════════
// PrepareKora — Mock Test Engine
// Handles: start screen, exam, timer, autosave, submit, review
// ═══════════════════════════════════════════════════════════

(function () {
  "use strict";

  // ─────────────────────────────────────────────────────────
  // STATE
  // ─────────────────────────────────────────────────────────
  const state = {
    attempt: null,
    questions: [],
    currentIdx: 0,
    answers: {},
    visited: {},
    marked: {},
    timerInterval: null,
    autosaveTimer: null,
    submitting: false,
    viewedResult: null
  };

  const STORAGE_ATTEMPT = "pk_active_attempt";
  const STORAGE_RESULT = "pk_view_result";

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

  function toast(msg, type) {
    if (typeof window.pkToast === "function") window.pkToast(msg, type);
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
      const err = new Error(data.error || data.message || `HTTP ${res.status}`);
      err.status = res.status;
      err.code = data.code;
      throw err;
    }
    return data;
  }

  // ─────────────────────────────────────────────────────────
  // SCREEN SWITCHER
  // ─────────────────────────────────────────────────────────
  function showScreen(name) {
    ["loadingScreen", "startScreen", "examScreen", "resultScreen", "errorScreen"].forEach((id) => {
      const el = $(id);
      if (el) el.hidden = true;
    });
    const target = $(name);
    if (target) target.hidden = false;
  }

  // ─────────────────────────────────────────────────────────
  // BILINGUAL PICKER
  // ─────────────────────────────────────────────────────────
  function pickLang(obj) {
    if (!obj) return "";
    const lang = (typeof getLang === "function" ? getLang() : "en") || "en";
    return obj[lang] || obj.en || obj.as || "";
  }

  // ─────────────────────────────────────────────────────────
  // START
  // ─────────────────────────────────────────────────────────
  async function boot() {
    const params = new URLSearchParams(window.location.search);
    const view = params.get("view");
    const attemptIdParam = params.get("attemptId");

    if (view === "result" && attemptIdParam) {
      // Direct result view
      await loadResultView(attemptIdParam);
      return;
    }

    // Check sessionStorage for view result
    try {
      const stored = sessionStorage.getItem(STORAGE_RESULT);
      if (stored) {
        const parsed = JSON.parse(stored);
        sessionStorage.removeItem(STORAGE_RESULT);
        if (parsed?.attemptId) {
          await loadResultView(parsed.attemptId);
          return;
        }
      }
    } catch (e) {}

    // Load active attempt
    let attemptData = null;
    try {
      const stored = sessionStorage.getItem(STORAGE_ATTEMPT);
      if (stored) {
        attemptData = JSON.parse(stored);
        sessionStorage.removeItem(STORAGE_ATTEMPT);
      }
    } catch (e) {}

    if (!attemptData) {
      showError("No active test found. Please start a test from the homepage.");
      return;
    }

    state.attempt = attemptData.attempt;
    state.questions = attemptData.questions || [];

    if (!state.attempt || state.questions.length === 0) {
      showError("Test data is invalid. Please start again.");
      return;
    }

    renderStartScreen();
  }

  function showError(msg) {
    showScreen("errorScreen");
    const el = $("errorText");
    if (el) el.textContent = msg;
  }

  // ─────────────────────────────────────────────────────────
  // START SCREEN
  // ─────────────────────────────────────────────────────────
  function renderStartScreen() {
    const a = state.attempt;
    $("startType").textContent =
      a.testType === "forever-free"
        ? "Forever Free Test"
        : a.testType === "daily"
        ? "Daily Test"
        : "Homepage Test";
    $("startTitle").textContent = a.testTitle || "Mock Test";
    $("startSubject").textContent = a.subject || "";
    $("startDuration").textContent = Math.round((a.durationSec || 0) / 60);
    $("startQuestions").textContent = a.totalQuestions || state.questions.length;
    $("startMarks").textContent = a.totalMarks || 0;
    $("beginBtn").addEventListener("click", startExam);
    showScreen("startScreen");
  }

  // ─────────────────────────────────────────────────────────
  // EXAM SCREEN
  // ─────────────────────────────────────────────────────────
  function startExam() {
    showScreen("examScreen");
    $("examTitle").textContent = state.attempt.testTitle || "Mock Test";
    renderPalette();
    renderQuestion(0);
    startTimer();
    bindExamActions();
  }

  function renderQuestion(idx) {
    if (idx < 0 || idx >= state.questions.length) return;
    state.currentIdx = idx;
    state.visited[idx] = true;

    const q = state.questions[idx];
    const qText = pickLang(q.question);

    $("qNumber").textContent = `Question ${idx + 1} of ${state.questions.length}`;
    $("examSub").textContent = `${state.questions.length} questions · ${state.attempt.totalMarks} marks`;
    $("qText").textContent = qText;

    const latex = $("qLatex");
    if (q.latex) {
      latex.hidden = false;
      latex.textContent = q.latex;
    } else {
      latex.hidden = true;
    }

    // Options
    const list = $("optionsList");
    list.innerHTML = "";

    q.options.forEach((opt) => {
      const selected = state.answers[idx] === opt.id;
      const label = document.createElement("label");
      label.className = "option" + (selected ? " is-selected" : "");
      label.innerHTML = `
        <input type="radio" name="q_${idx}" value="${escapeHtml(opt.id)}" ${selected ? "checked" : ""}>
        <span class="option-key">${escapeHtml(opt.id)}</span>
        <span class="option-text">${escapeHtml(pickLang(opt))}</span>
      `;
      label.addEventListener("click", (e) => {
        e.preventDefault();
        selectAnswer(idx, opt.id);
      });
      list.appendChild(label);
    });

    // Status
    updateQStatus(idx);
    updateNavButtons();
    renderPalette();

    // Mark button
    if (state.marked[idx]) $("markBtn").classList.add("is-active");
    else $("markBtn").classList.remove("is-active");
  }

  function selectAnswer(idx, optionId) {
    state.answers[idx] = optionId;
    // Update current option classes
    document.querySelectorAll(".option").forEach((el) => {
      const inp = el.querySelector("input");
      el.classList.toggle("is-selected", inp.value === optionId);
    });
    updateQStatus(idx);
    renderPalette();
    scheduleAutosave();
  }

  function clearAnswer(idx) {
    delete state.answers[idx];
    document.querySelectorAll(".option").forEach((el) => el.classList.remove("is-selected"));
    const inp = document.querySelector(`input[name="q_${idx}"]`);
    if (inp) inp.checked = false;
    updateQStatus(idx);
    renderPalette();
    scheduleAutosave();
  }

  function updateQStatus(idx) {
    const statusEl = $("qStatus");
    if (!statusEl) return;
    let label = "Not visited";
    if (state.marked[idx]) label = "Marked for review";
    else if (state.answers[idx]) label = "Answered";
    else if (state.visited[idx]) label = "Not answered";
    statusEl.textContent = label;
  }

  function updateNavButtons() {
    $("prevBtn").disabled = state.currentIdx === 0;
    const isLast = state.currentIdx === state.questions.length - 1;
    $("nextBtn").textContent = isLast ? "Review →" : "Next →";
  }

  function bindExamActions() {
    $("prevBtn").addEventListener("click", () => {
      if (state.currentIdx > 0) renderQuestion(state.currentIdx - 1);
    });
    $("nextBtn").addEventListener("click", () => {
      if (state.currentIdx < state.questions.length - 1) renderQuestion(state.currentIdx + 1);
      else openSubmitModal();
    });
    $("clearBtn").addEventListener("click", () => clearAnswer(state.currentIdx));
    $("markBtn").addEventListener("click", () => {
      state.marked[state.currentIdx] = !state.marked[state.currentIdx];
      $("markBtn").classList.toggle("is-active", !!state.marked[state.currentIdx]);
      updateQStatus(state.currentIdx);
      renderPalette();
    });
    $("submitBtn").addEventListener("click", openSubmitModal);
    $("openPaletteBtn").addEventListener("click", () => $("palettePanel").classList.add("open"));
    $("closePaletteBtn").addEventListener("click", () => $("palettePanel").classList.remove("open"));
    $("exitTestBtn").addEventListener("click", async (e) => {
      e.preventDefault();
      const ok = confirm("Exit without submitting? Your progress will be saved but the test won't be submitted.");
      if (!ok) return;
      await autosave();
      window.location.href = "index.html";
    });
  }

  // ─────────────────────────────────────────────────────────
  // PALETTE
  // ─────────────────────────────────────────────────────────
  function renderPalette() {
    const grid = $("paletteGrid");
    if (!grid) return;
    grid.innerHTML = state.questions
      .map((_, idx) => {
        const classes = ["palette-btn"];
        if (state.visited[idx]) classes.push("is-visited");
        if (state.answers[idx]) classes.push("is-answered");
        if (state.marked[idx]) classes.push("is-marked");
        if (idx === state.currentIdx) classes.push("is-current");
        return `<button class="${classes.join(" ")}" type="button" data-idx="${idx}">${idx + 1}</button>`;
      })
      .join("");

    grid.querySelectorAll("[data-idx]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.getAttribute("data-idx"), 10);
        renderQuestion(idx);
        $("palettePanel").classList.remove("open");
      });
    });
  }

  // ─────────────────────────────────────────────────────────
  // TIMER
  // ─────────────────────────────────────────────────────────
  function startTimer() {
    updateTimerText();
    state.timerInterval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((state.attempt.deadline - Date.now()) / 1000));
      updateTimerText(remaining);
      if (remaining <= 0) {
        clearInterval(state.timerInterval);
        toast("Time is up. Submitting…", "info");
        submitTest(true);
      }
    }, 1000);
  }

  function updateTimerText(remaining) {
    if (remaining === undefined) {
      remaining = Math.max(0, Math.floor((state.attempt.deadline - Date.now()) / 1000));
    }
    const m = Math.floor(remaining / 60);
    const s = remaining % 60;
    const el = $("timerText");
    if (el) el.textContent = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    const timerBox = $("examTimer");
    if (timerBox) timerBox.classList.toggle("is-warning", remaining <= 60);
  }

  // ─────────────────────────────────────────────────────────
  // AUTOSAVE
  // ─────────────────────────────────────────────────────────
  function scheduleAutosave() {
    clearTimeout(state.autosaveTimer);
    state.autosaveTimer = setTimeout(autosave, 1200);
  }

  async function autosave() {
    if (!state.attempt || state.submitting) return;
    try {
      await api("/api/tests/autosave", {
        method: "POST",
        body: { attemptId: state.attempt.attemptId, answers: state.answers }
      });
    } catch (err) {
      // Autosave failure is non-fatal — user can still submit
      console.warn("[autosave]", err.message);
    }
  }

  // ─────────────────────────────────────────────────────────
  // SUBMIT MODAL
  // ─────────────────────────────────────────────────────────
  function openSubmitModal() {
    const answered = Object.keys(state.answers).length;
    const marked = Object.values(state.marked).filter(Boolean).length;
    const unanswered = state.questions.length - answered;
    $("modalAnswered").textContent = answered;
    $("modalMarked").textContent = marked;
    $("modalUnanswered").textContent = unanswered;
    $("submitModal").classList.add("open");
    $("submitCancelBtn").onclick = () => $("submitModal").classList.remove("open");
    $("submitConfirmBtn").onclick = () => {
      $("submitModal").classList.remove("open");
      submitTest(false);
    };
  }

  // ─────────────────────────────────────────────────────────
  // SUBMIT
  // ─────────────────────────────────────────────────────────
  async function submitTest(auto) {
    if (state.submitting) return;
    state.submitting = true;
    clearInterval(state.timerInterval);

    try {
      const res = await api("/api/tests/submit", {
        method: "POST",
        body: { attemptId: state.attempt.attemptId, answers: state.answers }
      });
      renderResult(res.result);
    } catch (err) {
      toast(err.message || "Submit failed. Please try again.", "error");
      state.submitting = false;
      if (auto) {
        // Try one more time on auto-submit failure
        setTimeout(() => submitTest(true), 3000);
      }
    }
  }

  // ─────────────────────────────────────────────────────────
  // RESULT
  // ─────────────────────────────────────────────────────────
  function renderResult(result) {
    showScreen("resultScreen");

    $("resultType").textContent =
      result.testType === "forever-free"
        ? "Forever Free Test"
        : result.testType === "daily"
        ? "Daily Test"
        : "Homepage Test";
    $("resultTitle").textContent = result.testTitle || "Test completed";
    $("resultSub").textContent = result.subject || "";

    $("resultScore").textContent = result.score ?? 0;
    $("resultTotal").textContent = `/ ${result.totalMarks ?? 0}`;
    $("resultPercent").textContent = `${result.percentage ?? 0}%`;
    $("resultProgressBar").style.width = `${Math.min(100, result.percentage || 0)}%`;

    $("statCorrect").textContent = result.correct ?? 0;
    $("statWrong").textContent = result.wrong ?? 0;
    $("statUnattempted").textContent = result.unattempted ?? 0;
    $("statTime").textContent = formatTime(result.timeTaken || 0);

    $("reviewBtn").onclick = () => renderReview(result);
    // Auto-open review for immediate feedback
    renderReview(result);
  }

  function formatTime(sec) {
    if (sec < 60) return `${sec}s`;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s}s`;
  }

  function renderReview(result) {
    const container = $("reviewContainer");
    if (!container || !Array.isArray(result.review)) return;

    const html = result.review
      .map((r) => {
        const qText = pickLang(r.question);
        const correctId = r.correctAnswer;
        const userAns = r.userAnswer;

        const optionsHtml = (r.options || [])
          .map((o) => {
            const isCorrect = o.id === correctId;
            const isUserWrong = userAns && userAns === o.id && !isCorrect;
            let cls = "option";
            if (isCorrect) cls += " is-correct";
            if (isUserWrong) cls += " is-wrong";
            if (userAns && userAns === o.id && isCorrect) cls += " is-selected";
            return `
              <div class="${cls}" style="cursor: default;">
                <span class="option-key">${escapeHtml(o.id)}</span>
                <span class="option-text">${escapeHtml(pickLang(o))}</span>
                ${isCorrect ? '<span class="badge badge-accent" style="margin-left: 8px;">Correct</span>' : ""}
                ${isUserWrong ? '<span class="badge badge-live" style="margin-left: 8px;">Your answer</span>' : ""}
              </div>`;
          })
          .join("");

        const expEn = r.explanation?.en || "";
        const expAs = r.explanation?.as || "";
        const statusLabel =
          r.status === "correct" ? "Correct" : r.status === "wrong" ? "Wrong" : "Unattempted";
        const statusClass =
          r.status === "correct" ? "badge-accent" : r.status === "wrong" ? "badge-live" : "badge-muted";

        return `
          <div class="card" style="margin-bottom: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 10px;">
              <span class="q-number">Question ${r.index + 1}</span>
              <span class="badge ${statusClass}">${statusLabel}</span>
            </div>
            <div class="q-text" style="margin-bottom: 12px;">${escapeHtml(qText)}</div>
            <div class="options">${optionsHtml}</div>
            ${expEn ? `<div style="margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--border);">
              <div class="eyebrow">Explanation (English)</div>
              <div class="review-exp-body">${escapeHtml(expEn)}</div>
            </div>` : ""}
            ${expAs ? `<div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border);">
              <div class="eyebrow">অসমীয়া ব্যাখ্যা</div>
              <div class="review-exp-body" lang="as">${escapeHtml(expAs)}</div>
            </div>` : ""}
          </div>
        `;
      })
      .join("");

    container.innerHTML = html;

    // Scroll to review
    container.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // ─────────────────────────────────────────────────────────
  // LOAD RESULT VIEW (from history)
  // ─────────────────────────────────────────────────────────
  async function loadResultView(attemptId) {
    try {
      const res = await api(`/api/users/test-attempt/${attemptId}`);
      // Note: the Worker GET endpoint returns the full attempt
      // We rely on this being an auth'd call so user owns the attempt
      const attempt = res.attempt;
      if (!attempt) throw new Error("Attempt not found.");

      const result = {
        testType: attempt.testType,
        testTitle: attempt.testTitle,
        subject: attempt.subject,
        score: attempt.score,
        totalMarks: attempt.totalMarks,
        percentage: attempt.percentage,
        correct: attempt.correct,
        wrong: attempt.wrong,
        unattempted: attempt.unattempted,
        timeTaken: attempt.timeTaken,
        review: attempt.review || []
      };
      renderResult(result);
    } catch (err) {
      showError(err.message || "Could not load result.");
    }
  }

  // ─────────────────────────────────────────────────────────
  // INIT
  // ─────────────────────────────────────────────────────────
  function init() {
    const yearEl = $("currentYear");
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    boot().catch((err) => {
      console.error("[mock-test] boot failed:", err);
      showError(err.message || "Could not load test.");
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
