import type {
  LocationT, WeatherCurrentT, ForecastPointT, WeatherHistoryPointT,
  FloodEventT, FloodHistorySummaryT, RiskPredictResponseT, AlertT,
  CitizenReportT, DataSourceT, AdminSummaryT, UserT,
  EarthquakeEventT, EarthquakeHistorySummaryT, EarthquakeRiskT,
  HeatwaveEventT, HeatwaveHistorySummaryT, HeatwaveRiskT,
  FloodPropagationResultT, FloodPropagationRowT, HazardType,
  VerificationFactorT, VerificationResultT,
} from "./types";

// Deterministic pseudo-random so the mock demo looks stable across reloads
let seed = 42;
function rand(): number {
  seed = (seed * 9301 + 49297) % 233280;
  return seed / 233280;
}
function randRange(min: number, max: number) {
  return min + rand() * (max - min);
}

// ---------------------------------------------------------------------
// Hyperlocal geography: District -> Tehsil -> Block -> Village (130+)
// Mirrors backend/app/geography.py. Block/village names & coordinates are
// procedurally generated for demonstration — see README for real-data notes.
// ---------------------------------------------------------------------
const STATE = "Uttar Pradesh";

const DISTRICTS: Record<string, [string, number, number, number]> = {
  "Lucknow": ["Lucknow", 26.8467, 80.9462, 3500000],
  "Barabanki": ["Barabanki", 26.9394, 81.1949, 210000],
  "Sitapur": ["Sitapur", 27.5680, 80.6820, 240000],
  "Unnao": ["Unnao", 26.5464, 80.4879, 190000],
  "Raebareli": ["Raebareli", 26.2309, 81.2340, 220000],
  "Ayodhya": ["Ayodhya", 26.7922, 82.1998, 612000],
};

const TEHSILS: Record<string, string[]> = {
  "Lucknow": ["Sadar", "Malihabad", "Bakshi Ka Talab", "Mohanlalganj", "Kakori"],
  "Barabanki": ["Nawabganj", "Ramnagar", "Haidergarh", "Fatehpur", "Zaidpur"],
  "Sitapur": ["Sadar", "Biswan", "Mahmudabad", "Laharpur", "Mishrikh"],
  "Unnao": ["Sadar", "Purwa", "Safipur", "Hasanganj", "Bighapur"],
  "Raebareli": ["Sadar", "Dalmau", "Maharajganj", "Salon", "Lalganj"],
  "Ayodhya": ["Sadar", "Rudauli", "Sohawal", "Bikapur", "Milkipur"],
};

const LUCKNOW_WARDS: LocationT[] = [
  { id: 0, name: "Gomti Nagar", slug: "gomti-nagar", latitude: 26.8467, longitude: 81.0110, district: "Lucknow", state: STATE, locality_type: "ward", population: 185000, elevation_m: 113 },
  { id: 0, name: "Aliganj", slug: "aliganj", latitude: 26.8890, longitude: 80.9440, district: "Lucknow", state: STATE, locality_type: "ward", population: 142000, elevation_m: 111 },
  { id: 0, name: "Hazratganj", slug: "hazratganj", latitude: 26.8500, longitude: 80.9450, district: "Lucknow", state: STATE, locality_type: "ward", population: 96000, elevation_m: 123 },
  { id: 0, name: "Indira Nagar", slug: "indira-nagar", latitude: 26.8790, longitude: 81.0910, district: "Lucknow", state: STATE, locality_type: "ward", population: 210000, elevation_m: 110 },
];

const VILLAGE_NAME_ROOTS = [
  "Rampur", "Sultanpur", "Bhagwantpur", "Fatehpur", "Devipur", "Chandpur", "Nawabganj",
  "Shivpur", "Kishunpur", "Mahmudpur", "Islamnagar", "Rajapur", "Bishunpur", "Gopalpur",
  "Narayanpur", "Bahadurpur", "Akbarpur", "Jagdishpur", "Ramnagar", "Krishnanagar",
  "Bhojpur", "Piparpur", "Basantpur", "Manikpur", "Udaipur", "Harchandpur", "Dostpur",
  "Semrahna", "Kotwa", "Piprahan", "Deokali", "Nigoha", "Itaunja", "Bijnaur", "Sarai Mir",
];
const VILLAGE_SUFFIXES = ["", " Khurd", " Kalan", " Khas"];
const BLOCK_NAME_ROOTS = [
  "Chinhat", "Mall", "Gosaiganj", "Sarojani Nagar", "Deva", "Fatehpur Chaurasi",
  "Behta", "Rasoolabad", "Ramsanehighat", "Tiloi", "Simrauta", "Kumhrawan",
  "Bachhrawan", "Harakh", "Suratganj", "Kursi", "Pisawan", "Elia", "Machhrehta",
  "Sandana", "Bilgram", "Auras", "Purwa", "Nawabganj Rural", "Asiwan",
  "Panhan", "Amawan", "Fatehpur Rural", "Bihar", "Dariyabad",
];

function strHashUnit(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) >>> 0;
  return h / 4294967295;
}
function strHashInt(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) >>> 0;
  return h;
}
function offsetCoord(lat: number, lon: number, seedStr: string, maxDeg: number): [number, number] {
  const angle = strHashUnit(seedStr + ":angle") * 6.28318;
  const radius = (0.35 + 0.65 * strHashUnit(seedStr + ":radius")) * maxDeg;
  return [
    Math.round((lat + radius * (0.7 * ((angle % 2) - 1))) * 100000) / 100000,
    Math.round((lon + radius * (0.7 * (((angle * 1.7) % 2) - 1))) * 100000) / 100000,
  ];
}
function slugify(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-").replace(/[()]/g, "");
}

