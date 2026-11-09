// ═══════════════════════════════════════════════════════════
// PrepareKora — Admin Panel Logic
// ═══════════════════════════════════════════════════════════

(function () {
  "use strict";

  const TOKEN_KEY = "pk_user_id_token";
  const EXPIRES_KEY = "pk_user_expires_at";
  const USER_KEY = "pk_user_profile";

  let me = null;
  let confirmResolver = null;
  let cachedSubjects = [];
  let cachedUsers = [];
  let userSearchTimeout = null;
  let currentQBSubject = null;

  // ─────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────
  function $(id) { return document.getElementById(id); }
  function $sel(s) { return document.querySelector(s); }
  function $all(s) { return document.querySelectorAll(s); }

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

  function isLoggedIn() {
    try {
      const t = localStorage.getItem(TOKEN_KEY);
      const exp = parseInt(localStorage.getItem(EXPIRES_KEY) || "0", 10) || 0;
      if (!t) return false;
      if (exp && exp < Date.now()) return false;
      return true;
    } catch (e) { return false; }
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
      if (res.status === 401) {
        window.location.href = "login.html";
        throw new Error("Session expired");
      }
      const err = new Error(data.error || data.message || `HTTP ${res.status}`);
      err.status = res.status;
      err.code = data.code;
      throw err;
    }
    return data;
  }

  // ─────────────────────────────────────────────────────────
  // CONFIRM MODAL
  // ─────────────────────────────────────────────────────────
  function askConfirm(title, message) {
    return new Promise((resolve) => {
      $("confirmTitle").textContent = title;
      $("confirmMessage").textContent = message;
      $("confirmModal").classList.add("open");
      confirmResolver = resolve;
      $("confirmOkBtn").onclick = () => { $("confirmModal").classList.remove("open"); confirmResolver = null; resolve(true); };
      $("confirmCancelBtn").onclick = () => { $("confirmModal").classList.remove("open"); confirmResolver = null; resolve(false); };
    });
  }

  // ─────────────────────────────────────────────────────────
  // SCREEN SWITCHER
  // ─────────────────────────────────────────────────────────
  function showAdminUI() {
    $("adminLoading").hidden = true;
    $("accessDenied").hidden = true;
    $("adminUI").hidden = false;
  }

  function showAccessDenied() {
    $("adminLoading").hidden = true;
    $("adminUI").hidden = true;
    $("accessDenied").hidden = false;
  }

  // ─────────────────────────────────────────────────────────
  // TABS
  // ─────────────────────────────────────────────────────────
  function initTabs() {
    const tabs = $all(".admin-tab");
    const contents = $all(".admin-tab-content");
    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        const key = tab.getAttribute("data-tab");
        tabs.forEach((t) => t.classList.toggle("is-active", t === tab));
        contents.forEach((c) => { c.hidden = c.getAttribute("data-content") !== key; });
        loadTab(key);
      });
    });
  }

  function loadTab(key) {
    if (key === "subjects") loadSubjects();
    else if (key === "forever-free") loadForeverFree();
    else if (key === "homepage-tests") loadHomepageTests();
    else if (key === "question-bank") initQuestionBankTab();
    else if (key === "purchases") loadPurchases();
    else if (key === "users") loadUsers();
    else if (key === "settings") loadSettings();
    else if (key === "activity") loadActivity();
  }

  // ─────────────────────────────────────────────────────────
  // DASHBOARD STATS
  // ─────────────────────────────────────────────────────────
  async function loadStats() {
    try {
      const res = await api("/api/admin/dashboard");
      const s = res.stats || {};
      $("stTotalUsers").textContent = s.totalUsers ?? "—";
      $("stActiveUsers").textContent = s.activeUsers ?? "—";
      $("stSubjects").textContent = s.totalSubjects ?? "—";
      $("stQuestions").textContent = s.totalQuestions ?? "—";
      $("stHomepageTests").textContent = s.totalHomepageTests ?? "—";
      $("stDailyTests").textContent = s.totalDailyTests ?? "—";
      $("stPendingPurchases").textContent = s.pendingPurchases ?? "—";
      $("stActiveSubs").textContent = s.activeSubscriptions ?? "—";
    } catch (err) {
      toast("Could not load dashboard stats.", "error");
    }
  }

  // ─────────────────────────────────────────────────────────
  // SUBJECTS
  // ─────────────────────────────────────────────────────────
  async function loadSubjects() {
    const list = $("subjectsList");
    try {
      const res = await api("/api/admin/subjects");
      cachedSubjects = res.subjects || [];

      if (cachedSubjects.length === 0) {
        list.innerHTML = '<div class="empty-state">No subjects yet. Click "Add subject" to create one.</div>';
        return;
      }

      list.innerHTML = cachedSubjects.map(renderSubjectCard).join("");
      list.querySelectorAll("[data-edit-subject]").forEach((b) => b.addEventListener("click", () => editSubject(b.getAttribute("data-edit-subject"))));
      list.querySelectorAll("[data-delete-subject]").forEach((b) => b.addEventListener("click", () => deleteSubject(b.getAttribute("data-delete-subject"))));
    } catch (err) {
      list.innerHTML = '<div class="empty-state">Could not load subjects.</div>';
    }
  }

  function renderSubjectCard(s) {
    const foreverFreeStatus = s.hasForeverFree
      ? '<span class="badge badge-accent">Forever Free ready</span>'
      : '<span class="badge badge-muted">No Forever Free yet</span>';
    const activeStatus = s.active !== false
      ? '<span class="badge badge-accent">Active</span>'
      : '<span class="badge badge-muted">Archived</span>';

    return `
      <div class="admin-test-card">
        <div class="admin-test-info">
          <h3 class="admin-test-title">${escapeHtml(s.name)} ${s.nameAs ? `<span class="muted-text">(${escapeHtml(s.nameAs)})</span>` : ""}</h3>
          <div class="admin-test-meta">
            <span>ID: <code>${escapeHtml(s.id)}</code></span>
            ${activeStatus}
            ${foreverFreeStatus}
          </div>
        </div>
        <div class="admin-test-actions">
          <button class="btn btn-sm" data-edit-subject="${escapeHtml(s.id)}">Edit</button>
          <button class="btn btn-sm" data-delete-subject="${escapeHtml(s.id)}">Archive</button>
        </div>
      </div>`;
  }

  function openSubjectModal(subject) {
    $("subjectModalTitle").textContent = subject ? "Edit subject" : "Add subject";
    $("subjectFormId").value = subject?.id || "";
    $("subjectName").value = subject?.name || "";
    $("subjectNameAs").value = subject?.nameAs || "";
    $("subjectDescription").value = subject?.description || "";
    $("subjectModal").classList.add("open");
  }

  function editSubject(id) {
    const subject = cachedSubjects.find((s) => s.id === id);
    if (subject) openSubjectModal(subject);
  }

  async function saveSubject(e) {
    e.preventDefault();
    const id = $("subjectFormId").value;
    const name = $("subjectName").value.trim();
    const nameAs = $("subjectNameAs").value.trim();
    const description = $("subjectDescription").value.trim();
    if (!name) { toast("Subject name is required.", "error"); return; }

    const btn = $("subjectSaveBtn");
    btn.disabled = true;
    try {
      if (id) {
        await api(`/api/admin/subjects/${encodeURIComponent(id)}`, { method: "PATCH", body: { name, nameAs, description } });
        toast("Subject updated.", "success");
      } else {
        await api("/api/admin/subjects", { method: "POST", body: { name, nameAs, description } });
        toast("Subject created.", "success");
      }
      $("subjectModal").classList.remove("open");
      loadSubjects();
      loadStats();
    } catch (err) {
      toast(err.message || "Save failed.", "error");
    } finally {
      btn.disabled = false;
    }
  }

  async function deleteSubject(id) {
    const ok = await askConfirm("Archive subject?", "This will hide the subject from the homepage. Existing tests will remain.");
    if (!ok) return;
    try {
      await api(`/api/admin/subjects/${encodeURIComponent(id)}`, { method: "DELETE" });
      toast("Subject archived.", "success");
      loadSubjects();
      loadStats();
    } catch (err) {
      toast(err.message || "Archive failed.", "error");
    }
  }

  // ─────────────────────────────────────────────────────────
  // FOREVER FREE
  // ─────────────────────────────────────────────────────────
  async function loadForeverFree() {
    const list = $("foreverFreeList");
    try {
      const [subjRes, ffRes] = await Promise.all([
        api("/api/admin/subjects"),
        api("/api/admin/forever-free"),
      ]);
      cachedSubjects = subjRes.subjects || [];
      const ffTests = ffRes.tests || [];
      const ffBySubject = {};
      ffTests.forEach((t) => { ffBySubject[t.subjectId] = t; });

      if (cachedSubjects.length === 0) {
        list.innerHTML = '<div class="empty-state">Create a subject first.</div>';
        return;
      }

      list.innerHTML = cachedSubjects.map((s) => {
        const ff = ffBySubject[s.id];
        return `
          <div class="admin-test-card">
            <div class="admin-test-info">
              <h3 class="admin-test-title">${escapeHtml(s.name)}</h3>
              <div class="admin-test-meta">
                ${ff
                  ? `<span class="badge badge-accent">Configured</span>
                     <span>${(ff.questions || []).length} questions</span>
                     <span>${ff.duration || 15} min</span>`
                  : '<span class="badge badge-muted">Not configured</span>'}
              </div>
            </div>
            <div class="admin-test-actions">
              <button class="btn btn-sm btn-primary" data-ff-edit="${escapeHtml(s.id)}">${ff ? "Edit" : "Create"}</button>
            </div>
          </div>`;
      }).join("");

      list.querySelectorAll("[data-ff-edit]").forEach((b) => {
        b.addEventListener("click", () => openFFModal(b.getAttribute("data-ff-edit"), ffBySubject[b.getAttribute("data-ff-edit")]));
      });
    } catch (err) {
      list.innerHTML = '<div class="empty-state">Could not load Forever Free tests.</div>';
    }
  }

  function openFFModal(subjectId, existing) {
    const subject = cachedSubjects.find((s) => s.id === subjectId);
    $("ffModalTitle").textContent = `Forever Free — ${subject?.name || subjectId}`;
    $("ffForm").dataset.subjectId = subjectId;
    $("ffTitle").value = existing?.title || `Free ${subject?.name || "Test"}`;
    $("ffDuration").value = existing?.duration || 15;
    $("ffQuestionsJson").value = existing?.questions ? JSON.stringify(existing.questions, null, 2) : "[]";
    $("foreverFreeModal").classList.add("open");
  }

  async function saveFF(e) {
    e.preventDefault();
    const subjectId = $("ffForm").dataset.subjectId;
    const title = $("ffTitle").value.trim();
    const duration = parseInt($("ffDuration").value, 10);
    let questions;
    try { questions = JSON.parse($("ffQuestionsJson").value); }
    catch { toast("Questions JSON is invalid.", "error"); return; }
    if (!Array.isArray(questions) || questions.length === 0) {
      toast("Please add at least one question.", "error");
      return;
    }
    const btn = $("ffSaveBtn");
    btn.disabled = true;
    try {
      await api(`/api/admin/forever-free/${encodeURIComponent(subjectId)}`, {
        method: "PUT",
        body: { title, duration, questions }
      });
      toast("Forever Free test saved.", "success");
      $("foreverFreeModal").classList.remove("open");
      loadForeverFree();
      loadStats();
    } catch (err) {
      toast(err.message || "Save failed.", "error");
    } finally { btn.disabled = false; }
  }

  // ─────────────────────────────────────────────────────────
  // HOMEPAGE TESTS
  // ─────────────────────────────────────────────────────────
  async function loadHomepageTests() {
    const list = $("homepageTestsList");
    try {
      const [testsRes, subjRes] = await Promise.all([
        api("/api/admin/homepage-tests"),
        api("/api/admin/subjects"),
      ]);
      cachedSubjects = subjRes.subjects || [];
      const tests = testsRes.tests || [];

      if (tests.length === 0) {
        list.innerHTML = '<div class="empty-state">No homepage tests yet. Click "Create homepage test" to add one.</div>';
        return;
      }

      list.innerHTML = tests.map((t) => `
        <div class="admin-test-card">
          <div class="admin-test-info">
            <h3 class="admin-test-title">${escapeHtml(t.title)}</h3>
            <div class="admin-test-meta">
              <span>${escapeHtml(t.subjectName || t.subjectId || "")}</span>
              <span class="status-badge ${t.status === "published" ? "published" : "draft"}">${t.status || "draft"}</span>
              <span>${(t.questions || []).length} questions</span>
              <span>${t.duration || 30} min</span>
              <span>${t.isPaid !== false ? "Paid" : "Free"}</span>
            </div>
          </div>
          <div class="admin-test-actions">
            <button class="btn btn-sm" data-edit-ht="${escapeHtml(t.id)}">Edit</button>
            <button class="btn btn-sm" data-del-ht="${escapeHtml(t.id)}">Delete</button>
          </div>
        </div>
      `).join("");

      list.querySelectorAll("[data-edit-ht]").forEach((b) => {
        b.addEventListener("click", () => editHomepageTest(b.getAttribute("data-edit-ht"), tests));
      });
      list.querySelectorAll("[data-del-ht]").forEach((b) => {
        b.addEventListener("click", () => deleteHomepageTest(b.getAttribute("data-del-ht")));
      });
    } catch (err) {
      list.innerHTML = '<div class="empty-state">Could not load homepage tests.</div>';
    }
  }

  function openHomepageTestModal(existing) {
    const sel = $("hpSubjectId");
    sel.innerHTML = cachedSubjects
      .filter((s) => s.active !== false)
      .map((s) => `<option value="${escapeHtml(s.id)}">${escapeHtml(s.name)}</option>`)
      .join("");

    $("hpModalTitle").textContent = existing ? "Edit homepage test" : "Create homepage test";
    $("hpTestId").value = existing?.id || "";
    $("hpTitle").value = existing?.title || "";
    $("hpSubjectId").value = existing?.subjectId || (cachedSubjects[0]?.id || "");
    $("hpDuration").value = existing?.duration || 30;
    $("hpIsPaid").checked = existing ? (existing.isPaid !== false) : true;
    $("hpQuestionsJson").value = existing?.questions ? JSON.stringify(existing.questions, null, 2) : "[]";
    $("hpStatus").value = existing?.status || "draft";
    $("homepageTestModal").classList.add("open");
  }

  function editHomepageTest(id, tests) {
    const test = tests.find((t) => t.id === id);
    if (test) openHomepageTestModal(test);
  }

  async function saveHomepageTest(e) {
    e.preventDefault();
    const id = $("hpTestId").value;
    const title = $("hpTitle").value.trim();
    const subjectId = $("hpSubjectId").value;
    const duration = parseInt($("hpDuration").value, 10);
    const isPaid = $("hpIsPaid").checked;
    const status = $("hpStatus").value;
    let questions;
    try { questions = JSON.parse($("hpQuestionsJson").value); }
    catch { toast("Questions JSON is invalid.", "error"); return; }
    if (!title || !subjectId) { toast("Title and subject are required.", "error"); return; }

    const subjectName = cachedSubjects.find((s) => s.id === subjectId)?.name || "";
    const btn = $("hpSaveBtn");
    btn.disabled = true;
    try {
      if (id) {
        await api(`/api/admin/homepage-tests/${encodeURIComponent(id)}`, {
          method: "PATCH",
          body: { title, duration, questions, status }
        });
        toast("Test updated.", "success");
      } else {
        await api("/api/admin/homepage-tests", {
          method: "POST",
          body: { title, subjectId, subjectName, duration, isPaid, questions, status }
        });
        toast("Test created.", "success");
      }
      $("homepageTestModal").classList.remove("open");
      loadHomepageTests();
      loadStats();
    } catch (err) {
      toast(err.message || "Save failed.", "error");
    } finally { btn.disabled = false; }
  }

  async function deleteHomepageTest(id) {
    const ok = await askConfirm("Delete homepage test?", "This cannot be undone. Any attempts already made will remain in history.");
    if (!ok) return;
    try {
      await api(`/api/admin/homepage-tests/${encodeURIComponent(id)}`, { method: "DELETE" });
      toast("Test deleted.", "success");
      loadHomepageTests();
      loadStats();
    } catch (err) {
      toast(err.message || "Delete failed.", "error");
    }
  }

  // ─────────────────────────────────────────────────────────
  // QUESTION BANK
  // ─────────────────────────────────────────────────────────
  async function initQuestionBankTab() {
    const sel = $("qbSubjectSelect");
    if (!sel.options.length) {
      try {
        if (!cachedSubjects.length) {
          const r = await api("/api/admin/subjects");
          cachedSubjects = r.subjects || [];
        }
        sel.innerHTML = cachedSubjects
          .filter((s) => s.active !== false)
          .map((s) => `<option value="${escapeHtml(s.id)}">${escapeHtml(s.name)}</option>`)
          .join("");
        if (cachedSubjects[0]) currentQBSubject = cachedSubjects[0].id;
      } catch (err) { toast("Could not load subjects.", "error"); return; }
    }
    if (!currentQBSubject && sel.options[0]) currentQBSubject = sel.options[0].value;
    if (currentQBSubject) loadQuestionsFor(currentQBSubject);
  }

  async function loadQuestionsFor(subjectId) {
    currentQBSubject = subjectId;
    const list = $("questionBankList");
    list.innerHTML = '<div class="empty-state">Loading…</div>';
    try {
      const res = await api(`/api/admin/questions/${encodeURIComponent(subjectId)}`);
      const questions = res.questions || [];
      if (questions.length === 0) {
        list.innerHTML = '<div class="empty-state">No questions in this subject yet.</div>';
        return;
      }
      list.innerHTML = questions.map(renderQuestionCard).join("");
      list.querySelectorAll("[data-edit-q]").forEach((b) =>
        b.addEventListener("click", () => editQuestion(b.getAttribute("data-edit-q"), questions))
      );
      list.querySelectorAll("[data-del-q]").forEach((b) =>
        b.addEventListener("click", () => deleteQuestion(b.getAttribute("data-del-q")))
      );
    } catch (err) {
      list.innerHTML = '<div class="empty-state">Could not load questions.</div>';
    }
  }

  function renderQuestionCard(q) {
    const qText = q.question?.en || "";
    return `
      <div class="admin-test-card">
        <div class="admin-test-info">
          <h3 class="admin-test-title">${escapeHtml(q.externalId || q.id)} — ${escapeHtml(qText.slice(0, 120))}${qText.length > 120 ? "…" : ""}</h3>
          <div class="admin-test-meta">
            <span>Marks: ${q.marks || 1}</span>
            <span>Difficulty: ${q.difficulty || "medium"}</span>
            <span>Correct: ${escapeHtml(q.correctOptionId)}</span>
            ${q.active !== false ? '<span class="badge badge-accent">Active</span>' : '<span class="badge badge-muted">Archived</span>'}
          </div>
        </div>
        <div class="admin-test-actions">
          <button class="btn btn-sm" data-edit-q="${escapeHtml(q.id)}">Edit</button>
          <button class="btn btn-sm" data-del-q="${escapeHtml(q.id)}">Archive</button>
        </div>
      </div>`;
  }

  function openQuestionModal(q) {
    $("qModalTitle").textContent = q ? "Edit question" : "Add question";
    $("qEditId").value = q?.id || "";
    $("qExternalId").value = q?.externalId || "";
    $("qTextEn").value = q?.question?.en || "";
    $("qTextAs").value = q?.question?.as || "";
    $("qCorrect").value = q?.correctOptionId || "A";
    $("qMarks").value = q?.marks || 1;
    $("qDifficulty").value = q?.difficulty || "medium";
    $("qExplanationEn").value = q?.explanation?.en || "";
    $("qExplanationAs").value = q?.explanation?.as || "";

    // Render 4 options
    const container = $("qOptionsContainer");
    container.innerHTML = "";
    ["A", "B", "C", "D"].forEach((letter) => {
      const opt = (q?.options || []).find((o) => o.id === letter) || { id: letter, en: "", as: "" };
      const wrap = document.createElement("div");
      wrap.style.cssText = "display:flex;gap:8px;align-items:center;";
      wrap.innerHTML = `
        <span style="font-weight:600;min-width:24px;">${letter}</span>
        <input class="form-input" type="text" data-opt-en="${letter}" placeholder="English text" value="${escapeHtml(opt.en || "")}" style="flex:1;">
        <input class="form-input" type="text" data-opt-as="${letter}" placeholder="Assamese text" value="${escapeHtml(opt.as || "")}" style="flex:1;">
      `;
      container.appendChild(wrap);
    });

    $("questionModal").classList.add("open");
  }

  function editQuestion(id, questions) {
    const q = questions.find((x) => x.id === id);
    if (q) openQuestionModal(q);
  }

  async function saveQuestion(e) {
    e.preventDefault();
    const id = $("qEditId").value;
    const subjectId = currentQBSubject;
    if (!subjectId) { toast("Select a subject first.", "error"); return; }

    const externalId = $("qExternalId").value.trim();
    const options = ["A", "B", "C", "D"].map((letter) => ({
      id: letter,
      en: document.querySelector(`[data-opt-en="${letter}"]`)?.value.trim() || "",
      as: document.querySelector(`[data-opt-as="${letter}"]`)?.value.trim() || ""
    }));
    const question = {
      externalId,
      question: { en: $("qTextEn").value.trim(), as: $("qTextAs").value.trim() },
      options,
      correctOptionId: $("qCorrect").value.trim().toUpperCase(),
      marks: parseInt($("qMarks").value, 10) || 1,
      difficulty: $("qDifficulty").value,
      explanation: { en: $("qExplanationEn").value.trim(), as: $("qExplanationAs").value.trim() }
    };

    const btn = $("qSaveBtn");
    btn.disabled = true;
    try {
      if (id) {
        await api(`/api/admin/questions/${encodeURIComponent(subjectId)}/${encodeURIComponent(id)}`, {
          method: "PATCH",
          body: question
        });
        toast("Question updated.", "success");
      } else {
        await api(`/api/admin/questions/${encodeURIComponent(subjectId)}`, {
          method: "POST",
          body: { question }
        });
        toast("Question created.", "success");
      }
      $("questionModal").classList.remove("open");
      loadQuestionsFor(subjectId);
      loadStats();
    } catch (err) {
      toast(err.message || "Save failed.", "error");
    } finally { btn.disabled = false; }
  }

  async function deleteQuestion(id) {
    if (!currentQBSubject) return;
    const ok = await askConfirm("Archive question?", "This will hide the question from future tests but keep history.");
    if (!ok) return;
    try {
      await api(`/api/admin/questions/${encodeURIComponent(currentQBSubject)}/${encodeURIComponent(id)}`, { method: "DELETE" });
      toast("Question archived.", "success");
      loadQuestionsFor(currentQBSubject);
    } catch (err) {
      toast(err.message || "Archive failed.", "error");
    }
  }

  async function importQuestions() {
    const input = prompt("Paste a JSON array of questions:");
    if (!input) return;
    let questions;
    try { questions = JSON.parse(input); }
    catch { toast("Invalid JSON.", "error"); return; }
    if (!Array.isArray(questions)) { toast("JSON must be an array.", "error"); return; }
    try {
      const res = await api(`/api/admin/questions/${encodeURIComponent(currentQBSubject)}/import`, {
        method: "POST",
        body: { questions }
      });
      toast(`Imported ${res.accepted} accepted, ${res.rejected} rejected.`, "success");
      loadQuestionsFor(currentQBSubject);
    } catch (err) {
      toast(err.message || "Import failed.", "error");
    }
  }

  // ─────────────────────────────────────────────────────────
  // PURCHASES
  // ─────────────────────────────────────────────────────────
  async function loadPurchases() {
    const list = $("purchasesList");
    try {
      const res = await api("/api/admin/purchases");
      const purchases = res.purchases || [];
      if (purchases.length === 0) {
        list.innerHTML = '<div class="empty-state">No purchase requests yet.</div>';
        return;
      }
      list.innerHTML = purchases.map((p) => `
        <div class="admin-test-card">
          <div class="admin-test-info">
            <h3 class="admin-test-title">${escapeHtml(p.planName || p.plan)} — ₹${p.price}</h3>
            <div class="admin-test-meta">
              <span>${escapeHtml(p.email || "")}</span>
              <span>${escapeHtml(p.userId || "")}</span>
              <span class="status-badge ${p.paymentStatus === "verified" ? "published" : "draft"}">${p.paymentStatus}</span>
              <span>${p.requestId}</span>
            </div>
          </div>
          <div class="admin-test-actions">
            ${p.paymentStatus === "pending" ? `
              <button class="btn btn-sm btn-primary" data-verify="${escapeHtml(p.requestId)}">Verify</button>
              <button class="btn btn-sm" data-reject="${escapeHtml(p.requestId)}">Reject</button>
            ` : `<span class="badge badge-muted">${p.paymentStatus}</span>`}
          </div>
        </div>
      `).join("");

      list.querySelectorAll("[data-verify]").forEach((b) =>
        b.addEventListener("click", () => verifyPurchase(b.getAttribute("data-verify")))
      );
      list.querySelectorAll("[data-reject]").forEach((b) =>
        b.addEventListener("click", () => rejectPurchase(b.getAttribute("data-reject")))
      );
    } catch (err) {
      list.innerHTML = '<div class="empty-state">Could not load purchases.</div>';
    }
  }

  async function verifyPurchase(requestId) {
    const ref = prompt("Enter the payment transaction reference:");
    if (!ref) return;
    try {
      await api(`/api/admin/purchases/${encodeURIComponent(requestId)}/verify`, {
        method: "POST",
        body: { transactionRef: ref }
      });
      toast("Purchase verified. Subscription activated.", "success");
      loadPurchases();
      loadStats();
    } catch (err) {
      toast(err.message || "Verification failed.", "error");
    }
  }

  async function rejectPurchase(requestId) {
    const reason = prompt("Reason for rejection (optional):") || "Could not verify payment";
    try {
      await api(`/api/admin/purchases/${encodeURIComponent(requestId)}/reject`, {
        method: "POST",
        body: { reason }
      });
      toast("Purchase rejected.", "success");
      loadPurchases();
    } catch (err) {
      toast(err.message || "Reject failed.", "error");
    }
  }

  // ─────────────────────────────────────────────────────────
  // USERS
  // ─────────────────────────────────────────────────────────
  async function loadUsers() {
    const list = $("usersList");
    try {
      const res = await api("/api/admin/users");
      cachedUsers = res.users || [];
      renderUsers(cachedUsers);
    } catch (err) {
      list.innerHTML = '<div class="empty-state">Could not load users.</div>';
    }
  }

  function renderUsers(users) {
    const list = $("usersList");
    if (users.length === 0) {
      list.innerHTML = '<div class="empty-state">No users found.</div>';
      return;
    }
    list.innerHTML = users.map((u) => `
      <div class="admin-test-card">
        <div class="admin-test-info">
          <h3 class="admin-test-title">${escapeHtml(u.displayName || "User")}</h3>
          <div class="admin-test-meta">
            <span>${escapeHtml(u.email || "")}</span>
            <span>ID: <code>${escapeHtml(u.userId || "")}</code></span>
            <span>Plan: ${escapeHtml(u.plan || "free").toUpperCase()}</span>
            <span class="status-badge ${u.status === "suspended" ? "draft" : "published"}">${escapeHtml(u.status || "active")}</span>
          </div>
        </div>
        <div class="admin-test-actions">
          ${u.status === "suspended"
            ? `<button class="btn btn-sm" data-unsuspend="${escapeHtml(u.uid)}">Unsuspend</button>`
            : `<button class="btn btn-sm" data-suspend="${escapeHtml(u.uid)}">Suspend</button>`}
        </div>
      </div>
    `).join("");

    list.querySelectorAll("[data-suspend]").forEach((b) =>
      b.addEventListener("click", () => suspendUser(b.getAttribute("data-suspend")))
    );
    list.querySelectorAll("[data-unsuspend]").forEach((b) =>
      b.addEventListener("click", () => unsuspendUser(b.getAttribute("data-unsuspend")))
    );
  }

  async function suspendUser(uid) {
    const ok = await askConfirm("Suspend user?", "The user will not be able to log in or attempt tests.");
    if (!ok) return;
    try {
      await api(`/api/admin/users/${encodeURIComponent(uid)}/suspend`, { method: "POST" });
      toast("User suspended.", "success");
      loadUsers();
    } catch (err) { toast(err.message || "Suspend failed.", "error"); }
  }

  async function unsuspendUser(uid) {
    try {
      await api(`/api/admin/users/${encodeURIComponent(uid)}/unsuspend`, { method: "POST" });
      toast("User unsuspended.", "success");
      loadUsers();
    } catch (err) { toast(err.message || "Unsuspend failed.", "error"); }
  }

  function filterUsers(query) {
    const q = query.toLowerCase().trim();
    if (!q) { renderUsers(cachedUsers); return; }
    const filtered = cachedUsers.filter(
      (u) =>
        (u.email || "").toLowerCase().includes(q) ||
        (u.displayName || "").toLowerCase().includes(q) ||
        (u.userId || "").toLowerCase().includes(q)
    );
    renderUsers(filtered);
  }

  // ─────────────────────────────────────────────────────────
  // SETTINGS
  // ─────────────────────────────────────────────────────────
  async function loadSettings() {
    try {
      const res = await api("/api/admin/settings");
      const s = res.settings || {};
      $("settingBrandName").value = s.brandName || "PrepareKora";
      $("settingWhatsapp").value = s.whatsappNumber || "";
      $("settingContactEmail").value = s.contactEmail || "";
      $("settingHeroHeading").value = s.heroHeading || "";
      $("settingHeroDesc").value = s.heroDescription || "";
      $("settingAbout").value = s.aboutContent || "";
      $("settingMaintenanceMode").checked = !!s.maintenanceMode;
      $("settingMaintenanceMessage").value = s.maintenanceMessage || "";
    } catch (err) {
      toast("Could not load settings.", "error");
    }
  }

  async function saveSettings(e) {
    e.preventDefault();
    const btn = $("saveSettingsBtn");
    btn.disabled = true;
    try {
      await api("/api/admin/settings", {
        method: "PATCH",
        body: {
          brandName: $("settingBrandName").value.trim(),
          whatsappNumber: $("settingWhatsapp").value.trim(),
          contactEmail: $("settingContactEmail").value.trim(),
          heroHeading: $("settingHeroHeading").value.trim(),
          heroDescription: $("settingHeroDesc").value.trim(),
          aboutContent: $("settingAbout").value.trim(),
          maintenanceMode: $("settingMaintenanceMode").checked,
          maintenanceMessage: $("settingMaintenanceMessage").value.trim()
        }
      });
      toast("Settings saved.", "success");
    } catch (err) {
      toast(err.message || "Save failed.", "error");
    } finally { btn.disabled = false; }
  }

  // ─────────────────────────────────────────────────────────
  // ACTIVITY
  // ─────────────────────────────────────────────────────────
  async function loadActivity() {
    const list = $("activityList");
    list.innerHTML = '<div class="empty-state">Loading…</div>';
    try {
      // No dedicated endpoint — read from DB via admin dashboard proxy
      // For MVP, show placeholder + note
      list.innerHTML = '<div class="empty-state">Activity logs will appear here as admin actions are performed. (Endpoint coming soon.)</div>';
    } catch (err) {
      list.innerHTML = '<div class="empty-state">Could not load activity.</div>';
    }
  }

  // ─────────────────────────────────────────────────────────
  // LOGOUT
  // ─────────────────────────────────────────────────────────
  async function doLogout() {
    try { await api("/api/auth/logout", { method: "POST" }); } catch (e) {}
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(EXPIRES_KEY);
      localStorage.removeItem(USER_KEY);
    } catch (e) {}
    window.location.href = "index.html";
  }

  // ─────────────────────────────────────────────────────────
  // INIT
  // ─────────────────────────────────────────────────────────
  async function init() {
    const yearEl = $("currentYear");
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    if (!isLoggedIn()) { showAccessDenied(); return; }

    // Verify admin
    try {
      const res = await api("/api/auth/me");
      me = res.user;
      if (!me || me.role !== "admin") {
        // Worker's requireAdmin is the real gate — but the user object
        // doesn't have role=admin necessarily. Instead, try a dashboard call:
        try {
          await api("/api/admin/dashboard");
        } catch (err) {
          if (err.status === 403) { showAccessDenied(); return; }
          throw err;
        }
      }
    } catch (err) {
      if (err.status === 401 || err.status === 403) { showAccessDenied(); return; }
    }

    try {
      const res = await api("/api/users/profile");
      const u = res.user;
      $("adminName").textContent = u.displayName || u.email || "Admin";
    } catch (e) {}

    showAdminUI();
    initTabs();
    loadStats();
    loadSubjects(); // default tab

    // Bind all
    $("adminLogoutBtn").addEventListener("click", doLogout);
    $("adminLogoutMobileBtn")?.addEventListener("click", (e) => { e.preventDefault(); doLogout(); });

    $("addSubjectBtn").addEventListener("click", () => openSubjectModal(null));
    $("subjectForm").addEventListener("submit", saveSubject);
    $("subjectCancelBtn").addEventListener("click", () => $("subjectModal").classList.remove("open"));

    $("ffForm").addEventListener("submit", saveFF);
    $("ffCancelBtn").addEventListener("click", () => $("foreverFreeModal").classList.remove("open"));

    $("addHomepageTestBtn").addEventListener("click", () => openHomepageTestModal(null));
    $("hpForm").addEventListener("submit", saveHomepageTest);
    $("hpCancelBtn").addEventListener("click", () => $("homepageTestModal").classList.remove("open"));

    $("addQuestionBtn").addEventListener("click", () => openQuestionModal(null));
    $("importQuestionsBtn").addEventListener("click", importQuestions);
    $("questionForm").addEventListener("submit", saveQuestion);
    $("qCancelBtn").addEventListener("click", () => $("questionModal").classList.remove("open"));
    $("qbSubjectSelect").addEventListener("change", () => {
      currentQBSubject = $("qbSubjectSelect").value;
      loadQuestionsFor(currentQBSubject);
    });

    $("settingsForm").addEventListener("submit", saveSettings);

    $("userSearchInput").addEventListener("input", (e) => {
      clearTimeout(userSearchTimeout);
      userSearchTimeout = setTimeout(() => filterUsers(e.target.value), 200);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
