/* ==========================================================
   Happy Sad Mi
   team.js
========================================================== */

const teamGrid = document.getElementById("teamGrid");

document.addEventListener("DOMContentLoaded", () => {
    loadTeam();
});

/* ==========================================================
   LOAD TEAM
========================================================== */

async function loadTeam() {

    if (!teamGrid) return;

    try {

        const response = await fetch("data/team.json");

        if (!response.ok) {
            throw new Error("Unable to load team.json");
        }

        const members = await response.json();

        teamGrid.innerHTML = "";

        members.forEach(member => {

            teamGrid.innerHTML += `
                <article class="team-card">

                    <img
                        src="${member.photo}"
                        alt="${member.name}"
                        loading="lazy">

                    <h3>${member.name}</h3>

                    <span>${member.position}</span>

                    <p>${member.bio}</p>

                    <div class="team-skills">
                        ${member.skills.map(skill => `
                            <span>${skill}</span>
                        `).join("")}
                    </div>

                    <div class="social-links">

                        ${member.github ? `
                            <a href="${member.github}" target="_blank">
                                <i class="fab fa-github"></i>
                            </a>
                        ` : ""}

                        ${member.linkedin ? `
                            <a href="${member.linkedin}" target="_blank">
                                <i class="fab fa-linkedin"></i>
                            </a>
                        ` : ""}

                        ${member.facebook ? `
                            <a href="${member.facebook}" target="_blank">
                                <i class="fab fa-facebook"></i>
                            </a>
                        ` : ""}

                        ${member.email ? `
                            <a href="mailto:${member.email}">
                                <i class="fas fa-envelope"></i>
                            </a>
                        ` : ""}

                    </div>

                </article>
            `;

        });

        initializeTeamSlider();

    }

    catch (error) {

        console.error(error);

        teamGrid.innerHTML = `
            <p>Unable to load team members.</p>
        `;

    }

}

/* ==========================================================
   TEAM SLIDER
========================================================== */

function initializeTeamSlider() {

    const prev = document.getElementById("teamPrev");
    const next = document.getElementById("teamNext");

    if (!prev || !next) return;

    function cardWidth() {

        const card = teamGrid.querySelector(".team-card");

        if (!card) return 350;

        const gap = 24;

        return card.offsetWidth + gap;

    }

    function updateButtons() {

        const maxScroll = teamGrid.scrollWidth - teamGrid.clientWidth;

        prev.disabled = teamGrid.scrollLeft <= 5;

        next.disabled = teamGrid.scrollLeft >= maxScroll - 5;

    }

    prev.onclick = () => {

        teamGrid.scrollBy({

            left: -cardWidth(),

            behavior: "smooth"

        });

    };

    next.onclick = () => {

        teamGrid.scrollBy({

            left: cardWidth(),

            behavior: "smooth"

        });

    };

    teamGrid.addEventListener("scroll", updateButtons);

    window.addEventListener("resize", updateButtons);

    // Wait until layout is finished
    setTimeout(updateButtons, 100);

}