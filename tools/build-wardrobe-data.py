#!/usr/bin/env python3
"""
CLOVER OOC — build wardrobe-data.json from outfits-data.json
aceenvw

Pipeline:
  1. Read every outfit's 'clothes:' body
  2. Split into fragments on commas OUTSIDE parentheses
  3. Categorize each fragment by keyword (top/bottom/dress/outer/shoes/accessory)
  4. Extract a color bucket (13 buckets + neutral + multi)
  5. Inherit style tags from source outfit's section
  6. Dedupe by normalized text; aggregate sourceOutfits & tags
  7. Append a hand-curated list of ~20 shoes (source outfits omit footwear)
  8. Every item gets gender: "female"
"""
import json, os, re, sys
from collections import defaultdict, Counter

IN_PATH  = "outfits-data.json"
OUT_PATH = "wardrobe-data.json"

with open(IN_PATH) as f:
    outfits_doc = json.load(f)

# Flat list of (outfit_number, outfit_title, section_id, body)
flat = []
for sec in outfits_doc["sections"]:
    for p in sec["prompts"]:
        flat.append((p["number"], p["title"], sec["id"], p["body"]))

# ─── Paren-aware comma splitter ──────────────────────────────────────────────
def split_outside_parens(s):
    out, buf, depth = [], [], 0
    for ch in s:
        if ch == '(':
            depth += 1
            buf.append(ch)
        elif ch == ')':
            depth = max(0, depth - 1)
            buf.append(ch)
        elif ch == ',' and depth == 0:
            piece = ''.join(buf).strip()
            if piece:
                out.append(piece)
            buf = []
        else:
            buf.append(ch)
    tail = ''.join(buf).strip()
    if tail:
        out.append(tail)
    return out

# ─── Category regexes (mostly the prototype from planning, lightly tightened)──
CATS = [
    ('dress', re.compile(
        r'\b(dress|gown|sundress|bodycon|catsuit|monokini|swimsuit|bikini|babydoll|jumpsuit|romper|playsuit|onesie)\b')),
    ('outer', re.compile(
        r'\b(jacket|coat|blazer|trench|parka|puffer|shrug|cardigan|cape|cloak|kimono|robe|gilet|moto|bomber|anorak|windbreaker|overshirt|shirt-jacket|sarong|cover-up|kaftan)\b')),
    ('top',   re.compile(
        r'\b(top|tee|tshirt|t-shirt|tank|cami|camisole|blouse|shirt|button-up|button-down|hoodie|sweatshirt|sweater|knit|turtleneck|halter|bralette|bra|bandeau|crop|cropped|polo|bodysuit|jersey|long-sleeve|pullover|jumper|tunic|vest|waistcoat|corset|bustier|bodice|slip|tracksuit)\b')),
    ('bottom',re.compile(
        r'\b(jeans|trousers|pants|skirt|shorts|cargos|cargo|capris|capri|leggings|joggers|chinos|culottes|jorts|bermuda|flares|jeggings|denim|miniskirt)\b')),
    # accessory sub-categories — all merged into "accessory" in final output
    ('_acc_shoes',   re.compile(r'\b(shoes|boots|heels|sneakers|sandals|loafers|mules|pumps|flats|stilettos|trainers|kitten-heels|kittens|pointe|footwear)\b')),
    ('_acc_bag',     re.compile(r'\b(bag|clutch|tote|backpack|crossbody|baguette|hobo|satchel|purse|handbag|wallet|shoulder|saddle|bucket)\b')),
    ('_acc_jewel',   re.compile(r'\b(earrings|necklace|necklaces|chain|chains|ring|rings|bangles|bracelet|bracelets|cuff|cuffs|choker|chokers|pendant|anklet|hoops|studs|drops|jewelry|piercings|brooch|locket|lockets|collar)\b')),
    ('_acc_head',    re.compile(r'\b(beanie|hat|cap|beret|headband|bandana|tiara|crown|veil|hood|kerchief|snapback|scarf|headscarf|chignon|bun|clip)\b')),
    ('_acc_eyewear', re.compile(r'\b(sunglasses|shades|glasses|goggles)\b')),
    ('_acc_belt',    re.compile(r'\b(belt|sash|harness|garter)\b')),
    ('_acc_other',   re.compile(r'\b(gloves|mittens|earmuffs|tights|socks|stockings|fishnets|clips|barrette|hair-tie|hair-ties|scrunchie|pin|bow|charm|ribbon|ribbons|nails|stickers|cufflinks|wristbands|keychain|keychains|warmers|anklet|anklets|watch|visor|briefs|thigh-highs|bun|sleeves|wrap)\b')),
]

