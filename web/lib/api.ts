/**
 * Camada de API — wraps client-side mocks ou backend real.
 *
 * Para a demo P2 todos os endpoints usam mocks gerados via Canvas API
 * (PNG base64) + estatísticas plausíveis. Trocar `MOCK_MODE` para `false`
 * faz o módulo passar a chamar o FastAPI em :8001.
 *
 * Os mocks NÃO substituem os dados reais — são apoio visual de apresentação.
 * Os 28 testes pytest do backend continuam validando o cálculo real.
 */
import type { SpectralStatistics, ElevationData } from "@/types";
import { translateError } from "@/lib/utils";

const MOCK_MODE = true;
const API_BASE = "http://localhost:8001";

const FAKE_PRODUCT = "S2A_MSIL2A_20260509T123456_DEMO_T23LMH_20260509T172223.SAFE";

// ── Tipos de payload e resposta ──────────────────────────────────────────

interface Coordinate {
  longitude: number;
  latitude: number;
}

export interface CalculateIndexPayload {
  field_id: string;
  coordinates: Coordinate[];
  index_type: string;
  smooth: boolean;
}

export interface IndexResultData {
  field_id: string;
  index_type: string;
  statistics: SpectralStatistics;
  histogram: { bins: number[]; counts: number[] };
  image_base64: string;
  product_used: string;
  elevation_data?: ElevationData;
}

export interface ExperimentPayload {
  field_id: string;
  coordinates: Coordinate[];
  experiment_type: string;
  parameters: Record<string, number>;
}

export interface ExperimentResultData {
  field_id: string;
  experiment_type: string;
  parameters: Record<string, number>;
  image_base64: string;
  statistics: Record<string, number | string>;
  timestamp: string;
  product_used: string;
}

export interface ClassifyPayload {
  field_id: string;
  coordinates: Coordinate[];
  method: "supervised" | "unsupervised" | "threshold";
  crop_type?: string;
  n_classes: number;
  indices: { ndvi: boolean; evi: boolean; savi: boolean };
}

export interface ClassificationResultData {
  field_id: string;
  classification_type: string;
  classes: { name: string; color: string; percentage: number; area_hectares: number }[];
  image_base64: string;
  statistics: { total_area: number; classified_area: number; unclassified_percentage: number };
  timestamp: string;
  product_used: string;
}

// ── Paletas por índice (espelham web/lib/spectral-indices.ts) ───────────

const PALETTES: Record<string, string[]> = {
  NDVI: ["#8B4513", "#DEB887", "#FFFF00", "#ADFF2F", "#00FF00", "#006400"],
  EVI: ["#8B4513", "#DEB887", "#FFFF00", "#ADFF2F", "#00FF00", "#006400"],
  SAVI: ["#8B4513", "#DEB887", "#FFFF00", "#ADFF2F", "#00FF00", "#006400"],
  NDWI: ["#8B4513", "#F4A460", "#87CEEB", "#4169E1", "#0000FF", "#00008B"],
  NDBI: ["#006400", "#90EE90", "#FFFF00", "#FFA500", "#FF0000", "#8B0000"],
  RGB: ["#3D2A14", "#7A5A36", "#A07A50", "#C4A574", "#E8D8A8"],
  FALSE_COLOR: ["#1A0A0A", "#8B1F1F", "#E5474C", "#FFB347", "#FFE66D"],
};

const GRAYSCALE: string[] = ["#0A0A0A", "#404040", "#808080", "#C0C0C0", "#F5F5F5"];

function getPalette(indexType: string): string[] {
  if (PALETTES[indexType]) return PALETTES[indexType];
  // Bandas individuais (B01, B02, ..., B12, B8A) → grayscale
  if (indexType.startsWith("B")) return GRAYSCALE;
  return PALETTES.NDVI;
}

function getIndexRange(indexType: string): [number, number] {
  if (["NDVI", "EVI", "SAVI", "NDWI", "NDBI"].includes(indexType)) return [-1, 1];
  return [0, 10000];
}

// ── Utils de cor ─────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return [0, 0, 0];
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}

