# Remote Sensing Analysis Platform

A modern web application for visualizing and analyzing Sentinel-2 satellite imagery data, with support for calculating vegetation indices like NDVI, EVI, SAVI, NDWI, and NDBI.

## Features

- **Interactive Map Viewer**: View agricultural fields from KML files on an interactive map
- **Multiple Base Layers**: Switch between street maps and satellite imagery
- **Spectral Indices**: Calculate and visualize various vegetation and land indices:
  - NDVI (Normalized Difference Vegetation Index)
  - EVI (Enhanced Vegetation Index)
  - SAVI (Soil Adjusted Vegetation Index)
  - NDWI (Normalized Difference Water Index)
  - NDBI (Normalized Difference Built-up Index)
- **Field Management**: Select and analyze individual agricultural fields
- **Real-time Updates**: Dynamic updates based on user selections

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **Mapping**: Leaflet + React Leaflet
- **Data Processing**: Fast-XML-Parser for KML parsing

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Sentinel-2 data in SAFE format (Level-2A)
- KML files defining agricultural field boundaries

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
web/
├── app/
│   ├── api/
│   │   └── fields/          # API route for KML field data
│   ├── globals.css          # Global styles including Leaflet customization
│   └── page.tsx             # Main application page
├── components/
│   ├── ui/                  # shadcn/ui components
│   ├── map-viewer.tsx       # Leaflet map component
│   └── index-legend.tsx     # Spectral index legend component
├── lib/
│   ├── kml-parser.ts        # KML file parser utility
│   ├── spectral-indices.ts  # Spectral index calculations
│   └── utils.ts             # General utilities
└── types/
    └── index.ts             # TypeScript type definitions
```

## Data Requirements

### KML Fields
Place your KML field boundary files in:
```
../data/KML Fields/
```

Each KML file should contain polygon coordinates defining agricultural field boundaries.

### Sentinel-2 Data
Place Sentinel-2 SAFE products in:
```
../data/products/
```

The application expects Level-2A (atmospherically corrected) products with the standard SAFE structure.

## API Endpoints

### GET /api/fields
Returns a list of all agricultural fields from KML files.

**Response:**
```json
{
  "fields": [
    {
      "id": "field-id",
      "name": "Field Name",
      "coordinates": [...],
      "bounds": { "north": 0, "south": 0, "east": 0, "west": 0 },
      "fileName": "file.kml",
      "area": 123.45,
      "center": [-4.879, -42.617]
    }
  ]
}
```

## Spectral Indices

### NDVI (Normalized Difference Vegetation Index)
- **Formula**: (NIR - Red) / (NIR + Red)
- **Range**: -1 to 1
- **Use**: Measures vegetation health and density
- **Bands**: B08 (NIR), B04 (Red)

### EVI (Enhanced Vegetation Index)
- **Formula**: 2.5 * ((NIR - Red) / (NIR + 6 * Red - 7.5 * Blue + 1))
- **Range**: -1 to 1
- **Use**: Improved vegetation index with atmospheric correction
- **Bands**: B08 (NIR), B04 (Red), B02 (Blue)

### SAVI (Soil Adjusted Vegetation Index)
- **Formula**: ((NIR - Red) / (NIR + Red + 0.5)) * 1.5
- **Range**: -1 to 1
- **Use**: Minimizes soil brightness influence
- **Bands**: B08 (NIR), B04 (Red)

### NDWI (Normalized Difference Water Index)
- **Formula**: (Green - NIR) / (Green + NIR)
- **Range**: -1 to 1
- **Use**: Measures water content in vegetation
- **Bands**: B03 (Green), B08 (NIR)

### NDBI (Normalized Difference Built-up Index)
- **Formula**: (SWIR1 - NIR) / (SWIR1 + NIR)
- **Range**: -1 to 1
- **Use**: Identifies built-up and urban areas
- **Bands**: B11 (SWIR1), B08 (NIR)

## Development

### Building for Production
```bash
npm run build
```

### Running Production Build
```bash
npm run start
```

### Linting
```bash
npm run lint
```

## Future Enhancements

- [ ] Backend integration with Python for GDAL-based raster processing
- [ ] Real NDVI calculation from Sentinel-2 JP2 files
- [ ] Time series analysis and comparison
- [ ] Export functionality for calculated indices
- [ ] Multi-temporal change detection
- [ ] Cloud masking and quality filtering
- [ ] Integration with Sentinel Hub or Google Earth Engine

## License

This project is part of the ICEV Remote Sensing Software educational initiative.
