// ═══════════════════════════════════════════════════════════
// PrepareKora — Service Worker Registration
// ═══════════════════════════════════════════════════════════

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/preparekora/sw.js", { scope: "/preparekora/" })
      .then((reg) => {
        console.log("[sw] registered", reg.scope);
      })
      .catch((err) => {
        console.warn("[sw] registration failed:", err.message);
      });
  });
}
