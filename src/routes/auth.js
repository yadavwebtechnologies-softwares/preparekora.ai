// ═══════════════════════════════════════════════════════════
// AUTH ROUTES — signup, login, logout, password reset
// Firebase Auth REST API ke through (no SDK)
// ═══════════════════════════════════════════════════════════

import {
  authSignUp,
  authSignIn,
  authSendPasswordReset,
  authVerifyIdToken,
  dbGet,
  dbSet,
  dbUpdate,
} from "../lib/firebase.js";

import {
  jsonResponse,
  errorResponse,
  validateEmail,
  validatePassword,
  validateName,
  readJsonBody,
  requireAuth,
  buildSessionCookie,
  clearSessionCookie,
  rateLimit,
  clientIp,
  handleError,
} from "../lib/security.js";

// ───────────────────────────────────────────────────────────
// USER ID GENERATOR — PK-XXXXXXXX
// ───────────────────────────────────────────────────────────
function generateUserId() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I, O, 0, 1 (avoid confusion)
  let id = "";
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < 8; i++) {
    id += chars[bytes[i] % chars.length];
  }
  return `PK-${id}`;
}

// ───────────────────────────────────────────────────────────
// INITIAL USER PROFILE — created on signup
// ───────────────────────────────────────────────────────────
function buildInitialProfile({ uid, email, displayName, userId }) {
  const now = Date.now();
  return {
    uid,
    userId,
    email,
    displayName,
    plan: "free",
    planActivatedAt: now,
    planExpiresAt: null,
    role: "user",
    createdAt: now,
    updatedAt: now,
    preferences: {
      language: "en",
      notifications: true,
    },
    stats: {
      totalAttempts: 0,
      totalCorrect: 0,
      totalWrong: 0,
    },
    status: "active",
  };
}

// ───────────────────────────────────────────────────────────
// POST /api/auth/signup
// body: { fullName, email, password, confirmPassword }
// ───────────────────────────────────────────────────────────
async function handleSignup(request, env) {
  // Rate limit: 5 signups per IP per 15 min
  const ip = clientIp(request);
  const rl = rateLimit(`signup:${ip}`, 5, 15 * 60 * 1000);
  if (!rl.ok) {
    return errorResponse(
      `Too many signup attempts. Retry in ${rl.retryAfter}s.`,
      429,
      "RATE_LIMITED"
    );
  }

  let body;
  try {
    body = await readJsonBody(request);
  } catch (err) {
    return handleError(err);
  }

  const fullName = (body.fullName || "").trim();
  const email = (body.email || "").trim().toLowerCase();
  const password = body.password || "";
  const confirmPassword = body.confirmPassword || "";

  if (!validateName(fullName)) {
    return errorResponse("Full name must be 2–80 characters.", 400, "INVALID_NAME");
  }
  if (!validateEmail(email)) {
    return errorResponse("Invalid email address.", 400, "INVALID_EMAIL");
  }
  if (!validatePassword(password)) {
    return errorResponse("Password must be 8–128 characters.", 400, "WEAK_PASSWORD");
  }
  if (password !== confirmPassword) {
    return errorResponse("Passwords do not match.", 400, "PASSWORD_MISMATCH");
  }

  // 1. Create Firebase Auth account
  let authData;
  try {
    authData = await authSignUp(env, email, password);
  } catch (err) {
    if (err.code === "EMAIL_EXISTS") {
      return errorResponse("This email is already registered.", 409, "EMAIL_EXISTS");
    }
    if (err.code === "WEAK_PASSWORD") {
      return errorResponse("Password is too weak.", 400, "WEAK_PASSWORD");
    }
    if (err.code === "INVALID_EMAIL") {
      return errorResponse("Invalid email address.", 400, "INVALID_EMAIL");
    }
    console.error("[auth/signup] Firebase error:", err.code || err.message);
    return errorResponse("Signup failed. Please try again.", 500, "SIGNUP_FAILED");
  }

  const uid = authData.localId;
  const idToken = authData.idToken;

  // 2. Generate unique User ID (PK-XXXXXXXX)
  // Retry if collision (very unlikely, but safe)
  let userId = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = generateUserId();
    const existing = await dbGet(env, `userIds/${candidate}`);
    if (!existing) {
      userId = candidate;
      await dbSet(env, `userIds/${candidate}`, uid);
      break;
    }
  }
  if (!userId) {
    console.error("[auth/signup] Failed to generate unique userId");
    // rollback: delete Firebase auth user
    try {
      const { authDeleteUser } = await import("../lib/firebase.js");
      await authDeleteUser(env, uid);
    } catch {}
    return errorResponse("Signup failed. Please try again.", 500, "USERID_COLLISION");
  }

  // 3. Create user profile in Realtime DB
  const profile = buildInitialProfile({
    uid,
    email,
    displayName: fullName,
    userId,
  });

  try {
    await dbSet(env, `users/${uid}`, profile);
  } catch (err) {
    console.error("[auth/signup] DB write failed:", err.message);
    // rollback: delete Firebase auth user
    try {
      const { authDeleteUser } = await import("../lib/firebase.js");
      await authDeleteUser(env, uid);
    } catch {}
    return errorResponse("Signup failed. Please try again.", 500, "DB_WRITE_FAILED");
  }

  // 4. Initialize subscription record
  try {
    await dbSet(env, `subscriptions/${uid}`, {
      plan: "free",
      status: "active",
      activatedAt: Date.now(),
      expiresAt: null,
      history: [],
    });
  } catch (err) {
    console.error("[auth/signup] Subscription init failed:", err.message);
    // non-fatal — continue
  }

  // 5. Create welcome notification
  try {
    const { dbPush } = await import("../lib/firebase.js");
    await dbPush(env, `notifications/${uid}`, {
      type: "welcome",
      title: "Welcome to PrepareKora!",
      message: `Hi ${fullName}, your account is ready. Start with a Forever Free test.`,
      read: false,
      createdAt: Date.now(),
    });
  } catch (err) {
    console.error("[auth/signup] Notification init failed:", err.message);
  }

  // 6. Return success + session cookie
  const cookie = buildSessionCookie(idToken, 3600);
  return new Response(
    JSON.stringify({
      ok: true,
      user: {
        uid,
        userId,
        email,
        displayName: fullName,
        plan: "free",
      },
    }),
    {
      status: 201,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Set-Cookie": cookie,
      },
    }
  );
}

