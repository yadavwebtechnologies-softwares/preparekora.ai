// ═══════════════════════════════════════════════════════════
// FIREBASE HELPERS — Worker-side only
// Uses Service Account JSON for Admin-level DB access
// Uses REST API for Auth (no SDK)
// ═══════════════════════════════════════════════════════════

// ───────────────────────────────────────────────────────────
// PARSE SERVICE ACCOUNT
// ───────────────────────────────────────────────────────────
function getServiceAccount(env) {
  try {
    const raw = env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON missing");
    const sa = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!sa.private_key || !sa.client_email) {
      throw new Error("Service account JSON invalid");
    }
    return sa;
  } catch (err) {
    console.error("[firebase] service account parse error:", err.message);
    throw new Error("Firebase service account configuration error");
  }
}

// ───────────────────────────────────────────────────────────
// JWT SIGNING (RS256) — for Google OAuth2 token exchange
// Uses WebCrypto — no external library needed
// ───────────────────────────────────────────────────────────
function base64UrlEncode(input) {
  let str;
  if (typeof input === "string") {
    str = input;
  } else {
    str = String.fromCharCode(...new Uint8Array(input));
  }
  return btoa(str)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function pemToArrayBuffer(pem) {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "");
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function importPrivateKey(pem) {
  const keyData = pemToArrayBuffer(pem);
  return crypto.subtle.importKey(
    "pkcs8",
    keyData,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

async function signJWT(payload, privateKeyPem) {
  const header = { alg: "RS256", typ: "JWT" };
  const encHeader = base64UrlEncode(JSON.stringify(header));
  const encPayload = base64UrlEncode(JSON.stringify(payload));
  const data = `${encHeader}.${encPayload}`;
  const key = await importPrivateKey(privateKeyPem);
  const sig = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(data)
  );
  const encSig = base64UrlEncode(sig);
  return `${data}.${encSig}`;
}

// ───────────────────────────────────────────────────────────
// GOOGLE OAUTH2 ACCESS TOKEN (cached per isolate)
// Used for Firebase Realtime DB admin REST access
// ───────────────────────────────────────────────────────────
let _cachedAccessToken = null;
let _cachedTokenExpiry = 0;

async function getGoogleAccessToken(env) {
  const now = Math.floor(Date.now() / 1000);
  if (_cachedAccessToken && now < _cachedTokenExpiry - 60) {
    return _cachedAccessToken;
  }

  const sa = getServiceAccount(env);
  const iat = now;
  const exp = now + 3600;

  const payload = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/identitytoolkit",
    aud: "https://oauth2.googleapis.com/token",
    iat,
    exp,
  };

  const jwt = await signJWT(payload, sa.private_key);

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[firebase] OAuth token error:", err);
    throw new Error("Firebase admin token fetch failed");
  }

  const data = await res.json();
  _cachedAccessToken = data.access_token;
  _cachedTokenExpiry = now + (data.expires_in || 3600);
  return _cachedAccessToken;
}

// ───────────────────────────────────────────────────────────
// REALTIME DATABASE — admin REST operations
// ───────────────────────────────────────────────────────────
async function dbGet(env, path) {
  const token = await getGoogleAccessToken(env);
  const base = env.FIREBASE_DATABASE_URL.replace(/\/$/, "");
  const url = `${base}/${path.replace(/^\//, "")}.json`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const t = await res.text();
    console.error(`[db] GET ${path} failed:`, t);
    throw new Error(`DB read failed: ${res.status}`);
  }
  return res.json();
}

async function dbSet(env, path, value) {
  const token = await getGoogleAccessToken(env);
  const base = env.FIREBASE_DATABASE_URL.replace(/\/$/, "");
  const url = `${base}/${path.replace(/^\//, "")}.json`;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(value),
  });
  if (!res.ok) {
    const t = await res.text();
    console.error(`[db] SET ${path} failed:`, t);
    throw new Error(`DB write failed: ${res.status}`);
  }
  return res.json();
}

async function dbUpdate(env, path, partial) {
  const token = await getGoogleAccessToken(env);
  const base = env.FIREBASE_DATABASE_URL.replace(/\/$/, "");
  const url = `${base}/${path.replace(/^\//, "")}.json`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(partial),
  });
  if (!res.ok) {
    const t = await res.text();
    console.error(`[db] UPDATE ${path} failed:`, t);
    throw new Error(`DB update failed: ${res.status}`);
  }
  return res.json();
}

