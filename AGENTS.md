# AGENTS.md

Guidance for AI coding agents working in this repository.

## Project Overview

**Happy Sad Mi** — marketing site for a Philippine IT services team (web development, software development, data analytics, technical support, virtual assistance).

This is a **static website with zero build step and zero runtime dependencies**. There is no `package.json`, no bundler, no framework, and no test suite. Do not introduce one unless explicitly asked.

- Plain HTML5, CSS3, vanilla ES6+ JavaScript
- Classic (non-module) `<script>` tags loaded at the bottom of `<body>`
- Content driven by static JSON fetched at runtime
- Remote origin: `https://github.com/HappySadMi/thehappysadmi.git`, deploy branch `main`
- No CI, no deploy config — deployment is manual/external

## Repository Structure

```
index.html              Single page, all markup inline
privacy.html            Privacy Notice (no analytics snippet by design)
og-image.jpg            Social share card (1200x630)
favicon.ico
favicon-16x16.png / favicon-32x32.png
apple-touch-icon.png
icon-192.png / icon-512.png
site.webmanifest        PWA manifest
robots.txt
sitemap.xml

assets/
  css/
    style.css           Design tokens (:root), reset, a11y primitives, layout,
                        navbar, hero, about, process, footer, responsive
    components.css      Reusable components (cards, forms, modal, states)
    animations.css      @keyframes, hover states, reduced-motion fallback
    chat.css            Chat assistant widget (launcher, panel, composer)
  js/
    app.js              Mobile menu, smooth scroll, sticky navbar, active nav,
                        back-to-top, PLUS shared loadJSON()/createElement()/renderFallback()
    animations.js       IntersectionObserver scroll reveal + stat counters
    chat.js             Chat assistant widget, injected at runtime
    consent.js          Analytics consent gate (Consent Mode v2)
    portfolio.js        Portfolio grid, filters, project dialog (owns modal state)
    services.js         Services grid
    team.js             Team gallery
    testimonials.js     Testimonials + star ratings
  images/team/          All content images (team photos, project screenshots)

data/
  portfolio.json        Projects
  services.json         Services
  team.json             Team members
  testimonials.json     Testimonials

worker/                  Cloudflare Worker backing the chat assistant (its own
                        deploy pipeline, `npx wrangler`, separate from Pages)
```

## Critical Architecture Rules

### 1. JSON files are the source of truth for content

`services.js`, `portfolio.js`, `team.js`, and `testimonials.js` each fetch their JSON file and **replace the target container's entire contents** via `replaceChildren()`.

> **Editing copy for services, portfolio, team, or testimonials means editing `data/*.json` — NOT `index.html`.**

`index.html` contains only an empty placeholder container plus an HTML comment naming the JSON file that feeds it. There are **no** duplicated static cards. Keep it that way: if you add a hardcoded card to one of those grids, it will be silently discarded on load, and you will have re-introduced the duplicate-content bug that was removed.

### 2. A local web server is required

All four content sections use `fetch()` against `data/*.json`. Browsers block those over `file://`, so **opening `index.html` from disk leaves Services, Portfolio, Team, and Testimonials empty.**

```bash
python -m http.server 8000
```

Failures are caught and render a short message in place, so a JSON error looks like an empty section, not a thrown exception. Check the browser console when a section renders blank.

### 3. Scripts are classic scripts sharing one global scope

Each file declares top-level `const`s (`teamGrid`, `portfolioGrid`, `servicesGrid`, `testimonialGrid`, `modal`) and top-level functions. There is no `type="module"` and no import/export.

`chat.js` is the one exception: it is loaded with `defer` and deliberately keeps its own local `createElement()` so a failure in the other scripts cannot take the widget down with them.

Consequences:
- Files share a global namespace. Do not introduce duplicate identifiers.
- `app.js` must load first — it defines `loadJSON()`, `createElement()`, and `renderFallback()`, which every renderer depends on. The `<script>` order at the bottom of `<body>` is `app.js`, `animations.js`, `portfolio.js`, `services.js`, `team.js`, `testimonials.js`, `chat.js`.
- Adding `type="module"` would defer execution and break top-level `getElementById` calls (`portfolio.js` reads `modal` at parse time, `team.js` reads `teamGrid` at parse time). If you convert, move those inside `DOMContentLoaded`.

