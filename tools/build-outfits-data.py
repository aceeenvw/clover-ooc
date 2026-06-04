#!/usr/bin/env python3
"""
CLOVER OOC — build outfits-data.json from 265-outfit-ideas-aceenvw.docx
aceenvw

Reads the docx (via pandoc-converted plain text), parses 265 outfits,
assigns each to a section, maps to assets/outfits/*.webp where present.
"""
import json, os, re, subprocess, sys

DOCX = "265-outfit-ideas-aceenvw.docx"
TXT  = "/tmp/outfits.txt"
WEBP_DIR = "assets/outfits"
OUT  = "outfits-data.json"

# Re-derive plain text from docx every run.
subprocess.run(["pandoc", "-f", "docx", "-t", "plain", DOCX, "-o", TXT], check=True)

text = open(TXT).read()
lines = text.split('\n')
clothes_idx = [i for i,l in enumerate(lines) if l.lstrip().startswith('clothes:')]

outfits_raw = []  # list of (title, body) in docx order
for k, ci in enumerate(clothes_idx):
    prev_end = clothes_idx[k-1] if k > 0 else -1
    title = ''
    for j in range(ci-1, prev_end, -1):
        if lines[j].strip():
            title = lines[j].strip()
            break
    next_ci = clothes_idx[k+1] if k+1 < len(clothes_idx) else len(lines)
    body_lines = lines[ci:next_ci]
    if k+1 < len(clothes_idx):
        # strip trailing empties + the title of the next outfit + trailing empties
        while body_lines and not body_lines[-1].strip(): body_lines.pop()
        if body_lines: body_lines.pop()
        while body_lines and not body_lines[-1].strip(): body_lines.pop()
    else:
        while body_lines and not body_lines[-1].strip(): body_lines.pop()
    body = ' '.join(b.strip() for b in body_lines if b.strip())
    outfits_raw.append((title, body))

assert len(outfits_raw) == 265, f"expected 265 outfits, got {len(outfits_raw)}"

# ─── Slugify (matches the convention used by image filenames) ────────────────
def slugify(s):
    s = s.lower().replace('&', 'and')
    s = re.sub(r"[^a-z0-9]+", '-', s)
    return s.strip('-')

# ─── Hand-curated 9 typo / wording variants where outfit slug ≠ image slug ───
TITLE_TO_IMAGE_OVERRIDE = {
    35:  "bohemian-maxi",        # renamed from bohemian-mix
    41:  "sunset-halter-mix",    # outfit "Sunset Halter Maxi"
    56:  "stripped-maxi-coastal",# outfit "Striped Maxi Coastal" (typo in filename)
    95:  "tye-dye-slip",         # outfit "Tie-Dye Slip" (typo in filename)
    116: "faux-fur-denim",       # outfit "Faux Fur & Denim"
    117: "velvet-devour-romance",# outfit "Velvet Devore Romance"
    122: "satin-faux-croc",      # outfit "Satin & Faux Croc"
    180: "tye-dye-set",          # outfit "Tie-Dye Set"
    190: "vintage-lace-gown",    # outfit "Vintage Lace Gown"
}

# ─── Sections (curated boundaries by docx order) ─────────────────────────────
# Each tuple: (id, name, name_ru, description, description_ru, first_outfit, last_outfit_inclusive)
SECTIONS = [
    ("everyday",  "Everyday & Casual",      "Будни и кэжуал",
     "Daytime staples — denim, tanks, soft layering",
     "Дневные базы — джинсы, топы, мягкие слои",
     1, 32),
    ("coastal",   "Coastal & Summer",       "Курорт и лето",
     "Sundresses, linen, beach-to-street",
     "Сарафаны, лён, с пляжа в город",
     33, 56),
    ("color-pop", "Color Pop & Statement",  "Цветовые акценты",
     "Saturated single colors, bold statement pieces",
     "Насыщенные моно-цвета, смелые акценты",
     57, 100),
    ("rich-tones","Rich Tones & Texture",   "Богатые оттенки и фактуры",
     "Burgundy, plum, chocolate, suede, leather — moody luxe",
     "Бордо, слива, шоколад, замша, кожа — насыщенно",
     101, 130),
    ("streetwear","Streetwear & Y2K Edge",  "Стритвир и Y2K",
     "Anime, manga, vaporwave, cyber, skater energy",
     "Аниме, манга, вэйпорвэйв, кибер, скейтер",
     131, 140),
    ("coquette",  "Coquette & Sweet",       "Кокетт и сладкое",
     "Bows, lace, pink, doll energy, ballerina softness",
     "Банты, кружево, розовое, кукольно, балетно",
     141, 150),
    ("night",     "Cocktail & Night Out",   "Коктейль и вечер",
     "Bodycon, satin, cutouts, dance-floor ready",
     "Облегающее, сатин, вырезы, готово для танцпола",
     151, 160),
    ("cozy",      "Cozy & Knitwear",        "Уют и трикотаж",
     "Sweaters, coats, wool, fur — winter layering",
     "Свитера, пальто, шерсть, мех — зимние слои",
     161, 170),
    ("swim",      "Swim",                   "Купальники",
     "Bikinis, monokinis, swim sets",
     "Бикини, монокини, пляжные комплекты",
     171, 180),
    ("lingerie",  "Lingerie & Sleep",       "Бельё и сон",
     "Slip sets, lace, camisoles, soft babydolls",
     "Комбинации, кружево, камисоли, бэбидоллы",
     181, 184),
    ("bridal",    "Bridal",                 "Свадебное",
     "Wedding gowns — A-line, mermaid, boho, ballgown, vintage lace",
     "Свадебные платья — А-силуэт, рыбка, бохо, бальное, винтажное кружево",
     185, 190),
    ("y2k-mix",   "Y2K Color Mix & Pop",    "Y2K-цвет и поп",
     "Neon clash, festival, candy grunge, holographic",
     "Неон-клэш, фестиваль, кэнди-гранж, голограмма",
     191, 215),
    ("goth-punk", "Goth & Punk",            "Готика и панк",
     "Distressed, tartan, velvet grunge, damask romance",
     "Деструктив, тартан, вельвет-гранж, дамаск",
     206, 210),  # NOTE overlap fixed below
    ("daily-mod", "Daily Modern Mix",       "Современный микс",
     "Citrus, color block, electric pastel, easy weekend energy",
     "Цитрус, колор-блок, электро-пастель, выходные",
     216, 240),
    ("pink-y2k",  "Mean Girls Pink",        "Розовый Mean Girls",
     "Y2K hot-pink everything — bombshell, preppy, velour",
     "Y2K розовое всё — бомба, преппи, велюр",
     241, 265),
]