// ───────────────────────────────────────────────────────────
// POST /api/auth/login
// body: { email, password }
// ───────────────────────────────────────────────────────────
async function handleLogin(request, env) {
  const ip = clientIp(request);
  const rl = rateLimit(`login:${ip}`, 10, 15 * 60 * 1000);
  if (!rl.ok) {
    return errorResponse(
      `Too many login attempts. Retry in ${rl.retryAfter}s.`,
      429,
      "RATE_LIMITED"
    );
  }

  let body;
  try {
    body = await readJsonBody(request);
  } catch (err) {
    return handleError(err);
  }

  const email = (body.email || "").trim().toLowerCase();
  const password = body.password || "";

  if (!validateEmail(email) || !password) {
    return errorResponse("Invalid email or password.", 401, "INVALID_CREDENTIALS");
  }

  let authData;
  try {
    authData = await authSignIn(env, email, password);
  } catch (err) {
    if (
      err.code === "EMAIL_NOT_FOUND" ||
      err.code === "INVALID_PASSWORD" ||
      err.code === "INVALID_LOGIN_CREDENTIALS"
    ) {
      return errorResponse("Invalid email or password.", 401, "INVALID_CREDENTIALS");
    }
    if (err.code === "USER_DISABLED") {
      return errorResponse("This account has been disabled.", 403, "ACCOUNT_DISABLED");
    }
    if (err.code === "TOO_MANY_ATTEMPTS_TRY_LATER") {
      return errorResponse("Too many attempts. Try again later.", 429, "FIREBASE_RATE_LIMIT");
    }
    console.error("[auth/login] Firebase error:", err.code || err.message);
    return errorResponse("Login failed. Please try again.", 500, "LOGIN_FAILED");
  }

  // Fetch profile from DB
  let profile;
  try {
    profile = await dbGet(env, `users/${authData.localId}`);
  } catch {
    profile = null;
  }

  if (!profile) {
    // Edge case: auth user exists but DB profile missing — rebuild
    const userId = generateUserId();
    profile = buildInitialProfile({
      uid: authData.localId,
      email,
      displayName: email.split("@")[0],
      userId,
    });
    try {
      await dbSet(env, `users/${authData.localId}`, profile);
      await dbSet(env, `userIds/${userId}`, authData.localId);
    } catch (err) {
      console.error("[auth/login] profile rebuild failed:", err.message);
    }
  }

  if (profile.status === "suspended") {
    return errorResponse("This account has been suspended.", 403, "ACCOUNT_SUSPENDED");
  }

  // Update last login
  try {
    await dbUpdate(env, `users/${authData.localId}`, { lastLoginAt: Date.now() });
  } catch {}

  const cookie = buildSessionCookie(authData.idToken, 3600);
  return new Response(
    JSON.stringify({
      ok: true,
      user: {
        uid: profile.uid,
        userId: profile.userId,
        email: profile.email,
        displayName: profile.displayName,
        plan: profile.plan,
        role: profile.role || "user",
      },
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Set-Cookie": cookie,
      },
    }
  );
}

