// ═══════════════════════════════════════════════════════════
// PrepareKora Worker — Main Entry Point
// ═══════════════════════════════════════════════════════════

import { handleAuthRoutes } from "./routes/auth.js";
import { handleUserRoutes } from "./routes/users.js";
import { handleTestRoutes } from "./routes/tests.js";
import { handleAdminRoutes } from "./routes/admin.js";

import {
  dbGet,
  dbSet,
  dbUpdate,
  dbPush,
  getGoogleAccessToken,
} from "./lib/firebase.js";

import {
  buildCorsHeaders,
  jsonResponse,
  errorResponse,
} from "./lib/security.js";

// ───────────────────────────────────────────────────────────
// CORS Preflight
// ───────────────────────────────────────────────────────────
function handleOptions(request, env) {
  const origin = request.headers.get("Origin") || "";
  return new Response(null, {
    status: 204,
    headers: buildCorsHeaders(env, origin),
  });
}

// ───────────────────────────────────────────────────────────
// Wrap response with CORS
// ───────────────────────────────────────────────────────────
function withCors(response, request, env) {
  const origin = request.headers.get("Origin") || "";
  const cors = buildCorsHeaders(env, origin);
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(cors)) {
    headers.set(k, v);
  }
  return new Response(response.body, {
    status: response.status,
    headers,
  });
}

// ───────────────────────────────────────────────────────────
// MAIN FETCH HANDLER
// ───────────────────────────────────────────────────────────
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // CORS preflight
    if (request.method === "OPTIONS") {
      return handleOptions(request, env);
    }

    try {
      // Health check
      if (pathname === "/" || pathname === "/api/health") {
        return withCors(
          jsonResponse({
            ok: true,
            service: "PrepareKora Worker",
            version: "1.0.0",
            time: Date.now(),
          }),
          request,
          env
        );
      }

      // Route dispatch
      let response;

      if (pathname.startsWith("/api/auth/")) {
        response = await handleAuthRoutes(request, env, pathname);
      } else if (pathname.startsWith("/api/users/")) {
        response = await handleUserRoutes(request, env, pathname);
      } else if (pathname.startsWith("/api/tests/")) {
        response = await handleTestRoutes(request, env, pathname);
      } else if (
        pathname.startsWith("/api/admin/") ||
        pathname.startsWith("/api/public/")
      ) {
        response = await handleAdminRoutes(request, env, pathname);
      } else {
        response = errorResponse("Not found", 404, "NOT_FOUND");
      }

      return withCors(response, request, env);
    } catch (err) {
      console.error("[worker] unhandled:", err);
      return withCors(
        errorResponse("Internal server error", 500, "INTERNAL_ERROR"),
        request,
        env
      );
    }
  },

  // ─────────────────────────────────────────────────────────
  // CRON HANDLER — daily tests, expiry, backup
  // ─────────────────────────────────────────────────────────
  async scheduled(event, env, ctx) {
    const cron = event.cron;
    const now = new Date();

    console.log(`[cron] fired: ${cron} at ${now.toISOString()}`);

    try {
      if (cron === "30 0 * * *") {
        // 6:00 AM IST — morning daily tests
        await generateDailyTests(env, "morning");
      } else if (cron === "30 12 * * *") {
        // 6:00 PM IST — evening daily tests
        await generateDailyTests(env, "evening");
      } else if (cron === "0 18 * * *") {
        // 11:30 PM IST — daily maintenance
        await handleSubscriptionExpiry(env);
        await logDailyBackupReminder(env);
      }
    } catch (err) {
      console.error("[cron] error:", err.message);
      try {
        await dbPush(env, "adminNotifications", {
          type: "cron_failure",
          title: "Cron Job Failed",
          message: `${cron}: ${err.message}`,
          read: false,
          createdAt: Date.now(),
        });
      } catch {}
    }
  },
};

