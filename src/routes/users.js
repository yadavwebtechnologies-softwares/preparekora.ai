// ═══════════════════════════════════════════════════════════
// USER ROUTES — profile, settings, notifications, purchase
// ═══════════════════════════════════════════════════════════

import {
  dbGet,
  dbSet,
  dbUpdate,
  dbPush,
  dbDelete,
  authUpdatePassword,
  authVerifyIdToken,
} from "../lib/firebase.js";

import {
  jsonResponse,
  errorResponse,
  validatePassword,
  validateName,
  sanitizeString,
  readJsonBody,
  requireAuth,
  handleError,
} from "../lib/security.js";

// ───────────────────────────────────────────────────────────
// GET /api/users/profile
// ───────────────────────────────────────────────────────────
async function handleGetProfile(request, env) {
  const auth = await requireAuth(request, env);
  const profile = await dbGet(env, `users/${auth.uid}`);
  if (!profile) return errorResponse("Profile not found.", 404, "PROFILE_NOT_FOUND");

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
      preferences: profile.preferences || { language: "en", notifications: true },
      stats: profile.stats || { totalAttempts: 0, totalCorrect: 0, totalWrong: 0 },
    },
  });
}

// ───────────────────────────────────────────────────────────
// PATCH /api/users/profile
// body: { displayName?, preferences? }
// ───────────────────────────────────────────────────────────
async function handleUpdateProfile(request, env) {
  const auth = await requireAuth(request, env);
  const body = await readJsonBody(request);

  const updates = { updatedAt: Date.now() };

  if (body.displayName !== undefined) {
    if (!validateName(body.displayName)) {
      return errorResponse("Display name must be 2–80 characters.", 400, "INVALID_NAME");
    }
    updates.displayName = body.displayName.trim();
  }

  if (body.preferences !== undefined) {
    const prefs = body.preferences || {};
    updates.preferences = {
      language: ["en", "as"].includes(prefs.language) ? prefs.language : "en",
      notifications: prefs.notifications !== false,
    };
  }

  await dbUpdate(env, `users/${auth.uid}`, updates);

  return jsonResponse({ ok: true, message: "Profile updated." });
}

// ───────────────────────────────────────────────────────────
// POST /api/users/change-password
// body: { oldPassword, newPassword, confirmPassword }
// Verifies old password by re-signing in via Firebase
// ───────────────────────────────────────────────────────────
async function handleChangePassword(request, env) {
  const auth = await requireAuth(request, env);
  const body = await readJsonBody(request);

  const oldPassword = body.oldPassword || "";
  const newPassword = body.newPassword || "";
  const confirmPassword = body.confirmPassword || "";

  if (!validatePassword(newPassword)) {
    return errorResponse("New password must be 8–128 characters.", 400, "WEAK_PASSWORD");
  }
  if (newPassword !== confirmPassword) {
    return errorResponse("Passwords do not match.", 400, "PASSWORD_MISMATCH");
  }

  // Re-authenticate with old password
  try {
    const { authSignIn } = await import("../lib/firebase.js");
    await authSignIn(env, auth.email, oldPassword);
  } catch {
    return errorResponse("Current password is incorrect.", 401, "WRONG_PASSWORD");
  }

  // Update password using current ID token (from Authorization header)
  const authHeader = request.headers.get("Authorization") || "";
  let idToken = null;
  if (authHeader.startsWith("Bearer ")) {
    idToken = authHeader.slice(7).trim();
  }
  if (!idToken) {
    return errorResponse("Session expired. Please log in again.", 401, "NO_TOKEN");
  }

  try {
    await authUpdatePassword(env, idToken, newPassword);
  } catch (err) {
    console.error("[users/change-password] error:", err.code || err.message);
    return errorResponse("Password update failed.", 500, "UPDATE_FAILED");
  }

  return jsonResponse({ ok: true, message: "Password changed successfully." });
}