function sampleGradient(palette: string[], t: number): [number, number, number] {
  const clamped = Math.max(0, Math.min(1, t));
  const idx = clamped * (palette.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.min(palette.length - 1, lo + 1);
  const frac = idx - lo;
  const [r1, g1, b1] = hexToRgb(palette[lo]);
  const [r2, g2, b2] = hexToRgb(palette[hi]);
  return [
    Math.round(r1 + (r2 - r1) * frac),
    Math.round(g1 + (g2 - g1) * frac),
    Math.round(b1 + (b2 - b1) * frac),
  ];
}

// ── Pseudo-noise determinístico (combinação de senos) ───────────────────

function seedFromString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function pseudoNoise(x: number, y: number, seed: number): number {
  const s = (seed % 100) / 100;
  return (
    Math.sin(x * 0.04 + s * 7) * 0.45 +
    Math.cos(y * 0.06 - s * 5) * 0.35 +
    Math.sin((x + y) * 0.025 + s * 3) * 0.20 +
    Math.cos(x * 0.13 + y * 0.09 + s) * 0.10
  );
}

// ── Point-in-polygon (ray casting) ──────────────────────────────────────
// O Leaflet posiciona o overlay sobre o BBOX retangular do polígono. Então
// pra que o mock fique no formato exato do talhão (não num círculo), cada
// pixel é convertido pra coordenadas geográficas e testado contra o polígono.

function computeBbox(coords: Coordinate[]) {
  let minLon = Infinity;
  let maxLon = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;
  for (const c of coords) {
    if (c.longitude < minLon) minLon = c.longitude;
    if (c.longitude > maxLon) maxLon = c.longitude;
    if (c.latitude < minLat) minLat = c.latitude;
    if (c.latitude > maxLat) maxLat = c.latitude;
  }
  return { minLon, maxLon, minLat, maxLat };
}

function pointInPolygon(lon: number, lat: number, polygon: Coordinate[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].longitude;
    const yi = polygon[i].latitude;
    const xj = polygon[j].longitude;
    const yj = polygon[j].latitude;
    const intersect =
      yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi || 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

// ── Geração da textura do talhão ────────────────────────────────────────

interface MockField {
  imageBase64: string;
  values: number[];
  width: number;
  height: number;
  heights: number[];
}

function biasForIndex(indexType: string, t: number): number {
  // Mantém o range visual coerente: índices de vegetação biased para "saudável"
  if (["NDVI", "EVI", "SAVI"].includes(indexType)) {
    return 0.55 + (t - 0.5) * 0.6; // ~ [0.25, 0.85]
  }
  if (indexType === "NDWI") {
    return 0.40 + (t - 0.5) * 0.6;
  }
  if (indexType === "NDBI") {
    return 0.30 + (t - 0.5) * 0.5; // pouco urbano (talhão agrícola)
  }
  if (indexType === "RGB" || indexType === "FALSE_COLOR") {
    return 0.50 + (t - 0.5) * 0.7;
  }
  // Bandas individuais
  return 0.45 + (t - 0.5) * 0.7;
}

function generateMockField(
  indexType: string,
  seed: string,
  coordinates: Coordinate[]
): MockField {
  if (typeof document === "undefined") {
    throw new Error("Mock API só funciona no browser (precisa de Canvas).");
  }

  const width = 240;
  const height = 240;
  const seedNum = seedFromString(seed + indexType);
  const { minLon, maxLon, minLat, maxLat } = computeBbox(coordinates);
  const lonSpan = maxLon - minLon || 1e-9;
  const latSpan = maxLat - minLat || 1e-9;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Falha ao obter contexto 2D.");

  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;
  const palette = getPalette(indexType);
  const [vmin, vmax] = getIndexRange(indexType);

  const values: number[] = [];
  const heights: number[] = [];

  for (let py = 0; py < height; py++) {
    // Y do canvas vai de cima→baixo, mas latitude vai de sul→norte:
    // py=0 corresponde a maxLat (norte); py=height-1 a minLat (sul).
    const lat = maxLat - (py / (height - 1)) * latSpan;
    for (let px = 0; px < width; px++) {
      const idx = (py * width + px) * 4;
      const lon = minLon + (px / (width - 1)) * lonSpan;

      if (!pointInPolygon(lon, lat, coordinates)) {
        // Fora do polígono — transparente
        data[idx] = 0;
        data[idx + 1] = 0;
        data[idx + 2] = 0;
        data[idx + 3] = 0;
        heights.push(0);
        continue;
      }

      const noise = pseudoNoise(px, py, seedNum);
      const tRaw = (noise + 1) / 2;
      const t = Math.max(0, Math.min(1, biasForIndex(indexType, tRaw)));

      const value = vmin + (vmax - vmin) * t;
      values.push(value);
      heights.push(t);

      const [r, g, b] = sampleGradient(palette, t);
      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  const dataUrl = canvas.toDataURL("image/png");
  return {
    imageBase64: dataUrl.replace(/^data:image\/png;base64,/, ""),
    values,
    width,
    height,
    heights,
  };
}

// ── Estatísticas e histograma ───────────────────────────────────────────

function calcStats(values: number[]): SpectralStatistics {
  if (values.length === 0) {
    return { min: 0, max: 0, mean: 0, median: 0, std: 0, count: 0 };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const median = sorted[Math.floor(sorted.length / 2)];
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return {
    min,
    max,
    mean,
    median,
    std: Math.sqrt(variance),
    count: values.length,
  };
}

function calcHistogram(values: number[], bins = 50): { bins: number[]; counts: number[] } {
  if (values.length === 0) return { bins: [], counts: [] };
  const min = Math.min(...values);
  const max = Math.max(...values);
  const step = (max - min) / bins || 1;
  const counts = new Array<number>(bins).fill(0);
  for (const v of values) {
    const b = Math.min(bins - 1, Math.max(0, Math.floor((v - min) / step)));
    counts[b]++;
  }
  const binEdges = Array.from({ length: bins }, (_, i) => min + i * step);
  return { bins: binEdges, counts };
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// ── Mocks dos endpoints ──────────────────────────────────────────────────

async function mockCalculateIndex(payload: CalculateIndexPayload): Promise<IndexResultData> {
  await sleep(900);
  const field = generateMockField(payload.index_type, payload.field_id, payload.coordinates);
  const statistics = calcStats(field.values);
  const histogram = calcHistogram(field.values);

  return {
    field_id: payload.field_id,
    index_type: payload.index_type,
    statistics,
    histogram,
    image_base64: field.imageBase64,
    product_used: FAKE_PRODUCT,
    elevation_data: {
      width: field.width,
      height: field.height,
      heights: field.heights,
      min_value: statistics.min,
      max_value: statistics.max,
    },
  };
}

async function mockRunExperiment(payload: ExperimentPayload): Promise<ExperimentResultData> {
  await sleep(1100);
  // Para experimentos, geramos uma textura "processada" usando NDVI como base
  // mas com paletas diferentes pra cada categoria.
  const expCategory = payload.experiment_type.split("_")[0];
  const indexProxy =
    expCategory === "morphology" || expCategory === "threshold"
      ? "NDVI"
      : expCategory === "sobel" || expCategory === "canny" || expCategory === "laplacian"
      ? "B08" // edge detection → grayscale
      : "EVI"; // filters

  const field = generateMockField(
    indexProxy,
    payload.field_id + payload.experiment_type,
    payload.coordinates
  );
  const stats = calcStats(field.values);

  return {
    field_id: payload.field_id,
    experiment_type: payload.experiment_type,
    parameters: payload.parameters,
    image_base64: field.imageBase64,
    statistics: {
      ...stats,
      filter: payload.experiment_type,
    },
    timestamp: new Date().toISOString(),
    product_used: FAKE_PRODUCT,
  };
}

async function mockClassify(payload: ClassifyPayload): Promise<ClassificationResultData> {
  await sleep(1300);

  // Define classes baseadas no método
  let classNames: string[];
  let classColors: string[];
  let nClasses: number;

  if (payload.method === "threshold") {
    classNames = ["Baixo Vigor", "Médio Vigor", "Alto Vigor"];
    classColors = ["#C66E47", "#DDA853", "#2C7A4B"];
    nClasses = 3;
  } else if (payload.method === "unsupervised") {
    nClasses = Math.max(2, Math.min(6, payload.n_classes));
    const fullPalette = ["#2C7A4B", "#DDA853", "#3F6F58", "#C66E47", "#6B9080", "#8B6F47"];
    classColors = fullPalette.slice(0, nClasses);
    classNames = Array.from({ length: nClasses }, (_, i) => `Classe ${i + 1}`);
  } else {
    // supervised
    const cropMap: Record<string, [string, string]> = {
      soja: ["Soja", "#2C7A4B"],
      milho: ["Milho", "#DDA853"],
      cafe: ["Café", "#6B4F3A"],
      cana: ["Cana", "#A7C957"],
      multi: ["Cultura mista", "#3F6F58"],
    };
    const [cropName, cropColor] = cropMap[payload.crop_type ?? "multi"] ?? cropMap.multi;
    classNames = ["Solo / Não-cultura", cropName];
    classColors = ["#8B6F47", cropColor];
    nClasses = 2;
  }

  // Render: cada pixel é um ponto geográfico testado contra o polígono real.
  const width = 240;
  const height = 240;
  const seedNum = seedFromString(payload.field_id + payload.method);
  const { minLon, maxLon, minLat, maxLat } = computeBbox(payload.coordinates);
  const lonSpan = maxLon - minLon || 1e-9;
  const latSpan = maxLat - minLat || 1e-9;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Falha ao obter contexto 2D.");

  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;
  const classCounts = new Array<number>(nClasses).fill(0);

  for (let py = 0; py < height; py++) {
    const lat = maxLat - (py / (height - 1)) * latSpan;
    for (let px = 0; px < width; px++) {
      const idx = (py * width + px) * 4;
      const lon = minLon + (px / (width - 1)) * lonSpan;

      if (!pointInPolygon(lon, lat, payload.coordinates)) {
        data[idx] = 0;
        data[idx + 1] = 0;
        data[idx + 2] = 0;
        data[idx + 3] = 0;
        continue;
      }

      const noise = pseudoNoise(px, py, seedNum);
      const t = (noise + 1) / 2; // [0, 1]
      const classIdx = Math.min(nClasses - 1, Math.floor(t * nClasses));
      classCounts[classIdx]++;

      const [r, g, b] = hexToRgb(classColors[classIdx]);
      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  const imageBase64 = canvas.toDataURL("image/png").replace(/^data:image\/png;base64,/, "");

  // Cada pixel ≈ 100 m² (10×10 m do Sentinel-2) → 0,01 ha
  const PIXEL_AREA_HA = 0.01;
  const totalClassified = classCounts.reduce((s, c) => s + c, 0);
  const totalArea = totalClassified * PIXEL_AREA_HA;

  const classes = classNames.map((name, i) => ({
    name,
    color: classColors[i],
    percentage: totalClassified === 0 ? 0 : (classCounts[i] / totalClassified) * 100,
    area_hectares: classCounts[i] * PIXEL_AREA_HA,
  }));

  return {
    field_id: payload.field_id,
    classification_type: payload.method,
    classes,
    image_base64: imageBase64,
    statistics: {
      total_area: totalArea,
      classified_area: totalArea,
      unclassified_percentage: 0,
    },
    timestamp: new Date().toISOString(),
    product_used: FAKE_PRODUCT,
  };
}

// ── Wrappers públicos (escolhem mock ou backend real) ───────────────────

export async function calculateIndex(payload: CalculateIndexPayload): Promise<IndexResultData> {
  if (MOCK_MODE) return mockCalculateIndex(payload);
  const response = await fetch(`${API_BASE}/calculate-index`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(translateError(data.detail) || "Falha ao calcular índice");
  }
  return response.json();
}

export async function runExperiment(payload: ExperimentPayload): Promise<ExperimentResultData> {
  if (MOCK_MODE) return mockRunExperiment(payload);
  const response = await fetch(`${API_BASE}/api/experiments/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(translateError(data.detail) || "Experimento falhou");
  }
  return response.json();
}

export async function classify(payload: ClassifyPayload): Promise<ClassificationResultData> {
  if (MOCK_MODE) return mockClassify(payload);
  const response = await fetch(`${API_BASE}/api/classification/classify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(translateError(data.detail) || "Falha na classificação");
  }
  return response.json();
}

export { MOCK_MODE };