function generateLocations(): LocationT[] {
  const out: LocationT[] = [];
  let nextId = 1;
  const withId = (l: Omit<LocationT, "id">): LocationT => ({ ...l, id: nextId++ });

  LUCKNOW_WARDS.forEach((w) => out.push(withId({ ...w })));

  for (const district of Object.keys(DISTRICTS)) {
    const [hqName, hqLat, hqLon, hqPop] = DISTRICTS[district];
    const hqSlug = slugify(hqName);
    out.push(withId({
      name: hqName, slug: hqSlug, latitude: hqLat, longitude: hqLon,
      district, state: STATE, locality_type: "city", population: hqPop,
      elevation_m: Math.round((95 + strHashUnit(`elev:${hqSlug}`) * 35) * 10) / 10,
    }));

    TEHSILS[district].forEach((tehsil, tIdx) => {
      const tSlug = slugify(`${tehsil}-${district}-tehsil`);
      const [tLat, tLon] = offsetCoord(hqLat, hqLon, tSlug, 0.32);
      out.push(withId({
        name: tehsil, slug: tSlug, latitude: tLat, longitude: tLon,
        district, state: STATE, tehsil, locality_type: "tehsil",
        population: Math.round(18000 + strHashUnit(`pop:${tSlug}`) * 45000),
        elevation_m: Math.round((90 + strHashUnit(`elev:${tSlug}`) * 40) * 10) / 10,
      }));

      const blockName = BLOCK_NAME_ROOTS[(strHashInt(district) + tIdx) % BLOCK_NAME_ROOTS.length];
      const bSlug = slugify(`${blockName}-${district}-block`);
      const [bLat, bLon] = offsetCoord(tLat, tLon, bSlug, 0.12);
      out.push(withId({
        name: `${blockName} Block`, slug: bSlug, latitude: bLat, longitude: bLon,
        district, state: STATE, tehsil, block: blockName, locality_type: "block",
        population: Math.round(9000 + strHashUnit(`pop:${bSlug}`) * 22000),
        elevation_m: Math.round((88 + strHashUnit(`elev:${bSlug}`) * 42) * 10) / 10,
      }));

      for (let vIdx = 0; vIdx < 2; vIdx++) {
        const rootIdx = (strHashInt(district) + tIdx * 3 + vIdx) % VILLAGE_NAME_ROOTS.length;
        const suffixIdx = (strHashInt(blockName) + vIdx) % VILLAGE_SUFFIXES.length;
        const villageName = `${VILLAGE_NAME_ROOTS[rootIdx]}${VILLAGE_SUFFIXES[suffixIdx]}`;
        const vSlug = slugify(`${villageName}-${district}-${tIdx}-${vIdx}-village`);
        const [vLat, vLon] = offsetCoord(bLat, bLon, vSlug, 0.05);
        out.push(withId({
          name: villageName, slug: vSlug, latitude: vLat, longitude: vLon,
          district, state: STATE, tehsil, block: blockName, locality_type: "village",
          population: Math.round(900 + strHashUnit(`pop:${vSlug}`) * 7000),
          elevation_m: Math.round((85 + strHashUnit(`elev:${vSlug}`) * 45) * 10) / 10,
        }));
      }
    });
  }
  return out;
}

export const LOCATIONS: LocationT[] = generateLocations();
export const DISTRICT_NAMES: string[] = Object.keys(DISTRICTS);

// ---------------------------------------------------------------------
// Hazard bias (mirrors backend/app/hazard_bias.py) — deterministic per
// locality, with hand-tuned overrides preserved for the original demo set.
// ---------------------------------------------------------------------
const FLOOD_OVERRIDES: Record<string, number> = {
  "gomti-nagar": 0.72, "aliganj": 0.38, "hazratganj": 0.22,
  "indira-nagar": 0.58, "malihabad-lucknow-tehsil": 0.45, "kakori-lucknow-tehsil": 0.31,
  "ayodhya": 0.50,
};
const EARTHQUAKE_OVERRIDES: Record<string, number> = {
  "gomti-nagar": 0.36, "aliganj": 0.33, "hazratganj": 0.41, "indira-nagar": 0.34,
  "ayodhya": 0.39,
};
const HEATWAVE_OVERRIDES: Record<string, number> = {
  "gomti-nagar": 0.55, "aliganj": 0.50, "hazratganj": 0.63, "indira-nagar": 0.48,
  "ayodhya": 0.60,
};

function computeFloodBias(loc: LocationT): number {
  if (FLOOD_OVERRIDES[loc.slug] !== undefined) return FLOOD_OVERRIDES[loc.slug];
  const elevationFactor = Math.max(0, Math.min(1, (135 - loc.elevation_m) / 45));
  const densityFactor = ({ city: 0.35, tehsil: 0.45, block: 0.50, village: 0.55, ward: 0.45, town: 0.45 } as Record<string, number>)[loc.locality_type] ?? 0.45;
  const jitter = strHashUnit(`flood:${loc.slug}`) * 0.3;
  return Math.round(Math.min(0.95, Math.max(0.05, 0.4 * elevationFactor + 0.35 * densityFactor + jitter - 0.15)) * 100) / 100;
}
function computeEarthquakeBias(loc: LocationT): number {
  if (EARTHQUAKE_OVERRIDES[loc.slug] !== undefined) return EARTHQUAKE_OVERRIDES[loc.slug];
  const districtBase = ({ Ayodhya: 0.37, Barabanki: 0.34, Sitapur: 0.33, Unnao: 0.32, Raebareli: 0.33, Lucknow: 0.34 } as Record<string, number>)[loc.district] ?? 0.33;
  const jitter = (strHashUnit(`eq:${loc.slug}`) - 0.5) * 0.12;
  return Math.round(Math.min(0.7, Math.max(0.15, districtBase + jitter)) * 100) / 100;
}
function computeHeatwaveBias(loc: LocationT): number {
  if (HEATWAVE_OVERRIDES[loc.slug] !== undefined) return HEATWAVE_OVERRIDES[loc.slug];
  const densityFactor = ({ city: 0.62, tehsil: 0.54, block: 0.50, village: 0.46, ward: 0.58, town: 0.52 } as Record<string, number>)[loc.locality_type] ?? 0.5;
  const jitter = (strHashUnit(`heat:${loc.slug}`) - 0.5) * 0.2;
  return Math.round(Math.min(0.9, Math.max(0.2, densityFactor + jitter)) * 100) / 100;
}

