import { XMLParser } from 'fast-xml-parser';
import { KMLField, KMLCoordinate } from '@/types';

export class KMLParser {
  private parser: XMLParser;

  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
    });
  }

  parseKMLFile(kmlContent: string): KMLField | null {
    try {
      const parsed = this.parser.parse(kmlContent);
      const placemark = parsed.kml?.Document?.Placemark;

      if (!placemark) {
        return null;
      }

      const coordinatesString = placemark.Polygon?.outerBoundaryIs?.LinearRing?.coordinates;
      if (!coordinatesString) {
        return null;
      }

      const coordinates = this.parseCoordinates(coordinatesString);
      const bounds = this.calculateBounds(coordinates);

      return {
        id: placemark['@_id'] || '',
        name: placemark.name || 'Unnamed Field',
        coordinates,
        bounds,
      };
    } catch (error) {
      console.error('Error parsing KML:', error);
      return null;
    }
  }

  private parseCoordinates(coordinatesString: string): KMLCoordinate[] {
    return coordinatesString
      .trim()
      .split(' ')
      .filter((coord) => coord.length > 0)
      .map((coord) => {
        const [longitude, latitude, altitude] = coord.split(',').map(Number);
        return { longitude, latitude, altitude: altitude || 0 };
      });
  }

  private calculateBounds(coordinates: KMLCoordinate[]) {
    const lats = coordinates.map((c) => c.latitude);
    const lons = coordinates.map((c) => c.longitude);

    return {
      north: Math.max(...lats),
      south: Math.min(...lats),
      east: Math.max(...lons),
      west: Math.min(...lons),
    };
  }

  getCenter(field: KMLField): [number, number] {
    const { bounds } = field;
    return [
      (bounds.north + bounds.south) / 2,
      (bounds.east + bounds.west) / 2,
    ];
  }

  calculateArea(field: KMLField): number {
    // Simplified area calculation using the shoelace formula
    const coords = field.coordinates;
    let area = 0;

    for (let i = 0; i < coords.length - 1; i++) {
      area += coords[i].longitude * coords[i + 1].latitude;
      area -= coords[i + 1].longitude * coords[i].latitude;
    }

    area = Math.abs(area) / 2;

    // Convert to approximate hectares (rough estimation)
    const hectares = area * 12321; // Approximate conversion for lat/lon to hectares
    return hectares;
  }
}

export const kmlParser = new KMLParser();
