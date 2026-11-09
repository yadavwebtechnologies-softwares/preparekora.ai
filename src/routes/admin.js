// ═══════════════════════════════════════════════════════════
// ADMIN ROUTES — all admin-only operations
// Every route requires ADMIN_UID_ALLOWLIST match
// ═══════════════════════════════════════════════════════════

import {
  dbGet,
  dbSet,
  dbUpdate,
  dbPush,
  dbDelete,
} from "../lib/firebase.js";

import {
  jsonResponse,
  errorResponse,
  readJsonBody,
  requireAdmin,
  sanitizeString,
  handleError,
} from "../lib/security.js";

// ───────────────────────────────────────────────────────────
// HELPERS
// ───────────────────────────────────────────────────────────
function slugify(str) {
  return String(str || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function logAdminActivity(env, adminUid, action, details = {}) {
  try {
    await dbPush(env, "adminActivityLogs", {
      adminUid,
      action,
      details,
      at: Date.now(),
    });
  } catch {}
}

// ═══════════════════════════════════════════════════════════
// DASHBOARD STATS
// ═══════════════════════════════════════════════════════════
async function handleGetDashboardStats(request, env) {
  const admin = await requireAdmin(request, env);

  const [users, subjects, questions, hpTests, dailyTests, purchases] =
    await Promise.all([
      dbGet(env, "users"),
      dbGet(env, "subjects"),
      dbGet(env, "questionBank"),
      dbGet(env, "homepageTests"),
      dbGet(env, "dailyTests"),
      dbGet(env, "purchaseRequests"),
    ]);

  const userList = Object.values(users || {});
  const purchaseList = Object.values(purchases || {});
  const questionCount = Object.values(questions || {}).reduce(
    (sum, subj) => sum + Object.keys(subj || {}).length,
    0
  );

  let dailyCount = 0;
  for (const date of Object.values(dailyTests || {})) {
    dailyCount += Object.keys(date || {}).length;
  }

  return jsonResponse({
    ok: true,
    stats: {
      totalUsers: userList.length,
      activeUsers: userList.filter((u) => u.status !== "suspended" && u.status !== "deleted").length,
      totalSubjects: Object.keys(subjects || {}).length,
      totalQuestions: questionCount,
      totalHomepageTests: Object.keys(hpTests || {}).length,
      totalDailyTests: dailyCount,
      pendingPurchases: purchaseList.filter((p) => p.paymentStatus === "pending").length,
      activeSubscriptions: userList.filter(
        (u) => u.plan && u.plan !== "free" && (!u.planExpiresAt || u.planExpiresAt > Date.now())
      ).length,
    },
  });
}

// ═══════════════════════════════════════════════════════════
// SUBJECTS
// ═══════════════════════════════════════════════════════════
async function handleListSubjects(request, env) {
  await requireAdmin(request, env);
  const data = (await dbGet(env, "subjects")) || {};
  const subjects = Object.entries(data).map(([id, s]) => ({ id, ...s }));
  return jsonResponse({ ok: true, subjects });
}

async function handleCreateSubject(request, env) {
  const admin = await requireAdmin(request, env);
  const body = await readJsonBody(request);

  const name = sanitizeString(body.name, 100);
  const nameAs = sanitizeString(body.nameAs, 100);
  const description = sanitizeString(body.description, 500);

  if (name.length < 2) return errorResponse("Subject name required.", 400, "INVALID_NAME");

  const subjectId = slugify(name);
  const existing = await dbGet(env, `subjects/${subjectId}`);
  if (existing) return errorResponse("Subject already exists.", 409, "DUPLICATE");

  const subject = {
    subjectId,
    name,
    nameAs: nameAs || name,
    description,
    active: true,
    hasForeverFree: false,
    createdAt: Date.now(),
    createdBy: admin.uid,
  };

  await dbSet(env, `subjects/${subjectId}`, subject);
  await logAdminActivity(env, admin.uid, "subject_created", { subjectId });

  return jsonResponse({ ok: true, subject });
}

async function handleUpdateSubject(request, env, subjectId) {
  const admin = await requireAdmin(request, env);
  const body = await readJsonBody(request);
  const existing = await dbGet(env, `subjects/${subjectId}`);
  if (!existing) return errorResponse("Subject not found.", 404, "NOT_FOUND");

  const updates = { updatedAt: Date.now() };
  if (body.name) updates.name = sanitizeString(body.name, 100);
  if (body.nameAs !== undefined) updates.nameAs = sanitizeString(body.nameAs, 100);
  if (body.description !== undefined) updates.description = sanitizeString(body.description, 500);
  if (body.active !== undefined) updates.active = !!body.active;

  await dbUpdate(env, `subjects/${subjectId}`, updates);
  await logAdminActivity(env, admin.uid, "subject_updated", { subjectId });
  return jsonResponse({ ok: true });
}

async function handleDeleteSubject(request, env, subjectId) {
  const admin = await requireAdmin(request, env);
  await dbUpdate(env, `subjects/${subjectId}`, {
    active: false,
    archivedAt: Date.now(),
  });
  await logAdminActivity(env, admin.uid, "subject_archived", { subjectId });
  return jsonResponse({ ok: true });
}

// ═══════════════════════════════════════════════════════════
// QUESTION BANK
// ═══════════════════════════════════════════════════════════
async function handleListQuestions(request, env, subjectId) {
  await requireAdmin(request, env);
  const data = (await dbGet(env, `questionBank/${subjectId}`)) || {};
  const questions = Object.entries(data).map(([id, q]) => ({ id, ...q }));
  return jsonResponse({ ok: true, questions });
}

async function handleCreateQuestion(request, env, subjectId) {
  const admin = await requireAdmin(request, env);
  const body = await readJsonBody(request);

  const q = body.question;
  if (!q || !q.question?.en || !Array.isArray(q.options) || q.options.length < 2) {
    return errorResponse("Invalid question data.", 400, "INVALID_QUESTION");
  }
  if (!q.options.find((o) => o.id === q.correctOptionId)) {
    return errorResponse("Correct option must match an option ID.", 400, "INVALID_CORRECT");
  }

  const externalId = q.externalId || `${subjectId.toUpperCase()}-${Date.now()}`;
  const questionData = {
    externalId,
    question: q.question,
    options: q.options,
    correctOptionId: q.correctOptionId,
    marks: q.marks || 1,
    difficulty: q.difficulty || "medium",
    explanation: q.explanation || { en: "", as: "" },
    explanationStatus: q.explanation?.en ? "pending-review" : "missing",
    tags: q.tags || [],
    active: true,
    createdAt: Date.now(),
    createdBy: admin.uid,
  };

  await dbSet(env, `questionBank/${subjectId}/${externalId}`, questionData);
  await logAdminActivity(env, admin.uid, "question_created", { subjectId, externalId });

  return jsonResponse({ ok: true, question: { id: externalId, ...questionData } });
}

async function handleUpdateQuestion(request, env, subjectId, questionId) {
  const admin = await requireAdmin(request, env);
  const body = await readJsonBody(request);

  const existing = await dbGet(env, `questionBank/${subjectId}/${questionId}`);
  if (!existing) return errorResponse("Question not found.", 404, "NOT_FOUND");

  const updates = { updatedAt: Date.now(), updatedBy: admin.uid };
  if (body.question) updates.question = body.question;
  if (body.options) updates.options = body.options;
  if (body.correctOptionId) updates.correctOptionId = body.correctOptionId;
  if (body.marks !== undefined) updates.marks = body.marks;
  if (body.difficulty) updates.difficulty = body.difficulty;
  if (body.explanation) {
    updates.explanation = body.explanation;
    updates.explanationStatus = body.explanation.en ? "pending-review" : "missing";
  }
  if (body.tags) updates.tags = body.tags;
  if (body.active !== undefined) updates.active = !!body.active;

  await dbUpdate(env, `questionBank/${subjectId}/${questionId}`, updates);
  await logAdminActivity(env, admin.uid, "question_updated", { subjectId, questionId });
  return jsonResponse({ ok: true });
}

async function handleDeleteQuestion(request, env, subjectId, questionId) {
  const admin = await requireAdmin(request, env);
  await dbUpdate(env, `questionBank/${subjectId}/${questionId}`, {
    active: false,
    archivedAt: Date.now(),
  });
  await logAdminActivity(env, admin.uid, "question_archived", { subjectId, questionId });
  return jsonResponse({ ok: true });
}

// ───────────────────────────────────────────────────────────
// Bulk import (JSON)
// ───────────────────────────────────────────────────────────
async function handleImportQuestions(request, env, subjectId) {
  const admin = await requireAdmin(request, env);
  const body = await readJsonBody(request, 5 * 1024 * 1024); // 5 MB max

  const incoming = body.questions;
  if (!Array.isArray(incoming) || incoming.length === 0) {
    return errorResponse("questions array required.", 400, "INVALID_IMPORT");
  }

  const existing = (await dbGet(env, `questionBank/${subjectId}`)) || {};
  const existingIds = new Set(Object.keys(existing));

  const accepted = [];
  const rejected = [];

  for (const q of incoming) {
    if (!q.externalId) { rejected.push({ q, reason: "missing externalId" }); continue; }
    if (!q.question?.en) { rejected.push({ q, reason: "missing English question" }); continue; }
    if (!Array.isArray(q.options) || q.options.length < 2) {
      rejected.push({ q, reason: "invalid options" }); continue;
    }
    if (!q.options.find((o) => o.id === q.correctOptionId)) {
      rejected.push({ q, reason: "correctOptionId invalid" }); continue;
    }
    if (existingIds.has(q.externalId)) {
      rejected.push({ q, reason: "duplicate externalId" }); continue;
    }
    accepted.push(q);
  }

  // Write accepted
  const writes = {};
  for (const q of accepted) {
    writes[q.externalId] = {
      externalId: q.externalId,
      question: q.question,
      options: q.options,
      correctOptionId: q.correctOptionId,
      marks: q.marks || 1,
      difficulty: q.difficulty || "medium",
      explanation: q.explanation || { en: "", as: "" },
      explanationStatus: q.explanation?.en ? "pending-review" : "missing",
      tags: q.tags || [],
      active: true,
      createdAt: Date.now(),
      createdBy: admin.uid,
    };
  }

  if (Object.keys(writes).length > 0) {
    await dbUpdate(env, `questionBank/${subjectId}`, writes);
  }

  await logAdminActivity(env, admin.uid, "questions_imported", {
    subjectId,
    accepted: accepted.length,
    rejected: rejected.length,
  });

  return jsonResponse({
    ok: true,
    accepted: accepted.length,
    rejected: rejected.length,
    rejectedDetails: rejected.slice(0, 50),
  });
}

// ═══════════════════════════════════════════════════════════
// HOMEPAGE TESTS
// ═══════════════════════════════════════════════════════════
async function handleListHomepageTests(request, env) {
  await requireAdmin(request, env);
  const data = (await dbGet(env, "homepageTests")) || {};
  const tests = Object.entries(data).map(([id, t]) => ({ id, ...t }));
  return jsonResponse({ ok: true, tests });
}

async function handleCreateHomepageTest(request, env) {
  const admin = await requireAdmin(request, env);
  const body = await readJsonBody(request);

  const title = sanitizeString(body.title, 150);
  const subjectId = sanitizeString(body.subjectId, 50);
  if (title.length < 3) return errorResponse("Title required.", 400, "INVALID_TITLE");
  if (!subjectId) return errorResponse("Subject required.", 400, "INVALID_SUBJECT");

  const testId = `HPT-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const questions = Array.isArray(body.questions) ? body.questions : [];

  const test = {
    testId,
    title,
    subjectId,
    subjectName: sanitizeString(body.subjectName, 100),
    duration: Number(body.duration) || 30,
    totalMarks: questions.reduce((s, q) => s + (q.marks || 1), 0),
    negativeMarking: Number(body.negativeMarking) || 0.25,
    questions,
    status: body.status === "published" ? "published" : "draft",
    createdAt: Date.now(),
    createdBy: admin.uid,
    publishedAt: body.status === "published" ? Date.now() : null,
    isPaid: body.isPaid !== false, // default paid
  };

  await dbSet(env, `homepageTests/${testId}`, test);
  await logAdminActivity(env, admin.uid, "homepage_test_created", { testId });

  return jsonResponse({ ok: true, test });
}

async function handleUpdateHomepageTest(request, env, testId) {
  const admin = await requireAdmin(request, env);
  const existing = await dbGet(env, `homepageTests/${testId}`);
  if (!existing) return errorResponse("Test not found.", 404, "NOT_FOUND");
  if (existing.createdBy !== admin.uid) {
    return errorResponse("You can only edit your own tests.", 403, "OWNERSHIP_VIOLATION");
  }

  const body = await readJsonBody(request);
  const updates = { updatedAt: Date.now() };
  if (body.title) updates.title = sanitizeString(body.title, 150);
  if (body.duration) updates.duration = Number(body.duration);
  if (body.questions) {
    updates.questions = body.questions;
    updates.totalMarks = body.questions.reduce((s, q) => s + (q.marks || 1), 0);
  }
  if (body.status) {
    updates.status = body.status;
    if (body.status === "published" && !existing.publishedAt) {
      updates.publishedAt = Date.now();
    }
  }

  await dbUpdate(env, `homepageTests/${testId}`, updates);
  await logAdminActivity(env, admin.uid, "homepage_test_updated", { testId });
  return jsonResponse({ ok: true });
}

async function handleDeleteHomepageTest(request, env, testId) {
  const admin = await requireAdmin(request, env);
  const existing = await dbGet(env, `homepageTests/${testId}`);
  if (!existing) return errorResponse("Test not found.", 404, "NOT_FOUND");
  if (existing.createdBy !== admin.uid) {
    return errorResponse("You can only delete your own tests.", 403, "OWNERSHIP_VIOLATION");
  }
  await dbDelete(env, `homepageTests/${testId}`);
  await logAdminActivity(env, admin.uid, "homepage_test_deleted", { testId });
  return jsonResponse({ ok: true });
}

// ═══════════════════════════════════════════════════════════
// FOREVER FREE TESTS
// ═══════════════════════════════════════════════════════════
async function handleListForeverFree(request, env) {
  await requireAdmin(request, env);
  const data = (await dbGet(env, "foreverFreeTests")) || {};
  const tests = Object.entries(data).map(([subjectId, t]) => ({ subjectId, ...t }));
  return jsonResponse({ ok: true, tests });
}

async function handleSetForeverFree(request, env, subjectId) {
  const admin = await requireAdmin(request, env);
  const body = await readJsonBody(request);

  const questions = body.questions;
  if (!Array.isArray(questions) || questions.length === 0) {
    return errorResponse("Questions required.", 400, "INVALID_QUESTIONS");
  }

  const test = {
    subjectId,
    title: sanitizeString(body.title, 150) || `Free ${subjectId} test`,
    duration: Number(body.duration) || 15,
    totalMarks: questions.reduce((s, q) => s + (q.marks || 1), 0),
    negativeMarking: 0, // free test = no negative
    questions,
    active: true,
    updatedAt: Date.now(),
    updatedBy: admin.uid,
  };

  await dbSet(env, `foreverFreeTests/${subjectId}`, test);
  await dbUpdate(env, `subjects/${subjectId}`, { hasForeverFree: true });
  await logAdminActivity(env, admin.uid, "forever_free_set", { subjectId });

  return jsonResponse({ ok: true, test });
}

// ═══════════════════════════════════════════════════════════
// PURCHASE MANAGEMENT
// ═══════════════════════════════════════════════════════════
async function handleListPurchases(request, env) {
  await requireAdmin(request, env);
  const data = (await dbGet(env, "purchaseRequests")) || {};
  const list = Object.entries(data)
    .map(([id, r]) => ({ id, ...r }))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  return jsonResponse({ ok: true, purchases: list });
}

async function handleVerifyPurchase(request, env, requestId) {
  const admin = await requireAdmin(request, env);
  const body = await readJsonBody(request);

  const purchase = await dbGet(env, `purchaseRequests/${requestId}`);
  if (!purchase) return errorResponse("Purchase request not found.", 404, "NOT_FOUND");
  if (purchase.paymentStatus === "verified") {
    return errorResponse("Already verified.", 400, "ALREADY_VERIFIED");
  }

  const transactionRef = sanitizeString(body.transactionRef, 100);
  if (!transactionRef) return errorResponse("Transaction reference required.", 400, "INVALID_REF");

  // Compute new expiry
  const now = Date.now();
  const profile = await dbGet(env, `users/${purchase.uid}`);
  if (!profile) return errorResponse("User not found.", 404, "USER_NOT_FOUND");

  const days = purchase.validityDays || 7;
  const currentExpiry = profile.planExpiresAt || 0;
  const base = Math.max(currentExpiry, now); // extend if not expired
  const newExpiry = base + days * 24 * 60 * 60 * 1000;

  // Update user plan
  await dbUpdate(env, `users/${purchase.uid}`, {
    plan: purchase.plan,
    planActivatedAt: now,
    planExpiresAt: newExpiry,
  });

  // Update subscription history
  const sub = (await dbGet(env, `subscriptions/${purchase.uid}`)) || { history: [] };
  const history = Array.isArray(sub.history) ? sub.history : [];
  history.push({
    plan: purchase.plan,
    price: purchase.price,
    activatedAt: now,
    expiresAt: newExpiry,
    requestId,
    adminUid: admin.uid,
  });
  await dbSet(env, `subscriptions/${purchase.uid}`, {
    plan: purchase.plan,
    status: "active",
    activatedAt: now,
    expiresAt: newExpiry,
    history,
  });

  // Update purchase request
  await dbUpdate(env, `purchaseRequests/${requestId}`, {
    paymentStatus: "verified",
    subscriptionStatus: "active",
    transactionRef,
    adminUid: admin.uid,
    activationDate: now,
    expiryDate: newExpiry,
  });

  // Notify user
  await dbPush(env, `notifications/${purchase.uid}`, {
    type: "subscription_activated",
    title: "Subscription Activated!",
    message: `Your ${purchase.planName} plan is active until ${new Date(newExpiry).toLocaleDateString()}.`,
    read: false,
    createdAt: now,
  });

  await logAdminActivity(env, admin.uid, "purchase_verified", { requestId, uid: purchase.uid });

  return jsonResponse({ ok: true, newExpiry });
}

async function handleRejectPurchase(request, env, requestId) {
  const admin = await requireAdmin(request, env);
  const body = await readJsonBody(request);
  const reason = sanitizeString(body.reason, 500);

  const purchase = await dbGet(env, `purchaseRequests/${requestId}`);
  if (!purchase) return errorResponse("Purchase request not found.", 404, "NOT_FOUND");

  await dbUpdate(env, `purchaseRequests/${requestId}`, {
    paymentStatus: "rejected",
    rejectionReason: reason,
    adminUid: admin.uid,
    rejectedAt: Date.now(),
  });

  await dbPush(env, `notifications/${purchase.uid}`, {
    type: "subscription_rejected",
    title: "Purchase Request Rejected",
    message: reason || "Your purchase request could not be verified.",
    read: false,
    createdAt: Date.now(),
  });

  await logAdminActivity(env, admin.uid, "purchase_rejected", { requestId });
  return jsonResponse({ ok: true });
}

// ═══════════════════════════════════════════════════════════
// USER MANAGEMENT
// ═══════════════════════════════════════════════════════════
async function handleListUsers(request, env) {
  await requireAdmin(request, env);
  const data = (await dbGet(env, "users")) || {};
  const users = Object.entries(data).map(([uid, u]) => ({
    uid,
    userId: u.userId,
    email: u.email,
    displayName: u.displayName,
    plan: u.plan,
    planExpiresAt: u.planExpiresAt,
    role: u.role || "user",
    status: u.status || "active",
    createdAt: u.createdAt,
  }));
  return jsonResponse({ ok: true, users });
}

async function handleSuspendUser(request, env, uid) {
  const admin = await requireAdmin(request, env);
  await dbUpdate(env, `users/${uid}`, {
    status: "suspended",
    suspendedAt: Date.now(),
    suspendedBy: admin.uid,
  });
  await logAdminActivity(env, admin.uid, "user_suspended", { uid });
  return jsonResponse({ ok: true });
}

async function handleUnsuspendUser(request, env, uid) {
  const admin = await requireAdmin(request, env);
  await dbUpdate(env, `users/${uid}`, {
    status: "active",
    suspendedAt: null,
  });
  await logAdminActivity(env, admin.uid, "user_unsuspended", { uid });
  return jsonResponse({ ok: true });
}

// ═══════════════════════════════════════════════════════════
// GLOBAL SETTINGS
// ═══════════════════════════════════════════════════════════
async function handleGetSettings(request, env) {
  await requireAdmin(request, env);
  const settings = (await dbGet(env, "globalSettings")) || {};
  return jsonResponse({ ok: true, settings });
}

async function handleUpdateSettings(request, env) {
  const admin = await requireAdmin(request, env);
  const body = await readJsonBody(request);

  const allowed = [
    "brandName", "whatsappNumber", "contactEmail",
    "heroHeading", "heroDescription", "aboutContent",
    "plans", "maintenanceMode", "maintenanceMessage",
  ];
  const updates = {};
  for (const k of allowed) {
    if (body[k] !== undefined) updates[k] = body[k];
  }
  updates.updatedAt = Date.now();
  updates.updatedBy = admin.uid;

  await dbUpdate(env, "globalSettings", updates);
  await logAdminActivity(env, admin.uid, "settings_updated", { keys: Object.keys(updates) });
  return jsonResponse({ ok: true });
}

// ═══════════════════════════════════════════════════════════
// PUBLIC (no auth) — homepage needs these
// ═══════════════════════════════════════════════════════════
async function handlePublicSubjects(request, env) {
  const data = (await dbGet(env, "subjects")) || {};
  const subjects = Object.entries(data)
    .filter(([, s]) => s.active !== false)
    .map(([id, s]) => ({
      id,
      name: s.name,
      nameAs: s.nameAs,
      description: s.description,
      hasForeverFree: s.hasForeverFree || false,
    }));
  return jsonResponse({ ok: true, subjects });
}

async function handlePublicHomepageTests(request, env, subjectId) {
  const data = (await dbGet(env, "homepageTests")) || {};
  const tests = Object.entries(data)
    .filter(([, t]) => t.status === "published" && t.subjectId === subjectId)
    .map(([id, t]) => ({
      id,
      title: t.title,
      duration: t.duration,
      totalMarks: t.totalMarks,
      publishedAt: t.publishedAt,
      isPaid: t.isPaid !== false,
    }));
  return jsonResponse({ ok: true, tests });
}

async function handlePublicSettings(request, env) {
  const settings = (await dbGet(env, "globalSettings")) || {};
  return jsonResponse({
    ok: true,
    settings: {
      brandName: settings.brandName || "PrepareKora",
      heroHeading: settings.heroHeading || "Prepare Smarter. Practice Better.",
      heroDescription: settings.heroDescription || "",
      aboutContent: settings.aboutContent || "",
      contactEmail: settings.contactEmail || "",
      whatsappNumber: settings.whatsappNumber || "",
      maintenanceMode: settings.maintenanceMode || false,
      plans: settings.plans || null,
    },
  });
}

// ═══════════════════════════════════════════════════════════
// ROUTER
// ═══════════════════════════════════════════════════════════
async function handleAdminRoutes(request, env, pathname) {
  const method = request.method;
  const parts = pathname.split("/").filter(Boolean); // ["api","admin",...]

  try {
    // ── Public (no admin auth) ──
    if (pathname === "/api/public/subjects" && method === "GET")
      return await handlePublicSubjects(request, env);
    if (pathname === "/api/public/settings" && method === "GET")
      return await handlePublicSettings(request, env);
    if (parts[2] === "public" && parts[3] === "homepage-tests" && parts[4] && method === "GET")
      return await handlePublicHomepageTests(request, env, parts[4]);

    // ── Admin-only ──
    if (pathname === "/api/admin/dashboard" && method === "GET")
      return await handleGetDashboardStats(request, env);

    // Subjects
    if (pathname === "/api/admin/subjects" && method === "GET")
      return await handleListSubjects(request, env);
    if (pathname === "/api/admin/subjects" && method === "POST")
      return await handleCreateSubject(request, env);
    if (parts[2] === "admin" && parts[3] === "subjects" && parts[4]) {
      if (method === "PATCH") return await handleUpdateSubject(request, env, parts[4]);
      if (method === "DELETE") return await handleDeleteSubject(request, env, parts[4]);
    }

    // Questions
    if (parts[2] === "admin" && parts[3] === "questions" && parts[4]) {
      const subjectId = parts[4];
      if (parts[5] === "import" && method === "POST")
        return await handleImportQuestions(request, env, subjectId);
      if (!parts[5] && method === "GET")
        return await handleListQuestions(request, env, subjectId);
      if (!parts[5] && method === "POST")
        return await handleCreateQuestion(request, env, subjectId);
      if (parts[5] && method === "PATCH")
        return await handleUpdateQuestion(request, env, subjectId, parts[5]);
      if (parts[5] && method === "DELETE")
        return await handleDeleteQuestion(request, env, subjectId, parts[5]);
    }

    // Homepage Tests
    if (pathname === "/api/admin/homepage-tests" && method === "GET")
      return await handleListHomepageTests(request, env);
    if (pathname === "/api/admin/homepage-tests" && method === "POST")
      return await handleCreateHomepageTest(request, env);
    if (parts[2] === "admin" && parts[3] === "homepage-tests" && parts[4]) {
      if (method === "PATCH") return await handleUpdateHomepageTest(request, env, parts[4]);
      if (method === "DELETE") return await handleDeleteHomepageTest(request, env, parts[4]);
    }

    // Forever Free
    if (pathname === "/api/admin/forever-free" && method === "GET")
      return await handleListForeverFree(request, env);
    if (parts[2] === "admin" && parts[3] === "forever-free" && parts[4] && method === "PUT")
      return await handleSetForeverFree(request, env, parts[4]);

    // Purchases
    if (pathname === "/api/admin/purchases" && method === "GET")
      return await handleListPurchases(request, env);
    if (parts[2] === "admin" && parts[3] === "purchases" && parts[4]) {
      if (parts[5] === "verify" && method === "POST")
        return await handleVerifyPurchase(request, env, parts[4]);
      if (parts[5] === "reject" && method === "POST")
        return await handleRejectPurchase(request, env, parts[4]);
    }

    // Users
    if (pathname === "/api/admin/users" && method === "GET")
      return await handleListUsers(request, env);
    if (parts[2] === "admin" && parts[3] === "users" && parts[4]) {
      if (parts[5] === "suspend" && method === "POST")
        return await handleSuspendUser(request, env, parts[4]);
      if (parts[5] === "unsuspend" && method === "POST")
        return await handleUnsuspendUser(request, env, parts[4]);
    }

    // Settings
    if (pathname === "/api/admin/settings" && method === "GET")
      return await handleGetSettings(request, env);
    if (pathname === "/api/admin/settings" && method === "PATCH")
      return await handleUpdateSettings(request, env);

    return errorResponse("Not found", 404, "NOT_FOUND");
  } catch (err) {
    return handleError(err);
  }
}

export { handleAdminRoutes };