def categorize(text):
    t = re.sub(r'\([^)]*\)', '', text).lower()
    for cat, rx in CATS:
        if rx.search(t):
            # Collapse all _acc_* into single "accessory"; bare "shoes" stays shoes.
            if cat == '_acc_shoes':
                return 'shoes'
            if cat.startswith('_acc_'):
                return 'accessory'
            return cat
    return None  # uncategorized → handled separately

# ─── Color extraction (13 buckets + neutral + multi) ─────────────────────────
COLOR_MAP = {
    # white
    'white': 'white', 'ivory': 'white', 'snow': 'white', 'pearl': 'white',
    # cream
    'cream': 'cream', 'oatmeal': 'cream', 'champagne': 'cream', 'butter': 'cream', 'vanilla': 'cream',
    # beige
    'beige': 'beige', 'tan': 'beige', 'sand': 'beige', 'khaki': 'beige', 'camel': 'beige', 'nude': 'beige', 'taupe': 'beige',
    # brown
    'brown': 'brown', 'chocolate': 'brown', 'caramel': 'brown', 'mocha': 'brown', 'espresso': 'brown', 'mahogany': 'brown', 'maroon': 'brown', 'rust': 'brown', 'bronze': 'brown', 'suede': 'brown',
    # black
    'black': 'black', 'onyx': 'black', 'jet': 'black',
    # grey
    'grey': 'grey', 'gray': 'grey', 'charcoal': 'grey', 'silver': 'grey', 'gunmetal': 'grey', 'slate': 'grey',
    # red
    'red': 'red', 'crimson': 'red', 'scarlet': 'red', 'cherry': 'red', 'cherry-red': 'red', 'burgundy': 'red', 'wine': 'red', 'oxblood': 'red', 'tomato': 'red',
    # pink
    'pink': 'pink', 'rose': 'pink', 'blush': 'pink', 'fuchsia': 'pink', 'magenta': 'pink', 'bubblegum': 'pink', 'baby-pink': 'pink', 'hot-pink': 'pink', 'dusty-rose': 'pink', 'coral': 'pink', 'strawberry': 'pink',
    # orange
    'orange': 'orange', 'tangerine': 'orange', 'peach': 'orange', 'apricot': 'orange',
    # yellow
    'yellow': 'yellow', 'gold': 'yellow', 'mustard': 'yellow', 'lemon': 'yellow', 'chartreuse': 'yellow',
    # green
    'green': 'green', 'olive': 'green', 'sage': 'green', 'mint': 'green', 'emerald': 'green', 'lime': 'green', 'teal': 'green', 'forest': 'green', 'jade': 'green',
    # blue
    'blue': 'blue', 'navy': 'blue', 'cobalt': 'blue', 'azure': 'blue', 'turquoise': 'blue', 'sky-blue': 'blue', 'powder-blue': 'blue', 'klein': 'blue', 'aegean': 'blue', 'sky': 'blue', 'aqua': 'blue',
    # purple
    'purple': 'purple', 'violet': 'purple', 'lavender': 'purple', 'plum': 'purple', 'lilac': 'purple', 'orchid': 'purple', 'amethyst': 'purple',
}

