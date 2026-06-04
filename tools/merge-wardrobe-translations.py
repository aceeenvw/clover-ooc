#!/usr/bin/env python3
"""
CLOVER OOC — merge user-edited TSV translations into wardrobe-data.json
aceenvw

Reads:
  wardrobe-translations-final.tsv  (authoritative RU per item, edited by hand)
Writes:
  wardrobe-data.json  (adds 'textRu' to every item; adds top-level 'tagsRu')

Re-runnable: any items present in the TSV get their textRu refreshed;
items without a TSV entry get textRu=null and are reported.
"""
import json, csv, sys

DATA_PATH = "wardrobe-data.json"
TSV_PATH  = "wardrobe-translations-final.tsv"

# Tag translation map — matches the locked-in vocabulary from Phase 0.
TAGS_RU = {
    "everyday":    "будни",
    "coastal":     "побережье",
    "color-pop":   "цветовой акцент",
    "coquette":    "кокетт",
    "cozy":        "уют",
    "daily-mod":   "повседневный микс",
    "goth-punk":   "готика и панк",
    "lingerie":    "бельё",
    "night":       "вечер",
    "pink-y2k":    "розовый y2k",
    "rich-tones":  "насыщенные тона",
    "streetwear":  "уличный стиль",
    "swim":        "купальник",
    "y2k-mix":     "y2k микс",
    "bridal":      "свадебное",
    "cocktail":    "коктейль",
}

def main():
    # Load translations from TSV
    translations = {}
    with open(TSV_PATH, newline="") as f:
        for row in csv.DictReader(f, delimiter="\t"):
            iid = row["id"].strip()
            ru = row["RU"].strip()
            if iid and ru:
                translations[iid] = ru

    # Load data
    with open(DATA_PATH) as f:
        data = json.load(f)

    missing = []
    updated = 0
    for it in data["items"]:
        ru = translations.get(it["id"])
        if ru:
            it["textRu"] = ru
            updated += 1
        else:
            it["textRu"] = None
            missing.append(it["id"])

    data["tagsRu"] = TAGS_RU

    # Write back with stable formatting
    with open(DATA_PATH, "w") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"Merged: {updated} items with textRu, {len(missing)} without (textRu=null)")
    if missing:
        print("\nMissing translations for:")
        for m in missing[:30]:
            print(f"  {m}")
        if len(missing) > 30:
            print(f"  ... and {len(missing)-30} more")
    print(f"\nAdded top-level tagsRu: {len(TAGS_RU)} entries")
    print(f"Wrote {DATA_PATH}")

if __name__ == "__main__":
    main()
