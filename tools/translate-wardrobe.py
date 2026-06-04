#!/usr/bin/env python3
"""
CLOVER OOC — wardrobe-items EN → RU translator
aceenvw

Strategy: dictionary-based, deterministic, re-runnable.
- 4 vocab dicts: COLORS, FABRICS, CUTS_SILHOUETTE, NOUNS
- Hyphenated compounds preserved as single tokens
- Adjective-first order kept (matches RU fashion-speak)
- Unknown tokens kept as raw English in JSON output; wrapped in [brackets] in TSV preview

Outputs:
  /tmp/wardrobe-translations-preview.tsv   (id, category, EN, RU, flagged)
  /tmp/wardrobe-translations-final.json    (id -> RU text), for the merge step

Usage:
  python3 tools/translate-wardrobe.py            # build both outputs
  python3 tools/translate-wardrobe.py --report   # show coverage stats
"""
import json, re, sys, os
from collections import Counter

IN_PATH    = "wardrobe-data.json"
TSV_OUT    = "/tmp/wardrobe-translations-preview.tsv"
JSON_OUT   = "/tmp/wardrobe-translations-final.json"

# ═════════════════════════════════════════════════════════════════════════════
# DICTIONARIES
# Each dict maps EN token (lowercased, hyphens preserved) → RU translation.
# Order does not matter; first-pass lookup is whole-token match.
# ═════════════════════════════════════════════════════════════════════════════

# ─── COLORS ──────────────────────────────────────────────────────────────────
COLORS = {
    # basic
    "white": "белый", "black": "чёрный", "grey": "серый", "gray": "серый",
    "red": "красный", "pink": "розовый", "blue": "синий", "green": "зелёный",
    "yellow": "жёлтый", "orange": "оранжевый", "purple": "фиолетовый",
    "brown": "коричневый",
    # cream / off-white
    "cream": "кремовый", "ivory": "молочный", "snow": "белоснежный",
    "pearl": "жемчужный", "oatmeal": "овсяный", "vanilla": "ванильный",
    "champagne": "шампань", "butter": "сливочный", "cloud-white": "облачно-белый",
    # beige / tan
    "beige": "бежевый", "tan": "загорелый", "sand": "песочный",
    "khaki": "хаки", "camel": "верблюжий", "nude": "телесный",
    "taupe": "тауп",
    # brown family
    "chocolate": "шоколадный", "chocolate-brown": "шоколадный",
    "caramel": "карамельный", "mocha": "мокко", "espresso": "эспрессо",
    "espresso-brown": "эспрессо",
    "mahogany": "махагон", "rust": "ржавый", "rust-orange": "ржаво-оранжевый",
    "bronze": "бронзовый", "copper": "медный", "ochre": "охра",
    # red family
    "burgundy": "бордовый", "wine": "винный", "wine-red": "винно-красный",
    "oxblood": "оксблад", "scarlet": "алый", "cherry": "вишнёвый",
    "cherry-red": "вишнёво-красный", "tomato-red": "томатно-красный",
    "maroon": "тёмно-красный", "ruby": "рубиновый", "deep-red": "тёмно-красный",
    "crimson": "малиновый",
    # pink family
    "rose": "розовый", "blush": "пудрово-розовый", "fuchsia": "фуксия",
    "magenta": "маджента", "bubblegum": "ярко-розовый",
    "bubblegum-pink": "ярко-розовый",
    "baby-pink": "нежно-розовый", "hot-pink": "ярко-розовый",
    "dusty-rose": "пыльно-розовый", "coral": "коралловый",
    "strawberry": "клубничный", "pastel-pink": "пастельно-розовый",
    "cyber-pink": "кибер-розовый", "silver-pink": "серебристо-розовый",
    # orange / yellow
    "tangerine": "мандариновый", "peach": "персиковый", "apricot": "абрикосовый",
    "gold": "золотой", "mustard": "горчичный", "lemon": "лимонный",
    "chartreuse": "шартрёз", "butter-yellow": "сливочно-жёлтый",
    "neon-yellow": "неоново-жёлтый",
    # green family
    "olive": "оливковый", "olive-green": "оливковый", "sage": "шалфейный",
    "mint": "мятный", "emerald": "изумрудный", "lime": "лаймовый",
    "lime-green": "лаймовый", "teal": "сине-зелёный", "forest": "лесной",
    "jade": "нефритовый", "pale-green": "бледно-зелёный",
    "neon-green": "неоново-зелёный",
    # blue family
    "navy": "тёмно-синий", "cobalt": "кобальтовый",
    "cobalt-blue": "кобальтово-синий",
    "azure": "лазурный", "turquoise": "бирюзовый",
    "sky-blue": "небесно-голубой", "powder-blue": "пудрово-голубой",
    "klein": "кляйн", "aegean": "эгейский", "sky": "небесный",
    "aqua": "аква", "electric-blue": "электрик",
    "baby-blue": "нежно-голубой",
    # purple family
    "violet": "фиалковый", "lavender": "лавандовый",
    "plum": "сливовый", "lilac": "сиреневый",
    "orchid": "орхидеи", "amethyst": "аметистовый",
    # neutral metals
    "silver": "серебряный", "gunmetal": "графитовый",
    "charcoal": "угольный", "slate": "грифельный",
    "chrome": "хром",
    # special
    "amber": "янтарный",
    "holographic": "голографический", "iridescent": "переливающийся",
    "metallic": "металлик",
    "multi-tone": "разноцветный", "rainbow": "радужный",
    "neon": "неоновый", "pastel": "пастельный",
    "jewel-tone": "драгоценный",
    "color-pop": "цветовой акцент", "colour-block": "колор-блок",
    "black-and-white": "чёрно-белый", "black-white": "чёрно-белый",
    "navy-white": "сине-белый", "orange-and-blue": "оранжево-синий",
    "red-and-white": "красно-белый", "pearl-and-gold": "жемчужно-золотой",
    "pearl-and-bow": "жемчужный с бантом",
    "pearl-gold": "жемчужно-золотой", "pink-stone": "розовый камень",
    "wooden-gold": "дерево-золото", "antique-silver": "состаренное серебро",
    "gold-on-black": "золото на чёрном",
    "tortoiseshell": "черепаховый",
    "tinted": "тонированный",
    "faded": "выцветший", "muted": "приглушённый",
    "shimmer": "мерцающий", "gradient": "градиентный",
    "dark": "тёмный", "light": "светлый", "deep": "глубокий",
    "soft": "мягкий", "bold": "яркий",
    "crisp": "хрустящий",
    "clashing": "контрастный", "clear-frame": "прозрачная оправа",
    "glossy": "глянцевый",
    "dark-wash": "тёмный деним", "mid-wash": "средний деним",
    "light-wash": "светлый деним", "medium-wash": "средний деним",
    "acid-wash": "варёный деним", "vintage-wash": "винтажный деним",
}

