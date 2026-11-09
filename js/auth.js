// ═══════════════════════════════════════════════════════════
// PrepareKora — Auth Pages Logic
// ═══════════════════════════════════════════════════════════

// ───────────────────────────────────────────────────────────
// LOGIN FORM
// ───────────────────────────────────────────────────────────
function initLoginForm() {
  const form = document.getElementById("loginForm");
  if (!form) return;

  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const errorBox = document.getElementById("loginError");
  const btn = document.getElementById("loginBtn");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorBox.classList.add("hidden");
    clearFieldError(emailInput);
    clearFieldError(passwordInput);

    const email = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value;

    let valid = true;
    if (!validateEmail(email)) {
      setFieldError(emailInput, "Please enter a valid email address.");
      valid = false;
    }
    if (!password) {
      setFieldError(passwordInput, "Password is required.");
      valid = false;
    }
    if (!valid) return;

    setButtonLoading(btn, true, "Logging in…");

    try {
      const res = await apiFetch("/api/auth/login", {
        method: "POST",
        body: { email, password },
      });

      saveSession(res.user);
      showToast(`Welcome back, ${res.user.displayName}!`, "success");

      // Redirect if pending (paid test) or go to dashboard
      const redirect = sessionStorage.getItem("pk_redirect_after_login");
      if (redirect) {
        sessionStorage.removeItem("pk_redirect_after_login");
        setTimeout(() => window.location.href = "dashboard.html", 800);
      } else {
        setTimeout(() => window.location.href = "dashboard.html", 800);
      }
    } catch (err) {
      errorBox.textContent = err.message || "Login failed. Please try again.";
      errorBox.classList.remove("hidden");
    } finally {
      setButtonLoading(btn, false);
    }
  });
}

// ───────────────────────────────────────────────────────────
// SIGNUP FORM
// ───────────────────────────────────────────────────────────
function initSignupForm() {
  const form = document.getElementById("signupForm");
  if (!form) return;

  const nameInput = document.getElementById("fullName");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const confirmInput = document.getElementById("confirmPassword");
  const errorBox = document.getElementById("signupError");
  const btn = document.getElementById("signupBtn");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorBox.classList.add("hidden");
    [nameInput, emailInput, passwordInput, confirmInput].forEach(clearFieldError);

    const fullName = nameInput.value.trim();
    const email = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value;
    const confirmPassword = confirmInput.value;

    let valid = true;
    if (fullName.length < 2 || fullName.length > 80) {
      setFieldError(nameInput, "Full name must be 2–80 characters.");
      valid = false;
    }
    if (!validateEmail(email)) {
      setFieldError(emailInput, "Please enter a valid email address.");
      valid = false;
    }
    if (!validatePassword(password)) {
      setFieldError(passwordInput, "Password must be 8–128 characters.");
      valid = false;
    }
    if (password !== confirmPassword) {
      setFieldError(confirmInput, "Passwords do not match.");
      valid = false;
    }
    if (!valid) return;

    setButtonLoading(btn, true, "Creating account…");

    try {
      const res = await apiFetch("/api/auth/signup", {
        method: "POST",
        body: { fullName, email, password, confirmPassword },
      });

      saveSession(res.user);
      showToast("Account created successfully!", "success");
      setTimeout(() => window.location.href = "dashboard.html", 800);
    } catch (err) {
      errorBox.textContent = err.message || "Signup failed. Please try again.";
      errorBox.classList.remove("hidden");
    } finally {
      setButtonLoading(btn, false);
    }
  });
}

// ───────────────────────────────────────────────────────────
// INIT
// ───────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  initLoginForm();
  initSignupForm();

  // Footer year
  const yearEl = document.getElementById("currentYear");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
});