export const RISK_PROFILE: Record<string, number> = Object.fromEntries(LOCATIONS.map((l) => [l.slug, computeFloodBias(l)]));
export const EARTHQUAKE_RISK_PROFILE: Record<string, number> = Object.fromEntries(LOCATIONS.map((l) => [l.slug, computeEarthquakeBias(l)]));
export const HEATWAVE_RISK_PROFILE: Record<string, number> = Object.fromEntries(LOCATIONS.map((l) => [l.slug, computeHeatwaveBias(l)]));
export const HAZARD_RISK_PROFILES: Record<HazardType, Record<string, number>> = {
  flood: RISK_PROFILE, earthquake: EARTHQUAKE_RISK_PROFILE, heatwave: HEATWAVE_RISK_PROFILE,
};

const CONDITIONS = ["Clear", "Partly Cloudy", "Cloudy", "Light Rain", "Heavy Rain", "Thunderstorm", "Hazy"];

export function riskLevelFromScore(score: number): string {
  if (score >= 0.85) return "SEVERE";
  if (score >= 0.7) return "HIGH";
  if (score >= 0.4) return "MODERATE";
  return "LOW";
}

export function getLocationBySlug(slug: string): LocationT | undefined {
  return LOCATIONS.find((l) => l.slug === slug);
}
export function getLocationById(id: number): LocationT | undefined {
  return LOCATIONS.find((l) => l.id === id);
}

export function getCurrentWeather(locationId: number): WeatherCurrentT {
  const loc = getLocationById(locationId)!;
  const bias = computeFloodBias(loc);
  const baseTemp = 32 + randRange(-2, 2);
  return {
    location_id: locationId,
    timestamp: new Date().toISOString(),
    temperature: Math.round(baseTemp * 10) / 10,
    feels_like: Math.round((baseTemp + randRange(1, 4)) * 10) / 10,
    humidity: Math.round((55 + bias * 30 + randRange(-5, 5)) * 10) / 10,
    rainfall: Math.round(Math.max(0, 8 + bias * 10 + randRange(-4, 6)) * 10) / 10,
    wind_speed: Math.round(randRange(8, 20) * 10) / 10,
    wind_direction: ["NW", "SW", "NE", "SE", "N", "S", "E", "W"][Math.floor(rand() * 8)],
    pressure: Math.round(randRange(1002, 1012) * 10) / 10,
    visibility: Math.round(randRange(3, 9) * 10) / 10,
    condition: CONDITIONS[Math.floor(rand() * CONDITIONS.length)],
  };
}

export function getForecast(locationId: number): ForecastPointT[] {
  const loc = getLocationById(locationId)!;
  const bias = computeFloodBias(loc);
  const baseTemp = 32;
  const hours = [10, 13, 16, 19, 22];
  return hours.map((h) => ({
    forecast_time: new Date(new Date().setHours(h, 0, 0, 0)).toISOString(),
    temperature: Math.round((baseTemp + Math.sin((h / 24) * Math.PI * 2) * 4) * 10) / 10,
    rain_probability: Math.round(Math.min(95, Math.max(5, 30 + bias * 60 + randRange(-10, 10)))),
    condition: CONDITIONS[Math.floor(rand() * CONDITIONS.length)],
  }));
}

const RANGE_DAYS: Record<string, number> = { "7d": 7, "30d": 30, "6m": 182, "1y": 365, "5y": 1825 };

export function getWeatherHistory(locationId: number, range: string): WeatherHistoryPointT[] {
  const loc = getLocationById(locationId)!;
  const bias = computeFloodBias(loc);
  const days = RANGE_DAYS[range] ?? 1825;
  const now = new Date();
  const points: WeatherHistoryPointT[] = [];

  if (range === "7d" || range === "30d") {
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const month = d.getMonth() + 1;
      const seasonalRain = month === 7 || month === 8 ? 8 : month === 6 || month === 9 ? 4 : 0.5;
      const seasonalTemp = month === 5 || month === 6 ? 42 : month === 12 || month === 1 ? 18 : 32;
      points.push({
        period: d.toISOString().slice(0, 10),
        avg_temperature: Math.round((seasonalTemp + randRange(-2, 2)) * 10) / 10,
        rainfall_mm: Math.round(Math.max(0, seasonalRain * (0.6 + bias) + randRange(-1, 3)) * 10) / 10,
        humidity: Math.round((50 + bias * 25 + randRange(-5, 5)) * 10) / 10,
        extreme_events: rand() > 0.92 ? 1 : 0,
      });
    }
  } else {
    const years = days / 365;
    const startYear = now.getFullYear() - Math.ceil(years) + 1;
    for (let year = startYear; year <= now.getFullYear(); year++) {
      for (let month = 1; month <= 12; month++) {
        if (year === now.getFullYear() && month > now.getMonth() + 1) continue;
        const seasonalRain = month === 7 || month === 8 ? 220 : month === 6 || month === 9 ? 90 : 15;
        const seasonalTemp = month === 5 || month === 6 ? 44 : month === 12 || month === 1 ? 18 : 32;
        const noise = randRange(0.7, 1.4);
        points.push({
          period: `${year}-${String(month).padStart(2, "0")}`,
          avg_temperature: Math.round((seasonalTemp + randRange(-3, 3)) * 10) / 10,
          rainfall_mm: Math.round(Math.max(0, seasonalRain * noise * (0.7 + bias)) * 10) / 10,
          humidity: Math.round((45 + (seasonalRain / 220) * 40 + randRange(-5, 5)) * 10) / 10,
          extreme_events: seasonalRain > 150 && rand() > 0.6 ? 1 : 0,
        });
      }
    }
  }
  return points;
}