# ─── FABRICS ─────────────────────────────────────────────────────────────────
FABRICS = {
    # base fabrics
    "satin": "сатин", "silk": "шёлк", "velvet": "бархат",
    "velour": "велюр", "suede": "замша", "leather": "кожа",
    "faux-leather": "экокожа", "denim": "джинса",
    "linen": "лён", "cotton": "хлопок", "wool": "шерсть",
    "cashmere": "кашемир", "tweed": "твид", "boucle": "букле",
    "brocade": "парча", "damask": "дамаск", "chiffon": "шифон",
    "tulle": "фатин", "organza": "органза", "mesh": "сетка",
    "lace": "кружево", "lace-trim": "с кружевной отделкой",
    "crochet": "крючок", "knit": "трикотаж", "ribbed": "рифлёный",
    "rib": "рифлёный",
    "jersey": "джерси", "poplin": "поплин", "cotton-poplin": "хлопковый поплин",
    "seersucker": "сирсакер", "gingham": "виши",
    "tartan": "тартан", "plaid": "шотландка",
    "houndstooth": "гусиная лапка", "paisley": "пейсли",
    "floral": "цветочный", "ditsy": "мелкий цветочный",
    "ditsy-floral": "мелкий цветочный",
    "polka-dot": "горошек", "patchwork": "пэчворк",
    "patchwork-print": "пэчворк-принт",
    "stripe": "полоска", "striped": "в полоску",
    "snake-print": "змеиный принт", "snakeskin-print": "змеиный принт",
    "leopard-print": "леопардовый", "leopard": "леопардовый",
    "zebra-print": "зебра", "cow-print": "коровий принт",
    "python-print": "питон",
    "animal-print": "анималистичный",
    "anime-print": "аниме-принт", "manga-panel": "панель-манга",
    "manga-spread": "разворот-манга", "band-print": "рок-принт",
    "graphic": "графический", "lip-print": "губы-принт",
    "strawberry-print": "клубничный принт",
    "floral-print": "цветочный принт",
    "vaporwave-print": "вейпорвейв-принт",
    "mosaic-print": "мозаичный принт",
    "scarf-print": "платочный принт",
    "chibi-print": "чиби-принт",
    "mecha-print": "меха-принт",
    "flame-print": "пламя-принт",
    "pin-covered": "усыпанный значками",
    "fair-isle": "фер-айл",
    "broderie": "бродери",
    "embroidered": "вышитый",
    "smocked": "смокированный",
    "smiley": "смайлы",
    "macram": "макраме", "tassel": "с кисточками",
    "raffia": "рафия", "straw": "соломенный",
    "shell": "ракушка", "shell-bead": "из ракушечного бисера",
    "shell-and-bead": "с ракушками и бисером",
    "shell-beaded": "с ракушками",
    "fishnet": "сетка-рыбка", "fishnets": "сетка-рыбка",
    "patent": "лакированный", "lacquer": "лакированный",
    "croc": "под крокодила", "croc-effect": "под крокодила",
    "croc-embossed": "тиснение под крокодила",
    "pony-hair": "пони-скин",
    "snake": "змеиный",
    "metallic-mesh": "металлик-сетка", "chainmail-mesh": "кольчуга-сетка",
    "techwear": "техвир",
    "rhinestone": "стразы", "rhinestone-studded": "со стразами",
    "jewelled": "украшенный камнями", "bedazzled": "украшенный стразами",
    "sequin": "пайетки",
    "studded": "с шипами", "spiked": "с шипами",
    "fringed": "с бахромой", "fringe": "бахрома",
    "beaded": "с бисером", "candy-bead": "конфета-бисер",
    "shimmer": "блестящий",
    "crushed-velvet": "мятый бархат", "crushed-black-velvet": "мятый чёрный бархат",
    "fuzzy": "пушистый",
    "fluffy": "пушистый",
    "plush": "плюшевый",
    "furry": "меховой",
    "faux-fur": "искусственный мех",
    "fur": "мех", "fur-trim": "с меховой отделкой",
    "shearling": "овчина", "shearling-collar": "с воротником из овчины",
    "shearling-lined": "на овчинной подкладке",
    "quilted": "стёганый", "padded": "утеплённый",
    "puff-sleeve": "с пышными рукавами",
    "ruched": "с драпировкой", "draped": "драпированный",
    "ruffle": "оборка", "ruffled": "с оборками",
    "frilled": "с воланами",
    "pleated": "плиссированный", "tiered": "многоярусный",
    "panelled": "комбинированный",
    "cable-knit": "косы", "cable": "косы",
    "ribbed": "рифлёный",
    "terry": "махровый",
    "chainmail": "кольчуга",
    "corduroy": "вельвет",
    "flannel": "фланель",
    "windbreaker": "ветровка",
    "balconette": "балконет",
    "rib": "рифлёный",
    "athletic": "спортивный",
    "tech": "техно", "techwear": "техвир",
    "devor": "деворе", "devore": "деворе", "devour": "деворе",
    "burnout": "выжженный",
    "iridescent": "переливающийся",
    "liquid-satin": "жидкий сатин",
    "raw-edge": "необработанный край",
    "embossed": "тиснёный",
    "hammered": "кованый",
    "patterned": "с рисунком",
    "glitch-print": "глитч-принт",
}

