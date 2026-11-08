"use strict";

/*
  PrepareKora — Admin panel (self-contained).
  Inlines API client so only translation.js is required in admin.html.
*/

(function () {

  /* ---------- API ---------- */

  const API_BASE = (function () {
    const host = window.location.hostname;
    const isLocal =
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "0.0.0.0" ||
      host === "" ||
      host.endsWith(".local");
    return isLocal ? "http://localhost:8787/api" : "/api";
  })();

  const TOKEN_KEY = "pk_admin_token";

  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY) || ""; }
    catch (e) { return ""; }
  }

  function setToken(token) {
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      else localStorage.removeItem(TOKEN_KEY);
    } catch (e) { /* ignore */ }
  }

  async function request(path, opts) {
    opts = opts || {};
    const headers = Object.assign({}, opts.headers || {});

    if (opts.body && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }

    if (!opts.noAuth) {
      const token = getToken();
      if (token) headers["Authorization"] = "Bearer " + token;
    }

    let res;
    try {
      res = await fetch(API_BASE + path, {
        method: opts.method || "GET",
        headers: headers,
        body: opts.body
      });
    } catch (networkErr) {
      const err = new Error("Network error. Check your connection.");
      err.status = 0;
      throw err;
    }

    let data = null;
    try { data = await res.json(); } catch (e) { /* non-JSON */ }

    if (!res.ok) {
      if (res.status === 401) setToken("");
      const err = new Error((data && data.error) || ("HTTP " + res.status));
      err.status = res.status;
      throw err;
    }

    return data;
  }

  const api = {
    login: function (u, p) {
      return request("/login", {
        method: "POST",
        noAuth: true,
        body: JSON.stringify({ username: u, password: p })
      });
    },
    me: function () { return request("/me"); },
    updateMe: function (name) {
      return request("/me", {
        method: "PUT",
        body: JSON.stringify({ displayName: name })
      });
    },
    listOwn: function () { return request("/admin/tests"); },
    getOwn: function (id) {
      return request("/admin/tests/" + encodeURIComponent(id));
    },
    createTest: function (payload) {
      return request("/admin/tests", {
        method: "POST",
        body: JSON.stringify(payload)
      });
    },
    updateTest: function (id, payload) {
      return request("/admin/tests/" + encodeURIComponent(id), {
        method: "PUT",
        body: JSON.stringify(payload)
      });
    },
    deleteTest: function (id) {
      return request("/admin/tests/" + encodeURIComponent(id), {
        method: "DELETE"
      });
    },
    publish: function (id) {
      return request("/admin/tests/" + encodeURIComponent(id) + "/publish", {
        method: "POST"
      });
    },
    unpublish: function (id) {
      return request("/admin/tests/" + encodeURIComponent(id) + "/unpublish", {
        method: "POST"
      });
    }
  };

  /* ---------- Helpers ---------- */

  function t(key, vars) {
    return (window.PK && window.PK.t) ? window.PK.t(key, vars) : key;
  }

  function esc(value) {
    return String(value).replace(/[&<>"']/g, function (c) {
      const m = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
      return m[c];
    });
  }

  function $id(id) { return document.getElementById(id); }

  function toast(message, kind) {
    const container = $id("toastContainer");
    if (!container) return;
    const el = document.createElement("div");
    el.className = "toast" + (kind ? " " + kind : "");
    el.textContent = message;
    container.appendChild(el);
    setTimeout(function () { el.remove(); }, 3200);
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        resolve();
      } catch (e) {
        reject(e);
      } finally {
        document.body.removeChild(ta);
      }
    });
  }

  function publicTestUrl(id) {
    const base =
      window.location.origin +
      window.location.pathname.replace(/admin\.html$/, "");
    return base + "mock-test.html?test=" + encodeURIComponent(id);
  }

  /* ---------- State ---------- */

  const state = {
    admin: null,
    tests: [],
    editing: null,
    currentTab: "tests"
  };

  /* ---------- Screens ---------- */

  const screens = {
    loading: $id("adminLoading"),
    login: $id("loginScreen"),
    dashboard: $id("dashboardScreen"),
    editor: $id("editorScreen")
  };

  function showScreen(name) {
    Object.keys(screens).forEach(function (k) {
      if (screens[k]) screens[k].hidden = (k !== name);
    });
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  /* ---------- Login ---------- */

  const loginForm = $id("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      const user = $id("loginUser").value.trim();
      const pass = $id("loginPass").value;
      const errEl = $id("loginError");
      const btn = $id("loginSubmit");

      errEl.hidden = true;

      if (!user || !pass) {
        errEl.textContent = t("fillAllFields");
        errEl.hidden = false;
        return;
      }

      btn.disabled = true;
      try {
        const res = await api.login(user, pass);
        setToken(res.token);
        state.admin = res.admin;
        await enterDashboard();
      } catch (err) {
        errEl.textContent =
          err.status === 401 ? t("invalidLogin") : (err.message || "Error");
        errEl.hidden = false;
      } finally {
        btn.disabled = false;
      }
    });
  }

  /* ---------- Sign out ---------- */

  const signOutBtn = $id("signOutBtn");
  if (signOutBtn) {
    signOutBtn.addEventListener("click", function () {
      setToken("");
      state.admin = null;
      state.tests = [];
      state.editing = null;
      $id("loginUser").value = "";
      $id("loginPass").value = "";
      showScreen("login");
    });
  }

  /* ---------- Tabs ---------- */

  const tabTests = $id("tabTests");
  const tabSettings = $id("tabSettings");
  const panelTests = $id("panelTests");
  const panelSettings = $id("panelSettings");

  function setTab(tab) {
    state.currentTab = tab;

    if (tabTests) {
      const active = tab === "tests";
      tabTests.classList.toggle("is-active", active);
      tabTests.setAttribute("aria-selected", String(active));
    }
    if (tabSettings) {
      const active = tab === "settings";
      tabSettings.classList.toggle("is-active", active);
      tabSettings.setAttribute("aria-selected", String(active));
    }
    if (panelTests) panelTests.hidden = tab !== "tests";
    if (panelSettings) panelSettings.hidden = tab !== "settings";

    if (tab === "settings") loadSettings();
  }

  if (tabTests) tabTests.addEventListener("click", function () { setTab("tests"); });
  if (tabSettings) tabSettings.addEventListener("click", function () { setTab("settings"); });

  /* ---------- Enter dashboard ---------- */

  async function enterDashboard() {
    if (!state.admin) return;

    const nameEl = $id("adminDisplayName");
    if (nameEl) nameEl.textContent = state.admin.displayName || "";

    showScreen("dashboard");
    setTab("tests");
    await loadTests();
  }

  /* ---------- Load own tests ---------- */

  async function loadTests() {
    const loading = $id("testsLoading");
    const empty = $id("testsEmpty");
    const list = $id("testsList");

    if (!list) return;

    if (loading) loading.hidden = false;
    if (empty) empty.hidden = true;
    list.hidden = true;
    list.innerHTML = "";

    try {
      const res = await api.listOwn();
      state.tests = Array.isArray(res.tests) ? res.tests : [];
      if (loading) loading.hidden = true;

      if (state.tests.length === 0) {
        if (empty) empty.hidden = false;
        return;
      }

      list.hidden = false;
      state.tests.forEach(function (test) {
        list.appendChild(renderTestCard(test));
      });
    } catch (err) {
      if (loading) loading.hidden = true;
      if (err.status === 401) {
        setToken("");
        showScreen("login");
        return;
      }
      if (empty) {
        empty.hidden = false;
        empty.textContent = err.message || t("loadFailed");
      }
    }
  }

  /* ---------- Test card ---------- */

  function renderTestCard(test) {
    const card = document.createElement("div");
    card.className = "admin-test-card";

    const isPublished = test.status === "published";

    card.innerHTML =
      '<div class="admin-test-info">' +
        '<p class="admin-test-title">' + esc(test.title) + '</p>' +
        '<div class="admin-test-meta">' +
          '<span class="status-badge ' + (isPublished ? "published" : "draft") + '">' +
            esc(isPublished ? t("published") : t("draft")) +
          '</span>' +
          '<span>' + Number(test.questionCount || 0) + " " + esc(t("questionsUnit")) + '</span>' +
          '<span>' + Number(test.minutes || 0) + " " + esc(t("minutesUnit")) + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="admin-test-actions"></div>';

    const actions = card.querySelector(".admin-test-actions");

    if (isPublished) {
      const copyBtn = document.createElement("button");
      copyBtn.type = "button";
      copyBtn.className = "btn btn-sm";
      copyBtn.textContent = t("copyUrl");
      copyBtn.addEventListener("click", function () {
        copyText(publicTestUrl(test.id))
          .then(function () { toast(t("urlCopied"), "success"); })
          .catch(function () { toast("Copy failed", "error"); });
      });
      actions.appendChild(copyBtn);
    }

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "btn btn-sm";
    editBtn.textContent = t("edit");
    editBtn.addEventListener("click", function () {
      openEditor(test.id);
    });
    actions.appendChild(editBtn);

    const publishBtn = document.createElement("button");
    publishBtn.type = "button";
    publishBtn.className = "btn btn-sm" + (isPublished ? "" : " btn-primary");
    publishBtn.textContent = isPublished ? t("unpublish") : t("publish");
    publishBtn.addEventListener("click", async function () {
      publishBtn.disabled = true;
      try {
        if (isPublished) {
          await api.unpublish(test.id);
          toast(t("testUnpublished"));
        } else {
          await api.publish(test.id);
          toast(t("testPublished"), "success");
        }
        await loadTests();
      } catch (err) {
        toast(err.message || "Error", "error");
      } finally {
        publishBtn.disabled = false;
      }
    });
    actions.appendChild(publishBtn);

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "btn btn-sm";
    delBtn.textContent = t("delete");
    delBtn.addEventListener("click", async function () {
      if (!window.confirm(t("confirmDelete"))) return;
      delBtn.disabled = true;
      try {
        await api.deleteTest(test.id);
        toast(t("testDeleted"));
        await loadTests();
      } catch (err) {
        toast(err.message || "Error", "error");
      } finally {
        delBtn.disabled = false;
      }
    });
    actions.appendChild(delBtn);

    return card;
  }

  /* ---------- Settings ---------- */

  async function loadSettings() {
    const input = $id("displayNameInput");
    if (!input) return;

    try {
      const me = await api.me();
      state.admin = me;
      const nameEl = $id("adminDisplayName");
      if (nameEl) nameEl.textContent = me.displayName || "";
      input.value = me.displayName || "";
      const errEl = $id("displayNameError");
      if (errEl) errEl.hidden = true;
    } catch (err) {
      if (err.status === 401) {
        setToken("");
        showScreen("login");
      }
    }
  }

  const settingsForm = $id("settingsForm");
  if (settingsForm) {
    settingsForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      const input = $id("displayNameInput");
      const errEl = $id("displayNameError");
      const btn = $id("saveNameBtn");
      const value = input.value.trim();

      errEl.hidden = true;

      if (!value || value.length < 2) {
        errEl.textContent = t("nameTooShort");
        errEl.hidden = false;
        return;
      }
      if (value.length > 60) {
        errEl.textContent = t("nameTooLong");
        errEl.hidden = false;
        return;
      }

      btn.disabled = true;
      try {
        const res = await api.updateMe(value);
        state.admin = res;
        const nameEl = $id("adminDisplayName");
        if (nameEl) nameEl.textContent = res.displayName;
        toast(t("nameUpdated"), "success");
      } catch (err) {
        errEl.textContent = err.message || "Error";
        errEl.hidden = false;
      } finally {
        btn.disabled = false;
      }
    });
  }

  /* ---------- Editor ---------- */

  const newTestBtn = $id("newTestBtn");
  if (newTestBtn) {
    newTestBtn.addEventListener("click", function () {
      state.editing = {
        id: null,
        status: "draft",
        title: "",
        minutes: 10,
        questions: [blankQuestion()]
      };
      renderEditor();
      showScreen("editor");
    });
  }

  const editorBackBtn = $id("editorBackBtn");
  if (editorBackBtn) {
    editorBackBtn.addEventListener("click", function () {
      state.editing = null;
      showScreen("dashboard");
      loadTests();
    });
  }

  async function openEditor(id) {
    try {
      const res = await api.getOwn(id);
      if (!res || !res.test) throw new Error("Test not found");

      state.editing = {
        id: res.test.id,
        status: res.test.status,
        title: res.test.title,
        minutes: res.test.minutes,
        questions: res.test.questions.map(function (q) {
          return {
            q: q.q,
            options: q.options.slice(),
            answer: q.answer
          };
        })
      };

      renderEditor();
      showScreen("editor");
    } catch (err) {
      toast(err.message || "Error", "error");
    }
  }

  function blankQuestion() {
    return { q: "", options: ["", "", "", ""], answer: 0 };
  }

  function renderEditor() {
    if (!state.editing) return;

    $id("editorHeading").textContent = state.editing.id ? t("edit") : t("newTest");
    $id("editorTitle").value = state.editing.title || "";
    $id("editorMinutes").value = state.editing.minutes || 10;
    $id("editorError").hidden = true;

    renderQuestionsList();
  }

  function renderQuestionsList() {
    const container = $id("questionsContainer");
    if (!container || !state.editing) return;

    container.innerHTML = "";

    state.editing.questions.forEach(function (question, qi) {
      const block = document.createElement("div");
      block.className = "editor-question";

      const head = document.createElement("div");
      head.className = "editor-question-head";

      const num = document.createElement("span");
      num.className = "editor-question-number";
      num.textContent = "Q" + (qi + 1);

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "btn btn-sm";
      removeBtn.textContent = t("removeQuestion");
      removeBtn.addEventListener("click", function () {
        if (state.editing.questions.length <= 1) {
          toast(t("atLeastOneQuestion"), "error");
          return;
        }
        state.editing.questions.splice(qi, 1);
        renderQuestionsList();
      });

      head.appendChild(num);
      head.appendChild(removeBtn);
      block.appendChild(head);

      /* Question text */

      const qField = document.createElement("div");
      qField.className = "form-field";

      const qLabel = document.createElement("label");
      qLabel.className = "form-label";
      qLabel.textContent = t("questionText");

      const qInput = document.createElement("textarea");
      qInput.className = "form-textarea";
      qInput.rows = 2;
      qInput.value = question.q;
      qInput.addEventListener("input", function () {
        question.q = qInput.value;
      });

      qField.appendChild(qLabel);
      qField.appendChild(qInput);
      block.appendChild(qField);

      /* Options */

      const optionsWrap = document.createElement("div");
      optionsWrap.className = "editor-options";

      question.options.forEach(function (_, oi) {
        const row = document.createElement("div");
        row.className = "editor-option" + (question.answer === oi ? " is-answer" : "");

        const key = document.createElement("span");
        key.className = "editor-option-key";
        key.textContent = "ABCD".charAt(oi);

        const input = document.createElement("input");
        input.type = "text";
        input.placeholder = t("optionText") + " " + "ABCD".charAt(oi);
        input.value = question.options[oi];
        input.addEventListener("input", function () {
          question.options[oi] = input.value;
        });

        const answerBtn = document.createElement("button");
        answerBtn.type = "button";
        answerBtn.className = "editor-option-answer-btn";
        answerBtn.textContent = t("correctAnswer");
        answerBtn.addEventListener("click", function () {
          question.answer = oi;
          renderQuestionsList();
        });

        row.appendChild(key);
        row.appendChild(input);
        row.appendChild(answerBtn);
        optionsWrap.appendChild(row);
      });

      block.appendChild(optionsWrap);
      container.appendChild(block);
    });
  }

  const addQuestionBtn = $id("addQuestionBtn");
  if (addQuestionBtn) {
    addQuestionBtn.addEventListener("click", function () {
      state.editing.questions.push(blankQuestion());
      renderQuestionsList();
    });
  }

  /* ---------- Collect + validate editor ---------- */

  function collectEditor() {
    const title = $id("editorTitle").value.trim();
    const minutes = Number($id("editorMinutes").value);

    if (!title) {
      return { error: t("fillAllFields") };
    }
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 180) {
      return { error: t("fillAllFields") };
    }

    const questions = [];

    for (let i = 0; i < state.editing.questions.length; i++) {
      const raw = state.editing.questions[i];
      const cleaned = {
        q: raw.q.trim(),
        options: raw.options.map(function (o) { return o.trim(); }),
        answer: raw.answer
      };

      if (!cleaned.q) {
        return { error: "Q" + (i + 1) + ": " + t("fillAllFields") };
      }
      if (cleaned.options.some(function (o) { return !o; })) {
        return { error: "Q" + (i + 1) + ": " + t("fillAllFields") };
      }
      if (typeof cleaned.answer !== "number" || cleaned.answer < 0 || cleaned.answer > 3) {
        return { error: "Q" + (i + 1) + ": " + t("needAnswer") };
      }

      questions.push(cleaned);
    }

    if (questions.length === 0) {
      return { error: t("atLeastOneQuestion") };
    }

    return { payload: { title: title, minutes: minutes, questions: questions } };
  }

  async function saveEditor(alsoPublish) {
    const errEl = $id("editorError");
    errEl.hidden = true;

    const collected = collectEditor();
    if (collected.error) {
      errEl.textContent = collected.error;
      errEl.hidden = false;
      return;
    }

    const payload = collected.payload;
    const saveDraftBtn = $id("saveDraftBtn");
    const publishBtn = $id("publishBtn");

    saveDraftBtn.disabled = true;
    publishBtn.disabled = true;

    try {
      if (state.editing.id) {
        await api.updateTest(state.editing.id, payload);
        toast(t("testUpdated"));
      } else {
        const created = await api.createTest(payload);
        state.editing.id = created.test.id;
        toast(t("testCreated"));
      }

      if (alsoPublish) {
        await api.publish(state.editing.id);
        toast(t("testPublished"), "success");
      }

      state.editing = null;
      showScreen("dashboard");
      await loadTests();
    } catch (err) {
      errEl.textContent = err.message || "Error";
      errEl.hidden = false;
    } finally {
      saveDraftBtn.disabled = false;
      publishBtn.disabled = false;
    }
  }

  const saveDraftBtn = $id("saveDraftBtn");
  if (saveDraftBtn) {
    saveDraftBtn.addEventListener("click", function () {
      saveEditor(false);
    });
  }

  const publishBtn = $id("publishBtn");
  if (publishBtn) {
    publishBtn.addEventListener("click", function () {
      if (!window.confirm(t("confirmPublish"))) return;
      saveEditor(true);
    });
  }

  /* ---------- Mobile menu ---------- */

  const menuToggle = $id("menuToggle");
  const menuPanel = $id("menuPanel");
  const menuIcon = $id("menuIcon");

  const hamburgerSVG =
    '<path d="M4 7h16"></path><path d="M4 12h16"></path><path d="M4 17h16"></path>';
  const closeSVG =
    '<path d="m6 6 12 12"></path><path d="M18 6 6 18"></path>';

  function closeMenu() {
    if (!menuPanel || !menuToggle || !menuIcon) return;
    menuPanel.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuIcon.innerHTML = hamburgerSVG;
  }

  if (menuToggle && menuPanel && menuIcon) {
    menuToggle.addEventListener("click", function (e) {
      e.stopPropagation();
      if (menuPanel.classList.contains("open")) {
        closeMenu();
      } else {
        menuPanel.classList.add("open");
        menuToggle.setAttribute("aria-expanded", "true");
        menuIcon.innerHTML = closeSVG;
      }
    });

    document.addEventListener("click", function (e) {
      if (
        menuPanel.classList.contains("open") &&
        !menuPanel.contains(e.target) &&
        !menuToggle.contains(e.target)
      ) {
        closeMenu();
      }
    });

    menuPanel.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", closeMenu);
    });
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeMenu();
  });

  /* ---------- Language change ---------- */

  document.addEventListener("pk:langchange", function () {
    if (screens.dashboard && !screens.dashboard.hidden && state.tests.length) {
      const list = $id("testsList");
      if (list) {
        list.innerHTML = "";
        state.tests.forEach(function (test) {
          list.appendChild(renderTestCard(test));
        });
      }
    }

    if (state.editing && screens.editor && !screens.editor.hidden) {
      renderEditor();
    }
  });

  /* ---------- Init ---------- */

  const yearEl = $id("currentYear");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  (async function init() {
    showScreen("loading");

    if (getToken()) {
      try {
        const me = await api.me();
        state.admin = me;
        await enterDashboard();
        return;
      } catch (err) {
        setToken("");
      }
    }

    showScreen("login");
  })();

})();
