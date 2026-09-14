"""
Procedural hyperlocal geography generator.

Produces a realistic administrative hierarchy — District -> Tehsil ->
Block -> Village, plus each district's headquarters city and (for
Lucknow) the original city wards — entirely from a compact spec, rather
than hand-listing 100+ lat/lon rows.

Data-honesty note: district and tehsil names below are representative of
real Uttar Pradesh administrative units for demonstration purposes; block
and village names/coordinates are procedurally generated (deterministic,
not sourced from an official gazetteer) and should not be treated as a
verified government dataset. See README for how to swap in real Census /
LGD (Local Government Directory) codes and boundaries.
"""
import hashlib

STATE = "Uttar Pradesh"

# District -> (headquarters city name, lat, lon, approx HQ population)
DISTRICTS = {
    "Lucknow":    ("Lucknow",    26.8467, 80.9462, 3500000),
    "Barabanki":  ("Barabanki",  26.9394, 81.1949, 210000),
    "Sitapur":    ("Sitapur",    27.5680, 80.6820, 240000),
    "Unnao":      ("Unnao",      26.5464, 80.4879, 190000),
    "Raebareli":  ("Raebareli",  26.2309, 81.2340, 220000),
    "Ayodhya":    ("Ayodhya",    26.7922, 82.1998, 612000),
}

TEHSILS = {
    "Lucknow":    ["Sadar", "Malihabad", "Bakshi Ka Talab", "Mohanlalganj", "Kakori"],
    "Barabanki":  ["Nawabganj", "Ramnagar", "Haidergarh", "Fatehpur", "Zaidpur"],
    "Sitapur":    ["Sadar", "Biswan", "Mahmudabad", "Laharpur", "Mishrikh"],
    "Unnao":      ["Sadar", "Purwa", "Safipur", "Hasanganj", "Bighapur"],
    "Raebareli":  ["Sadar", "Dalmau", "Maharajganj", "Salon", "Lalganj"],
    "Ayodhya":    ["Sadar", "Rudauli", "Sohawal", "Bikapur", "Milkipur"],
}

# Original Lucknow city wards — kept as-is so the existing guided demo
# script (Gomti Nagar = 72% HIGH flood risk, etc.) still plays out exactly.
LUCKNOW_WARDS = [
    dict(name="Gomti Nagar", slug="gomti-nagar", latitude=26.8467, longitude=81.0110, population=185000, elevation_m=113),
    dict(name="Aliganj", slug="aliganj", latitude=26.8890, longitude=80.9440, population=142000, elevation_m=111),
    dict(name="Hazratganj", slug="hazratganj", latitude=26.8500, longitude=80.9450, population=96000, elevation_m=123),
    dict(name="Indira Nagar", slug="indira-nagar", latitude=26.8790, longitude=81.0910, population=210000, elevation_m=110),
]

VILLAGE_NAME_ROOTS = [
    "Rampur", "Sultanpur", "Bhagwantpur", "Fatehpur", "Devipur", "Chandpur", "Nawabganj",
    "Shivpur", "Kishunpur", "Mahmudpur", "Islamnagar", "Rajapur", "Bishunpur", "Gopalpur",
    "Narayanpur", "Bahadurpur", "Akbarpur", "Jagdishpur", "Ramnagar", "Krishnanagar",
    "Bhojpur", "Piparpur", "Basantpur", "Manikpur", "Udaipur", "Harchandpur", "Dostpur",
    "Semrahna", "Kotwa", "Piprahan", "Deokali", "Nigoha", "Itaunja", "Bijnaur", "Sarai Mir",
]
VILLAGE_SUFFIXES = ["", " Khurd", " Kalan", " Khas"]

BLOCK_NAME_ROOTS = [
    "Chinhat", "Mall", "Gosaiganj", "Sarojani Nagar", "Deva", "Fatehpur Chaurasi",
    "Behta", "Rasoolabad", "Ramsanehighat", "Tiloi", "Simrauta", "Kumhrawan",
    "Bachhrawan", "Harakh", "Suratganj", "Kursi", "Pisawan", "Elia", "Machhrehta",
    "Sandana", "Bilgram", "Auras", "Purwa", "Nawabganj Rural", "Asiwan",
    "Panhan", "Amawan", "Fatehpur Rural", "Bihar", "Dariyabad",
]


def _hash_unit(seed: str) -> float:
    digest = hashlib.md5(seed.encode()).hexdigest()
    return int(digest[:8], 16) / 0xFFFFFFFF