// ───────────────────────────────────────────────────────────
// POST /api/auth/logout
// Clears session cookie
// ───────────────────────────────────────────────────────────
async function handleLogout(request, env) {
  const cookie = clearSessionCookie();
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Set-Cookie": cookie,
    },
  });
}

// ───────────────────────────────────────────────────────────
// POST /api/auth/forgot-password
// body: { email }
// ───────────────────────────────────────────────────────────
async function handleForgotPassword(request, env) {
  const ip = clientIp(request);
  const rl = rateLimit(`forgot:${ip}`, 3, 15 * 60 * 1000);
  if (!rl.ok) {
    return errorResponse(
      `Too many requests. Retry in ${rl.retryAfter}s.`,
      429,
      "RATE_LIMITED"
    );
  }

  let body;
  try {
    body = await readJsonBody(request);
  } catch (err) {
    return handleError(err);
  }

  const email = (body.email || "").trim().toLowerCase();
  if (!validateEmail(email)) {
    return errorResponse("Invalid email address.", 400, "INVALID_EMAIL");
  }

  try {
    await authSendPasswordReset(env, email);
  } catch (err) {
    // For security: do not reveal whether email exists
    console.warn("[auth/forgot] Firebase error:", err.code || err.message);
  }

  // Always return success (prevent email enumeration)
  return jsonResponse({
    ok: true,
    message:
      "If an account exists with this email, a password reset link has been sent.",
  });
}

// ───────────────────────────────────────────────────────────
// GET /api/auth/me — returns current user profile
// ───────────────────────────────────────────────────────────
async function handleMe(request, env) {
  let auth;
  try {
    auth = await requireAuth(request, env);
  } catch (err) {
    return handleError(err);
  }

  let profile;
  try {
    profile = await dbGet(env, `users/${auth.uid}`);
  } catch {
    profile = null;
  }

  if (!profile) {
    return errorResponse("Profile not found.", 404, "PROFILE_NOT_FOUND");
  }

  return jsonResponse({
    ok: true,
    user: {
      uid: profile.uid,
      userId: profile.userId,
      email: profile.email,
      displayName: profile.displayName,
      plan: profile.plan,
      planExpiresAt: profile.planExpiresAt,
      role: profile.role || "user",
      createdAt: profile.createdAt,
    },
  });
}

// ───────────────────────────────────────────────────────────
// ROUTER
// ───────────────────────────────────────────────────────────
async function handleAuthRoutes(request, env, pathname) {
  const method = request.method;

  if (pathname === "/api/auth/signup" && method === "POST") {
    return handleSignup(request, env);
  }
  if (pathname === "/api/auth/login" && method === "POST") {
    return handleLogin(request, env);
  }
  if (pathname === "/api/auth/logout" && method === "POST") {
    return handleLogout(request, env);
  }
  if (pathname === "/api/auth/forgot-password" && method === "POST") {
    return handleForgotPassword(request, env);
  }
  if (pathname === "/api/auth/me" && method === "GET") {
    return handleMe(request, env);
  }

  return errorResponse("Not found", 404, "NOT_FOUND");
}

export { handleAuthRoutes };
