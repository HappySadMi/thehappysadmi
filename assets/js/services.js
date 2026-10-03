/* ==========================================================
   Happy Sad Mi
   services.js

   Renders the services grid from data/services.json.
   ========================================================== */

const servicesGrid = document.getElementById("servicesGrid");

document.addEventListener("DOMContentLoaded", () => {
    loadServices();
});

/* ==========================================================
   LOAD SERVICES
   ========================================================== */

async function loadServices() {

    if (!servicesGrid) return;

    try {

        const services = await loadJSON("services.json");

        const cards = services.map(service => {

            const article = createElement("article", { className: "service-card" });

            const icon = createElement("div", { className: "service-icon" });

            // The icon string is a trusted Font Awesome class list
            // (e.g. "fas fa-code") coming from our own data file.
            icon.appendChild(
                createElement("i", {
                    className: service.icon,
                    attrs: { "aria-hidden": "true" }
                })
            );

            article.appendChild(icon);

            article.appendChild(
                createElement("h3", { text: service.title })
            );

            article.appendChild(
                createElement("p", { text: service.description })
            );

            const features = createElement("ul", { className: "service-features" });

            service.features.forEach(feature => {

                features.appendChild(createElement("li", { text: feature }));

            });

            article.appendChild(features);

            return article;

        });

        servicesGrid.replaceChildren(...cards);

        // Cards arrive after DOMContentLoaded, so register them with
        // the scroll-reveal observer.
        observeRevealTargets();

    }

    catch (error) {

        console.error(error);

        renderFallback(servicesGrid, "Unable to load services.");

    }

}