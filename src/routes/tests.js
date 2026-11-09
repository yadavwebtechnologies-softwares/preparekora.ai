// ═══════════════════════════════════════════════════════════
// TEST ROUTES — Forever Free, Homepage Paid, Daily tests
// Server-authoritative scoring & timing
// ═══════════════════════════════════════════════════════════

import {
  dbGet,
  dbSet,
  dbUpdate,
  dbPush,
} from "../lib/firebase.js";

import {
  jsonResponse,
  errorResponse,
  readJsonBody,
  requireAuth,
  handleError,
} from "../lib/security.js";

// ───────────────────────────────────────────────────────────
// HELPERS
// ───────────────────────────────────────────────────────────

// Public-safe question (no correct answer, no explanation)
function publicQuestion(q, idx) {
  return {
    index: idx,
    externalId: q.externalId,
    question: q.question,      // { en, as }
    options: q.options.map((o) => ({ id: o.id, en: o.en, as: o.as })),
    marks: q.marks || 1,
    difficulty: q.difficulty || "medium",
  };
}

// Fetch test by type + id
async function loadTestSource(env, testType, testId, subjectId) {
  if (testType === "forever-free") {
    if (!subjectId) throw Object.assign(new Error("SUBJECT_REQUIRED"), { status: 400 });
    return await dbGet(env, `foreverFreeTests/${subjectId}`);
  }
  if (testType === "homepage-paid") {
    return await dbGet(env, `homepageTests/${testId}`);
  }
  if (testType === "daily") {
    // testId format: YYYY-MM-DD_slot_subjectId
    return await dbGet(env, `dailyTests/${testId}`);
  }
  throw Object.assign(new Error("INVALID_TEST_TYPE"), { status: 400 });
}

// Check user subscription access
async function checkTestAccess(env, auth, test, testType) {
  // Forever Free is always accessible (even anonymous)
  if (testType === "forever-free") return true;

  // For paid tests, auth is required
  if (!auth) {
    throw Object.assign(new Error("LOGIN_REQUIRED"), { status: 401 });
  }

  const profile = await dbGet(env, `users/${auth.uid}`);
  if (!profile) throw Object.assign(new Error("PROFILE_NOT_FOUND"), { status: 404 });
  if (profile.status === "suspended")
    throw Object.assign(new Error("ACCOUNT_SUSPENDED"), { status: 403 });

  const plan = profile.plan || "free";
  const expiresAt = profile.planExpiresAt;
  const now = Date.now();

  // Effective plan (expired → free)
  const effectivePlan =
    plan !== "free" && expiresAt && expiresAt < now ? "free" : plan;

  if (testType === "homepage-paid") {
    if (!["standard", "premium"].includes(effectivePlan)) {
      throw Object.assign(new Error("SUBSCRIPTION_REQUIRED"), { status: 403 });
    }
    return true;
  }

  if (testType === "daily") {
    // Daily quota check
    const slot = test.slot; // "morning" | "evening"
    const date = test.date; // YYYY-MM-DD
    const quotaLimits = {
      free: 1,
      basic: 2,
      standard: 3,
      premium: Infinity,
    };
    const limit = quotaLimits[effectivePlan] ?? 1;

    // Count user's daily attempts for this date+slot
    const attempts = (await dbGet(env, `testAttempts/${auth.uid}`)) || {};
    let count = 0;
    for (const a of Object.values(attempts)) {
      if (a.testType === "daily" && a.date === date && a.slot === slot) {
        count++;
      }
    }

    if (count >= limit) {
      throw Object.assign(new Error("DAILY_QUOTA_EXCEEDED"), { status: 403 });
    }
    return true;
  }

  return true;
}

