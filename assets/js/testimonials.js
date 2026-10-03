/* ==========================================================
   Happy Sad Mi
   testimonials.js

   Renders testimonial cards (and their star ratings) from
   data/testimonials.json.
   ========================================================== */

const testimonialGrid = document.getElementById("testimonialGrid");

document.addEventListener("DOMContentLoaded", () => {
    loadTestimonials();
});

/* ==========================================================
   LOAD TESTIMONIALS
   ========================================================== */

async function loadTestimonials() {

    if (!testimonialGrid) return;

    try {

        const testimonials = await loadJSON("testimonials.json");

        const cards = testimonials.map(item => {

            const article = createElement("article", { className: "testimonial-card" });

            // The avatar is optional -- testimonials.json does not
            // require a photo, so only render it when one exists.
            if (item.photo) {

                article.appendChild(
                    createElement("img", {
                        className: "testimonial-avatar",
                        attrs: {
                            src: item.photo,
                            alt: `${item.name} portrait`,
                            loading: "lazy",
                            width: "72",
                            height: "72"
                        }
                    })
                );

            }

            article.appendChild(
                createElement("h3", { text: item.name })
            );

            const meta = [item.position, item.company].filter(Boolean).join(" • ");

            article.appendChild(
                createElement("span", {
                    className: "testimonial-position",
                    text: meta
                })
            );

            const stars = createElement("div", {
                className: "testimonial-stars",
                attrs: {
                    role: "img",
                    "aria-label": `Rated ${item.rating} out of 5`
                }
            });

            stars.innerHTML = generateStars(item.rating);

            article.appendChild(stars);

            article.appendChild(
                createElement("p", {
                    className: "testimonial-message",
                    text: item.message
                })
            );

            return article;

        });

        testimonialGrid.replaceChildren(...cards);

        // Cards arrive after DOMContentLoaded, so register them with
        // the scroll-reveal observer.
        observeRevealTargets();

    }

    catch (error) {

        console.error(error);

        renderFallback(testimonialGrid, "Unable to load testimonials.");

    }

}

/* ==========================================================
   STAR RATING
   ========================================================== */

/* Returns solid stars for the filled portion and hollow stars for
   the remainder. The wrapper carries an aria-label so the rating is
   not announced as a run of icon characters. */
function generateStars(rating) {

    const filled = Math.max(0, Math.min(5, Number(rating) || 0));

    let stars = "";

    for (let i = 1; i <= 5; i++) {

        stars += i <= filled
            ? '<i class="fas fa-star" aria-hidden="true"></i>'
            : '<i class="far fa-star" aria-hidden="true"></i>';

    }

    return stars;

}