const FLOOD_PATTERN: { year: number; severity: string; baseDuration: number }[] = [
  { year: 2019, severity: "Moderate", baseDuration: 6 },
  { year: 2021, severity: "Severe", baseDuration: 9 },
  { year: 2023, severity: "Moderate", baseDuration: 5 },
  { year: 2024, severity: "Severe", baseDuration: 11 },
  { year: 2025, severity: "Low", baseDuration: 3 },
];

export function getFloodHistory(locationId: number): FloodHistorySummaryT {
  const loc = getLocationById(locationId)!;
  const bias = computeFloodBias(loc);
  const events: FloodEventT[] = FLOOD_PATTERN.map((f, idx) => {
    const duration = Math.max(1, Math.round(f.baseDuration * (0.6 + bias)));
    const start = new Date(f.year, 6 + (idx % 2), 3 + Math.floor(rand() * 19));
    const end = new Date(start);
    end.setDate(end.getDate() + duration);
    const rainfall = Math.round((120 + bias * 180 + randRange(-20, 40)) * 10) / 10;
    const waterLevel = Math.round((102 + bias * 4 + randRange(-0.5, 1.2)) * 100) / 100;
    const flowSpeed = Math.max(3, Math.round((12 + bias * 20 + (rainfall / 300) * 15 + randRange(-2, 3)) * 10) / 10);
    return {
      id: idx + 1,
      start_date: start.toISOString(),
      end_date: end.toISOString(),
      severity: f.severity,
      rainfall_mm: rainfall,
      water_level_m: waterLevel,
      water_flow_speed_kmph: flowSpeed,
      duration_days: duration,
      affected_area_sqkm: Math.round((1.2 + bias * 6 + randRange(0, 2)) * 10) / 10,
      affected_population: Math.round(loc.population * (0.03 + bias * 0.15)),
      description: `${f.severity} flooding in ${loc.name} following intense monsoon rainfall; low-lying pockets and drainage-adjacent streets were worst affected.`,
    };
  });

  const yearsSpan = Math.max(1, events[events.length - 1] ? (new Date(events[events.length - 1].start_date).getFullYear() - new Date(events[0].start_date).getFullYear()) || 1 : 1);
  const frequency = Math.round((events.length / yearsSpan) * 10 * 10) / 10;
  const avgRainfall = Math.round((events.reduce((s, e) => s + e.rainfall_mm, 0) / events.length) * 10) / 10;
  const highestRisk = Math.round(bias * 100);

  return { events, flood_frequency_per_decade: frequency, avg_rainfall_before_flood: avgRainfall, highest_recorded_risk: highestRisk };
}

export function getFloodRisk(locationId: number): RiskPredictResponseT {
  const loc = getLocationById(locationId)!;
  const bias = computeFloodBias(loc);
  const forecast_rainfall = Math.round(Math.min(100, 40 + bias * 55 + randRange(-5, 5)));
  const river_water_level = Math.round(Math.min(100, 35 + bias * 60 + randRange(-5, 5)));
  const soil_moisture = Math.round(Math.min(100, 45 + bias * 45 + randRange(-5, 5)));
  const historical_flood_risk = Math.round(Math.min(100, 50 + bias * 45 + randRange(-5, 5)));
  const drainage_risk = Math.round(Math.min(100, 38 + bias * 50 + randRange(-5, 5)));
  const score = Math.round(
    (0.28 * forecast_rainfall / 100 + 0.22 * river_water_level / 100 + 0.18 * soil_moisture / 100 +
      0.20 * historical_flood_risk / 100 + 0.12 * drainage_risk / 100) * 100
  ) / 100;

  return {
    location_id: locationId,
    risk_score: score,
    risk_level: riskLevelFromScore(score),
    confidence: Math.round(randRange(0.78, 0.94) * 100) / 100,
    model_version: "mausamsetu-riskv1-mock",
    factors: { forecast_rainfall, river_water_level, soil_moisture, historical_flood_risk, drainage_risk },
    disclaimer: "Risk score is an analytical estimate for demonstration and should not replace official government warnings.",
  };
}

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const PROPAGATION_DISCLAIMER =
  "Estimated using straight-line distance between localities and the given flow speed — a simplified demonstration model. Real flood wave routing depends on river channel geometry, terrain, and drainage infrastructure.";

export function getFloodPropagation(sourceId: number, targetId: number, speedKmph: number): FloodPropagationResultT {
  const source = getLocationById(sourceId)!;
  const target = getLocationById(targetId)!;
  const distance = haversineKm(source.latitude, source.longitude, target.latitude, target.longitude);
  const etaHours = Math.round((distance / speedKmph) * 100) / 100;
  return {
    source_name: source.name,
    target_name: target.name,
    distance_km: Math.round(distance * 10) / 10,
    water_speed_kmph: speedKmph,
    eta_hours: etaHours,
    estimated_arrival_time: new Date(Date.now() + etaHours * 3600 * 1000).toISOString(),
    disclaimer: PROPAGATION_DISCLAIMER,
  };
}

