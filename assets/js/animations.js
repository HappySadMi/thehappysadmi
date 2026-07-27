/* ==========================================================
   Happy Sad Mi
   animations.js
========================================================== */

document.addEventListener("DOMContentLoaded", () => {

    initializeScrollReveal();
    initializeCounters();

});

/* ==========================================================
   SCROLL REVEAL
========================================================== */

function initializeScrollReveal() {

    const elements = document.querySelectorAll(
        `
        .section-title,
        .service-card,
        .process-card,
        .tech-card,
        .project-card,
        .team-card,
        .testimonial-card,
        .stats-card,
        .info-card,
        .contact-form,
        .contact-info
        `
    );

    const observer = new IntersectionObserver(

        (entries) => {

            entries.forEach((entry, index) => {

                if (!entry.isIntersecting) return;

                entry.target.style.opacity = "1";
                entry.target.style.transform = "translateY(0)";
                entry.target.style.transition =
                    `opacity .7s ease ${index * 0.08}s,
                     transform .7s ease ${index * 0.08}s`;

                observer.unobserve(entry.target);

            });

        },

        {
            threshold: 0.15
        }

    );

    elements.forEach(element => {

        element.style.opacity = "0";
        element.style.transform = "translateY(40px)";

        observer.observe(element);

    });

}

/* ==========================================================
   COUNTER ANIMATION
========================================================== */

function initializeCounters() {

    const counters = document.querySelectorAll(
        ".stats-card h2, .stat-card h2"
    );

    if (!counters.length) return;

    const observer = new IntersectionObserver(

        (entries) => {

            entries.forEach(entry => {

                if (!entry.isIntersecting) return;

                animateCounter(entry.target);

                observer.unobserve(entry.target);

            });

        },

        {
            threshold: 0.6
        }

    );

    counters.forEach(counter => {

        observer.observe(counter);

    });

}

function animateCounter(element) {

    const original = element.textContent;

    const target = parseInt(original.replace(/\D/g, ""));

    if (isNaN(target)) return;

    const suffix = original.replace(/[0-9]/g, "");

    let current = 0;

    const duration = 1800;

    const increment = target / (duration / 16);

    function update() {

        current += increment;

        if (current >= target) {

            element.textContent = target + suffix;

            return;

        }

        element.textContent =
            Math.floor(current) + suffix;

        requestAnimationFrame(update);

    }

    element.textContent = "0";

    requestAnimationFrame(update);

}