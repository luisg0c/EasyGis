import { IndexType, IndexCalculation } from '@/types';

export type { IndexType } from '@/types';

export const SPECTRAL_INDICES: Record<IndexType, IndexCalculation> = {
  NDVI: {
    type: 'NDVI',
    name: 'Normalized Difference Vegetation Index',
    description: 'Measures vegetation health and density',
    formula: '(NIR - Red) / (NIR + Red)',
    range: [-1, 1],
    colorScale: [
      '#8B4513', // Brown - bare soil
      '#DEB887', // Tan - sparse vegetation
      '#FFFF00', // Yellow - moderate vegetation
      '#ADFF2F', // Green yellow
      '#00FF00', // Green - healthy vegetation
      '#006400', // Dark green - very healthy vegetation
    ],
  },
  EVI: {
    type: 'EVI',
    name: 'Enhanced Vegetation Index',
    description: 'Improved vegetation index with atmospheric correction',
    formula: '2.5 * ((NIR - Red) / (NIR + 6 * Red - 7.5 * Blue + 1))',
    range: [-1, 1],
    colorScale: [
      '#8B4513',
      '#DEB887',
      '#FFFF00',
      '#ADFF2F',
      '#00FF00',
      '#006400',
    ],
  },
  SAVI: {
    type: 'SAVI',
    name: 'Soil Adjusted Vegetation Index',
    description: 'Vegetation index that minimizes soil brightness',
    formula: '((NIR - Red) / (NIR + Red + 0.5)) * 1.5',
    range: [-1, 1],
    colorScale: [
      '#8B4513',
      '#DEB887',
      '#FFFF00',
      '#ADFF2F',
      '#00FF00',
      '#006400',
    ],
  },
  NDWI: {
    type: 'NDWI',
    name: 'Normalized Difference Water Index',
    description: 'Measures water content in vegetation and soil moisture',
    formula: '(Green - NIR) / (Green + NIR)',
    range: [-1, 1],
    colorScale: [
      '#8B4513', // Brown - dry
      '#F4A460', // Sandy brown
      '#87CEEB', // Sky blue
      '#4169E1', // Royal blue
      '#0000FF', // Blue - wet
      '#00008B', // Dark blue - water
    ],
  },
  NDBI: {
    type: 'NDBI',
    name: 'Normalized Difference Built-up Index',
    description: 'Identifies built-up and urban areas',
    formula: '(SWIR1 - NIR) / (SWIR1 + NIR)',
    range: [-1, 1],
    colorScale: [
      '#006400', // Dark green - vegetation
      '#90EE90', // Light green
      '#FFFF00', // Yellow
      '#FFA500', // Orange
      '#FF0000', // Red - built-up
      '#8B0000', // Dark red - dense urban
    ],
  },
};

export function getColorForValue(value: number, indexType: IndexType): string {
  const index = SPECTRAL_INDICES[indexType];
  const [min, max] = index.range;
  const normalized = (value - min) / (max - min);
  const clamped = Math.max(0, Math.min(1, normalized));

  const colors = index.colorScale;
  const position = clamped * (colors.length - 1);
  const lowerIndex = Math.floor(position);
  const upperIndex = Math.ceil(position);
  const fraction = position - lowerIndex;

  if (lowerIndex === upperIndex) {
    return colors[lowerIndex];
  }

  // Interpolate between colors
  const lower = hexToRgb(colors[lowerIndex]);
  const upper = hexToRgb(colors[upperIndex]);

  if (!lower || !upper) return colors[lowerIndex];

  const r = Math.round(lower.r + (upper.r - lower.r) * fraction);
  const g = Math.round(lower.g + (upper.g - lower.g) * fraction);
  const b = Math.round(lower.b + (upper.b - lower.b) * fraction);

  return rgbToHex(r, g, b);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

export function calculateNDVI(nir: number, red: number): number {
  if (nir + red === 0) return 0;
  return (nir - red) / (nir + red);
}

export function calculateEVI(nir: number, red: number, blue: number): number {
  const denominator = nir + 6 * red - 7.5 * blue + 1;
  if (denominator === 0) return 0;
  return 2.5 * ((nir - red) / denominator);
}

export function calculateSAVI(nir: number, red: number, L = 0.5): number {
  const denominator = nir + red + L;
  if (denominator === 0) return 0;
  return ((nir - red) / denominator) * (1 + L);
}

export function calculateNDWI(green: number, nir: number): number {
  if (green + nir === 0) return 0;
  return (green - nir) / (green + nir);
}

export function calculateNDBI(swir: number, nir: number): number {
  if (swir + nir === 0) return 0;
  return (swir - nir) / (swir + nir);
}
