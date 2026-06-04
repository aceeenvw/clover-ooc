#!/usr/bin/env python3
"""
CLOVER OOC — merge edited TSVs (styles, colors, outfits) into JSON
aceenvw

Reads four -edited.tsv files in repo root:
  styles-translations-preview-edited.tsv    (16 style tag labels)
  colors-translations-preview-edited.tsv    (15 color bucket labels)
  outfits-translations-preview-edited.tsv   (265 outfit titles + bodies)
  sections-translations-preview-edited.tsv  (15 outfit sections — name + description)

Writes:
  wardrobe-data.json      — refresh top-level tagsRu + add top-level colorsRu
  outfits-data.json       — add titleRu + bodyRu per outfit
                          — refresh nameRu + descriptionRu per section

Re-runnable. If a TSV is missing, that step is skipped silently.
"""
import csv, json, os, sys

WARDROBE = "wardrobe-data.json"
OUTFITS  = "outfits-data.json"

TSV_STYLES   = "styles-translations-preview-edited.tsv"
TSV_COLORS   = "colors-translations-preview-edited.tsv"
TSV_OUTFITS  = "outfits-translations-preview-edited.tsv"
TSV_SECTIONS = "sections-translations-preview-edited.tsv"

def load_tsv(path):
    if not os.path.exists(path):
        return None
    with open(path, newline="") as f:
        return list(csv.DictReader(f, delimiter="\t"))

def merge_styles_and_colors():
    """Both live in wardrobe-data.json. Single read+write."""
    style_rows  = load_tsv(TSV_STYLES)
    color_rows  = load_tsv(TSV_COLORS)
    if style_rows is None and color_rows is None:
        return

    with open(WARDROBE) as f:
        data = json.load(f)

    changed = False

    if style_rows is not None:
        new_map = {r["id"].strip(): r["RU"].strip()
                   for r in style_rows
                   if r["id"].strip() and r["RU"].strip()}
        old_map = data.get("tagsRu", {})
        if new_map != old_map:
            data["tagsRu"] = new_map
            print(f"  styles:  {len(new_map)} entries (changed)")
            # Show first-3 diff for sanity
            changes = [(k, old_map.get(k, ""), new_map[k])
                       for k in new_map if old_map.get(k) != new_map[k]]
            for k, oldv, newv in changes[:6]:
                print(f"    {k:14}  '{oldv}' → '{newv}'")
            if len(changes) > 6:
                print(f"    ... and {len(changes)-6} more changes")
            changed = True
        else:
            print(f"  styles:  {len(new_map)} entries (no changes)")

    if color_rows is not None:
        new_map = {r["id"].strip(): r["RU"].strip()
                   for r in color_rows
                   if r["id"].strip() and r["RU"].strip()}
        old_map = data.get("colorsRu", {})
        if new_map != old_map:
            data["colorsRu"] = new_map
            print(f"  colors:  {len(new_map)} entries (changed)")
            changes = [(k, old_map.get(k, ""), new_map[k])
                       for k in new_map if old_map.get(k) != new_map[k]]
            for k, oldv, newv in changes[:6]:
                print(f"    {k:14}  '{oldv}' → '{newv}'")
            if len(changes) > 6:
                print(f"    ... and {len(changes)-6} more changes")
            changed = True
        else:
            print(f"  colors:  {len(new_map)} entries (no changes)")

    if changed:
        with open(WARDROBE, "w") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"  wrote {WARDROBE}")

def merge_outfits_and_sections():
    """Both live in outfits-data.json. Single read+write."""
    outfit_rows  = load_tsv(TSV_OUTFITS)
    section_rows = load_tsv(TSV_SECTIONS)
    if outfit_rows is None and section_rows is None:
        return

    with open(OUTFITS) as f:
        data = json.load(f)

    # ─── outfits: id → (title_ru, body_ru) ──────────────────────────────────
    if outfit_rows is not None:
        tmap = {}
        for r in outfit_rows:
            iid = r["id"].strip()
            if not iid:
                continue
            tmap[iid] = (r.get("title_ru", "").strip(),
                         r.get("body_ru", "").strip())

        updated_t = 0
        updated_b = 0
        missing = []
        for sec in data["sections"]:
            for p in sec["prompts"]:
                if p["id"] in tmap:
                    tru, bru = tmap[p["id"]]
                    if tru:
                        p["titleRu"] = tru
                        updated_t += 1
                    else:
                        p["titleRu"] = None
                    if bru:
                        p["bodyRu"] = bru
                        updated_b += 1
                    else:
                        p["bodyRu"] = None
                else:
                    missing.append(p["id"])
                    p.setdefault("titleRu", None)
                    p.setdefault("bodyRu", None)

        total = sum(len(s["prompts"]) for s in data["sections"])
        print(f"  outfits: {total} total")
        print(f"    titleRu set: {updated_t}")
        print(f"    bodyRu  set: {updated_b}")
        if missing:
            print(f"    missing from TSV: {len(missing)}")
            for m in missing[:10]:
                print(f"      {m}")

    # ─── sections: id → (name_en, name_ru, desc_en, desc_ru) ────────────────
    if section_rows is not None:
        smap = {}
        for r in section_rows:
            sid = r["id"].strip()
            if not sid:
                continue
            smap[sid] = {
                "name_en": r.get("name_en", "").strip(),
                "name_ru": r.get("name_ru", "").strip(),
                "desc_en": r.get("desc_en", "").strip(),
                "desc_ru": r.get("desc_ru", "").strip(),
            }

        updated_sec = 0
        changes_sample = []
        sec_missing = []
        for sec in data["sections"]:
            if sec["id"] not in smap:
                sec_missing.append(sec["id"])
                continue
            row = smap[sec["id"]]
            old = (sec.get("name"), sec.get("nameRu"),
                   sec.get("description"), sec.get("descriptionRu"))
            new = (row["name_en"] or sec.get("name"),
                   row["name_ru"] or sec.get("nameRu"),
                   row["desc_en"] or sec.get("description"),
                   row["desc_ru"] or sec.get("descriptionRu"))
            if old != new:
                if len(changes_sample) < 4:
                    changes_sample.append((sec["id"], old, new))
                sec["name"]          = new[0]
                sec["nameRu"]        = new[1]
                sec["description"]   = new[2]
                sec["descriptionRu"] = new[3]
                updated_sec += 1
        total_sec = len(data["sections"])
        print(f"  sections: {total_sec} total, {updated_sec} changed")
        for sid, old, new in changes_sample:
            if old[1] != new[1]:
                print(f"    {sid:12} nameRu  '{old[1]}' → '{new[1]}'")
            if old[3] != new[3]:
                print(f"    {sid:12} descRu  '{old[3]}' → '{new[3]}'")
        if sec_missing:
            print(f"    missing from TSV: {sec_missing}")

    with open(OUTFITS, "w") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"  wrote {OUTFITS}")

def main():
    print("Merging translations...")
    print()
    merge_styles_and_colors()
    print()
    merge_outfits_and_sections()
    print()
    print("Done.")

if __name__ == "__main__":
    main()
