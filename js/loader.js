"use strict";

(function () {
  if (!document.getElementById("pk-loader-styles")) {
    const style = document.createElement("style");
    style.id = "pk-loader-styles";
    style.textContent =
      ".pk-loader{" +
        "position:fixed;inset:0;z-index:240;" +
        "display:flex;align-items:center;justify-content:center;" +
        "background:rgba(255,255,255,0.55);" +
        "backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);" +
        "opacity:0;transition:opacity 0.28s ease;pointer-events:none;" +
      "}" +
      ".pk-loader.is-visible{opacity:1;pointer-events:auto;}" +
      ".pk-loader .spinner{" +
        "width:32px;height:32px;" +
        "border:2.5px solid var(--border);border-top-color:var(--accent);" +
        "border-radius:50%;animation:pk-loader-spin 0.7s linear infinite;" +
      "}" +
      "@keyframes pk-loader-spin{to{transform:rotate(360deg);}}";
    document.head.appendChild(style);
  }

  let el = null;
  let hideTimer = null;
  let startTime = 0;
  const MIN_DURATION = 350;

  function ensure() {
    if (el && el.parentNode) return el;
    el = document.createElement("div");
    el.className = "pk-loader";
    el.setAttribute("role", "status");
    el.setAttribute("aria-live", "polite");
    el.innerHTML = '<div class="spinner" aria-hidden="true"></div>';
    document.body.appendChild(el);
    return el;
  }

  function show() {
    const overlay = ensure();
    if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
    startTime = Date.now();
    void overlay.offsetWidth;
    overlay.classList.add("is-visible");
  }

  function hide() {
    if (!el) return;
    const elapsed = Date.now() - startTime;
    const remaining = Math.max(0, MIN_DURATION - elapsed);
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(function () {
      if (el) el.classList.remove("is-visible");
      hideTimer = null;
    }, remaining);
  }

  window.PKLoader = { show: show, hide: hide };
})();
