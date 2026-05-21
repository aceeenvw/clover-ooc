<div align="center">

```
        ╔══════════════════════════════════════════════════════╗
        ║                                                      ║
        ║           ⊹   C L O V E R   ·   O O C   ⊹            ║
        ║                                                      ║
        ║       A bilingual catalogue of image-generation      ║
        ║          prompts for narrative roleplay              ║
        ║                                                      ║
        ╚══════════════════════════════════════════════════════╝
```

**250 prompts · Example renders · Mix-and-match tools · EN / RU**

[![Site](https://img.shields.io/badge/site-aceeenvw.github.io%2Fclover--ooc-7aa?style=flat-square&labelColor=1a1a1a)](https://aceeenvw.github.io/clover-ooc/)
[![Prompts](https://img.shields.io/badge/prompts-250-c99?style=flat-square&labelColor=1a1a1a)](#-pages)
[![Images](https://img.shields.io/badge/renders-250%20webp-b9b?style=flat-square&labelColor=1a1a1a)](#-data-files)
[![i18n](https://img.shields.io/badge/i18n-EN%20%C2%B7%20RU-aaf?style=flat-square&labelColor=1a1a1a)](#-data-files)
[![Build](https://img.shields.io/badge/build-static%20%C2%B7%20no%20bundler-bbb?style=flat-square&labelColor=1a1a1a)](#-tech-stack)
[![Author](https://img.shields.io/badge/author-aceeenvw-9c9?style=flat-square&labelColor=1a1a1a)](https://github.com/aceeenvw)

[ About ](#-about)  ·  [ Pages ](#-pages)  ·  [ Structure ](#-project-structure)  ·  [ Data ](#-data-files)  ·  [ Develop ](#-local-development)  ·  [ Deploy ](#-deployment)  ·  [ Credits ](#-acknowledgements)

</div>

---

## ⟡ About

**CLOVER OOC** is a static catalogue of **OOC-style image-generation prompts** for narrative roleplay, character cards, and visual storytelling.

"OOC" (out of character) prompts are bracketed instructions like `[OOC:Image generation — …]` that you drop into a roleplay chat to ask an LLM-with-image-tools — or a separate image model — to render a specific moment from the scene.

The catalogue holds **250 prompts** across themes such as *Ancient*, *Deep Space*, *Fantasy Medieval*, *Gothic*, *Neon*, *Pair*, *Tropical*, and more. Every entry ships with a bilingual title (English + Russian) and most include a `.webp` example render so you can see what the prompt actually produces.

Beyond the catalogue, the site includes **mix-and-match tools** — pages that let you assemble custom prompt blocks by combining scenes, restyles, backgrounds, effects, and overlays.

Everything is static HTML, CSS, vanilla JS, and JSON. No bundler, no framework, no build step.

---

## ◆ Pages

<table>
<tr>
<td width="50%" valign="top">

### ◇ Home — `index.html`
Landing page with hero, featured prompts, and a CTA into the catalogue.

- ✦ Reads from `prompts-data.json`
- ✦ Bilingual language toggle
- ✦ Featured set rotates per category

### ◇ Catalogue — `catalogue.html`
The full grid of all 250 prompts.

- ✦ Filter by category and tag
- ✦ Language switch (EN / RU)
- ✦ Modal viewer with full prompt + copy button
- ✦ Lazy-loaded `.webp` thumbnails

### ◇ Scenes — `scenes.html`
Situational scene prompts grouped by section.

- ✦ Reads from `scene-prompts-data.json`
- ✦ Copy-to-clipboard per entry

</td>
<td width="50%" valign="top">

### ◈ Restyle — `restyle.html`
Restyle prompts — re-render an existing image in a new aesthetic.

- ✦ Reads from `restyle-data.json`
- ✦ Categorized by visual style family

### ◈ Tools — `tools.html`
Mix-and-match builder. The most powerful page.

- ✦ Combines `prompts-data.json`, `effects-curated.json`, `backgrounds-data.json`, `overlays-data.json`
- ✦ Stacks effects into preset combinations
- ✦ Outputs a single composable OOC block

### ◈ Guide — `guide.html`
Static usage guide.

- ✦ Explains OOC syntax
- ✦ Best practices for prompting
- ✦ Zero data fetching — pure HTML

</td>
</tr>
</table>

All pages share `css/style.css` and `js/main.js` (global styles + language toggle), then layer on a page-specific CSS and JS pair.

---

## ⟡ Project Structure

```
clover-ooc/
│
├── index.html                  ·  Homepage
├── catalogue.html              ·  Prompt grid
├── scenes.html                 ·  Scene-prompt page
├── restyle.html                ·  Restyle-prompt page
├── tools.html                  ·  Effects / backgrounds / overlays mixer
├── guide.html                  ·  Static usage guide
│
├── prompts-data.json           ·  250 main prompts
├── scene-prompts-data.json     ·  Scene prompts (sections)
├── restyle-data.json           ·  Restyle prompts (sections)
├── backgrounds-data.json       ·  Backgrounds (categorized)
├── effects-curated.json        ·  Effects (categorized + stacks)
├── overlays-data.json          ·  Overlays (categorized)
├── translations.json           ·  EN / RU labels for tags & categories
│
├── assets/
│   └── clover.svg              ·  Favicon
│
├── css/
│   ├── style.css               ·  Global tokens, layout, typography
│   ├── catalogue.css           ·  Grid + modal
│   ├── guide.css               ·  Guide page
│   ├── restyle.css             ·  Restyle page
│   ├── scenes.css              ·  Scenes page
│   └── tools.css               ·  Tools page
│
├── js/
│   ├── main.js                 ·  Language toggle · featured loader · shared utils
│   ├── catalogue.js            ·  Grid · filters · modal
│   ├── scenes.js               ·  Scene rendering · copy
│   ├── restyle.js              ·  Restyle rendering · copy
│   └── tools.js                ·  Mix-and-match builder
│
├── img-source/                 ·  250 × .webp example renders  (~71 MB)
│
├── .gitignore
├── DESCRIPTION.txt             ·  One-line repo description
└── README.md                   ·  This file
```

> **◦ Not tracked in git** (via `.gitignore`):
> `.opencode/` · `.claude/` — local AI tooling workspaces
> `node_modules/` · `*.log` · `.DS_Store` · `Thumbs.db` — OS / dev junk
> `img-source-original/` · `img-sources-leftover*/` — pre-conversion image masters
> `*.bak` · `*.orig` · `*.tmp` — scratch files

---

## ◆ Data Files

All data lives as plain JSON, fetched on page load. No database, no API, no auth.

### ◇ `prompts-data.json` — main catalogue (250 entries)

Flat list. Schema per entry:

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

| Field | Purpose |
|---|---|
| `id` | Stable slug, used as DOM key |
| `number` | Display number within its category |
| `title` / `titleRu` | Bilingual titles |
| `tags` | Tag slugs; readable labels live in `translations.json` |
| `prompt` | Full OOC text — exactly what gets copied to clipboard |
| `hasImage` / `imgSrc` | `true` + a path under `img-source/` when a render exists |

### ◇ `scene-prompts-data.json` · `restyle-data.json`

Shape: `{ "sections": [ … ] }`. Each section groups related prompts (e.g. all "kitchen" scenes, all "noir" restyles).

### ◇ `backgrounds-data.json` · `overlays-data.json`

Shape: `{ "categories": [ … ] }`. Used by the **Tools** page to populate dropdowns.

### ◇ `effects-curated.json`

Shape: `{ "stacks": [ … ], "categories": [ … ] }`. Effects combine into preset *stacks*, or you pick individually by category.

### ◇ `translations.json`

Centralised label dictionary:

```json
{
  "tags":       { "tension":  { "en": "Tension",  "ru": "Напряжение" } },
  "categories": { "pair":     { "en": "Pair",     "ru": "Пара"       } },
  "kind":       { "...":      { "en": "...",      "ru": "..."        } }
}
```

The JS reads from here so labels render in the active language without duplicating strings across every data file.

---

## ⟡ Local Development

The site is pure static HTML / CSS / JS. **No build step, no bundler, no package manager** for the site itself.

Because pages use `fetch()` to load JSON, opening `index.html` directly via `file://` fails with CORS errors. Run any local HTTP server:

```bash
# Python 3  ·  built into macOS / Linux
python3 -m http.server 8000

# Node      ·  via npx
npx serve .

# PHP       ·  if installed
php -S localhost:8000
```

Then open <http://localhost:8000/> — edit any file and reload.

```
  Workflow:
  └─ Edit any .html / .css / .js / .json
     └─ Reload the page
        └─ Done. That is the entire dev loop.
```

---

## ◆ Adding Content

### ◇ A new prompt

1. Open `prompts-data.json`
2. Append a new object to the list (schema above). Pick a unique `id` — convention: `<category>-<number>`
3. Set `hasImage: false` and `imgSrc: ""` if you don't have a render yet
4. If you introduce a new tag or category, add the EN / RU labels to `translations.json`
5. Reload the catalogue — the entry appears automatically

### ◇ A new example image

Images live under `img-source/` as **WebP** — typically 5–15× smaller than the source PNG / JPEG.

```bash
# convert a PNG or JPEG → WebP at quality 85 (near-lossless for catalogue use)
cwebp -q 85 source.png -o img-source/my-new-prompt.webp
```

Then in `prompts-data.json`:

```json
"hasImage": true,
"imgSrc": "img-source/my-new-prompt.webp"
```

> **◦ Naming convention** — lowercase, hyphen-separated, prefixed with the category
> (e.g. `pair-the-notification.webp`, `gothic-the-staircase.webp`).
> GitHub Pages is case-sensitive — stay all-lowercase to avoid 404s that don't appear on case-insensitive macOS.

**Originals** — keep the source PNG / JPEG masters outside the repo. The `.gitignore` already excludes `img-source-original/` and `img-sources-leftover*/` for this purpose. Only the WebP version is shipped.

---

## ⟡ Deployment

Hosted on **GitHub Pages**, served straight from `main` / root. No Actions, no build pipeline.

### ◇ One-time setup

1. Push the repo to GitHub (any flat-root layout works)
2. **Settings → Pages**
3. **Source** → "Deploy from a branch"
4. **Branch:** `main` · **Folder:** `/ (root)` · **Save**
5. First build runs in 1–5 min → site lives at `https://<user>.github.io/clover-ooc/`

### ◇ Updates

```bash
git push origin main
```

Pages rebuilds automatically within a minute or two.

### ◇ Repo size

<div align="center">

| Component | Size | Notes |
|---|---|---|
| Code (HTML + CSS + JS) | ~250 KB | All hand-edited, no dependencies |
| Data (JSON) | ~500 KB | Seven JSON files, largest is `prompts-data.json` (~190 KB) |
| Images (`img-source/`) | ~71 MB | 250 × `.webp`, largest single file ~1 MB |
| **Total** | **~73 MB** | Well under GitHub's 5 GB soft limit · no Git LFS needed |

</div>

---

## ◆ Tech Stack

<div align="center">

| Layer | Technology | Notes |
|---|---|---|
| Markup | HTML5 | Semantic, one file per page |
| Styling | Plain CSS | No preprocessor, no framework, no Tailwind |
| Logic | Vanilla JavaScript (ES2017+) | No React · No Vue · No jQuery · No bundler |
| Data | Static JSON | Fetched on page load via `fetch()` |
| Images | WebP | Converted from PNG / JPEG masters with `cwebp -q 85` |
| Hosting | GitHub Pages | Direct from `main` / root, no Actions |
| Build | **None** | Edit · reload · ship |
| Dependencies | **Zero external** | Pages run with their JS files disabled too (graceful degrade) |

</div>

### ◇ Why no framework?

The site is content-first — six pages, a few thousand lines of JS, and a lot of JSON. A framework would be more code than it saves. Static HTML loads instantly, the catalogue still works as plain navigation if JS is disabled, and the whole thing deploys to any dumb static host.

---

## ⟡ Acknowledgements

<div align="center">

```
                      ╭───────────────────────╮
                      │    With gratitude to  │
                      ╰───────────────────────╯
```

</div>

### ✦ The image-generation models

Without modern image-generation tools there'd be no renders to catalogue. The example images in `img-source/` were produced using a mix of contemporary generators — each prompt is calibrated against what these models can actually deliver.

### ✦ The roleplay community

Whoever first started writing `[OOC: ...]` blocks in chat to drive scene visuals — you started something. This catalogue is a tribute to that practice.

### ✦ Author

**aceenvw** — catalogue curation, prompt engineering, bilingual translation, site design, and deployment.

---

## ⟡ License

Released as-is for personal study and reuse. If you fork the project to host your own catalogue, attribution back to this repo is appreciated but not required.

The prompts and translations may be used freely in your own generation workflows — please don't repackage and resell them as your own work.

Example renders are illustrative samples generated by the author; treat them as reference material for what each prompt produces, not as standalone art assets.

---

## ◆ Contributing

Found a typo, a broken image, or a prompt you want added?
Open an **issue** or **pull request** on the repo.

```
  Ideas for future versions:
  ╭─────────────────────────────────────────────────────────────╮
  │  v1.1  ·  Search across prompt text (not just titles)       │
  │  v1.2  ·  Personal favorites / collections (localStorage)   │
  │  v1.3  ·  Per-prompt aspect-ratio hints                     │
  │  v1.4  ·  Side-by-side compare for restyle prompts          │
  │  v2.0  ·  User-submitted renders gallery                    │
  ╰─────────────────────────────────────────────────────────────╯
```

---

<div align="center">

```
    ⊹                                                               ⊹
         Built for narrative roleplayers who think in pictures.
    ⊹                                                               ⊹
```

</div>