# Some color words appear hyphenated in source text; pre-build a regex of all variants.
COLOR_TOKENS = sorted(COLOR_MAP.keys(), key=len, reverse=True)
COLOR_RX = re.compile(r'\b(' + '|'.join(re.escape(w) for w in COLOR_TOKENS) + r')\b', re.I)

def extract_color(text):
    t = text.lower()
    # Strip parens to avoid descriptors interfering
    t = re.sub(r'\([^)]*\)', '', t)
    hits = COLOR_RX.findall(t)
    if not hits:
        return 'neutral'
    buckets = set(COLOR_MAP[h.lower()] for h in hits)
    if len(buckets) == 1:
        return next(iter(buckets))
    return 'multi'

# ─── Normalization for dedupe ────────────────────────────────────────────────
def normalize(text):
    t = re.sub(r'\([^)]*\)', '', text)          # drop parenthetical descriptors
    t = re.sub(r'\s+', ' ', t).strip().lower()
    t = t.rstrip('.,;:')
    return t

# ─── Walk fragments ──────────────────────────────────────────────────────────
# Dedup key = (category, normalized_text)
dedup = {}  # key → item dict
uncategorized = []

for num, title, sec_id, body in flat:
    body_clean = re.sub(r'^\s*clothes:\s*', '', body, flags=re.I)
    for frag in split_outside_parens(body_clean):
        cat = categorize(frag)
        if cat is None:
            uncategorized.append((num, frag))
            continue
        norm = normalize(frag)
        if not norm:
            continue
        key = (cat, norm)
        if key not in dedup:
            dedup[key] = {
                "text": norm,
                "category": cat,
                "color": extract_color(frag),
                "tags": set(),
                "sourceOutfits": [],
                "gender": "female",
            }
        dedup[key]["tags"].add(sec_id)
        if num not in dedup[key]["sourceOutfits"]:
            dedup[key]["sourceOutfits"].append(num)

# ─── Hand-curated shoes (source outfits intentionally omit footwear) ─────────
HAND_SHOES = [
    ("white canvas sneakers",              "white",  ["everyday","coastal","streetwear"]),
    ("black low-top sneakers",             "black",  ["everyday","streetwear"]),
    ("chunky platform sneakers",           "white",  ["streetwear","y2k-mix"]),
    ("nude pointed-toe pumps",             "beige",  ["night","everyday"]),
    ("black stiletto heels",               "black",  ["night","cocktail"]),
    ("cherry-red kitten heels",            "red",    ["night","everyday"]),
    ("strappy gold sandals",               "yellow", ["night","coastal"]),
    ("tan leather slides",                 "beige",  ["coastal","everyday"]),
    ("black knee-high leather boots",      "black",  ["night","cozy"]),
    ("brown suede ankle boots",            "brown",  ["everyday","cozy"]),
    ("white cowboy boots",                 "white",  ["coastal","y2k-mix"]),
    ("black combat boots",                 "black",  ["streetwear","goth-punk"]),
    ("ballet flats in cream",              "cream",  ["everyday","coquette"]),
    ("black mary janes",                   "black",  ["coquette","everyday"]),
    ("woven raffia espadrilles",           "beige",  ["coastal"]),
    ("loafers in oxblood leather",         "red",    ["everyday"]),
    ("black mesh kitten mules",            "black",  ["night"]),
    ("pink satin pointe shoes",            "pink",   ["coquette"]),
    ("metallic silver platform sandals",   "grey",   ["night","y2k-mix"]),
    ("furry pink slippers",                "pink",   ["cozy","pink-y2k"]),
]
for txt, color, tags in HAND_SHOES:
    key = ('shoes', normalize(txt))
    if key in dedup:
        # don't clobber, just merge tags
        dedup[key]["tags"].update(tags)
        continue
    dedup[key] = {
        "text": txt,
        "category": "shoes",
        "color": color,
        "tags": set(tags),
        "sourceOutfits": [],
        "gender": "female",
    }

