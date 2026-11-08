"use strict";

(function () {

  const API_BASE = (function () {
    const host = window.location.hostname;
    const isLocal = host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0" || host === "" || host.endsWith(".local");
    return isLocal ? "http://localhost:8787/api" : "https://preparekora-api.yadavsubba2003.workers.dev/api";
  })();

  const TOKEN_KEY = "pk_user_id_token";
  const $id = (id) => document.getElementById(id);

  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY) || ""; } catch (e) { return ""; }
  }

  function redirectToLogin() {
    try { localStorage.removeItem(TOKEN_KEY); } catch (e) {}
    window.location.replace("login.html");
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

  function showScreen(name) {
    ["quizLoading", "quizError", "quizScreen"].forEach(function (k) {
      const el = $id(k);
      if (el) el.hidden = (k !== name);
    });
  }

  function showError(title, message) {
    const t = $id("quizErrorTitle");
    const m = $id("quizErrorMessage");
    if (t) t.textContent = title;
    if (m) m.textContent = message || "";
    showScreen("quizError");
  }

  /* ---------- State ---------- */

  const params = new URLSearchParams(window.location.search);
  const date = params.get("date") || "";
  const subjectId = params.get("subject") || "";
  const slotParam = params.get("slot") || "";

  const state = {
    subjectName: "",
    slot: "",
    questions: [],
    answers: {},
    index: 0,
    startedAt: Date.now(),
    submitting: false
  };

  /* ---------- Fetch quiz ---------- */

  async function loadQuiz() {
    const token = getToken();
    if (!token) { redirectToLogin(); return; }

    if (!date || !subjectId) {
      showError("Missing date or subject", "Invalid link. Go back to dashboard.");
      return;
    }

    try {
      const res = await fetch(API_BASE + "/daily-quizzes/" + encodeURIComponent(date) + "/" + encodeURIComponent(subjectId), {
        method: "GET",
        headers: { "Authorization": "Bearer " + token }
      });

      if (res.status === 401 || res.status === 403) { redirectToLogin(); return; }
      if (res.status === 409) {
        showError("Already attempted", "You have already attempted this quiz today. Check your results.");
        return;
      }
      if (!res.ok) {
        let data = null;
        try { data = await res.json(); } catch (e) {}
        showError("Could not load quiz", (data && data.error) || ("HTTP " + res.status));
        return;
      }
      const data = await res.json();
      state.subjectName = data.subjectName || "Quiz";
      state.slot = data.slot || slotParam || "";
      state.questions = Array.isArray(data.questions) ? data.questions : [];
      state.answers = {};
      state.index = 0;
      state.startedAt = Date.now();

      if (state.questions.length === 0) {
        showError("Quiz empty", "This quiz has no questions.");
        return;
      }

      const subjectNameEl = $id("quizSubjectName");
      if (subjectNameEl) subjectNameEl.textContent = state.subjectName;

      renderQuestion();
      renderProgress();
      showScreen("quizScreen");
    } catch (err) {
      showError("Network error", err.message || "Could not connect to server.");
    }
  }

  /* ---------- Render question ---------- */

  function renderQuestion() {
    const q = state.questions[state.index];
    if (!q) return;

    const qNumberEl = $id("qNumber");
    const qStatusEl = $id("qStatus");
    const qTextEl = $id("qText");
    const optionsEl = $id("optionsFieldset");
    const prevBtn = $id("prevBtn");
    const nextBtn = $id("nextBtn");

    if (qNumberEl) qNumberEl.textContent = "Question " + (state.index + 1) + " of " + state.questions.length;
    if (qStatusEl) qStatusEl.textContent = hasAnswer(state.index) ? "Answered" : "Not answered";
    if (qTextEl) qTextEl.textContent = q.q || "";

    if (optionsEl) {
      optionsEl.replaceChildren();
      (q.options || []).forEach(function (opt, i) {
        const label = document.createElement("label");
        label.className = "option";
        if (state.answers[state.index] === i) label.classList.add("is-selected");

        const input = document.createElement("input");
        input.type = "radio";
        input.name = "q-option";
        input.value = String(i);
        input.checked = state.answers[state.index] === i;
        input.addEventListener("change", function () { selectOption(i); });

        const key = document.createElement("span");
        key.className = "option-key";
        key.textContent = "ABCD".charAt(i);

        const text = document.createElement("span");
        text.className = "option-text";
        text.textContent = opt || "";

        label.appendChild(input);
        label.appendChild(key);
        label.appendChild(text);
        optionsEl.appendChild(label);
      });
    }

    if (prevBtn) prevBtn.disabled = state.index === 0;
    if (nextBtn) {
      if (state.index === state.questions.length - 1) {
        nextBtn.textContent = "Finish";
        nextBtn.disabled = true;
      } else {
        nextBtn.textContent = "Next";
        nextBtn.disabled = false;
      }
    }
  }

  function renderProgress() {
    const progressEl = $id("quizProgress");
    if (!progressEl) return;
    const answered = Object.keys(state.answers).length;
    progressEl.textContent = answered + " / " + state.questions.length + " answered";
  }

  function hasAnswer(index) {
    return state.answers[index] !== undefined && state.answers[index] !== null;
  }

  function selectOption(optionIndex) {
    state.answers[state.index] = optionIndex;
    renderQuestion();
    renderProgress();
  }

  function goTo(index) {
    if (index < 0 || index >= state.questions.length) return;
    state.index = index;
    renderQuestion();
  }

  /* ---------- Submit ---------- */

  function openConfirm() {
    const answered = Object.keys(state.answers).length;
    const unanswered = state.questions.length - answered;
    const a = $id("confirmAnswered");
    const u = $id("confirmUnanswered");
    if (a) a.textContent = String(answered);
    if (u) u.textContent = String(unanswered);
    const overlay = $id("confirmOverlay");
    if (overlay) {
      overlay.hidden = false;
      overlay.classList.add("open");
    }
  }

  function closeConfirm() {
    const overlay = $id("confirmOverlay");
    if (overlay) {
      overlay.hidden = true;
      overlay.classList.remove("open");
    }
  }

  async function submitQuiz() {
    if (state.submitting) return;
    state.submitting = true;

    const token = getToken();
    if (!token) { redirectToLogin(); return; }

    const timeTaken = Math.round((Date.now() - state.startedAt) / 1000);

    // Convert answers to string keys
    const answersPayload = {};
    Object.keys(state.answers).forEach(function (k) {
      answersPayload[String(k)] = state.answers[k];
    });

    try {
      const res = await fetch(API_BASE + "/daily-quizzes/" + encodeURIComponent(date) + "/" + encodeURIComponent(subjectId) + "/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + token
        },
        body: JSON.stringify({
          answers: answersPayload,
          timeTaken: timeTaken
        })
      });

      if (res.status === 401 || res.status === 403) { redirectToLogin(); return; }

      let data = null;
      try { data = await res.json(); } catch (e) {}

      if (!res.ok) {
        toast((data && data.error) || "Submit failed", "error");
        state.submitting = false;
        closeConfirm();
        return;
      }

      const resultSlot = data.slot || slotParam || "";

      // Store result for result page
      try {
        sessionStorage.setItem("pk_quiz_result_" + date + "_" + subjectId + "_" + resultSlot, JSON.stringify(data));
      } catch (e) {}

      // Redirect to result
      window.location.replace("result.html?date=" + encodeURIComponent(date) + "&subject=" + encodeURIComponent(subjectId) + (resultSlot ? ("&slot=" + encodeURIComponent(resultSlot)) : ""));
    } catch (err) {
      toast("Network error. Try again.", "error");
      state.submitting = false;
      closeConfirm();
    }
  }

  /* ---------- Wire events ---------- */

  const prevBtn = $id("prevBtn");
  if (prevBtn) prevBtn.addEventListener("click", function () { goTo(state.index - 1); });

  const nextBtn = $id("nextBtn");
  if (nextBtn) nextBtn.addEventListener("click", function () { goTo(state.index + 1); });

  const submitBtn = $id("submitQuizBtn");
  if (submitBtn) submitBtn.addEventListener("click", function () { openConfirm(); });

  const confirmCancel = $id("confirmCancel");
  if (confirmCancel) confirmCancel.addEventListener("click", closeConfirm);

  const confirmSubmit = $id("confirmSubmit");
  if (confirmSubmit) confirmSubmit.addEventListener("click", function () {
    closeConfirm();
    submitQuiz();
  });

  const overlay = $id("confirmOverlay");
  if (overlay) {
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) closeConfirm();
    });
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeConfirm();
  });

  /* ---------- Init ---------- */

  loadQuiz();

})();
