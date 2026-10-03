/* ==========================================================
   Happy Sad Mi
   animations.js

   Scroll-triggered reveal for cards and section headings, plus
   the numeric counter animation used by the statistics blocks.
   Both respect prefers-reduced-motion.
   ========================================================== */

const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
).matches;

/* Elements revealed on scroll. Cards rendered from JSON after
   DOMContentLoaded are picked up by observeRevealTargets(). */
const REVEAL_SELECTOR = [
    ".section-title",
    ".service-card",
    ".process-step",
    ".tech-card",
    ".project-card",
    ".team-card",
    ".testimonial-card",
    ".stats-card",
    ".info-card",
    ".contact-form",
    ".contact-info"
].join(", ");

let revealObserver = null;

document.addEventListener("DOMContentLoaded", () => {

    if (prefersReducedMotion) {

        // Show everything immediately, no observation needed
        document.querySelectorAll(REVEAL_SELECTOR).forEach(element => {

            element.style.opacity = "1";
            element.style.transform = "none";

        });

        document.querySelectorAll(".stats-card h2, .stat-card h2")
            .forEach(counter => animateCounter(counter));

        return;

    }

    revealObserver = new IntersectionObserver(entries => {

        entries.forEach(entry => {

            if (!entry.isIntersecting) return;

            revealElement(entry.target);

            revealObserver.unobserve(entry.target);

        });

    }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });

    observeRevealTargets();

    initializeCounters();

});

/* ==========================================================
   SCROLL REVEAL
   ========================================================== */

function observeRevealTargets() {

    if (!revealObserver) return;

    document.querySelectorAll(REVEAL_SELECTOR).forEach(element => {

        // Only hide elements we have not already revealed
        if (element.dataset.revealed === "true") return;

        element.style.opacity = "0";
        element.style.transform = "translateY(40px)";
        element.dataset.revealed = "pending";

        revealObserver.observe(element);

    });

}

function revealElement(element) {

    element.style.transition = "opacity .7s ease, transform .7s ease";
    element.style.opacity = "1";
    element.style.transform = "translateY(0)";
    element.dataset.revealed = "true";

}

/* ==========================================================
   COUNTER ANIMATION
   ========================================================== */

function initializeCounters() {

    const counters = document.querySelectorAll(".stats-card h2, .stat-card h2");

    if (!counters.length) return;

    const observer = new IntersectionObserver(entries => {

        entries.forEach(entry => {

            if (!entry.isIntersecting) return;

            animateCounter(entry.target);

            observer.unobserve(entry.target);

        });

    }, { threshold: 0.6 });

    counters.forEach(counter => observer.observe(counter));

}

function animateCounter(element) {

    // Only animate once per element
    if (element.dataset.counted === "true") return;

    element.dataset.counted = "true";

    const original = element.textContent.trim();

    const target = parseInt(original.replace(/\D/g, ""), 10);

    if (isNaN(target)) return;

    const suffix = original.replace(/[0-9]/g, "");

    // Under reduced motion we already showed the real value
    if (prefersReducedMotion) {

        element.textContent = target + suffix;
        return;

    }

    const duration = 1800;

    let startTime = null;

    element.textContent = `0${suffix}`;

    function update(timestamp) {

        // Bind the start time on the first frame
        if (startTime === null) startTime = timestamp;

        const progress = Math.min((timestamp - startTime) / duration, 1);

        // Ease-out so the number decelerates instead of stopping dead
        const eased = 1 - Math.pow(1 - progress, 3);

        element.textContent = Math.floor(target * eased) + suffix;

        if (progress < 1) requestAnimationFrame(update);

    }

    requestAnimationFrame(update);

}