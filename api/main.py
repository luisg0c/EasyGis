"""
FastAPI Backend for Remote Sensing Analysis
Provides endpoints for calculating spectral indices from Sentinel-2 data
"""
import logging
import re
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator
from typing import List, Literal, Optional
from pathlib import Path
import base64
import io
import numpy as np
from PIL import Image
from shapely.geometry import Polygon
from scipy.ndimage import gaussian_filter

from api.sentinel_processor import SentinelProcessor

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")

# Sentinel-2 Level-2A product naming convention.
# Example: S2A_MSIL2A_20240115T123456_N0510_R102_T23LMH_20240115T172223.SAFE
SAFE_PRODUCT_PATTERN = re.compile(r"^S2[AB]_MSIL2A_[A-Za-z0-9_]+\.SAFE$")

app = FastAPI(
    title="Remote Sensing API",
    description="API for processing Sentinel-2 imagery and calculating spectral indices",
    version="0.1.0"
)

# Configure CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Path to Sentinel-2 products
PRODUCTS_DIR = Path(__file__).parent.parent / "data" / "products"


class Coordinate(BaseModel):
    longitude: float = Field(..., ge=-180.0, le=180.0)
    latitude: float = Field(..., ge=-90.0, le=90.0)


class CalculateIndexRequest(BaseModel):
    field_id: str = Field(..., min_length=1, max_length=200)
    coordinates: List[Coordinate] = Field(..., min_length=3)
    index_type: str  # 'NDVI', 'EVI', 'SAVI', 'NDWI', 'NDBI', 'RGB', 'FALSE_COLOR', 'B01'-'B12'
    product_name: Optional[str] = None  # If None, uses most recent
    smooth: bool = False  # Apply Gaussian smoothing filter

    @field_validator("product_name")
    @classmethod
    def validate_product_name(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v == "":
            return None
        if not SAFE_PRODUCT_PATTERN.match(v):
            raise ValueError("Invalid Sentinel-2 product name")
        return v


class IndexResult(BaseModel):
    field_id: str
    index_type: str
    statistics: dict
    histogram: dict
    image_base64: str
    product_used: str
    elevation_data: Optional[dict] = None  # For 3D visualization


def find_sentinel_product(product_name: Optional[str] = None) -> Path:
    """
    Find Sentinel-2 product directory inside PRODUCTS_DIR.

    Validates the product name against the official SAFE pattern and ensures
    the resolved path stays inside PRODUCTS_DIR (rejects path traversal).
    """
    if product_name:
        if not SAFE_PRODUCT_PATTERN.match(product_name):
            raise HTTPException(status_code=400, detail="Invalid product name format")

        candidate = (PRODUCTS_DIR / product_name).resolve()
        try:
            candidate.relative_to(PRODUCTS_DIR.resolve())
        except ValueError:
            # Resolved path escapes the products directory.
            raise HTTPException(status_code=400, detail="Invalid product name")

        if not candidate.exists() or not candidate.is_dir():
            raise HTTPException(status_code=404, detail="Product not found")
        return candidate

    # Find most recent product
    products = list(PRODUCTS_DIR.glob("S2*_MSIL2A_*.SAFE"))
    if not products:
        raise HTTPException(status_code=404, detail="No Sentinel-2 products found")

    # Sort by date in filename
    products.sort(reverse=True)
    return products[0]


def coordinates_to_polygon(coordinates: List[Coordinate]) -> Polygon:
    """
    Convert a coordinate list to a valid Shapely Polygon.

    Raises HTTP 400 if the resulting polygon is empty, degenerate or self-intersecting.
    Pydantic already enforces min_length=3 and lat/lon bounds upstream.
    """
    coords = [(c.longitude, c.latitude) for c in coordinates]
    polygon = Polygon(coords)
    if polygon.is_empty or not polygon.is_valid:
        raise HTTPException(status_code=400, detail="Invalid polygon geometry")
    return polygon


def apply_smooth_filter(data: np.ndarray, sigma: float = 1.5) -> np.ndarray:
    """
    Apply Gaussian smoothing filter to data

    Args:
        data: Input array (with NaN for no-data areas)
        sigma: Standard deviation for Gaussian kernel (higher = more smoothing)

    Returns:
        Smoothed array with NaN preserved
    """
    # Create mask for valid data
    valid_mask = ~np.isnan(data) & (data != 0)

    # Replace NaN with 0 for filtering
    data_filled = np.where(valid_mask, data, 0)

    # Apply Gaussian filter
    smoothed = gaussian_filter(data_filled, sigma=sigma, mode='constant', cval=0.0)

    # Apply filter to mask as well to handle edges properly
    mask_smoothed = gaussian_filter(valid_mask.astype(float), sigma=sigma, mode='constant', cval=0.0)

    # Avoid division by zero
    smoothed = np.where(mask_smoothed > 0.01, smoothed / mask_smoothed, 0)

    # Restore NaN values
    smoothed[~valid_mask] = np.nan

    return smoothed


def generate_elevation_data(data: np.ndarray, downsample_factor: int = 4) -> dict:
    """
    Generate 3D elevation data from index/band data

    Args:
        data: 2D array of values
        downsample_factor: Factor to reduce resolution for performance

    Returns:
        Dictionary with elevation grid data
    """
    height, width = data.shape

    # Downsample for performance
    if downsample_factor > 1:
        new_height = height // downsample_factor
        new_width = width // downsample_factor
        downsampled = np.zeros((new_height, new_width))

        for i in range(new_height):
            for j in range(new_width):
                block = data[
                    i * downsample_factor:(i + 1) * downsample_factor,
                    j * downsample_factor:(j + 1) * downsample_factor
                ]
                valid_values = block[~np.isnan(block)]
                if len(valid_values) > 0:
                    downsampled[i, j] = np.mean(valid_values)
                else:
                    downsampled[i, j] = 0
        data = downsampled

    # Create elevation data
    valid_mask = ~np.isnan(data) & (data != 0)
    heights = np.where(valid_mask, data, 0).flatten().tolist()

    return {
        'width': int(data.shape[1]),
        'height': int(data.shape[0]),
        'heights': heights,
        'min_value': float(np.nanmin(data)) if np.any(valid_mask) else 0,
        'max_value': float(np.nanmax(data)) if np.any(valid_mask) else 0,
    }


def _min_max_to_uint8(data_filled: np.ndarray) -> tuple[np.ndarray, float, float]:
    """
    Min-max normalize a filled (no NaN) array to uint8 [0, 255].
    Returns (uint8_array, vmin, vmax) so callers can de-normalize back to the
    original range. Safe for constant arrays (vmax == vmin) — returns zeros.
    """
    vmin = float(data_filled.min())
    vmax = float(data_filled.max())
    if vmax <= vmin:
        return np.zeros(data_filled.shape, dtype=np.uint8), vmin, vmax
    normalized = ((data_filled - vmin) / (vmax - vmin) * 255.0).astype(np.uint8)
    return normalized, vmin, vmax


def _denormalize_from_uint8(arr_uint8: np.ndarray, vmin: float, vmax: float) -> np.ndarray:
    """Inverse of _min_max_to_uint8. Safe for constant range (returns vmin)."""
    span = vmax - vmin
    if span <= 0:
        return np.full_like(arr_uint8, vmin, dtype=np.float32)
    return arr_uint8.astype(np.float32) / 255.0 * span + vmin


def _normalize_to_uint8(data: np.ndarray, valid_mask: np.ndarray) -> np.ndarray:
    """
    Normalize array to uint8 [0, 255] using percentile stretch on valid pixels.
    Returns zeros if there are no valid pixels or vmin == vmax (constant image).
    """
    out = np.zeros(data.shape, dtype=np.uint8)
    if not np.any(valid_mask):
        return out

    valid = data[valid_mask].astype(np.float32)
    vmin, vmax = np.percentile(valid, [2, 98])
    if vmax <= vmin:
        return out

    stretched = np.clip((data[valid_mask].astype(np.float32) - vmin) / (vmax - vmin) * 255.0, 0, 255)
    out[valid_mask] = stretched.astype(np.uint8)
    return out


def generate_colored_image(data: np.ndarray, colormap: str = 'viridis', smooth: bool = False) -> str:
    """
    Convert array to RGBA PNG using OpenCV colormap, with transparency for invalid pixels.

    Args:
        data: 2D array (NaN marks no-data).
        colormap: 'viridis' | 'jet' | 'hot' | 'turbo' | 'magma' | 'inferno' | 'plasma'.
        smooth: Apply Gaussian smoothing before colorization.

    Returns:
        Base64-encoded PNG (RGBA).
    """
    import cv2

    if smooth:
        data = apply_smooth_filter(data, sigma=1.5)

    valid_mask = ~np.isnan(data) & (data != 0)
    height, width = data.shape

    cmap_table = {
        'viridis': cv2.COLORMAP_VIRIDIS,
        'jet': cv2.COLORMAP_JET,
        'hot': cv2.COLORMAP_HOT,
        'turbo': cv2.COLORMAP_TURBO,
        'magma': cv2.COLORMAP_MAGMA,
        'inferno': cv2.COLORMAP_INFERNO,
        'plasma': cv2.COLORMAP_PLASMA,
    }
    cv2_cmap = cmap_table.get(colormap, cv2.COLORMAP_VIRIDIS)

    # Normalize valid pixels to uint8
    data_uint8 = _normalize_to_uint8(data, valid_mask)

    # OpenCV returns BGR — convert to RGB
    colored_bgr = cv2.applyColorMap(data_uint8, cv2_cmap)
    colored_rgb = cv2.cvtColor(colored_bgr, cv2.COLOR_BGR2RGB)

    # Build RGBA: copy RGB and set alpha=255 where valid, 0 elsewhere
    colored = np.zeros((height, width, 4), dtype=np.uint8)
    colored[..., :3] = colored_rgb
    colored[..., 3] = np.where(valid_mask, 255, 0)

    img = Image.fromarray(colored, mode='RGBA')
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    return base64.b64encode(buffer.read()).decode('utf-8')


def single_band_to_image(band_data: np.ndarray, band_name: str = 'Band', smooth: bool = False) -> str:
    """
    Convert single band to grayscale RGBA PNG (transparent outside valid pixels).

    Vectorized — uses _normalize_to_uint8 + numpy stacking instead of per-pixel loops.
    """
    if smooth:
        band_data = apply_smooth_filter(band_data, sigma=1.5)

    height, width = band_data.shape
    valid_mask = ~np.isnan(band_data) & (band_data != 0)

    gray = _normalize_to_uint8(band_data, valid_mask)
    alpha = np.where(valid_mask, np.uint8(255), np.uint8(0))

    # Stack R = G = B = gray, plus alpha channel
    colored = np.stack([gray, gray, gray, alpha], axis=-1)

    img = Image.fromarray(colored, mode='RGBA')
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    return base64.b64encode(buffer.read()).decode('utf-8')


def rgb_composite_to_image(red: np.ndarray, green: np.ndarray, blue: np.ndarray, smooth: bool = False) -> str:
    """
    RGB composite (true color or false color) as RGBA PNG. Vectorized.
    """
    if smooth:
        red = apply_smooth_filter(red, sigma=1.5)
        green = apply_smooth_filter(green, sigma=1.5)
        blue = apply_smooth_filter(blue, sigma=1.5)

    valid_mask = (
        ~np.isnan(red) & ~np.isnan(green) & ~np.isnan(blue)
        & (red != 0) & (green != 0) & (blue != 0)
    )

    r = _normalize_to_uint8(red, valid_mask)
    g = _normalize_to_uint8(green, valid_mask)
    b = _normalize_to_uint8(blue, valid_mask)
    alpha = np.where(valid_mask, np.uint8(255), np.uint8(0))

    colored = np.stack([r, g, b, alpha], axis=-1)

    img = Image.fromarray(colored, mode='RGBA')
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    return base64.b64encode(buffer.read()).decode('utf-8')


def ndvi_to_image(ndvi: np.ndarray, colormap: str = 'RdYlGn', smooth: bool = False) -> str:
    """
    Convert NDVI array to colored RGBA PNG with the brown→yellow→green gradient.
    Vectorized: uses 3 boolean masks instead of per-pixel loops.
    """
    if smooth:
        ndvi = apply_smooth_filter(ndvi, sigma=1.5)

    valid_mask = ~np.isnan(ndvi) & (ndvi != 0)

    # Map NDVI [-1, 1] → [0, 255] for valid pixels
    val = np.zeros_like(ndvi, dtype=np.float32)
    val[valid_mask] = (ndvi[valid_mask] + 1.0) / 2.0 * 255.0
    val = val.astype(np.uint8)

    r = np.zeros_like(val)
    g = np.zeros_like(val)
    b = np.zeros_like(val)

    # Tier 1: low NDVI (val < 85) — brown shades
    m1 = valid_mask & (val < 85)
    r[m1] = np.minimum(139 + val[m1].astype(np.int16), 255).astype(np.uint8)
    g[m1] = 69
    b[m1] = 19

    # Tier 2: mid NDVI (85 ≤ val < 170) — yellow → green
    m2 = valid_mask & (val >= 85) & (val < 170)
    r[m2] = np.maximum(255 - val[m2].astype(np.int16), 0).astype(np.uint8)
    g[m2] = 255
    # b stays 0

    # Tier 3: high NDVI (val ≥ 170) — green shades
    m3 = valid_mask & (val >= 170)
    g[m3] = val[m3]
    # r and b stay 0

    alpha = np.where(valid_mask, np.uint8(255), np.uint8(0))
    colored = np.stack([r, g, b, alpha], axis=-1)

    img = Image.fromarray(colored, mode='RGBA')
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

        elif request.index_type == 'SAVI':
            # Read NIR and Red at 10 m — soil-adjusted vegetation index
            nir_data, nir_meta = processor.read_band('B08', '10m')
            red_data, red_meta = processor.read_band('B04', '10m')
            nir_cropped, _ = processor.crop_to_geometry(nir_data, nir_meta, geometry)
            red_cropped, _ = processor.crop_to_geometry(red_data, red_meta, geometry)
            index_data = processor.calculate_savi(nir_cropped, red_cropped)

        elif request.index_type == 'NDWI':
            # Read Green and NIR at 10 m — McFeeters water index
            green_data, green_meta = processor.read_band('B03', '10m')
            nir_data, nir_meta = processor.read_band('B08', '10m')
            green_cropped, _ = processor.crop_to_geometry(green_data, green_meta, geometry)
            nir_cropped, _ = processor.crop_to_geometry(nir_data, nir_meta, geometry)
            index_data = processor.calculate_ndwi(green_cropped, nir_cropped)

        elif request.index_type == 'NDBI':
            # Read SWIR (B11, 20 m) and NIR (B08, 10 m). crop_to_geometry
            # respects the source raster's pixel grid, then we resize SWIR
            # to NIR's grid using nearest-neighbor before differencing.
            swir_data, swir_meta = processor.read_band('B11', '20m')
            nir_data, nir_meta = processor.read_band('B08', '10m')
            swir_cropped, _ = processor.crop_to_geometry(swir_data, swir_meta, geometry)
            nir_cropped, _ = processor.crop_to_geometry(nir_data, nir_meta, geometry)
            # Reamostra SWIR pra grade de NIR (10 m) — nearest preserva valores discretos.
            from PIL import Image as _PILImage
            if swir_cropped.shape != nir_cropped.shape:
                pil = _PILImage.fromarray(swir_cropped.astype(np.float32))
                pil = pil.resize((nir_cropped.shape[1], nir_cropped.shape[0]), _PILImage.NEAREST)
                swir_cropped = np.array(pil)
            index_data = processor.calculate_ndbi(swir_cropped, nir_cropped)

        elif request.index_type == 'RGB':
            # True Color RGB (B04-Red, B03-Green, B02-Blue)
            red_data, red_meta = processor.read_band('B04', '10m')
            green_data, green_meta = processor.read_band('B03', '10m')
            blue_data, blue_meta = processor.read_band('B02', '10m')

            red_cropped, _ = processor.crop_to_geometry(red_data, red_meta, geometry)
            green_cropped, _ = processor.crop_to_geometry(green_data, green_meta, geometry)
            blue_cropped, _ = processor.crop_to_geometry(blue_data, blue_meta, geometry)

            # Generate RGB composite
            image_base64 = rgb_composite_to_image(red_cropped, green_cropped, blue_cropped, smooth=request.smooth)
            statistics = processor.calculate_statistics(red_cropped)  # Use red for stats
            bin_edges, counts = processor.calculate_histogram(red_cropped)
            elevation_data = generate_elevation_data(red_cropped, downsample_factor=4)

            return IndexResult(
                field_id=request.field_id,
                index_type=request.index_type,
                statistics=statistics,
                histogram={'bins': bin_edges, 'counts': counts},
                image_base64=image_base64,
                product_used=product_path.name,
                elevation_data=elevation_data
            )

        elif request.index_type == 'FALSE_COLOR':
            # False Color (B08-NIR, B04-Red, B03-Green)
            nir_data, nir_meta = processor.read_band('B08', '10m')
            red_data, red_meta = processor.read_band('B04', '10m')
            green_data, green_meta = processor.read_band('B03', '10m')

            nir_cropped, _ = processor.crop_to_geometry(nir_data, nir_meta, geometry)
            red_cropped, _ = processor.crop_to_geometry(red_data, red_meta, geometry)
            green_cropped, _ = processor.crop_to_geometry(green_data, green_meta, geometry)

            image_base64 = rgb_composite_to_image(nir_cropped, red_cropped, green_cropped, smooth=request.smooth)
            statistics = processor.calculate_statistics(nir_cropped)
            bin_edges, counts = processor.calculate_histogram(nir_cropped)
            elevation_data = generate_elevation_data(nir_cropped, downsample_factor=4)

            return IndexResult(
                field_id=request.field_id,
                index_type=request.index_type,
                statistics=statistics,
                histogram={'bins': bin_edges, 'counts': counts},
                image_base64=image_base64,
                product_used=product_path.name,
                elevation_data=elevation_data
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

            image_base64 = single_band_to_image(band_cropped, band_name, smooth=request.smooth)
            statistics = processor.calculate_statistics(band_cropped)
            bin_edges, counts = processor.calculate_histogram(band_cropped)
            elevation_data = generate_elevation_data(band_cropped, downsample_factor=4)

            return IndexResult(
                field_id=request.field_id,
                index_type=request.index_type,
                statistics=statistics,
                histogram={'bins': bin_edges, 'counts': counts},
                image_base64=image_base64,
                product_used=product_path.name,
                elevation_data=elevation_data
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
        image_base64 = ndvi_to_image(index_data, smooth=request.smooth)

        # Generate 3D elevation data
        elevation_data = generate_elevation_data(index_data, downsample_factor=4)

        return IndexResult(
            field_id=request.field_id,
            index_type=request.index_type,
            statistics=statistics,
            histogram=histogram,
            image_base64=image_base64,
            product_used=product_path.name,
            elevation_data=elevation_data
        )

    except HTTPException:
        raise
    except FileNotFoundError as e:
        logger.warning("calculate_index: missing file: %s", e)
        raise HTTPException(status_code=404, detail="Required Sentinel-2 file not found")
    except Exception:
        logger.exception("calculate_index: unexpected error")
        raise HTTPException(status_code=500, detail="Internal processing error")


@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "products_dir": str(PRODUCTS_DIR.exists())}


# ========================================
# EXPERIMENTS LAB ENDPOINTS
# ========================================

class ExperimentRequest(BaseModel):
    field_id: str = Field(..., min_length=1, max_length=200)
    coordinates: List[Coordinate] = Field(..., min_length=3)
    experiment_type: str
    parameters: dict
    product_name: Optional[str] = None

    @field_validator("product_name")
    @classmethod
    def validate_product_name(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v == "":
            return None
        if not SAFE_PRODUCT_PATTERN.match(v):
            raise ValueError("Invalid Sentinel-2 product name")
        return v


class ExperimentResult(BaseModel):
    field_id: str
    experiment_type: str
    parameters: dict
    image_base64: str
    statistics: dict
    timestamp: str
    product_used: str


@app.post("/api/experiments/run")
def run_experiment(request: ExperimentRequest):
    """Run an image processing experiment on a field"""
    from datetime import datetime, timezone
    from scipy.ndimage import median_filter, gaussian_filter
    from scipy.ndimage import sobel, laplace
    from skimage import filters
    import cv2

    try:
        # Find product and initialize processor
        product_path = find_sentinel_product(request.product_name)
        processor = SentinelProcessor(str(product_path))

        # Convert coordinates to polygon
        polygon = coordinates_to_polygon(request.coordinates)

        # Read base data (using NIR band as default for most experiments)
        nir_band, nir_meta = processor.read_band('B08', '10m')
        nir_cropped, cropped_meta = processor.crop_to_geometry(nir_band, nir_meta, polygon)

        result_data = None
        stats_description = {}

        # Apply experiment based on type
        if request.experiment_type == 'gaussian_blur':
            sigma = request.parameters.get('sigma', 2.0)
            result_data = apply_smooth_filter(nir_cropped, sigma=sigma)
            stats_description = {'filter': 'Gaussian', 'sigma': sigma}

        elif request.experiment_type == 'median_filter':
            size = request.parameters.get('size', 5)
            valid_mask = ~np.isnan(nir_cropped)
            data_filled = np.where(valid_mask, nir_cropped, 0)
            result_data = median_filter(data_filled, size=size)
            result_data[~valid_mask] = np.nan
            stats_description = {'filter': 'Median', 'size': size}

        elif request.experiment_type == 'bilateral_filter':
            # Bilateral filter requires normalized data
            valid_mask = ~np.isnan(nir_cropped)
            data_filled = np.where(valid_mask, nir_cropped, 0)

            # Normalize to 0-255 for OpenCV
            data_normalized, _vmin, _vmax = _min_max_to_uint8(data_filled)

            d = request.parameters.get('d', 9)
            sigma_color = request.parameters.get('sigma_color', 75)
            sigma_space = request.parameters.get('sigma_space', 75)

            filtered = cv2.bilateralFilter(data_normalized, d, sigma_color, sigma_space)

            # Denormalize back
            result_data = _denormalize_from_uint8(filtered, _vmin, _vmax)
            result_data[~valid_mask] = np.nan
            stats_description = {'filter': 'Bilateral', 'd': d, 'sigma_color': sigma_color, 'sigma_space': sigma_space}

        elif request.experiment_type == 'sobel_edge':
            valid_mask = ~np.isnan(nir_cropped)
            data_filled = np.where(valid_mask, nir_cropped, 0)

            sx = sobel(data_filled, axis=0)
            sy = sobel(data_filled, axis=1)
            result_data = np.sqrt(sx**2 + sy**2)
            result_data[~valid_mask] = np.nan
            stats_description = {'detector': 'Sobel'}

        elif request.experiment_type == 'canny_edge':
            valid_mask = ~np.isnan(nir_cropped)
            data_filled = np.where(valid_mask, nir_cropped, 0)

            # Normalize for edge detection
            data_normalized, _vmin, _vmax = _min_max_to_uint8(data_filled)

            low_threshold = request.parameters.get('low_threshold', 50)
            high_threshold = request.parameters.get('high_threshold', 150)

            edges = cv2.Canny(data_normalized, low_threshold, high_threshold)
            result_data = edges.astype(np.float32)
            result_data[~valid_mask] = np.nan
            stats_description = {'detector': 'Canny', 'low_threshold': low_threshold, 'high_threshold': high_threshold}

        elif request.experiment_type == 'laplacian_edge':
            valid_mask = ~np.isnan(nir_cropped)
            data_filled = np.where(valid_mask, nir_cropped, 0)

            result_data = laplace(data_filled)
            result_data = np.abs(result_data)
            result_data[~valid_mask] = np.nan
            stats_description = {'detector': 'Laplacian'}

        elif request.experiment_type == 'histogram_equalization':
            valid_mask = ~np.isnan(nir_cropped)
            data_filled = np.where(valid_mask, nir_cropped, 0)

            # Normalize to 0-255
            data_normalized, _vmin, _vmax = _min_max_to_uint8(data_filled)

            equalized = cv2.equalizeHist(data_normalized)

            # Denormalize
            result_data = _denormalize_from_uint8(equalized, _vmin, _vmax)
            result_data[~valid_mask] = np.nan
            stats_description = {'enhancement': 'Histogram Equalization'}

        elif request.experiment_type == 'morphology_erosion':
            valid_mask = ~np.isnan(nir_cropped)
            data_filled = np.where(valid_mask, nir_cropped, 0)

            kernel_size = request.parameters.get('kernel_size', 3)
            kernel = np.ones((kernel_size, kernel_size), np.uint8)

            data_normalized, _vmin, _vmax = _min_max_to_uint8(data_filled)
            eroded = cv2.erode(data_normalized, kernel, iterations=1)

            result_data = _denormalize_from_uint8(eroded, _vmin, _vmax)
            result_data[~valid_mask] = np.nan
            stats_description = {'operation': 'Erosion', 'kernel_size': kernel_size}

        elif request.experiment_type == 'morphology_dilation':
            valid_mask = ~np.isnan(nir_cropped)
            data_filled = np.where(valid_mask, nir_cropped, 0)

            kernel_size = request.parameters.get('kernel_size', 3)
            kernel = np.ones((kernel_size, kernel_size), np.uint8)

            data_normalized, _vmin, _vmax = _min_max_to_uint8(data_filled)
            dilated = cv2.dilate(data_normalized, kernel, iterations=1)

            result_data = _denormalize_from_uint8(dilated, _vmin, _vmax)
            result_data[~valid_mask] = np.nan
            stats_description = {'operation': 'Dilation', 'kernel_size': kernel_size}

        elif request.experiment_type == 'morphology_opening':
            valid_mask = ~np.isnan(nir_cropped)
            data_filled = np.where(valid_mask, nir_cropped, 0)

            kernel_size = request.parameters.get('kernel_size', 3)
            kernel = np.ones((kernel_size, kernel_size), np.uint8)

            data_normalized, _vmin, _vmax = _min_max_to_uint8(data_filled)
            opening = cv2.morphologyEx(data_normalized, cv2.MORPH_OPEN, kernel)

            result_data = _denormalize_from_uint8(opening, _vmin, _vmax)
            result_data[~valid_mask] = np.nan
            stats_description = {'operation': 'Opening', 'kernel_size': kernel_size}

        elif request.experiment_type == 'morphology_closing':
            valid_mask = ~np.isnan(nir_cropped)
            data_filled = np.where(valid_mask, nir_cropped, 0)

            kernel_size = request.parameters.get('kernel_size', 3)
            kernel = np.ones((kernel_size, kernel_size), np.uint8)

            data_normalized, _vmin, _vmax = _min_max_to_uint8(data_filled)
            closing = cv2.morphologyEx(data_normalized, cv2.MORPH_CLOSE, kernel)

            result_data = _denormalize_from_uint8(closing, _vmin, _vmax)
            result_data[~valid_mask] = np.nan
            stats_description = {'operation': 'Closing', 'kernel_size': kernel_size}

        elif request.experiment_type == 'threshold_binary':
            valid_mask = ~np.isnan(nir_cropped)
            data_filled = np.where(valid_mask, nir_cropped, 0)

            threshold = request.parameters.get('threshold', 0.5)

            # Normalize data (safe for uniform / no-range arrays)
            _vmin, _vmax = float(data_filled.min()), float(data_filled.max())
            if _vmax <= _vmin:
                data_normalized = np.zeros_like(data_filled, dtype=np.float32)
            else:
                data_normalized = (data_filled - _vmin) / (_vmax - _vmin)
            result_data = (data_normalized > threshold).astype(np.float32)
            result_data[~valid_mask] = np.nan
            stats_description = {'segmentation': 'Binary Threshold', 'threshold': threshold}

        elif request.experiment_type == 'threshold_otsu':
            valid_mask = ~np.isnan(nir_cropped)
            data_filled = np.where(valid_mask, nir_cropped, 0)

            # Normalize to 0-255
            data_normalized, _vmin, _vmax = _min_max_to_uint8(data_filled)

            threshold_value = filters.threshold_otsu(data_normalized[valid_mask])
            result_data = (data_normalized > threshold_value).astype(np.float32)
            result_data[~valid_mask] = np.nan
            stats_description = {'segmentation': 'Otsu Threshold', 'computed_threshold': float(threshold_value)}

        elif request.experiment_type == 'threshold_adaptive':
            valid_mask = ~np.isnan(nir_cropped)
            data_filled = np.where(valid_mask, nir_cropped, 0)

            # Normalize to 0-255
            data_normalized, _vmin, _vmax = _min_max_to_uint8(data_filled)

            block_size = request.parameters.get('block_size', 11)
            c = request.parameters.get('c', 2)

            # Ensure block_size is odd
            if block_size % 2 == 0:
                block_size += 1

            thresholded = cv2.adaptiveThreshold(
                data_normalized, 255,
                cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                cv2.THRESH_BINARY,
                block_size, c
            )

            result_data = (thresholded / 255.0).astype(np.float32)
            result_data[~valid_mask] = np.nan
            stats_description = {'segmentation': 'Adaptive Threshold', 'block_size': block_size, 'c': c}

        else:
            raise HTTPException(status_code=400, detail=f"Unknown experiment type: {request.experiment_type}")

        # Calculate statistics
        statistics = processor.calculate_statistics(result_data)
        statistics.update(stats_description)

        # Generate visualization image
        image_base64 = generate_colored_image(result_data, 'viridis')

        return ExperimentResult(
            field_id=request.field_id,
            experiment_type=request.experiment_type,
            parameters=request.parameters,
            image_base64=image_base64,
            statistics=statistics,
            timestamp=datetime.now(timezone.utc).isoformat(),
            product_used=product_path.name
        )

    except HTTPException:
        raise
    except Exception:
        logger.exception("run_experiment: unexpected error")
        raise HTTPException(status_code=500, detail="Internal experiment error")


# ========================================
# CROP CLASSIFICATION ENDPOINTS
# ========================================

class ClassificationRequest(BaseModel):
    field_id: str = Field(..., min_length=1, max_length=200)
    coordinates: List[Coordinate] = Field(..., min_length=3)
    method: Literal["supervised", "unsupervised", "threshold"]
    crop_type: Optional[Literal["soja", "milho", "cafe", "cana", "multi"]] = "multi"
    n_classes: int = Field(default=3, ge=2, le=6)
    indices: dict = {'ndvi': True, 'evi': True, 'savi': True}
    product_name: Optional[str] = None

    @field_validator("indices")
    @classmethod
    def validate_indices(cls, v: dict) -> dict:
        # Pelo menos um índice precisa estar habilitado (o cálculo precisa de feature)
        if not any(bool(val) for val in v.values()):
            raise ValueError("Selecione ao menos um índice (NDVI, EVI ou SAVI)")
        return v

    @field_validator("product_name")
    @classmethod
    def validate_product_name(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v == "":
            return None
        if not SAFE_PRODUCT_PATTERN.match(v):
            raise ValueError("Invalid Sentinel-2 product name")
        return v


class CropClass(BaseModel):
    name: str
    color: str
    percentage: float
    area_hectares: float


class ClassificationResult(BaseModel):
    field_id: str
    classification_type: str
    classes: List[CropClass]
    image_base64: str
    confidence_map: Optional[str] = None
    statistics: dict
    timestamp: str
    product_used: str


@app.post("/api/classification/classify")
def classify_crops(request: ClassificationRequest):
    """Classify crop types in agricultural fields"""
    from datetime import datetime, timezone
    from sklearn.cluster import KMeans
    from sklearn.ensemble import RandomForestClassifier
    import cv2

    try:
        # Find product and initialize processor
        product_path = find_sentinel_product(request.product_name)
        processor = SentinelProcessor(str(product_path))

        # Convert coordinates to polygon
        polygon = coordinates_to_polygon(request.coordinates)

        # Calculate requested indices
        indices_data = []
        indices_names = []

        if request.indices.get('ndvi', True):
            red_band, red_meta = processor.read_band('B04', '10m')
            nir_band, nir_meta = processor.read_band('B08', '10m')
            red_cropped, _ = processor.crop_to_geometry(red_band, red_meta, polygon)
            nir_cropped, _ = processor.crop_to_geometry(nir_band, nir_meta, polygon)
            ndvi = processor.calculate_ndvi(nir_cropped, red_cropped)
            indices_data.append(ndvi)
            indices_names.append('NDVI')

        if request.indices.get('evi', True):
            if 'red_cropped' not in locals():
                red_band, red_meta = processor.read_band('B04', '10m')
                nir_band, nir_meta = processor.read_band('B08', '10m')
                red_cropped, _ = processor.crop_to_geometry(red_band, red_meta, polygon)
                nir_cropped, _ = processor.crop_to_geometry(nir_band, nir_meta, polygon)

            blue_band, blue_meta = processor.read_band('B02', '10m')
            blue_cropped, _ = processor.crop_to_geometry(blue_band, blue_meta, polygon)
            evi = processor.calculate_evi(nir_cropped, red_cropped, blue_cropped)
            indices_data.append(evi)
            indices_names.append('EVI')

        if request.indices.get('savi', True):
            if 'red_cropped' not in locals():
                red_band, red_meta = processor.read_band('B04', '10m')
                nir_band, nir_meta = processor.read_band('B08', '10m')
                red_cropped, _ = processor.crop_to_geometry(red_band, red_meta, polygon)
                nir_cropped, _ = processor.crop_to_geometry(nir_band, nir_meta, polygon)

            savi = processor.calculate_savi(nir_cropped, red_cropped)
            indices_data.append(savi)
            indices_names.append('SAVI')

        # Stack indices for classification
        valid_mask = ~np.isnan(indices_data[0])
        for idx_data in indices_data[1:]:
            valid_mask &= ~np.isnan(idx_data)

        # Prepare feature matrix
        features = []
        for idx_data in indices_data:
            features.append(idx_data[valid_mask])
        features = np.column_stack(features)

        # Classification based on method
        if request.method == 'unsupervised':
            # K-Means clustering
            kmeans = KMeans(n_clusters=request.n_classes, random_state=42, n_init=10)
            labels = kmeans.fit_predict(features)

            # Create classification map
            classification_map = np.full(indices_data[0].shape, -1, dtype=np.int32)
            classification_map[valid_mask] = labels

            # Define colors for each class
            colors = [
                '#2ecc71',  # Green
                '#f39c12',  # Orange
                '#3498db',  # Blue
                '#e74c3c',  # Red
                '#9b59b6',  # Purple
                '#1abc9c',  # Turquoise
            ]

            # Calculate class statistics
            classes = []
            total_pixels = np.sum(valid_mask)
            pixel_area = 100  # 10m x 10m = 100 m² per pixel

            for i in range(request.n_classes):
                class_pixels = np.sum(labels == i)
                percentage = (class_pixels / total_pixels) * 100
                area_ha = (class_pixels * pixel_area) / 10000  # Convert m² to hectares

                classes.append(CropClass(
                    name=f"Class {i+1}",
                    color=colors[i % len(colors)],
                    percentage=percentage,
                    area_hectares=area_ha
                ))

        elif request.method == 'threshold':
            # Threshold-based classification using NDVI
            if 'NDVI' not in indices_names:
                raise HTTPException(
                    status_code=400,
                    detail="Método 'limiar' requer NDVI ativo nos índices",
                )
            ndvi_data = indices_data[indices_names.index('NDVI')]

            classification_map = np.full(ndvi_data.shape, -1, dtype=np.int32)

            # Define thresholds
            # Low vigor: NDVI < 0.3
            # Medium vigor: 0.3 <= NDVI < 0.6
            # High vigor: NDVI >= 0.6
            classification_map[valid_mask & (ndvi_data < 0.3)] = 0
            classification_map[valid_mask & (ndvi_data >= 0.3) & (ndvi_data < 0.6)] = 1
            classification_map[valid_mask & (ndvi_data >= 0.6)] = 2

            classes = [
                CropClass(
                    name="Low Vigor",
                    color="#e74c3c",
                    percentage=(np.sum(classification_map == 0) / np.sum(valid_mask)) * 100,
                    area_hectares=(np.sum(classification_map == 0) * 100) / 10000
                ),
                CropClass(
                    name="Medium Vigor",
                    color="#f39c12",
                    percentage=(np.sum(classification_map == 1) / np.sum(valid_mask)) * 100,
                    area_hectares=(np.sum(classification_map == 1) * 100) / 10000
                ),
                CropClass(
                    name="High Vigor",
                    color="#2ecc71",
                    percentage=(np.sum(classification_map == 2) / np.sum(valid_mask)) * 100,
                    area_hectares=(np.sum(classification_map == 2) * 100) / 10000
                )
            ]

        else:  # supervised
            # Simulated supervised classification
            # In a real scenario, this would use training data
            # For now, we'll use a simplified approach based on index ranges

            crop_signatures = {
                'soja': {'ndvi': (0.5, 0.8), 'evi': (0.4, 0.7)},
                'milho': {'ndvi': (0.6, 0.9), 'evi': (0.5, 0.8)},
                'cafe': {'ndvi': (0.4, 0.7), 'evi': (0.3, 0.6)},
                'cana': {'ndvi': (0.5, 0.75), 'evi': (0.4, 0.65)},
            }

            classification_map = np.full(indices_data[0].shape, -1, dtype=np.int32)

            if request.crop_type == 'multi':
                # Multi-crop classification
                # Use k-means as fallback
                kmeans = KMeans(n_clusters=3, random_state=42, n_init=10)
                labels = kmeans.fit_predict(features)
                classification_map[valid_mask] = labels

                classes = [
                    CropClass(name="Crop Type 1", color="#2ecc71", percentage=0, area_hectares=0),
                    CropClass(name="Crop Type 2", color="#f39c12", percentage=0, area_hectares=0),
                    CropClass(name="Crop Type 3", color="#3498db", percentage=0, area_hectares=0)
                ]

                for i in range(3):
                    class_pixels = np.sum(labels == i)
                    classes[i].percentage = (class_pixels / np.sum(valid_mask)) * 100
                    classes[i].area_hectares = (class_pixels * 100) / 10000
            else:
                # Single crop detection (crop vs non-crop)
                crop_name = {'soja': 'Soja', 'milho': 'Milho', 'cafe': 'Café', 'cana': 'Cana'}[request.crop_type]

                # Simple classification: high NDVI = crop, low NDVI = non-crop
                ndvi_data = indices_data[0] if indices_names[0] == 'NDVI' else indices_data[indices_names.index('NDVI')]

                classification_map[valid_mask & (ndvi_data >= 0.5)] = 1  # Crop
                classification_map[valid_mask & (ndvi_data < 0.5)] = 0   # Non-crop/Soil

                crop_pixels = np.sum(classification_map == 1)
                non_crop_pixels = np.sum(classification_map == 0)

                classes = [
                    CropClass(
                        name="Soil/Non-crop",
                        color="#8b4513",
                        percentage=(non_crop_pixels / np.sum(valid_mask)) * 100,
                        area_hectares=(non_crop_pixels * 100) / 10000
                    ),
                    CropClass(
                        name=crop_name,
                        color="#2ecc71",
                        percentage=(crop_pixels / np.sum(valid_mask)) * 100,
                        area_hectares=(crop_pixels * 100) / 10000
                    )
                ]

        # Generate colored classification image
        height, width = classification_map.shape
        colored_image = np.zeros((height, width, 4), dtype=np.uint8)

        for i, cls in enumerate(classes):
            mask = classification_map == i
            # Convert hex color to RGB
            color_hex = cls.color.lstrip('#')
            r, g, b = tuple(int(color_hex[i:i+2], 16) for i in (0, 2, 4))
            colored_image[mask] = [r, g, b, 255]

        # Set transparent for unclassified areas
        colored_image[classification_map == -1] = [0, 0, 0, 0]

        # Convert to base64
        img = Image.fromarray(colored_image, mode='RGBA')
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        image_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')

        # Calculate statistics
        total_area_ha = (np.sum(valid_mask) * 100) / 10000
        classified_area_ha = sum(cls.area_hectares for cls in classes)

        statistics = {
            'total_area': total_area_ha,
            'classified_area': classified_area_ha,
            'unclassified_percentage': ((total_area_ha - classified_area_ha) / total_area_ha) * 100 if total_area_ha > 0 else 0,
        }

        return ClassificationResult(
            field_id=request.field_id,
            classification_type=request.method,
            classes=classes,
            image_base64=image_base64,
            statistics=statistics,
            timestamp=datetime.now(timezone.utc).isoformat(),
            product_used=product_path.name
        )

    except HTTPException:
        raise
    except Exception:
        logger.exception("classify_crops: unexpected error")
        raise HTTPException(status_code=500, detail="Internal classification error")
