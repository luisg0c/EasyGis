export interface KMLCoordinate {
  longitude: number;
  latitude: number;
  altitude?: number;
}

export interface KMLField {
  id: string;
  name: string;
  coordinates: KMLCoordinate[];
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
}

export interface SentinelProduct {
  name: string;
  path: string;
  tile: string;
  date: Date;
  processingLevel: string;
  satellite: string;
}

export interface NDVIData {
  fieldId: string;
  date: Date;
  statistics: {
    min: number;
    max: number;
    mean: number;
    median: number;
    std: number;
  };
  histogram: {
    bins: number[];
    counts: number[];
  };
  imageData?: string; // Base64 encoded image
}

/**
 * Statistics returned by the spectral-index endpoint (NDVI/EVI/SAVI/...).
 * Mirrors `IndexResult.statistics` from `api/main.py`.
 */
export interface SpectralStatistics {
  min: number;
  max: number;
  mean: number;
  median: number;
  std: number;
  count: number;
}

/**
 * Statistics returned by the classification endpoint.
 * Mirrors `ClassificationResult.statistics` from `api/main.py`.
 */
export interface ClassificationStatistics {
  total_area: number;
  classified_area: number;
  unclassified_percentage: number;
}

export interface ElevationData {
  width: number;
  height: number;
  heights: number[];
  min_value: number;
  max_value: number;
}

/**
 * Discriminated union for results that may be rendered as an overlay on the map.
 * The `kind` field selects the proper statistics shape, eliminating the need
 * for `as any` casts on the consumer side.
 */
export type MapOverlayResult =
  | {
      kind: 'spectral';
      statistics: SpectralStatistics;
      histogram: { bins: number[]; counts: number[] };
      image_base64: string;
      product_used: string;
      elevation_data?: ElevationData;
    }
  | {
      kind: 'classification';
      statistics: ClassificationStatistics;
      image_base64: string;
      product_used: string;
    };

export interface Band {
  name: string;
  resolution: string;
  path: string;
  wavelength?: string;
}

export type IndexType =
  | 'NDVI' | 'EVI' | 'SAVI' | 'NDWI' | 'NDBI'
  | 'RGB' | 'FALSE_COLOR'
  | 'B01' | 'B02' | 'B03' | 'B04' | 'B05' | 'B06' | 'B07' | 'B08' | 'B8A' | 'B09' | 'B11' | 'B12';

export interface IndexCalculation {
  type: IndexType;
  name: string;
  description: string;
  formula: string;
  range: [number, number];
  colorScale: string[];
}
