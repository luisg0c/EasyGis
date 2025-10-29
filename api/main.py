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
from scipy.ndimage import gaussian_filter

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
    smooth: bool = False  # Apply Gaussian smoothing filter


class IndexResult(BaseModel):
    field_id: str
    index_type: str
    statistics: dict
    histogram: dict
    image_base64: str
    product_used: str
    elevation_data: Optional[dict] = None  # For 3D visualization


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


def single_band_to_image(band_data: np.ndarray, band_name: str = 'Band', smooth: bool = False) -> str:
    """
    Convert single band to grayscale image with transparency

    Args:
        band_data: Band array (with NaN for no-data areas)
        band_name: Name of the band
        smooth: Apply Gaussian smoothing filter

    Returns:
        Base64 encoded PNG image with alpha channel
    """
    # Apply smoothing if requested
    if smooth:
        band_data = apply_smooth_filter(band_data, sigma=1.5)

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


def rgb_composite_to_image(red: np.ndarray, green: np.ndarray, blue: np.ndarray, smooth: bool = False) -> str:
    """
    Create RGB composite image with transparency

    Args:
        red, green, blue: Band arrays
        smooth: Apply Gaussian smoothing filter

    Returns:
        Base64 encoded PNG image
    """
    # Apply smoothing if requested
    if smooth:
        red = apply_smooth_filter(red, sigma=1.5)
        green = apply_smooth_filter(green, sigma=1.5)
        blue = apply_smooth_filter(blue, sigma=1.5)

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


def ndvi_to_image(ndvi: np.ndarray, colormap: str = 'RdYlGn', smooth: bool = False) -> str:
    """
    Convert NDVI array to colored image with transparency and encode as base64

    Args:
        ndvi: NDVI array (with NaN for no-data areas)
        colormap: Matplotlib colormap name
        smooth: Apply Gaussian smoothing filter

    Returns:
        Base64 encoded PNG image with alpha channel
    """
    # Apply smoothing if requested
    if smooth:
        ndvi = apply_smooth_filter(ndvi, sigma=1.5)

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

    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processing error: {str(e)}")


@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "products_dir": str(PRODUCTS_DIR.exists())}


# ========================================
# EXPERIMENTS LAB ENDPOINTS
# ========================================

class ExperimentRequest(BaseModel):
    field_id: str
    coordinates: List[Coordinate]
    experiment_type: str
    parameters: dict
    product_name: Optional[str] = None


class ExperimentResult(BaseModel):
    field_id: str
    experiment_type: str
    parameters: dict
    image_base64: str
    statistics: dict
    timestamp: str
    product_used: str