# ─── CUTS / SILHOUETTES / FITS ───────────────────────────────────────────────
CUTS = {
    # length
    "mini": "мини", "midi": "миди", "maxi": "макси",
    "micro": "микро", "long": "длинный", "short": "короткий",
    "longline": "удлинённый",
    "knee-high": "до колена",
    "high-leg": "с высоким вырезом",
    # rise
    "low-rise": "с низкой посадкой", "high-waist": "с высокой посадкой",
    "ultra-low-rise": "ультранизкая посадка", "mid-rise": "средняя посадка",
    "waist": "талия", "belly": "живот",
    # fit
    "baggy": "свободный", "oversized": "оверсайз",
    "slouchy": "слаучи", "loose": "свободный",
    "fitted": "приталенный", "tailored": "тейлоринг",
    "fluid": "струящийся", "flowy": "струящийся", "floaty": "невесомый",
    "structured": "структурированный",
    "slim": "узкий", "narrow": "узкий",
    "wide": "широкий", "wide-leg": "широкие штанины",
    "flared": "расклёшенный", "flares": "клёш",
    "bootcut": "бутлег",
    "straight": "прямой",
    "skinny": "облегающий",
    "cropped": "укороченный", "crop": "кроп",
    "tucked": "заправленный",
    # neckline
    "halter": "халтер-топ", "halter-neck": "халтер",
    "off-shoulder": "со спущенными плечами",
    "off-the-shoulder": "со спущенными плечами",
    "one-shoulder": "на одно плечо",
    "off": "спущенные", "shoulders": "плечи", "shoulder": "плечо",
    "strapless": "без бретелей",
    "plunge": "глубокий вырез", "deep": "глубокий",
    "v-neck": "v-вырез",
    "high-neck": "высокий ворот",
    "turtleneck": "водолазка",
    "cowl": "хомут", "cowl-neck": "вырез-хомут",
    "boat-neck": "вырез-лодочка",
    "square-neck": "квадратный вырез",
    "sweetheart": "вырез-сердечком",
    "scoop": "круглый вырез",
    "balconette": "балконет",
    "thin": "тонкий", "thick": "толстый",
    "ballet-wrap": "балет-запах",
    "ballet": "балет",
    "ribbon-tie": "на ленте",
    # silhouette
    "a-line": "а-силуэт", "bodycon": "облегающее",
    "bandage": "бандаж", "wrap": "запах",
    "tube": "труба", "bustier": "бюстье",
    "asymmetric": "асимметричный",
    "cutout": "с вырезами", "cut-out": "с вырезами",
    "backless": "с открытой спиной",
    "lace-up": "на шнуровке",
    "zip": "на молнии", "zip-up": "на молнии",
    "pinafore": "сарафан-фартук",
    "babydoll": "бэбидолл",
    "mermaid": "рыбка",
    "ball-gown": "бальное платье",
    "sundress": "сарафан",
    "tutu": "пачка",
    "kimono": "кимоно",
    "kaftan": "кафтан",
    "robe": "халат",
    "sarong": "саронг",
    "cover-up": "пляжный кардиган",
    "shrug": "шраг",
    "trench": "тренч",
    "puffer": "пуховик",
    "bomber": "бомбер",
    "moto": "мото",
    "bermuda": "бермуды",
    "capri": "капри", "capris": "капри",
    "tennis": "теннисный",
    "joggers": "джоггеры",
    "leggings": "леггинсы",
    "palazzo": "палаццо",
    "carpenter": "плотницкий",
    "track": "трек",
    "skate": "скейтер",
    "cargo": "карго", "cargos": "карго",
    "parachute": "парашют",
    "boyfriend": "бойфренд",
    "distressed": "потёртый", "ripped": "рваный", "frayed": "обтрёпанный",
    "frayed-hem": "с обтрёпанным краем",
    "raw-edge": "необработанный край",
    "buckle": "пряжка", "buckle-detail": "с пряжкой",
    "belted": "с поясом",
    "lace-trim": "с кружевом",
    "high-cut": "с высоким вырезом",
    "one-piece": "слитный",
    "matching": "комплект",
    "underneath": "снизу",
    "over": "поверх",
    "beneath": "под",
    "with": "с",
    "and": "и",
    "in": "в",
    "of": "из",
    "at": "у",
    "it": "",       # filler word, drop
    "tied": "завязанный",
    "tied-at": "завязанный у",
    "chain-strap": "на цепочке",
    "chain-trim": "с цепочкой",
    "stack": "стопка", "stacked": "сложенный",
    "layered": "многослойный",
    "chunky": "массивный",
    "delicate": "изящный", "dainty": "изящный",
    "fine": "тонкий", "tiny": "крошечный", "small": "маленький",
    "minimal": "минималистичный",
    "simple": "простой",
    "sleek": "гладкий", "smooth": "гладкий",
    "bold": "яркий",
    "statement": "статемент",
    "antique": "состаренный",
    "vintage": "винтажный",
    "evening": "вечерний",
    "wedding": "свадебный",
    "bridal": "свадебный",
    "cathedral": "соборный",
    "boho": "бохо",
    "preppy": "преппи",
    "y2k": "y2k",
    "sporty": "спортивный",
    "athletic": "спортивный",
    "punk": "панк",
    "indie": "инди",
    "indie-sleaze": "инди-слиз",
    "kawaii": "каваи",
    "anime": "аниме",
    "cyber": "кибер",
    "grunge": "гранж",
    "goth": "готик",
    "gothic": "готический",
    "glam": "глэм",
    "chic": "шик",
    "effortless": "непринуждённый",
    "editorial": "редакционный",
    "streetwear": "уличный стиль",
    "gorpcore": "горпкор",
    "bombshell": "пин-ап",
    "vaporwave": "вейпорвейв",
    "sanrio": "санрио",
    "logo": "логотип",
    "novelty": "оригинальный",
    "character": "с персонажем", "character-print": "с персонажем",
    "hero-anime": "герой-аниме",
    "minimal": "минималистичный",
    "puff-sleeve": "пышные рукава",
    "puff": "пышный",
    "long-sleeve": "длинный рукав",
    "short-sleeve": "короткий рукав",
    "sleeveless": "без рукавов",
    "fingerless": "без пальцев",
    "lace-up": "на шнуровке",
    "high-cut": "высокий вырез",
    "deep-cut": "глубокий вырез",
    "open-back": "открытая спина",
    "fingertip": "до кончиков пальцев",
    "round": "круглый",
    "oval": "овальный",
    "rectangular": "прямоугольный",
    "cat-eye": "кошачий глаз",
    "heart-shaped": "в форме сердца",
    "star-and-heart": "звёзды и сердечки",
    "heart-charm": "сердечко-шарм",
    "wand-charm": "волшебная палочка-шарм",
    "drop": "капля",
    "drops": "капли",
    "studded": "со шпильками",
    "stud": "пусеты", "studs": "пусеты",
    "hoop": "кольцо", "hoops": "кольца",
    "garter": "подвязка",
    "thigh": "бедро", "thigh-highs": "чулки выше колена",
    "thigh-high": "выше колена",
    "knee-detail": "с деталью на колене",
    "fluid": "струящийся",
    "open": "открытый",
    "open-toe": "открытый носок",
    "pointed-toe": "острый носок",
    "pointe-style": "пуанты",
    "pointe": "пуанты",
    "slipper-style": "тапочки",
    "strappy": "на ремешках",
    "bow": "бант",
    "ribbon": "лента", "ribbons": "ленты",
    "tie-dye": "тай-дай",
    "string": "верёвка",
    "lace": "кружево",
    "neckline": "вырез",
    "halter-neck": "халтер",
    "bodice": "лиф",
    "hem": "край",
    "cups": "чашечки",
    "low": "низкий",
    "thigh": "бедро",
    "crystal-drop": "хрустальная капля",
    "crystal": "хрусталь",
    "diamond": "бриллиант",
    "gem": "камень",
    "shell": "ракушка",
    "pearl": "жемчуг",
    "pearl-and-gold": "жемчужно-золотой",
    "pearl-and-bow": "жемчужный с бантом",
    "ruby": "рубин",
    "coin": "монета",
    "key": "ключ",
    "lock": "замок",
    "lockets": "медальоны",
    "embossed": "тиснёный",
    "with": "с",
    "in": "в",
    "and": "и",
    "of": "из",
    "or": "или",
    "the": "",
    "a": "",
    "an": "",
}