// ───────────────────────────────────────────────────────────
// POST /api/tests/start
// body: { testType, testId?, subjectId? }
// Returns sanitized test (no answers) + attempt ID
// ───────────────────────────────────────────────────────────
async function handleStartTest(request, env) {
  const body = await readJsonBody(request);
  const testType = body.testType;
  const testId = body.testId || null;
  const subjectId = body.subjectId || null;

  // Auth is optional for forever-free
  let auth = null;
  try {
    const { requireAuth } = await import("../lib/security.js");
    auth = await requireAuth(request, env);
  } catch {
    auth = null;
  }

  // Load test
  let test;
  try {
    test = await loadTestSource(env, testType, testId, subjectId);
  } catch (err) {
    return handleError(err);
  }
  if (!test) {
    return errorResponse("Test not found.", 404, "TEST_NOT_FOUND");
  }

  // Access check
  try {
    await checkTestAccess(env, auth, test, testType);
  } catch (err) {
    return handleError(err);
  }

  // Generate attempt ID
  const attemptId =
    "ATT-" +
    Array.from(crypto.getRandomValues(new Uint8Array(6)))
      .map((b) => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[b % 32])
      .join("");

  const now = Date.now();
  const durationSec = (test.duration || 30) * 60;
  const deadline = now + durationSec * 1000;

  // Build attempt record
  const attempt = {
    attemptId,
    uid: auth?.uid || null,
    anonymous: !auth,
    testType,
    testId: test.testId || test.id || (subjectId ? `forever-${subjectId}` : null),
    subjectId: test.subjectId || subjectId,
    subject: test.subjectName || test.subject || "",
    testTitle: test.title || test.testTitle || "",
    date: test.date || null,
    slot: test.slot || null,
    startedAt: now,
    deadline,
    durationSec,
    totalQuestions: test.questions.length,
    totalMarks: test.totalMarks || test.questions.reduce((s, q) => s + (q.marks || 1), 0),
    negativeMarking: test.negativeMarking ?? 0.25,
    status: "in-progress",
    answers: {}, // qIdx -> optionId
    submittedAt: null,
    score: null,
    percentage: null,
  };

  // Save attempt with snapshot of correct answers (server-side only, not returned)
  const snapshot = {
    ...attempt,
    correctAnswers: test.questions.reduce((acc, q, i) => {
      acc[i] = q.correctOptionId;
      return acc;
    }, {}),
    questionsSnapshot: test.questions, // for review after submission
  };

  await dbSet(env, `testAttempts_private/${attemptId}`, snapshot);

  // If logged in, also add to user's index
  if (auth) {
    await dbSet(env, `testAttempts/${auth.uid}/${attemptId}`, {
      attemptId,
      testType,
      testId: attempt.testId,
      subject: attempt.subject,
      testTitle: attempt.testTitle,
      date: attempt.date,
      slot: attempt.slot,
      startedAt: now,
      status: "in-progress",
    });
  }

  // Return sanitized test
  return jsonResponse({
    ok: true,
    attempt: {
      attemptId,
      testType,
      testTitle: attempt.testTitle,
      subject: attempt.subject,
      deadline,
      durationSec,
      totalQuestions: attempt.totalQuestions,
      totalMarks: attempt.totalMarks,
      negativeMarking: attempt.negativeMarking,
    },
    questions: test.questions.map(publicQuestion),
  });
}

// ───────────────────────────────────────────────────────────
// POST /api/tests/autosave
// body: { attemptId, answers }
// ───────────────────────────────────────────────────────────
async function handleAutosave(request, env) {
  const body = await readJsonBody(request);
  const attemptId = body.attemptId;
  const answers = body.answers || {};

  if (!attemptId) return errorResponse("attemptId required.", 400, "MISSING_ATTEMPT_ID");

  const snapshot = await dbGet(env, `testAttempts_private/${attemptId}`);
  if (!snapshot) return errorResponse("Attempt not found.", 404, "NOT_FOUND");
  if (snapshot.status !== "in-progress") {
    return errorResponse("Attempt already submitted.", 400, "ALREADY_SUBMITTED");
  }
  if (Date.now() > snapshot.deadline) {
    return errorResponse("Test time expired.", 410, "EXPIRED");
  }

  await dbUpdate(env, `testAttempts_private/${attemptId}`, {
    answers,
    lastSavedAt: Date.now(),
  });

  return jsonResponse({ ok: true, savedAt: Date.now() });
}

