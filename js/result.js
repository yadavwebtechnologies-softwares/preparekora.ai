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

  function formatTime(sec) {
    const s = Number(sec) || 0;
    if (s <= 0) return "—";
    const m = Math.floor(s / 60);
    const r = s % 60;
    if (m === 0) return r + "s";
    return m + "m " + String(r).padStart(2, "0") + "s";
  }

  function showScreen(name) {
    ["resultLoading", "resultError", "resultContent"].forEach(function (k) {
      const el = $id(k);
      if (el) el.hidden = (k !== name);
    });
  }

  function showError(msg) {
    const el = $id("resultErrorMessage");
    if (el) el.textContent = msg || "Please try again.";
    showScreen("resultError");
  }

  /* ---------- Result data ---------- */

  const params = new URLSearchParams(window.location.search);
  const date = params.get("date") || "";
  const subjectId = params.get("subject") || "";
  const slot = params.get("slot") || "";

  let resultData = null;

  function loadFromSession() {
    try {
      if (slot) {
        const raw = sessionStorage.getItem("pk_quiz_result_" + date + "_" + subjectId + "_" + slot);
        if (raw) return JSON.parse(raw);
      }
      const raw = sessionStorage.getItem("pk_quiz_result_" + date + "_" + subjectId + "_");
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return null;
  }

  async function loadFromWorker() {
    const token = getToken();
    if (!token) { redirectToLogin(); return null; }

    try {
      const slotQuery = slot ? ("?slot=" + encodeURIComponent(slot)) : "";
      const res = await fetch(API_BASE + "/daily-quizzes/" + encodeURIComponent(date) + "/" + encodeURIComponent(subjectId) + "/result" + slotQuery, {
        method: "GET",
        headers: { "Authorization": "Bearer " + token }
      });

      if (res.status === 401 || res.status === 403) { redirectToLogin(); return null; }
      if (!res.ok) return null;

      return await res.json();
    } catch (e) { return null; }
  }

  async function loadResult() {
    if (!date || !subjectId) {
      showError("Missing date or subject.");
      return;
    }

    resultData = loadFromSession();

    if (!resultData) {
      resultData = await loadFromWorker();
    }

    if (!resultData) {
      showError("Result not found. Please check your dashboard.");
      return;
    }

    renderResult();
    showScreen("resultContent");
  }

  function renderResult() {
    const d = resultData;
    if (!d) return;

    const subjectEl = $id("resultSubject");
    const scoreEl = $id("resultScore");
    const totalEl = $id("resultTotal");
    const percentEl = $id("resultPercent");
    const correctEl = $id("resultCorrect");
    const wrongEl = $id("resultWrong");
    const unattemptedEl = $id("resultUnattempted");
    const timeEl = $id("resultTime");
    const streakEl = $id("resultStreak");

    if (subjectEl) subjectEl.textContent = d.subjectName || "Quiz";
    if (scoreEl) scoreEl.textContent = String(d.correct || 0);
    if (totalEl) totalEl.textContent = String(d.total || 0);
    if (percentEl) percentEl.textContent = (d.percent || 0) + "%";
    if (correctEl) correctEl.textContent = String(d.correct || 0);
    if (wrongEl) wrongEl.textContent = String(d.wrong || 0);
    if (unattemptedEl) unattemptedEl.textContent = String(d.unattempted || 0);
    if (timeEl) timeEl.textContent = formatTime(d.timeTaken);
    if (streakEl && d.streak && d.streak > 0) {
      streakEl.textContent = "🔥 " + d.streak + "-day streak";
      streakEl.hidden = false;
    }

    renderQuestions();
  }

  /* ---------- AI Explanation ---------- */

  function getExplainCacheKey(question) {
    const qText = (question.q || "").slice(0, 80).replace(/\s+/g, " ").trim();
    const correct = question.answer;
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
      const parsed = JSON.parse(raw);
      if (parsed && (parsed.en || parsed.explanation)) {
        return {
          en: parsed.en || parsed.explanation || "",
          as: parsed.as || parsed.explanationAs || ""
        };
      }
    } catch (e) {}
    return null;
  }

  function cacheExplanation(question, en, as) {
    try {
      localStorage.setItem(getExplainCacheKey(question), JSON.stringify({ en: en, as: as }).slice(0, 4500));
    } catch (e) {}
  }

  async function fetchExplanation(question, userAnswer) {
    const cached = getCachedExplanation(question);
    if (cached) return cached;

    const payload = {
      question: question.q || "",
      type: question.type || "mcq",
      options: question.options || [],
      correctAnswer: question.answer,
      userAnswer: userAnswer
    };

    const res = await fetch(API_BASE + "/explain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error("Explanation unavailable");

    const data = await res.json();
    const en = (data && data.explanation) ? String(data.explanation).trim() : "";
    const as = (data && data.explanationAs) ? String(data.explanationAs).trim() : "";

    if (en) cacheExplanation(question, en, as);
    return { en: en, as: as };
  }

  function formatExplanationLine(line) {
    const decoded = String(line)
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'");

    const safe = decoded
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    const finalMatch = safe.match(/^(Final answer)\s*[.:]\s*(.+)$/i);
    if (finalMatch) {
      return "<strong>" + finalMatch[1] + ":</strong> <strong><em>" + finalMatch[2] + "</em></strong>";
    }

    return safe;
  }

  function formatExplanationBlock(text) {
    if (!text) return "";
    return String(text).split(/\n+/).map(formatExplanationLine).join("<br>");
  }

  function buildExplanationHTML(en, as) {
    const enHTML = formatExplanationBlock(en || "");
    const asClean = as ? String(as).trim() : "";
    if (!asClean || asClean === String(en || "").trim()) return enHTML;
    return enHTML + '<hr style="margin: 10px 0; border: 0; border-top: 1px solid var(--border);">' + formatExplanationBlock(asClean);
  }

  function buildExplanationBlock(question, userAnswer, correctAnswer) {
    const wrap = document.createElement("div");
    wrap.style.marginTop = "12px";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-sm";
    btn.textContent = "Show Explanation";
    btn.style.width = "100%";

    const body = document.createElement("div");
    body.className = "q-explanation";
    body.hidden = true;

    let loaded = false;

    btn.addEventListener("click", async function () {
      if (!loaded) {
        loaded = true;
        body.hidden = false;
        body.innerHTML = '<span style="color: var(--muted);">Generating explanation…</span>';
        btn.textContent = "Hide Explanation";

        try {
          const result = await fetchExplanation(question, userAnswer);
          if (result && result.en) {
            body.innerHTML = buildExplanationHTML(result.en, result.as);
          } else {
            body.textContent = "Explanation unavailable.";
          }
        } catch (err) {
          body.textContent = "Could not generate explanation. Check connection.";
        }
        return;
      }

      if (body.hidden) {
        body.hidden = false;
        btn.textContent = "Hide Explanation";
      } else {
        body.hidden = true;
        btn.textContent = "Show Explanation";
      }
    });

    wrap.appendChild(btn);
    wrap.appendChild(body);
    return wrap;
  }

  /* ---------- Question review ---------- */

  function renderQuestions() {
    const wrap = $id("resultQuestions");
    if (!wrap) return;

    const questions = Array.isArray(resultData.questions) ? resultData.questions : [];
    wrap.innerHTML = "";

    questions.forEach(function (q, i) {
      const card = document.createElement("div");
      card.className = "q-review-card";

      const userAnswer = q.userAnswer;
      const correctAnswer = q.answer;
      let statusClass = "unattempted";
      let statusText = "Not attempted";
      if (userAnswer !== null && userAnswer !== undefined) {
        if (userAnswer === correctAnswer) {
          statusClass = "correct";
          statusText = "Correct";
        } else {
          statusClass = "wrong";
          statusText = "Wrong";
        }
      }

      let optionsHTML = "";
      (q.options || []).forEach(function (opt, oi) {
        let optClass = "";
        if (oi === correctAnswer) optClass = " correct";
        else if (oi === userAnswer) optClass = " wrong";
        optionsHTML +=
          '<div class="q-review-option' + optClass + '">' +
            '<span class="q-opt-key">' + "ABCD".charAt(oi) + '</span>' +
            '<span class="q-opt-text">' + esc(opt) + '</span>' +
          '</div>';
      });

      card.innerHTML =
        '<div class="q-review-header">' +
          '<span class="q-review-num">Q' + (i + 1) + '</span>' +
          '<span class="q-review-badge ' + statusClass + '">' + statusText + '</span>' +
        '</div>' +
        '<p class="q-review-text">' + esc(q.q) + '</p>' +
        '<div class="q-review-options">' + optionsHTML + '</div>';

      // Add explanation block (only for wrong / unattempted questions)
      if (userAnswer !== correctAnswer) {
        card.appendChild(buildExplanationBlock(q, userAnswer, correctAnswer));
      }

      wrap.appendChild(card);
    });
  }

  /* ---------- Init ---------- */

  const yearEl = $id("currentYear");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  loadResult();

})();