// ═══════════════════════════════════════════════════════════
// DAILY TEST GENERATION
// ═══════════════════════════════════════════════════════════
async function generateDailyTests(env, slot) {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  // Idempotency check: has this slot already been generated?
  const marker = await dbGet(env, `dailyTests/${today}/${slot}/_generated`);
  if (marker) {
    console.log(`[cron] ${slot} for ${today} already generated — skipping`);
    return;
  }

  const subjects = (await dbGet(env, "subjects")) || {};
  const activeSubjects = Object.entries(subjects).filter(
    ([, s]) => s.active !== false
  );

  // Load global test config
  const settings = (await dbGet(env, "globalSettings")) || {};
  const testConfig = settings.testConfig || {};
  const questionCount = testConfig.dailyQuestionCount || 10;
  const duration = testConfig.dailyDuration || 15;

  const generated = {};

  for (const [subjectId, subject] of activeSubjects) {
    try {
      // Load question bank for this subject
      const bank = (await dbGet(env, `questionBank/${subjectId}`)) || {};
      const allQuestions = Object.entries(bank)
        .map(([id, q]) => ({ id, ...q }))
        .filter((q) => q.active !== false);

      if (allQuestions.length < questionCount) {
        // Log warning to admin
        await dbPush(env, "adminNotifications", {
          type: "question_bank_low",
          title: `Low Question Bank: ${subject.name}`,
          message: `${allQuestions.length} questions available, ${questionCount} needed for daily test.`,
          subjectId,
          read: false,
          createdAt: Date.now(),
        });
        continue;
      }

      // Load usage tracking
      const usage = (await dbGet(env, `questionUsage/${subjectId}`)) || {};
      const usedIds = new Set(Object.keys(usage));

      // Unused questions
      let pool = allQuestions.filter((q) => !usedIds.has(q.id));

      // If exhausted, check for admin approval to recycle
      if (pool.length < questionCount) {
        const recycleApproval = await dbGet(env, `questionUsage/${subjectId}/_recycleApproval`);
        if (!recycleApproval?.approved) {
          await dbPush(env, "adminNotifications", {
            type: "questions_exhausted",
            title: `Questions Exhausted: ${subject.name}`,
            message: `All questions used. Approve recycling to continue.`,
            subjectId,
            read: false,
            createdAt: Date.now(),
          });
          continue;
        }
        // Recycle pool
        pool = allQuestions;
      }

      // Deterministic shuffle (Fisher-Yates with crypto)
      const shuffled = shuffleArray(pool);
      const selected = shuffled.slice(0, questionCount);

      // Build test
      const testId = `${today}_${slot}_${subjectId}`;
      const test = {
        testId,
        date: today,
        slot,
        subjectId,
        subjectName: subject.name,
        title: `${subject.name} — ${slot === "morning" ? "Morning" : "Evening"} Test (${today})`,
        duration,
        totalMarks: selected.reduce((s, q) => s + (q.marks || 1), 0),
        negativeMarking: testConfig.negativeMarking ?? 0.25,
        questions: selected.map((q) => ({
          externalId: q.id,
          question: q.question,
          options: q.options,
          correctOptionId: q.correctOptionId,
          marks: q.marks || 1,
          difficulty: q.difficulty || "medium",
          explanation: q.explanation || { en: "", as: "" },
        })),
        generatedAt: Date.now(),
        status: "published",
      };

      await dbSet(env, `dailyTests/${testId}`, test);

      // Mark questions as used
      const usageUpdates = {};
      for (const q of selected) {
        usageUpdates[q.id] = { usedAt: Date.now(), date: today, slot };
      }
      await dbUpdate(env, `questionUsage/${subjectId}`, usageUpdates);

      generated[subjectId] = testId;
      console.log(`[cron] generated ${testId}`);
    } catch (err) {
      console.error(`[cron] subject ${subjectId} failed:`, err.message);
      await dbPush(env, "automationLogs", {
        type: "generation_failed",
        subjectId,
        slot,
        date: today,
        error: err.message,
        at: Date.now(),
      });
    }
  }

  // Save idempotency marker
  await dbSet(env, `dailyTests/${today}/${slot}/_generated`, {
    at: Date.now(),
    subjects: Object.keys(generated),
  });

  // Notify admin
  await dbPush(env, "adminNotifications", {
    type: "daily_tests_generated",
    title: `Daily Tests Generated (${slot})`,
    message: `${Object.keys(generated).length} subject tests published for ${today}.`,
    read: false,
    createdAt: Date.now(),
  });
}

function shuffleArray(arr) {
  const a = [...arr];
  const randomBytes = new Uint8Array(a.length);
  crypto.getRandomValues(randomBytes);
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomBytes[i] % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ═══════════════════════════════════════════════════════════
// SUBSCRIPTION EXPIRY
// ═══════════════════════════════════════════════════════════
async function handleSubscriptionExpiry(env) {
  const now = Date.now();
  const users = (await dbGet(env, "users")) || {};

  for (const [uid, user] of Object.entries(users)) {
    if (!user.planExpiresAt) continue;
    if (user.plan === "free") continue;

    if (user.planExpiresAt < now) {
      // Expire
      await dbUpdate(env, `users/${uid}`, {
        plan: "free",
        planExpiresAt: null,
        previousPlan: user.plan,
        expiredAt: now,
      });

      await dbSet(env, `subscriptions/${uid}`, {
        plan: "free",
        status: "expired",
        expiresAt: user.planExpiresAt,
        expiredAt: now,
      });

      // Notify
      await dbPush(env, `notifications/${uid}`, {
        type: "subscription_expired",
        title: "Subscription Expired",
        message: "Your plan has expired. You are now on the Free plan.",
        read: false,
        createdAt: now,
      });

      console.log(`[cron] expired subscription for ${uid}`);
    } else {
      // Expiry warnings (3 days, 1 day)
      const daysLeft = Math.ceil((user.planExpiresAt - now) / (24 * 60 * 60 * 1000));
      if (daysLeft === 3 || daysLeft === 1) {
        await dbPush(env, `notifications/${uid}`, {
          type: "subscription_expiry_warning",
          title: `Subscription expires in ${daysLeft} day${daysLeft > 1 ? "s" : ""}`,
          message: `Renew now to continue your ${user.plan} access.`,
          read: false,
          createdAt: now,
        });
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════
// BACKUP REMINDER (full backup runs from admin/manual — this logs)
// ═══════════════════════════════════════════════════════════
async function logDailyBackupReminder(env) {
  await dbPush(env, "adminNotifications", {
    type: "backup_reminder",
    title: "Daily Backup Available",
    message: "Run manual backup from Admin → Backup module to snapshot today's data.",
    read: false,
    createdAt: Date.now(),
  });
}