@app.post("/api/experiments/run")
async def run_experiment(request: ExperimentRequest):
    """Run an image processing experiment on a field"""
    from datetime import datetime
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
            data_normalized = ((data_filled - data_filled.min()) / (data_filled.max() - data_filled.min()) * 255).astype(np.uint8)

            d = request.parameters.get('d', 9)
            sigma_color = request.parameters.get('sigma_color', 75)
            sigma_space = request.parameters.get('sigma_space', 75)

            filtered = cv2.bilateralFilter(data_normalized, d, sigma_color, sigma_space)

            # Denormalize back
            result_data = filtered.astype(np.float32) / 255.0 * (data_filled.max() - data_filled.min()) + data_filled.min()
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
            data_normalized = ((data_filled - data_filled.min()) / (data_filled.max() - data_filled.min()) * 255).astype(np.uint8)

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
            data_normalized = ((data_filled - data_filled.min()) / (data_filled.max() - data_filled.min()) * 255).astype(np.uint8)

            equalized = cv2.equalizeHist(data_normalized)

            # Denormalize
            result_data = equalized.astype(np.float32) / 255.0 * (data_filled.max() - data_filled.min()) + data_filled.min()
            result_data[~valid_mask] = np.nan
            stats_description = {'enhancement': 'Histogram Equalization'}

        elif request.experiment_type == 'morphology_erosion':
            valid_mask = ~np.isnan(nir_cropped)
            data_filled = np.where(valid_mask, nir_cropped, 0)

            kernel_size = request.parameters.get('kernel_size', 3)
            kernel = np.ones((kernel_size, kernel_size), np.uint8)

            data_normalized = ((data_filled - data_filled.min()) / (data_filled.max() - data_filled.min()) * 255).astype(np.uint8)
            eroded = cv2.erode(data_normalized, kernel, iterations=1)

            result_data = eroded.astype(np.float32) / 255.0 * (data_filled.max() - data_filled.min()) + data_filled.min()
            result_data[~valid_mask] = np.nan
            stats_description = {'operation': 'Erosion', 'kernel_size': kernel_size}

        elif request.experiment_type == 'morphology_dilation':
            valid_mask = ~np.isnan(nir_cropped)
            data_filled = np.where(valid_mask, nir_cropped, 0)

            kernel_size = request.parameters.get('kernel_size', 3)
            kernel = np.ones((kernel_size, kernel_size), np.uint8)

            data_normalized = ((data_filled - data_filled.min()) / (data_filled.max() - data_filled.min()) * 255).astype(np.uint8)
            dilated = cv2.dilate(data_normalized, kernel, iterations=1)

            result_data = dilated.astype(np.float32) / 255.0 * (data_filled.max() - data_filled.min()) + data_filled.min()
            result_data[~valid_mask] = np.nan
            stats_description = {'operation': 'Dilation', 'kernel_size': kernel_size}

        elif request.experiment_type == 'morphology_opening':
            valid_mask = ~np.isnan(nir_cropped)
            data_filled = np.where(valid_mask, nir_cropped, 0)

            kernel_size = request.parameters.get('kernel_size', 3)
            kernel = np.ones((kernel_size, kernel_size), np.uint8)

            data_normalized = ((data_filled - data_filled.min()) / (data_filled.max() - data_filled.min()) * 255).astype(np.uint8)
            opening = cv2.morphologyEx(data_normalized, cv2.MORPH_OPEN, kernel)

            result_data = opening.astype(np.float32) / 255.0 * (data_filled.max() - data_filled.min()) + data_filled.min()
            result_data[~valid_mask] = np.nan
            stats_description = {'operation': 'Opening', 'kernel_size': kernel_size}

        elif request.experiment_type == 'morphology_closing':
            valid_mask = ~np.isnan(nir_cropped)
            data_filled = np.where(valid_mask, nir_cropped, 0)

            kernel_size = request.parameters.get('kernel_size', 3)
            kernel = np.ones((kernel_size, kernel_size), np.uint8)

            data_normalized = ((data_filled - data_filled.min()) / (data_filled.max() - data_filled.min()) * 255).astype(np.uint8)
            closing = cv2.morphologyEx(data_normalized, cv2.MORPH_CLOSE, kernel)

            result_data = closing.astype(np.float32) / 255.0 * (data_filled.max() - data_filled.min()) + data_filled.min()
            result_data[~valid_mask] = np.nan
            stats_description = {'operation': 'Closing', 'kernel_size': kernel_size}

        elif request.experiment_type == 'threshold_binary':
            valid_mask = ~np.isnan(nir_cropped)
            data_filled = np.where(valid_mask, nir_cropped, 0)

            threshold = request.parameters.get('threshold', 0.5)

            # Normalize data
            data_normalized = (data_filled - data_filled.min()) / (data_filled.max() - data_filled.min())
            result_data = (data_normalized > threshold).astype(np.float32)
            result_data[~valid_mask] = np.nan
            stats_description = {'segmentation': 'Binary Threshold', 'threshold': threshold}

        elif request.experiment_type == 'threshold_otsu':
            valid_mask = ~np.isnan(nir_cropped)
            data_filled = np.where(valid_mask, nir_cropped, 0)

            # Normalize to 0-255
            data_normalized = ((data_filled - data_filled.min()) / (data_filled.max() - data_filled.min()) * 255).astype(np.uint8)

            threshold_value = filters.threshold_otsu(data_normalized[valid_mask])
            result_data = (data_normalized > threshold_value).astype(np.float32)
            result_data[~valid_mask] = np.nan
            stats_description = {'segmentation': 'Otsu Threshold', 'computed_threshold': float(threshold_value)}

        elif request.experiment_type == 'threshold_adaptive':
            valid_mask = ~np.isnan(nir_cropped)
            data_filled = np.where(valid_mask, nir_cropped, 0)

            # Normalize to 0-255
            data_normalized = ((data_filled - data_filled.min()) / (data_filled.max() - data_filled.min()) * 255).astype(np.uint8)

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
            timestamp=datetime.utcnow().isoformat(),
            product_used=product_path.name
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Experiment error: {str(e)}")


# ========================================
# CROP CLASSIFICATION ENDPOINTS
# ========================================

class ClassificationRequest(BaseModel):
    field_id: str
    coordinates: List[Coordinate]
    method: str  # 'supervised', 'unsupervised', 'threshold'
    crop_type: Optional[str] = 'multi'  # 'soja', 'milho', 'cafe', 'cana', 'multi'
    n_classes: int = 3
    indices: dict = {'ndvi': True, 'evi': True, 'savi': True}
    product_name: Optional[str] = None


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
async def classify_crops(request: ClassificationRequest):
    """Classify crop types in agricultural fields"""
    from datetime import datetime
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
            ndvi = processor.calculate_ndvi(red_cropped, nir_cropped)
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
            evi = processor.calculate_evi(red_cropped, nir_cropped, blue_cropped)
            indices_data.append(evi)
            indices_names.append('EVI')

        if request.indices.get('savi', True):
            if 'red_cropped' not in locals():
                red_band, red_meta = processor.read_band('B04', '10m')
                nir_band, nir_meta = processor.read_band('B08', '10m')
                red_cropped, _ = processor.crop_to_geometry(red_band, red_meta, polygon)
                nir_cropped, _ = processor.crop_to_geometry(nir_band, nir_meta, polygon)

            savi = processor.calculate_savi(red_cropped, nir_cropped)
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
            ndvi_data = indices_data[0] if indices_names[0] == 'NDVI' else indices_data[indices_names.index('NDVI')]

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
            timestamp=datetime.utcnow().isoformat(),
            product_used=product_path.name
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Classification error: {str(e)}")