# ─── NOUNS (the actual garment/accessory items) ──────────────────────────────
NOUNS = {
    # tops
    "top": "топ", "tops": "топы",
    "tee": "футболка", "tshirt": "футболка", "t-shirt": "футболка",
    "baby-tee": "бэйби-ти",
    "tank": "топ-майка",
    "cami": "камисоль", "camisole": "камисоль",
    "blouse": "блуза", "shirt": "рубашка", "button-up": "рубашка на пуговицах",
    "button-down": "рубашка на пуговицах", "button": "пуговица",
    "polo": "поло", "polo-neck": "поло",
    "hoodie": "худи", "sweatshirt": "свитшот", "sweater": "свитер",
    "knit": "трикотаж", "knits": "трикотаж",
    "turtleneck": "водолазка",
    "pullover": "пуловер", "jumper": "джемпер",
    "tunic": "туника", "vest": "жилет", "waistcoat": "жилет",
    "corset": "корсет", "bustier": "бюстье",
    "bralette": "бралетт", "bra": "бра", "bandeau": "топ-бандо",
    "halter": "халтер-топ",
    "tube-top": "топ-труба", "tube": "топ-труба",
    "long-sleeve": "топ с длинным рукавом",
    "blazer": "блейзер", "jacket": "куртка",
    "cardigan": "кардиган",
    "coat": "пальто",
    "trench": "тренч",
    "puffer": "пуховик",
    "bomber": "бомбер",
    "moto": "куртка-мото",
    "shrug": "шраг",
    "windbreaker": "ветровка",
    "kimono": "кимоно", "robe": "халат",
    "kaftan": "кафтан",
    "cape": "накидка", "cloak": "плащ",
    "anorak": "анорак",
    "gilet": "жилетка",
    "shirt-jacket": "рубашка-куртка",
    "overshirt": "оверсайз-рубашка",
    "blazer": "блейзер",
    "bodysuit": "боди", "body": "боди",
    "tracksuit": "костюм",
    "jersey": "джерси",
    "leotard": "купальник-боди",
    # bottoms
    "jeans": "джинсы", "trousers": "брюки", "pants": "штаны",
    "skirt": "юбка", "shorts": "шорты",
    "cargos": "карго", "cargo": "карго",
    "capris": "капри", "capri": "капри",
    "leggings": "леггинсы", "joggers": "джоггеры",
    "chinos": "чиносы", "culottes": "кюлоты",
    "jorts": "джинсовые шорты",
    "bermuda": "бермуды",
    "miniskirt": "мини-юбка",
    "flares": "клёш-джинсы",
    "jeggings": "джеггинсы",
    "denim": "джинса",
    "tutu": "пачка",
    "palazzo": "палаццо",
    "pinafore": "сарафан-фартук",
    "overall": "комбинезон",
    "overalls": "комбинезон",
    # dresses / one-piece
    "dress": "платье", "gown": "платье", "sundress": "сарафан",
    "bodycon": "облегающее платье",
    "catsuit": "комбинезон-катсьют",
    "monokini": "монокини",
    "swimsuit": "купальник",
    "bikini": "бикини",
    "babydoll": "бэбидолл",
    "jumpsuit": "комбинезон",
    "romper": "ромпер",
    "playsuit": "плейсьют",
    "onesie": "комбинезон",
    "slip": "комбинация",
    # shoes
    "shoes": "обувь", "boots": "ботинки",
    "heels": "каблуки", "sneakers": "кроссовки",
    "sandals": "сандалии", "loafers": "лоферы",
    "mules": "мюли", "pumps": "лодочки",
    "flats": "балетки", "stilettos": "шпильки",
    "trainers": "кроссовки", "footwear": "обувь",
    "kitten-heels": "котёнки", "kittens": "котёнки",
    "pointe": "пуанты",
    "platform": "платформа", "platforms": "платформа",
    "espadrilles": "эспадрильи",
    "slippers": "тапочки",
    "slides": "шлёпанцы",
    "mary": "мэри", "janes": "джейн",
    "combat": "берцы",
    "cowboy": "ковбойские",
    "ankle": "ботильоны",
    "stiletto": "шпилька",
    "low-top": "низкие",
    # bags
    "bag": "сумка", "clutch": "клатч", "tote": "тоут",
    "backpack": "рюкзак", "crossbody": "кросс-боди",
    "baguette": "багет",
    "hobo": "хобо",
    "satchel": "сатчел",
    "purse": "кошелёк", "handbag": "сумочка",
    "wallet": "кошелёк",
    "saddle": "седло-сумка",
    "bucket": "бакет-сумка",
    "messenger": "мессенджер",
    "top-handle": "топ-хендл",
    "shoulder": "сумка через плечо",
    "sling": "слинг-сумка",
    "pouch": "поясная сумка",
    # jewelry
    "earrings": "серьги", "necklace": "ожерелье",
    "necklaces": "ожерелья", "chain": "цепочка",
    "chains": "цепочки", "ring": "кольцо", "rings": "кольца",
    "bangles": "браслеты", "bracelet": "браслет", "bracelets": "браслеты",
    "cuff": "браслет-манжета", "cuffs": "манжеты",
    "choker": "чокер", "chokers": "чокеры",
    "pendant": "подвеска",
    "anklet": "ножной браслет", "anklets": "ножные браслеты",
    "hoops": "кольца", "hoop": "кольцо",
    "studs": "пусеты", "stud": "пусеты",
    "drops": "серьги-капли", "drop": "капля",
    "jewelry": "украшения",
    "piercings": "пирсинг",
    "brooch": "брошь",
    "locket": "медальон", "lockets": "медальоны",
    "collar": "колье",
    "watch": "часы",
    "tiara": "тиара",
    "crown": "корона",
    "nameplate": "именная подвеска",
    "ear": "ушные",
    "cuffs": "кафы",
    # head
    "beanie": "шапка-бини", "hat": "шляпа", "cap": "кепка",
    "beret": "берет", "headband": "ободок",
    "bandana": "бандана", "veil": "вуаль",
    "hood": "капюшон",
    "kerchief": "косынка", "headscarf": "платок",
    "snapback": "снепбэк",
    "scarf": "шарф", "scarves": "шарфы",
    "chignon": "шиньон", "bun": "пучок",
    "clip": "заколка", "clips": "заколки",
    "claw": "крабик",
    "barrette": "заколка",
    "tassel": "кисточка",
    "pom-pom": "помпон",
    "mantilla": "мантилья",
    "birdcage": "вуаль-сетка",
    "visor": "козырёк",
    "baseball": "бейсбольная",
    # eyewear
    "sunglasses": "солнцезащитные очки",
    "shades": "очки",
    "glasses": "очки",
    "goggles": "гогглы",
    # belts / waist
    "belt": "ремень", "sash": "пояс",
    "harness": "пояс-харнесс",
    "garter": "подвязка",
    # other accessories
    "gloves": "перчатки", "mittens": "варежки", "earmuffs": "наушники",
    "tights": "колготки", "socks": "носки",
    "stockings": "чулки",
    "fishnets": "сетка-чулки",
    "scrunchie": "резинка-скранч",
    "pin": "значок", "pins": "значки",
    "bow": "бант",
    "charm": "шарм",
    "ribbon": "лента", "ribbons": "ленты",
    "nails": "ногти",
    "stickers": "наклейки",
    "cufflinks": "запонки",
    "wristbands": "напульсники",
    "keychain": "брелок", "keychains": "брелоки",
    "warmers": "грелки",
    "arm": "руки",
    "ties": "завязки",
    "leg": "нога",
    "wrap": "запах",
    "sleeves": "рукава",
    "briefs": "трусики",
    "thigh-highs": "чулки выше колена",
    "balconette": "балконет",
    "bodice": "лиф",
    "straps": "бретели",
    # specialty / brand-style
    "y2k": "y2k",
    "yk2": "y2k",
    "bombshell": "пин-ап",
    "boho": "бохо", "bohemian": "бохо",
    "vaporwave": "вейпорвейв",
    "kawaii": "каваи",
    "preppy": "преппи",
    "streetwear": "уличный стиль",
    "chic": "шик",
    "sleek": "гладкий",
    "effortless": "непринуждённый",
    "editorial": "редакционный",
    "grunge": "гранж",
    "goth": "готик", "gothic": "готический",
    "sporty": "спортивный",
    "glam": "глэм",
    "gorpcore": "горпкор",
    "sanrio": "санрио",
    "indie-sleaze": "инди-слиз",
    # textiles & special details (also in fabrics, kept here as fallback)
    "halter-neck": "халтер-вырез",
    "cowl-neck": "вырез-хомут",
    "ballet-wrap": "балет-запах",
    "ballet": "балет",
    "tea": "чайный",
    "barefoot-style": "босиком",
    "candy": "конфетный",
    "candy-bead": "конфета-бисер",
    "candy-color": "конфетный цвет",
    "evening": "вечерний",
    "wedding": "свадебный",
    "high-leg": "с высоким вырезом",
    "high-neck": "высокий ворот",
    "ditsy": "мелкий цветочный",
    "embroidered": "вышитый",
    "smocked": "смокированный",
    "frilled": "с воланами",
    "rust": "ржавый",
    "denim-flower": "цветок из денима",
    "oversized-bloom": "крупный цветок",
    "rib": "рифлёный",
    "in": "в",
    "and": "и",
    "with": "с",
    "of": "из",
    # safety nets for less-common words still found in vocab
    "carabiner": "карабин",
    "card": "карта",
    "string": "верёвка",
    "wrist": "запястье",
    "knee": "колено",
    "padded": "утеплённый",
    "tracksuit": "костюм",
    "track": "трек",
    "amber": "янтарь",
    "coffin": "гроб",
    "holo": "голо",
    "lip-print": "губы-принт",
    "pixel-art": "пиксель-арт",
    "bubble-font": "пузырь-шрифт",
    "jellyfish": "медуза",
    "mesh-layered": "сетка-слоями",
    "boucle": "букле",
    "piping": "кант",
    "puff": "пышный",
    "flame": "пламя",
    "flame-print": "пламя-принт",
    "novelty": "оригинальный",
    "balconette": "балконет",
    "matching": "комплект",
    "deep": "глубокий",
    "soft": "мягкий",
    "bold": "яркий",
    "tucked": "заправленный",
    "dark": "тёмный",
    "tea": "чайный",
    "tiered": "многоярусный",
    "draped": "драпированный",
    "studded": "со шпильками",
    "rhinestone-studded": "со стразами",
    "snake-print": "змеиный принт",
    "pink-stone": "розовый камень",
    "buckle-detail": "с пряжкой",
    "fringed": "с бахромой",
    "fringe": "бахрома",
    "ribbed": "рифлёный",
    "knee-high": "до колена",
    "low-top": "низкие",
    "ribbon-tie": "на ленте",
    "pointe-style": "пуанты",
    "slipper-style": "тапочки",
    "matching": "комплект",
    # safety-net additions (caught in v1 coverage report)
    "sheer": "прозрачный",
    "woven": "плетёный",
    "hair": "для волос",
    "heart": "сердечко",
    "baby": "малышка",
    "canvas": "канвас",
    "jelly": "желейный",
    "utility": "утилитарный",
    "daisy": "ромашка",
    "mixed": "смешанный",
    "eyelet": "перфорированный",
    "pinstripe": "в тонкую полоску",
    "triangle": "треугольный",
    "box": "коробка",
    "butterfly": "бабочка",
    "resin": "смола",
    "crucifix": "крест",
    "flower": "цветок",
    "beach": "пляжный",
    "mismatched": "несочетающиеся",
    "print": "принт",
    "plushie": "плюшка",
    "sculptural": "скульптурный",
    "cross": "крест",
    "basket": "корзина",
    "sun": "солнце",
    "kitten": "котёнок",
    "band": "лента",
    # final coverage sweep
    "chained": "на цепочке",
    "chandelier": "люстра",
    "face": "лицо",
    "bamboo": "бамбук",
    "bar": "брусок",
    "disc": "диск",
    "mascot": "талисман",
    "safety-pin": "английская булавка",
    "enamel": "эмаль",
    "rubber": "резиновый",
    "star": "звезда",
    "pencil": "карандаш",
    "tap": "степ",
    "medium": "средний",
    "cracked-leather": "потрескавшаяся кожа",
    "suede-patch": "замшевая заплатка",
    "crinkle": "помятый",
    "acid-lime": "кислотно-лаймовый",
    "airy": "невесомый",
    "a-list": "a-list",
    "floral-lace": "цветочное кружево",
    "corset-style": "корсетный",
}