export function getFloodPropagationTable(sourceId: number, speedKmph: number): FloodPropagationRowT[] {
  const source = getLocationById(sourceId)!;
  // Limit to a representative sample so the table stays readable with 130+ localities
  const candidates = LOCATIONS.filter((l) => l.id !== sourceId);
  const rows = candidates.map((target) => {
    const distance = haversineKm(source.latitude, source.longitude, target.latitude, target.longitude);
    const etaHours = Math.round((distance / speedKmph) * 100) / 100;
    return {
      target_location_id: target.id,
      target_name: target.name,
      distance_km: Math.round(distance * 10) / 10,
      eta_hours: etaHours,
      estimated_arrival_time: new Date(Date.now() + etaHours * 3600 * 1000).toISOString(),
    };
  });
  return rows.sort((a, b) => a.distance_km - b.distance_km).slice(0, 12);
}

// ---------------- Earthquake ----------------
const MMI_SCALE = ["II", "III", "IV", "V", "VI"];

export function getEarthquakeHistory(locationId: number): EarthquakeHistorySummaryT {
  const loc = getLocationById(locationId)!;
  const bias = computeEarthquakeBias(loc);
  const years = [2019, 2021, 2022, 2024, 2025];
  const events: EarthquakeEventT[] = [];
  years.forEach((year, idx) => {
    if (rand() < 0.35) return;
    const magnitude = Math.round((2.8 + bias * 2.2 + randRange(-0.3, 0.5)) * 10) / 10;
    const depth = Math.round(randRange(8, 40) * 10) / 10;
    events.push({
      id: idx + 1,
      date: new Date(year, Math.floor(rand() * 12), 1 + Math.floor(rand() * 27)).toISOString(),
      magnitude,
      depth_km: depth,
      epicenter_distance_km: Math.round(randRange(15, 180) * 10) / 10,
      intensity_mmi: MMI_SCALE[Math.min(MMI_SCALE.length - 1, Math.max(0, Math.floor(magnitude - 2)))],
      affected_population: Math.round(loc.population * bias * 0.02),
      description: `Minor tremor felt in ${loc.name}, magnitude ${magnitude}; no major structural damage reported.`,
    });
  });

  if (events.length === 0) {
    return { events: [], strongest_recorded_magnitude: 0, avg_depth_km: 0, events_last_decade: 0 };
  }
  return {
    events,
    strongest_recorded_magnitude: Math.round(Math.max(...events.map((e) => e.magnitude)) * 10) / 10,
    avg_depth_km: Math.round((events.reduce((s, e) => s + e.depth_km, 0) / events.length) * 10) / 10,
    events_last_decade: events.length,
  };
}

export function getEarthquakeRisk(locationId: number): EarthquakeRiskT {
  const loc = getLocationById(locationId)!;
  const bias = computeEarthquakeBias(loc);
  const seismic_zone_intensity = Math.round(Math.min(100, 40 + bias * 55 + randRange(-5, 5)));
  const soil_liquefaction_risk = Math.round(Math.min(100, 30 + bias * 50 + randRange(-5, 5)));
  const building_vulnerability = Math.round(Math.min(100, 35 + bias * 55 + randRange(-5, 5)));
  const fault_line_proximity = Math.round(Math.min(100, 25 + bias * 60 + randRange(-5, 5)));
  const historical_seismicity = Math.round(Math.min(100, 30 + bias * 55 + randRange(-5, 5)));
  const score = Math.round(
    (0.28 * seismic_zone_intensity / 100 + 0.20 * soil_liquefaction_risk / 100 +
      0.22 * building_vulnerability / 100 + 0.15 * fault_line_proximity / 100 +
      0.15 * historical_seismicity / 100) * 100
  ) / 100;

  return {
    location_id: locationId,
    hazard_type: "earthquake",
    risk_score: score,
    risk_level: riskLevelFromScore(score),
    confidence: Math.round(randRange(0.7, 0.88) * 100) / 100,
    model_version: "mausamsetu-riskv1-mock",
    factors: { seismic_zone_intensity, soil_liquefaction_risk, building_vulnerability, fault_line_proximity, historical_seismicity },
    disclaimer: "Seismic risk score is an analytical estimate for demonstration and should not replace official government warnings or a certified structural seismic assessment.",
  };
}

// ---------------- Heatwave ----------------
export function getHeatwaveHistory(locationId: number): HeatwaveHistorySummaryT {
  const loc = getLocationById(locationId)!;
  const bias = computeHeatwaveBias(loc);
  const currentYear = new Date().getFullYear();
  const events: HeatwaveEventT[] = [];
  for (let year = currentYear - 5; year <= currentYear; year++) {
    const month = rand() > 0.5 ? 4 : 5;
    const start = new Date(year, month, 1 + Math.floor(rand() * 19));
    const duration = Math.max(2, Math.round(3 + bias * 9 + randRange(-1, 2)));
    const end = new Date(start);
    end.setDate(end.getDate() + duration);
    const maxTemp = Math.round((42 + bias * 6 + randRange(-1, 2)) * 10) / 10;
    events.push({
      id: events.length + 1,
      start_date: start.toISOString(),
      end_date: end.toISOString(),
      max_temperature: maxTemp,
      heat_index: Math.round((maxTemp + bias * 5 + randRange(0, 3)) * 10) / 10,
      duration_days: duration,
      affected_population: Math.round(loc.population * (0.05 + bias * 0.1)),
      description: `Heatwave conditions in ${loc.name} with peak temperature ${maxTemp}°C; IMD advisory issued for outdoor workers and vulnerable groups.`,
    });
  }
  return {
    events,
    hottest_recorded_temperature: Math.round(Math.max(...events.map((e) => e.max_temperature)) * 10) / 10,
    avg_duration_days: Math.round((events.reduce((s, e) => s + e.duration_days, 0) / events.length) * 10) / 10,
    events_last_decade: events.length,
  };
}

