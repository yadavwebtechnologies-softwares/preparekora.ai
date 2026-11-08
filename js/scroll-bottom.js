"use strict";

(function () {

  let jsonImportedInThisEditor = false;

  function createButton() {
    if (document.getElementById("scrollBottomBtn")) return;
    const btn = document.createElement("button");
    btn.id = "scrollBottomBtn";
    btn.type = "button";
    btn.className = "icon-button scroll-bottom-btn";
    btn.setAttribute("aria-label", "Go to bottom");
    btn.setAttribute("title", "Go to bottom");
    btn.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true">' +
        '<path d="M12 5v14"></path>' +
        '<polyline points="19 12 12 19 5 12"></polyline>' +
      '</svg>';
    document.body.appendChild(btn);

    btn.addEventListener("click", function () {
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    });
  }

  function updateVisibility() {
    const btn = document.getElementById("scrollBottomBtn");
    if (!btn) return;

    const editor = document.getElementById("editorScreen");
    const inEditor = editor && !editor.hidden;

    if (!inEditor || !jsonImportedInThisEditor) {
      btn.classList.remove("is-visible");
      return;
    }

    btn.classList.add("is-visible");
  }

  function watchImport() {
    const container = document.getElementById("questionsContainer");
    if (!container || !window.MutationObserver) return;

    let lastCount = 0;
    new MutationObserver(function () {
      const currentCount = container.querySelectorAll(".editor-question").length;
      if (currentCount > lastCount && currentCount > 1) {
        jsonImportedInThisEditor = true;
        updateVisibility();
      }
      lastCount = currentCount;
    }).observe(container, { childList: true });
  }

  function watchEditorScreen() {
    const editor = document.getElementById("editorScreen");
    if (!editor || !window.MutationObserver) return;

    let wasHidden = editor.hidden;
    new MutationObserver(function () {
      const nowHidden = editor.hidden;
      if (nowHidden && !wasHidden) {
        jsonImportedInThisEditor = false;
        updateVisibility();
      }
      wasHidden = nowHidden;
    }).observe(editor, { attributes: true, attributeFilter: ["hidden"] });
  }

  function init() {
    createButton();
    watchImport();
    watchEditorScreen();
    updateVisibility();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
