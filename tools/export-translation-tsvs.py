#!/usr/bin/env python3
"""
CLOVER OOC — export translation TSVs for hand-editing
aceenvw

Produces three TSVs in repo root:
  styles-translations-preview.tsv     (16 tags from wardrobe-data tagsRu)
  colors-translations-preview.tsv     (15 color buckets + neutral + multi)
  outfits-translations-preview.tsv    (265 outfit titles + bodies)

Each row has an EN column and a RU column. The RU column is pre-filled
with current translations where they exist (so the user can polish rather
than start from scratch). Untranslated entries are blank for filling.
"""
import json, csv, os

WARDROBE = "wardrobe-data.json"
OUTFITS  = "outfits-data.json"

OUT_STYLES   = "styles-translations-preview.tsv"
OUT_COLORS   = "colors-translations-preview.tsv"
OUT_OUTFITS  = "outfits-translations-preview.tsv"
OUT_SECTIONS = "sections-translations-preview.tsv"

# ─── COLOR BUCKETS — current best-guess RU (matches translate-wardrobe.py) ───
COLORS_RU_SEED = {
    "white":   "белый",
    "cream":   "кремовый",
    "beige":   "бежевый",
    "brown":   "коричневый",
    "black":   "чёрный",
    "grey":    "серый",
    "red":     "красный",
    "pink":    "розовый",
    "orange":  "оранжевый",
    "yellow":  "жёлтый",
    "green":   "зелёный",
    "blue":    "синий",
    "purple":  "фиолетовый",
    "neutral": "нейтральный",
    "multi":   "разноцветный",
}

def export_styles():
    """Style tags from wardrobe-data.tagsRu — already locked in, but easy to polish."""
    with open(WARDROBE) as f:
        d = json.load(f)
    tags = d.get("tagVocabulary", [])
    tagsRu = d.get("tagsRu", {})
    rows = [(t, tagsRu.get(t, "")) for t in tags]
    with open(OUT_STYLES, "w", newline="") as f:
        w = csv.writer(f, delimiter="\t")
        w.writerow(["id", "EN", "RU"])
        for tid, ru in rows:
            w.writerow([tid, tid, ru])
    print(f"Wrote {OUT_STYLES}  ({len(rows)} style tags)")

def export_colors():
    """13 color buckets + neutral + multi. Used by the picker filter row."""
    with open(WARDROBE) as f:
        d = json.load(f)
    buckets = d.get("colorBuckets", list(COLORS_RU_SEED.keys()))
    rows = [(c, COLORS_RU_SEED.get(c, "")) for c in buckets]
    with open(OUT_COLORS, "w", newline="") as f:
        w = csv.writer(f, delimiter="\t")
        w.writerow(["id", "EN", "RU"])
        for cid, ru in rows:
            w.writerow([cid, cid, ru])
    print(f"Wrote {OUT_COLORS}  ({len(rows)} colors)")

def export_outfits():
    """All 265 outfit titles + clothes-bodies. Two RU columns: titleRu, bodyRu.
    titleRu pre-filled if already present in JSON (currently none).
    bodyRu blank — user fills in. EN stays as-is and is the canonical copy."""
    with open(OUTFITS) as f:
        d = json.load(f)
    rows = []
    for sec in d["sections"]:
        for p in sec["prompts"]:
            rows.append({
                "id":         p["id"],
                "number":     p["number"],
                "section":    sec["id"],
                "title_en":   p["title"],
                "title_ru":   p.get("titleRu", "") or "",
                "body_en":    p["body"],
                "body_ru":    p.get("bodyRu", "") or "",
                "has_image":  "1" if p.get("hasImage") else "",
            })
    with open(OUT_OUTFITS, "w", newline="") as f:
        w = csv.writer(f, delimiter="\t")
        w.writerow(["id", "number", "section", "title_en", "title_ru", "body_en", "body_ru", "has_image"])
        for r in rows:
            w.writerow([r["id"], r["number"], r["section"], r["title_en"],
                        r["title_ru"], r["body_en"], r["body_ru"], r["has_image"]])
    print(f"Wrote {OUT_OUTFITS}  ({len(rows)} outfits)")

def export_sections():
    """Outfit-page sections (15) — used in outfits.html accordion headers.
    Each section has name + description, both bilingual. Lives in outfits-data.json."""
    with open(OUTFITS) as f:
        d = json.load(f)
    rows = []
    for s in d["sections"]:
        rows.append({
            "id":      s["id"],
            "name_en": s.get("name", ""),
            "name_ru": s.get("nameRu", ""),
            "desc_en": s.get("description", ""),
            "desc_ru": s.get("descriptionRu", ""),
        })
    with open(OUT_SECTIONS, "w", newline="") as f:
        w = csv.writer(f, delimiter="\t")
        w.writerow(["id", "name_en", "name_ru", "desc_en", "desc_ru"])
        for r in rows:
            w.writerow([r["id"], r["name_en"], r["name_ru"], r["desc_en"], r["desc_ru"]])
    print(f"Wrote {OUT_SECTIONS}  ({len(rows)} outfit sections)")

def main():
    export_styles()
    export_colors()
    export_outfits()
    export_sections()
    print()
    print("Edit each *.tsv, then later we'll write merge scripts that read these")
    print("and update wardrobe-data.json / outfits-data.json in place.")

if __name__ == "__main__":
    main()