# ─── TAGS (16 style tags from outfit sections) ───────────────────────────────
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
    # NB: in the actual data the tag list also includes the section ids
    # of outfit groups; any tag not in this map will be passed through as-is.
}

# ═════════════════════════════════════════════════════════════════════════════
# CORE TRANSLATOR
# ═════════════════════════════════════════════════════════════════════════════

# Combined lookup table — precedence: NOUNS > CUTS > FABRICS > COLORS.
# Reason: nouns are typically the last word and most specific; if a token
# matches both a noun and a fabric (e.g. "ribbed"), we want the noun sense
# to win when it's actually a noun, but the fabric sense to win when it's
# an adjective. In practice, we resolve by first checking NOUNS, falling
# back to CUTS, FABRICS, COLORS — same word in different dicts will share
# meaning anyway.
def build_combined():
    combined = {}
    for d in (COLORS, FABRICS, CUTS, NOUNS):
        for k, v in d.items():
            # Don't let later dicts overwrite earlier non-empty values
            # unless the value is an "improvement" — but we keep it simple
            # and use last-write-wins, since the dictionaries are crafted
            # to converge on the same meaning per token.
            combined[k] = v
    return combined

COMBINED = build_combined()

# Tokenizer: split on whitespace, but preserve hyphenated compounds intact,
# and strip surrounding punctuation. Quotes within tokens (e.g. 'a-list') are
# kept attached.
TOKEN_RX = re.compile(r"[a-z0-9][a-z0-9'-]*", re.I)

