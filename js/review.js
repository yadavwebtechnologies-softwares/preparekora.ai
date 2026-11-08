"use strict";

/*
  PrepareKora — Review module (post-result).
  Supports MCQ, Math (numeric), Reasoning. Optional explanations.
  Read-only.
*/

(function () {

  /* ---------- CSS ---------- */

  if (!document.getElementById("review-module-styles")) {
    const style = document.createElement("style");
    style.id = "review-module-styles";
    style.textContent =
      ".review-block{display:flex;flex-direction:column;gap:12px;}" +
      ".review-block-head{display:flex;align-items:baseline;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:4px;}" +
      ".review-block-head h2{margin:0;font-size:15px;font-weight:600;letter-spacing:-0.2px;color:var(--text);}" +
      ".review-summary{display:flex;flex-wrap:wrap;gap:12px;color:var(--muted);font-size:12px;}" +
      ".review-summary strong{color:var(--text);font-weight:600;}" +
      ".review-card{padding:16px;border:1px solid var(--border);border-radius:var(--radius);background:#ffffff;}" +
      ".review-card-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px;flex-wrap:wrap;}" +
      ".review-card-num{font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:var(--muted);}" +
      ".review-card-type{padding:2px 7px;border:1px solid var(--border);border-radius:999px;font-size:9px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;color:var(--muted);}" +
      ".review-card-status{display:inline-flex;align-items:center;gap:6px;padding:3px 9px;border:1px solid var(--border);border-radius:999px;font-size:10px;color:var(--muted);white-space:nowrap;}" +
      ".review-card-status.is-answered{background:var(--accent);border-color:var(--accent);color:#ffffff;}" +
      ".review-card-status.is-marked{background:var(--surface);color:var(--text);}" +
      ".review-card-status svg{width:11px;height:11px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;}" +
      ".review-card-q{margin:0 0 10px;font-size:14px;font-weight:600;line-height:1.5;overflow-wrap:anywhere;color:var(--text);}" +
      ".review-q-latex{margin-bottom:10px;}" +
      ".review-q-image{margin-bottom:10px;text-align:center;}" +
      ".review-q-image img{max-width:100%;height:auto;border-radius:6px;border:1px solid var(--border);}" +
      ".review-opts{display:flex;flex-direction:column;gap:6px;margin-bottom:10px;}" +
      ".review-opt{display:flex;align-items:center;gap:10px;padding:8px 10px;border:1px solid var(--border);border-radius:6px;background:#ffffff;font-size:13px;line-height:1.45;overflow-wrap:anywhere;}" +
      ".review-opt-key{display:grid;place-items:center;width:20px;height:20px;flex-shrink:0;border:1px solid var(--border);border-radius:50%;background:#ffffff;color:var(--muted);font-size:10px;font-weight:600;}" +
      ".review-opt-text{flex:1;}" +
      ".review-opt-mark{flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;}" +
      ".review-opt-mark svg{width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;}" +
      ".review-opt.is-correct{border-color:#15803d;background:#f0fdf4;}" +
      ".review-opt.is-correct .review-opt-key{background:#15803d;border-color:#15803d;color:#ffffff;}" +
      ".review-opt.is-correct .review-opt-mark{color:#15803d;}" +
      ".review-opt.is-correct .review-opt-text{color:#14532d;font-weight:500;}" +
      ".review-opt.is-chosen-wrong{border-color:#b91c1c;background:#fef2f2;}" +
      ".review-opt.is-chosen-wrong .review-opt-key{background:#b91c1c;border-color:#b91c1c;color:#ffffff;}" +
      ".review-opt.is-chosen-wrong .review-opt-mark{color:#b91c1c;}" +
      ".review-opt.is-chosen-wrong .review-opt-text{color:#7f1d1d;}" +
      ".review-opt img{max-width:100%;height:auto;margin-top:6px;border-radius:4px;}" +
      ".review-numeric{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:10px;}" +
      ".review-numeric-box{flex:1;min-width:140px;padding:10px 12px;border:1px solid var(--border);border-radius:6px;background:#ffffff;}" +
      ".review-numeric-box.is-wrong{border-color:#b91c1c;background:#fef2f2;}" +
      ".review-numeric-box.is-correct{border-color:#15803d;background:#f0fdf4;}" +
      ".review-numeric-label{display:block;font-size:10px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:var(--muted);margin-bottom:4px;}" +
      ".review-numeric-value{font-size:15px;font-weight:600;color:var(--text);font-variant-numeric:tabular-nums;}" +
      ".review-numeric-box.is-wrong .review-numeric-value{color:#7f1d1d;}" +
      ".review-numeric-box.is-correct .review-numeric-value{color:#14532d;}" +
      ".review-exp{margin-top:10px;padding-top:10px;border-top:1px solid var(--border);}" +
      ".review-exp-toggle{display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border:1px solid var(--border);border-radius:6px;background:#ffffff;color:var(--text);font-size:12px;font-weight:500;cursor:pointer;}" +
      ".review-exp-toggle:hover{background:var(--surface);}" +
      ".review-exp-toggle svg{width:11px;height:11px;stroke:currentColor;fill:none;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round;transition:transform 0.2s ease;}" +
      ".review-exp-toggle[aria-expanded='true'] svg{transform:rotate(180deg);}" +
      ".review-exp-body{margin-top:10px;padding:12px;border:1px solid var(--border);border-radius:6px;background:var(--surface);font-size:13px;line-height:1.6;color:var(--text);}" +
      ".review-exp-body img{max-width:100%;height:auto;margin-top:8px;border-radius:4px;}" +
      ".review-overlay{position:fixed;inset:0;z-index:180;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;background:rgba(0,0,0,0.35);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);opacity:0;transition:opacity 0.25s ease;pointer-events:none;}" +
      ".review-overlay.is-visible{opacity:1;pointer-events:auto;}" +
      ".review-overlay-label{color:#ffffff;font-size:13px;font-weight:500;letter-spacing:0.02em;text-shadow:0 1px 2px rgba(0,0,0,0.4);}" +
      ".review-overlay .spinner{border-color:rgba(255,255,255,0.35);border-top-color:#ffffff;}" +
      "@media (max-width:560px){.review-card{padding:13px;}.review-card-q{font-size:13px;}.review-opt{font-size:12px;padding:7px 9px;}}";
    document.head.appendChild(style);
  }

  /* ---------- Helpers ---------- */

  function esc(v) {
    return String(v).replace(/[&<>"']/g, function (c) {
      const m = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
      return m[c];
    });
  }

  function getQuestionType(q) {
    if (!q || typeof q !== "object") return "mcq";
    const tp = q.type;
    if (tp === "math" || tp === "reasoning" || tp === "mcq") return tp;
    return "mcq";
  }

  function statusFor(index) {
    const state = window.MockTestState;
    if (!state || !state.publicTest) return "not-visited";
    const marked = state.marked.has(index);
    const answered = Object.prototype.hasOwnProperty.call(state.answers, index);
    const visited = state.visited.has(index);
    if (marked) return "marked";
    if (answered) return "answered";
    if (visited) return "not-answered";
    return "not-visited";
  }

  function answerFor(index) {
    const state = window.MockTestState;
    if (!state) return null;
    if (!Object.prototype.hasOwnProperty.call(state.answers, index)) return null;
    return state.answers[index];
  }

  function correctAnswerFor(index) {
    const state = window.MockTestState;
    if (!state || !state.result) return null;
    if (state.result.correctAnswers && typeof state.result.correctAnswers[String(index)] === "number") {
      return state.result.correctAnswers[String(index)];
    }
    if (state.result.correctAnswers && typeof state.result.correctAnswers[index] === "number") {
      return state.result.correctAnswers[index];
    }
    return null;
  }

  function correctNumericFor(index) {
    const state = window.MockTestState;
    if (!state || !state.result || !state.result.correctNumeric) return null;
    const v = state.result.correctNumeric[String(index)];
    if (typeof v === "number") return v;
    const v2 = state.result.correctNumeric[index];
    if (typeof v2 === "number") return v2;
    return null;
  }

  function isAnswerCorrect(question, index) {
    const state = window.MockTestState;
    if (!state) return false;
    const chosen = answerFor(index);
    if (chosen === null || chosen === undefined || chosen === "") return false;
    const qType = getQuestionType(question);
    const mathHasOptions = qType === "math" && Array.isArray(question.options) && question.options.length === 4;
    if (qType === "math" && !mathHasOptions) {
      const correctNum = correctNumericFor(index);
      if (correctNum === null) return false;
      const tol = Number(question.tolerance) || 0;
      return Math.abs(Number(chosen) - correctNum) <= tol;
    }
    const correct = correctAnswerFor(index);
    return correct !== null && Number(chosen) === correct;
  }

  function getExplainCacheKey(question) {
    const qText = (question.q || "").slice(0, 80).replace(/\s+/g, " ").trim();
    const correct = question.type === "math" ? question.numericAnswer : question.answer;
    const raw = qText + "|" + String(correct);
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      hash = ((hash << 5) - hash) + raw.charCodeAt(i);
      hash |= 0;
    }
    return "pke_v2_" + Math.abs(hash).toString(36);
  }

  function getCachedExplanation(question) {
    try {
      const raw = localStorage.getItem(getExplainCacheKey(question));
      if (!raw) return null;
      try {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.en) return { en: parsed.en, as: parsed.as || "" };
      } catch (e) {}
      return { en: raw, as: "" };
    } catch (e) { return null; }
  }

  function setCachedExplanation(question, text) {
    try { localStorage.setItem(getExplainCacheKey(question), String(text).slice(0, 600)); }
    catch (e) {}
  }

  async function fetchAIExplanation(question, index) {
    const cached = getCachedExplanation(question);
    if (cached) return cached;

    const qType = getQuestionType(question);
    const chosen = answerFor(index);
    const correctNum = correctNumericFor(index);
    const correctAns = correctAnswerFor(index);

    const apiBase = (function () {
      const host = window.location.hostname;
      const isLocal = host === "localhost" || host === "127.0.0.1" || host === "" || host.endsWith(".local");
      return isLocal ? "http://localhost:8787/api" : "https://preparekora-api.yadavsubba2003.workers.dev/api";
    })();

    const mathHasOptions = qType === "math" && Array.isArray(question.options) && question.options.length === 4;
    const payload = { question: question.q || "", type: qType };
    if (qType === "math" && !mathHasOptions) {
      payload.correctAnswer = correctNum;
      payload.userAnswer = chosen;
    } else {
      payload.options = question.options || [];
      payload.correctAnswer = correctAns;
      payload.userAnswer = chosen;
    }

    const res = await fetch(apiBase + "/explain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    const en = (data && data.explanation) ? String(data.explanation).trim() : "";
    const as = (data && data.explanationAs) ? String(data.explanationAs).trim() : "";
    if (en) {
      try {
        localStorage.setItem(getExplainCacheKey(question), JSON.stringify({ en: en, as: as }).slice(0, 4500));
      } catch (e) {}
    }
    return { en: en, as: as };
  }

  function renderLatex(el, tex) {
    if (!el || !tex) return;
    el.replaceChildren();
    if (window.katex && typeof window.katex.render === "function") {
      try {
        window.katex.render(String(tex), el, { throwOnError: false, displayMode: false });
        return;
      } catch (e) { /* fall through */ }
    }
    el.textContent = String(tex);
  }

  /* ---------- Icons ---------- */

  const ICON_CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"></path></svg>';
  const ICON_CROSS = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>';
  const ICON_DOT = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3" fill="currentColor" stroke="none"></circle></svg>';
  const ICON_EMPTY = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"></circle></svg>';
  const ICON_CHEV = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"></path></svg>';

  function statusBadge(status) {
    if (status === "answered") return '<span class="review-card-status is-answered">' + ICON_CHECK + "Answered</span>";
    if (status === "marked") return '<span class="review-card-status is-marked">' + ICON_DOT + "Marked</span>";
    if (status === "not-answered") return '<span class="review-card-status">' + ICON_EMPTY + "Not answered</span>";
    return '<span class="review-card-status">' + ICON_EMPTY + "Not visited</span>";
  }

  /* ---------- Overlay ---------- */

  let overlayEl = null;

  function showOverlay() {
    if (overlayEl) return;
    overlayEl = document.createElement("div");
    overlayEl.className = "review-overlay";
    overlayEl.setAttribute("role", "status");
    overlayEl.setAttribute("aria-live", "polite");
    overlayEl.innerHTML = '<div class="spinner" aria-hidden="true"></div><div class="review-overlay-label">Loading review…</div>';
    document.body.appendChild(overlayEl);
    void overlayEl.offsetWidth;
    overlayEl.classList.add("is-visible");
  }

  function hideOverlay() {
    if (!overlayEl) return;
    overlayEl.classList.remove("is-visible");
    setTimeout(function () {
      if (overlayEl && overlayEl.parentNode) overlayEl.parentNode.removeChild(overlayEl);
      overlayEl = null;
    }, 260);
  }

  /* ---------- Build MCQ card ---------- */

  function buildMCQOptions(question, index, chosen) {
    const correct = correctAnswerFor(index);
    const opts = document.createElement("div");
    opts.className = "review-opts";

    (question.options || []).forEach(function (optText, oi) {
      const isCorrect = correct !== null && oi === correct;
      const isChosen = chosen !== null && Number(chosen) === oi;

      let rowClass = "review-opt";
      if (isCorrect) rowClass += " is-correct";
      else if (isChosen) rowClass += " is-chosen-wrong";

      const row = document.createElement("div");
      row.className = rowClass;

      const key = document.createElement("span");
      key.className = "review-opt-key";
      key.textContent = "ABCD".charAt(oi);

      const txt = document.createElement("span");
      txt.className = "review-opt-text";
      txt.textContent = optText || "";

      if (question.optionImages && question.optionImages[oi] && String(question.optionImages[oi]).startsWith("data:image")) {
        const img = document.createElement("img");
        img.src = question.optionImages[oi];
        img.alt = "";
        txt.appendChild(document.createElement("br"));
        txt.appendChild(img);
      }

      const mark = document.createElement("span");
      mark.className = "review-opt-mark";
      if (isCorrect) mark.innerHTML = ICON_CHECK;
      else if (isChosen) mark.innerHTML = ICON_CROSS;

      row.appendChild(key);
      row.appendChild(txt);
      row.appendChild(mark);
      opts.appendChild(row);
    });

    return opts;
  }

  /* ---------- Build math numeric block ---------- */

  function buildNumericBlock(index, chosen, correctNum, tolerance) {
    const wrap = document.createElement("div");
    wrap.className = "review-numeric";

    const chosenIsNumber = chosen !== null && chosen !== undefined && chosen !== "" && isFinite(Number(chosen));
    const tol = (typeof tolerance === "number" && tolerance >= 0) ? tolerance : 0;
    const isCorrect = chosenIsNumber && correctNum !== null && Math.abs(Number(chosen) - correctNum) <= tol;

    const chosenBox = document.createElement("div");
    chosenBox.className = "review-numeric-box " + (chosenIsNumber ? (isCorrect ? "is-correct" : "is-wrong") : "");
    chosenBox.innerHTML =
      '<span class="review-numeric-label">Your answer</span>' +
      '<span class="review-numeric-value">' + (chosenIsNumber ? esc(chosen) : "Not answered") + "</span>";

    const correctBox = document.createElement("div");
    correctBox.className = "review-numeric-box is-correct";
    correctBox.innerHTML =
      '<span class="review-numeric-label">Correct answer</span>' +
      '<span class="review-numeric-value">' + (correctNum !== null ? esc(correctNum) : "—") + "</span>";

    wrap.appendChild(chosenBox);
    wrap.appendChild(correctBox);
    return wrap;
  }

  /* ---------- Explanation formatting ---------- */

  function formatExplanationLine(line) {
    const decoded = String(line)
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&#(\d+);/g, function (_, code) { return String.fromCharCode(parseInt(code, 10)); });

    const safe = decoded
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    const finalMatch = safe.match(/^(Final answer)\s*[.:]\s*(.+)$/i);
    if (finalMatch) {
      return "<strong>" + finalMatch[1] + ":</strong> <strong><em>" + finalMatch[2] + "</em></strong>";
    }

    const stepMatch = safe.match(/^(Step\s*\d+|Line\s*\d+)\s*[.:]?\s*(.*)$/i);
    if (stepMatch) {
      const body = stepMatch[2].replace(/(\d+(?:[.,]\d+)*)/g, "<strong><em>$1</em></strong>");
      return "<strong>" + stepMatch[1] + ":</strong> " + body;
    }

    return safe.replace(/(\d+(?:[.,]\d+)*)/g, "<strong><em>$1</em></strong>");
  }

  function formatExplanationBlock(text) {
    return String(text).split(/\n+/).map(formatExplanationLine).join("<br>");
  }

  function buildExplanationHTML(expEn, expAs) {
    const enHTML = formatExplanationBlock(expEn || "");
    const asClean = expAs ? String(expAs).trim() : "";
    if (!asClean || asClean === String(expEn || "").trim()) {
      return enHTML;
    }
    return enHTML + '<hr class="exp-sep">' + formatExplanationBlock(asClean);
  }

  /* ---------- Build explanation ---------- */

  function buildExplanation(question, index) {
    const qType = getQuestionType(question);
    const correct = isAnswerCorrect(question, index);
    const answered = answerFor(index) !== null && answerFor(index) !== undefined && answerFor(index) !== "";

    if (correct && qType === "mcq") return null;

    const bodyId = "exp-body-" + index;

    const wrap = document.createElement("div");
    wrap.className = "review-exp";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "review-exp-toggle";
    btn.setAttribute("aria-expanded", "false");
    btn.setAttribute("aria-controls", bodyId);
    btn.innerHTML = ICON_CHEV + "<span>Show explanation</span>";

    const body = document.createElement("div");
    body.className = "review-exp-body";
    body.id = bodyId;
    body.hidden = true;

    let loaded = false;
    const cached = getCachedExplanation(question);

    if (cached) {
      const p = document.createElement("p");
      p.style.margin = "0";
      p.innerHTML = buildExplanationHTML(cached.en, cached.as);
      body.appendChild(p);
      loaded = true;
    } else {
      fetchAIExplanation(question, index).catch(function () {});
    }

    async function loadAIIfNeeded() {
      if (loaded) return;
      loaded = true;
      body.replaceChildren();
      body.innerHTML = '<div class="inline-loading"><div class="spinner"></div><span>Generating explanation…</span></div>';
      try {
        const result = await fetchAIExplanation(question, index);
        if (result && result.en) {
          const p = document.createElement("p");
          p.style.margin = "0";
          p.innerHTML = buildExplanationHTML(result.en, result.as);
          body.replaceChildren(p);
        } else {
          body.textContent = "Explanation unavailable.";
        }
      } catch (err) {
        body.textContent = "Could not generate explanation. Check connection.";
      }
    }

    btn.addEventListener("click", function () {
      const open = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", String(!open));
      body.hidden = open;
      const span = btn.querySelector("span");
      if (span) span.textContent = open ? "Show explanation" : "Hide explanation";
      if (!open && !loaded) loadAIIfNeeded();
    });

    if ((!answered || !correct) && cached) {
      btn.setAttribute("aria-expanded", "true");
      body.hidden = false;
      const span = btn.querySelector("span");
      if (span) span.textContent = "Hide explanation";
    }

    wrap.appendChild(btn);
    wrap.appendChild(body);
    return wrap;
  }

  /* ---------- Build card ---------- */

  function buildCard(question, index) {
    const status = statusFor(index);
    const chosen = answerFor(index);
    const qType = getQuestionType(question);

    const card = document.createElement("div");
    card.className = "review-card";

    const head = document.createElement("div");
    head.className = "review-card-head";

    const headLeft = document.createElement("div");
    headLeft.style.display = "flex";
    headLeft.style.alignItems = "center";
    headLeft.style.gap = "8px";
    headLeft.style.flexWrap = "wrap";

    const num = document.createElement("span");
    num.className = "review-card-num";
    num.textContent = "Q" + (index + 1);
    headLeft.appendChild(num);

    if (qType !== "mcq") {
      const tbadge = document.createElement("span");
      tbadge.className = "review-card-type";
      tbadge.textContent = qType === "math" ? "Math" : "Reasoning";
      headLeft.appendChild(tbadge);
    }

    head.appendChild(headLeft);
    head.insertAdjacentHTML("beforeend", statusBadge(status));

    const qText = document.createElement("p");
    qText.className = "review-card-q";
    qText.textContent = question.q || "";

    card.appendChild(head);
    card.appendChild(qText);

    if (qType !== "reasoning" && question.latex && String(question.latex).trim()) {
      const latexEl = document.createElement("div");
      latexEl.className = "review-q-latex";
      renderLatex(latexEl, question.latex);
      card.appendChild(latexEl);
    }

    if (question.imageBase64 && String(question.imageBase64).startsWith("data:image")) {
      const imgWrap = document.createElement("div");
      imgWrap.className = "review-q-image";
      const img = document.createElement("img");
      img.src = question.imageBase64;
      img.alt = "";
      imgWrap.appendChild(img);
      card.appendChild(imgWrap);
    }

    const mathHasOptions = qType === "math" && Array.isArray(question.options) && question.options.length === 4;
    if (qType === "math" && !mathHasOptions) {
      const correctNum = correctNumericFor(index);
      const tol = (typeof question.tolerance === "number") ? question.tolerance : 0;
      card.appendChild(buildNumericBlock(index, chosen, correctNum, tol));
    } else {
      card.appendChild(buildMCQOptions(question, index, chosen));
    }

    const exp = buildExplanation(question, index);
    if (exp) card.appendChild(exp);

    return card;
  }

  /* ---------- Build review block ---------- */

  function buildReviewBlock() {
    const state = window.MockTestState;
    if (!state || !state.publicTest) return null;

    const questions = state.publicTest.questions || [];
    const total = questions.length;
    if (!total) return null;

    let answered = 0, marked = 0;
    for (let i = 0; i < total; i++) {
      if (Object.prototype.hasOwnProperty.call(state.answers, i)) answered++;
      if (state.marked.has(i)) marked++;
    }
    const unattempted = total - answered;

    const block = document.createElement("div");
    block.className = "review-block";

    const head = document.createElement("div");
    head.className = "review-block-head";

    const title = document.createElement("h2");
    title.textContent = "Review";

    const summary = document.createElement("div");
    summary.className = "review-summary";
    summary.innerHTML =
      "Total <strong>" + total + "</strong>" +
      " · Answered <strong>" + answered + "</strong>" +
      " · Unattempted <strong>" + unattempted + "</strong>" +
      " · Marked <strong>" + marked + "</strong>";

    head.appendChild(title);
    head.appendChild(summary);
    block.appendChild(head);

    questions.forEach(function (q, i) {
      block.appendChild(buildCard(q, i));
    });

    return block;
  }

  /* ---------- Load ---------- */

  let mounted = false;

  function load() {
    if (mounted) return;
    const container = document.getElementById("resultReview");
    if (!container) return;
    const state = window.MockTestState;
    if (!state || !state.publicTest) return;

    mounted = true;
    showOverlay();
    const startedAt = Date.now();

    requestAnimationFrame(function () {
      const block = buildReviewBlock();
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, 400 - elapsed);

      setTimeout(function () {
        if (block) {
          container.innerHTML = "";
          container.appendChild(block);
        }
        hideOverlay();
      }, remaining);
    });
  }

  /* ---------- Language change ---------- */

  document.addEventListener("pk:langchange", function () {
    if (!mounted) return;
    const container = document.getElementById("resultReview");
    if (!container) return;
    const block = buildReviewBlock();
    if (block) {
      container.innerHTML = "";
      container.appendChild(block);
    }
  });

  /* ---------- Expose ---------- */

  window.ReviewModule = { load: load };

})();
