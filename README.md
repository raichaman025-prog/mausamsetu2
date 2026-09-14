# MausamSetu

**Hyperlocal Weather & Disaster Intelligence Platform** — a locality/tehsil/block/village-level
weather history, multi-hazard (flood, earthquake, heatwave) intelligence, risk visualization, and
citizen-participation prototype, inspired by the IMD weather portal. Built for hackathon / SIH
demo purposes.

> Seeded with a **130+ locality hyperlocal geography** across 6 Uttar Pradesh districts (Lucknow,
> Barabanki, Sitapur, Unnao, Raebareli, Ayodhya) — spanning district headquarters, tehsils, blocks,
> and villages — plus an **AI-assisted citizen-report verification engine** scoring every report
> against 11 independent factors.

---

## 1. What's new in this version

- **Hyperlocal geography (130+ localities):** every locality now carries a full administrative
  hierarchy — `state → district → tehsil → block → village` (plus city HQs and the original
  Lucknow city wards). See `backend/app/geography.py` / `frontend/src/lib/mockData.ts`.
- **Multi-hazard intelligence:** Flood, Earthquake, and Heatwave each get their own risk score,
  factor breakdown, and event history, selectable via tabs on the Location page, Home map, and
  Risk Map.
- **Flood Propagation Calculator:** given a source locality and a water flow speed (km/h), computes
  distance and ETA to any other locality using real coordinates (haversine distance) — including a
  "Downstream Impact Timeline" ranking the nearest localities by arrival time.
- **Citizen Report Verification Engine:** every submitted report is automatically scored 0–100
  across **11 weighted factors** (see §5) by `backend/app/verification.py`. The score is advisory
  only — a report's `status` always starts at "Pending" and a human admin makes the final call.

**Data-honesty note:** district and tehsil names are representative of real Uttar Pradesh
administrative units for demonstration purposes. Block and village names/coordinates are
procedurally generated (deterministic, not sourced from an official gazetteer) — see §6 for how to
swap in real Census/LGD data.

---

## 2. Project folder structure

```
mausamsetu/
├── backend/
│   ├── app/
│   │   ├── main.py             # FastAPI app, router wiring, CORS
│   │   ├── database.py         # SQLAlchemy engine/session (SQLite by default)
│   │   ├── models.py           # ORM models (User, Location, WeatherObservation, ...)
│   │   ├── schemas.py          # Pydantic request/response schemas
│   │   ├── auth.py             # JWT auth helpers
│   │   ├── geography.py        # Procedural hierarchical location generator (130+ localities)
│   │   ├── hazard_bias.py      # Deterministic per-hazard risk bias (flood/earthquake/heatwave)
│   │   ├── verification.py     # 11-factor citizen-report trust-scoring engine
│   │   ├── geo_utils.py        # Haversine distance for flood propagation
│   │   ├── seed_data.py        # Seeds all of the above into the database
│   │   └── routers/
│   │       ├── locations.py    # list/search/filter by district, tehsil, block, type
│   │       ├── weather.py      # current / forecast / history
│   │       ├── flood.py        # flood history, flood risk, propagation/ETA calculator
│   │       ├── earthquake.py   # earthquake history + risk
│   │       ├── heatwave.py     # heatwave history + risk
│   │       ├── risk.py         # POST /api/risk/predict — mock ML risk engine
│   │       ├── alerts.py
│   │       ├── auth_router.py
│   │       ├── citizen.py      # saved locations, citizen reports + verification
│   │       ├── admin.py        # admin summary, report management + verification detail
│   │       └── data.py         # data-source status + sync
│   ├── requirements.txt
│   └── .env.example
│
└── frontend/
    ├── src/
    │   ├── main.tsx / App.tsx
    │   ├── lib/
    │   │   ├── api.ts          # API client — calls backend, auto-falls back to mock data
    │   │   ├── mockData.ts     # Mirrors backend: geography generator, hazard bias, verification
    │   │   ├── types.ts
    │   │   ├── utils.ts
    │   │   └── AuthContext.tsx
    │   ├── components/
    │   │   ├── MapView.tsx               # multi-hazard-aware Leaflet map
    │   │   ├── HazardRiskCard.tsx        # shared risk-gauge card (flood/earthquake/heatwave)
    │   │   ├── FloodPropagationCalculator.tsx
    │   │   ├── VerificationDisplay.tsx   # verification badge + factor breakdown
    │   │   └── ui/*
    │   └── pages/
    │       ├── Home.tsx               # map + hazard tabs + district filter
    │       ├── LocationDetail.tsx     # weather + Flood/Earthquake/Heatwave hazard tabs
    │       ├── RiskMap.tsx            # district-filterable multi-hazard heatmap
    │       ├── Alerts.tsx
    │       ├── CitizenLogin.tsx
    │       ├── CitizenDashboard.tsx
    │       ├── CitizenReport.tsx      # incident report + live AI verification breakdown
    │       ├── AdminDashboard.tsx     # reports table with AI Trust Score column
    │       └── DataIngestion.tsx
    ├── package.json
    ├── vite.config.ts
    └── .env.example
```

