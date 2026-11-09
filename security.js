// ═══════════════════════════════════════════════════════════
// SECURITY HELPERS — Worker-side
// CORS, auth middleware, admin check, JSON validation
// ═══════════════════════════════════════════════════════════

import { authVerifyIdToken } from "./firebase.js";

// ───────────────────────────────────────────────────────────
// CORS — restrict to approved frontend origins
// ───────────────────────────────────────────────────────────
function buildCorsHeaders(env, origin) {
  const allowed = (env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const isAllowed = origin && allowed.includes(origin);

  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : "null",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function jsonResponse(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...extraHeaders,
    },
  });
}

function errorResponse(message, status = 400, code = null) {
  return jsonResponse({ ok: false, error: message, code: code || message }, status);
}

// ───────────────────────────────────────────────────────────
// INPUT VALIDATION
// ───────────────────────────────────────────────────────────
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(email) {
  if (typeof email !== "string") return false;
  const e = email.trim().toLowerCase();
  return e.length >= 5 && e.length <= 254 && EMAIL_RE.test(e);
}

function validatePassword(password) {
  if (typeof password !== "string") return false;
  return password.length >= 8 && password.length <= 128;
}

function validateName(name) {
  if (typeof name !== "string") return false;
  const n = name.trim();
  return n.length >= 2 && n.length <= 80;
}

function sanitizeString(str, maxLen = 500) {
  if (typeof str !== "string") return "";
  return str.trim().slice(0, maxLen);
}

// ───────────────────────────────────────────────────────────
// BODY SIZE LIMIT (prevent DoS)
// ───────────────────────────────────────────────────────────
async function readJsonBody(request, maxBytes = 100 * 1024) {
  const contentLength = parseInt(request.headers.get("content-length") || "0", 10);
  if (contentLength > maxBytes) {
    throw Object.assign(new Error("PAYLOAD_TOO_LARGE"), { status: 413 });
  }
  const text = await request.text();
  if (text.length > maxBytes) {
    throw Object.assign(new Error("PAYLOAD_TOO_LARGE"), { status: 413 });
  }
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw Object.assign(new Error("INVALID_JSON"), { status: 400 });
  }
}

// ───────────────────────────────────────────────────────────
// AUTH MIDDLEWARE — verifies Firebase ID token from:
//   - Authorization: Bearer <idToken>
//   - OR HttpOnly cookie "pk_session"
// Returns { uid, email, user } on success; throws 401 otherwise
// ───────────────────────────────────────────────────────────
function parseCookies(cookieHeader) {
  const out = {};
  if (!cookieHeader) return out;
  for (const part of cookieHeader.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    out[k] = decodeURIComponent(v);
  }
  return out;
}

async function requireAuth(request, env) {
  const authHeader = request.headers.get("Authorization") || "";
  let idToken = null;

  if (authHeader.startsWith("Bearer ")) {
    idToken = authHeader.slice(7).trim();
  } else {
    const cookies = parseCookies(request.headers.get("Cookie"));
    idToken = cookies["pk_session"] || null;
  }

  if (!idToken) {
    throw Object.assign(new Error("UNAUTHORIZED"), { status: 401 });
  }

  let firebaseUser;
  try {
    firebaseUser = await authVerifyIdToken(env, idToken);
  } catch {
    throw Object.assign(new Error("INVALID_TOKEN"), { status: 401 });
  }

  return {
    uid: firebaseUser.localId,
    email: firebaseUser.email || "",
    firebaseUser,
  };
}

// ───────────────────────────────────────────────────────────
// ADMIN CHECK — UID must be in ADMIN_UID_ALLOWLIST
// ───────────────────────────────────────────────────────────
function isAdminUid(env, uid) {
  const allow = (env.ADMIN_UID_ALLOWLIST || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return allow.includes(uid);
}

async function requireAdmin(request, env) {
  const auth = await requireAuth(request, env);
  if (!isAdminUid(env, auth.uid)) {
    throw Object.assign(new Error("FORBIDDEN_NOT_ADMIN"), { status: 403 });
  }
  return auth;
}

// ───────────────────────────────────────────────────────────
// COOKIE HELPERS
// ───────────────────────────────────────────────────────────
function buildSessionCookie(idToken, maxAgeSeconds = 3600) {
  // HttpOnly; Secure; SameSite=None needed for cross-site GitHub Pages -> Worker
  return [
    `pk_session=${encodeURIComponent(idToken)}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=None",
    `Max-Age=${maxAgeSeconds}`,
  ].join("; ");
}

function clearSessionCookie() {
  return [
    "pk_session=",
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=None",
    "Max-Age=0",
  ].join("; ");
}

// ───────────────────────────────────────────────────────────
// RATE LIMITING (in-memory per isolate; good enough for MVP)
// For production scale: use Cloudflare KV or Durable Objects.
// ───────────────────────────────────────────────────────────
const _rateBuckets = new Map(); // key -> { count, resetAt }

function rateLimit(key, maxReq, windowMs) {
  const now = Date.now();
  const bucket = _rateBuckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    _rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: maxReq - 1 };
  }
  if (bucket.count >= maxReq) {
    return { ok: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  bucket.count += 1;
  return { ok: true, remaining: maxReq - bucket.count };
}

function clientIp(request) {
  return request.headers.get("CF-Connecting-IP") || "unknown";
}

// ───────────────────────────────────────────────────────────
// CENTRAL ERROR HANDLER
// ───────────────────────────────────────────────────────────
function handleError(err) {
  const status = err.status || 500;
  const message =
    status >= 500 ? "Internal server error" : err.message || "Request failed";
  if (status >= 500) console.error("[worker] unhandled:", err);
  return errorResponse(message, status, err.code || null);
}

export {
  buildCorsHeaders,
  jsonResponse,
  errorResponse,
  validateEmail,
  validatePassword,
  validateName,
  sanitizeString,
  readJsonBody,
  requireAuth,
  requireAdmin,
  isAdminUid,
  buildSessionCookie,
  clearSessionCookie,
  rateLimit,
  clientIp,
  handleError,
};