export function getHeatwaveRisk(locationId: number): HeatwaveRiskT {
  const loc = getLocationById(locationId)!;
  const bias = computeHeatwaveBias(loc);
  const forecast_max_temperature = Math.round(Math.min(100, 45 + bias * 50 + randRange(-5, 5)));
  const heat_index_load = Math.round(Math.min(100, 40 + bias * 55 + randRange(-5, 5)));
  const urban_heat_island = Math.round(Math.min(100, 35 + bias * 55 + randRange(-5, 5)));
  const green_cover_deficit = Math.round(Math.min(100, 30 + bias * 60 + randRange(-5, 5)));
  const vulnerable_population_exposure = Math.round(Math.min(100, 35 + bias * 55 + randRange(-5, 5)));
  const score = Math.round(
    (0.30 * forecast_max_temperature / 100 + 0.22 * heat_index_load / 100 +
      0.18 * urban_heat_island / 100 + 0.15 * green_cover_deficit / 100 +
      0.15 * vulnerable_population_exposure / 100) * 100
  ) / 100;

  return {
    location_id: locationId,
    hazard_type: "heatwave",
    risk_score: score,
    risk_level: riskLevelFromScore(score),
    confidence: Math.round(randRange(0.75, 0.92) * 100) / 100,
    model_version: "mausamsetu-riskv1-mock",
    factors: { forecast_max_temperature, heat_index_load, urban_heat_island, green_cover_deficit, vulnerable_population_exposure },
    disclaimer: "Heatwave risk score is an analytical estimate for demonstration and should not replace official IMD heat advisories.",
  };
}

const ALERT_DEFS: { slug: string; severity: string; title: string; description: string; recommended_action: string; hoursValid: number }[] = [
  { slug: "gomti-nagar", severity: "Red", title: "Heavy rainfall expected", description: "80–100 mm rainfall expected over the next 6 hours due to an active monsoon trough.", recommended_action: "Avoid low-lying underpasses. Move vehicles to higher ground. Keep emergency contacts ready.", hoursValid: 6 },
  { slug: "aliganj", severity: "Yellow", title: "Waterlogging probability increased", description: "Localized waterlogging likely in low-lying colonies after sustained moderate rain.", recommended_action: "Avoid non-essential travel through known waterlogging points during peak rain hours.", hoursValid: 12 },
  { slug: "indira-nagar", severity: "Orange", title: "River level approaching warning mark", description: "Gomti river level is rising and is within 0.6 m of the warning mark near this ward.", recommended_action: "Residents in low-lying ghats and adjoining streets should stay alert and prepare to relocate valuables.", hoursValid: 18 },
  { slug: "malihabad-lucknow-tehsil", severity: "Yellow", title: "Heavy rain advisory for agricultural areas", description: "Sustained rainfall may affect standing crops and unpaved rural access roads.", recommended_action: "Secure stored produce and avoid low-water crossings on rural roads.", hoursValid: 24 },
  { slug: "hazratganj", severity: "Orange", title: "Heatwave warning — peak temperatures expected", description: "Maximum temperatures likely to reach 45°C+ in dense market areas due to the urban heat-island effect.", recommended_action: "Avoid outdoor activity between 12–4 PM, stay hydrated, and check on elderly neighbours.", hoursValid: 48 },
];

export const ALERTS: AlertT[] = ALERT_DEFS.map((a, idx) => {
  const loc = getLocationBySlug(a.slug);
  return {
    id: idx + 1,
    location_id: loc ? loc.id : 1,
    location_name: loc ? loc.name : a.slug,
    severity: a.severity,
    title: a.title,
    description: a.description,
    recommended_action: a.recommended_action,
    valid_from: new Date().toISOString(),
    valid_until: new Date(Date.now() + a.hoursValid * 3600 * 1000).toISOString(),
    active: true,
  };
});

export const DEMO_USER: UserT = { id: 1, name: "Demo Citizen", email: "demo@citizen.in", role: "citizen" };

// ---------------------------------------------------------------------
// Citizen report verification engine (mirrors backend/app/verification.py)
// 11 weighted factors summing to 100 — advisory only, never auto-decides.
// ---------------------------------------------------------------------
const FLOOD_RELATED_TYPES = new Set(["Flood", "Waterlogging", "Heavy Rain", "Drainage Blockage"]);

function hazardBiasForType(loc: LocationT, reportType: string): number {
  if (FLOOD_RELATED_TYPES.has(reportType)) return computeFloodBias(loc);
  if (reportType === "Road Damage") return (computeFloodBias(loc) + computeEarthquakeBias(loc)) / 2;
  return (computeFloodBias(loc) + computeEarthquakeBias(loc) + computeHeatwaveBias(loc)) / 3;
}

function factor(name: string, points: number, maxPoints: number, description: string): VerificationFactorT {
  return { name, points: Math.round(Math.max(0, Math.min(maxPoints, points)) * 10) / 10, max_points: maxPoints, description };
}

