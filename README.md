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

**250 prompts · 112 scenes · 127 restyles · 110 poses · 383 outfits · 275 hairstyles · 1,395 wardrobe pieces · EN / RU**

[![Site](https://img.shields.io/badge/site-aceeenvw.github.io%2Fclover--ooc-7aa?style=flat-square&labelColor=1a1a1a)](https://aceeenvw.github.io/clover-ooc/)
[![Prompts](https://img.shields.io/badge/prompts-250-c99?style=flat-square&labelColor=1a1a1a)](#-pages)
[![Outfits](https://img.shields.io/badge/outfits-383-d8a?style=flat-square&labelColor=1a1a1a)](#-pages)
[![Hair](https://img.shields.io/badge/hairstyles-275-9d8?style=flat-square&labelColor=1a1a1a)](#-pages)
[![Wardrobe](https://img.shields.io/badge/wardrobe-1%2C395_pieces-a9d?style=flat-square&labelColor=1a1a1a)](#-pages)
[![Images](https://img.shields.io/badge/renders-1%2C018%20webp-b9b?style=flat-square&labelColor=1a1a1a)](#-data-files)
[![i18n](https://img.shields.io/badge/i18n-EN%20%C2%B7%20RU-aaf?style=flat-square&labelColor=1a1a1a)](#-data-files)
[![Author](https://img.shields.io/badge/author-aceenvw-9c9?style=flat-square&labelColor=1a1a1a)](https://github.com/aceeenvw)

</div>

---

## ⟡ About

**CLOVER OOC** is a static catalogue of **OOC-style image-generation prompts** for narrative roleplay, character cards, and visual storytelling.

"OOC" (out of character) prompts are bracketed instructions like `[OOC:Image generation — …]` that you drop into a roleplay chat to ask an LLM-with-image-tools — or a separate image model — to render a specific moment from the scene.

The catalogue holds **250 prompts** across themes such as *Ancient*, *Deep Space*, *Fantasy Medieval*, *Gothic*, *Neon*, *Pair*, *Tropical*, and more. Every entry ships with a bilingual title (English + Russian) and a `.webp` example render so you can see what the prompt actually produces.

Beyond the catalogue, the site includes reusable poses, outfits, hairstyles, detailed scenes, image-restyle prompts, and construction tools for combining wardrobe pieces, backgrounds, effects, overlays, camera terms, and composition.

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
112 situational scene prompts grouped by section.

- ✦ Reads from `scene-prompts-data.json`
- ✦ Copy-to-clipboard per entry

</td>
<td width="50%" valign="top">

### ◈ Restyle — `restyle.html`
127 prompts for re-rendering an existing image in a new aesthetic.

- ✦ Reads from `restyle-data.json`
- ✦ Categorized by visual style family

### ◈ Poses — `poses.html`
110 reusable poses, expressions, reactions, interactions, and movement prompts.

- ✦ Reads from `poses-data.json`
- ✦ 7 accordion sections with bilingual search
- ✦ Complete `.webp` reference coverage
- ✦ Displays localized text while copying canonical English

### ◈ Hair — `hair.html`
275 bilingual hairstyle references with `hairstyle:` lines and reference images.

- ✦ Reads from `hair-data.json`
- ✦ 8 accordion sections, including Medieval & Regal
- ✦ Faceted filtering: vibe (24) + texture (5), plus name search
- ✦ Random button (respects active filters)
- ✦ Click body to copy the `hairstyle:` line
- ✦ Complete `.webp` reference coverage
- ✦ Russian titles, bodies, section descriptions, and interface labels

### ◈ Outfits — `outfits.html`
383 bilingual outfit ideas with `clothes:` lines and reference images.

- ✦ Reads from `outfits-data.json`
- ✦ 19 accordion sections, including Medieval & Fantasy, Gothic & Lolita, Ethereal & Fairy, and Sporty
- ✦ Complete `.webp` reference coverage
- ✦ Click body to copy English `clothes:` line; toggle UI to Russian without changing copy output

### ◈ Wardrobe — `wardrobe.html`
Outfit constructor — pick top + bottom (or dress) + outerwear + shoes + accessories.

- ✦ Reads from `wardrobe-data.json` (1,395 unique pieces curated independently from the outfit collection, including hand-curated shoes)
- ✦ Two modes: Two-Piece or Dress; tab state persisted in localStorage
- ✦ Filter by style tag (16) and color bucket (15)
- ✦ "Surprise me" fills empty slots respecting active filters
- ✦ Shape C i18n: display Russian, copy English

### ◈ Tools — `tools.html`
Mix-and-match builder.

- ✦ Combines `prompts-data.json`, `effects-curated.json`, `backgrounds-data.json`, `overlays-data.json`, and `camera-data.json`
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
├── poses.html                   ·  Poses and expressions
├── hair.html                   ·  275 hairstyle references
├── outfits.html                ·  383 curated outfits
├── wardrobe.html               ·  Outfit constructor (mix & match)
├── tools.html                  ·  Effects / backgrounds / overlays mixer
├── guide.html                  ·  Static usage guide
│
├── prompts-data.json           ·  250 main prompts
├── scene-prompts-data.json     ·  112 scene prompts
├── restyle-data.json           ·  127 restyle prompts
├── poses-data.json             ·  110 poses and expressions
├── outfits-data.json           ·  383 outfits in 19 sections (bilingual)
├── hair-data.json              ·  275 hairstyles in 8 sections (vibe + texture facets)
├── wardrobe-data.json          ·  1,395 wardrobe pieces (bilingual)
├── backgrounds-data.json       ·  Backgrounds (categorized)
├── effects-curated.json        ·  Effects (categorized + stacks)
├── overlays-data.json          ·  Overlays (categorized)
├── camera-data.json            ·  Camera and composition terms
├── translations.json           ·  EN / RU labels for tags & categories
│
├── assets/
│   ├── clover.svg              ·  Favicon
│   ├── outfits/                ·  383 × .webp outfit references
│   ├── hair/                   ·  275 × .webp hairstyle references
│   └── poses-*.webp            ·  110 pose references
│
├── css/
│   ├── style.css               ·  Global tokens, layout, typography
│   ├── index.css               ·  Homepage archive index
│   ├── catalogue.css           ·  Grid + modal
│   ├── guide.css               ·  Guide page
│   ├── restyle.css             ·  Restyle page
│   ├── scenes.css              ·  Scenes page
│   ├── poses.css               ·  Poses page
│   ├── outfits.css             ·  Outfits page
│   ├── hair.css                ·  Hair page (cards, chips, filter panel)
│   ├── wardrobe.css            ·  Wardrobe constructor
│   └── tools.css               ·  Tools page
│
├── js/
│   ├── main.js                 ·  Language toggle · featured loader · shared utils
│   ├── catalogue.js            ·  Grid · filters · modal
│   ├── scenes.js               ·  Scene rendering · copy
│   ├── restyle.js              ·  Restyle rendering · copy
│   ├── poses.js                ·  Pose rendering · search · copy
│   ├── outfits.js              ·  Outfit cards · modal · bilingual
│   ├── hair.js                 ·  Hair cards · modal · vibe/texture filters · random
│   ├── wardrobe.js             ·  Constructor · slots · picker · filters
│   └── tools.js                ·  Mix-and-match builder
├── img-source/                 ·  250 × .webp catalogue renders
│
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

### ◇ `hair-data.json` — hairstyle library (275 entries)

Shape: `{ "sections": [ … ] }` across 8 sections. Each entry carries bilingual titles and `hairstyle:` lines, two independent filter facets — `vibes` (array) and `texture` (single) — and a `.webp` reference under `assets/hair/`.

```json
{
  "id": "hair-1",
  "number": 1,
  "title": "Soft French Bob",
  "body": "hairstyle: chin-length blunt bob with airy ends, soft side part…",
  "vibes": ["elegant", "cutesy", "preppy"],
  "texture": "straight",
  "hasImage": true,
  "imgSrc": "assets/hair/soft-french-bob.webp",
  "titleRu": "Мягкий французский боб",
  "bodyRu": "причёска: ровный боб до подбородка с воздушными концами, мягкий боковой пробор…"
}
```

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
