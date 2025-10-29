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
    index_type: str  # 'NDVI', 'EVI', 'SAVI', 'NDWI', 'NDBI'
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