// ───────────────────────────────────────────────────────────
// GET /api/users/notifications
// returns list of user notifications
// ───────────────────────────────────────────────────────────
async function handleGetNotifications(request, env) {
  const auth = await requireAuth(request, env);
  const data = (await dbGet(env, `notifications/${auth.uid}`)) || {};

  const notifications = Object.entries(data).map(([id, n]) => ({
    id,
    ...n,
  }));
  notifications.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  const unreadCount = notifications.filter((n) => !n.read).length;

  return jsonResponse({ ok: true, notifications, unreadCount });
}

// ───────────────────────────────────────────────────────────
// POST /api/users/notifications/:id/read
// ───────────────────────────────────────────────────────────
async function handleMarkNotificationRead(request, env, notifId) {
  const auth = await requireAuth(request, env);
  await dbUpdate(env, `notifications/${auth.uid}/${notifId}`, { read: true });
  return jsonResponse({ ok: true });
}

// ───────────────────────────────────────────────────────────
// POST /api/users/notifications/read-all
// ───────────────────────────────────────────────────────────
async function handleMarkAllRead(request, env) {
  const auth = await requireAuth(request, env);
  const data = (await dbGet(env, `notifications/${auth.uid}`)) || {};
  const updates = {};
  for (const id of Object.keys(data)) {
    updates[`${id}/read`] = true;
  }
  if (Object.keys(updates).length > 0) {
    await dbUpdate(env, `notifications/${auth.uid}`, updates);
  }
  return jsonResponse({ ok: true });
}

// ───────────────────────────────────────────────────────────
// GET /api/users/subscription
// ───────────────────────────────────────────────────────────
async function handleGetSubscription(request, env) {
  const auth = await requireAuth(request, env);
  const sub = (await dbGet(env, `subscriptions/${auth.uid}`)) || null;
  const profile = await dbGet(env, `users/${auth.uid}`);

  return jsonResponse({
    ok: true,
    subscription: sub || {
      plan: profile?.plan || "free",
      status: "active",
      activatedAt: profile?.createdAt || Date.now(),
      expiresAt: null,
    },
  });
}

// ───────────────────────────────────────────────────────────
// POST /api/users/purchase-request
// body: { plan } — plan ∈ {basic, standard, premium}
// Creates a purchase request + returns WhatsApp URL
// ───────────────────────────────────────────────────────────
async function handleCreatePurchaseRequest(request, env) {
  const auth = await requireAuth(request, env);
  const body = await readJsonBody(request);
  const plan = String(body.plan || "").toLowerCase();

  if (!["basic", "standard", "premium"].includes(plan)) {
    return errorResponse("Invalid plan.", 400, "INVALID_PLAN");
  }

  // Get profile for user details
  const profile = await dbGet(env, `users/${auth.uid}`);
  if (!profile) return errorResponse("Profile not found.", 404, "PROFILE_NOT_FOUND");

  // Load plan config from global settings
  const settings = (await dbGet(env, "globalSettings")) || {};
  const plans = settings.plans || {
    basic:    { name: "Basic",    price: 19,  days: 7  },
    standard: { name: "Standard", price: 49,  days: 15 },
    premium:  { name: "Premium",  price: 99,  days: 30 },
  };
  const planConfig = plans[plan];

  // Generate unique Purchase Request ID
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  let prId = "PR-";
  for (let i = 0; i < 8; i++) prId += chars[bytes[i] % chars.length];

  const now = Date.now();
  const requestData = {
    requestId: prId,
    uid: auth.uid,
    userId: profile.userId,
    email: profile.email,
    displayName: profile.displayName,
    plan,
    planName: planConfig.name,
    price: planConfig.price,
    validityDays: planConfig.days,
    paymentStatus: "pending",
    subscriptionStatus: "inactive",
    transactionRef: "",
    adminUid: null,
    activationDate: null,
    expiryDate: null,
    createdAt: now,
  };

  await dbSet(env, `purchaseRequests/${prId}`, requestData);

  // Push admin notification
  try {
    await dbPush(env, "adminNotifications", {
      type: "purchase_request",
      title: "New Purchase Request",
      message: `${profile.displayName} (${profile.userId}) requested ${planConfig.name} plan — ₹${planConfig.price}`,
      requestId: prId,
      read: false,
      createdAt: now,
    });
  } catch {}

  // Build WhatsApp URL
  const waNumber = (settings.whatsappNumber || "").replace(/\D/g, "");
  const message =
    `Hello PrepareKora Team,\n\n` +
    `I want to purchase the ${planConfig.name} Plan.\n\n` +
    `Plan: ${planConfig.name}\n` +
    `Price: ₹${planConfig.price}\n` +
    `Validity: ${planConfig.days} Days\n\n` +
    `User ID: ${profile.userId}\n` +
    `Registered Email: ${profile.email}\n` +
    `Purchase Request ID: ${prId}\n\n` +
    `Please share the payment details and activation process.`;

  const whatsappUrl = waNumber
    ? `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`
    : null;

  return jsonResponse({
    ok: true,
    requestId: prId,
    whatsappUrl,
    message:
      "Purchase request created. Please complete the WhatsApp conversation to activate your plan.",
  });
}