def _stable_int_hash(seed: str) -> int:
    """Deterministic integer hash (Python's built-in hash() is randomized
    per-process for strings, so we can't rely on it for reproducible seeding)."""
    return int(hashlib.md5(seed.encode()).hexdigest()[:8], 16)


def _offset_coord(lat: float, lon: float, seed: str, max_deg: float):
    """Deterministic small offset so children scatter plausibly around a parent."""
    angle = _hash_unit(seed + ":angle") * 6.28318
    radius = (0.35 + 0.65 * _hash_unit(seed + ":radius")) * max_deg
    return round(lat + radius * (0.7 * (angle % 2 - 1)), 5), round(lon + radius * (0.7 * ((angle * 1.7) % 2 - 1)), 5)


def _slugify(name: str) -> str:
    return name.lower().replace(" ", "-").replace("(", "").replace(")", "")


def generate_locations() -> list:
    """
    Returns a flat list of location dicts (with a `_parent_slug` key used
    only during seeding to resolve `parent_id`, stripped before insert).
    Produces 130+ localities: 6 district HQ cities, 4 Lucknow wards,
    30 tehsils, 30 blocks, 60 villages = 130 total.
    """
    locations = []

    # Lucknow city wards (children of the Lucknow HQ city)
    for w in LUCKNOW_WARDS:
        locations.append({
            **w, "district": "Lucknow", "state": STATE, "tehsil": None, "block": None,
            "locality_type": "ward", "_parent_slug": "lucknow",
        })

    for district, (hq_name, hq_lat, hq_lon, hq_pop) in DISTRICTS.items():
        hq_slug = _slugify(hq_name)
        locations.append(dict(
            name=hq_name, slug=hq_slug, latitude=hq_lat, longitude=hq_lon,
            district=district, state=STATE, tehsil=None, block=None,
            locality_type="city", population=hq_pop,
            elevation_m=round(95 + _hash_unit(f"elev:{hq_slug}") * 35, 1),
            _parent_slug=None,
        ))

        for t_idx, tehsil in enumerate(TEHSILS[district]):
            t_slug = _slugify(f"{tehsil}-{district}-tehsil")
            t_lat, t_lon = _offset_coord(hq_lat, hq_lon, t_slug, 0.32)
            locations.append(dict(
                name=tehsil, slug=t_slug, latitude=t_lat, longitude=t_lon,
                district=district, state=STATE, tehsil=tehsil, block=None,
                locality_type="tehsil",
                population=int(18000 + _hash_unit(f"pop:{t_slug}") * 45000),
                elevation_m=round(90 + _hash_unit(f"elev:{t_slug}") * 40, 1),
                _parent_slug=hq_slug,
            ))

            # One block per tehsil, rotating through the block name pool
            block_name = BLOCK_NAME_ROOTS[(_stable_int_hash(district) + t_idx) % len(BLOCK_NAME_ROOTS)]
            b_slug = _slugify(f"{block_name}-{district}-block")
            b_lat, b_lon = _offset_coord(t_lat, t_lon, b_slug, 0.12)
            locations.append(dict(
                name=f"{block_name} Block", slug=b_slug, latitude=b_lat, longitude=b_lon,
                district=district, state=STATE, tehsil=tehsil, block=block_name,
                locality_type="block",
                population=int(9000 + _hash_unit(f"pop:{b_slug}") * 22000),
                elevation_m=round(88 + _hash_unit(f"elev:{b_slug}") * 42, 1),
                _parent_slug=t_slug,
            ))

            # Two villages per block
            for v_idx in range(2):
                root_idx = (_stable_int_hash(district) + t_idx * 3 + v_idx) % len(VILLAGE_NAME_ROOTS)
                suffix_idx = (_stable_int_hash(block_name) + v_idx) % len(VILLAGE_SUFFIXES)
                village_name = f"{VILLAGE_NAME_ROOTS[root_idx]}{VILLAGE_SUFFIXES[suffix_idx]}"
                v_slug = _slugify(f"{village_name}-{district}-{t_idx}-{v_idx}-village")
                v_lat, v_lon = _offset_coord(b_lat, b_lon, v_slug, 0.05)
                locations.append(dict(
                    name=village_name, slug=v_slug, latitude=v_lat, longitude=v_lon,
                    district=district, state=STATE, tehsil=tehsil, block=block_name,
                    locality_type="village",
                    population=int(900 + _hash_unit(f"pop:{v_slug}") * 7000),
                    elevation_m=round(85 + _hash_unit(f"elev:{v_slug}") * 45, 1),
                    _parent_slug=b_slug,
                ))

    return locations