export function computeVerification(params: {
  location: LocationT; reportType: string; imageUrl: string | null | undefined;
  reporterUserId: number | null | undefined; reportTimestamp: Date;
}): VerificationResultT {
  const { location, reportType, imageUrl, reporterUserId, reportTimestamp } = params;
  const factors: VerificationFactorT[] = [];

  // 1. Report Corroboration (5 pts)
  const windowStart = reportTimestamp.getTime() - 72 * 3600 * 1000;
  const similarCount = MOCK_REPORTS.filter(
    (r) => r.location_id === location.id && r.type === reportType && new Date(r.timestamp).getTime() >= windowStart
  ).length;
  factors.push(factor("Report Corroboration", 1 + similarCount * 1.5, 5,
    `${similarCount} other ${reportType.toLowerCase()} report(s) logged near this locality in the last 72 hours.`));

  // 2. Reporter Credibility & History (10 pts)
  if (!reporterUserId) {
    factors.push(factor("Reporter Credibility & History", 5, 10, "Anonymous submission — no reporter history available."));
  } else {
    const past = MOCK_REPORTS.filter((r) => r.reporter_name === "Demo Citizen");
    if (past.length === 0) {
      factors.push(factor("Reporter Credibility & History", 6, 10, "First report from this citizen account."));
    } else {
      const verifiedRatio = past.filter((r) => r.status === "Verified" || r.status === "Resolved").length / past.length;
      factors.push(factor("Reporter Credibility & History", 4 + verifiedRatio * 6, 10,
        `${past.length} prior report(s), ${Math.round(verifiedRatio * 100)}% previously verified/resolved.`));
    }
  }

  // 3. Historical Hazard Match (15 pts)
  const bias = hazardBiasForType(location, reportType);
  factors.push(factor("Historical Hazard Match", bias * 15, 15,
    `${location.name} has a ${bias >= 0.6 ? "high" : bias >= 0.35 ? "moderate" : "low"} historical exposure profile for this hazard type.`));

  // 4. Live Weather / Rainfall Signal (15 pts)
  const currentWeather = getCurrentWeather(location.id);
  if (FLOOD_RELATED_TYPES.has(reportType)) {
    factors.push(factor("Live Weather / Rainfall Signal", (currentWeather.rainfall / 60) * 15, 15,
      `Current observed rainfall at this locality is ${currentWeather.rainfall} mm.`));
  } else {
    factors.push(factor("Live Weather / Rainfall Signal", 9, 15,
      "Weather correlation is only strongly diagnostic for flood-related report types."));
  }

  // 5. Satellite / Remote-Sensing Signal (15 pts) — mock NDWI-style signal
  const satSeed = `sat:${location.slug}:${reportTimestamp.toISOString().slice(0, 10)}`;
  const satSignal = 0.5 * bias + 0.5 * strHashUnit(satSeed);
  factors.push(factor("Satellite / Remote-Sensing Signal", satSignal * 15, 15,
    "Simulated water/ground-surface change signal for this locality and date (for demonstration — production would call a Sentinel-1/2 or MODIS flood-extent API)."));

  // 6. River Gauge / Water-Level Signal (10 pts)
  if (FLOOD_RELATED_TYPES.has(reportType)) {
    const warningLevel = 102.5, dangerLevel = 104.0;
    const currentLevel = warningLevel - 1.5 + computeFloodBias(location) * 3.2;
    const proximity = Math.max(0, Math.min(1, (currentLevel - (warningLevel - 2)) / (dangerLevel - (warningLevel - 2))));
    factors.push(factor("River Gauge / Water-Level Signal", proximity * 10, 10,
      `River level ${Math.round(currentLevel * 100) / 100} m vs warning mark ${warningLevel} m / danger mark ${dangerLevel} m.`));
  } else {
    factors.push(factor("River Gauge / Water-Level Signal", 5, 10, "No directly applicable river-gauge reading for this report type."));
  }

  // 7. Active Alert Correlation (5 pts)
  const activeAlert = ALERTS.find((a) => a.location_id === location.id && a.active);
  factors.push(factor("Active Alert Correlation", activeAlert ? 5 : 1.5, 5,
    activeAlert ? `Active advisory found: "${activeAlert.title}".` : "No active advisory currently issued for this locality."));

  // 8. Image Evidence Quality (5 pts)
  factors.push(factor("Image Evidence Quality", imageUrl ? 5 : 1.5, 5,
    imageUrl ? "Photo evidence attached." : "No photo evidence attached — harder to independently confirm."));

  // 9. Location Plausibility (5 pts)
  const geofenceSignal = 0.7 + 0.3 * strHashUnit(`geo:${location.slug}:${reportTimestamp.toISOString()}`);
  factors.push(factor("Location Plausibility", geofenceSignal * 5, 5,
    "Reported coordinates are consistent with the selected locality's boundary (simulated geofence check)."));

  // 10. Report Timing Plausibility (5 pts)
  const month = reportTimestamp.getMonth() + 1;
  let seasonalFit = 0.8;
  if (FLOOD_RELATED_TYPES.has(reportType)) {
    seasonalFit = [7, 8, 9].includes(month) ? 1.0 : [6, 10].includes(month) ? 0.6 : 0.3;
  } else if (reportType === "Heavy Rain") {
    seasonalFit = [6, 7, 8, 9].includes(month) ? 1.0 : 0.4;
  }
  factors.push(factor("Report Timing Plausibility", seasonalFit * 5, 5,
    `Report timestamp falls ${seasonalFit >= 0.8 ? "within" : "outside"} the typical seasonal window for this hazard type.`));

  // 11. Population & Density Consistency (5 pts)
  let densityOk = 1.0;
  if (reportType === "Waterlogging" && location.locality_type === "village" && location.population < 1500) densityOk = 0.7;
  factors.push(factor("Population & Density Consistency", densityOk * 5, 5,
    `Incident type is consistent with a ${location.locality_type} of ~${location.population.toLocaleString("en-IN")} population.`));

  const totalScore = Math.round(factors.reduce((s, f) => s + f.points, 0) * 10) / 10;
  const label = totalScore >= 70 ? "Likely True" : totalScore >= 40 ? "Needs Review" : "Likely False";

  return {
    factors, total_score: totalScore, max_score: 100, label,
    disclaimer: "This is an AI-assisted trust score for human moderators — it never auto-verifies or auto-rejects a report. A district official always makes the final call from the Admin Dashboard.",
  };
}

