"""
Sentinel-2 Image Processor
Handles reading JP2 files and calculating spectral indices
"""
import numpy as np
import rasterio
from pathlib import Path
from typing import Dict, Tuple, Optional
from shapely.geometry import Polygon, mapping
from rasterio.mask import mask
from rasterio.warp import calculate_default_transform, reproject, Resampling


class SentinelProcessor:
    def __init__(self, safe_path: str):
        """
        Initialize processor with path to Sentinel-2 SAFE product

        Args:
            safe_path: Path to .SAFE directory
        """
        self.safe_path = Path(safe_path)
        self.granule_path = self._find_granule_path()

    def _find_granule_path(self) -> Path:
        """Find the granule directory within SAFE structure"""
        granule_dir = self.safe_path / "GRANULE"
        granules = list(granule_dir.glob("L2A_*"))
        if not granules:
            raise ValueError(f"No granule found in {granule_dir}")
        return granules[0]

    def _get_band_path(self, band: str, resolution: str = "10m") -> Path:
        """
        Get path to specific band file

        Args:
            band: Band name (e.g., 'B04', 'B08')
            resolution: Resolution folder ('10m', '20m', '60m')
        """
        img_data_path = self.granule_path / "IMG_DATA" / f"R{resolution}"
        band_files = list(img_data_path.glob(f"*_{band}_{resolution}.jp2"))

        if not band_files:
            raise FileNotFoundError(f"Band {band} at {resolution} not found")

        return band_files[0]

    def read_band(self, band: str, resolution: str = "10m") -> Tuple[np.ndarray, dict]:
        """
        Read a spectral band from JP2 file

        Args:
            band: Band name (e.g., 'B04', 'B08')
            resolution: Resolution ('10m', '20m', '60m')

        Returns:
            Tuple of (band_data, metadata)
        """
        band_path = self._get_band_path(band, resolution)

        with rasterio.open(band_path) as src:
            data = src.read(1)
            metadata = {
                'crs': src.crs,
                'transform': src.transform,
                'width': src.width,
                'height': src.height,
                'bounds': src.bounds,
            }

        return data, metadata

    def crop_to_geometry(
        self,
        band_data: np.ndarray,
        metadata: dict,
        geometry: Polygon
    ) -> Tuple[np.ndarray, dict]:
        """
        Crop band data to a polygon geometry

        Args:
            band_data: Input band array
            metadata: Band metadata with CRS and transform
            geometry: Shapely Polygon in WGS84 (EPSG:4326)

        Returns:
            Tuple of (cropped_data, updated_metadata)
        """
        from rasterio.io import MemoryFile
        from pyproj import Transformer
        from shapely.ops import transform

        # Reproject geometry from WGS84 to image CRS
        transformer = Transformer.from_crs("EPSG:4326", metadata['crs'], always_xy=True)

        def transform_coords(x, y, z=None):
            return transformer.transform(x, y)

        geometry_projected = transform(transform_coords, geometry)

        with MemoryFile() as memfile:
            with memfile.open(
                driver='GTiff',
                height=metadata['height'],
                width=metadata['width'],
                count=1,
                dtype=band_data.dtype,
                crs=metadata['crs'],
                transform=metadata['transform'],
            ) as dataset:
                dataset.write(band_data, 1)

                # Crop to reprojected geometry
                geom_dict = mapping(geometry_projected)
                cropped_data, cropped_transform = mask(
                    dataset,
                    [geom_dict],
                    crop=True,
                    filled=True,
                    nodata=0
                )

                cropped_metadata = metadata.copy()
                cropped_metadata['transform'] = cropped_transform
                cropped_metadata['height'] = cropped_data.shape[1]
                cropped_metadata['width'] = cropped_data.shape[2]

        return cropped_data[0], cropped_metadata

    def calculate_ndvi(
        self,
        nir_band: np.ndarray,
        red_band: np.ndarray
    ) -> np.ndarray:
        """
        Calculate NDVI from NIR and Red bands

        NDVI = (NIR - Red) / (NIR + Red)

        Args:
            nir_band: Near-infrared band (B08)
            red_band: Red band (B04)

        Returns:
            NDVI array with values between -1 and 1
        """
        # Convert to float to avoid integer division
        nir = nir_band.astype(np.float32)
        red = red_band.astype(np.float32)

        # Avoid division by zero
        denominator = nir + red
        denominator[denominator == 0] = np.nan

        ndvi = (nir - red) / denominator

        # Clip values to valid range
        ndvi = np.clip(ndvi, -1, 1)

        return ndvi

    def calculate_evi(
        self,
        nir_band: np.ndarray,
        red_band: np.ndarray,
        blue_band: np.ndarray,
        G: float = 2.5,
        C1: float = 6.0,
        C2: float = 7.5,
        L: float = 1.0
    ) -> np.ndarray:
        """
        Calculate EVI (Enhanced Vegetation Index)

        EVI = G * ((NIR - Red) / (NIR + C1 * Red - C2 * Blue + L))
        """
        nir = nir_band.astype(np.float32)
        red = red_band.astype(np.float32)
        blue = blue_band.astype(np.float32)

        denominator = nir + C1 * red - C2 * blue + L
        denominator[denominator == 0] = np.nan

        evi = G * ((nir - red) / denominator)
        evi = np.clip(evi, -1, 1)

        return evi

    def calculate_savi(
        self,
        nir_band: np.ndarray,
        red_band: np.ndarray,
        L: float = 0.5,
    ) -> np.ndarray:
        """
        Calculate SAVI (Soil Adjusted Vegetation Index).

        SAVI = ((NIR - Red) / (NIR + Red + L)) * (1 + L)

        Args:
            nir_band: Near-infrared band (B08).
            red_band: Red band (B04).
            L: Soil-brightness correction factor (0 = NDVI; 0.5 default for moderate cover; 1 = very low cover).

        Returns:
            SAVI array clipped to [-1, 1].
        """
        nir = nir_band.astype(np.float32)
        red = red_band.astype(np.float32)

        denominator = nir + red + L
        denominator[denominator == 0] = np.nan

        savi = ((nir - red) / denominator) * (1.0 + L)
        savi = np.clip(savi, -1, 1)

        return savi

    def calculate_statistics(self, data: np.ndarray) -> Dict[str, float]:
        """
        Calculate statistics for index array

        Args:
            data: Index array (e.g., NDVI)

        Returns:
            Dictionary with min, max, mean, median, std
        """
        valid_data = data[~np.isnan(data)]

        if len(valid_data) == 0:
            return {
                'min': 0.0,
                'max': 0.0,
                'mean': 0.0,
                'median': 0.0,
                'std': 0.0,
                'count': 0
            }

        return {
            'min': float(np.min(valid_data)),
            'max': float(np.max(valid_data)),
            'mean': float(np.mean(valid_data)),
            'median': float(np.median(valid_data)),
            'std': float(np.std(valid_data)),
            'count': int(len(valid_data))
        }

    def calculate_histogram(
        self,
        data: np.ndarray,
        bins: int = 50
    ) -> Tuple[np.ndarray, np.ndarray]:
        """
        Calculate histogram of index values

        Args:
            data: Index array
            bins: Number of histogram bins

        Returns:
            Tuple of (bin_edges, counts)
        """
        valid_data = data[~np.isnan(data)]

        if len(valid_data) == 0:
            return np.array([]), np.array([])

        counts, bin_edges = np.histogram(valid_data, bins=bins)

        return bin_edges[:-1].tolist(), counts.tolist()
