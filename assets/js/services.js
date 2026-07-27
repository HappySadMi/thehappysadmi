/* ==========================================================
   Happy Sad Mi
   services.js
========================================================== */

const servicesGrid = document.getElementById("servicesGrid");

document.addEventListener("DOMContentLoaded", () => {
    loadServices();
});

async function loadServices() {

    if (!servicesGrid) return;

    try {

        const response = await fetch("data/services.json");

        if (!response.ok) {
            throw new Error("Unable to load services.json");
        }

        const services = await response.json();

        servicesGrid.innerHTML = "";

        services.forEach(service => {

            servicesGrid.innerHTML += `

                <article class="service-card">

                    <div class="service-icon">
                        <i class="${service.icon}"></i>
                    </div>

                    <h3>${service.title}</h3>

                    <p>
                        ${service.description}
                    </p>

                    <ul class="service-features">

                        ${service.features
                            .map(feature => `<li>${feature}</li>`)
                            .join("")}

                    </ul>

                    <div class="service-tech">

                        ${service.technologies
                            .map(tech => `<span>${tech}</span>`)
                            .join("")}

                    </div>

                </article>

            `;

        });

    }

    catch(error){

        console.error(error);

        servicesGrid.innerHTML = `
            <p>Unable to load services.</p>
        `;

    }

}