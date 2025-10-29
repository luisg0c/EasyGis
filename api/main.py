"""
FastAPI Backend for Remote Sensing Analysis
Provides endpoints for calculating spectral indices from Sentinel-2 data
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from pathlib import Path
import base64
import io
import numpy as np
from PIL import Image
from shapely.geometry import Polygon

from api.sentinel_processor import SentinelProcessor

app = FastAPI(
    title="Remote Sensing API",
    description="API for processing Sentinel-2 imagery and calculating spectral indices",
    version="0.1.0"
)

# Configure CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Path to Sentinel-2 products
PRODUCTS_DIR = Path(__file__).parent.parent / "data" / "products"


class Coordinate(BaseModel):
    longitude: float
    latitude: float


class CalculateIndexRequest(BaseModel):
    field_id: str
    coordinates: List[Coordinate]
    index_type: str  # 'NDVI', 'EVI', 'SAVI', 'NDWI', 'NDBI', 'RGB', 'FALSE_COLOR', 'B01'-'B12'
    product_name: Optional[str] = None  # If None, uses most recent


class IndexResult(BaseModel):
    field_id: str
    index_type: str
    statistics: dict
    histogram: dict
    image_base64: str
    product_used: str


def find_sentinel_product(product_name: Optional[str] = None) -> Path:
    """Find Sentinel-2 product directory"""
    if product_name:
        product_path = PRODUCTS_DIR / product_name
        if not product_path.exists():
            raise HTTPException(status_code=404, detail=f"Product {product_name} not found")
        return product_path

    # Find most recent product
    products = list(PRODUCTS_DIR.glob("S2*_MSIL2A_*.SAFE"))
    if not products:
        raise HTTPException(status_code=404, detail="No Sentinel-2 products found")

    # Sort by date in filename
    products.sort(reverse=True)
    return products[0]


def coordinates_to_polygon(coordinates: List[Coordinate]) -> Polygon:
    """Convert coordinate list to Shapely Polygon"""
    coords = [(c.longitude, c.latitude) for c in coordinates]
    return Polygon(coords)


def single_band_to_image(band_data: np.ndarray, band_name: str = 'Band') -> str:
    """
    Convert single band to grayscale image with transparency

    Args:
        band_data: Band array (with NaN for no-data areas)
        band_name: Name of the band

    Returns:
        Base64 encoded PNG image with alpha channel
    """
    height, width = band_data.shape

    # Create mask for valid data
    valid_mask = ~np.isnan(band_data) & (band_data != 0)

    # Normalize to 0-255 range
    valid_data = band_data[valid_mask]
    if len(valid_data) > 0:
        vmin, vmax = np.percentile(valid_data, [2, 98])  # Stretch contrast
        normalized = np.zeros_like(band_data, dtype=np.float32)
        normalized[valid_mask] = np.clip((band_data[valid_mask] - vmin) / (vmax - vmin) * 255, 0, 255)
    else:
        normalized = np.zeros_like(band_data, dtype=np.float32)

    # Create RGBA image
    colored = np.zeros((height, width, 4), dtype=np.uint8)

    for i in range(height):
        for j in range(width):
            if valid_mask[i, j]:
                val = int(normalized[i, j])
                colored[i, j] = [val, val, val, 255]  # Grayscale
            else:
                colored[i, j] = [0, 0, 0, 0]  # Transparent

    img = Image.fromarray(colored, mode='RGBA')
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    return base64.b64encode(buffer.read()).decode('utf-8')


def rgb_composite_to_image(red: np.ndarray, green: np.ndarray, blue: np.ndarray) -> str:
    """
    Create RGB composite image with transparency

    Args:
        red, green, blue: Band arrays

    Returns:
        Base64 encoded PNG image
    """
    height, width = red.shape

    # Create mask for valid data
    valid_mask = ~np.isnan(red) & ~np.isnan(green) & ~np.isnan(blue) & \
                 (red != 0) & (green != 0) & (blue != 0)

    # Normalize each band
    def normalize_band(band):
        norm = np.zeros_like(band, dtype=np.float32)
        if np.any(valid_mask):
            valid_data = band[valid_mask]
            vmin, vmax = np.percentile(valid_data, [2, 98])
            norm[valid_mask] = np.clip((band[valid_mask] - vmin) / (vmax - vmin) * 255, 0, 255)
        return norm

    r_norm = normalize_band(red)
    g_norm = normalize_band(green)
    b_norm = normalize_band(blue)

    # Create RGBA image
    colored = np.zeros((height, width, 4), dtype=np.uint8)

    for i in range(height):
        for j in range(width):
            if valid_mask[i, j]:
                colored[i, j] = [
                    int(r_norm[i, j]),
                    int(g_norm[i, j]),
                    int(b_norm[i, j]),
                    255
                ]
            else:
                colored[i, j] = [0, 0, 0, 0]

    img = Image.fromarray(colored, mode='RGBA')
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    return base64.b64encode(buffer.read()).decode('utf-8')


def ndvi_to_image(ndvi: np.ndarray, colormap: str = 'RdYlGn') -> str:
    """
    Convert NDVI array to colored image with transparency and encode as base64

    Args:
        ndvi: NDVI array (with NaN for no-data areas)
        colormap: Matplotlib colormap name

    Returns:
        Base64 encoded PNG image with alpha channel
    """
    height, width = ndvi.shape

    # Create mask for valid data (non-NaN and non-zero)
    valid_mask = ~np.isnan(ndvi) & (ndvi != 0)

    # Normalize NDVI to 0-255 range
    ndvi_normalized = np.zeros_like(ndvi, dtype=np.float32)
    ndvi_normalized[valid_mask] = (ndvi[valid_mask] + 1) / 2 * 255
    ndvi_normalized = ndvi_normalized.astype(np.uint8)

    # Create RGBA image (with alpha channel for transparency)
    colored = np.zeros((height, width, 4), dtype=np.uint8)

    # Simple green-yellow-red gradient for valid pixels
    for i in range(height):
        for j in range(width):
            if valid_mask[i, j]:
                val = ndvi_normalized[i, j]
                if val < 85:  # Low NDVI - brown/red
                    colored[i, j] = [min(139 + val, 255), 69, 19, 255]
                elif val < 170:  # Medium NDVI - yellow/green
                    colored[i, j] = [max(255 - val, 0), 255, 0, 255]
                else:  # High NDVI - green
                    colored[i, j] = [0, val, 0, 255]
            else:
                # Transparent for invalid pixels
                colored[i, j] = [0, 0, 0, 0]

    # Convert to PIL Image with alpha channel
    img = Image.fromarray(colored, mode='RGBA')

    # Encode as base64 PNG
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    img_base64 = base64.b64encode(buffer.read()).decode('utf-8')

    return img_base64


@app.get("/")
def read_root():
    return {
        "message": "Remote Sensing API",
        "version": "0.1.0",
        "endpoints": [
            "/products",
            "/calculate-index",
        ]
    }


@app.get("/products")
def list_products():
    """List available Sentinel-2 products"""
    products = list(PRODUCTS_DIR.glob("S2*_MSIL2A_*.SAFE"))

    return {
        "products": [
            {
                "name": p.name,
                "path": str(p),
                "tile": p.name.split('_')[5] if len(p.name.split('_')) > 5 else "Unknown"
            }
            for p in products
        ],
        "count": len(products)
    }


@app.post("/calculate-index", response_model=IndexResult)
def calculate_index(request: CalculateIndexRequest):
    """
    Calculate spectral index for a field

    Args:
        request: CalculateIndexRequest with field geometry and index type

    Returns:
        IndexResult with statistics, histogram, and visualization
    """
    try:
        # Find Sentinel-2 product
        product_path = find_sentinel_product(request.product_name)
        processor = SentinelProcessor(str(product_path))

        # Convert coordinates to polygon
        geometry = coordinates_to_polygon(request.coordinates)

        # Read required bands based on index type
        if request.index_type == 'NDVI':
            # Read NIR (B08) and Red (B04) at 10m resolution
            nir_data, nir_meta = processor.read_band('B08', '10m')
            red_data, red_meta = processor.read_band('B04', '10m')

            # Crop to field geometry
            nir_cropped, _ = processor.crop_to_geometry(nir_data, nir_meta, geometry)
            red_cropped, _ = processor.crop_to_geometry(red_data, red_meta, geometry)

            # Calculate NDVI
            index_data = processor.calculate_ndvi(nir_cropped, red_cropped)

        elif request.index_type == 'EVI':
            # Read NIR, Red, Blue
            nir_data, nir_meta = processor.read_band('B08', '10m')
            red_data, red_meta = processor.read_band('B04', '10m')
            blue_data, blue_meta = processor.read_band('B02', '10m')

            nir_cropped, _ = processor.crop_to_geometry(nir_data, nir_meta, geometry)
            red_cropped, _ = processor.crop_to_geometry(red_data, red_meta, geometry)
            blue_cropped, _ = processor.crop_to_geometry(blue_data, blue_meta, geometry)

            index_data = processor.calculate_evi(nir_cropped, red_cropped, blue_cropped)

        elif request.index_type == 'RGB':
            # True Color RGB (B04-Red, B03-Green, B02-Blue)
            red_data, red_meta = processor.read_band('B04', '10m')
            green_data, green_meta = processor.read_band('B03', '10m')
            blue_data, blue_meta = processor.read_band('B02', '10m')

            red_cropped, _ = processor.crop_to_geometry(red_data, red_meta, geometry)
            green_cropped, _ = processor.crop_to_geometry(green_data, green_meta, geometry)
            blue_cropped, _ = processor.crop_to_geometry(blue_data, blue_meta, geometry)

            # Generate RGB composite
            image_base64 = rgb_composite_to_image(red_cropped, green_cropped, blue_cropped)
            statistics = processor.calculate_statistics(red_cropped)  # Use red for stats
            bin_edges, counts = processor.calculate_histogram(red_cropped)

            return IndexResult(
                field_id=request.field_id,
                index_type=request.index_type,
                statistics=statistics,
                histogram={'bins': bin_edges, 'counts': counts},
                image_base64=image_base64,
                product_used=product_path.name
            )

        elif request.index_type == 'FALSE_COLOR':
            # False Color (B08-NIR, B04-Red, B03-Green)
            nir_data, nir_meta = processor.read_band('B08', '10m')
            red_data, red_meta = processor.read_band('B04', '10m')
            green_data, green_meta = processor.read_band('B03', '10m')

            nir_cropped, _ = processor.crop_to_geometry(nir_data, nir_meta, geometry)
            red_cropped, _ = processor.crop_to_geometry(red_data, red_meta, geometry)
            green_cropped, _ = processor.crop_to_geometry(green_data, green_meta, geometry)

            image_base64 = rgb_composite_to_image(nir_cropped, red_cropped, green_cropped)
            statistics = processor.calculate_statistics(nir_cropped)
            bin_edges, counts = processor.calculate_histogram(nir_cropped)

            return IndexResult(
                field_id=request.field_id,
                index_type=request.index_type,
                statistics=statistics,
                histogram={'bins': bin_edges, 'counts': counts},
                image_base64=image_base64,
                product_used=product_path.name
            )

        elif request.index_type.startswith('B') and len(request.index_type) in [3, 4]:
            # Single band visualization (B01, B02, ..., B12, B8A)
            band_name = request.index_type

            # Determine resolution based on band
            if band_name in ['B02', 'B03', 'B04', 'B08']:
                resolution = '10m'
            elif band_name in ['B05', 'B06', 'B07', 'B8A', 'B11', 'B12']:
                resolution = '20m'
            else:
                resolution = '60m'

            band_data, band_meta = processor.read_band(band_name, resolution)
            band_cropped, _ = processor.crop_to_geometry(band_data, band_meta, geometry)

            image_base64 = single_band_to_image(band_cropped, band_name)
            statistics = processor.calculate_statistics(band_cropped)
            bin_edges, counts = processor.calculate_histogram(band_cropped)

            return IndexResult(
                field_id=request.field_id,
                index_type=request.index_type,
                statistics=statistics,
                histogram={'bins': bin_edges, 'counts': counts},
                image_base64=image_base64,
                product_used=product_path.name
            )

        else:
            raise HTTPException(
                status_code=400,
                detail=f"Index type {request.index_type} not yet implemented"
            )

        # Calculate statistics
        statistics = processor.calculate_statistics(index_data)

        # Calculate histogram
        bin_edges, counts = processor.calculate_histogram(index_data)
        histogram = {
            'bins': bin_edges,
            'counts': counts
        }

        # Generate visualization
        image_base64 = ndvi_to_image(index_data)

        return IndexResult(
            field_id=request.field_id,
            index_type=request.index_type,
            statistics=statistics,
            histogram=histogram,
            image_base64=image_base64,
            product_used=product_path.name
        )

    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processing error: {str(e)}")


@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "products_dir": str(PRODUCTS_DIR.exists())}
