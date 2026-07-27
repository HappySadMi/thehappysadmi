/* ==========================================================
   Happy Sad Mi
   portfolio.js
========================================================== */

const portfolioGrid = document.getElementById("portfolioGrid");
const filterButtons = document.querySelectorAll(".portfolio-filter button");

let portfolioProjects = [];
let activeFilter = "all";

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

    try {

        const response = await fetch("data/portfolio.json");

        if (!response.ok) {

            throw new Error("Unable to load portfolio.");

        }

        portfolioProjects = await response.json();

        renderPortfolio();

    }

    catch (error) {

        console.error(error);

        portfolioGrid.innerHTML = `

            <div class="portfolio-error">

                <h3>Unable to load projects.</h3>

                <p>Please check portfolio.json</p>

            </div>

        `;

    }

}

/* ==========================================================
   RENDER PROJECTS
========================================================== */

function renderPortfolio() {

    if (!portfolioGrid) return;

    portfolioGrid.innerHTML = "";

    const filteredProjects = portfolioProjects.filter(project => {

        if (activeFilter === "all") {

            return true;

        }

        return project.category === activeFilter;

    });

    if (filteredProjects.length === 0) {

        portfolioGrid.innerHTML = `

            <div class="portfolio-empty">

                <h3>No projects found.</h3>

            </div>

        `;

        return;

    }

    filteredProjects.forEach(project => {

        portfolioGrid.appendChild(createProjectCard(project));

    });

}

/* ==========================================================
   CREATE CARD
========================================================== */

function createProjectCard(project) {

    const article = document.createElement("article");

    article.className = "project-card";

    article.innerHTML = `

        <img
            src="${project.image}"
            alt="${project.title}">

        <div class="project-content">

            <span
                class="project-tag">

                ${capitalize(project.category)}

            </span>

            <h3>

                ${project.title}

            </h3>

            <p>

                ${project.shortDescription}

            </p>

            <div class="project-tech">

                ${project.technologies
                    .map(tech => `<span>${tech}</span>`)
                    .join("")}

            </div>

            <div class="project-links">

                ${createButton(project.demo, "Live Demo")}

                ${createButton(project.github, "GitHub")}

                <button
                    class="details-btn"
                    data-id="${project.id}">

                    Details

                </button>

            </div>

        </div>

    `;

    article
        .querySelector(".details-btn")
        .addEventListener("click", () => {

            showProjectModal(project);

        });

    return article;

}

/* ==========================================================
   FILTERS
========================================================== */

function initializeFilters() {

    filterButtons.forEach(button => {

        button.addEventListener("click", () => {

            filterButtons.forEach(btn => {

                btn.classList.remove("active");

            });

            button.classList.add("active");

            activeFilter = button.dataset.filter;

            renderPortfolio();

        });

    });

}

/* ==========================================================
   BUTTON
========================================================== */

function createButton(url, text) {

    if (!url || url.trim() === "") {

        return "";

    }

    return `

        <a
            href="${url}"
            target="_blank"
            rel="noopener noreferrer">

            ${text}

        </a>

    `;

}

/* ==========================================================
   MODAL
========================================================== */

function showProjectModal(project){

    const modal=document.getElementById("projectModal");

    document.getElementById("modalImage").src=project.image;

    document.getElementById("modalTitle").textContent=project.title;

    document.getElementById("modalCategory").textContent=capitalize(project.category);

    document.getElementById("modalDescription").textContent=project.description;

    document.getElementById("modalRole").textContent=project.role;

    document.getElementById("modalClient").textContent=project.client;

    document.getElementById("modalYear").textContent=project.year;

    document.getElementById("modalStatus").textContent=project.status;

    const tech=document.getElementById("modalTech");

    tech.innerHTML="";

    project.technologies.forEach(item=>{

        const span=document.createElement("span");

        span.textContent=item;

        tech.appendChild(span);

    });

    const buttons=document.getElementById("modalButtons");

    buttons.innerHTML="";

    if(project.github){

        buttons.innerHTML+=`
            <a href="${project.github}"
               target="_blank">
               GitHub
            </a>
        `;

    }

    if(project.demo){

        buttons.innerHTML+=`
            <a href="${project.demo}"
               target="_blank">
               Live Demo
            </a>
        `;

    }

    modal.classList.add("show");

}

/* ==========================================================
   UTILITIES
========================================================== */

function capitalize(text) {

    return text.charAt(0).toUpperCase() +

        text.slice(1);

}

/* ===========================================
   CLOSE MODAL
=========================================== */

const modal=document.getElementById("projectModal");

const closeBtn=document.getElementById("closeModal");

if(closeBtn){

    closeBtn.onclick=()=>{

        modal.classList.remove("show");

    };

}

if(modal){

    modal.querySelector(".modal-overlay").onclick=()=>{

        modal.classList.remove("show");

    };

}

document.addEventListener("keydown",e=>{

    if(e.key==="Escape"){

        modal?.classList.remove("show");

    }

});