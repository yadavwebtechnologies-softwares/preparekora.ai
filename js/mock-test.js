"use strict";

(function () {

  const API_BASE = (function () {
    const host = window.location.hostname;
    const isLocal =
      host === "localhost" || host === "127.0.0.1" ||
      host === "0.0.0.0" || host === "" || host.endsWith(".local");
    return isLocal
      ? "http://localhost:8787/api"
      : "https://preparekora-api.yadavsubba2003.workers.dev/api";
  })();

    const USER_TOKEN_KEY = "pk_user_id_token";

  function getUserToken() {
    try { return localStorage.getItem(USER_TOKEN_KEY) || ""; } catch (e) { return ""; }
  }

  async function fetchUserProfile() {
    const token = getUserToken();
    if (!token) return null;
    try {
      const res = await fetch(API_BASE + "/user/profile", {
        method: "GET",
        headers: { "Authorization": "Bearer " + token }
      });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) { return null; }
  }

  async function apiGet(path) {
    if (window.PK_API && window.PK_API.getPublishedTest) {
      return window.PK_API.getPublishedTest(decodeURIComponent(path.replace("/tests/", "")));
    }
    const res = await fetch(API_BASE + path, { headers: { Accept: "application/json" } });
    if (!res.ok) { const e = new Error("HTTP " + res.status); e.status = res.status; throw e; }
    return res.json();
  }

  async function apiSubmit(id, payload, token) {
    const url = API_BASE + "/tests/" + encodeURIComponent(id) + "/submit";
    const headers = { "Content-Type": "application/json", Accept: "application/json" };
    if (token) headers["Authorization"] = "Bearer " + token;
    const res = await fetch(url, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const data = await res.json().catch(function () { return null; });
      const e = new Error((data && data.error) || ("HTTP " + res.status));
      e.status = res.status;
      throw e;
    }
    return res.json();
  }

  async function apiGetSettings() {
    try {
      const res = await fetch(API_BASE + "/settings", { headers: { Accept: "application/json" } });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) { return null; }
  }

  async function apiTranslate(text, target) {
    if (window.PK && window.PK.translate) return window.PK.translate(text, target);
    return text;
  }

  async function apiTranslateMany(items, target) {
    if (window.PK && window.PK.translateMany) return window.PK.translateMany(items, target);
    return items;
  }

  /* ---------- DOM ---------- */

  const screens = {
    loading:  document.getElementById("loadingScreen"),
    notFound: document.getElementById("notFoundScreen"),
    start:    document.getElementById("startScreen"),
    name:     document.getElementById("nameScreen"),
    test:     document.getElementById("testScreen"),
    result:   document.getElementById("resultScreen")
  };

  const startTitle      = document.getElementById("startTitle");
  const startPublisher  = document.getElementById("startPublisher");
  const startQuestions  = document.getElementById("startQuestions");
  const startMinutes    = document.getElementById("startMinutes");
  const startMarks      = document.getElementById("startMarks");
  const startBtn        = document.getElementById("startBtn");

  const nameForm        = document.getElementById("nameForm");
  const nameTestInfo    = document.getElementById("nameTestInfo");
  const userNameInput   = document.getElementById("userName");
  const userWhatsAppInput = document.getElementById("userWhatsApp");
  const nameError       = document.getElementById("nameError");
  const waError         = document.getElementById("waError");
  const backToStartBtn  = document.getElementById("backToStartBtn");

  const examTitle       = document.getElementById("examTitle");
  const examSub         = document.getElementById("examSub");
  const timerEl         = document.getElementById("timer");
  const timerText       = document.getElementById("timerText");
  const submitBtn       = document.getElementById("submitBtn");
  const paletteToggle   = document.getElementById("paletteToggle");

  const qNumber         = document.getElementById("qNumber");
  const qStatus         = document.getElementById("qStatus");
  const qText           = document.getElementById("qText");
  const optionsFieldset = document.getElementById("optionsFieldset");
  const optionsLegend   = document.getElementById("optionsLegend");

  const markBtn         = document.getElementById("markBtn");
  const clearBtn        = document.getElementById("clearBtn");
  const prevBtn         = document.getElementById("prevBtn");
  const nextBtn         = document.getElementById("nextBtn");

  const palettePanel    = document.getElementById("palettePanel");
  const paletteGrid     = document.getElementById("paletteGrid");
  const paletteClose    = document.getElementById("paletteClose");
  const paletteBackdrop = document.getElementById("paletteBackdrop");

  const confirmOverlay  = document.getElementById("confirmOverlay");
  const confirmAnswered = document.getElementById("confirmAnswered");
  const confirmUnanswered = document.getElementById("confirmUnanswered");
  const confirmMarked   = document.getElementById("confirmMarked");
  const confirmCancel   = document.getElementById("confirmCancel");
  const confirmSubmit   = document.getElementById("confirmSubmit");

  const interruptOverlay  = document.getElementById("interruptOverlay");
  const interruptWarnCount= document.getElementById("interruptWarnCount");
  const resumeBtn         = document.getElementById("resumeBtn");
  const terminateOverlay  = document.getElementById("terminateOverlay");
  const terminateRemaining= document.getElementById("terminateRemaining");

  const resultTitle     = document.getElementById("resultTitle");
  const resultPublisher = document.getElementById("resultPublisher");
  const scoreValue      = document.getElementById("scoreValue");
  const scoreTotal      = document.getElementById("scoreTotal");
  const scorePercent    = document.getElementById("scorePercent");
  const progressFill    = document.getElementById("progressFill");
  const statCorrect     = document.getElementById("statCorrect");
  const statWrong       = document.getElementById("statWrong");
  const statUnattempted = document.getElementById("statUnattempted");
  const statTime        = document.getElementById("statTime");
  const downloadBtn     = document.getElementById("downloadBtn");
  const retakeBtn       = document.getElementById("retakeBtn");

  const srStatus        = document.getElementById("srStatus");
  
  const qLatex          = document.getElementById("qLatex");
  const qImage          = document.getElementById("qImage");
  const numericInput    = document.getElementById("numericInput");
  const numericField    = document.getElementById("numericField");
  const numericClear    = document.getElementById("numericClear");
  const keypad          = document.getElementById("keypad");
  const scratchpadToggle= document.getElementById("scratchpadToggle");
  const scratchpadBody  = document.getElementById("scratchpadBody");
  const scratchpadCanvas= document.getElementById("scratchpadCanvas");
  const scratchpadClear = document.getElementById("scratchpadClear");

  const menuToggle      = document.getElementById("menuToggle");
  const menuPanel       = document.getElementById("menuPanel");
  const menuIcon        = document.getElementById("menuIcon");

  /* ---------- State ---------- */

  const state = {
    publicTest: null,
    answers: {},
    marked: new Set(),
    visited: new Set(),
    index: 0,
    started: false,
    finished: false,
    submitting: false,
    remaining: 0,
    endAt: 0,
    startedAt: 0,
    elapsed: 0,
    timerId: null,
    warnedOneMinute: false,
    result: null,
    userName: "",
    userWhatsApp: "",
    userEmail: "",
    userId: "",
    translatedTitle: "",
    translatedPublisher: "",
    settings: { enabled: true, duration: 5 }
  };
    window.MockTestState = state;

  /* ---------- Interruption ---------- */

  const MAX_INTERRUPTIONS = 5;
  let awayActive = false;
  let terminateCountdownId = null;

  function interruptKey() {
    return "pk_interrupt_" + (state.publicTest ? state.publicTest.id : "unknown");
  }

  function terminateKey() {
    return "pk_terminated_" + (state.publicTest ? state.publicTest.id : "unknown");
  }

  function getInterruptCount() {
    try {
      const n = parseInt(localStorage.getItem(interruptKey()) || "0", 10);
      return isNaN(n) ? 0 : n;
    } catch (e) { return 0; }
  }

  function setInterruptCount(n) {
    try { localStorage.setItem(interruptKey(), String(n)); } catch (e) {}
  }

  function clearInterruptState() {
    try {
      localStorage.removeItem(interruptKey());
      localStorage.removeItem(terminateKey());
    } catch (e) {}
  }

  function getRemainingCooldown() {
    try {
      const raw = localStorage.getItem(terminateKey());
      if (!raw) return 0;
      const at = parseInt(raw, 10);
      if (isNaN(at)) return 0;
      const durationMs = state.settings.duration * 60 * 1000;
      const elapsed = Date.now() - at;
      if (elapsed >= durationMs) {
        clearInterruptState();
        return 0;
      }
      return Math.ceil((durationMs - elapsed) / 1000);
    } catch (e) { return 0; }
  }

  function isSessionTerminated() {
    return getRemainingCooldown() > 0;
  }

  function markTerminated() {
    try { localStorage.setItem(terminateKey(), String(Date.now())); } catch (e) {}
  }

  /* ---------- Utils ---------- */

  function t(key, vars) {
    return (window.PK && window.PK.t) ? window.PK.t(key, vars) : key;
  }

  function locale() {
    return (window.PK && window.PK.locale) ? window.PK.locale() : "en-IN";
  }

  function formatClock(seconds) {
    const s = Math.max(0, Math.round(seconds));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return String(m).padStart(2, "0") + ":" + String(r).padStart(2, "0");
  }

  function announce(msg) {
    if (!srStatus) return;
    srStatus.textContent = "";
    setTimeout(function () { srStatus.textContent = msg; }, 60);
  }

  function showScreen(name) {
    Object.keys(screens).forEach(function (k) {
      if (screens[k]) screens[k].hidden = (k !== name);
    });
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function hasAnswer(i) {
    return Object.prototype.hasOwnProperty.call(state.answers, i);
  }

  function statusFor(i) {
    if (state.marked.has(i)) return t("statusMarked");
    if (hasAnswer(i)) return t("statusAnswered");
    if (state.visited.has(i)) return t("statusNotAnswered");
    return t("statusNotVisited");
  }

  function publisherLine(name) {
    return t("byLine", { name: name || "—" });
  }
    /* ---------- Math / Reasoning helpers ---------- */

  function getQuestionType(q) {
    if (!q || typeof q !== "object") return "mcq";
    const tp = q.type;
    if (tp === "math" || tp === "reasoning" || tp === "mcq") return tp;
    return "mcq";
  }

  function renderLatex(el, tex) {
    if (!el || !tex) return;
    el.replaceChildren();
    if (window.katex && typeof window.katex.render === "function") {
      try {
        window.katex.render(String(tex), el, { throwOnError: false, displayMode: true });
      } catch (e) {
        el.textContent = String(tex);
      }
    } else {
      el.textContent = String(tex);
    }
  }

  function setNumericAnswer(val) {
    const s = String(val == null ? "" : val);
    if (s === "") {
      delete state.answers[state.index];
    } else {
      state.answers[state.index] = s;
    }
    if (numericField) numericField.value = s;
    qStatus.textContent = statusFor(state.index);
    renderPalette();
    updateNavSummary();
  }

  function setupKeypad() {
    if (!keypad || !numericField) return;
    keypad.addEventListener("click", function (e) {
      const btn = e.target.closest("button[data-key]");
      if (!btn) return;
      const key = btn.getAttribute("data-key");
      let cur = String(numericField.value || "");
      if (key === "backspace") {
        cur = cur.slice(0, -1);
      } else if (key === "-") {
        if (cur.startsWith("-")) cur = cur.slice(1);
        else if (cur === "") cur = "-";
        else cur = "-" + cur;
      } else if (key === ".") {
        if (!cur.includes(".")) cur = (cur === "" ? "0." : cur + ".");
      } else {
        if (cur === "0" && key !== ".") cur = key;
        else cur = cur + key;
      }
      setNumericAnswer(cur);
    });
    if (numericClear) numericClear.addEventListener("click", function () { setNumericAnswer(""); });
  }

  function setupScratchpad() {
    if (!scratchpadToggle || !scratchpadBody || !scratchpadCanvas) return;

    let ctx = null;
    let drawing = false;
    let mode = "pen";
    let lastX = 0;
    let lastY = 0;
    let canvasReady = false;

    function initCanvas() {
      if (canvasReady) return;
      const rect = scratchpadCanvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const dpr = window.devicePixelRatio || 1;
      scratchpadCanvas.width = Math.round(rect.width * dpr);
      scratchpadCanvas.height = Math.round(rect.height * dpr);
      ctx = scratchpadCanvas.getContext("2d");
      if (!ctx) return;
      ctx.scale(dpr, dpr);
      ctx.strokeStyle = "#171717";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      canvasReady = true;
    }

    scratchpadToggle.addEventListener("click", function () {
      const isOpen = !scratchpadBody.hidden;
      if (isOpen) {
        scratchpadBody.hidden = true;
        scratchpadToggle.setAttribute("aria-expanded", "false");
      } else {
        scratchpadBody.hidden = false;
        scratchpadToggle.setAttribute("aria-expanded", "true");
        setTimeout(initCanvas, 30);
      }
    });

    function getPos(e) {
      const r = scratchpadCanvas.getBoundingClientRect();
      let cx = 0, cy = 0;
      if (e.touches && e.touches[0]) { cx = e.touches[0].clientX; cy = e.touches[0].clientY; }
      else { cx = e.clientX; cy = e.clientY; }
      return { x: cx - r.left, y: cy - r.top };
    }

    function start(e) {
      initCanvas();
      if (!ctx) return;
      drawing = true;
      const p = getPos(e);
      lastX = p.x; lastY = p.y;
    }

    function move(e) {
      if (!drawing || !ctx) return;
      if (e.cancelable) e.preventDefault();
      const p = getPos(e);
      ctx.globalCompositeOperation = mode === "eraser" ? "destination-out" : "source-over";
      ctx.lineWidth = mode === "eraser" ? 20 : 2;
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      lastX = p.x; lastY = p.y;
    }

    function stop() { drawing = false; }

    scratchpadCanvas.addEventListener("mousedown", start);
    scratchpadCanvas.addEventListener("mousemove", move);
    scratchpadCanvas.addEventListener("mouseup", stop);
    scratchpadCanvas.addEventListener("mouseleave", stop);
    scratchpadCanvas.addEventListener("touchstart", start, { passive: true });
    scratchpadCanvas.addEventListener("touchmove", move, { passive: false });
    scratchpadCanvas.addEventListener("touchend", stop);

    scratchpadBody.querySelectorAll(".scratchpad-mode").forEach(function (btn) {
      btn.addEventListener("click", function () {
        mode = btn.getAttribute("data-mode") || "pen";
        scratchpadBody.querySelectorAll(".scratchpad-mode").forEach(function (b) {
          const active = b === btn;
          b.classList.toggle("is-active", active);
          b.setAttribute("aria-pressed", String(active));
        });
      });
    });

    if (scratchpadClear) {
      scratchpadClear.addEventListener("click", function () {
        if (ctx && canvasReady) {
          const rect = scratchpadCanvas.getBoundingClientRect();
          ctx.save();
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.clearRect(0, 0, scratchpadCanvas.width, scratchpadCanvas.height);
          ctx.restore();
        }
      });
    }

    window.addEventListener("resize", function () {
      canvasReady = false;
      ctx = null;
      if (!scratchpadBody.hidden) setTimeout(initCanvas, 50);
    });
  }

  /* ---------- Load test ---------- */

  const params = new URLSearchParams(window.location.search);
  const testId = params.get("test") || "";
  
  /* ---------- Heartbeat (live presence) ---------- */

  let heartbeatSessionId = "";
  let heartbeatIntervalId = null;

  function makeHeartbeatId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }

  function startHeartbeat() {
    if (!state.publicTest || !testId) return;

    heartbeatSessionId = makeHeartbeatId();
    const payload = {
      testId: testId,
      sessionId: heartbeatSessionId,
      userName: state.userName || ""
    };

    fetch(API_BASE + "/sessions/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).catch(function () {});

    if (heartbeatIntervalId) clearInterval(heartbeatIntervalId);
    heartbeatIntervalId = setInterval(function () {
      if (!heartbeatSessionId) return;
      fetch(API_BASE + "/sessions/ping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testId: testId, sessionId: heartbeatSessionId })
      }).catch(function () {});
    }, 20000);
  }

  function stopHeartbeat() {
    if (heartbeatIntervalId) {
      clearInterval(heartbeatIntervalId);
      heartbeatIntervalId = null;
    }
    if (!heartbeatSessionId || !testId) return;

    const payload = JSON.stringify({ testId: testId, sessionId: heartbeatSessionId });
    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon(API_BASE + "/sessions/end", payload);
      } else {
        fetch(API_BASE + "/sessions/end", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
          keepalive: true
        }).catch(function () {});
      }
    } catch (e) {}
    heartbeatSessionId = "";
  }

  window.addEventListener("beforeunload", function () { stopHeartbeat(); });

  async function loadTest() {
    if (!testId) { showScreen("notFound"); return; }

    try {
      const settingsRes = await apiGetSettings();
      if (settingsRes) {
        state.settings = {
          enabled: settingsRes.interruptionEnabled !== false,
          duration: Number(settingsRes.interruptionDuration) || 5
        };
      }
    } catch (e) { /* use defaults */ }

    try {
      const res = await apiGet("/tests/" + encodeURIComponent(testId));
      state.publicTest = res;
      state.translatedTitle = res.title;
      state.translatedPublisher = res.publisherName;

      if (isSessionTerminated()) {
        renderStart();
        showScreen("test");
        showTerminateModal();
        return;
      }

      clearInterruptState();
      renderStart();
      showScreen("start");
      translateStartIfNeeded();
    } catch (err) {
      showScreen("notFound");
    }
  }

  /* ---------- Start screen ---------- */

  function renderStart() {
    const pt = state.publicTest;
    if (!pt) return;

    startTitle.textContent = state.translatedTitle || pt.title;
    startPublisher.textContent = publisherLine(state.translatedPublisher || pt.publisherName);
    startQuestions.textContent = String(pt.questions.length);
    startMinutes.textContent = String(pt.minutes);
    startMarks.textContent = String(pt.questions.length);

    nameTestInfo.textContent =
      (state.translatedTitle || pt.title) + " — " +
      publisherLine(state.translatedPublisher || pt.publisherName);
  }

  async function translateStartIfNeeded() {
    if (!window.PK || PK.lang !== "as" || !state.publicTest) return;
    try {
      const results = await Promise.all([
        apiTranslate(state.publicTest.title, "as"),
        apiTranslate(state.publicTest.publisherName, "as")
      ]);
      state.translatedTitle = results[0] || state.publicTest.title;
      state.translatedPublisher = results[1] || state.publicTest.publisherName;
      renderStart();
    } catch (err) {}
  }

  if (startBtn) {
    startBtn.addEventListener("click", async function () {
      // Login mandatory — double check
      const token = getUserToken();
      if (!token) {
        try { sessionStorage.setItem("pk_post_login_redirect", window.location.href); } catch (e) {}
        window.location.replace("login.html");
        return;
      }

      // Fetch profile — skip name screen if name available
      const profile = await fetchUserProfile();
      if (!profile || !profile.name || !profile.name.trim()) {
        // Profile missing name — show name screen as fallback
        showScreen("name");
        setTimeout(function () { if (userNameInput) userNameInput.focus(); }, 60);
        return;
      }

      // Auto-fill and begin
      state.userName = profile.name.trim().slice(0, 60);
      state.userWhatsApp = ""; // not collected automatically
      state.userEmail = profile.email || "";
      state.userId = profile.uid || "";

      beginTest();
    });
  }

  if (backToStartBtn) {
    backToStartBtn.addEventListener("click", function () { showScreen("start"); });
  }

  /* ---------- Name form ---------- */

  function validateName() {
    const raw = userNameInput.value.trim();
    if (!raw) { nameError.textContent = t("requiredField"); nameError.hidden = false; userNameInput.classList.add("is-invalid"); return null; }
    if (raw.length < 2) { nameError.textContent = t("nameTooShort"); nameError.hidden = false; userNameInput.classList.add("is-invalid"); return null; }
    if (raw.length > 60) { nameError.textContent = t("nameTooLong"); nameError.hidden = false; userNameInput.classList.add("is-invalid"); return null; }
    nameError.hidden = true; userNameInput.classList.remove("is-invalid"); return raw;
  }

  function validateWhatsApp() {
    const raw = userWhatsAppInput.value.trim().replace(/[\s-]/g, "");
    if (!raw) { waError.hidden = true; userWhatsAppInput.classList.remove("is-invalid"); return ""; }
    if (!/^[0-9]{10,15}$/.test(raw)) { waError.textContent = t("invalidWhatsApp"); waError.hidden = false; userWhatsAppInput.classList.add("is-invalid"); return null; }
    waError.hidden = true; userWhatsAppInput.classList.remove("is-invalid"); return raw;
  }

  if (userNameInput) {
    userNameInput.addEventListener("input", function () {
      if (userNameInput.classList.contains("is-invalid")) validateName();
    });
  }

  if (userWhatsAppInput) {
    userWhatsAppInput.addEventListener("input", function () {
      if (userWhatsAppInput.classList.contains("is-invalid")) validateWhatsApp();
    });
  }

  if (nameForm) {
    nameForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const name = validateName();
      const wa = validateWhatsApp();
      if (name === null) { userNameInput.focus(); return; }
      if (wa === null) { userWhatsAppInput.focus(); return; }
      state.userName = name;
      state.userWhatsApp = wa;
      beginTest();
    });
  }

  /* ---------- Begin test ---------- */

  function beginTest() {
    if (isSessionTerminated()) {
      showScreen("test");
      showTerminateModal();
      return;
    }

    state.started = true;
    state.index = 0;
    state.answers = {};
    state.marked.clear();
    state.visited.clear();
    state.finished = false;
    state.submitting = false;

    clearInterruptState();

    showScreen("test");
    examTitle.textContent = state.translatedTitle || state.publicTest.title;
    renderQuestion(true);
    renderPalette();
    updateNavSummary();
    startTimer();

    startHeartbeat();

    announce(t("questionOf", { n: 1, total: state.publicTest.questions.length }));
    if (nextBtn) nextBtn.focus();
  }
    /* ---------- Option LaTeX render ---------- */

  function renderOptionText(el, raw) {
    const str = String(raw || "");
    if (!str) { el.textContent = ""; return; }
    if (!window.katex || str.indexOf("$") === -1) { el.textContent = str; return; }
    el.replaceChildren();
    let i = 0;
    while (i < str.length) {
      const open = str.indexOf("$", i);
      if (open === -1) { el.appendChild(document.createTextNode(str.slice(i))); break; }
      if (open > i) el.appendChild(document.createTextNode(str.slice(i, open)));
      const close = str.indexOf("$", open + 1);
      if (close === -1) { el.appendChild(document.createTextNode(str.slice(open))); break; }
      const tex = str.slice(open + 1, close);
      const span = document.createElement("span");
      try { window.katex.render(tex, span, { throwOnError: false }); }
      catch (e) { span.textContent = tex; }
      el.appendChild(span);
      i = close + 1;
    }
  }


  /* ---------- Question rendering ---------- */

  async function renderQuestion(markVisited) {
    const pt = state.publicTest;
    if (!pt) return;
    const index = state.index;
    const question = pt.questions[index];
    if (!question) return;

    if (markVisited !== false) state.visited.add(index);

    qNumber.textContent = t("questionOf", { n: index + 1, total: pt.questions.length });
    qStatus.textContent = statusFor(index);
    qText.textContent = question.q;

    const qType = getQuestionType(question);

    /* --- LaTeX --- */
    if (qLatex) {
      if (question.latex && question.latex.trim()) {
        qLatex.hidden = false;
        renderLatex(qLatex, question.latex);
      } else {
        qLatex.hidden = true;
        qLatex.replaceChildren();
      }
    }

    /* --- Image --- */
    if (qImage) {
      qImage.replaceChildren();
      if (question.imageBase64 && String(question.imageBase64).startsWith("data:image")) {
        const img = document.createElement("img");
        img.src = question.imageBase64;
        img.alt = "";
        img.loading = "lazy";
        qImage.appendChild(img);
        qImage.hidden = false;
      } else {
        qImage.hidden = true;
      }
    }

    optionsFieldset.replaceChildren();

    const mathHasOptions = qType === "math" && Array.isArray(question.options) && question.options.length === 4;

    if (qType === "math" && !mathHasOptions) {
      optionsFieldset.hidden = true;
      if (numericInput) numericInput.hidden = false;
      const existing = state.answers[index];
      if (numericField) {
        numericField.value = (existing !== undefined && existing !== null && String(existing) !== "") ? String(existing) : "";
      }
    } else {
      if (numericInput) numericInput.hidden = true;
      optionsFieldset.hidden = false;

      const selected = hasAnswer(index) ? state.answers[index] : null;

      const buildOptions = function (optionTexts, optionImages) {
        optionTexts.forEach(function (optText, optionIndex) {
          const label = document.createElement("label");
          label.className = "option";
          label.dataset.value = String(optionIndex);
          if (selected === optionIndex) label.classList.add("is-selected");

          const input = document.createElement("input");
          input.type = "radio";
          input.name = "q-option";
          input.value = String(optionIndex);
          input.checked = selected === optionIndex;
          input.addEventListener("change", function () { selectOption(optionIndex); });

          const key = document.createElement("span");
          key.className = "option-key";
          key.setAttribute("aria-hidden", "true");
          key.textContent = "ABCD".charAt(optionIndex);

          const text = document.createElement("span");
          text.className = "option-text";
          renderOptionText(text, optText || "");

          label.appendChild(input);
          label.appendChild(key);
          label.appendChild(text);

          if (optionImages && optionImages[optionIndex] && String(optionImages[optionIndex]).startsWith("data:image")) {
            const img = document.createElement("img");
            img.src = optionImages[optionIndex];
            img.alt = "";
            img.style.maxWidth = "100%";
            img.style.marginTop = "6px";
            img.style.borderRadius = "4px";
            text.appendChild(document.createElement("br"));
            text.appendChild(img);
          }

          optionsFieldset.appendChild(label);
        });
      };

      buildOptions(question.options || [], question.optionImages || null);
    }

    prevBtn.disabled = index === 0;
    nextBtn.disabled = index === pt.questions.length - 1;
    updateMarkButton();
    updateNavSummary();

    /* --- Assamese translation (skip math numeric input) --- */
    if (window.PK && PK.lang === "as") {
      try {
        if (qType === "math" && !mathHasOptions) {
          const translated = await apiTranslate(question.q, "as");
          if (translated) qText.textContent = translated;
        } else {
          const items = [question.q].concat(question.options || []);
          const translated = await apiTranslateMany(items, "as");
          if (translated && translated.length === (question.options || []).length + 1) {
            qText.textContent = translated[0];
            const currentSelected = hasAnswer(index) ? state.answers[index] : null;
            optionsFieldset.replaceChildren();
            const rebuilt = function (optionTexts, optionImages) {
              optionTexts.forEach(function (optText, optionIndex) {
                const label = document.createElement("label");
                label.className = "option";
                label.dataset.value = String(optionIndex);
                if (currentSelected === optionIndex) label.classList.add("is-selected");

                const input = document.createElement("input");
                input.type = "radio";
                input.name = "q-option";
                input.value = String(optionIndex);
                input.checked = currentSelected === optionIndex;
                input.addEventListener("change", function () { selectOption(optionIndex); });

                const key = document.createElement("span");
                key.className = "option-key";
                key.setAttribute("aria-hidden", "true");
                key.textContent = "ABCD".charAt(optionIndex);

                const text = document.createElement("span");
                text.className = "option-text";
                renderOptionText(text, optText || "");

                label.appendChild(input);
                label.appendChild(key);
                label.appendChild(text);

                if (optionImages && optionImages[optionIndex] && String(optionImages[optionIndex]).startsWith("data:image")) {
                  const img = document.createElement("img");
                  img.src = optionImages[optionIndex];
                  img.alt = "";
                  img.style.maxWidth = "100%";
                  img.style.marginTop = "6px";
                  img.style.borderRadius = "4px";
                  text.appendChild(document.createElement("br"));
                  text.appendChild(img);
                }

                optionsFieldset.appendChild(label);
              });
            };
            rebuilt(translated.slice(1), question.optionImages || null);
            prevBtn.disabled = index === 0;
            nextBtn.disabled = index === pt.questions.length - 1;
            updateMarkButton();
            updateNavSummary();
          }
        }
      } catch (err) {}
    }
  }

  function selectOption(optionIndex) {
    state.answers[state.index] = Number(optionIndex);
    optionsFieldset.querySelectorAll(".option").forEach(function (label) {
      label.classList.toggle("is-selected", label.dataset.value === String(optionIndex));
    });
    qStatus.textContent = statusFor(state.index);
    renderPalette();
    updateNavSummary();
  }

  function clearResponse() {
    const q = state.publicTest && state.publicTest.questions[state.index];
    const qType = getQuestionType(q);

    if (qType === "math") {
      if (!hasAnswer(state.index)) return;
      delete state.answers[state.index];
      if (numericField) numericField.value = "";
    } else {
      if (!hasAnswer(state.index)) return;
      delete state.answers[state.index];
      optionsFieldset.querySelectorAll(".option").forEach(function (label) { label.classList.remove("is-selected"); });
      optionsFieldset.querySelectorAll("input[type='radio']").forEach(function (input) { input.checked = false; });
    }

    qStatus.textContent = statusFor(state.index);
    renderPalette();
    updateNavSummary();
  }

  function updateNavSummary() {
    const answered = Object.keys(state.answers).length;
    const total = state.publicTest ? state.publicTest.questions.length : 0;
    if (examSub) examSub.textContent = answered + " / " + total;
  }

  function updateMarkButton() {
    const marked = state.marked.has(state.index);
    markBtn.classList.toggle("is-active", marked);
    markBtn.textContent = marked ? t("unmarkReview") : t("markForReview");
    markBtn.setAttribute("aria-pressed", String(marked));
  }

  function goTo(index) {
    const pt = state.publicTest;
    if (!pt) return;
    if (index < 0 || index >= pt.questions.length) return;
    if (index === state.index) { closePalette(); return; }
    state.index = index;
    renderQuestion(true);
    renderPalette();
    closePalette();
    announce(t("questionOf", { n: index + 1, total: pt.questions.length }) + ". " + statusFor(index));
  }

  function renderPalette() {
    const pt = state.publicTest;
    if (!pt || !paletteGrid) return;
    paletteGrid.replaceChildren();
    pt.questions.forEach(function (_, index) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "palette-btn";
      btn.textContent = String(index + 1);
      if (state.visited.has(index)) btn.classList.add("is-visited");
      if (hasAnswer(index)) btn.classList.add("is-answered");
      if (state.marked.has(index)) btn.classList.add("is-marked");
      if (index === state.index) { btn.classList.add("is-current"); btn.setAttribute("aria-current", "true"); }
      btn.setAttribute("aria-label", (index + 1) + ". " + statusFor(index));
      btn.addEventListener("click", function () { goTo(index); });
      paletteGrid.appendChild(btn);
    });
  }

  function openPalette() {
    if (!palettePanel) return;
    palettePanel.classList.add("open");
    paletteBackdrop.hidden = false;
    if (paletteClose) paletteClose.focus();
  }

  function closePalette() {
    if (!palettePanel) return;
    palettePanel.classList.remove("open");
    paletteBackdrop.hidden = true;
  }

  if (paletteToggle) {
    paletteToggle.addEventListener("click", function () {
      if (palettePanel.classList.contains("open")) closePalette();
      else openPalette();
    });
  }
  if (paletteClose) paletteClose.addEventListener("click", closePalette);
  if (paletteBackdrop) paletteBackdrop.addEventListener("click", closePalette);

  /* ---------- Timer ---------- */

  function updateTimer() {
    timerText.textContent = formatClock(state.remaining);
    timerEl.classList.toggle("is-warning", state.remaining <= 60);
    if (!state.warnedOneMinute && state.remaining <= 60 && state.remaining > 0) {
      state.warnedOneMinute = true;
      announce(t("oneMinuteLeft"));
    }
  }

  function startTimer() {
    const minutes = state.publicTest ? state.publicTest.minutes : 0;
    state.startedAt = Date.now();
    state.endAt = state.startedAt + minutes * 60 * 1000;
    state.remaining = minutes * 60;
    state.warnedOneMinute = false;
    updateTimer();
    if (state.timerId) window.clearInterval(state.timerId);
    state.timerId = window.setInterval(function () {
      const remaining = Math.max(0, Math.round((state.endAt - Date.now()) / 1000));
      state.remaining = remaining;
      updateTimer();
      if (remaining <= 0) {
        window.clearInterval(state.timerId);
        state.timerId = null;
        announce(t("timeUp"));
        submitTest();
      }
    }, 250);
  }

  /* ---------- Submit ---------- */

  async function submitTest() {
    if (state.finished || state.submitting) return;
    state.submitting = true;
    state.finished = true;

    if (state.timerId) { window.clearInterval(state.timerId); state.timerId = null; }
    closePalette();
    closeConfirm();

    stopHeartbeat();

    state.elapsed = Math.round((Date.now() - state.startedAt) / 1000);

    const payloadAnswers = {};
    Object.keys(state.answers).forEach(function (i) {
      const v = state.answers[i];
      const q = state.publicTest.questions[i];
      const qType = getQuestionType(q);
      const mathHasOptions = qType === "math" && Array.isArray(q.options) && q.options.length === 4;
      if (qType === "math" && !mathHasOptions) {
        const num = typeof v === "number" ? v : Number(v);
        if (isFinite(num) && String(v).trim() !== "") payloadAnswers[String(i)] = num;
      } else {
        const idx = typeof v === "number" ? v : Number(v);
        if (Number.isInteger(idx) && idx >= 0 && idx <= 3) payloadAnswers[String(i)] = idx;
      }
    });
    console.log("[PK DEBUG] state.answers count:", Object.keys(state.answers).length);
    console.log("[PK DEBUG] payloadAnswers count:", Object.keys(payloadAnswers).length);
    console.log("[PK DEBUG] sample:", JSON.stringify(state.answers).slice(0, 200));

    let scored = null;
    try {
      const token = getUserToken();
      scored = await apiSubmit(testId, {
        answers: payloadAnswers,
        userName: state.userName,
        userWhatsApp: state.userWhatsApp || "",
        userEmail: state.userEmail || "",
        timeTaken: state.elapsed || 0
      }, token);
    } catch (err) {
      scored = { correct: 0, wrong: 0, unattempted: state.publicTest.questions.length, total: state.publicTest.questions.length, percent: 0 };
    }

    state.result = {
      correct: Number(scored.correct) || 0,
      wrong: Number(scored.wrong) || 0,
      unattempted: Number(scored.unattempted) || 0,
      total: Number(scored.total) || state.publicTest.questions.length,
      percent: Number(scored.percent) || 0,
      correctAnswers: (scored && scored.correctAnswers) ? scored.correctAnswers : null,
      correctNumeric: (scored && scored.correctNumeric) ? scored.correctNumeric : null,
      questionTypes: (scored && scored.questionTypes) ? scored.questionTypes : null
    };

    showScreen("result");
    renderResult();
    announce(t("resultEyebrow") + ". " + t("scoreOf", { a: state.result.correct, b: state.result.total }));
  }

  function renderResult() {
    const r = state.result;
    if (!r) return;

    const title = state.translatedTitle || (state.publicTest ? state.publicTest.title : "");
    const pub = state.translatedPublisher || (state.publicTest ? state.publicTest.publisherName : "");

    resultTitle.textContent = title;
    resultPublisher.textContent = publisherLine(pub);

    scoreValue.textContent = String(r.correct);
    scoreTotal.textContent = "/ " + r.total;
    scorePercent.textContent = r.percent + "%";
    progressFill.style.width = r.percent + "%";

    statCorrect.textContent = String(r.correct);
    statWrong.textContent = String(r.wrong);
    statUnattempted.textContent = String(r.unattempted);
    statTime.textContent = formatClock(state.elapsed);

    if (window.ReviewModule && typeof window.ReviewModule.load === "function") {
      setTimeout(function () { window.ReviewModule.load(); }, 100);
    }
  }

  /* ---------- Confirm modal ---------- */

  let lastFocused = null;

  function openConfirm() {
    const total = state.publicTest ? state.publicTest.questions.length : 0;
    const answered = Object.keys(state.answers).length;
    confirmAnswered.textContent = String(answered);
    confirmUnanswered.textContent = String(total - answered);
    confirmMarked.textContent = String(state.marked.size);
    lastFocused = document.activeElement;
    confirmOverlay.classList.add("open");
    confirmOverlay.setAttribute("aria-hidden", "false");
    setTimeout(function () { if (confirmSubmit) confirmSubmit.focus(); }, 40);
  }

  function closeConfirm() {
    if (!confirmOverlay || !confirmOverlay.classList.contains("open")) return;
    confirmOverlay.classList.remove("open");
    confirmOverlay.setAttribute("aria-hidden", "true");
    if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
  }

  function trapFocus(event) {
    const focusables = confirmOverlay.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    const list = Array.prototype.filter.call(focusables, function (el) { return !el.disabled && el.offsetParent !== null; });
    if (!list.length) return;
    const first = list[0];
    const last = list[list.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  /* ---------- Interruption logic ---------- */

  function showInterruptModal(count) {
    if (!interruptOverlay) return;
    if (interruptWarnCount) {
      interruptWarnCount.textContent = t("interruptWarn", { n: count, total: MAX_INTERRUPTIONS });
    }
    interruptOverlay.classList.add("open");
    interruptOverlay.setAttribute("aria-hidden", "false");
    setTimeout(function () { if (resumeBtn) resumeBtn.focus(); }, 40);
  }

  function hideInterruptModal() {
    if (!interruptOverlay) return;
    interruptOverlay.classList.remove("open");
    interruptOverlay.setAttribute("aria-hidden", "true");
  }

  function formatRemaining(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    if (m <= 0) return s + "s";
    return m + "m " + String(s).padStart(2, "0") + "s";
  }

  function startTerminateCountdown() {
    if (terminateCountdownId) {
      window.clearInterval(terminateCountdownId);
      terminateCountdownId = null;
    }

    function tick() {
      const remaining = getRemainingCooldown();
      if (!terminateRemaining) return;

      if (remaining > 0) {
        terminateRemaining.textContent = "Please wait " + formatRemaining(remaining);
      } else {
        terminateRemaining.textContent = "You can retake this test now.";
        if (terminateCountdownId) {
          window.clearInterval(terminateCountdownId);
          terminateCountdownId = null;
        }
        setTimeout(function () { window.location.reload(); }, 1500);
      }
    }

    tick();
    terminateCountdownId = window.setInterval(tick, 1000);
  }

  function showTerminateModal() {
    if (!terminateOverlay) return;
    terminateOverlay.classList.add("open");
    terminateOverlay.setAttribute("aria-hidden", "false");
    startTerminateCountdown();
  }

  function terminateTest() {
    if (state.finished) return;
    state.finished = true;
    state.submitting = true;
    if (state.timerId) { window.clearInterval(state.timerId); state.timerId = null; }
    hideInterruptModal();
    closePalette();
    closeConfirm();
    stopHeartbeat();
    markTerminated();
    showTerminateModal();
  }

  function registerInterruption() {
    if (!state.started || state.finished) return;
    if (!state.settings.enabled) return;

    const newCount = getInterruptCount() + 1;
    setInterruptCount(newCount);

    if (newCount >= MAX_INTERRUPTIONS) {
      terminateTest();
    } else {
      showInterruptModal(newCount);
    }
  }

  function handleStartAway() {
    if (!state.started || state.finished) return;
    if (awayActive) return;
    awayActive = true;
  }

  function handleEndAway() {
    if (!awayActive) return;
    awayActive = false;
    if (!state.started || state.finished) return;
    registerInterruption();
  }

  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") handleStartAway();
    else handleEndAway();
  });

  window.addEventListener("blur", function () {
    if (document.visibilityState === "hidden") return;
    handleStartAway();
  });

  window.addEventListener("focus", function () { handleEndAway(); });

  if (resumeBtn) resumeBtn.addEventListener("click", hideInterruptModal);

  if (interruptOverlay) {
    interruptOverlay.addEventListener("click", function (event) {
      if (event.target === interruptOverlay) hideInterruptModal();
    });
  }

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && interruptOverlay && interruptOverlay.classList.contains("open")) {
      hideInterruptModal();
    }
  });

  /* ---------- Result PNG (unchanged) ---------- */

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

  function buildResultCanvas() {
    const r = state.result;
    if (!r) return null;
    const scale = 2, W = 1000, H = 760;
    const canvas = document.createElement("canvas");
    canvas.width = W * scale;
    canvas.height = H * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.scale(scale, scale);
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "#e7e7e7";
    ctx.lineWidth = 2;
    roundRect(ctx, 1, 1, W - 2, H - 2, 20);
    ctx.stroke();
    const pad = 56;
    let y = 86;
    ctx.font = "600 26px Arial, Helvetica, sans-serif";
    ctx.fillStyle = "#111111";
    ctx.fillText("preparekora", pad, y);
    const brandW = ctx.measureText("preparekora").width;
    ctx.font = "400 26px Arial, Helvetica, sans-serif";
    ctx.fillStyle = "#858585";
    ctx.fillText(".in", pad + brandW, y);
    y += 46;
    ctx.font = "600 12px Arial, Helvetica, sans-serif";
    ctx.fillStyle = "#737373";
    ctx.fillText(t("resultPngTitle"), pad, y);
    y += 48;
    ctx.font = "700 30px Arial, Helvetica, sans-serif";
    ctx.fillStyle = "#111111";
    const title = state.translatedTitle || (state.publicTest ? state.publicTest.title : "—");
    const titleLines = wrapText(ctx, title, W - pad * 2).slice(0, 2);
    titleLines.forEach(function (line) { ctx.fillText(line, pad, y); y += 38; });
    y += 6;
    ctx.font = "400 15px Arial, Helvetica, sans-serif";
    ctx.fillStyle = "#737373";
    const pub = state.translatedPublisher || (state.publicTest ? state.publicTest.publisherName : "");
    ctx.fillText(publisherLine(pub), pad, y);
    y += 18;
    ctx.strokeStyle = "#e7e7e7";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad, y);
    ctx.lineTo(W - pad, y);
    ctx.stroke();
    y += 60;
    ctx.font = "400 14px Arial, Helvetica, sans-serif";
    ctx.fillStyle = "#737373";
    ctx.fillText(t("resultPngName"), pad, y - 12);
    ctx.font = "600 30px Arial, Helvetica, sans-serif";
    ctx.fillStyle = "#111111";
    const safeName = state.userName || "—";
    const nameLines = wrapText(ctx, safeName, W - pad * 2 - 320).slice(0, 2);
    let nameY = y + 22;
    nameLines.forEach(function (line) { ctx.fillText(line, pad, nameY); nameY += 36; });
    ctx.textAlign = "right";
    ctx.font = "700 56px Arial, Helvetica, sans-serif";
    ctx.fillStyle = "#111111";
    ctx.fillText(String(r.correct), W - pad, y + 30);
    const scoreRightW = ctx.measureText(String(r.correct)).width;
    ctx.font = "400 22px Arial, Helvetica, sans-serif";
    ctx.fillStyle = "#737373";
    ctx.fillText("/ " + r.total, W - pad - scoreRightW - 12, y + 30);
    ctx.font = "600 16px Arial, Helvetica, sans-serif";
    ctx.fillStyle = "#737373";
    ctx.fillText(r.percent + "%", W - pad, y + 52);
    ctx.textAlign = "left";
    y = Math.max(nameY, y + 70) + 30;
    const gap = 16;
    const boxW = (W - pad * 2 - gap * 3) / 4;
    const boxH = 96;
    const stats = [
      { label: t("correct"), value: r.correct },
      { label: t("wrong"), value: r.wrong },
      { label: t("unattempted"), value: r.unattempted },
      { label: t("timeTaken"), value: formatClock(state.elapsed) }
    ];
    let boxX = pad;
    stats.forEach(function (item) {
      roundRect(ctx, boxX, y, boxW, boxH, 12);
      ctx.strokeStyle = "#e7e7e7";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = "#737373";
      ctx.font = "400 13px Arial, Helvetica, sans-serif";
      ctx.fillText(item.label, boxX + 18, y + 36);
      ctx.fillStyle = "#111111";
      ctx.font = "700 24px Arial, Helvetica, sans-serif";
      ctx.fillText(String(item.value), boxX + 18, y + 70);
      boxX += boxW + gap;
    });
    const footerY = H - 44;
    ctx.strokeStyle = "#e7e7e7";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad, footerY - 26);
    ctx.lineTo(W - pad, footerY - 26);
    ctx.stroke();
    ctx.font = "400 13px Arial, Helvetica, sans-serif";
    ctx.fillStyle = "#737373";
    ctx.fillText("preparekora.in", pad, footerY);
    ctx.textAlign = "right";
    ctx.fillText(
      t("resultPngDate") + ": " + new Date().toLocaleDateString(locale(), { day: "numeric", month: "short", year: "numeric" }),
      W - pad, footerY
    );
    ctx.textAlign = "left";
    return canvas;
  }

  function downloadResult() {
    const canvas = buildResultCanvas();
    if (!canvas) return;
    const filename = "preparekora-result-" + (state.publicTest ? state.publicTest.id : "test") + "-" + new Date().toISOString().slice(0, 10) + ".png";
    function trigger(url, revoke) {
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      if (revoke) setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
    }
    if (canvas.toBlob) {
      canvas.toBlob(function (blob) {
        if (!blob) return trigger(canvas.toDataURL("image/png"), false);
        trigger(URL.createObjectURL(blob), true);
      }, "image/png");
    } else {
      trigger(canvas.toDataURL("image/png"), false);
    }
  }

  /* ---------- Event wiring ---------- */

  if (prevBtn) prevBtn.addEventListener("click", function () { goTo(state.index - 1); });
  if (nextBtn) nextBtn.addEventListener("click", function () { goTo(state.index + 1); });
  if (clearBtn) clearBtn.addEventListener("click", clearResponse);

  if (markBtn) {
    markBtn.addEventListener("click", function () {
      if (state.marked.has(state.index)) state.marked.delete(state.index);
      else state.marked.add(state.index);
      updateMarkButton();
      qStatus.textContent = statusFor(state.index);
      renderPalette();
    });
  }

  if (submitBtn) {
    submitBtn.addEventListener("click", function () { if (state.finished) return; openConfirm(); });
  }

  if (confirmCancel) confirmCancel.addEventListener("click", closeConfirm);
  if (confirmSubmit) confirmSubmit.addEventListener("click", function () { submitTest(); });

  if (confirmOverlay) {
    confirmOverlay.addEventListener("click", function (e) {
      if (e.target === confirmOverlay) closeConfirm();
    });
  }

  if (downloadBtn) downloadBtn.addEventListener("click", downloadResult);
  if (retakeBtn) retakeBtn.addEventListener("click", function () { window.location.reload(); });

  document.addEventListener("keydown", function (e) {
    if (confirmOverlay && confirmOverlay.classList.contains("open")) {
      if (e.key === "Escape") { e.preventDefault(); closeConfirm(); return; }
      if (e.key === "Tab") { trapFocus(e); return; }
    }
    if (e.key === "Escape") { closeMenu(); closePalette(); }
  });

  window.addEventListener("resize", function () { if (window.innerWidth > 860) closePalette(); });

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
      if (menuPanel.classList.contains("open") && !menuPanel.contains(e.target) && !menuToggle.contains(e.target)) closeMenu();
    });
    menuPanel.querySelectorAll("a").forEach(function (link) { link.addEventListener("click", closeMenu); });
  }

  /* ---------- Language change ---------- */

  document.addEventListener("pk:langchange", async function () {
    if (!state.publicTest) return;
    if (state.finished) { await translateStartIfNeeded(); renderResult(); return; }
    if (state.started) {
      examTitle.textContent = state.translatedTitle || state.publicTest.title;
      renderQuestion(false);
      renderPalette();
      updateMarkButton();
      updateNavSummary();
      return;
    }
    await translateStartIfNeeded();
    renderStart();
  });

  /* ---------- Init ---------- */

  const yearEl = document.getElementById("currentYear");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  setupKeypad();
  setupScratchpad();

  showScreen("loading");
  loadTest();

})();