export let MOCK_REPORTS: CitizenReportT[] = (() => {
  const types = ["Flood", "Waterlogging", "Heavy Rain", "Road Damage", "Drainage Blockage", "Other"];
  const statuses = ["Pending", "Under Review", "Verified", "Resolved"];
  const list: CitizenReportT[] = [];
  for (let i = 0; i < 45; i++) {
    const loc = LOCATIONS[Math.floor(rand() * LOCATIONS.length)];
    const type = types[Math.floor(rand() * types.length)];
    const ts = new Date(Date.now() - randRange(1, 400) * 3600 * 1000);
    const verification = computeVerification({
      location: loc, reportType: type, imageUrl: i % 3 === 0 ? "https://picsum.photos/seed/report" + i + "/400/300" : null,
      reporterUserId: i % 8 === 0 ? 1 : null, reportTimestamp: ts,
    });
    list.push({
      id: i + 1,
      report_code: `MS-2026-${1000 + i}`,
      location_id: loc.id,
      location_name: loc.name,
      type,
      description: `${type} reported near ${loc.name} main road; residents flagged the issue during recent weather.`,
      image_url: i % 3 === 0 ? "https://picsum.photos/seed/report" + i + "/400/300" : null,
      reporter_name: i % 8 === 0 ? "Demo Citizen" : `Local Resident ${i}`,
      timestamp: ts.toISOString(),
      severity: ["Low", "Moderate", "High"][Math.floor(rand() * 3)],
      status: statuses[Math.floor(rand() * statuses.length)],
      verification_score: verification.total_score,
      verification_label: verification.label,
      verification,
    });
  }
  return list;
})();

export function addMockReport(report: {
  location_id: number; location_name?: string; type: string; description: string;
  image_url: string | null; reporter_name: string; severity: string;
}): CitizenReportT {
  const loc = getLocationById(report.location_id)!;
  const ts = new Date();
  const verification = computeVerification({
    location: loc, reportType: report.type, imageUrl: report.image_url,
    reporterUserId: null, reportTimestamp: ts,
  });
  const newReport: CitizenReportT = {
    ...report,
    id: MOCK_REPORTS.length + 1,
    report_code: `MS-2026-${(1000 + MOCK_REPORTS.length).toString().padStart(5, "0")}`,
    timestamp: ts.toISOString(),
    status: "Pending",
    verification_score: verification.total_score,
    verification_label: verification.label,
    verification,
  };
  MOCK_REPORTS = [newReport, ...MOCK_REPORTS];
  return newReport;
}

export function updateMockReportStatus(id: number, status: string) {
  MOCK_REPORTS = MOCK_REPORTS.map((r) => (r.id === id ? { ...r, status } : r));
}

export let MOCK_DATA_SOURCES: DataSourceT[] = [
  { id: 1, name: "IMD Weather API (mock adapter)", category: "weather", status: "ONLINE", last_sync: new Date(Date.now() - 2 * 60000).toISOString(), records_ingested: 12450, data_quality_pct: 98.2 },
  { id: 2, name: "Rainfall Gauge Network", category: "rainfall", status: "ONLINE", last_sync: new Date(Date.now() - 4 * 60000).toISOString(), records_ingested: 8760, data_quality_pct: 97.5 },
  { id: 3, name: "Central Water Commission — River Data", category: "river", status: "ONLINE", last_sync: new Date(Date.now() - 5 * 60000).toISOString(), records_ingested: 4320, data_quality_pct: 96.8 },
  { id: 4, name: "Citizen Reporting Feed", category: "citizen", status: "ONLINE", last_sync: new Date(Date.now() - 1 * 60000).toISOString(), records_ingested: 124, data_quality_pct: 95.1 },
  { id: 5, name: "Satellite Soil Moisture (mock adapter)", category: "satellite", status: "ONLINE", last_sync: new Date(Date.now() - 7 * 60000).toISOString(), records_ingested: 2190, data_quality_pct: 99.0 },
];

export function runMockDataSync(): DataSourceT[] {
  MOCK_DATA_SOURCES = MOCK_DATA_SOURCES.map((s) => ({
    ...s,
    records_ingested: s.records_ingested + Math.round(randRange(15, 120)),
    last_sync: new Date().toISOString(),
    data_quality_pct: Math.round(Math.min(99.9, s.data_quality_pct + randRange(-0.3, 0.4)) * 10) / 10,
    status: "ONLINE",
  }));
  return MOCK_DATA_SOURCES;
}

export function getAdminSummary(): AdminSummaryT {
  return {
    total_reports: MOCK_REPORTS.length,
    active_alerts: ALERTS.filter((a) => a.active).length,
    high_risk_locations: LOCATIONS.filter((l) => (RISK_PROFILE[l.slug] ?? 0) >= 0.4).length,
    data_sources_online: MOCK_DATA_SOURCES.filter((s) => s.status === "ONLINE").length,
  };
}
