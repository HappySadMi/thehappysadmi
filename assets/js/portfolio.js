/* ==========================================================
   Happy Sad Mi
   portfolio.js

   Loads data/portfolio.json, renders the project grid, handles
   category filtering and owns the project detail dialog.
   ========================================================== */

const portfolioGrid = document.getElementById("portfolioGrid");
const filterButtons = document.querySelectorAll(".portfolio-filter button");

let portfolioProjects = [];
let activeFilter = "all";

/* Element that triggered the dialog, so focus can be restored on close */
let lastFocusedElement = null;

/* ==========================================================
   INITIALIZE
   ========================================================== */

document.addEventListener("DOMContentLoaded", async () => {

    await loadPortfolio();

    initializeFilters();

});

/* ==========================================================
   LOAD JSON
   ========================================================== */

async function loadPortfolio() {

    if (!portfolioGrid) return;

    try {

        portfolioProjects = await loadJSON("portfolio.json");

        renderPortfolio();

    }

    catch (error) {

        console.error(error);

        renderFallback(portfolioGrid, "Unable to load projects. Please check portfolio.json.");

    }

}

/* ==========================================================
   RENDER PROJECTS
   ========================================================== */

function renderPortfolio() {

    if (!portfolioGrid) return;

    const filteredProjects = portfolioProjects.filter(project => {

        return activeFilter === "all" || project.category === activeFilter;

    });

    if (filteredProjects.length === 0) {

        portfolioGrid.replaceChildren(
            createElement("div", {
                className: "portfolio-empty",
                text: "No projects found in this category yet."
            })
        );

        return;

    }

    portfolioGrid.replaceChildren(
        ...filteredProjects.map(createProjectCard)
    );

    // Cards arrive after DOMContentLoaded, so register them with
    // the scroll-reveal observer.
    observeRevealTargets();

}

/* ==========================================================
   CREATE CARD
   ========================================================== */

function createProjectCard(project) {

    const article = createElement("article", { className: "project-card" });

    article.appendChild(
        createElement("img", {
            attrs: {
                src: project.image,
                alt: `${project.title} screenshot`,
                loading: "lazy"
            }
        })
    );

    const content = createElement("div", { className: "project-content" });

    content.appendChild(
        createElement("span", {
            className: "project-tag",
            text: capitalize(project.category)
        })
    );

    content.appendChild(createElement("h3", { text: project.title }));

    content.appendChild(
        createElement("p", { text: project.shortDescription })
    );

    const tech = createElement("div", { className: "project-tech" });

    project.technologies.forEach(item => {

        tech.appendChild(createElement("span", { text: item }));

    });

    content.appendChild(tech);

    const links = createElement("div", { className: "project-links" });

    if (project.demo) {

        links.appendChild(createExternalLink(project.demo, "Live Demo", project.title));

    }

    if (project.github) {

        links.appendChild(createExternalLink(project.github, "GitHub", project.title));

    }

    const detailsBtn = createElement("button", {
        className: "details-btn",
        attrs: { type: "button", "aria-haspopup": "dialog" }
    });

    // Visible text stays the accessible name; the extra context is added
    // in a visually-hidden span so label-in-name is satisfied.
    detailsBtn.append(
        document.createTextNode("Details"),
        createElement("span", {
            className: "visually-hidden",
            text: ` for ${project.title}`
        })
    );

    detailsBtn.addEventListener("click", () => showProjectModal(project));

    links.appendChild(detailsBtn);

    content.appendChild(links);

    article.appendChild(content);

    return article;

}

/* ==========================================================
   FILTERS
   ========================================================== */

function initializeFilters() {

    filterButtons.forEach(button => {

        button.addEventListener("click", () => {

            filterButtons.forEach(btn => {

                const isActive = btn === button;

                btn.classList.toggle("active", isActive);
                btn.setAttribute("aria-pressed", String(isActive));

            });

            activeFilter = button.dataset.filter;

            renderPortfolio();

        });

    });

}

/* ==========================================================
   LINKS
   ========================================================== */

function createExternalLink(url, text, projectTitle) {

    const link = createElement("a", {
        attrs: {
            href: url,
            target: "_blank",
            rel: "noopener noreferrer"
        }
    });

    // The visible text is the accessible name; context is appended in a
    // visually-hidden span so the accessible name still starts with it.
    link.append(
        document.createTextNode(text),
        createElement("span", {
            className: "visually-hidden",
            text: ` for ${projectTitle} (opens in a new tab)`
        })
    );

    return link;

}

/* ==========================================================
   MODAL
   ========================================================== */

const modal = document.getElementById("projectModal");

function showProjectModal(project) {

    if (!modal) return;

    lastFocusedElement = document.activeElement;

    const image = document.getElementById("modalImage");

    image.src = project.image;
    image.alt = `${project.title} screenshot`;

    document.getElementById("modalTitle").textContent = project.title;

    document.getElementById("modalCategory").textContent =
        capitalize(project.category);

    document.getElementById("modalDescription").textContent = project.description;

    document.getElementById("modalRole").textContent = project.role || "—";
    document.getElementById("modalClient").textContent = project.client || "—";
    document.getElementById("modalYear").textContent = project.year || "—";
    document.getElementById("modalStatus").textContent = project.status || "—";

    const tech = document.getElementById("modalTech");

    tech.replaceChildren(
        ...project.technologies.map(item => createElement("span", { text: item }))
    );

    const buttons = document.getElementById("modalButtons");

    buttons.replaceChildren(
        ...[
            project.github ? createExternalLink(project.github, "GitHub", project.title) : null,
            project.demo ? createExternalLink(project.demo, "Live Demo", project.title) : null
        ].filter(Boolean)
    );

    modal.hidden = false;
    modal.classList.add("show");

    // Prevent the page behind the dialog from scrolling
    document.body.classList.add("modal-open");

    // Move focus inside the dialog
    const panel = modal.querySelector(".modal-content");

    if (panel) panel.focus();

}

function closeProjectModal() {

    if (!modal) return;

    modal.classList.remove("show");
    modal.hidden = true;

    document.body.classList.remove("modal-open");

    // Return focus to whatever opened the dialog
    if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {

        lastFocusedElement.focus();

    }

}

/* Close via the X button */
document.getElementById("closeModal")?.addEventListener("click", closeProjectModal);

/* Close via the overlay */
modal?.querySelector(".modal-overlay")?.addEventListener("click", closeProjectModal);

/* Close via Escape, keeping Tab focus inside the dialog */
document.addEventListener("keydown", event => {

    if (!modal || !modal.classList.contains("show")) return;

    if (event.key === "Escape") {

        closeProjectModal();
        return;

    }

    if (event.key !== "Tab") return;

    const focusable = modal.querySelectorAll(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );

    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {

        event.preventDefault();
        last.focus();

    } else if (!event.shiftKey && document.activeElement === last) {

        event.preventDefault();
        first.focus();

    }

});

/* ==========================================================
   UTILITIES
   ========================================================== */

function capitalize(text) {

    if (!text) return "";

    return text.charAt(0).toUpperCase() + text.slice(1);

}