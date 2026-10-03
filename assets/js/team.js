/* ==========================================================
   Happy Sad Mi
   team.js

   Renders the team gallery from data/team.json.
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

        const members = await loadJSON("team.json");

        const cards = members.map(member => {

            const article = createElement("article", { className: "team-card" });

            article.appendChild(
                createElement("img", {
                    attrs: {
                        src: member.photo,
                        alt: `${member.name}, ${member.position}`,
                        loading: "lazy",
                        width: "140",
                        height: "140"
                    }
                })
            );

            article.appendChild(
                createElement("h3", { text: member.name })
            );

            article.appendChild(
                createElement("span", { text: member.position })
            );

            article.appendChild(
                createElement("p", { text: member.bio })
            );

            if (member.website) {

                const link = createElement("a", {
                    attrs: {
                        href: member.website,
                        target: "_blank",
                        rel: "noopener noreferrer"
                    }
                });

                link.append(
                    document.createTextNode("Visit Site"),
                    createElement("span", {
                        className: "visually-hidden",
                        text: ` — ${member.name} (opens in a new tab)`
                    })
                );

                article.appendChild(link);

            }

            return article;

        });

        teamGrid.replaceChildren(...cards);

        // Cards arrive after DOMContentLoaded, so register them with
        // the scroll-reveal observer.
        observeRevealTargets();

    }

    catch (error) {

        console.error(error);

        renderFallback(teamGrid, "Unable to load team members.");

    }

}