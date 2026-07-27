/* ==========================================================
   Happy Sad Mi
   testimonials.js
========================================================== */

const testimonialGrid = document.getElementById("testimonialGrid");

document.addEventListener("DOMContentLoaded", () => {
    loadTestimonials();
});

async function loadTestimonials(){

    if(!testimonialGrid) return;

    try{

        const response = await fetch("data/testimonials.json");

        if(!response.ok){

            throw new Error("Unable to load testimonials.json");

        }

        const testimonials = await response.json();

        testimonialGrid.innerHTML = "";

        testimonials.forEach(item=>{

            testimonialGrid.innerHTML += `

                <article class="testimonial-card">

                    <img
                        src="${item.photo}"
                        alt="${item.name}"
                        class="testimonial-avatar"
                        loading="lazy">

                    <h3>${item.name}</h3>

                    <span>

                        ${item.position}

                        ${item.company ? ` • ${item.company}` : ""}

                    </span>

                    <div class="testimonial-stars">

                        ${generateStars(item.rating)}

                    </div>

                    <p>

                        "${item.message}"

                    </p>

                </article>

            `;

        });

    }

    catch(error){

        console.error(error);

        testimonialGrid.innerHTML = `
            <p>Unable to load testimonials.</p>
        `;

    }

}

/* ===========================================
   STAR RATING
=========================================== */

function generateStars(rating){

    let stars="";

    for(let i=1;i<=5;i++){

        if(i<=rating){

            stars+=`<i class="fas fa-star"></i>`;

        }else{

            stars+=`<i class="far fa-star"></i>`;

        }

    }

    return stars;

}