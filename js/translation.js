// ═══════════════════════════════════════════════════════════
// PrepareKora — Translation System (EN + AS)
// Language preference localStorage mein save hota hai
// ═══════════════════════════════════════════════════════════

(function () {
  "use strict";

  const STORAGE_KEY = "pk_lang";
  const DEFAULT_LANG = "en";

  // ─────────────────────────────────────────────────────────
  // TRANSLATIONS
  // ─────────────────────────────────────────────────────────
  const TRANSLATIONS = {
    en: {
      // Navigation
      navAbout: "About",
      navFindUs: "Find Us",
      navAdmin: "Administrator",
      navTerms: "Terms & Privacy",
      signIn: "Sign in",
      signOut: "Sign out",
      dashboard: "Dashboard",

      // Homepage hero
      heroTitle: "Prepare smarter. Practise better. Score higher.",
      heroSubtitle:
        "Free ADRE and Assam competitive exam mock tests, with daily practice, bilingual questions, and instant performance tracking.",
      createAccount: "Create free account",
      browseTests: "Browse mock tests",

      // Homepage section
      mockTestsHeading: "Mock Tests",
      mockTestsSub: "Explore mock tests and prepare for your next exam.",
      today: "Today",
      yesterday: "Yesterday",
      earlier: "Earlier",
      noMockTests: "No mock tests available.",
      prev: "← Previous",
      next: "Next →",

      // Test card
      start: "Start",
      free: "Free",
      paid: "Paid",
      questions: "questions",
      marks: "marks",
      minutes: "min",
      noLogin: "No login required",

      // Search
      searchPlaceholder: "Search tests or teachers...",
      searchHint: "Search for a mock test or teacher.",

      // Auth pages
      loginTitle: "Welcome back",
      loginSubtitle: "Log in to continue your preparation.",
      signupTitle: "Create your account",
      signupSubtitle: "Start your free preparation journey today.",
      emailLabel: "Email address",
      passwordLabel: "Password",
      confirmPasswordLabel: "Confirm password",
      fullNameLabel: "Full name",
      loginBtn: "Log in",
      signupBtn: "Create account",
      forgotPassword: "Forgot password?",
      noAccount: "Don't have an account?",
      haveAccount: "Already have an account?",
      createOne: "Create one",
      loginInstead: "Log in",
      orDivider: "or",

      // Common
      loading: "Loading...",
      retry: "Retry",
      save: "Save",
      cancel: "Cancel",
      submit: "Submit",
      close: "Close",
      back: "Back",
      ok: "OK",
      confirm: "Confirm",
      delete: "Delete",
      edit: "Edit",

      // Errors
      errRequired: "This field is required.",
      errEmail: "Please enter a valid email address.",
      errPassword: "Password must be at least 8 characters.",
      errMismatch: "Passwords do not match.",
      errName: "Name must be 2–80 characters.",
      errNetwork: "Network error. Please try again.",

      // Footer
      footerAbout: "About",
      footerFindUs: "Find Us",
      footerTerms: "Terms & Privacy"
    },

    as: {
      // Navigation
      navAbout: "আমাৰ বিষয়ে",
      navFindUs: "আমাক বিচাৰক",
      navAdmin: "প্ৰশাসক",
      navTerms: "শৰ্ত আৰু গোপনীয়তা",
      signIn: "ছাইন ইন",
      signOut: "ছাইন আউট",
      dashboard: "ডেশবৰ্ড",

      // Homepage hero
      heroTitle: "স্মাৰ্টভাৱে প্ৰস্তুতি লওক। ভালদৰে অনুশীলন কৰক। অধিক নম্বৰ লাভ কৰক।",
      heroSubtitle:
        "বিনামূলীয়া ADRE আৰু অসম প্ৰতিযোগিতামূলক পৰীক্ষাৰ মক টেস্ট, দৈনিক অনুশীলন, দ্বিভাষিক প্ৰশ্ন আৰু তাৎক্ষণিক পাৰদৰ্শন ট্ৰেকিংৰ সৈতে।",
      createAccount: "বিনামূলীয়া একাউণ্ট খোলক",
      browseTests: "মক টেস্ট চাওক",

      // Homepage section
      mockTestsHeading: "মক টেস্ট",
      mockTestsSub: "মক টেস্ট অন্বেষণ কৰক আৰু পৰীক্ষাৰ বাবে প্ৰস্তুতি লওক।",
      today: "আজি",
      yesterday: "যোৱাকালি",
      earlier: "পূৰ্বতে",
      noMockTests: "কোনো মক টেস্ট উপলব্ধ নাই।",
      prev: "← পূৰ্বৱৰ্তী",
      next: "পৰৱৰ্তী →",

      // Test card
      start: "আৰম্ভ কৰক",
      free: "বিনামূলীয়া",
      paid: "পেইড",
      questions: "প্ৰশ্ন",
      marks: "নম্বৰ",
      minutes: "মিনিট",
      noLogin: "লগইনৰ প্ৰয়োজন নাই",

      // Search
      searchPlaceholder: "টেস্ট বা শিক্ষক বিচাৰক...",
      searchHint: "মক টেস্ট বা শিক্ষক বিচাৰক।",

      // Auth pages
      loginTitle: "স্বাগতম",
      loginSubtitle: "আপোনাৰ প্ৰস্তুতি আগবঢ়াবলৈ লগইন কৰক।",
      signupTitle: "একাউণ্ট সৃষ্টি কৰক",
      signupSubtitle: "আজিয়ে বিনামূলীয়া প্ৰস্তুতি যাত্ৰা আৰম্ভ কৰক।",
      emailLabel: "ইমেইল ঠিকনা",
      passwordLabel: "পাছৱৰ্ড",
      confirmPasswordLabel: "পাছৱৰ্ড নিশ্চিত কৰক",
      fullNameLabel: "সম্পূৰ্ণ নাম",
      loginBtn: "লগইন কৰক",
      signupBtn: "একাউণ্ট সৃষ্টি কৰক",
      forgotPassword: "পাছৱৰ্ড পাহৰিলে?",
      noAccount: "একাউণ্ট নাই নেকি?",
      haveAccount: "ইতিমধ্যে একাউণ্ট আছে নেকি?",
      createOne: "এটা সৃষ্টি কৰক",
      loginInstead: "লগইন কৰক",
      orDivider: "বা",

      // Common
      loading: "লোড হৈ আছে...",
      retry: "পুনৰ চেষ্টা",
      save: "চেভ কৰক",
      cancel: "বাতিল",
      submit: "দাখিল কৰক",
      close: "বন্ধ কৰক",
      back: "পিছলৈ",
      ok: "ঠিক আছে",
      confirm: "নিশ্চিত কৰক",
      delete: "মচক",
      edit: "সম্পাদনা",

      // Errors
      errRequired: "এই ঘৰটো প্ৰয়োজনীয়।",
      errEmail: "অনুগ্ৰহ কৰি এটা বৈধ ইমেইল ঠিকনা দিয়ক।",
      errPassword: "পাছৱৰ্ড কমেও ৮ টা আক্ষৰ হ'ব লাগিব।",
      errMismatch: "পাছৱৰ্ডসমূহ মিল নাই।",
      errName: "নাম ২–৮০ আক্ষৰৰ হ'ব লাগিব।",
      errNetwork: "নেটৱৰ্ক ত্ৰুটি। পুনৰ চেষ্টা কৰক।",

      // Footer
      footerAbout: "আমাৰ বিষয়ে",
      footerFindUs: "আমাক বিচাৰক",
      footerTerms: "শৰ্ত আৰু গোপনীয়তা"
    }
  };

  // ─────────────────────────────────────────────────────────
  // GET CURRENT LANGUAGE
  // ─────────────────────────────────────────────────────────
  function getLang() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "en" || saved === "as") return saved;
    } catch (e) {}
    return DEFAULT_LANG;
  }

  function setLang(lang) {
    if (lang !== "en" && lang !== "as") return;
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (e) {}
    applyTranslations();
    document.documentElement.lang = lang === "as" ? "as" : "en";
    updateLangSwitcher(lang);
  }

  // ─────────────────────────────────────────────────────────
  // TRANSLATE FUNCTION
  // ─────────────────────────────────────────────────────────
  function t(key, fallback) {
    const lang = getLang();
    return TRANSLATIONS[lang]?.[key] || TRANSLATIONS.en[key] || fallback || key;
  }

  window.t = t;
  window.setLang = setLang;
  window.getLang = getLang;

  // ─────────────────────────────────────────────────────────
  // APPLY TRANSLATIONS TO DOM
  // ─────────────────────────────────────────────────────────
  function applyTranslations() {
    const lang = getLang();

    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      const translation = TRANSLATIONS[lang]?.[key] || TRANSLATIONS.en[key];
      if (!translation) return;

      if (el.hasAttribute("data-i18n-attr")) {
        const attr = el.getAttribute("data-i18n-attr");
        el.setAttribute(attr, translation);
      } else {
        el.textContent = translation;
      }
    });

    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      const key = el.getAttribute("data-i18n-placeholder");
      const translation = TRANSLATIONS[lang]?.[key] || TRANSLATIONS.en[key];
      if (translation) el.setAttribute("placeholder", translation);
    });

    document.querySelectorAll("[data-i18n-aria]").forEach((el) => {
      const key = el.getAttribute("data-i18n-aria");
      const translation = TRANSLATIONS[lang]?.[key] || TRANSLATIONS.en[key];
      if (translation) el.setAttribute("aria-label", translation);
    });

    // Update document lang attribute
    document.documentElement.lang = lang === "as" ? "as" : "en";
  }

  window.applyTranslations = applyTranslations;

  // ─────────────────────────────────────────────────────────
  // UPDATE LANGUAGE SWITCHER UI
  // ─────────────────────────────────────────────────────────
  function updateLangSwitcher(lang) {
    document.querySelectorAll(".lang-btn").forEach((btn) => {
      const isActive = btn.getAttribute("data-lang") === lang;
      btn.classList.toggle("is-active", isActive);
      btn.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
  }

  // ─────────────────────────────────────────────────────────
  // BIND LANGUAGE BUTTONS
  // ─────────────────────────────────────────────────────────
  function bindLangButtons() {
    document.querySelectorAll(".lang-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const lang = btn.getAttribute("data-lang");
        if (lang) setLang(lang);
      });
    });
  }

  // ─────────────────────────────────────────────────────────
  // INIT
  // ─────────────────────────────────────────────────────────
  function init() {
    const lang = getLang();
    document.documentElement.lang = lang === "as" ? "as" : "en";
    applyTranslations();
    updateLangSwitcher(lang);
    bindLangButtons();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