// ───────────────────────────────────────────────────────────
// POST /api/tests/submit
// body: { attemptId, answers }
// ───────────────────────────────────────────────────────────
async function handleSubmitTest(request, env) {
  const body = await readJsonBody(request);
  const attemptId = body.attemptId;
  const submittedAnswers = body.answers || {};

  if (!attemptId) return errorResponse("attemptId required.", 400, "MISSING_ATTEMPT_ID");

  const snapshot = await dbGet(env, `testAttempts_private/${attemptId}`);
  if (!snapshot) return errorResponse("Attempt not found.", 404, "NOT_FOUND");
  if (snapshot.status !== "in-progress") {
    return errorResponse("Attempt already submitted.", 400, "ALREADY_SUBMITTED");
  }

  const now = Date.now();
  const expired = now > snapshot.deadline;

  // Merge answers: submitted > autosaved
  const answers = { ...(snapshot.answers || {}), ...submittedAnswers };

  // Score calculation
  const negativeMarking = snapshot.negativeMarking ?? 0.25;
  let correct = 0;
  let wrong = 0;
  let unattempted = 0;
  let score = 0;

  const review = snapshot.questionsSnapshot.map((q, idx) => {
    const userAns = answers[idx] || answers[String(idx)] || null;
    const correctAns = snapshot.correctAnswers[idx];
    let status;
    if (!userAns) {
      unattempted++;
      status = "unattempted";
    } else if (userAns === correctAns) {
      correct++;
      score += q.marks || 1;
      status = "correct";
    } else {
      wrong++;
      score -= negativeMarking;
      status = "wrong";
    }
    return {
      index: idx,
      question: q.question,
      options: q.options,
      userAnswer: userAns,
      correctAnswer: correctAns,
      explanation: q.explanation || { en: "", as: "" },
      marks: q.marks || 1,
      status,
    };
  });

  const totalMarks = snapshot.totalMarks;
  const percentage = totalMarks > 0 ? Math.max(0, (score / totalMarks) * 100) : 0;
  const timeTaken = Math.round((now - snapshot.startedAt) / 1000);

  const result = {
    attemptId,
    uid: snapshot.uid,
    anonymous: snapshot.anonymous,
    testType: snapshot.testType,
    testId: snapshot.testId,
    subject: snapshot.subject,
    testTitle: snapshot.testTitle,
    date: snapshot.date,
    slot: snapshot.slot,
    startedAt: snapshot.startedAt,
    submittedAt: now,
    timeTaken,
    correct,
    wrong,
    unattempted,
    totalQuestions: snapshot.totalQuestions,
    totalMarks,
    score: Math.round(score * 100) / 100,
    percentage: Math.round(percentage * 10) / 10,
    expired,
    review,
    status: "completed",
  };

  // Save result privately
  await dbSet(env, `testAttempts_private/${attemptId}`, { ...snapshot, ...result });

  // Update user's attempt index if logged in
  if (snapshot.uid) {
    await dbUpdate(env, `testAttempts/${snapshot.uid}/${attemptId}`, {
      status: "completed",
      submittedAt: now,
      score: result.score,
      totalMarks: result.totalMarks,
      percentage: result.percentage,
      timeTaken,
      correct,
      wrong,
      unattempted,
    });

    // Update user stats
    try {
      const profile = await dbGet(env, `users/${snapshot.uid}`);
      if (profile) {
        const stats = profile.stats || { totalAttempts: 0, totalCorrect: 0, totalWrong: 0 };
        await dbUpdate(env, `users/${snapshot.uid}/stats`, {
          totalAttempts: (stats.totalAttempts || 0) + 1,
          totalCorrect: (stats.totalCorrect || 0) + correct,
          totalWrong: (stats.totalWrong || 0) + wrong,
        });
      }
    } catch {}
  }

  // Return public result (review included)
  return jsonResponse({ ok: true, result });
}

// ───────────────────────────────────────────────────────────
// GET /api/tests/status/:attemptId — check attempt status
// ───────────────────────────────────────────────────────────
async function handleAttemptStatus(request, env, attemptId) {
  const snapshot = await dbGet(env, `testAttempts_private/${attemptId}`);
  if (!snapshot) return errorResponse("Attempt not found.", 404, "NOT_FOUND");

  return jsonResponse({
    ok: true,
    status: snapshot.status,
    deadline: snapshot.deadline,
    savedAnswers: snapshot.answers || {},
  });
}

// ───────────────────────────────────────────────────────────
// GET /api/tests/subject/:subjectId/forever-free
// Public — returns the forever free test for a subject (sanitized)
// ───────────────────────────────────────────────────────────
async function handleGetForeverFree(request, env, subjectId) {
  const test = await dbGet(env, `foreverFreeTests/${subjectId}`);
  if (!test) return errorResponse("Forever Free test not configured.", 404, "NOT_FOUND");

  return jsonResponse({
    ok: true,
    test: {
      testTitle: test.title,
      subjectId,
      subject: test.subjectName,
      duration: test.duration,
      totalMarks: test.totalMarks,
      questionCount: test.questions.length,
    },
  });
}

// ───────────────────────────────────────────────────────────
// ROUTER
// ───────────────────────────────────────────────────────────
async function handleTestRoutes(request, env, pathname) {
  const method = request.method;

  try {
    if (pathname === "/api/tests/start" && method === "POST")
      return await handleStartTest(request, env);

    if (pathname === "/api/tests/autosave" && method === "POST")
      return await handleAutosave(request, env);

    if (pathname === "/api/tests/submit" && method === "POST")
      return await handleSubmitTest(request, env);

    if (pathname.match(/^\/api\/tests\/status\/[^/]+$/) && method === "GET") {
      const id = pathname.split("/")[4];
      return await handleAttemptStatus(request, env, id);
    }

    if (pathname.match(/^\/api\/tests\/subject\/[^/]+\/forever-free$/) && method === "GET") {
      const sid = pathname.split("/")[4];
      return await handleGetForeverFree(request, env, sid);
    }

    return errorResponse("Not found", 404, "NOT_FOUND");
  } catch (err) {
    return handleError(err);
  }
}

export { handleTestRoutes };
