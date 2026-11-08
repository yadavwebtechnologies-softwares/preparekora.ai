"use strict";

/*
  PrepareKora — Runtime configuration.
  Worker URL is public (not a secret). Safe to commit.
  Update this one line if the Worker URL ever changes.
*/

(function () {
  const host = window.location.hostname;

  const isLocal =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    host === "" ||
    host.endsWith(".local");

  const PROD_API_BASE = "https://preparekora-api.yadavsubba2003.workers.dev/api";

  window.PK_CONFIG = Object.freeze({
    API_BASE: isLocal ? "http://localhost:8787/api" : PROD_API_BASE,
    IS_LOCAL: isLocal,
    APP_NAME: "PrepareKora.in",
    VERSION: "1.0.0"
  });
})();