### 4. Cache-bust query strings are manual

Static hosts send no `Cache-Control`, so browsers apply heuristic caching and can serve stale CSS/JS for days. Every asset link therefore carries `?v=N`:

```html
<link rel="stylesheet" href="assets/css/style.css?v=6">
<script src="assets/js/app.js?v=6"></script>
```

> **After changing any CSS or JS, bump `?v=` in `index.html` to the next integer or visitors will not get the update.**

### 5. Analytics consent is load-bearing

`index.html` sets `gtag('consent', 'default', ...)` with everything denied **before** `gtag.js` loads, then `consent.js` grants only on opt-in.

> **Do not merge the inline consent block and the `async` gtag loader into one `<script>`, and never move the loader above the inline block.** If `gtag.js` initialises before the default is queued, storage is already treated as granted and the whole gate silently stops working — with no visible symptom other than "analytics look normal."

Verified behaviour:
- Decline → `localStorage['hsm-consent'] = 'denied'`, GA4 keeps sending cookieless pings (`gcs=G100`), no `_ga` cookie is ever written.
- Accept → `analytics_storage` granted, `_ga` / `_ga_WTDKF7Z8ZC` written.
- `ad_*` signals stay denied regardless — no ad features run.
- If `consent.js` never loads, nothing is granted. The failure mode is "no analytics", never "analytics without consent".

`privacy.html` carries no analytics snippet at all, by design.

### 6. CSS load order is significant

```
style.css  →  components.css  →  animations.css  →  chat.css
```

`animations.css` loads after `components.css`, so its hover/transition declarations win. `chat.css` loads last because it also has to override `.back-to-top`'s `bottom`, which is declared in `style.css`. Preserve this order.

### 6b. Bottom-right floating controls

Three things are fixed to the bottom-right of the viewport: `.back-to-top` (declared in `style.css`), `.chat-launcher`, and `.chat-panel`. The consent banner is fixed to the bottom edge and will cover them.

`chat.js` measures the banner and publishes it as `--consent-height` on `<html>` (`0px` when the banner is closed). `chat.css` folds that into the `bottom` and `height` of all three. **Do not gate these offsets on `body.has-consent-banner`** — that class silently failed to apply once, leaving the launcher underneath the banner.

The panel's height must account for its own bottom offset as well as the banner. Getting that wrong let the panel's top edge go to `-22px`, clipping the header off the top of the screen.

The panel is a column flexbox. `.chat-log` needs `min-height: 0` or it refuses to shrink below its content and pushes the composer out of the panel. On the smallest phone (360x640) with the tallest consent banner, the fixed rows still overrun the panel by a few pixels, so `.chat-form`/`.chat-foot` padding is trimmed under `max-width:600px` to claw that back.

The launcher and the panel share one `--chat-dock` value (96px desktop, 80px mobile) so the panel's bottom edge is exactly level with the button and the card appears to grow out of its corner. The launcher is hidden while the panel is open. **Do not add a mobile `bottom` override to `.chat-panel`** — the base rule is already correct, and an override that only set `8px + banner` breaks the level alignment; one that omitted the dock entirely pushed the panel off the top of the screen.

### 6c. `createElement` in `chat.js`: `html` overwrites `text`

`createElement(tag, { className, text, html, attrs })` applies `text` first and then `html`. Setting `innerHTML` wipes any text content, so passing both silently drops the text. Passing `html` inside `attrs` is worse: it calls `setAttribute("html", ...)`, which produces no markup at all. That bug shipped once and left every Font Awesome icon in the widget missing while the rest of the page's icons rendered fine — the widget builds its own `createElement` rather than reusing `app.js`'s, so nothing else caught it.

Icon and label elements are appended separately (never combined into one `innerHTML` string) so the label can never be a parsed-HTML value.

### 7. Design tokens live in `:root` (`assets/css/style.css`)

Use variables, never hardcoded colours:

| Token | Value |
|---|---|
| `--primary` / `--primary-light` | `#192A5D` / `#2C3B67` |
| `--secondary` | `#3B82F6` |
| `--secondary-text` | `#2563EB` |
| `--accent` | `#10B981` |
| `--dark` / `--light` / `--white` | `#0F172A` / `#F8FAFC` / `#FFFFFF` |
| `--gray-100/200/300/500/700` | slate scale |
| `--heading-font` / `--body-font` | Poppins / Inter |
| `--section-padding` | `100px` (`70px` under 480px) |
| `--radius` | `14px` |
| `--shadow-sm` / `--shadow` | elevation |
| `--transition` | `all .3s ease` |

