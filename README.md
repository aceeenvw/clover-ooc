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

[ About ](#-about)  ·  [ Pages ](#-pages)  ·  [ Structure ](#-project-structure)  ·  [ Credits ](#-acknowledgements)

</div>

---

## ⟡ About

**CLOVER OOC** is a static catalogue of **OOC-style image-generation prompts** for narrative roleplay, character cards, and visual storytelling.

"OOC" (out of character) prompts are bracketed instructions like `[OOC:Image generation — …]` that you drop into a roleplay chat to ask an LLM-with-image-tools — or a separate image model — to render a specific moment from the scene.

The catalogue holds **250 prompts** across themes such as *Ancient*, *Deep Space*, *Fantasy Medieval*, *Gothic*, *Neon*, *Pair*, *Tropical*, and more. Every entry ships with a bilingual title (English + Russian) and most include a `.webp` example render so you can see what the prompt actually produces.

Beyond the catalogue, the site includes **mix-and-match tools** — pages that let you assemble custom prompt blocks by combining scenes, restyles, backgrounds, effects, and overlays.

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

### ✦ Author

**aceenvw** — catalogue curation, prompt engineering, bilingual translation, site design, and deployment.

---

## ⟡ License

Released as-is for personal study and reuse. If you fork the project to host your own catalogue, attribution back to this repo is appreciated but not required.

The prompts and translations may be used freely in your own generation workflows — please don't repackage and resell them as your own work.

Example renders are illustrative samples generated by the author; treat them as reference material for what each prompt produces, not as standalone art assets.

---

<div align="center">

```
    ⊹                                                               ⊹
         Built for narrative roleplayers who think in pictures.
    ⊹                                                               ⊹
```

</div>
