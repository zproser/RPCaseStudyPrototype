# Case Study Prototype — project context

Static **HTML + CSS + vanilla JS** prototype for a case study–style landing page (hero, overview, video break, objective, solution, impact, metrics). No build step or package manager; open `index.html` in a browser or serve the folder with any static server.

## Files

| File | Role |
|------|------|
| `index.html` | Structure: `header`, `main` (sections), menu overlay, scripts |
| `styles.css` | All layout, typography, themes (`.block-light` / `.block-dark`), animations |
| `app.js` | Scroll model, nav, wheel/keyboard between slides, observers, overview image scale |
| `Assets/` | Images and `RPRobot.svg` (logo) |
| `References/` | Design reference PNGs (not loaded by the app) |

## Layout & scroll model

- **`main`** is the vertical scroll container (`height: 100vh`, hidden scrollbar). “Slides” are **`main .section`** elements in DOM order.
- **Section order (important for JS):** `#hero-home` → `#project-overview` → `#video-break` → `#objective` (inside `.video-objective-stack`) → `#solution` → `#impact` → `#metrics`.
- **Snap / slide navigation** uses **`scrollTopForSectionIndex(index)`**, which sums each section’s **`offsetHeight`**. Sections are **not** all exactly one viewport tall: **`#objective`** uses `min-height: 100vh`, `height: auto`, and `overflow-y: visible` so long content isn’t clipped; the wheel handler scrolls **`main`** through a tall objective before advancing to the next slide.
- **`#video-break`** is **sticky** inside `.video-objective-stack`; wheel on that slide always jumps to the adjacent slide (no inner scroll).
- **`#project-overview`** may use **inner section scroll** when content overflows; wheel defers to that until top/bottom, then moves between slides.

## JavaScript (`app.js`) — useful hooks

- **`sections`** — `Array.from(document.querySelectorAll("main .section"))`; keep in sync with HTML if you add/remove slides.
- **`jumpToSection(index)`** — programmatic scroll to a slide; uses `scrollTo({ behavior: "smooth" })` on `main`.
- **`getSectionScrollTops()` / `scrollTopForSectionIndex` / `mainScrollTopToActiveSectionIndex`** — cumulative geometry; don’t replace with `index * innerHeight` unless all sections are fixed height.
- **`.fade-in` + `IntersectionObserver`** — toggles **`is-visible`** on sections (`root: main`, `threshold: 0.35`). Section reveal is **opacity-only** on `.fade-in` (no `translateY` on full-viewport sections — avoids overlap while scrolling).
- **Objective rows** — stagger uses class **`objective-rows--reveal`** on `.objective-rows` (separate from section `is-visible`); see CSS under `#objective .objective-rows`.
- **`prefers-reduced-motion`** — respected in CSS and for some JS paths (e.g. overview scale, smooth scroll).

## CSS conventions

- **Typography:** Montserrat (Google Fonts in `index.html`).
- **Tokens:** `:root` variables (`--ink`, `--ink-dim`, `--line-light`, etc.).
- **Sections:** `.section` base (full-width, padding); **`.block-light`** (light grid) vs **`.block-dark`** (dark gradient). Dot spotlight on `.block-light` uses `--dot-mx` / `--dot-my` from pointer handlers in `app.js`.
- **Two-line headlines** (Objective, Solution, Impact): **`h2` with two `.objective-headline-line` / `.solution-headline-line` / `.impact-headline-line` spans**, `white-space: nowrap` per line. **Do not** set a different **`font-size`** on these `h2`s — they use the **global `h2` scale** (see below).

## Global heading scale (required)

Headings use **semantic HTML** (`h1`–`h4` as appropriate) and a **single global scale** in `styles.css`. **Do not** add section-specific **`font-size`** rules on headings (e.g. avoid `#section-id h2 { font-size: … }`) unless you are fixing a one-off bug and you update this doc.

**Defaults (see `styles.css` near `h1, h2` / `h3`):**

| Level | Role | Desktop (≥901px) | Mobile (≤900px) |
|-------|------|-------------------|------------------|
| **`h1`** | Page / hero title | **80px** (with `h1, h2` rule) | **`clamp(2.2rem, 11vw, 4rem)`** |
| **`h2`** | Section headlines, multi-line titles, metrics quote block | **80px** (shared with `h1`) | Same clamp as `h1` |
| **`h3`** | Subsection / card titles where `h3` is correct | **32px** | **`clamp(1.375rem, 4.2vw, 32px)`** |
| **`h4`** | Lower-level titles (e.g. metric card subtitles) | Scoped in context (e.g. `#metrics h4.metrics-card__title`) until a global `h4` block exists | Follow mobile `h3` clamp where applicable |

**Shared properties:** `h1` and `h2` share **`line-height: 1.04`**, **`letter-spacing: -0.02em`**, and a **`max-width`** on the base rule (sections may narrow further, e.g. Overview).

**Inside an `h2`:** If you split content (e.g. quotation mark + sentence), child spans should use **`font-size: 1em`** (or **`inherit`**) so they **match the parent `h2`** — never a smaller local `clamp()` for the main line unless the design system changes above.

**Adding `h5` / `h6`:** Define them once in the same area of `styles.css` and extend this table; avoid duplicating sizes per section.

## Editing guidelines for agents

- Prefer **small, targeted changes**; match existing naming and patterns.
- **Headings:** Use **global `h1` / `h2` / `h3`** scales only; don’t introduce per-section heading **`font-size`** overrides without updating **Global heading scale** in this file.
- **Don’t** reintroduce **`translateY` on entire `.fade-in` sections** without checking overlap with neighbors.
- After changing **section order or heights**, verify **`getSectionScrollTops()`** behavior and wheel / `jumpToSection` still feel correct.
- **Images:** paths under `Assets/`; broken refs will show missing assets in the References folder vs `Assets/`.

## Local preview

```bash
# optional — any static server from project root
python3 -m http.server 8080
# then open http://localhost:8080
```

Double-clicking `index.html` also works for most static assets; use a server if you hit CORS or module issues (not applicable to current setup).
