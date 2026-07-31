"""Regex/keyword fallback for structuring an inventory voice transcript when
the OpenAI structuring call fails or no API key is configured.

This is a best-effort heuristic layer, not a real NLP system — it exists so
voice capture degrades gracefully instead of failing outright. It covers
English, Nigerian Pidgin, Yoruba, Igbo, and Hausa action/price keywords, but
relies on digits and English number-words for quantities in all five
languages: Nigerian shopkeepers overwhelmingly code-switch to English/Arabic
numerals for prices and counts even mid-sentence in a local language, and a
correct Yoruba (vigesimal) or Hausa numeral parser is a much bigger
undertaking than this heuristic layer is meant to cover.
"""

from __future__ import annotations

import re
import unicodedata
from typing import Optional

from pydantic import BaseModel


def _normalize(text: str) -> str:
    """Lowercases and strips diacritics (Yoruba ọ/ẹ/ṣ, Igbo ụ/ị/ṅ, tone marks, etc.)
    so keyword matching is tolerant of ASR output that drops them, which is common."""
    decomposed = unicodedata.normalize("NFKD", text.lower())
    return "".join(ch for ch in decomposed if not unicodedata.combining(ch))

ENGLISH_NUMBER_WORDS = {
    "one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "seven": 7,
    "eight": 8, "nine": 9, "ten": 10, "eleven": 11, "twelve": 12, "twenty": 20,
    "thirty": 30, "forty": 40, "fifty": 50, "hundred": 100,
}

# Action keywords per language. "sale" = stock leaving (sold/issued),
# "purchase" = stock arriving (bought/received).
ACTION_KEYWORDS = {
    "en": {
        "sale": ["sold", "sale", "deduct", "remove", "issued", "gave out"],
        "purchase": ["bought", "received", "added", "purchase", "restock", "brought in"],
    },
    "pcm": {
        "sale": ["don sell", "sell am", "e don comot", "don go"],
        "purchase": ["i get", "don buy", "e don enter", "don land", "e don come"],
    },
    "yo": {
        "sale": ["ta", "mo ta", "ti mo ta"],
        "purchase": ["ra", "mo ra", "ti mo ra"],
    },
    "ig": {
        "sale": ["ree", "ana m ere", "eresila"],
        "purchase": ["zụrụ", "zụta", "azụtala"],
    },
    "ha": {
        "sale": ["sayar", "na sayar"],
        "purchase": ["saya", "na saya"],
    },
}

# Price/money cue words per language — used only to disambiguate cost vs.
# selling price when both a "cost" and "sell" number appear in one sentence.
COST_CUE_WORDS = {
    "en": ["cost", "bought at", "buying", "purchase price"],
    "pcm": ["wetin i buy am", "cost"],
    "yo": ["owo ti mo fi ra"],
    "ig": ["ego m ji zụta"],
    "ha": ["kuɗin da na saya"],
}
SELL_CUE_WORDS = {
    "en": ["selling", "sell at", "retail", "price"],
    "pcm": ["wetin i dey sell am", "price"],
    "yo": ["owo tita"],
    "ig": ["ego ire"],
    "ha": ["kuɗin sayarwa"],
}


class ParsedVoiceEntry(BaseModel):
    product_name: Optional[str] = None
    quantity: Optional[int] = None
    cost_price_kobo: Optional[int] = None
    selling_price_kobo: Optional[int] = None
    movement_type: Optional[str] = None  # "sale" | "purchase"


def _naira_to_kobo(amount_text: str) -> Optional[int]:
    """Parses a naira amount with optional k/m shorthand into kobo."""
    cleaned = re.sub(r"[₦naira,\s]", "", amount_text, flags=re.IGNORECASE)
    match = re.match(r"^(\d+(?:\.\d+)?)([km]?)$", cleaned, re.IGNORECASE)
    if not match:
        return None
    value = float(match.group(1))
    suffix = match.group(2).lower()
    if suffix == "k":
        value *= 1_000
    elif suffix == "m":
        value *= 1_000_000
    return int(round(value * 100))


UNIT_WORDS = [
    "bag", "bags", "carton", "cartons", "piece", "pieces", "pack", "packs",
    "kg", "kilo", "kilos", "litre", "litres", "liter", "liters", "box", "boxes",
    "card", "cards", "bottle", "bottles", "plate", "plates", "unit", "units",
    "item", "items", "sack", "sacks", "crate", "crates", "roll", "rolls",
    "tuber", "tubers", "basket", "baskets",
]


