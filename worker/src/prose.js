/**
 * Static site prose.
 *
 * This is the half of the site's content that does NOT live in a JSON file.
 * Everything in data/*.json is fetched live at request time (see
 * knowledge.js) so the chatbot can never drift from the site.
 *
 * This file is the one piece that is maintained by hand. It only covers the
 * About story, the process steps and the tech stack -- the parts written
 * directly into index.html. If that copy changes in index.html, update it
 * here too.
 */

export const SITE_PROSE = {
  summary:
    "Happy Sad Mi is a team of IT professionals based in the Philippines. " +
    "The team delivers modern websites, software systems, data analytics " +
    "solutions, automation, and virtual assistance for businesses of every " +
    "size.",

  about: {
    origin:
      'The name "HappySadMi" comes from a playful expression in the team\'s ' +
      "native language that roughly means \"we're happy too\". Read in " +
      "English it also combines the words Happy and Sad into a single name, " +
      "a contrast the team embraced as reflecting its personality: even " +
      "during difficult moments there is room for creativity, humor and " +
      "optimism while building technology.",
    story:
      "The team met as college classmates and worked together on a thesis " +
      "project. That experience taught them how to tackle complex problems, " +
      "adapt under pressure and deliver as a unit. They combine creativity, " +
      "technical expertise and analytical thinking to help businesses improve " +
      "efficiency and build digital products.",
  },

  // Mirrors the six .process-step blocks in index.html.
  process: [
    { step: "Discovery", description: "Understanding your business requirements." },
    { step: "Planning", description: "Creating architecture, milestones and timeline." },
    { step: "Development", description: "Building scalable and secure software." },
    { step: "Testing", description: "Quality assurance and bug fixing." },
    { step: "Deployment", description: "Launching your application." },
    { step: "Support", description: "Continuous improvements and maintenance." },
  ],

  // Mirrors the .tech-grid cards in index.html.
  techStack: [
    "HTML5", "CSS3", "JavaScript", "PHP", "Laravel",
    "MySQL", "GitHub", "Docker", "Power BI", "Excel",
  ],

  contact: {
    email: "happysadmi@gmail.com",
    method:
      "Use the contact form on the website. It goes directly to the team's " +
      "inbox.",
  },

  values: [
    "Innovation -- modern solutions built with current technologies.",
    "Collaboration -- working together to produce results.",
    "Growth -- helping businesses scale through technology.",
  ],
};