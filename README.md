# Happy Sad Mi

Marketing website for **Happy Sad Mi**, a team of IT professionals based in the
Philippines offering web development, software development, data analytics,
technical support, and virtual assistance.

This is a **static site**. There is no build step, no bundler, and no
dependencies to install — HTML, CSS, vanilla JavaScript, and a handful of JSON
content files.

---

## Running it locally

The site fetches its content from `data/*.json` at runtime, so it **must be
served over HTTP**. Opening `index.html` directly from disk (`file://`) leaves
the Services, Portfolio, Team, and Testimonials sections empty, because browsers
block local `fetch()` requests.

```bash
# Python 3
python -m http.server 8000

# or Node
npx serve .
```

Then open <http://localhost:8000>.

---

## Project structure

```
index.html              Single page; all markup is inline
og-image.jpg            Social share preview (1200x630)
favicon.ico
favicon-16x16.png
favicon-32x32.png
apple-touch-icon.png
icon-192.png / icon-512.png
site.webmanifest        PWA manifest

assets/
  css/
    style.css           Design tokens (:root), reset, layout, navbar, hero, footer
    components.css      Reusable components (cards, forms, modal)
    animations.css      Keyframes, hover states, reduced-motion fallback
  js/
    app.js              Mobile menu, smooth scroll, sticky navbar, active nav,
                        back-to-top, plus the shared loadJSON()/createElement()
    animations.js       Scroll reveal + animated stat counters
    portfolio.js        Portfolio grid, category filters, project dialog
    services.js         Services grid
    team.js             Team gallery
    testimonials.js     Testimonials + star ratings
  images/team/          All images (team photos, project screenshots, hero)

data/
  portfolio.json        Projects
  services.json         Services
  team.json             Team members
  testimonials.json     Testimonials
```

---

## Editing content

**All page content lives in `data/*.json`.** The JavaScript renderers replace
those sections' markup on load, so editing the corresponding markup in
`index.html` has no effect — `index.html` only holds an empty placeholder
container plus a comment noting which JSON file feeds it.

| To change | Edit |
|---|---|
| Services list | `data/services.json` |
| Projects & categories | `data/portfolio.json` |
| Team members | `data/team.json` |
| Testimonials | `data/testimonials.json` |

After editing any JSON, validate it — a trailing comma silently blanks the
whole section.

### Adding a service

```json
{
  "id": 6,
  "title": "Service Name",
  "icon": "fas fa-icon-name",
  "description": "One or two sentences.",
  "features": ["Point one", "Point two"],
  "featured": true
}
```

### Adding a project

```json
{
  "id": 5,
  "title": "Project Name",
  "category": "web",
  "featured": true,
  "shortDescription": "One line shown on the card.",
  "description": "Full paragraph shown in the dialog.",
  "image": "assets/images/team/name.webp",
  "technologies": ["Tech one", "Tech two"],
  "role": "Full Stack Developer",
  "client": "Client name",
  "year": "2026",
  "status": "Completed",
  "github": "",
  "demo": ""
}
```

`category` **must** match one of the `data-filter` values on the buttons in
`.portfolio-filter` (`web`, `software`, `analytics`, `automation`), otherwise
the project only appears under "All". Leaving `github` or `demo` as `""` omits
that button entirely.

### Adding a team member

```json
{
  "id": 6,
  "name": "Name",
  "position": "Role",
  "photo": "assets/images/team/name.jpg",
  "bio": "Short biography.",
  "website": "https://example.com"
}
```

`website` is optional — omit or blank it to hide the link. Keep `id` values
unique.

---

## Design system

Tokens are defined once in `:root` at the top of `assets/css/style.css`. Use
them instead of hardcoded colours.

| Token | Value |
|---|---|
| `--primary` | `#192A5D` |
| `--primary-light` | `#2C3B67` |
| `--secondary` | `#3B82F6` |
| `--accent` | `#10B981` |
| `--dark` / `--light` / `--white` | `#0F172A` / `#F8FAFC` / `#FFFFFF` |
| `--heading-font` / `--body-font` | Poppins / Inter |
| `--section-padding` | `100px` (`70px` under 480px) |
| `--radius` | `14px` |

**Breakpoints:** `1200px` (container width), `992px`, `768px`, `480px`.

**CSS load order matters** — `style.css` → `components.css` → `animations.css`.
`animations.css` loads last, so its hover and transition declarations win.

---

## Images

All images live in `assets/images/team/`. Filenames must match the JSON exactly,
**including spaces**.

Prefer `.webp` for photos and screenshots. Team photos render at 140×140 CSS px,
project cards at 220px tall — no source image needs to be larger than ~1000px on
its long edge. Over-sized assets are the fastest way to slow this site down; the
hero background alone is an animated WebP.

---

## Accessibility

Built in and worth preserving:

- Skip-to-content link, `<main>` landmark, labelled `<nav>` regions
- Visible `:focus-visible` rings on every interactive element
- Real `<label>` elements on all form fields (plus a honeypot)
- The project dialog is a proper `role="dialog"` with `aria-modal`, a focus
  trap, Escape-to-close, and focus restoration
- Star ratings exposed as `role="img"` with a text label
- Tap targets are at least 44×44px
- `prefers-reduced-motion` honoured in **both** CSS and JS
- `<noscript>` notice pointing users to the email address

---

## External services

- Google Fonts — Inter + Poppins
- Font Awesome 6.7.1 (cdnjs)
- Google Analytics 4 — property `G-WTDKF7Z8ZC`, IP anonymised
- Contact form posts to **Web3Forms** using the `access_key` in `index.html`

---

## Deploying

Push to `main`; the repository has no CI or hosting configuration, so deployment
is handled externally (e.g. GitHub Pages or a static host).

If you deploy to a **subdirectory**, the `start_url` in `site.webmanifest` and
any root-relative paths will need adjusting.

---

## Notes for contributors

`AGENTS.md` documents the architecture rules and conventions in more detail —
read it before making structural changes.