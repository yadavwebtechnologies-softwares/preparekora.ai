
---

## 🚀 Backend API (Cloudflare Worker)

Base URL: `https://preparekora-worker.yadavsubba2003.workers.dev`

### Public endpoints (no auth)

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Health check |
| GET | `/api/public/subjects` | List active subjects |
| GET | `/api/public/settings` | Site settings (brand, hero, contact) |
| GET | `/api/public/homepage-tests/:subjectId` | Published homepage tests for subject |
| GET | `/api/tests/subject/:subjectId/forever-free` | Forever Free test metadata |

### Auth endpoints

| Method | Path | Body | Purpose |
|---|---|---|---|
| POST | `/api/auth/signup` | `{fullName, email, password, confirmPassword}` | Register |
| POST | `/api/auth/login` | `{email, password}` | Sign in |
| POST | `/api/auth/logout` | — | Clear session |
| POST | `/api/auth/forgot-password` | `{email}` | Send reset email |
| GET | `/api/auth/me` | — | Current user |

### User endpoints (auth required)

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/users/profile` | Full profile |
| PATCH | `/api/users/profile` | Update name / preferences |
| POST | `/api/users/change-password` | Change password |
| GET | `/api/users/notifications` | List notifications |
| POST | `/api/users/notifications/read-all` | Mark all read |
| POST | `/api/users/notifications/:id/read` | Mark one read |
| GET | `/api/users/subscription` | Current subscription |
| POST | `/api/users/purchase-request` | Create purchase request |
| GET | `/api/users/purchase-history` | My purchases |
| GET | `/api/users/test-history` | My attempts |
| GET | `/api/users/test-attempt/:id` | Attempt detail + review |
| POST | `/api/users/support` | Submit support request |
| POST | `/api/users/delete-account` | Delete account |

### Test endpoints

| Method | Path | Body | Purpose |
|---|---|---|---|
| POST | `/api/tests/start` | `{testType, testId?, subjectId?}` | Start attempt |
| POST | `/api/tests/autosave` | `{attemptId, answers}` | Save progress |
| POST | `/api/tests/submit` | `{attemptId, answers}` | Submit + score |
| GET | `/api/tests/status/:attemptId` | — | Check attempt |

### Admin endpoints (admin UID required)

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/admin/dashboard` | Stats |
| GET/POST | `/api/admin/subjects` | List / create |
| PATCH/DELETE | `/api/admin/subjects/:id` | Update / archive |
| GET/POST | `/api/admin/questions/:subjectId` | List / create |
| PATCH/DELETE | `/api/admin/questions/:subjectId/:questionId` | Update / archive |
| POST | `/api/admin/questions/:subjectId/import` | Bulk import |
| GET/POST | `/api/admin/homepage-tests` | List / create |
| PATCH/DELETE | `/api/admin/homepage-tests/:id` | Update / delete |
| GET | `/api/admin/forever-free` | List |
| PUT | `/api/admin/forever-free/:subjectId` | Create / update |
| GET | `/api/admin/purchases` | List purchase requests |
| POST | `/api/admin/purchases/:id/verify` | Verify payment |
| POST | `/api/admin/purchases/:id/reject` | Reject payment |
| GET | `/api/admin/users` | List users |
| POST | `/api/admin/users/:uid/suspend` | Suspend |
| POST | `/api/admin/users/:uid/unsuspend` | Unsuspend |
| GET/PATCH | `/api/admin/settings` | Global settings |

---

## 🔐 Security Model

- **Frontend** never touches Firebase directly. All Firebase operations are proxied through the Worker.
- **Firebase Web API Key** and **Service Account JSON** are stored as **Cloudflare Worker Secrets**, never in the repo.
- **Sessions** are maintained via an `HttpOnly; Secure; SameSite=None` cookie containing the Firebase ID token. The frontend also stores a lightweight `"session"` marker in `localStorage` for UI state only — this marker grants no API access.
- **Admin authorization** is enforced server-side by UID allowlist (`ADMIN_UID_ALLOWLIST`).
- **Subscription quotas** are enforced server-side on `/api/tests/start` and `/api/tests/submit`.
- **Realtime Database rules** are locked — client-side access is disabled. Only the Worker's Service Account can read/write.
- **Rate limiting** on signup, login, and forgot-password endpoints.
- **CORS** restricted to `ALLOWED_ORIGINS`.