# ─── Preserve existing translations across re-runs ───────────────────────────
# If wardrobe-data.json already exists, capture (text, category) -> textRu and
# top-level tagsRu, so a re-run of this parser doesn't wipe the manual RU edits.
existing_textRu = {}
existing_tagsRu = None
if os.path.exists(OUT_PATH):
    try:
        with open(OUT_PATH) as f:
            prev = json.load(f)
        for prev_it in prev.get("items", []):
            if prev_it.get("textRu"):
                k = (prev_it.get("category"), prev_it.get("text"))
                existing_textRu[k] = prev_it["textRu"]
        if isinstance(prev.get("tagsRu"), dict):
            existing_tagsRu = prev["tagsRu"]
    except Exception as e:
        print(f"WARN: could not load previous {OUT_PATH} for textRu preservation: {e}")

# ─── Finalize: assign IDs, freeze sets, build output ─────────────────────────
items = []
cat_counter = Counter()
new_without_translation = []
# Sort for stable IDs: category, then alpha by text
sorted_keys = sorted(dedup.keys(), key=lambda k: (k[0], k[1]))
for i, key in enumerate(sorted_keys, 1):
    rec = dedup[key]
    cat = rec["category"]
    cat_counter[cat] += 1
    # Match against previous run by (category, text) so a deduped item that
    # survives still inherits its translation even if its id index shifted.
    ru = existing_textRu.get((cat, rec["text"]))
    item = {
        "id": f"{cat}-{cat_counter[cat]:04}",
        "text": rec["text"],
        "category": cat,
        "color": rec["color"],
        "tags": sorted(rec["tags"]),
        "gender": rec["gender"],
        "sourceOutfits": rec["sourceOutfits"],
        "textRu": ru,  # may be None for brand-new items
    }
    if ru is None:
        new_without_translation.append((item["id"], rec["text"]))
    items.append(item)

# Build vocabularies from observed data
all_tags = sorted(set(t for it in items for t in it["tags"]))
all_colors = ["white","cream","beige","brown","black","grey","red","pink",
              "orange","yellow","green","blue","purple","neutral","multi"]

out_doc = {
    "items": items,
    "categoryCounts": dict(cat_counter),
    "colorBuckets": all_colors,
    "tagVocabulary": all_tags,
    # Preserve tagsRu if present; otherwise leave empty for the merge step to fill.
    "tagsRu": existing_tagsRu or {},
}

with open(OUT_PATH, "w") as f:
    json.dump(out_doc, f, indent=2, ensure_ascii=False)

# Report any new items that need translation
if new_without_translation:
    print(f"\n⚠  {len(new_without_translation)} new item(s) without textRu (need translation):")
    for iid, txt in new_without_translation[:20]:
        print(f"     {iid}  '{txt}'")
    if len(new_without_translation) > 20:
        print(f"     ... and {len(new_without_translation)-20} more")

# ─── Report ──────────────────────────────────────────────────────────────────
print(f"Wrote {OUT_PATH}: {len(items)} unique items")
print(f"Categories:")
for cat, n in sorted(cat_counter.items(), key=lambda x:-x[1]):
    print(f"  {cat:10} {n:4}")
print(f"\nUncategorized fragments ({len(uncategorized)}):")
seen = set()
for num, f_ in uncategorized:
    k = f_.lower().strip()
    if k in seen: continue
    seen.add(k)
    print(f"  #{num:3}  {f_}")
    if len(seen) >= 30: break

print(f"\nColor distribution:")
col_count = Counter(it["color"] for it in items)
for c, n in sorted(col_count.items(), key=lambda x:-x[1]):
    print(f"  {c:10} {n:4}")

print(f"\nTags found: {len(all_tags)} ({', '.join(all_tags)})")
