"""
Fixtures compartilhadas entre os testes.

Cria arrays sintéticos para que os testes rodem sem depender de produtos
Sentinel-2 reais (que ocupam GB e não cabem no repositório).
"""
import numpy as np
import pytest
from shapely.geometry import Polygon


@pytest.fixture
def synthetic_nir_band() -> np.ndarray:
    """
    Banda NIR sintética 100x100 — vegetação saudável (valores altos).
    Sentinel-2 trabalha com reflectância em escala 0-10000.
    """
    rng = np.random.default_rng(seed=42)
    return rng.integers(low=3000, high=8000, size=(100, 100), dtype=np.uint16)


@pytest.fixture
def synthetic_red_band() -> np.ndarray:
    """Banda Red sintética 100x100 — valores baixos (vegetação saudável reflete pouco vermelho)."""
    rng = np.random.default_rng(seed=43)
    return rng.integers(low=500, high=2000, size=(100, 100), dtype=np.uint16)


@pytest.fixture
def synthetic_blue_band() -> np.ndarray:
    """Banda Blue sintética."""
    rng = np.random.default_rng(seed=44)
    return rng.integers(low=400, high=1500, size=(100, 100), dtype=np.uint16)


@pytest.fixture
def healthy_vegetation_ndvi() -> np.ndarray:
    """Array NDVI já calculado representando vegetação saudável (média ~0.7)."""
    rng = np.random.default_rng(seed=42)
    return rng.uniform(low=0.55, high=0.85, size=(50, 50)).astype(np.float32)


@pytest.fixture
def stressed_vegetation_ndvi() -> np.ndarray:
    """Array NDVI representando vegetação estressada (média ~0.25)."""
    rng = np.random.default_rng(seed=42)
    return rng.uniform(low=0.10, high=0.40, size=(50, 50)).astype(np.float32)


@pytest.fixture
def ndvi_with_nans() -> np.ndarray:
    """Array NDVI com regiões NaN (área fora do talhão)."""
    arr = np.full((20, 20), 0.6, dtype=np.float32)
    # Torna os 5 primeiros pixels de cada linha NaN (simulando bordas do polígono)
    arr[:, :5] = np.nan
    return arr


@pytest.fixture
def sample_polygon() -> Polygon:
    """Polígono pequeno em Picos, Piauí (mesma região do talhão de exemplo)."""
    return Polygon([
        (-42.6194, -4.8809),
        (-42.6186, -4.8807),
        (-42.6180, -4.8798),
        (-42.6177, -4.8798),
        (-42.6175, -4.8797),
        (-42.6171, -4.8794),
        (-42.6165, -4.8793),
        (-42.6161, -4.8786),
        (-42.6171, -4.8780),
        (-42.6174, -4.8780),
        (-42.6177, -4.8787),
        (-42.6183, -4.8784),
        (-42.6194, -4.8809),
    ])


@pytest.fixture
def sample_kml_content() -> str:
    """Conteúdo KML mínimo válido para testes."""
    return """<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document id="test-doc">
    <Placemark id="test-placemark">
      <name>Test Field</name>
      <Polygon>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>
              -42.6194,-4.8809,0 -42.6186,-4.8807,0 -42.6180,-4.8798,0 -42.6194,-4.8809,0
            </coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>
  </Document>
</kml>"""