---

## 3. Setup instructions

### Backend (FastAPI + SQLite)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env

# Seed the database — generates 130+ localities and all mock data
python -m app.seed_data

uvicorn app.main:app --reload --port 8000
```

Swagger docs: **`http://localhost:8000/docs`**.

### Frontend (React + TS + Tailwind + Vite)

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Runs at `http://localhost:5173`, proxying `/api/*` to the backend on port 8000.

> The frontend runs standalone too — every call in `src/lib/api.ts` falls back to the deterministic
> mock data in `src/lib/mockData.ts` (which mirrors the backend's geography, hazard-bias, and
> verification logic) if the backend isn't running.

---

## 4. Environment variables

**backend/.env**

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./mausamsetu.db` | Swap for a Postgres DSN in production |
| `JWT_SECRET_KEY` | demo secret | Change in production |
| `CORS_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | Comma-separated allowed origins |

**frontend/.env**

| Variable | Default | Description |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:8000` | Used for a production build; dev uses the Vite proxy |

---

## 5. Citizen Report Verification Engine — the 11 factors

Every report submitted via `POST /api/citizen/report` is scored 0–100 by
`backend/app/verification.py` (mirrored in `frontend/src/lib/mockData.ts`'s
`computeVerification`). **This never auto-verifies or auto-rejects a report** — `status` always
starts at `"Pending"`; the score is a decision-support signal shown to the citizen and to admins
via an expandable breakdown.

| # | Factor | Max pts | What it checks |
|---|---|---|---|
| 1 | Report Corroboration | 5 | Other reports of the same type near this locality in the last 72 hours |
| 2 | Reporter Credibility & History | 10 | The submitting citizen's track record of previously verified reports |
| 3 | Historical Hazard Match | 15 | Does this locality have a history of this hazard type? |
| 4 | Live Weather / Rainfall Signal | 15 | Does current observed rainfall support a flood-type claim? |
| 5 | Satellite / Remote-Sensing Signal | 15 | Simulated water/ground-surface change signal (see §6) |
| 6 | River Gauge / Water-Level Signal | 10 | Current river level vs. warning/danger marks |
| 7 | Active Alert Correlation | 5 | Is there a live advisory for this hazard at this locality? |
| 8 | Image Evidence Quality | 5 | Was photo evidence attached? |
| 9 | Location Plausibility | 5 | Simulated geofence / duplicate-spam sanity check |
| 10 | Report Timing Plausibility | 5 | Does the timestamp fall in the hazard's typical seasonal window? |
| 11 | Population & Density Consistency | 5 | Is the incident type plausible for this locality's type/density? |

**Label thresholds:** ≥70 → "Likely True", 40–69 → "Needs Review", <40 → "Likely False".

---

## 6. Demo credentials

| Role | Email | Password |
|---|---|---|
| Citizen | `demo@citizen.in` | `password123` |
| Admin (seeded; `/admin` has no login gate in this prototype) | `admin@mausamsetu.gov.in` | `admin123` |

---

## 7. Guided demo script

1. Open the app — the map shows 130+ localities across 6 districts. Switch the hazard tabs
   (Flood/Earthquake/Heatwave) above the map to see markers recolor.
2. Filter by district in the sidebar, or search a locality by name.
3. Click **Gomti Nagar** → review current weather, hourly forecast, 5-year weather history.
4. On the **Flood** tab: see the 72% HIGH risk gauge, then use the **Flood Propagation
   Calculator** — set water speed to 25 km/h and pick a downstream target locality to see the
   distance and ETA. Review the Downstream Impact Timeline table.
5. Switch to the **Earthquake** and **Heatwave** tabs to see their own risk gauges and event
   histories for the same locality.
6. Open **Alerts** — active Red/Orange/Yellow advisories, including a heatwave warning.
7. **Citizen Login** → `demo@citizen.in` / `password123` → **Citizen Dashboard**.
8. **Report Local Condition** → pick a district, then a locality (grouped by type), submit a
   Waterlogging report with a photo → see the **AI Verification breakdown** (11 factors, score,
   Likely True/Needs Review/Likely False label) appear immediately.
9. Open **Admin** → the new report appears in the table with its **AI Trust Score** badge; click
   the row to expand the full factor breakdown; change its status manually.
10. Open **Data** → review the ingestion pipeline, click **Run Data Sync**.
11. Return to the **Risk Map** → filter by district and hazard type to explore the full dataset.

---

## 8. API documentation (summary)

Full interactive docs: `GET /docs`.

| Method | Path | Description |
|---|---|---|
| GET | `/api/locations?district=&tehsil=&block=&locality_type=&q=` | List/filter localities |
| GET | `/api/locations/districts` | List distinct district names |
| GET | `/api/locations/by-slug/{slug}` | Locality by slug |
| GET | `/api/weather/current\|forecast\|history/{location_id}` | Weather data |
| GET | `/api/flood/history\|risk/{location_id}` | Flood history / current risk |
| POST | `/api/flood/propagation` | `{source_location_id, target_location_id, water_speed_kmph}` → distance, ETA |
| GET | `/api/flood/propagation/{source_location_id}?speed=` | ETA to every other locality, nearest first |
| GET | `/api/earthquake/history\|risk/{location_id}` | Earthquake history / current risk |
| GET | `/api/heatwave/history\|risk/{location_id}` | Heatwave history / current risk |
| POST | `/api/risk/predict` | Run the mock risk engine on custom flood inputs |
| GET | `/api/alerts` | Active/inactive alerts |
| POST | `/api/auth/login` \| `/api/auth/register` | Citizen auth |
| POST | `/api/citizen/report` | Submit an incident report — runs the verification engine automatically |
| GET | `/api/citizen/reports` | Logged-in user's own reports (with verification) |
| GET | `/api/admin/reports` | All reports (with verification) |
| GET | `/api/admin/reports/{id}/verification` | Full verification breakdown for one report |
| PATCH | `/api/admin/reports/{id}` | Update a report's status |
| GET/POST | `/api/data/status` \| `/api/data/sync` | Ingestion pipeline status / simulate a sync |

---

## 9. Replacing mock weather data with a real API

All weather reads happen in `backend/app/routers/weather.py`. Create an adapter (e.g.
`backend/app/adapters/imd_client.py`) that normalizes a real provider's response into the
`WeatherObservation`/`WeatherForecast` shape, and have a scheduled job upsert into those tables —
`routers/weather.py` and the frontend need no changes.

## 10. Replacing the mock flood-risk model with real ML

Swap `compute_mock_risk()` in `backend/app/routers/risk.py` for a trained model call, keeping the
`{score, level, factors}` return shape.

## 11. Replacing the mock satellite signal in the verification engine

Factor 5 (`Satellite / Remote-Sensing Signal`) in `backend/app/verification.py` currently uses a
deterministic hash as a stand-in. Replace it with a real call to a Sentinel-1/2 SAR flood-extent
API or MODIS NDWI service for the report's locality and date, keeping the 0–15 point scale.

## 12. Replacing procedural geography with real Census/LGD data

`backend/app/geography.py` generates block/village names and coordinates procedurally. To use real
data: source village-level records from the **Local Government Directory (LGD)** or **Census 2011
village codes**, and replace `generate_locations()`'s output with rows read from that dataset —
`seed_data.py` and every router consuming `Location` need no changes since they operate on the
same shape.

---

## 13. Architecture notes

- **Geospatial data**: `latitude`/`longitude` are plain floats for the SQLite prototype. Migrating
  to PostgreSQL, replace with a PostGIS `geometry(Point, 4326)` column (GeoAlchemy2) with a GIST
  index, and replace `geo_utils.haversine_km()` calls with `ST_DistanceSphere`.
- **Auth**: JWT-based, demo-strength. Rotate `JWT_SECRET_KEY` via a secrets manager in production.
- **Verification engine**: deliberately advisory-only by design — see §5. Treat this as the
  pattern to extend when integrating real satellite/reporter-reputation data sources.
- **Frontend resilience**: `src/lib/api.ts` wraps every backend call in a try/catch falling back to
  `mockData.ts`, so the UI is demo-safe even without the backend running.