**Breakpoints:** `1200px` (container), `992px`, `768px`, `480px`. Match existing values; don't invent new magic numbers.

**`--secondary` vs `--secondary-text`:** `--secondary` (`#3B82F6`) is the decorative brand blue and only reaches ~3.7:1 on white — it fails WCAG AA for text. Use `--secondary-text` (`#2563EB`, 5.17:1) for any **text or small icon on a light surface**: `.section-title span`, links in `privacy.html`, and hover backgrounds that carry white text. Reserve `--secondary` for large elements, borders, and dark-background use.

**Responsive rules that matter:**
- `.hero-image` carries the infinite `float` animation. The image's own `:hover` transform works because they are separate elements — do **not** move the float onto `.hero-image img`, or the hover effect becomes unreachable (an animated `transform` cannot be overridden).
- The hero background is an animated `.webp`. Any replacement must be a `.webp` — a GIF there previously cost 12 seconds to load.

## Conventions

- 4-space indentation
- HTML/CSS/JSON use LF line endings; `components.css` and `animations.css` use CRLF. The `edit` tool requires exact line endings — use Python for multi-line edits in those two files.
- Section banners: `<!-- ================= SECTION NAME ================= -->`
- JS files open with a banner comment:
  ```js
  /* ==========================================================
     Happy Sad Mi
     app.js
  ========================================================== */
  ```
- `style.css` and `app.js` are heavily spaced out; `components.css` is spaced; the smaller JS files are compact. Match the file you are editing.
- Icons are Font Awesome 6.7.1 classes (`fas` solid, `fab` brands, `far` regular). Never inline SVG.
- Decorative icons get `aria-hidden="true"`.

## Shared Helpers (defined in `app.js`)

```js
loadJSON(file)              // fetch + parse data/<file>, throws a readable error
createElement(tag, opts)    // { className, text, html, attrs, children }
renderFallback(el, message) // in-place error message
```

Use `createElement({ text })` rather than template strings so data values are never parsed as HTML.

## Sections

Order in `index.html`: skip link → noscript → navbar → `<main>` → hero (`#home`) → about (`#about`) → services (`#services`) → process (`#process`) → tech (`#tech`) → statistics → portfolio (`#portfolio`) → team (`#team`) → testimonials (`#testimonials`) → contact (`#contact`) → `</main>` → footer → back-to-top → project dialog.

An older `.process-grid` process section and the horizontal team slider were removed. Their CSS is gone too — do not restore them.

## Content Editing Cheatsheet

**Service** (`data/services.json`):
```json
{ "id": 6, "title": "...", "icon": "fas fa-name", "description": "...",
  "features": ["..."], "featured": true }
```

**Project** (`data/portfolio.json`):
```json
{ "id": 5, "title": "...", "category": "web|software|analytics|automation",
  "featured": true, "shortDescription": "...", "description": "...",
  "image": "assets/images/team/name.webp", "technologies": ["..."],
  "role": "...", "client": "...", "year": "2026", "status": "Completed",
  "github": "", "demo": "" }
```
`category` must match a `data-filter` value in `.portfolio-filter`, or the project only shows under "All". Empty `github`/`demo` omit the button. `color` is unused — drop it.

**Team member** (`data/team.json`):
```json
{ "id": 6, "name": "...", "position": "...", "photo": "assets/images/team/name.jpg",
  "bio": "...", "website": "https://..." }
```
`website` optional. Keep `id` values unique.

**Testimonial** (`data/testimonials.json`):
```json
{ "id": 4, "name": "...", "position": "...", "company": "",
  "rating": 5, "message": "...", "photo": "" }
```
`photo` is optional — the avatar is only rendered when non-empty.

## Images

Everything lives in `assets/images/team/`. Filenames must match JSON exactly, **including spaces** (`"sample website.webp"`).

Use `.webp` for photos and screenshots. Team photos render at 140×140 CSS px; project cards at 220px tall. Nothing needs a long edge beyond ~1000px. Team JPEGs should be ≤480px. Oversized assets are the fastest way to slow this site down.