def tokenize(text):
    """Return list of tokens (lowercased) preserving order."""
    return [m.group(0).lower() for m in TOKEN_RX.finditer(text)]

def translate_token(tok):
    """Return (russian_or_None, was_found_bool)."""
    if tok in COMBINED:
        v = COMBINED[tok]
        if v == "":
            return (None, True)  # known filler word, drop
        return (v, True)
    # Try stripping a trailing 's (a-list' style)
    if tok.endswith("'") and tok[:-1] in COMBINED:
        v = COMBINED[tok[:-1]]
        return (v if v else None, True)
    return (None, False)

def translate_text(text):
    """Translate a single item text; return (ru_str, list_of_unknown_tokens)."""
    tokens = tokenize(text)
    out = []
    unknown = []
    for tok in tokens:
        ru, found = translate_token(tok)
        if found:
            if ru is not None:
                out.append(ru)
            # else: filler dropped silently
        else:
            unknown.append(tok)
            # In the final JSON we keep raw EN inline (β1).
            out.append(tok)
    # Collapse multiple spaces, strip
    ru_text = " ".join(out)
    ru_text = re.sub(r"\s+", " ", ru_text).strip()
    return (ru_text, unknown)

def translate_text_for_preview(text):
    """Same as translate_text but wraps unknown tokens in [brackets] (β3)."""
    tokens = tokenize(text)
    out = []
    unknown = []
    for tok in tokens:
        ru, found = translate_token(tok)
        if found:
            if ru is not None:
                out.append(ru)
        else:
            unknown.append(tok)
            out.append(f"[{tok}]")
    ru_text = " ".join(out)
    ru_text = re.sub(r"\s+", " ", ru_text).strip()
    return (ru_text, unknown)