# Fix the overlap: pull goth-punk OUT of y2k-mix, and re-bound y2k-mix to skip 206-210.
# We'll resolve by assigning each outfit to the section whose [first..last] range
# contains it, with later definitions overriding earlier (so goth-punk wins for 206-210).
def section_for(n):
    chosen = None
    for sec in SECTIONS:
        sid, _, _, _, _, lo, hi = sec
        if lo <= n <= hi:
            chosen = sid
    return chosen or "everyday"

# ─── Preserve existing translations across re-runs ───────────────────────────
# If outfits-data.json already exists, capture:
#   - per-outfit:  id -> titleRu / bodyRu
#   - per-section: id -> {name, nameRu, description, descriptionRu}
# so a parser re-run doesn't wipe the manual RU edits OR overwrite any
# section-label polish that came in via tools/merge-translations.py.
existing_titleRu = {}
existing_bodyRu = {}
existing_section_labels = {}   # sid -> dict of overrides
if os.path.exists(OUT):
    try:
        with open(OUT) as f:
            prev = json.load(f)
        for sec in prev.get("sections", []):
            for p in sec.get("prompts", []):
                if p.get("titleRu"):
                    existing_titleRu[p["id"]] = p["titleRu"]
                if p.get("bodyRu"):
                    existing_bodyRu[p["id"]] = p["bodyRu"]
            existing_section_labels[sec["id"]] = {
                "name":          sec.get("name"),
                "nameRu":        sec.get("nameRu"),
                "description":   sec.get("description"),
                "descriptionRu": sec.get("descriptionRu"),
            }
    except Exception as e:
        print(f"WARN: could not load previous {OUT} for translation preservation: {e}")

# ─── Build records ───────────────────────────────────────────────────────────
existing_webps = set(os.path.splitext(f)[0] for f in os.listdir(WEBP_DIR) if f.endswith('.webp'))

records_by_section = {sec[0]: [] for sec in SECTIONS}
matched_imgs = set()

for idx, (title, body) in enumerate(outfits_raw, 1):
    sec_id = section_for(idx)
    img_slug = TITLE_TO_IMAGE_OVERRIDE.get(idx, slugify(title))
    has_image = img_slug in existing_webps
    if has_image:
        matched_imgs.add(img_slug)
    iid = f"outfit-{idx}"
    rec = {
        "id": iid,
        "number": idx,
        "title": title,
        "body": body,
        "hasImage": has_image,
        "imgSrc": f"assets/outfits/{img_slug}.webp" if has_image else None,
        "gender": "female",
        "titleRu": existing_titleRu.get(iid),
        "bodyRu": existing_bodyRu.get(iid),
    }
    records_by_section[sec_id].append(rec)

# ─── Assemble final JSON in section order ────────────────────────────────────
# Per-section labels: existing JSON values take precedence over the hardcoded
# defaults in the SECTIONS array, so manual TSV-merge polish survives re-runs.
data = {"sections": []}
for sid, name, name_ru, desc, desc_ru, lo, hi in SECTIONS:
    prompts = records_by_section[sid]
    if not prompts:
        continue
    prev = existing_section_labels.get(sid, {})
    data["sections"].append({
        "id": sid,
        "name":          prev.get("name")          or name,
        "nameRu":        prev.get("nameRu")        or name_ru,
        "description":   prev.get("description")   or desc,
        "descriptionRu": prev.get("descriptionRu") or desc_ru,
        "prompts": prompts,
    })

with open(OUT, "w") as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

# ─── Report ──────────────────────────────────────────────────────────────────
total = sum(len(s["prompts"]) for s in data["sections"])
imaged = sum(1 for s in data["sections"] for p in s["prompts"] if p["hasImage"])
print(f"Wrote {OUT}: {total} outfits across {len(data['sections'])} sections")
print(f"Images matched: {imaged}/{total}")
print(f"Image files orphaned (in {WEBP_DIR} but not referenced): "
      f"{sorted(existing_webps - matched_imgs)}")
print()
print("Section sizes:")
for s in data["sections"]:
    with_img = sum(1 for p in s["prompts"] if p["hasImage"])
    print(f"  {s['id']:12} {len(s['prompts']):3} outfits ({with_img} with image)")
