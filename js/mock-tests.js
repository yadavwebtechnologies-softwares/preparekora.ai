/* StudyKora - Mock Tests Page (Phase 2: RTDB integration) */
"use strict";

(() => {
    const LOG_PREFIX = "[StudyKora Mock Tests]";
    const DB_BASE = "https://studykora-fc91d-default-rtdb.firebaseio.com";

    const CATEGORY_CONFIG = {
        administration: {
            name: "APSC",
            title: "APSC Mock Tests",
            description: "Practise for Assam civil services examinations."
        },
        recruitment: {
            name: "ADRE",
            title: "Recruitment Mock Tests",
            description: "Explore recruitment practice tests, including ADRE."
        },
        police: {
            name: "Assam Police",
            title: "Assam Police Mock Tests",
            description: "Practise for Assam Police recruitment examinations."
        },
        health: {
            name: "Health",
            title: "Health Examination Practice",
            description: "Explore nursing and health-related entrance practice."
        },
        education: {
            name: "TET",
            title: "Teacher Eligibility Tests",
            description: "Practise questions for teaching eligibility examinations."
        },
        other: {
            name: "Other Exams",
            title: "Other Competitive Exam Tests",
            description: "Explore practice tests for other competitive examinations."
        }
    };

    const elements = {
        mainHero: document.getElementById("mock-tests-main-hero"),
        categoryHero: document.getElementById("mock-category-hero"),
        categoryLabel: document.getElementById("mock-category-label"),
        categoryTitle: document.getElementById("mock-category-title"),
        categoryDescription: document.getElementById("mock-category-description"),

        search: document.getElementById("mock-test-search"),
        filters: document.getElementById("mock-test-filters"),
        filterButtons: Array.from(
            document.querySelectorAll("[data-mock-filter]")
        ),

        heading: document.getElementById("mock-list-heading"),
        description: document.getElementById("mock-list-description"),
        resultCount: document.getElementById("mock-test-result-count"),

        grid: document.getElementById("mock-test-grid"),
        emptyState: document.getElementById("mock-test-empty-state")
    };

    const state = {
        category: "all",
        search: ""
    };

    function log(message, details) {
        if (details !== undefined) {
            console.info(`${LOG_PREFIX} ${message}`, details);
        } else {
            console.info(`${LOG_PREFIX} ${message}`);
        }
    }

    function normalizeCategory(value) {
        const category = String(value || "").trim().toLowerCase();

        const aliases = {
            apsc: "administration",
            cce: "administration",
            adre: "recruitment",
            vfa: "recruitment",
            "assam-police": "police",
            tet: "education",
            anm: "health",
            nursing: "health",
            ssc: "other"
        };

        const normalized = aliases[category] || category;

        if (
            normalized === "all" ||
            Object.prototype.hasOwnProperty.call(CATEGORY_CONFIG, normalized)
        ) {
            return normalized;
        }

        return "all";
    }

    function getUrlParameters() {
        return new URLSearchParams(window.location.search);
    }

    function getCards() {
        return Array.from(document.querySelectorAll("[data-mock-card]"));
    }

    function getCardText(card) {
        return [
            card.dataset.mockId,
            card.dataset.mockName,
            card.dataset.mockDescription,
            card.dataset.mockCategory,
            card.textContent
        ].filter(Boolean).join(" ").toLowerCase();
    }

    function matchesSearch(card) {
        const query = state.search.trim().toLowerCase();
        return !query || getCardText(card).includes(query);
    }

    function matchesCategory(card) {
        return state.category === "all" ||
            card.dataset.mockCategory === state.category;
    }

    function updateHero() {
        const config = CATEGORY_CONFIG[state.category];
        const selected = Boolean(config);

        if (elements.mainHero) {
            elements.mainHero.hidden = selected;
            elements.mainHero.style.display = selected ? "none" : "";
        }

        if (elements.categoryHero) {
            elements.categoryHero.hidden = !selected;
            elements.categoryHero.style.display = selected ? "" : "none";
        }

        if (!selected) {
            return;
        }

        if (elements.categoryLabel) {
            elements.categoryLabel.textContent = config.name;
        }

        if (elements.categoryTitle) {
            elements.categoryTitle.textContent = config.title;
        }

        if (elements.categoryDescription) {
            elements.categoryDescription.textContent = config.description;
        }
    }

    function updateFilters() {
        elements.filterButtons.forEach((button) => {
            const selected = button.dataset.mockFilter === state.category;
            button.classList.toggle("is-active", selected);
            button.setAttribute("aria-pressed", String(selected));
        });
    }

    function updateHeading() {
        const config = CATEGORY_CONFIG[state.category];

        if (elements.heading) {
            elements.heading.textContent = config
                ? config.title
                : "Find Your Mock Test";
        }

        if (elements.description) {
            elements.description.textContent = config
                ? config.description
                : "Search by exam name or filter tests by category.";
        }
    }

    function updateResults() {
        const cards = getCards();
        let visibleCount = 0;

        cards.forEach((card) => {
            const visible = matchesCategory(card) && matchesSearch(card);
            card.style.display = visible ? "" : "none";
            card.hidden = !visible;
            if (visible) {
                visibleCount += 1;
            }
        });

        const total = cards.length;

        if (elements.emptyState) {
            elements.emptyState.hidden = visibleCount > 0;
            elements.emptyState.style.display =
                visibleCount > 0 ? "none" : "";
        }

        if (elements.resultCount) {
            if (visibleCount === 0) {
                elements.resultCount.textContent =
                    total === 0
                        ? "No mock tests are configured yet."
                        : "No mock tests match your search or category.";
            } else {
                elements.resultCount.textContent =
                    `Showing ${visibleCount} of ${total} mock tests.`;
            }
        }

        log("Results updated.", {
            category: state.category,
            search: state.search,
            visible: visibleCount,
            total
        });
    }

    function updateUrl(category) {
        const url = new URL(window.location.href);

        if (category === "all") {
            url.searchParams.delete("category");
        } else {
            url.searchParams.set("category", category);
        }

        window.history.replaceState({}, "", url);
    }

    function selectCategory(category, shouldUpdateUrl = true) {
        state.category = normalizeCategory(category);

        if (shouldUpdateUrl) {
            updateUrl(state.category);
        }

        updateHero();
        updateFilters();
        updateHeading();
        updateResults();

        log("Category selected.", state.category);
    }

    function handleFilterClick(event) {
        const button = event.target.closest("[data-mock-filter]");
        if (!button) {
            return;
        }
        selectCategory(button.dataset.mockFilter);
    }

    function handleSearch(event) {
        state.search = event.target.value || "";
        updateResults();
    }

    function getSession() {
        try {
            return JSON.parse(
                sessionStorage.getItem("studyKoraSession") || "null"
            );
        } catch (error) {
            console.warn(`${LOG_PREFIX} Unable to read session.`, error);
            return null;
        }
    }

    function isLoggedIn() {
        const session = getSession();

        return Boolean(
            session &&
            typeof session.idToken === "string" &&
            session.idToken.length > 0 &&
            session.user &&
            typeof session.user.email === "string" &&
            session.user.email.length > 0
        );
    }

    function handleTestClick(event) {
        const link = event.target.closest("[data-test-link]");

        if (!link || isLoggedIn()) {
            return;
        }

        event.preventDefault();

        const destination = link.getAttribute("href") || "test.html";
        const loginUrl = new URL("auth.html", window.location.href);

        loginUrl.searchParams.set("mode", "login");
        loginUrl.searchParams.set("returnTo", destination);

        log("Guest redirected to login.", destination);
        window.location.href = loginUrl.toString();
    }

    /* ---------- RTDB integration (Phase 2) ---------- */

    function createRemoteCard(test) {
        const card = document.createElement("a");
        card.href = `test.html?test=${encodeURIComponent(test.id)}`;
        card.className = "listing-card";
        card.setAttribute("data-mock-card", "");
        card.setAttribute("data-test-link", "");
        card.dataset.mockId = test.id;
        card.dataset.mockName = test.title || "";
        card.dataset.mockDescription = test.description || "";
        card.dataset.mockCategory = normalizeCategory(test.category || "");

        const icon = document.createElement("span");
        icon.className = "card-icon";
        icon.setAttribute("aria-hidden", "true");
        icon.innerHTML =
            '<svg viewBox="0 0 24 24" fill="none">' +
            '<rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" stroke-width="1.7"/>' +
            '<path d="M7 8h10M7 12h7M7 16h5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>' +
            '</svg>';

        const content = document.createElement("span");
        content.className = "card-content";

        const title = document.createElement("span");
        title.className = "card-title";
        title.textContent = test.title || "Untitled Test";

        const desc = document.createElement("span");
        desc.className = "card-description";
        const qCount = Array.isArray(test.questions) ? test.questions.length : 0;
        desc.textContent = test.description ||
            `${qCount} question${qCount === 1 ? "" : "s"}`;

        content.append(title, desc);

        const arrow = document.createElement("span");
        arrow.className = "card-arrow";
        arrow.setAttribute("aria-hidden", "true");
        arrow.textContent = "›";

        card.append(icon, content, arrow);
        return card;
    }

    function renderRemoteCards(tests) {
        if (!elements.grid) return;
        const existingIds = new Set(
            getCards().map((c) => c.dataset.mockId).filter(Boolean)
        );
        Object.values(tests).forEach((test) => {
            if (!test || typeof test !== "object") return;
            if (test.published === false) return;
            const id = test.id;
            if (!id || existingIds.has(id)) return;
            elements.grid.appendChild(createRemoteCard(test));
        });
    }

    async function loadRemoteTests() {
        if (!elements.grid) return;
        try {
            const response = await fetch(`${DB_BASE}/tests.json`, { cache: "no-store" });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const tests = await response.json();
            if (tests && typeof tests === "object") {
                renderRemoteCards(tests);
                updateResults();
            }
            log("Remote tests loaded.", {
                count: tests ? Object.keys(tests).length : 0
            });
        } catch (error) {
            console.warn(`${LOG_PREFIX} Could not load remote tests.`, error);
        }
    }

    function initialize() {
        if (!elements.grid) {
            console.warn(`${LOG_PREFIX} Test grid not found.`);
            return;
        }

        elements.filters?.addEventListener("click", handleFilterClick);
        elements.search?.addEventListener("input", handleSearch);
        elements.grid.addEventListener("click", handleTestClick);

        const params = getUrlParameters();

        state.category = normalizeCategory(params.get("category"));
        state.search = params.get("search") || "";

        if (elements.search) {
            elements.search.value = state.search;
        }

        updateHero();
        updateFilters();
        updateHeading();
        updateResults();

        loadRemoteTests();

        log("Initialized.", {
            category: state.category,
            totalTests: getCards().length
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initialize, {
            once: true
        });
    } else {
        initialize();
    }
})();
