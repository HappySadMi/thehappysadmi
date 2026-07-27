/* ==========================================================
   Happy Sad Mi
   app.js
========================================================== */

document.addEventListener("DOMContentLoaded", () => {

    initMobileMenu();
    initSmoothScroll();
    initStickyNavbar();
    initActiveNavigation();
    initBackToTop();

});

/* ==========================================================
   MOBILE MENU
========================================================== */

function initMobileMenu() {

    const menuBtn = document.querySelector(".menu-btn");
    const navLinks = document.querySelector(".nav-links");

    if (!menuBtn || !navLinks) return;

    menuBtn.addEventListener("click", () => {

        navLinks.classList.toggle("mobile-open");

        const icon = menuBtn.querySelector("i");

        if (navLinks.classList.contains("mobile-open")) {

            icon.classList.remove("fa-bars");
            icon.classList.add("fa-times");

        } else {

            icon.classList.remove("fa-times");
            icon.classList.add("fa-bars");

        }

    });

    document.querySelectorAll(".nav-links a").forEach(link => {

        link.addEventListener("click", () => {

            navLinks.classList.remove("mobile-open");

            const icon = menuBtn.querySelector("i");

            icon.classList.remove("fa-times");
            icon.classList.add("fa-bars");

        });

    });

}

/* ==========================================================
   SMOOTH SCROLL
========================================================== */

function initSmoothScroll() {

    const links = document.querySelectorAll('a[href^="#"]');

    links.forEach(link => {

        link.addEventListener("click", function (e) {

            const target = document.querySelector(this.getAttribute("href"));

            if (!target) return;

            e.preventDefault();

            target.scrollIntoView({

                behavior: "smooth",
                block: "start"

            });

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

        if (window.scrollY > 40) {

            header.classList.add("scrolled");

        } else {

            header.classList.remove("scrolled");

        }

    });

}

/* ==========================================================
   ACTIVE NAVIGATION
========================================================== */

function initActiveNavigation() {

    const sections = document.querySelectorAll("section[id]");
    const navLinks = document.querySelectorAll(".nav-links a");

    function updateActive() {

        const scrollPos = window.scrollY + 120;

        sections.forEach(section => {

            const top = section.offsetTop;
            const height = section.offsetHeight;
            const id = section.getAttribute("id");

            if (scrollPos >= top && scrollPos < top + height) {

                navLinks.forEach(link => {

                    link.classList.remove("active");

                    if (link.getAttribute("href") === "#" + id) {

                        link.classList.add("active");

                    }

                });

            }

        });

    }

    window.addEventListener("scroll", updateActive);

    updateActive();

}

/* ==========================================================
   BACK TO TOP
========================================================== */

function initBackToTop() {

    const button = document.getElementById("backToTop");

    if (!button) return;

    window.addEventListener("scroll", () => {

        if (window.scrollY > 500) {

            button.classList.add("show");

        } else {

            button.classList.remove("show");

        }

    });

    button.addEventListener("click", () => {

        window.scrollTo({

            top: 0,
            behavior: "smooth"

        });

    });

}

/* ==========================================================
   UTILITY
========================================================== */

function debounce(fn, delay = 100) {

    let timeout;

    return (...args) => {

        clearTimeout(timeout);

        timeout = setTimeout(() => {

            fn(...args);

        }, delay);

    };

}