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

  const TOKEN_KEY = "pk_admin_id_token";

  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY) || ""; }
    catch (e) { return ""; }
  }

  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      const m = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
      return m[c];
    });
  }

  function toast(msg, kind) {
    const c = document.getElementById("toastContainer");
    if (!c) return;
    const el = document.createElement("div");
    el.className = "toast" + (kind ? " " + kind : "");
    el.textContent = msg;
    c.appendChild(el);
    setTimeout(function () { el.remove(); }, 3200);
  }

  function timeAgo(ts) {
    if (!ts) return "—";
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return mins + "m ago";
    if (mins < 1440) return Math.floor(mins / 60) + "h ago";
    return Math.floor(mins / 1440) + "d ago";
  }

  function fmtDate(ts) {
    if (!ts) return "—";
    const d = new Date(ts);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleString("en-IN", {
      day: "numeric", month: "short", year: "numeric",
      hour: "numeric", minute: "2-digit", hour12: true
    });
  }

  async function dbFetch(path, opts) {
    opts = opts || {};
    const token = getToken();
    const headers = Object.assign({ "Accept": "application/json" }, opts.headers || {});
    if (token) headers["Authorization"] = "Bearer " + token;
    if (opts.body && !headers["Content-Type"]) headers["Content-Type"] = "application/json";

    const res = await fetch(API_BASE + path, {
      method: opts.method || "GET",
      headers: headers,
      body: opts.body
    });

    let data = null;
    try { data = await res.json(); } catch (e) {}
    if (!res.ok) {
      const err = new Error((data && data.error) || ("HTTP " + res.status));
      err.status = res.status;
      throw err;
    }
    return data;
  }

  /* ---------- State ---------- */

  const state = {
    section: "tests",
    search: "",
    tests: null,
    submissionCounts: null,
    submissions: {},
    viewingTestId: null,
    names: null,
    settings: null,
    audit: null,
    rawRoot: null,
    rawExpanded: new Set(),
    rawChildren: {}
  };

  let panelDatabase, dbContent, dbSearch, dbRefreshBtn, tabDatabase;

  function cacheDom() {
    panelDatabase = document.getElementById("panelDatabase");
    dbContent = document.getElementById("dbContent");
    dbSearch = document.getElementById("dbSearch");
    dbRefreshBtn = document.getElementById("dbRefreshBtn");
    tabDatabase = document.getElementById("tabDatabase");
  }

  function updateSectionBtns() {
    document.querySelectorAll(".db-section-btn").forEach(function (btn) {
      const active = btn.dataset.section === state.section;
      btn.classList.toggle("is-active", active);
    });
  }

  function showLoading() {
    if (dbContent) {
      dbContent.innerHTML = '<div class="db-loading"><div class="spinner"></div></div>';
    }
  }

  function showError(err) {
    if (dbContent) {
      dbContent.innerHTML = '<div class="db-error">' + esc(err.message || "Failed to load") + '</div>';
    }
  }

  function showEmpty(msg) {
    if (dbContent) {
      dbContent.innerHTML = '<div class="db-empty">' + esc(msg) + '</div>';
    }
  }

  /* ---------- Loaders ---------- */

  async function loadTests() {
    showLoading();
    try {
      const res = await dbFetch("/admin/db/node?path=tests");
      const data = res.value || {};
      state.tests = Object.keys(data).map(function (k) {
        const t = data[k] || {};
        return Object.assign({ id: k }, t);
      });
      state.tests.sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
      renderTests();
    } catch (err) { showError(err); }
  }

  async function loadSubmissions() {
    showLoading();
    try {
      const res = await dbFetch("/admin/db/list?path=submissions");
      const testIds = res.children || [];
      const counts = {};
      await Promise.all(testIds.map(async function (tid) {
        try {
          const r = await dbFetch("/admin/db/list?path=" + encodeURIComponent("submissions/" + tid));
          counts[tid] = (r.children || []).length;
        } catch (e) { counts[tid] = 0; }
      }));
      state.submissionCounts = counts;
      state.submissions = {};
      state.viewingTestId = null;
      renderSubmissions();
    } catch (err) { showError(err); }
  }

  async function loadSubmissionsForTest(tid) {
    showLoading();
    try {
      const res = await dbFetch("/admin/db/node?path=" + encodeURIComponent("submissions/" + tid));
      const data = res.value || {};
      const subs = Object.keys(data).map(function (k) {
        const s = data[k] || {};
        return Object.assign({ _key: k }, s);
      });
      subs.sort(function (a, b) { return (b.submittedAt || 0) - (a.submittedAt || 0); });
      state.submissions[tid] = subs;
      state.viewingTestId = tid;
      renderSubmissions();
    } catch (err) { showError(err); }
  }

  async function loadNames() {
    showLoading();
    try {
      const res = await dbFetch("/admin/db/node?path=adminDisplayNames");
      const data = res.value || {};
      state.names = Object.keys(data).map(function (k) {
        return { uid: k, displayName: data[k] };
      });
      renderNames();
    } catch (err) { showError(err); }
  }

  async function loadSettings() {
    showLoading();
    try {
      const res = await dbFetch("/admin/db/node?path=settings");
      const data = res.value || {};
      state.settings = data;
      renderSettings();
    } catch (err) { showError(err); }
  }

  async function loadAudit() {
    showLoading();
    try {
      const res = await dbFetch("/admin/db/audit");
      state.audit = res.entries || [];
      renderAudit();
    } catch (err) { showError(err); }
  }

  async function loadRaw() {
    showLoading();
    try {
      const res = await dbFetch("/admin/db/list?path=");
      state.rawRoot = res.children || [];
      state.rawExpanded = new Set();
      state.rawChildren = {};
      renderRaw();
    } catch (err) { showError(err); }
  }

  /* ---------- Render: Tests ---------- */

  function renderTests() {
    const q = state.search.toLowerCase().trim();
    let tests = state.tests || [];
    if (q) {
      tests = tests.filter(function (t) {
        return (
          (t.title || "").toLowerCase().indexOf(q) !== -1 ||
          (t.publisherName || "").toLowerCase().indexOf(q) !== -1 ||
          t.id.toLowerCase().indexOf(q) !== -1
        );
      });
    }

    if (tests.length === 0) {
      showEmpty(q ? "No tests match \"" + state.search + "\"" : "No tests");
      return;
    }

    let html = '<div class="db-card-list">';
    tests.forEach(function (t) {
      const isPub = t.status === "published";
      const qcount = Array.isArray(t.questions) ? t.questions.length : 0;
      html +=
        '<div class="db-item-card">' +
          '<div class="db-item-head">' +
            '<div class="db-item-title">' + esc(t.title || "Untitled") + '</div>' +
            '<span class="status-badge ' + (isPub ? "published" : "draft") + '">' + esc(t.status || "unknown") + '</span>' +
          '</div>' +
          '<div class="db-item-meta">' +
            '<span>By ' + esc(t.publisherName || "—") + '</span>' +
            '<span>' + qcount + ' questions</span>' +
            '<span>' + (t.minutes || 0) + ' min</span>' +
            '<span>' + esc(fmtDate(t.createdAt)) + '</span>' +
          '</div>' +
          '<div class="db-item-id">' + esc(t.id) + '</div>' +
          '<div class="db-item-actions">' +
            '<button class="btn btn-sm" type="button" data-action="view" data-path="' + esc("tests/" + t.id) + '" data-label="' + esc(t.title || t.id) + '">View JSON</button>' +
            '<button class="btn btn-sm db-delete-btn" type="button" data-action="delete" data-path="' + esc("tests/" + t.id) + '" data-label="' + esc(t.title || t.id) + '" data-cascade="true">Delete</button>' +
          '</div>' +
        '</div>';
    });
    html += '</div>';
    dbContent.innerHTML = html;
    wireItemEvents();
  }

  /* ---------- Render: Submissions ---------- */

  function renderSubmissions() {
    if (state.viewingTestId) {
      renderSubmissionsForTest(state.viewingTestId);
      return;
    }

    const q = state.search.toLowerCase().trim();
    const counts = state.submissionCounts || {};
    let testIds = Object.keys(counts);

    if (q) {
      testIds = testIds.filter(function (tid) { return tid.toLowerCase().indexOf(q) !== -1; });
    }

    if (testIds.length === 0) {
      showEmpty(q ? "No tests match \"" + state.search + "\"" : "No submissions yet");
      return;
    }

    testIds.sort(function (a, b) { return (counts[b] || 0) - (counts[a] || 0); });

    let html = '<div class="db-card-list">';
    testIds.forEach(function (tid) {
      const testObj = (state.tests || []).find(function (t) { return t.id === tid; });
      const title = testObj ? testObj.title : tid;
      const count = counts[tid] || 0;
      html +=
        '<div class="db-item-card db-sub-group">' +
          '<div class="db-item-head">' +
            '<div class="db-item-title">' + esc(title || "Unknown test") + '</div>' +
            '<span class="db-count-badge">' + count + ' submissions</span>' +
          '</div>' +
          '<div class="db-item-id">' + esc(tid) + '</div>' +
          '<div class="db-item-actions">' +
            '<button class="btn btn-sm btn-primary" type="button" data-action="drill" data-test-id="' + esc(tid) + '">View submissions</button>' +
            '<button class="btn btn-sm db-delete-btn" type="button" data-action="delete" data-path="' + esc("submissions/" + tid) + '" data-label="All submissions for ' + esc(title) + '">Delete all</button>' +
          '</div>' +
        '</div>';
    });
    html += '</div>';
    dbContent.innerHTML = html;
    wireItemEvents();
  }

  function renderSubmissionsForTest(tid) {
    const subs = state.submissions[tid] || [];
    const q = state.search.toLowerCase().trim();
    let filtered = subs;
    if (q) {
      filtered = subs.filter(function (s) {
        return (
          (s.userName || "").toLowerCase().indexOf(q) !== -1 ||
          (s.userWhatsApp || "").toLowerCase().indexOf(q) !== -1
        );
      });
    }

    const testObj = (state.tests || []).find(function (t) { return t.id === tid; });
    const title = testObj ? testObj.title : tid;

    let html = '<div class="db-back-row"><button class="btn btn-sm" type="button" data-action="back">← Back</button><span class="db-back-title">' + esc(title) + '</span></div>';

    if (filtered.length === 0) {
      html += '<div class="db-empty">' + (q ? 'No submissions match "' + esc(state.search) + '"' : "No submissions") + '</div>';
      dbContent.innerHTML = html;
      wireItemEvents();
      return;
    }

    html += '<div class="db-card-list">';
    filtered.forEach(function (s) {
      html +=
        '<div class="db-item-card db-sub-item">' +
          '<div class="db-item-head">' +
            '<div class="db-item-title">' + esc(s.userName || "—") + '</div>' +
            '<span class="db-score-badge">' + (s.correct || 0) + '/' + (s.total || 0) + ' · ' + (s.percent || 0) + '%</span>' +
          '</div>' +
          '<div class="db-item-meta">' +
            '<span>Correct: ' + (s.correct || 0) + '</span>' +
            '<span>Wrong: ' + (s.wrong || 0) + '</span>' +
            '<span>Unattempted: ' + (s.unattempted || 0) + '</span>' +
            '<span>Time: ' + (s.timeTaken ? s.timeTaken + 's' : '—') + '</span>' +
            '<span>' + esc(timeAgo(s.submittedAt)) + '</span>' +
            (s.userWhatsApp ? '<span>📱 ' + esc(s.userWhatsApp) + '</span>' : '') +
          '</div>' +
          '<div class="db-item-id">' + esc(s._key) + '</div>' +
          '<div class="db-item-actions">' +
            '<button class="btn btn-sm" type="button" data-action="view" data-path="' + esc("submissions/" + tid + "/" + s._key) + '" data-label="' + esc(s.userName || "Submission") + '">View JSON</button>' +
            '<button class="btn btn-sm db-delete-btn" type="button" data-action="delete" data-path="' + esc("submissions/" + tid + "/" + s._key) + '" data-label="Submission by ' + esc(s.userName) + '">Delete</button>' +
          '</div>' +
        '</div>';
    });
    html += '</div>';
    dbContent.innerHTML = html;
    wireItemEvents();
  }

  /* ---------- Render: Admin Names ---------- */

  function renderNames() {
    const q = state.search.toLowerCase().trim();
    let names = state.names || [];
    if (q) {
      names = names.filter(function (n) {
        return (n.displayName || "").toLowerCase().indexOf(q) !== -1 || n.uid.toLowerCase().indexOf(q) !== -1;
      });
    }

    if (names.length === 0) {
      showEmpty(q ? "No names match" : "No display names set");
      return;
    }

    let html = '<div class="db-card-list">';
    names.forEach(function (n) {
      html +=
        '<div class="db-item-card">' +
          '<div class="db-item-head">' +
            '<div class="db-item-title">' + esc(n.displayName || "—") + '</div>' +
          '</div>' +
          '<div class="db-item-id">' + esc(n.uid) + '</div>' +
          '<div class="db-item-actions">' +
            '<button class="btn btn-sm" type="button" data-action="view" data-path="' + esc("adminDisplayNames/" + n.uid) + '" data-label="' + esc(n.displayName || n.uid) + '">View JSON</button>' +
            '<button class="btn btn-sm db-delete-btn" type="button" data-action="delete" data-path="' + esc("adminDisplayNames/" + n.uid) + '" data-label="' + esc(n.displayName || n.uid) + '">Delete</button>' +
          '</div>' +
        '</div>';
    });
    html += '</div>';
    dbContent.innerHTML = html;
    wireItemEvents();
  }

  /* ---------- Render: Settings ---------- */

  function renderSettings() {
    const q = state.search.toLowerCase().trim();
    const settings = state.settings || {};
    let keys = Object.keys(settings);
    if (q) keys = keys.filter(function (k) { return k.toLowerCase().indexOf(q) !== -1; });

    if (keys.length === 0) {
      showEmpty(q ? "No settings match" : "No settings");
      return;
    }

    let html = '<div class="db-card-list">';
    keys.forEach(function (k) {
      const val = settings[k];
      const valText = typeof val === "object" ? JSON.stringify(val) : String(val);
      html +=
        '<div class="db-item-card">' +
          '<div class="db-item-head">' +
            '<div class="db-item-title">' + esc(k) + '</div>' +
          '</div>' +
          '<div class="db-item-meta">' +
            '<span class="db-setting-value">' + esc(valText.slice(0, 120)) + (valText.length > 120 ? "…" : "") + '</span>' +
          '</div>' +
          '<div class="db-item-actions">' +
            '<button class="btn btn-sm" type="button" data-action="view" data-path="' + esc("settings/" + k) + '" data-label="' + esc(k) + '">View JSON</button>' +
            '<button class="btn btn-sm db-delete-btn" type="button" data-action="delete" data-path="' + esc("settings/" + k) + '" data-label="' + esc(k) + '">Delete</button>' +
          '</div>' +
        '</div>';
    });
    html += '</div>';
    dbContent.innerHTML = html;
    wireItemEvents();
  }

  /* ---------- Render: Audit Log ---------- */

  function renderAudit() {
    const q = state.search.toLowerCase().trim();
    let entries = state.audit || [];
    if (q) {
      entries = entries.filter(function (e) {
        return (
          (e.action || "").toLowerCase().indexOf(q) !== -1 ||
          (e.primaryPath || "").toLowerCase().indexOf(q) !== -1 ||
          (e.adminEmail || "").toLowerCase().indexOf(q) !== -1
        );
      });
    }

    if (entries.length === 0) {
      showEmpty(q ? "No audit entries match" : "No audit entries yet");
      return;
    }

    let html = '<div class="db-card-list">';
    entries.forEach(function (e) {
      const paths = Array.isArray(e.deletedPaths) ? e.deletedPaths : [e.primaryPath];
      html +=
        '<div class="db-item-card db-audit-item">' +
          '<div class="db-item-head">' +
            '<div class="db-item-title">' + esc(e.action || "action") + '</div>' +
            '<span class="db-count-badge">' + esc(timeAgo(e.timestamp)) + '</span>' +
          '</div>' +
          '<div class="db-item-meta">' +
            '<span>By: ' + esc(e.adminEmail || e.adminId || "—") + '</span>' +
            '<span>' + esc(fmtDate(e.timestamp)) + '</span>' +
          '</div>' +
          '<div class="db-audit-paths">' +
            paths.map(function (p) { return '<code class="db-path-code">' + esc(p) + '</code>'; }).join("") +
          '</div>' +
        '</div>';
    });
    html += '</div>';
    dbContent.innerHTML = html;
  }

  /* ---------- Render: Raw JSON tree ---------- */

  function renderRaw() {
    if (!state.rawRoot || state.rawRoot.length === 0) {
      showEmpty("No data");
      return;
    }
    dbContent.innerHTML = '<div class="db-tree">' + state.rawRoot.map(function (k) { return renderRawNode(k, 0); }).join("") + '</div>';
    wireRawEvents();
  }

  function renderRawNode(path, depth) {
    const name = path.split("/").pop();
    const expanded = state.rawExpanded.has(path);
    const children = state.rawChildren[path];
    const hasKids = children === undefined ? true : children.length > 0;
    const padLeft = depth * 14 + 8;

    let html = '<div class="db-node">';
    html += '<div class="db-node-row" style="padding-left:' + padLeft + 'px">';

    if (hasKids) {
      html += '<button class="db-node-toggle' + (expanded ? " is-open" : "") + '" type="button" data-raw-toggle="' + esc(path) + '" aria-label="Toggle">▶</button>';
    } else {
      html += '<span class="db-node-toggle-spacer"></span>';
    }

    html += '<button class="db-node-label" type="button" data-raw-select="' + esc(path) + '">' + esc(name) + '</button>';
    html += '</div>';

    if (expanded && children) {
      children.forEach(function (ck) {
        html += renderRawNode(path ? path + "/" + ck : ck, depth + 1);
      });
    }

    html += '</div>';
    return html;
  }

  function wireRawEvents() {
    dbContent.querySelectorAll("[data-raw-toggle]").forEach(function (el) {
      el.addEventListener("click", async function (e) {
        e.stopPropagation();
        const p = el.getAttribute("data-raw-toggle");
        if (state.rawExpanded.has(p)) {
          state.rawExpanded.delete(p);
          renderRaw();
          return;
        }
        state.rawExpanded.add(p);
        if (!state.rawChildren[p]) {
          try {
            const res = await dbFetch("/admin/db/list?path=" + encodeURIComponent(p));
            state.rawChildren[p] = (res && Array.isArray(res.children)) ? res.children : [];
          } catch (err) {
            state.rawChildren[p] = [];
          }
        }
        renderRaw();
      });
    });

    dbContent.querySelectorAll("[data-raw-select]").forEach(function (el) {
      el.addEventListener("click", function () {
        openViewModal(el.getAttribute("data-raw-select"), el.textContent);
      });
    });
  }

  /* ---------- Wire item events (view/delete/drill/back) ---------- */

  function wireItemEvents() {
    dbContent.querySelectorAll("[data-action]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const action = btn.dataset.action;
        const path = btn.dataset.path;
        const label = btn.dataset.label || path;
        const cascade = btn.dataset.cascade === "true";

        if (action === "view") openViewModal(path, label);
        else if (action === "delete") openDeleteModal(path, label, cascade);
        else if (action === "drill") loadSubmissionsForTest(btn.dataset.testId);
        else if (action === "back") { state.viewingTestId = null; renderSubmissions(); }
      });
    });
  }

  /* ---------- View modal ---------- */

  function openViewModal(path, label) {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.innerHTML =
      '<div class="modal db-modal-wide">' +
        '<div class="db-modal-head">' +
          '<div>' +
            '<h2>' + esc(label || path) + '</h2>' +
            '<p class="db-modal-path">' + esc(path) + '</p>' +
          '</div>' +
          '<button class="submission-detail-close" type="button" data-close="1" aria-label="Close">' +
            '<svg viewBox="0 0 24 24"><path d="m6 6 12 12"></path><path d="M18 6 6 18"></path></svg>' +
          '</button>' +
        '</div>' +
        '<div class="db-modal-body">' +
          '<div class="db-loading"><div class="spinner"></div></div>' +
        '</div>' +
        '<div class="db-modal-actions">' +
          '<button class="btn btn-sm" type="button" data-copy="1">Copy JSON</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);
    overlay.classList.add("open");

    function close() {
      overlay.classList.remove("open");
      setTimeout(function () { overlay.remove(); }, 200);
    }

    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) close();
    });
    overlay.querySelector("[data-close]").addEventListener("click", close);
    overlay.querySelector("[data-copy]").addEventListener("click", function () {
      const pre = overlay.querySelector(".db-json");
      if (!pre) return;
      navigator.clipboard.writeText(pre.textContent).then(function () {
        toast("Copied", "success");
      }).catch(function () {
        toast("Copy failed", "error");
      });
    });

    document.addEventListener("keydown", function escHandler(e) {
      if (e.key === "Escape") {
        close();
        document.removeEventListener("keydown", escHandler);
      }
    });

    dbFetch("/admin/db/node?path=" + encodeURIComponent(path)).then(function (res) {
      const val = res ? res.value : null;
      const jsonStr = JSON.stringify(val, null, 2);
      const body = overlay.querySelector(".db-modal-body");
      if (!body) return;
      if (jsonStr.length > 150000) {
        body.innerHTML =
          '<div class="db-warn">Large node (' + Math.round(jsonStr.length / 1024) + ' KB). Showing first 150 KB.</div>' +
          '<pre class="db-json">' + esc(jsonStr.slice(0, 150000)) + '...</pre>';
      } else {
        body.innerHTML = '<pre class="db-json">' + esc(jsonStr) + '</pre>';
      }
    }).catch(function (err) {
      const body = overlay.querySelector(".db-modal-body");
      if (body) body.innerHTML = '<div class="db-error">' + esc(err.message || "Failed") + '</div>';
    });
  }

  /* ---------- Delete modal ---------- */

  function openDeleteModal(path, label, cascade) {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.innerHTML =
      '<div class="modal">' +
        '<h2>Delete?</h2>' +
        '<p class="muted-text" style="margin-bottom:10px;">This permanently deletes:</p>' +
        '<p class="db-delete-path">' + esc(path) + '</p>' +
        (cascade ? '<p class="db-delete-warn">⚠ All submissions for this test will also be deleted.</p>' : '') +
        '<p class="muted-text" style="margin-top:12px;margin-bottom:8px;font-size:12px;">Type <strong>DELETE</strong> to confirm:</p>' +
        '<input type="text" class="form-input" id="delConfirmInput" autocomplete="off" placeholder="DELETE">' +
        '<div class="modal-actions" style="margin-top:16px;">' +
          '<button class="btn" type="button" data-cancel="1">Cancel</button>' +
          '<button class="btn btn-primary" type="button" data-confirm="1" disabled>Delete</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);
    overlay.classList.add("open");

    const input = overlay.querySelector("#delConfirmInput");
    const confirmBtn = overlay.querySelector("[data-confirm]");

    input.addEventListener("input", function () {
      confirmBtn.disabled = input.value !== "DELETE";
    });

    setTimeout(function () { input.focus(); }, 50);

    function close() {
      overlay.classList.remove("open");
      setTimeout(function () { overlay.remove(); }, 200);
    }

    overlay.querySelector("[data-cancel]").addEventListener("click", close);
    overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });

    document.addEventListener("keydown", function escHandler(e) {
      if (e.key === "Escape") {
        close();
        document.removeEventListener("keydown", escHandler);
      }
    });

    confirmBtn.addEventListener("click", async function () {
      if (input.value !== "DELETE") return;
      confirmBtn.disabled = true;
      confirmBtn.textContent = "Deleting…";
      try {
        await dbFetch("/admin/db/delete", {
          method: "POST",
          body: JSON.stringify({ path: path, cascade: !!cascade })
        });
        toast("Deleted", "success");
        close();
        loadSection(state.section);
      } catch (err) {
        toast(err.message || "Delete failed", "error");
        confirmBtn.disabled = false;
        confirmBtn.textContent = "Delete";
      }
    });
  }

  /* ---------- Section switching ---------- */

  async function loadSection(name) {
    state.section = name;
    state.search = "";
    if (dbSearch) dbSearch.value = "";
    updateSectionBtns();

    if (name === "tests") await loadTests();
    else if (name === "submissions") await loadSubmissions();
    else if (name === "names") await loadNames();
    else if (name === "settings") await loadSettings();
    else if (name === "audit") await loadAudit();
    else if (name === "raw") await loadRaw();
  }

  /* ---------- Init ---------- */

  function init() {
    cacheDom();
    if (!tabDatabase || !panelDatabase) return;

    // Section buttons
    document.querySelectorAll(".db-section-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        loadSection(btn.dataset.section);
      });
    });

    // Tab click → load default section
    tabDatabase.addEventListener("click", function (e) {
      e.stopPropagation();
      if (!state.tests && state.section === "tests") {
        loadSection("tests");
      } else if (!state.tests && !state.submissionCounts && !state.names && !state.settings) {
        loadSection("tests");
      }
    });

    // Search
    if (dbSearch) {
      dbSearch.addEventListener("input", function () {
        state.search = dbSearch.value;
        if (state.section === "tests") renderTests();
        else if (state.section === "submissions") renderSubmissions();
        else if (state.section === "names") renderNames();
        else if (state.section === "settings") renderSettings();
        else if (state.section === "audit") renderAudit();
      });
    }

    // Refresh
    if (dbRefreshBtn) {
      dbRefreshBtn.addEventListener("click", function () {
        loadSection(state.section);
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