---

## 🔑 Cloudflare Worker Secrets

Set in Cloudflare Dashboard → Workers → `preparekora-worker` → Settings → Variables and Secrets:

| Name | Type |
|---|---|
| `FIREBASE_API_KEY` | Secret |
| `FIREBASE_PROJECT_ID` | Secret |
| `FIREBASE_DATABASE_URL` | Secret |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Secret |
| `ADMIN_UID_ALLOWLIST` | Secret |
| `SESSION_SIGNING_SECRET` | Secret |
| `SESSION_ENCRYPTION_KEY` | Secret |
| `ENVIRONMENT` | Variable |
| `ALLOWED_ORIGINS` | Variable |
| `FIREBASE_AUTH_DOMAIN` | Variable |

---

## ⏰ Cron Triggers

| Expression (UTC) | IST | Purpose |
|---|---|---|
| `30 0 * * *` | 6:00 AM | Generate morning daily tests |
| `30 12 * * *` | 6:00 PM | Generate evening daily tests |
| `0 18 * * *` | 11:30 PM | Subscription expiry + backup reminder |

---

## 📊 Subscription Plans

| Plan | Price | Validity | Daily tests/slot | Paid homepage tests |
|---|---|---|---|---|
| Free | ₹0 | Lifetime | 1 | No |
| Basic | ₹19 | 7 days | 2 | No |
| Standard | ₹49 | 15 days | 3 | Yes |
| Premium | ₹99 | 30 days | All | Yes |

**Forever Free tests** are always available to everyone, no login required.

---

## 🧪 Testing Checklist

Before public launch, verify:

- [ ] Signup creates Firebase account + DB profile + unique `PK-XXXXXXXX` user ID
- [ ] Login works with email/password; session persists across pages
- [ ] Logout clears session cookie and localStorage
- [ ] Admin login (UID in `ADMIN_UID_ALLOWLIST`) can access `/admin.html`
- [ ] Non-admin cannot access admin panel
- [ ] Admin can create subject → it appears on homepage
- [ ] Admin can create Forever Free test → homepage button works
- [ ] Forever Free test completes without login
- [ ] Paid homepage test requires Standard/Premium subscription
- [ ] Daily test respects per-slot quota based on plan
- [ ] Timer countdown is server-authoritative
- [ ] Autosave restores progress on refresh
- [ ] Result review shows correct/wrong highlighting + explanations
- [ ] Purchase request opens WhatsApp with prefilled message
- [ ] Admin can verify purchase → subscription activates
- [ ] Subscription expiry reverts to Free (test on a short plan)
- [ ] Notifications appear correctly
- [ ] Search overlay finds tests
- [ ] Language switcher changes text (EN ↔ AS)
- [ ] Mobile layout works at 375px, 414px, 768px
- [ ] PWA installs on Chrome Android
- [ ] Service worker serves offline cached pages

---

## 🛠️ Deployment

### Frontend (GitHub Pages)
- Branch: `main`
- Folder: `/ (root)`
- Auto-deploys on push to `main`

### Backend (Cloudflare Worker)
- Single file: `worker/src/index.js` (deployed via Dashboard editor)
- To update: edit in Dashboard → Save and Deploy

### Database
- Firebase Realtime Database at `https://preparek-default-rtdb.firebaseio.com`
- Rules: deny all client access; Worker uses Service Account

---

## 📞 Support

For issues or questions, use the Find Us page or reach out via WhatsApp (configured in Admin → Settings).

---

## 📜 License

All code and content © PrepareKora. Unauthorized redistribution is prohibited.
