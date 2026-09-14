"""
Deterministic hazard-bias generator.

With 100+ locations we can no longer hand-author a risk value per
locality. Instead, each locality's bias (0.0-1.0) for a given hazard is
derived from real-ish attributes (elevation, locality type/density,
district) plus a stable hash-based jitter so results are reproducible
across seed runs but still vary realistically place to place.

A handful of the original demo localities keep hand-tuned overrides so
the existing guided demo script (Gomti Nagar = 72% HIGH flood risk,
etc.) still plays out exactly as documented.
"""
import hashlib


FLOOD_OVERRIDES = {
    "gomti-nagar": 0.72, "aliganj": 0.38, "hazratganj": 0.22,
    "indira-nagar": 0.58, "malihabad": 0.45, "kakori": 0.31, "ayodhya": 0.50,
}
EARTHQUAKE_OVERRIDES = {
    "gomti-nagar": 0.36, "aliganj": 0.33, "hazratganj": 0.41,
    "indira-nagar": 0.34, "malihabad": 0.29, "kakori": 0.31, "ayodhya": 0.39,
}
HEATWAVE_OVERRIDES = {
    "gomti-nagar": 0.55, "aliganj": 0.50, "hazratganj": 0.63,
    "indira-nagar": 0.48, "malihabad": 0.58, "kakori": 0.53, "ayodhya": 0.60,
}


def _hash_unit(seed: str) -> float:
    """Deterministic pseudo-random float in [0, 1) from a string seed."""
    digest = hashlib.md5(seed.encode()).hexdigest()
    return int(digest[:8], 16) / 0xFFFFFFFF


def compute_flood_bias(location) -> float:
    slug = location.slug
    if slug in FLOOD_OVERRIDES:
        return FLOOD_OVERRIDES[slug]
    # Lower elevation + rural/village drainage infra => higher flood exposure
    elevation_factor = max(0.0, min(1.0, (135 - location.elevation_m) / 45))
    density_factor = {
        "city": 0.35, "tehsil": 0.45, "block": 0.50, "village": 0.55, "ward": 0.45, "town": 0.45,
    }.get(location.locality_type, 0.45)
    jitter = _hash_unit(f"flood:{slug}") * 0.3
    return round(min(0.95, max(0.05, 0.4 * elevation_factor + 0.35 * density_factor + jitter - 0.15)), 2)


def compute_earthquake_bias(location) -> float:
    slug = location.slug
    if slug in EARTHQUAKE_OVERRIDES:
        return EARTHQUAKE_OVERRIDES[slug]
    # Seismic Zone III region — fairly flat baseline with small district/hash variation
    district_base = {
        "Ayodhya": 0.37, "Barabanki": 0.34, "Sitapur": 0.33,
        "Unnao": 0.32, "Raebareli": 0.33, "Lucknow": 0.34,
    }.get(location.district, 0.33)
    jitter = (_hash_unit(f"eq:{slug}") - 0.5) * 0.12
    return round(min(0.7, max(0.15, district_base + jitter)), 2)


def compute_heatwave_bias(location) -> float:
    slug = location.slug
    if slug in HEATWAVE_OVERRIDES:
        return HEATWAVE_OVERRIDES[slug]
    # Dense urban areas run hotter (heat-island); open villages get some relief
    density_factor = {
        "city": 0.62, "tehsil": 0.54, "block": 0.50, "village": 0.46, "ward": 0.58, "town": 0.52,
    }.get(location.locality_type, 0.5)
    jitter = (_hash_unit(f"heat:{slug}") - 0.5) * 0.2
    return round(min(0.9, max(0.2, density_factor + jitter)), 2)


def risk_level_from_score(score: float) -> str:
    if score >= 0.85:
        return "SEVERE"
    if score >= 0.7:
        return "HIGH"
    if score >= 0.4:
        return "MODERATE"
    return "LOW"
