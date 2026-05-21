# CLOVER OOC

> Image-generation OOC prompts for narrative roleplay — bilingual (EN/RU) catalogue with example renders and remix tools.

**Live site:** https://aceeenvw.github.io/clover-ooc/
**Repository:** https://github.com/aceeenvw/clover-ooc

---

## Table of Contents

1. [What is this?](#what-is-this)
2. [Pages](#pages)
3. [Project structure](#project-structure)
4. [Data files](#data-files)
5. [Local development](#local-development)
6. [Adding a new prompt](#adding-a-new-prompt)
7. [Adding an example image](#adding-an-example-image)
8. [Deployment](#deployment)
9. [Tech stack](#tech-stack)
10. [License & credits](#license--credits)

---

## What is this?

CLOVER OOC is a static catalogue of **OOC-style image-generation prompts** designed for narrative roleplay, character cards, and visual storytelling. "OOC" (out of character) prompts are bracketed instructions like `[OOC:Image generation — ...]` that you can drop into a roleplay chat to ask an LLM-with-image-tools (or a separate image model) to render a specific moment.

Every prompt is:

- **Hand-written** — not procedurally generated; each one tries to nail a single emotional or compositional beat.
- **Bilingual** — every entry has an English title and a Russian translation (`titleRu`). The site has a language toggle.
- **Cataloged** — 250 prompts across themes like Ancient, Deep Space, Fantasy Medieval, Gothic, Neon, Pair, Tropical, and more.
- **Illustrated** — most entries ship with a `.webp` example render so you can see what the prompt actually produces.

In addition to the catalogue, the site includes **remix tools**: pages that let you mix-and-match scenes, restyles, backgrounds, effects, and overlays to build a custom prompt block.

---

## Pages

| Page | File | What it does |
|---|---|---|
| **Home** | `index.html` | Landing page. Hero, featured prompts pulled from `prompts-data.json`, call-to-action into the catalogue. |
| **Catalogue** | `catalogue.html` | Full grid of all 250 prompts. Filter by category and tag, switch language, open a modal to read the full prompt and copy it. |
| **Scenes** | `scenes.html` | Scene-prompt builder. Loads `scene-prompts-data.json` and lets you assemble situational prompts grouped by section. |
| **Restyle** | `restyle.html` | Restyle prompts — instructions that re-render an existing image in a different aesthetic. Loads `restyle-data.json`. |
| **Tools** | `tools.html` | Mix-and-match builder. Combines entries from `prompts-data.json`, `effects-curated.json`, `backgrounds-data.json`, and `overlays-data.json` into a single composable prompt. |
| **Guide** | `guide.html` | Static guide explaining the OOC syntax, how to use the prompts, and best practices. No data fetching. |

All pages share `css/style.css` (global styles + layout) and `js/main.js` (language toggle, shared utilities), then layer on a page-specific CSS and JS pair.

---

## Project structure

```
clover-ooc/
├── index.html                    # Homepage
├── catalogue.html                # Prompt grid
├── scenes.html                   # Scene-prompt page
├── restyle.html                  # Restyle-prompt page
├── tools.html                    # Effects/backgrounds/overlays mixer
├── guide.html                    # Static usage guide
│
├── prompts-data.json             # 250 main prompts (catalogue + featured + tools)
├── scene-prompts-data.json       # Scene prompts grouped by section
├── restyle-data.json             # Restyle prompts grouped by section
├── backgrounds-data.json         # Backgrounds (categorized)
├── effects-curated.json          # Effects (categorized, stacks)
├── overlays-data.json            # Overlays (categorized)
├── translations.json             # EN/RU translations for tags, categories, kinds
│
├── assets/
│   └── clover.svg                # Favicon
│
├── css/
│   ├── style.css                 # Global styles, layout, typography
│   ├── catalogue.css             # Catalogue grid + modal
│   ├── guide.css                 # Guide page
│   ├── restyle.css               # Restyle page
│   ├── scenes.css                # Scenes page
│   └── tools.css                 # Tools page
│
├── js/
│   ├── main.js                   # Shared: language toggle, featured prompts loader
│   ├── catalogue.js              # Catalogue grid, filters, modal logic
│   ├── scenes.js                 # Scene-prompt rendering & copy
│   ├── restyle.js                # Restyle-prompt rendering & copy
│   └── tools.js                  # Mix-and-match prompt builder
│
├── img-source/                   # 250 .webp example renders (~71 MB total)
│   └── *.webp
│
├── .gitignore
├── DESCRIPTION.txt               # One-line repo description
└── README.md                     # This file
```

**Not in the repo** (excluded via `.gitignore`):

- `.opencode/`, `.claude/` — local AI tooling workspaces
- `node_modules/`, `*.log`, `.DS_Store`, `Thumbs.db` — OS / dev junk
- `img-source-original/`, `img-sources-leftover*/` — local image masters before WebP conversion
- `*.bak`, `*.orig`, `*.tmp` — scratch files

---

## Data files

All data is plain JSON, fetched on page load. No database, no API.

### `prompts-data.json` — main catalogue (250 entries)

A flat list. Each entry:

```json
{
  "id": "pair-60",
  "number": "60",
  "title": "The Notification",
  "tags": ["tension", "psychological", "intimate"],
  "prompt": "[OOC:Image generation — frame the exact moment a phone screen lights up…]",
  "hasImage": true,
  "imgSrc": "img-source/pair-the-notification.webp",
  "titleRu": "Уведомление"
}
```

- `id` — stable slug, used as DOM key.
- `number` — display number within its category.
- `title` / `titleRu` — bilingual titles.
- `tags` — array of tag slugs; human-readable labels live in `translations.json`.
- `prompt` — the full OOC prompt text (what gets copied to clipboard).
- `hasImage` / `imgSrc` — set to `true` + a path under `img-source/` when an example render exists.

### `scene-prompts-data.json` and `restyle-data.json`

Both share the shape `{ "sections": [...] }`. Each section groups related prompts (e.g. all "kitchen" scenes, all "noir" restyles).

### `backgrounds-data.json`, `overlays-data.json`

Shape: `{ "categories": [...] }`. Used by the **Tools** page to populate dropdowns.

### `effects-curated.json`

Shape: `{ "stacks": [...], "categories": [...] }`. Effects can be combined into "stacks" (preset combinations) or picked individually by category.

### `translations.json`

Centralised label dictionary:

```json
{
  "tags": { "tension": { "en": "Tension", "ru": "Напряжение" } },
  "categories": { "pair": { "en": "Pair", "ru": "Пара" } },
  "kind": { ... }
}
```

The JS reads from this so tags and category headings render in the active language without duplicating strings across every data file.

---

## Local development

The site is pure static HTML/CSS/JS. There is **no build step, no bundler, no package manager** for the site itself.

Because pages use `fetch()` to load JSON, opening `index.html` directly via `file://` will fail with CORS errors. You need a local HTTP server. Pick whichever you have installed:

```bash
# Python 3 (built into macOS/Linux)
python3 -m http.server 8000

# Node (if you have it)
npx serve .

# PHP (if you have it)
php -S localhost:8000
```

Then open <http://localhost:8000/> in a browser.

That's it. Edit any HTML / CSS / JS / JSON file and reload the page — changes are live immediately.

---

## Adding a new prompt

1. Open `prompts-data.json`.
2. Append a new object to the list, following the schema above. Pick an `id` that doesn't clash (convention: `<category>-<number>`).
3. Set `hasImage: false` and `imgSrc: ""` if you don't have an example render yet.
4. If you introduce a new tag or category, add the EN/RU labels to `translations.json`.
5. Reload the catalogue page — the prompt appears automatically.

## Adding an example image

Images live under `img-source/` as **WebP** (chosen for size — typical 5–15× smaller than the source PNG/JPEG).

Conversion workflow used in this project:

```bash
# convert a PNG or JPEG → WebP at quality 85 (visually near-lossless for catalogue use)
cwebp -q 85 source.png -o img-source/my-new-prompt.webp
```

Then in `prompts-data.json` set:

```json
"hasImage": true,
"imgSrc": "img-source/my-new-prompt.webp"
```

**Naming convention:** lowercase, hyphen-separated, prefixed with the category (e.g. `pair-the-notification.webp`, `gothic-the-staircase.webp`). GitHub Pages is case-sensitive, so stay all-lowercase to avoid 404s on case-insensitive macOS filesystems.

**Originals:** the project keeps original PNG/JPEG masters outside the repo (see `.gitignore` entries for `img-source-original/` and `img-sources-leftover*/`). Only the WebP version is shipped.

---

## Deployment

The site is hosted on **GitHub Pages**, served straight from `main` / `/` (no Actions, no build).

### One-time setup

1. Push the repo to GitHub (any flat-root layout works).
2. Go to **Settings → Pages**.
3. Under **Build and deployment → Source**, pick **"Deploy from a branch"**.
4. Set **Branch:** `main`, **Folder:** `/ (root)`. Save.
5. First build runs in ~1–5 min. Site lives at `https://<user>.github.io/clover-ooc/`.

### Updates

Just `git push` to `main`. Pages rebuilds automatically within a minute or two.

### Repo size

~73 MB total, dominated by `img-source/` (250 WebP files, ~71 MB). Largest single file is ~1 MB — well under GitHub's 100 MB per-file limit, no Git LFS needed.

---

## Tech stack

- **HTML5** — semantic markup, one file per page.
- **CSS** — hand-written, no preprocessor, no framework. Global tokens in `css/style.css`, page-specific overrides per file.
- **Vanilla JavaScript** — no React, no Vue, no jQuery. Plain `fetch()`, DOM APIs, ES2017+. Per-page entry points are loaded only after the relevant JSON has resolved.
- **WebP** images for all example renders (converted from PNG/JPEG masters with `cwebp -q 85`).
- **No build step.** Open a file, edit, reload. That's the entire workflow.

### Why no framework?

The site is content-first: a handful of pages, a few thousand lines of JS, and a lot of JSON. Adding a framework would be more code than it saves. Static HTML loads instantly, works without JavaScript for the most part (catalogue degrades to "click through to a page" gracefully), and deploys to any dumb static host.

---

## License & credits

- **Prompts and translations:** written by [aceeenvw](https://github.com/aceeenvw). Free to use in your own roleplay / generation workflows; please don't repackage and resell as your own.
- **Example renders:** generated by the author using image-generation models. Provided as illustrative samples for each prompt.
- **Code:** released as-is for personal study and reuse. If you fork the project to host your own catalogue, attribution back to this repo is appreciated but not required.

If you find a typo, broken image, or have a prompt you want added, open an issue or PR on the repo.