// ───────────────────────────────────────────────────────────
// GET /api/users/purchase-history
// ───────────────────────────────────────────────────────────
async function handleGetPurchaseHistory(request, env) {
  const auth = await requireAuth(request, env);
  const all = (await dbGet(env, "purchaseRequests")) || {};
  const list = Object.entries(all)
    .filter(([, r]) => r.uid === auth.uid)
    .map(([id, r]) => ({ id, ...r }))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  return jsonResponse({ ok: true, purchases: list });
}

// ───────────────────────────────────────────────────────────
// GET /api/users/test-history
// returns user's test attempts (all types)
// ───────────────────────────────────────────────────────────
async function handleGetTestHistory(request, env) {
  const auth = await requireAuth(request, env);
  const data = (await dbGet(env, `testAttempts/${auth.uid}`)) || {};

  const list = Object.entries(data)
    .map(([id, a]) => ({
      id,
      testTitle: a.testTitle,
      subject: a.subject,
      testType: a.testType, // "forever-free" | "homepage-paid" | "daily"
      attemptedAt: a.attemptedAt,
      score: a.score,
      totalMarks: a.totalMarks,
      percentage: a.percentage,
      timeTaken: a.timeTaken,
      slot: a.slot || null,
    }))
    .sort((a, b) => (b.attemptedAt || 0) - (a.attemptedAt || 0));

  return jsonResponse({ ok: true, attempts: list });
}

// ───────────────────────────────────────────────────────────
// GET /api/users/test-attempt/:attemptId
// returns full attempt details + question-wise review
// ───────────────────────────────────────────────────────────
async function handleGetAttemptDetails(request, env, attemptId) {
  const auth = await requireAuth(request, env);
  const attempt = await dbGet(env, `testAttempts/${auth.uid}/${attemptId}`);
  if (!attempt) return errorResponse("Attempt not found.", 404, "NOT_FOUND");

  return jsonResponse({ ok: true, attempt });
}

// ───────────────────────────────────────────────────────────
// POST /api/users/support
// body: { subject, message }
// ───────────────────────────────────────────────────────────
async function handleCreateSupportRequest(request, env) {
  const auth = await requireAuth(request, env);
  const body = await readJsonBody(request);

  const subject = sanitizeString(body.subject, 200);
  const message = sanitizeString(body.message, 2000);

  if (subject.length < 3) {
    return errorResponse("Subject too short.", 400, "INVALID_SUBJECT");
  }
  if (message.length < 10) {
    return errorResponse("Please describe the issue in more detail.", 400, "INVALID_MESSAGE");
  }

  const profile = await dbGet(env, `users/${auth.uid}`);

  const supportData = {
    uid: auth.uid,
    userId: profile?.userId || "",
    email: profile?.email || auth.email,
    displayName: profile?.displayName || "",
    subject,
    message,
    status: "pending",
    createdAt: Date.now(),
  };

  const ref = await dbPush(env, "supportRequests", supportData);

  // Notify admin
  try {
    await dbPush(env, "adminNotifications", {
      type: "support_request",
      title: "New Support Request",
      message: `${profile?.displayName || auth.email}: ${subject}`,
      supportId: ref?.name || "",
      read: false,
      createdAt: Date.now(),
    });
  } catch {}

  return jsonResponse({ ok: true, message: "Support request submitted." });
}