## Accessibility (currently 100% on Lighthouse — preserve it)

- Skip link → `#main`; `<main>` wraps all content, footer sits outside it
- `:focus-visible` outline on every interactive element (global rule in `style.css`)
- `.visually-hidden` utility for accessible text that should not be seen
- Real `<label for>` on every form field, plus a honeypot and `role="status"` region
- Project dialog: `role="dialog"`, `aria-modal`, `aria-labelledby`, focus moved in on open, focus trap on Tab, Escape closes, focus restored to the trigger, `hidden` toggled, body scroll locked
- Star ratings: `role="img"` + `aria-label`, icons `aria-hidden`
- All tap targets ≥44×44px (nav links, footer links, filter buttons, card links, dialog buttons)
- `prefers-reduced-motion` honoured in **both** CSS (`animations.css`) and JS (`animations.js`)
- **Label-in-name:** where a control has visible text, that text must begin the accessible name. Do not use `aria-label` that rewords visible text — append a `.visually-hidden` span instead. Adding a disagreeing `aria-label` fails Lighthouse's `label-content-name-mismatch`.
- Exactly one `<h1>`; no heading-level skips; unique element IDs

## External Dependencies

Pinned in `index.html` — do not change versions casually:
- Google Fonts: Inter (300–700) + Poppins (500–800)
- Font Awesome 6.7.1 via cdnjs
- Google Analytics 4, property `G-WTDKF7Z8ZC`, `anonymize_ip: true`, running under **Consent Mode v2** (see below). The `gtag/js?id=` loader and the `gtag('config', ...)` ID **must match** — they previously did not.
- Contact form posts to **Web3Forms** via a hardcoded `access_key` hidden input

`robots.txt` and `sitemap.xml` reference `https://happysadmi.com/`. Update both if the real domain differs.

## Known Gaps

1. **The `software` portfolio filter matches no project.** `portfolio.json` has only `web`, `analytics`, and `automation` entries. The empty state renders a message, but either add a software project or remove that filter button.
2. `robots.txt` `Disallow` rules and the sitemap assume a `happysadmi.com` domain that may not be the deployed one.
3. No `<noscript>` fallback content — only a notice pointing to the email address.
4. `privacy.html` was written by an engineer, not a lawyer. It reflects the site as built today (form fields, Web3Forms, GA4, fonts). Re-check it whenever you change what the site collects or which third parties are involved, and have it reviewed before relying on it for compliance.
5. No CI, tests, or linter. Everything is verified manually.
6. `?v=` cache-busting is a manual step (see rule 4).
7. `privacy.html` states a 14-month analytics retention window. Confirm that matches the setting in your GA4 property; if not, fix one of the two.

## Verification

There is no test suite. After any change:

1. Serve over HTTP — never test via `file://`.
2. **Bump `?v=`** in `index.html` if you touched CSS or JS.
3. Check the console and network tab: zero 404s and zero errors is the bar.
4. Confirm each section populates: Services (5), Portfolio (4), Team (5), Testimonials (3).
5. Test every portfolio filter, including the empty state.
6. Test the dialog: open via Details, close via X / overlay / Escape; confirm focus moves in, traps, and returns.
7. Test the mobile menu at ≤768px: opens, moves focus in, Escape and outside-click close it, `aria-expanded` flips, icon toggles.
8. Run Lighthouse — Accessibility, Best Practices, and SEO must all stay at 1.0 with zero failures.
9. Validate JSON after editing it; a trailing comma silently blanks a section.
10. Verify brace balance in any CSS you edit (regex surgery has broken this before).

## Conventions for AI Agents

- Do not add a framework, bundler, or package manager.
- Do not convert to a static site generator without explicit approval.
- Do not restructure the CSS into preprocessor files without explicit approval.
- Do not use PowerShell `Get-Content`/`Set-Content` on source files — they silently mangle UTF-8. Use the edit/write tools, or Python with explicit `encoding="utf-8"`.
- Prefer editing existing files over creating new ones. The project is intentionally flat.
- Follow the existing pattern for new features: markup in `index.html`, styles in the matching CSS file, behaviour in the matching `assets/js/*.js` file, content in `data/*.json`.
- Keep `AGENTS.md` and `README.md` updated when architecture or conventions change.