def _extract_quantity(text: str) -> Optional[int]:
    lowered = text.lower()
    unit_pattern = "|".join(UNIT_WORDS)

    # A number directly adjacent to a known unit word is the most reliable
    # signal — check this before falling back to "the only number present".
    m = re.search(rf"\b(\d+)\s+(?:of\s+)?(?:{unit_pattern})\b", lowered)
    if m:
        return int(m.group(1))
    m = re.search(rf"\b(?:{unit_pattern})\s+(?:of\s+)?(\d+)\b", lowered)
    if m:
        return int(m.group(1))

    # No unit word found. `(?!\.\d)` excludes the integer part of a decimal
    # (e.g. the "1" in "1.5m") so a lone price isn't misread as a quantity.
    all_digits = re.findall(r"\b(\d+)\b(?!\.\d)", lowered)
    if len(all_digits) == 1:
        return int(all_digits[0])

    for word, value in ENGLISH_NUMBER_WORDS.items():
        if re.search(rf"\b{word}\b", lowered):
            return value
    return None

def _extract_prices(
    text: str,
    language: str,
    quantity: Optional[int] = None,
    movement_type: Optional[str] = None,
) -> tuple[Optional[int], Optional[int]]:
    amount_pattern = r"(?:₦|naira\s*)?(\d+(?:\.\d+)?[km]?)"
    cost_price = None
    sell_price = None

    cost_cues = COST_CUE_WORDS.get(language, []) + COST_CUE_WORDS["en"]
    sell_cues = SELL_CUE_WORDS.get(language, []) + SELL_CUE_WORDS["en"]

    lowered = text.lower()
    for cue in cost_cues:
        m = re.search(rf"{re.escape(cue)}\s*{amount_pattern}", lowered, re.IGNORECASE)
        if m:
            cost_price = _naira_to_kobo(m.group(1))
            break
    for cue in sell_cues:
        m = re.search(rf"{re.escape(cue)}\s*{amount_pattern}", lowered, re.IGNORECASE)
        if m:
            sell_price = _naira_to_kobo(m.group(1))
            break

    if cost_price is None and sell_price is None:
        amounts = re.findall(amount_pattern, lowered, re.IGNORECASE)
        amounts = [a for a in amounts if a]
        # Drop the bare quantity digit from the amount candidates — e.g. in
        # "10 cartons for 50k" the "10" is a count, not a price, but it
        # matches the same digit pattern as an amount.
        if quantity is not None and str(quantity) in amounts:
            amounts.remove(str(quantity))
        if len(amounts) == 1:
            # A single price mentioned in a purchase context ("bought ... for
            # 50k") is what the shop paid, not what it sells at.
            if movement_type == "purchase":
                cost_price = _naira_to_kobo(amounts[0])
            else:
                sell_price = _naira_to_kobo(amounts[0])
        elif len(amounts) >= 2:
            cost_price = _naira_to_kobo(amounts[0])
            sell_price = _naira_to_kobo(amounts[1])

    return cost_price, sell_price


def _extract_movement_type(text: str, language: str) -> Optional[str]:
    normalized = _normalize(text)
    keywords = ACTION_KEYWORDS.get(language, ACTION_KEYWORDS["en"])
    for phrase in keywords.get("sale", []):
        if _normalize(phrase) in normalized:
            return "sale"
    for phrase in keywords.get("purchase", []):
        if _normalize(phrase) in normalized:
            return "purchase"
    # Fall back to English keywords too — code-switching is common.
    if language != "en":
        for phrase in ACTION_KEYWORDS["en"]["sale"]:
            if _normalize(phrase) in normalized:
                return "sale"
        for phrase in ACTION_KEYWORDS["en"]["purchase"]:
            if _normalize(phrase) in normalized:
                return "purchase"
    return None


def _extract_product_name(text: str, language: str) -> Optional[str]:
    lowered = text.lower()
    strip_words = set()
    for kw_map in (ACTION_KEYWORDS.get(language, {}), ACTION_KEYWORDS["en"]):
        for phrases in kw_map.values():
            for phrase in phrases:
                strip_words.update(phrase.split())
    strip_words.update(ENGLISH_NUMBER_WORDS.keys())
    strip_words.update({"of", "naira", "₦", "at", "for", "the", "a", "an"})

    tokens = re.findall(r"[a-zA-Z'-]+", lowered)
    remaining = [t for t in tokens if t not in strip_words and not t.isdigit()]
    if not remaining:
        return None
    return " ".join(w.capitalize() for w in remaining[:4])


def parse_transcript(text: str, language: str = "en") -> ParsedVoiceEntry:
    if not text or not text.strip():
        return ParsedVoiceEntry()

    quantity = _extract_quantity(text)
    movement_type = _extract_movement_type(text, language)
    cost_price_kobo, selling_price_kobo = _extract_prices(text, language, quantity, movement_type)
    product_name = _extract_product_name(text, language)

    return ParsedVoiceEntry(
        product_name=product_name,
        quantity=quantity,
        cost_price_kobo=cost_price_kobo,
        selling_price_kobo=selling_price_kobo,
        movement_type=movement_type,
    )
