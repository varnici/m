"""Unit tests for the regex/keyword voice-transcript fallback parser.
No API key needed — pure function tests."""

from app.services.multilingual_parser import parse_transcript


def test_english_sale_with_quantity_and_price():
    result = parse_transcript("I sold 5 bags of rice at 8000 naira", "en")
    assert result.quantity == 5
    assert result.movement_type == "sale"
    assert result.selling_price_kobo == 800000


def test_english_purchase_with_k_notation():
    result = parse_transcript("I bought 10 cartons of indomie for 50k", "en")
    assert result.quantity == 10
    assert result.movement_type == "purchase"
    assert result.cost_price_kobo == 5_000_000


def test_pidgin_sale_phrase():
    result = parse_transcript("I don sell 3 bag of rice for 15000", "pcm")
    assert result.movement_type == "sale"
    assert result.quantity == 3


def test_pidgin_purchase_phrase():
    result = parse_transcript("I get 20 carton of milo wey I buy for 40k", "pcm")
    assert result.movement_type == "purchase"
    assert result.quantity == 20
    assert result.cost_price_kobo == 4_000_000


def test_yoruba_sale_keyword():
    result = parse_transcript("mo ta igo epo meje", "yo")
    assert result.movement_type == "sale"


def test_yoruba_purchase_keyword():
    result = parse_transcript("mo ra apo iresi merin", "yo")
    assert result.movement_type == "purchase"


def test_igbo_sale_keyword():
    result = parse_transcript("ana m ere osisi ise", "ig")
    assert result.movement_type == "sale"


def test_igbo_purchase_keyword():
    result = parse_transcript("azutala m akpa osikapa iri", "ig")
    assert result.movement_type == "purchase"


def test_hausa_sale_keyword():
    result = parse_transcript("na sayar da buhu biyar na shinkafa", "ha")
    assert result.movement_type == "sale"


def test_hausa_purchase_keyword():
    result = parse_transcript("na saya buhu goma na shinkafa", "ha")
    assert result.movement_type == "purchase"


def test_empty_transcript_returns_all_none():
    result = parse_transcript("", "en")
    assert result.quantity is None
    assert result.movement_type is None
    assert result.product_name is None


def test_m_notation_million():
    result = parse_transcript("cost 1.5m", "en")
    assert result.cost_price_kobo == 150_000_000


def test_two_amounts_resolve_to_cost_then_sell_price():
    result = parse_transcript("indomie 200 250", "en")
    assert result.cost_price_kobo == 20000
    assert result.selling_price_kobo == 25000
