export interface KMLCoordinate {
  longitude: number;
  latitude: number;
  altitude: number;
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

export interface Band {
  name: string;
  resolution: string;
  path: string;
  wavelength?: string;
}

export type IndexType = 'NDVI' | 'EVI' | 'SAVI' | 'NDWI' | 'NDBI';

export interface IndexCalculation {
  type: IndexType;
  name: string;
  description: string;
  formula: string;
  range: [number, number];
  colorScale: string[];
}
