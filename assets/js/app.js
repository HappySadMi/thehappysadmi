/* ==========================================================
   Happy Sad Mi
   app.js

   Core UI behaviour: mobile menu, smooth scroll, sticky navbar,
   active navigation and back-to-top. Also exposes the shared
   loadJSON() helper used by the content renderers.
   ========================================================== */

/* Offset applied to anchor targets so the fixed header does not
   cover the heading you just jumped to. Must match --header-height. */
const HEADER_OFFSET = 90;

document.addEventListener("DOMContentLoaded", () => {

    initMobileMenu();
    initSmoothScroll();
    initStickyNavbar();
    initActiveNavigation();
    initBackToTop();

});

/* ==========================================================
   SHARED HELPERS
   ========================================================== */

/* Fetches a JSON file from data/ and resolves with the parsed array.
   Throws with a readable message so callers can log something useful. */
async function loadJSON(file) {

    const response = await fetch(`data/${file}`);

    if (!response.ok) {

        throw new Error(`Unable to load data/${file} (HTTP ${response.status})`);

    }

    return response.json();

}

/* Creates an element with optional class, text and attributes.
   Prefer this over innerHTML when inserting any value that came
   from a data file. */
function createElement(tag, options = {}) {

    const el = document.createElement(tag);

    if (options.className) el.className = options.className;

    if (options.text != null) el.textContent = options.text;

    if (options.html != null) el.innerHTML = options.html;

    if (options.attrs) {

        Object.entries(options.attrs).forEach(([key, value]) => {

            if (value == null) return;

            el.setAttribute(key, value);

        });

    }

    if (options.children) {

        options.children.forEach(child => el.appendChild(child));

    }

    return el;

}

/* Renders a friendly message inside a container when data fails to load. */
function renderFallback(container, message) {

    if (!container) return;

    container.replaceChildren(
        createElement("p", { className: "portfolio-error", text: message })
    );

}

/* ==========================================================
   MOBILE MENU
   ========================================================== */

function initMobileMenu() {

    const menuBtn = document.getElementById("menuBtn");
    const navLinks = document.querySelector(".nav-links");

    if (!menuBtn || !navLinks) return;

    const icon = menuBtn.querySelector("i");

    function setOpen(open) {

        navLinks.classList.toggle("mobile-open", open);

        menuBtn.setAttribute("aria-expanded", String(open));

        menuBtn.setAttribute(
            "aria-label",
            open ? "Close navigation menu" : "Open navigation menu"
        );

        if (!icon) return;

        icon.classList.toggle("fa-bars", !open);
        icon.classList.toggle("fa-times", open);

    }

    menuBtn.addEventListener("click", () => {

        const open = !navLinks.classList.contains("mobile-open");

        setOpen(open);

        // Move focus into the panel so keyboard users land on the links
        if (open) navLinks.querySelector("a")?.focus();

    });

    navLinks.querySelectorAll("a").forEach(link => {

        link.addEventListener("click", () => setOpen(false));

    });

    document.addEventListener("keydown", event => {

        if (event.key === "Escape" && navLinks.classList.contains("mobile-open")) {

            setOpen(false);
            menuBtn.focus();

        }

    });

    document.addEventListener("click", event => {

        if (!navLinks.classList.contains("mobile-open")) return;

        if (navLinks.contains(event.target) || menuBtn.contains(event.target)) return;

        setOpen(false);

    });

    // Close the panel if the viewport grows back to desktop widths
    window.addEventListener("resize", () => {

        if (window.innerWidth > 768) setOpen(false);

    });

}

/* ==========================================================
   SMOOTH SCROLL
   ========================================================== */

function initSmoothScroll() {

    document.querySelectorAll('a[href^="#"]').forEach(link => {

        link.addEventListener("click", function (event) {

            const hash = this.getAttribute("href");

            // In-page anchors only; leave bare "#" and real URLs alone
            if (!hash || hash === "#") return;

            const target = document.querySelector(hash);

            if (!target) return;

            event.preventDefault();

            const top = target.getBoundingClientRect().top
                + window.scrollY
                - HEADER_OFFSET;

            window.scrollTo({ top, behavior: "smooth" });

            // Keep the keyboard focus with the visual jump
            target.setAttribute("tabindex", "-1");
            target.focus({ preventScroll: true });

            // Reflect the jump in the address bar without a second scroll
            if (history.replaceState) history.replaceState(null, "", hash);

        });

    });

}

/* ==========================================================
   STICKY NAVBAR
   ========================================================== */

function initStickyNavbar() {

    const header = document.querySelector(".header");

    if (!header) return;

    window.addEventListener("scroll", () => {

        header.classList.toggle("scrolled", window.scrollY > 40);

    }, { passive: true });

}

/* ==========================================================
   ACTIVE NAVIGATION
   ========================================================== */

function initActiveNavigation() {

    const sections = document.querySelectorAll("section[id]");
    const navLinks = document.querySelectorAll(".nav-links a");

    if (!sections.length || !navLinks.length) return;

    function updateActive() {

        const scrollPos = window.scrollY + HEADER_OFFSET + 20;

        let currentId = null;

        sections.forEach(section => {

            const top = section.offsetTop;
            const height = section.offsetHeight;

            if (scrollPos >= top && scrollPos < top + height) {

                currentId = section.getAttribute("id");

            }

        });

        // Nothing matched (e.g. inside the footer) -> clear the highlight
        navLinks.forEach(link => {

            const isActive = link.getAttribute("href") === `#${currentId}`;

            link.classList.toggle("active", isActive);

            if (isActive) {

                link.setAttribute("aria-current", "true");

            } else {

                link.removeAttribute("aria-current");

            }

        });

    }

    window.addEventListener("scroll", updateActive, { passive: true });
    window.addEventListener("resize", updateActive);

    updateActive();

}

/* ==========================================================
   BACK TO TOP
   ========================================================== */

function initBackToTop() {

    const button = document.getElementById("backToTop");

    if (!button) return;

    window.addEventListener("scroll", () => {

        button.classList.toggle("show", window.scrollY > 500);

    }, { passive: true });

    button.addEventListener("click", () => {

        window.scrollTo({ top: 0, behavior: "smooth" });

    });

}