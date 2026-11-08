"use strict";

(function () {

  const STRINGS = {
    en: {
      navAbout: "About", navFindUs: "Find Us", navTerms: "Terms & Privacy",
      mockTestsHeading: "Mock Tests",
      mockTestsSub: "Explore mock tests and prepare for your next exam.",
      today: "Today", yesterday: "Yesterday", earlier: "Earlier",
      noMockTests: "No mock tests available.",
      searchPlaceholder: "Search tests or teachers...",
      searchHint: "Search for a mock test or teacher.",
      noMatches: "No matching mock tests found.",
      start: "Start", questionsUnit: "Questions", minutesUnit: "Minutes",
      byLine: "By {name}", loading: "Loading…", loadFailed: "Could not load. Please refresh.",
      mockTestEyebrow: "Mock Test", questions: "Questions", minutes: "Minutes", marks: "Marks",
      rule1: "Each question carries 1 mark.",
      rule2: "There is no negative marking.",
      rule3: "The test is submitted automatically when the timer ends.",
      startTest: "Start Test",
      almostThere: "Almost there", enterDetails: "Enter your details",
      testLabel: "Test", yourName: "Your name",
      yourWhatsApp: "WhatsApp number (optional)",
      whatsAppHint: "Only used by the publisher if needed.",
      requiredField: "This field is required.",
      nameTooShort: "Name must be at least 2 characters.",
      nameTooLong: "Name is too long.",
      invalidWhatsApp: "Enter a valid WhatsApp number.",
      beginTest: "Begin test", back: "Back",
      questionOf: "Question {n} of {total}",
      markForReview: "Mark for review", unmarkReview: "Unmark review",
      clearResponse: "Clear response", previous: "Previous", next: "Next",
      submitTest: "Submit test", paletteBtn: "Questions", paletteTitle: "Questions",
      legendAnswered: "Answered", legendNotAnswered: "Not answered",
      legendMarked: "Marked", legendCurrent: "Current",
      statusAnswered: "Answered", statusNotAnswered: "Not answered",
      statusMarked: "Marked for review", statusNotVisited: "Not visited",
      confirmTitle: "Submit test?",
      confirmAnswered: "Answered", confirmUnanswered: "Unanswered", confirmMarked: "Marked",
      cancel: "Cancel", confirmYes: "Submit",
      timeUp: "Time is up. Your test has been submitted.",
      oneMinuteLeft: "One minute remaining.",
      resultEyebrow: "Result", correct: "Correct", wrong: "Wrong",
      unattempted: "Unattempted", timeTaken: "Time taken",
      download: "Download result", retake: "Retake", home: "Home",
      optionsLegend: "Answer options",
      scoreOf: "{a} of {b} correct",
      testNotFound: "Test not found",
      testNotFoundSub: "The test you are looking for does not exist or was removed.",
      backToHome: "Back to home", closeSearch: "Close search",
      resultPngTitle: "MOCK TEST RESULT", resultPngDate: "Date", resultPngName: "Name",
      adminLogin: "Admin login", adminLoginSub: "Sign in to manage your tests.",
      username: "Username", password: "Password", signIn: "Sign in", signOut: "Sign out",
      invalidLogin: "Invalid username or password.",
      dashboard: "Dashboard", myTests: "My tests", newTest: "New test", settings: "Settings",
      displayName: "Display name", save: "Save", saved: "Saved", delete: "Delete", edit: "Edit",
      copyUrl: "Copy URL", urlCopied: "Link copied",
      publish: "Publish", unpublish: "Unpublish", draft: "Draft", published: "Published",
      noTests: "No tests yet. Create your first test.",
      confirmDelete: "Delete this test permanently?",
      confirmPublish: "Publish this test? Students will see it on the homepage.",
      confirmUnpublish: "Unpublish this test? It will be hidden from the homepage.",
      testTitle: "Test title", durationMinutes: "Duration (minutes)",
      addQuestion: "Add question", removeQuestion: "Remove",
      questionText: "Question", optionText: "Option", correctAnswer: "Correct answer",
      saveDraft: "Save draft", publishNow: "Publish now",
      backToDashboard: "Back to dashboard", backToTests: "Back to tests",
      deleteQuestion: "Delete question",
      testCreated: "Test created", testUpdated: "Test updated", testDeleted: "Test deleted",
      testPublished: "Test published", testUnpublished: "Test unpublished",
      fillAllFields: "Please fill all required fields.",
      atLeastOneQuestion: "Add at least one question.",
      needAnswer: "Mark the correct answer for every question.",
      nameUpdated: "Display name updated", saving: "Saving…", required: "Required",

      aboutTitle: "About",
      aboutSubtitle: "PrepareKora.in — free mock tests for competitive exam preparation.",
      aboutIntro1: "PrepareKora.in is a simple, free platform where students can practice mock tests for competitive exams. Every test is created by an experienced teacher and published directly by them.",
      aboutIntro2: "Each test includes a timer, question navigation, mark-for-review and a downloadable result card so you can track your progress over time.",
      aboutIntro3: "The site is available in English and Assamese. Content created in English is translated automatically, so Assamese-medium students can prepare in their own language.",
      aboutMentors: "Mentors and Teachers",
      aboutRoleMentor: "Mentor & Teacher",
      aboutDevelopedBy: "Developed by",
      aboutDevDesc: "Website designed and developed by Yadav Web Technologies, founded by Sir Yadav Subba.",
      aboutFooter: "If you have any questions or feedback, please reach us via the <a href=\"find-us.html\" style=\"text-decoration: underline;\">Find Us</a> page.",

      interruptTitle: "Test Interrupted",
      interruptBody: "You left the test screen. Please stay on the test page.",
      resumeTest: "Resume test",
      terminatedTitle: "Test Terminated",
      terminatedBody: "You have exceeded the allowed limit for leaving the test screen. You cannot restart this test in this session.",
      interruptWarn: "Warning {n} of {total}",

      adminInterruption: "Interruption warnings",
      adminInterruptionEnable: "Enable interruption warnings",
      adminInterruptionEnableHint: "When enabled, switching tabs during a test counts as a violation.",
      adminInterruptionDuration: "Termination cooldown (minutes)",
      adminInterruptionDurationHint: "After 5 violations, the student is blocked from retaking for this many minutes.",

      termsTitle: "Terms & Privacy",
      termsSubtitle: "Please read these terms carefully before using PrepareKora.in.",
      termsEffectiveLabel: "Effective date:",
      termsUpdatedLabel: "Last updated:",
      termsWebsiteLabel: "Website:",
      termsContactLabel: "Contact:",

      termsSection1Title: "1. Terms of Service",

      terms11Title: "1.1 Acceptance",
      terms11Body: 'By accessing or using PrepareKora.in ("the Website", "we", "us"), you agree to be bound by these Terms of Service. If you do not agree, please do not use the Website.',

      terms12Title: "1.2 Nature of the Service",
      terms12Body: 'PrepareKora.in provides free, non-commercial mock tests for exam preparation. All tests are created and published by independent teachers ("Publishers"). The Website acts as a platform for hosting these tests.',

      terms13Title: "1.3 Eligibility",
      terms13Body: "The Website is intended for students of all ages preparing for competitive exams. If you are under the age of 18, please use the Website only with the consent of a parent or guardian.",

      terms14Title: "1.4 User Responsibilities",
      terms14Body: '<ul><li>You must provide a valid name before starting any test.</li><li>The name you provide will appear on your result.</li><li>You must not share your test link with others during an active attempt.</li><li>You must not attempt to cheat, manipulate, or interfere with the test system, including switching tabs or leaving the test screen (see 1.5).</li><li>You must not use the Website for any unlawful purpose.</li></ul>',

      terms15Title: "1.5 Test Interruption Policy",
      terms15Body: "To maintain fairness, the Website monitors whether you leave the test screen (by switching tabs, minimizing the browser, or leaving the app). Each violation is recorded. After a configured number of violations (default: 5), your test will be terminated and you will be blocked from retaking it for a short period (default: 5 minutes). This behaviour is intentional and forms part of your agreement to use the Website.",

      terms16Title: "1.6 Publishers",
      terms16Body: "Publishers are independent teachers who create test content. The Website does not verify the accuracy of any test, question, or answer. We are not responsible for errors in content created by Publishers.",

      terms17Title: "1.7 Intellectual Property",
      terms17Body: "Test content is owned by the respective Publishers. The Website design, code, and branding are the property of PrepareKora.in and Yadav Web Technologies. You may not copy, redistribute, or republish any content without written permission.",

      terms18Title: "1.8 No Warranty",
      terms18Body: 'The Website is provided "as is" and "as available", without any warranty of any kind, express or implied. We do not guarantee that the Website will be error-free, uninterrupted, or secure.',

      terms19Title: "1.9 Limitation of Liability",
      terms19Body: "To the maximum extent permitted by law, PrepareKora.in, its founders, admins, and Publishers shall not be liable for any indirect, incidental, or consequential damages arising from your use of the Website, including but not limited to loss of data, exam outcomes, or academic results.",

      terms110Title: "1.10 Termination of Access",
      terms110Body: "We reserve the right to suspend or terminate your access to the Website at any time, without notice, for violation of these terms or for any other reason.",

      terms111Title: "1.11 Changes to Terms",
      terms111Body: "We may update these terms from time to time. Continued use of the Website after changes constitutes acceptance of the updated terms.",

      terms112Title: "1.12 Governing Law",
      terms112Body: "These terms are governed by the laws of India. Any disputes shall be subject to the jurisdiction of courts in Assam, India.",

      termsSection2Title: "2. Privacy Policy",

      terms21Title: "2.1 Information We Collect",
      terms21Body: '<p>When you take a mock test, we collect:</p><ul><li><strong>Your name</strong> — required, used to identify you on your result card.</li><li><strong>Your WhatsApp number</strong> — optional, used only if the Publisher needs to contact you.</li><li><strong>Test answers and score</strong> — used to calculate and display your result.</li><li><strong>Time taken</strong> and timestamp of submission.</li><li><strong>Test title</strong> you attempted.</li></ul><p>We do <strong>not</strong> collect your email, address, payment information, or any other personal data beyond what is listed above.</p>',

      terms22Title: "2.2 Why We Collect It",
      terms22Body: "<ul><li>To calculate and display your test result.</li><li>To generate your result card (which includes your name).</li><li>To allow the Publisher of that test to view student performance.</li><li>To help Publishers improve their tests based on aggregate data.</li></ul>",

      terms23Title: "2.3 Who Can See Your Data",
      terms23Body: '<ul><li><strong>You</strong> — via the result screen immediately after submission.</li><li><strong>The Publisher of that test</strong> — via an admin dashboard, they can see your name, WhatsApp (if provided), score, and submission time.</li><li><strong>PrepareKora.in administrators</strong> — for operational support.</li></ul><p>Your data is <strong>not</strong> visible to other students, not publicly searchable, and not shared with any third party.</p>',

      terms24Title: "2.4 How Data Is Stored",
      terms24Body: "Data is stored in Firebase Realtime Database (Google Cloud). All data is transmitted over encrypted HTTPS connections. Only authenticated administrators can access the raw data.",

      terms25Title: "2.5 Data Retention",
      terms25Body: "Submissions are retained as long as the corresponding test exists. Each test stores up to the most recent 500 submissions; older submissions are automatically deleted.",

      terms26Title: "2.6 No Selling or Sharing",
      terms26Body: "We <strong>never</strong> sell, rent, trade, or share your personal data with third parties for marketing, advertising, or any commercial purpose.",

      terms27Title: "2.7 Cookies and Local Storage",
      terms27Body: "We use browser localStorage to remember your language preference and to cache test questions. We do <strong>not</strong> use tracking cookies, ad networks, or third-party analytics.",

      terms28Title: "2.8 Your Rights",
      terms28Body: '<p>You have the right to:</p><ul><li>Request a copy of your stored data.</li><li>Request deletion of your submissions.</li><li>Withdraw consent at any time.</li></ul><p>To exercise any of these rights, contact us at <a href="mailto:contact@preparekora.in">contact@preparekora.in</a> with your name and the test you attempted. We will respond within 7 working days.</p>',

      terms29Title: "2.9 Children's Privacy",
      terms29Body: "Students under 18 should use the Website with parental or guardian consent. If a parent believes their child has submitted personal data without consent, they may contact us for deletion.",

      terms210Title: "2.10 Data Security",
      terms210Body: "We take reasonable measures to protect your data, including server-side authentication, encrypted storage, and restricted access. However, no system is 100% secure, and we cannot guarantee absolute security.",

      terms211Title: "2.11 Changes to Privacy Policy",
      terms211Body: 'We may update this policy. Significant changes will be indicated by updating the "Last updated" date at the top of this page.',

      terms212Title: "2.12 Contact for Complaints",
      terms212Body: '<p>For any privacy-related complaint or data deletion request:</p><p><strong>Email:</strong> <a href="mailto:contact@preparekora.in">contact@preparekora.in</a><br><strong>Prepared by:</strong> PrepareKora.in · Yadav Web Technologies</p>',

      termsFooterConfirm: "By using PrepareKora.in, you confirm that you have read and understood these Terms of Service and Privacy Policy."
    },

    as: {
      navAbout: "আমাৰ বিষয়ে", navFindUs: "আমাক বিচাৰক", navTerms: "চৰ্তাৱলী আৰু গোপনীয়তা",
      mockTestsHeading: "মক টেষ্ট",
      mockTestsSub: "মক টেষ্ট চাওক আৰু পৰীক্ষাৰ বাবে প্ৰস্তুতি চলাওক।",
      today: "আজি", yesterday: "যোৱাকালি", earlier: "পূৰ্বে",
      noMockTests: "কোনো মক টেষ্ট উপলব্ধ নাই।",
      searchPlaceholder: "পৰীক্ষা বা শিক্ষক বিচাৰক...",
      searchHint: "মক টেষ্ট বা শিক্ষক বিচাৰক।",
      noMatches: "কোনো মিল থকা মক টেষ্ট পোৱা নগ'ল।",
      start: "আৰম্ভ", questionsUnit: "প্ৰশ্ন", minutesUnit: "মিনিট",
      byLine: "{name}ৰ দ্বাৰা", loading: "লোড হৈ আছে…",
      loadFailed: "লোড কৰিব পৰা নগ'ল। পুনৰ লোড কৰক।",
      mockTestEyebrow: "মক টেষ্ট", questions: "প্ৰশ্ন", minutes: "মিনিট", marks: "নম্বৰ",
      rule1: "প্ৰতিটো প্ৰশ্নৰ বাবে ১ নম্বৰ।",
      rule2: "ঋণাত্মক নম্বৰ কটা নহয়।",
      rule3: "সময় শেষ হ'লে পৰীক্ষা স্বয়ংক্ৰিয়ভাৱে জমা হ'ব।",
      startTest: "পৰীক্ষা আৰম্ভ কৰক",
      almostThere: "প্ৰায় সম্পূৰ্ণ", enterDetails: "আপোনাৰ তথ্য দিয়ক",
      testLabel: "পৰীক্ষা", yourName: "আপোনাৰ নাম",
      yourWhatsApp: "হোৱাটছএপ নম্বৰ (ঐচ্ছিক)",
      whatsAppHint: "প্ৰয়োজন হ'লে প্ৰকাশকে ব্যৱহাৰ কৰিব পাৰে।",
      requiredField: "এই ক্ষেত্ৰখন পূৰণ কৰাটো আৱশ্যক।",
      nameTooShort: "নাম কমেও ২ আখৰৰ হ'ব লাগিব।",
      nameTooLong: "নাম অতি দীঘল।",
      invalidWhatsApp: "বৈধ হোৱাটছএপ নম্বৰ দিয়ক।",
      beginTest: "পৰীক্ষা আৰম্ভ কৰক", back: "পিছলৈ",
      questionOf: "প্ৰশ্ন {n} / {total}",
      markForReview: "পৰ্যালোচনাৰ বাবে চিহ্নিত কৰক", unmarkReview: "চিহ্ন আঁতৰাওক",
      clearResponse: "উত্তৰ মচক", previous: "পূৰ্বৱৰ্তী", next: "পৰৱৰ্তী",
      submitTest: "পৰীক্ষা জমা দিয়ক", paletteBtn: "প্ৰশ্ন", paletteTitle: "প্ৰশ্নসমূহ",
      legendAnswered: "উত্তৰ দিয়া", legendNotAnswered: "উত্তৰ নিদিয়া",
      legendMarked: "চিহ্নিত", legendCurrent: "বৰ্তমান",
      statusAnswered: "উত্তৰ দিয়া হৈছে", statusNotAnswered: "উত্তৰ দিয়া নাই",
      statusMarked: "পৰ্যালোচনাৰ বাবে চিহ্নিত", statusNotVisited: "পৰিদৰ্শন কৰা নাই",
      confirmTitle: "পৰীক্ষা জমা দিবনে?",
      confirmAnswered: "উত্তৰ দিয়া", confirmUnanswered: "উত্তৰ নিদিয়া", confirmMarked: "চিহ্নিত",
      cancel: "বাতিল", confirmYes: "জমা দিয়ক",
      timeUp: "সময় শেষ। আপোনাৰ পৰীক্ষা জমা কৰা হৈছে।",
      oneMinuteLeft: "এক মিনিট বাকী আছে।",
      resultEyebrow: "ফলাফল", correct: "শুদ্ধ", wrong: "ভুল",
      unattempted: "উত্তৰ নিদিয়া", timeTaken: "লগা সময়",
      download: "ফলাফল ডাউনলোড কৰক", retake: "পুনৰ চেষ্টা", home: "মুখ্য পৃষ্ঠা",
      optionsLegend: "উত্তৰৰ বিকল্পসমূহ",
      scoreOf: "{a} / {b} শুদ্ধ",
      testNotFound: "পৰীক্ষা পোৱা নগ'ল",
      testNotFoundSub: "আপুনি বিচৰা পৰীক্ষাটো নাই বা আঁতৰোৱা হৈছে।",
      backToHome: "মুখ্য পৃষ্ঠালৈ ঘূৰি যাওক", closeSearch: "সন্ধান বন্ধ কৰক",
      resultPngTitle: "মক টেষ্টৰ ফলাফল", resultPngDate: "তাৰিখ", resultPngName: "নাম",
      adminLogin: "প্ৰশাসক লগইন",
      adminLoginSub: "আপোনাৰ পৰীক্ষা পৰিচালনা কৰিবলৈ ছাইন ইন কৰক।",
      username: "ব্যৱহাৰকাৰী নাম", password: "পাছৱৰ্ড",
      signIn: "ছাইন ইন", signOut: "ছাইন আউট",
      invalidLogin: "অবৈধ ব্যৱহাৰকাৰী নাম বা পাছৱৰ্ড।",
      dashboard: "ডেশব'ৰ্ড", myTests: "মোৰ পৰীক্ষা", newTest: "নতুন পৰীক্ষা",
      settings: "ছেটিংছ", displayName: "প্ৰদৰ্শন নাম",
      save: "চেছ কৰক", saved: "চেছ হ'ল", delete: "মচক", edit: "সম্পাদনা",
      copyUrl: "URL কপি কৰক", urlCopied: "লিংক কপি হ'ল",
      publish: "প্ৰকাশ", unpublish: "অপ্ৰকাশ", draft: "খচৰা", published: "প্ৰকাশিত",
      noTests: "এতিয়ালৈকে কোনো পৰীক্ষা নাই। প্ৰথম পৰীক্ষা সৃষ্টি কৰক।",
      confirmDelete: "এই পৰীক্ষাটো স্থায়ীভাৱে মচিবনে?",
      confirmPublish: "এই পৰীক্ষাটো প্ৰকাশ কৰিবনে? ছাত্ৰ-ছাত্ৰীয়ে ইয়াক দেখিব।",
      confirmUnpublish: "এই পৰীক্ষাটো অপ্ৰকাশ কৰিবনে? ই গোপন হ'ব।",
      testTitle: "পৰীক্ষাৰ শিৰোনাম", durationMinutes: "সময় (মিনিট)",
      addQuestion: "প্ৰশ্ন যোগ কৰক", removeQuestion: "আঁতৰাওক",
      questionText: "প্ৰশ্ন", optionText: "বিকল্প", correctAnswer: "শুদ্ধ উত্তৰ",
      saveDraft: "খচৰা চেছ কৰক", publishNow: "এতিয়া প্ৰকাশ কৰক",
      backToDashboard: "ডেশব'ৰ্ডলৈ ঘূৰি যাওক", backToTests: "পৰীক্ষাসমূহলৈ ঘূৰি যাওক",
      deleteQuestion: "প্ৰশ্ন মচক",
      testCreated: "পৰীক্ষা সৃষ্টি হ'ল", testUpdated: "পৰীক্ষা আপডেট হ'ল",
      testDeleted: "পৰীক্ষা মচা হ'ল", testPublished: "পৰীক্ষা প্ৰকাশ হ'ল",
      testUnpublished: "পৰীক্ষা অপ্ৰকাশ হ'ল",
      fillAllFields: "সকলো প্ৰয়োজনীয় ক্ষেত্ৰ পূৰণ কৰক।",
      atLeastOneQuestion: "কমেও এটা প্ৰশ্ন যোগ কৰক।",
      needAnswer: "প্ৰতিটো প্ৰশ্নৰ বাবে শুদ্ধ উত্তৰ চিহ্নিত কৰক।",
      nameUpdated: "প্ৰদৰ্শন নাম আপডেট হ'ল", saving: "চেছ হৈ আছে…", required: "আৱশ্যক",

      aboutTitle: "আমাৰ বিষয়ে",
      aboutSubtitle: "PrepareKora.in — প্ৰতিযোগিতামূলক পৰীক্ষাৰ প্ৰস্তুতিৰ বাবে বিনামূলীয়া মক টেষ্ট।",
      aboutIntro1: "PrepareKora.in এখন সৰল, বিনামূলীয়া প্লেটফৰ্ম য'ত ছাত্ৰ-ছাত্ৰীয়ে প্ৰতিযোগিতামূলক পৰীক্ষাৰ বাবে মক টেষ্ট অনুশীলন কৰিব পাৰে। প্ৰতিটো পৰীক্ষা এজন অভিজ্ঞ শিক্ষকে সৃষ্টি কৰে আৰু তেওঁলোকেই প্ৰকাশ কৰে।",
      aboutIntro2: "প্ৰতিটো পৰীক্ষাত এটা টাইমাৰ, প্ৰশ্ন নেভিগেশ্যন, পৰ্যালোচনাৰ বাবে চিহ্নিত কৰাৰ সুবিধা, আৰু এটা ডাউনলোডযোগ্য ফলাফল কাৰ্ড থাকে যাতে আপুনি সময়ৰ সৈতে আপোনাৰ অগ্ৰগতি ট্ৰেক কৰিব পাৰে।",
      aboutIntro3: "ৱেবছাইটটো ইংৰাজী আৰু অসমীয়াত উপলব্ধ। ইংৰাজীত সৃষ্টি কৰা সমল স্বয়ংক্ৰিয়ভাৱে অনুবাদ কৰা হয়, যাতে অসমীয়া মাধ্যমৰ ছাত্ৰ-ছাত্ৰীয়ে তেওঁলোকৰ নিজৰ ভাষাত প্ৰস্তুতি চলাব পাৰে।",
      aboutMentors: "মেন্টৰ আৰু শিক্ষকসকল",
      aboutRoleMentor: "মেন্টৰ আৰু শিক্ষক",
      aboutDevelopedBy: "বিকাশক",
      aboutDevDesc: "ৱেবছাইট Yadav Web Technologies য়ে ডিজাইন আৰু বিকাশ কৰিছে, যিটোৰ প্ৰতিষ্ঠাপক ছাৰ Yadav Subba।",
      aboutFooter: "যদি আপোনাৰ কোনো প্ৰশ্ন বা মতামত আছে, অনুগ্ৰহ কৰি <a href=\"find-us.html\" style=\"text-decoration: underline;\">আমাক বিচাৰক</a> পৃষ্ঠাৰ জৰিয়তে আমাৰ সৈতে যোগাযোগ কৰক।",

      interruptTitle: "পৰীক্ষা বাধাগ্ৰস্ত",
      interruptBody: "আপুনি পৰীক্ষাৰ পৃষ্ঠা এৰি গৈছে। অনুগ্ৰহ কৰি পৰীক্ষাৰ পৃষ্ঠাত থাকক।",
      resumeTest: "পৰীক্ষা পুনৰ আৰম্ভ কৰক",
      terminatedTitle: "পৰীক্ষা বন্ধ কৰা হ'ল",
      terminatedBody: "আপুনি পৰীক্ষাৰ পৃষ্ঠা এৰি যোৱাৰ অনুমোদিত সীমা অতিক্ৰম কৰিছে। এই ছেছনত আপুনি এই পৰীক্ষা পুনৰ আৰম্ভ কৰিব নোৱাৰিব।",
      interruptWarn: "সতৰ্কবাণী {n} / {total}",

      adminInterruption: "পৰীক্ষা বাধাৰ সতৰ্কবাণী",
      adminInterruptionEnable: "বাধাৰ সতৰ্কবাণী সক্ৰিয় কৰক",
      adminInterruptionEnableHint: "সক্ৰিয় থাকিলে, পৰীক্ষাৰ সময়ত টেব সলনি কৰিলে বাধা হিচাপে গণনা কৰা হ'ব।",
      adminInterruptionDuration: "বন্ধৰ সময় (মিনিট)",
      adminInterruptionDurationHint: "৫ বাৰ বাধাৰ পিছত, ছাত্ৰ-ছাত্ৰীক ইমান মিনিটলৈ পুনৰ পৰীক্ষা দিবলৈ অনুমতি নাথাকিব।",

      termsTitle: "চৰ্তাৱলী আৰু গোপনীয়তা",
      termsSubtitle: "PrepareKora.in ব্যৱহাৰ কৰাৰ আগতে এই চৰ্তাৱলী সাৱধানে পঢ়ক।",
      termsEffectiveLabel: "কাৰ্যকৰী তাৰিখ:",
      termsUpdatedLabel: "শেষ আপডেট:",
      termsWebsiteLabel: "ৱেবছাইট:",
      termsContactLabel: "যোগাযোগ:",

      termsSection1Title: "১. সেৱাৰ চৰ্তাৱলী",

      terms11Title: "১.১ গ্ৰহণ",
      terms11Body: 'PrepareKora.in ("ৱেবছাইট", "আমি") ব্যৱহাৰ কৰি বা প্ৰৱেশ কৰি, আপুনি এই সেৱাৰ চৰ্তাৱলী মানি ল\'বলৈ সন্মত। যদি আপুনি সন্মত নহয়, অনুগ্ৰহ কৰি ৱেবছাইটটো ব্যৱহাৰ নকৰিব।',

      terms12Title: "১.২ সেৱাৰ প্ৰকৃতি",
      terms12Body: 'PrepareKora.in য়ে পৰীক্ষাৰ প্ৰস্তুতিৰ বাবে বিনামূলীয়া, অপেছাদাৰী মক টেষ্ট প্ৰদান কৰে। সকলো পৰীক্ষা স্বতন্ত্ৰ শিক্ষকে ("প্ৰকাশক") সৃষ্টি আৰু প্ৰকাশ কৰে। ৱেবছাইটে এই পৰীক্ষাসমূহ হোষ্ট কৰাৰ বাবে এটা প্লেটফৰ্ম হিচাপে কাম কৰে।',

      terms13Title: "১.৩ যোগ্যতা",
      terms13Body: "ৱেবছাইটটো প্ৰতিযোগিতামূলক পৰীক্ষাৰ বাবে প্ৰস্তুতি চলোৱা সকলো বয়সৰ ছাত্ৰ-ছাত্ৰীৰ বাবে। যদি আপুনি ১৮ বছৰৰ তলৰ, অনুগ্ৰহ কৰি পিতৃ-মাতৃ বা অভিভাৱকৰ সন্মতি সৈতে ৱেবছাইটটো ব্যৱহাৰ কৰক।",

      terms14Title: "১.৪ ব্যৱহাৰকাৰীৰ দায়িত্ব",
      terms14Body: '<ul><li>কোনো পৰীক্ষা আৰম্ভ কৰাৰ আগতে আপুনি এটা বৈধ নাম প্ৰদান কৰিব লাগিব।</li><li>আপুনি প্ৰদান কৰা নামটো আপোনাৰ ফলাফলত দেখুওৱা হ\'ব।</li><li>সক্ৰিয়ভাৱে পৰীক্ষা দিয়াৰ সময়ত আপুনি আনৰ সৈতে আপোনাৰ পৰীক্ষাৰ লিংক শ্বেয়াৰ নকৰিব।</li><li>আপুনি প্ৰতাৰণা, ফেৰফাৰ, বা পৰীক্ষা পদ্ধতিত হস্তক্ষেপ কৰাৰ চেষ্টা নকৰিব, য\'ত টেব সলনি কৰা বা পৰীক্ষাৰ পৃষ্ঠা এৰি যোৱা অন্তৰ্ভুক্ত (১.৫ চাওক)।</li><li>আপুনি কোনো অবৈধ উদ্দেশ্যৰ বাবে ৱেবছাইটটো ব্যৱহাৰ নকৰিব।</li></ul>',

      terms15Title: "১.৫ পৰীক্ষা বাধাৰ নীতি",
      terms15Body: "ন্যায্যতা বজাই ৰাখিবলৈ, ৱেবছাইটে আপুনি পৰীক্ষাৰ পৃষ্ঠা এৰি যায়নে নাই পৰ্যবেক্ষণ কৰে (টেব সলনি কৰি, ব্ৰাউজাৰ মিনিমাইজ কৰি, বা এপ এৰি গৈ)। প্ৰতিটো উলংঘন ৰেকৰ্ড কৰা হয়। এটা নিৰ্ধাৰিত সংখ্যক উলংঘনৰ পিছত (ডিফল্ট: ৫), আপোনাৰ পৰীক্ষা বন্ধ কৰা হ'ব আৰু এটা চুটি সময়ৰ বাবে (ডিফল্ট: ৫ মিনিট) পুনৰ পৰীক্ষা দিয়াত প্ৰতিবন্ধক কৰা হ'ব। এই আচৰণ ইচ্ছাকৃত আৰু ৱেবছাইটটো ব্যৱহাৰ কৰাৰ আপোনাৰ চুক্তিৰ এটা অংশ।",

      terms16Title: "১.৬ প্ৰকাশক",
      terms16Body: "প্ৰকাশকসকল স্বতন্ত্ৰ শিক্ষক যিয়ে পৰীক্ষাৰ সমল সৃষ্টি কৰে। ৱেবছাইটে কোনো পৰীক্ষা, প্ৰশ্ন বা উত্তৰৰ শুদ্ধতা পৰীক্ষা নকৰে। প্ৰকাশকে সৃষ্টি কৰা সমলত থকা ত্ৰুটিৰ বাবে আমি দায়ী নহয়।",

      terms17Title: "১.৭ বৌদ্ধিক সম্পত্তি",
      terms17Body: "পৰীক্ষাৰ সমলৰ মালিক সংশ্লিষ্ট প্ৰকাশক। ৱেবছাইটৰ ডিজাইন, ক'ড, আৰু ব্ৰেণ্ডিং PrepareKora.in আৰু Yadav Web Technologies ৰ সম্পত্তি। লিখিত অনুমতি নোহোৱাকৈ আপুনি কোনো সমল কপি, পুনৰ বিতৰণ বা পুনৰ প্ৰকাশ কৰিব নোৱাৰে।",

      terms18Title: "১.৮ কোনো ৱাৰেণ্টি নাই",
      terms18Body: 'ৱেবছাইটটো "যেনেকৈ আছে" আৰু "যেনেকৈ উপলব্ধ" হিচাপে প্ৰদান কৰা হয়, কোনো ধৰণৰ ৱাৰেণ্টি, স্পষ্ট বা অৱগত, নোহোৱাকৈ। আমি গেৰাণ্টি নিদিওঁ যে ৱেবছাইটটো ত্ৰুটিমুক্ত, নিৰবচ্ছিন্ন বা সুৰক্ষিত হ\'ব।',

      terms19Title: "১.৯ দায়বদ্ধতাৰ সীমা",
      terms19Body: "আইনৰ দ্বাৰা অনুমোদিত সৰ্বাধিক পৰিমাণলৈকে, PrepareKora.in, ইয়াৰ প্ৰতিষ্ঠাপক, প্ৰশাসক, আৰু প্ৰকাশকসকল ৱেবছাইটটো আপোনাৰ ব্যৱহাৰৰ পৰা উদ্ভৱ হোৱা কোনো পৰোক্ষ, আকস্মিক বা পৰিণামজনিত ক্ষতিৰ বাবে দায়বদ্ধ নহ'ব, য'ত তথ্য হেৰুওৱা, পৰীক্ষাৰ ফলাফল, বা শৈক্ষিক ফলাফল অন্তৰ্ভুক্ত কিন্তু ইয়াৰ মাজতে সীমাবদ্ধ নহয়।",

      terms110Title: "১.১০ প্ৰৱেশ বন্ধ কৰা",
      terms110Body: "এই চৰ্তাৱলী উলংঘন বা আন কোনো কাৰণৰ বাবে, যিকোনো সময়ত, জাননী নোহোৱাকৈ আপোনাৰ প্ৰৱেশ স্থগিত বা বন্ধ কৰাৰ অধিকাৰ আমি সংৰক্ষিত কৰো।",

      terms111Title: "১.১১ চৰ্তাৱলীত পৰিৱৰ্তন",
      terms111Body: "আমি সময়ে সময়ে এই চৰ্তাৱলী আপডেট কৰিব পাৰো। পৰিৱৰ্তনৰ পিছত ৱেবছাইটৰ অবিৰত ব্যৱহাৰে আপডেট কৰা চৰ্তাৱলীৰ গ্ৰহণ গঠন কৰে।",

      terms112Title: "১.১২ প্ৰযোজ্য আইন",
      terms112Body: "এই চৰ্তাৱলী ভাৰতৰ আইনৰ দ্বাৰা পৰিচালিত। যিকোনো বিবাদ অসম, ভাৰতৰ আদালতৰ এক্তিয়াৰাধীন হ'ব।",

      termsSection2Title: "২. গোপনীয়তা নীতি",

      terms21Title: "২.১ আমি সংগ্ৰহ কৰা তথ্য",
      terms21Body: '<p>আপুনি মক টেষ্ট দিয়াৰ সময়ত আমি সংগ্ৰহ কৰো:</p><ul><li><strong>আপোনাৰ নাম</strong> — আৱশ্যক, আপোনাৰ ফলাফল কাৰ্ডত আপোনাক চিনাক্ত কৰিবলৈ ব্যৱহাৰ কৰা হয়।</li><li><strong>আপোনাৰ হোৱাটছএপ নম্বৰ</strong> — ঐচ্ছিক, প্ৰকাশকে আপোনাৰ সৈতে যোগাযোগ কৰাৰ প্ৰয়োজন হ\'লে হে ব্যৱহাৰ কৰা হয়।</li><li><strong>পৰীক্ষাৰ উত্তৰ আৰু স্ক\'ৰ</strong> — আপোনাৰ ফলাফল গণনা আৰু প্ৰদৰ্শন কৰিবলৈ ব্যৱহাৰ কৰা হয়।</li><li><strong>লগা সময়</strong> আৰু জমা দিয়াৰ টাইমষ্টেম্প।</li><li><strong>পৰীক্ষাৰ শিৰোনাম</strong> যিটো আপুনি চেষ্টা কৰিছে।</li></ul><p>আমি আপোনাৰ ইমেইল, ঠিকনা, পেমেন্ট তথ্য, বা ওপৰত তালিকাভুক্ত তথ্যৰ বাহিৰে আন কোনো ব্যক্তিগত তথ্য <strong>সংগ্ৰহ নকৰো</strong>।</p>',

      terms22Title: "২.২ কিয় সংগ্ৰহ কৰো",
      terms22Body: "<ul><li>আপোনাৰ পৰীক্ষাৰ ফলাফল গণনা আৰু প্ৰদৰ্শন কৰিবলৈ।</li><li>আপোনাৰ ফলাফল কাৰ্ড সৃষ্টি কৰিবলৈ (য'ত আপোনাৰ নাম অন্তৰ্ভুক্ত)।</li><li>সেই পৰীক্ষাৰ প্ৰকাশকক ছাত্ৰ-ছাত্ৰীৰ প্ৰদৰ্শন চাবলৈ অনুমতি দিবলৈ।</li><li>সমষ্টিগত তথ্যৰ ওপৰত আধাৰিত প্ৰকাশকসকলক তেওঁলোকৰ পৰীক্ষা উন্নত কৰাত সহায় কৰিবলৈ।</li></ul>",

      terms23Title: "২.৩ কোনে আপোনাৰ তথ্য দেখিব পাৰে",
      terms23Body: '<ul><li><strong>আপুনি</strong> — জমা দিয়াৰ লগে লগে ফলাফল স্ক্ৰীণৰ জৰিয়তে।</li><li><strong>সেই পৰীক্ষাৰ প্ৰকাশক</strong> — এটা প্ৰশাসক ডেশব\'ৰ্ডৰ জৰিয়তে, তেওঁলোকে আপোনাৰ নাম, হোৱাটছএপ (যদি প্ৰদান কৰা হয়), স্ক\'ৰ, আৰু জমা দিয়াৰ সময় চাব পাৰে।</li><li><strong>PrepareKora.in প্ৰশাসকসকল</strong> — কাৰ্য্যক্ষম সহায়ৰ বাবে।</li></ul><p>আপোনাৰ তথ্য আন ছাত্ৰ-ছাত্ৰীৰ ওচৰত <strong>দৃশ্যমান নহয়</strong>, ৰাজহুৱাভাৱে সন্ধানযোগ্য নহয়, আৰু কোনো তৃতীয় পক্ষৰ সৈতে শ্বেয়াৰ কৰা নহয়।</p>',

      terms24Title: "২.৪ তথ্য কেনেকৈ সংৰক্ষিত হয়",
      terms24Body: "তথ্য Firebase Realtime Database (Google Cloud) ত সংৰক্ষিত হয়। সকলো তথ্য এনক্ৰিপ্ট কৰা HTTPS সংযোগৰ জৰিয়তে প্ৰেৰণ কৰা হয়। কেৱল প্ৰমাণিত প্ৰশাসকসকলেহে কেঁচা তথ্য প্ৰৱেশ কৰিব পাৰে।",

      terms25Title: "২.৫ তথ্য ৰখা",
      terms25Body: "সংশ্লিষ্ট পৰীক্ষা যেতিয়ালৈকে আছে, তেতিয়ালৈকে জমা ৰখা হয়। প্ৰতিটো পৰীক্ষাই সাম্প্ৰতিক ৫০০ টা জমালৈকে সংৰক্ষণ কৰে; পুৰণি জমা স্বয়ংক্ৰিয়ভাৱে মচা হয়।",

      terms26Title: "২.৬ বিক্ৰী বা ভাগ কৰা নহয়",
      terms26Body: "আমি কেতিয়াও বিপণন, বিজ্ঞাপন, বা কোনো বাণিজ্যিক উদ্দেশ্যৰ বাবে তৃতীয় পক্ষৰ সৈতে আপোনাৰ ব্যক্তিগত তথ্য <strong>বিক্ৰী, ভাড়া, বিনিময় বা শ্বেয়াৰ নকৰো</strong>।",

      terms27Title: "২.৭ কুকিজ আৰু লোকেল ষ্ট'ৰেজ",
      terms27Body: "আপোনাৰ ভাষাৰ পছন্দ মনত ৰাখিবলৈ আৰু পৰীক্ষাৰ প্ৰশ্ন কেশ কৰিবলৈ আমি ব্ৰাউজাৰ localStorage ব্যৱহাৰ কৰো। আমি ট্ৰেকিং কুকিজ, বিজ্ঞাপন নেটৱৰ্ক, বা তৃতীয় পক্ষৰ বিশ্লেষণ <strong>ব্যৱহাৰ নকৰো</strong>।",

      terms28Title: "২.৮ আপোনাৰ অধিকাৰ",
      terms28Body: '<p>আপোনাৰ অধিকাৰ আছে:</p><ul><li>আপোনাৰ সংৰক্ষিত তথ্যৰ এটা কপি অনুৰোধ কৰা।</li><li>আপোনাৰ জমা মচাৰ অনুৰোধ কৰা।</li><li>যিকোনো সময়ত সন্মতি প্ৰত্যাহাৰ কৰা।</li></ul><p>এই অধিকাৰসমূহ প্ৰয়োগ কৰিবলৈ, আপোনাৰ নাম আৰু আপুনি চেষ্টা কৰা পৰীক্ষাৰ সৈতে <a href="mailto:contact@preparekora.in">contact@preparekora.in</a> ত আমাৰ সৈতে যোগাযোগ কৰক। আমি ৭ কৰ্মদিৱসৰ ভিতৰত সঁহাৰি দিম।</p>',

      terms29Title: "২.৯ শিশুৰ গোপনীয়তা",
      terms29Body: "১৮ বছৰৰ তলৰ ছাত্ৰ-ছাত্ৰীয়ে পিতৃ-মাতৃ বা অভিভাৱকৰ সন্মতি সৈতে ৱেবছাইটটো ব্যৱহাৰ কৰা উচিত। যদি কোনো পিতৃ-মাতৃয়ে বিশ্বাস কৰে যে তেওঁলোকৰ সন্তানে সন্মতি নোহোৱাকৈ ব্যক্তিগত তথ্য জমা দিছে, তেওঁলোকে মচাৰ বাবে আমাৰ সৈতে যোগাযোগ কৰিব পাৰে।",

      terms210Title: "২.১০ তথ্য সুৰক্ষা",
      terms210Body: "আমি আপোনাৰ তথ্য সুৰক্ষিত কৰিবলৈ যুক্তিসংগত ব্যৱস্থা গ্ৰহণ কৰো, য'ত চাৰ্ভাৰ-চাইড প্ৰমাণীকৰণ, এনক্ৰিপ্ট কৰা সংৰক্ষণ, আৰু সীমাবদ্ধ প্ৰৱেশ অন্তৰ্ভুক্ত। অৱশ্যে, কোনো ব্যৱস্থা ১০০% সুৰক্ষিত নহয়, আৰু আমি সম্পূৰ্ণ সুৰক্ষাৰ গেৰাণ্টি দিব নোৱাৰো।",

      terms211Title: "২.১১ গোপনীয়তা নীতিত পৰিৱৰ্তন",
      terms211Body: 'আমি এই নীতি আপডেট কৰিব পাৰো। উল্লেখনীয় পৰিৱৰ্তন এই পৃষ্ঠাৰ ওপৰত "শেষ আপডেট" তাৰিখ আপডেট কৰি সূচিত কৰা হ\'ব।',

      terms212Title: "২.১২ অভিযোগৰ বাবে যোগাযোগ",
      terms212Body: '<p>কোনো গোপনীয়তা-সম্পৰ্কীয় অভিযোগ বা তথ্য মচাৰ অনুৰোধৰ বাবে:</p><p><strong>ইমেইল:</strong> <a href="mailto:contact@preparekora.in">contact@preparekora.in</a><br><strong>প্ৰস্তুতকৰ্তা:</strong> PrepareKora.in · Yadav Web Technologies</p>',

      termsFooterConfirm: "PrepareKora.in ব্যৱহাৰ কৰি, আপুনি নিশ্চিত কৰে যে আপুনি এই সেৱাৰ চৰ্তাৱলী আৰু গোপনীয়তা নীতি পঢ়িছে আৰু বুজিছে।"
    }
  };

  const CACHE_KEY = "pk_translate_cache_v1";
  const MAX_CACHE = 1000;
  let cache = {};

  try {
    const saved = localStorage.getItem(CACHE_KEY);
    if (saved) cache = JSON.parse(saved) || {};
  } catch (e) { cache = {}; }

  function saveCache() {
    try {
      const keys = Object.keys(cache);
      if (keys.length > MAX_CACHE) {
        const trimmed = {};
        keys.slice(-MAX_CACHE).forEach(function (k) { trimmed[k] = cache[k]; });
        cache = trimmed;
      }
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch (e) { /* quota */ }
  }

  function readSaved() {
    try {
      const saved = localStorage.getItem("pk_lang");
      if (saved === "as" || saved === "en") return saved;
    } catch (e) { /* ignore */ }
    return "en";
  }

  const PK = {
    lang: readSaved(),

    t: function (key, vars) {
      const pack = STRINGS[this.lang] || STRINGS.en;
      let text = pack[key] !== undefined ? pack[key] : (STRINGS.en[key] || key);
      if (vars) {
        Object.keys(vars).forEach(function (name) {
          text = text.split("{" + name + "}").join(vars[name]);
        });
      }
      return text;
    },

    locale: function () {
      return this.lang === "as" ? "as-IN" : "en-IN";
    },

    translate: async function (text, target) {
      target = target || this.lang;
      if (!text || typeof text !== "string") return text;
      if (target === "en") return text;

      const key = target + ":" + text.trim();
      if (cache[key]) return cache[key];

      try {
        const result = await window.PK_API.translate(text, target, "en");
        const translated =
          (result && result.translated && String(result.translated).trim()) || text;
        cache[key] = translated;
        saveCache();
        return translated;
      } catch (err) { return text; }
    },

    translateMany: async function (items, target) {
      target = target || this.lang;
      if (!Array.isArray(items)) return [];
      if (target === "en") return items;

      const results = new Array(items.length);
      const pending = [];

      items.forEach(function (item, i) {
        if (!item || typeof item !== "string") { results[i] = item; return; }
        const key = target + ":" + item.trim();
        if (cache[key]) results[i] = cache[key];
        else pending.push({ index: i, text: item });
      });

      if (!pending.length) return results;

      const BATCH = 5;
      for (let i = 0; i < pending.length; i += BATCH) {
        const slice = pending.slice(i, i + BATCH);
        const translated = await Promise.all(
          slice.map(function (entry) { return PK.translate(entry.text, target); })
        );
        slice.forEach(function (entry, j) { results[entry.index] = translated[j]; });
      }
      return results;
    },

    setLang: function (newLang) {
      if (newLang !== "en" && newLang !== "as") return;
      if (newLang === this.lang) return;

      this.lang = newLang;
      try { localStorage.setItem("pk_lang", newLang); } catch (e) { /* ignore */ }

      applyAll();

      document.dispatchEvent(new CustomEvent("pk:langchange", {
        detail: { lang: newLang }
      }));
    },

    clearCache: function () {
      cache = {};
      try { localStorage.removeItem(CACHE_KEY); } catch (e) { /* ignore */ }
    }
  };

  window.PK = PK;

  function applyAll() {
    document.documentElement.lang = PK.lang;

    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      el.textContent = PK.t(el.dataset.i18n);
    });

    document.querySelectorAll("[data-i18n-html]").forEach(function (el) {
      el.innerHTML = PK.t(el.dataset.i18nHtml);
    });

    document.querySelectorAll("[data-i18n-placeholder]").forEach(function (el) {
      el.setAttribute("placeholder", PK.t(el.dataset.i18nPlaceholder));
    });

    document.querySelectorAll("[data-i18n-aria-label]").forEach(function (el) {
      el.setAttribute("aria-label", PK.t(el.dataset.i18nAriaLabel));
    });

    document.querySelectorAll(".lang-btn").forEach(function (btn) {
      const active = btn.dataset.lang === PK.lang;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", String(active));
    });
  }

  document.addEventListener("click", function (event) {
    const btn = event.target.closest(".lang-btn");
    if (!btn) return;
    const next = btn.dataset.lang;
    if (next) PK.setLang(next);
  });

  document.addEventListener("DOMContentLoaded", applyAll);
  if (document.readyState !== "loading") applyAll();
})();