// ───────────────────────────────────────────────────────────
// POST /api/users/delete-account
// body: { confirm: "DELETE", password }
// ───────────────────────────────────────────────────────────
async function handleDeleteAccount(request, env) {
  const auth = await requireAuth(request, env);
  const body = await readJsonBody(request);

  if (body.confirm !== "DELETE") {
    return errorResponse("Please confirm by typing DELETE.", 400, "NOT_CONFIRMED");
  }
  if (!body.password) {
    return errorResponse("Password required.", 400, "PASSWORD_REQUIRED");
  }

  // Verify password
  try {
    const { authSignIn } = await import("../lib/firebase.js");
    await authSignIn(env, auth.email, body.password);
  } catch {
    return errorResponse("Incorrect password.", 401, "WRONG_PASSWORD");
  }

  // Load profile for record keeping
  const profile = await dbGet(env, `users/${auth.uid}`);

  // Anonymize user data (retain financial records)
  try {
    await dbUpdate(env, `users/${auth.uid}`, {
      status: "deleted",
      deletedAt: Date.now(),
      email: `deleted-${auth.uid}@preparekora.local`,
      displayName: "Deleted User",
    });
  } catch {}

  // Delete Firebase auth user
  try {
    const { authDeleteUser } = await import("../lib/firebase.js");
    await authDeleteUser(env, auth.uid);
  } catch (err) {
    console.error("[users/delete-account] Firebase delete failed:", err.message);
  }

  // Record in security events
  try {
    await dbPush(env, "securityEvents", {
      type: "account_deleted",
      uid: auth.uid,
      userId: profile?.userId || "",
      at: Date.now(),
    });
  } catch {}

  const cookie = [
    "pk_session=",
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=None",
    "Max-Age=0",
  ].join("; ");

  return new Response(
    JSON.stringify({ ok: true, message: "Account deleted." }),
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
// ROUTER
// ───────────────────────────────────────────────────────────
async function handleUserRoutes(request, env, pathname) {
  const method = request.method;

  try {
    if (pathname === "/api/users/profile" && method === "GET")
      return await handleGetProfile(request, env);

    if (pathname === "/api/users/profile" && method === "PATCH")
      return await handleUpdateProfile(request, env);

    if (pathname === "/api/users/change-password" && method === "POST")
      return await handleChangePassword(request, env);

    if (pathname === "/api/users/notifications" && method === "GET")
      return await handleGetNotifications(request, env);

    if (pathname === "/api/users/notifications/read-all" && method === "POST")
      return await handleMarkAllRead(request, env);

    if (pathname.match(/^\/api\/users\/notifications\/[^/]+\/read$/) && method === "POST") {
      const id = pathname.split("/")[4];
      return await handleMarkNotificationRead(request, env, id);
    }

    if (pathname === "/api/users/subscription" && method === "GET")
      return await handleGetSubscription(request, env);

    if (pathname === "/api/users/purchase-request" && method === "POST")
      return await handleCreatePurchaseRequest(request, env);

    if (pathname === "/api/users/purchase-history" && method === "GET")
      return await handleGetPurchaseHistory(request, env);

    if (pathname === "/api/users/test-history" && method === "GET")
      return await handleGetTestHistory(request, env);

    if (pathname.match(/^\/api\/users\/test-attempt\/[^/]+$/) && method === "GET") {
      const id = pathname.split("/")[4];
      return await handleGetAttemptDetails(request, env, id);
    }

    if (pathname === "/api/users/support" && method === "POST")
      return await handleCreateSupportRequest(request, env);

    if (pathname === "/api/users/delete-account" && method === "POST")
      return await handleDeleteAccount(request, env);

    return errorResponse("Not found", 404, "NOT_FOUND");
  } catch (err) {
    return handleError(err);
  }
}

export { handleUserRoutes };