async function dbPush(env, path, value) {
  const token = await getGoogleAccessToken(env);
  const base = env.FIREBASE_DATABASE_URL.replace(/\/$/, "");
  const url = `${base}/${path.replace(/^\//, "")}.json`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(value),
  });
  if (!res.ok) {
    const t = await res.text();
    console.error(`[db] PUSH ${path} failed:`, t);
    throw new Error(`DB push failed: ${res.status}`);
  }
  return res.json();
}

async function dbDelete(env, path) {
  const token = await getGoogleAccessToken(env);
  const base = env.FIREBASE_DATABASE_URL.replace(/\/$/, "");
  const url = `${base}/${path.replace(/^\//, "")}.json`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const t = await res.text();
    console.error(`[db] DELETE ${path} failed:`, t);
    throw new Error(`DB delete failed: ${res.status}`);
  }
  return true;
}

// ───────────────────────────────────────────────────────────
// FIREBASE AUTH — REST API (no SDK)
// Uses the public Web API Key (from service account is NOT possible;
// we get it from FIREBASE_PROJECT_ID + Firebase's public endpoints)
// Actually: Web API key is needed. We'll set it as FIREBASE_API_KEY
// (if not present, we fall back to identitytoolkit using admin token)
// ───────────────────────────────────────────────────────────

// Sign up with email/password
async function authSignUp(env, email, password) {
  const apiKey = env.FIREBASE_API_KEY;
  if (!apiKey) throw new Error("FIREBASE_API_KEY missing");
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    }
  );
  const data = await res.json();
  if (!res.ok) {
    const code = data?.error?.message || "SIGNUP_FAILED";
    throw Object.assign(new Error(code), { code, status: res.status });
  }
  return data;
}

// Sign in with email/password
async function authSignIn(env, email, password) {
  const apiKey = env.FIREBASE_API_KEY;
  if (!apiKey) throw new Error("FIREBASE_API_KEY missing");
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    }
  );
  const data = await res.json();
  if (!res.ok) {
    const code = data?.error?.message || "SIGNIN_FAILED";
    throw Object.assign(new Error(code), { code, status: res.status });
  }
  return data;
}

// Send password reset email
async function authSendPasswordReset(env, email) {
  const apiKey = env.FIREBASE_API_KEY;
  if (!apiKey) throw new Error("FIREBASE_API_KEY missing");
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestType: "PASSWORD_RESET", email }),
    }
  );
  const data = await res.json();
  if (!res.ok) {
    const code = data?.error?.message || "RESET_FAILED";
    throw Object.assign(new Error(code), { code, status: res.status });
  }
  return data;
}

// Verify an ID token using Firebase's secure token verification endpoint
async function authVerifyIdToken(env, idToken) {
  const apiKey = env.FIREBASE_API_KEY;
  if (!apiKey) throw new Error("FIREBASE_API_KEY missing");
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    }
  );
  const data = await res.json();
  if (!res.ok || !data.users || data.users.length === 0) {
    throw Object.assign(new Error("INVALID_ID_TOKEN"), {
      code: "INVALID_ID_TOKEN",
      status: 401,
    });
  }
  return data.users[0];
}

// Change password (admin-level — requires user to have reauthenticated first)
async function authUpdatePassword(env, idToken, newPassword) {
  const apiKey = env.FIREBASE_API_KEY;
  if (!apiKey) throw new Error("FIREBASE_API_KEY missing");
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:update?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken, password: newPassword, returnSecureToken: true }),
    }
  );
  const data = await res.json();
  if (!res.ok) {
    const code = data?.error?.message || "UPDATE_PASSWORD_FAILED";
    throw Object.assign(new Error(code), { code, status: res.status });
  }
  return data;
}

// Delete user account (admin)
async function authDeleteUser(env, uid) {
  const token = await getGoogleAccessToken(env);
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/accounts:delete`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ localId: uid }),
    }
  );
  if (!res.ok) {
    const t = await res.text();
    console.error("[auth] delete user failed:", t);
    throw new Error("DELETE_USER_FAILED");
  }
  return true;
}

export {
  getServiceAccount,
  getGoogleAccessToken,
  dbGet,
  dbSet,
  dbUpdate,
  dbPush,
  dbDelete,
  authSignUp,
  authSignIn,
  authSendPasswordReset,
  authVerifyIdToken,
  authUpdatePassword,
  authDeleteUser,
};