# ═════════════════════════════════════════════════════════════════════════════
# MAIN
# ═════════════════════════════════════════════════════════════════════════════

def main():
    report = "--report" in sys.argv

    with open(IN_PATH) as f:
        data = json.load(f)
    items = data["items"]

    # Coverage report
    word_counts = Counter()
    for it in items:
        for tok in tokenize(it["text"]):
            word_counts[tok] += 1
    total_unique = len(word_counts)
    covered = sum(1 for w in word_counts if w in COMBINED)
    coverage_pct = 100.0 * covered / total_unique if total_unique else 0
    total_token_occurrences = sum(word_counts.values())
    covered_occurrences = sum(n for w, n in word_counts.items() if w in COMBINED)
    occ_pct = 100.0 * covered_occurrences / total_token_occurrences if total_token_occurrences else 0

    print(f"Vocabulary coverage: {covered}/{total_unique} unique words ({coverage_pct:.1f}%)")
    print(f"Token-occurrence coverage: {covered_occurrences}/{total_token_occurrences} ({occ_pct:.1f}%)")

    # Translate everything
    final_map = {}
    tsv_rows = []
    flagged_count = 0
    all_unknown = Counter()

    for it in items:
        ru_final, unknown_final = translate_text(it["text"])
        ru_preview, _ = translate_text_for_preview(it["text"])
        flag = "1" if unknown_final else ""
        if unknown_final:
            flagged_count += 1
            for u in unknown_final:
                all_unknown[u] += 1
        final_map[it["id"]] = ru_final
        tsv_rows.append((it["id"], it["category"], it["text"], ru_preview, flag))

    # Sort rows by flagged-desc, then category, then id (so flagged rise to top)
    tsv_rows.sort(key=lambda r: (0 if r[4] == "1" else 1, r[1], r[0]))

    # Write TSV preview
    with open(TSV_OUT, "w") as f:
        f.write("id\tcategory\tEN\tRU\tflagged\n")
        for row in tsv_rows:
            f.write("\t".join(row) + "\n")

    # Write final JSON map (id -> ru_text); also include tagsRu
    out = {
        "items": final_map,
        "tagsRu": TAGS_RU,
        "_meta": {
            "totalItems": len(items),
            "flagged": flagged_count,
            "coverageUnique": f"{coverage_pct:.1f}%",
            "coverageOccurrences": f"{occ_pct:.1f}%",
        },
    }
    with open(JSON_OUT, "w") as f:
        json.dump(out, f, indent=2, ensure_ascii=False)

    print(f"\nWrote {TSV_OUT}  ({len(tsv_rows)} rows, {flagged_count} flagged)")
    print(f"Wrote {JSON_OUT}")

    if report or flagged_count > 0:
        print(f"\nTop unknown tokens (need dictionary entries):")
        for w, n in all_unknown.most_common(30):
            print(f"  {n:4}  {w}")

if __name__ == "__main__":
    main()
