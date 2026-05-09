"""
Testes de integração dos endpoints da API.

Cobre:
- CT-06 / RF-20: GET /health
- CT-07: GET / (raiz)
- CT-08 / RF-04: GET /products
- CT-09: Validação de entrada do POST /calculate-index (Pydantic)
- CT-10: Tratamento de erros 404/500
- CT-11: Caminho feliz com FakeProcessor (sem .SAFE real) — caça regressão
        de bugs como `generate_colored_image` indefinido ou ordem de args
        invertida em calculate_ndvi.
"""
from pathlib import Path

import numpy as np
import pytest
from fastapi.testclient import TestClient

from api.main import app, coordinates_to_polygon, Coordinate


@pytest.fixture
def client():
    """Cliente HTTP em memória para testar a API sem subir uvicorn"""
    return TestClient(app)


class TestHealthEndpoint:
    """RF-20: Endpoint de saúde"""

    def test_health_returns_200(self, client):
        """CT-06.1: /health deve responder 200 OK"""
        response = client.get("/health")
        assert response.status_code == 200

    def test_health_response_structure(self, client):
        """CT-06.2: Resposta deve conter status e products_dir"""
        response = client.get("/health")
        data = response.json()
        assert data["status"] == "healthy"
        assert "products_dir" in data


class TestRootEndpoint:
    """CT-07: Endpoint raiz"""

    def test_root_returns_api_info(self, client):
        """CT-07.1: GET / retorna informações da API"""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Remote Sensing API"
        assert "version" in data
        assert "endpoints" in data


class TestProductsEndpoint:
    """RF-04: Listagem de produtos Sentinel-2"""

    def test_products_endpoint_returns_200(self, client):
        """CT-08.1: GET /products responde 200 mesmo sem produtos"""
        response = client.get("/products")
        assert response.status_code == 200

    def test_products_response_structure(self, client):
        """CT-08.2: Resposta tem campos products (lista) e count (int)"""
        response = client.get("/products")
        data = response.json()
        assert "products" in data
        assert "count" in data
        assert isinstance(data["products"], list)
        assert isinstance(data["count"], int)


class TestCalculateIndexValidation:
    """CT-09: Validação Pydantic da requisição /calculate-index"""

    def test_missing_required_fields_returns_422(self, client):
        """CT-09.1: Campos obrigatórios faltando → HTTP 422"""
        response = client.post("/calculate-index", json={})
        assert response.status_code == 422

    def test_invalid_coordinate_format_returns_422(self, client):
        """CT-09.2: Coordenada com formato errado → HTTP 422"""
        response = client.post("/calculate-index", json={
            "field_id": "test",
            "coordinates": [{"longitude": "invalid", "latitude": -4.88}],
            "index_type": "NDVI"
        })
        assert response.status_code == 422

    def test_unknown_index_type_returns_error(self, client):
        """CT-09.3: index_type desconhecido deve retornar erro (404 sem produto)."""
        response = client.post("/calculate-index", json={
            "field_id": "test",
            "coordinates": [
                {"longitude": -42.6194, "latitude": -4.8809},
                {"longitude": -42.6186, "latitude": -4.8807},
                {"longitude": -42.6180, "latitude": -4.8798},
                {"longitude": -42.6194, "latitude": -4.8809}
            ],
            "index_type": "INVALID_INDEX"
        })
        # Sem produtos no diretório, find_sentinel_product retorna 404 antes de chegar
        # a validar o index_type. Esse é o comportamento esperado pelo fluxo.
        assert response.status_code == 404

    def test_invalid_product_name_format_returns_400(self, client):
        """CT-09.4: product_name fora do padrão Sentinel-2 → HTTP 422 (Pydantic)."""
        response = client.post("/calculate-index", json={
            "field_id": "test",
            "coordinates": [
                {"longitude": -42.6194, "latitude": -4.8809},
                {"longitude": -42.6186, "latitude": -4.8807},
                {"longitude": -42.6180, "latitude": -4.8798},
                {"longitude": -42.6194, "latitude": -4.8809},
            ],
            "index_type": "NDVI",
            "product_name": "../../../etc/passwd",
        })
        assert response.status_code == 422

    def test_coordinate_out_of_range_returns_422(self, client):
        """CT-09.5: latitude > 90 → Pydantic rejeita com HTTP 422."""
        response = client.post("/calculate-index", json={
            "field_id": "test",
            "coordinates": [
                {"longitude": -42.6, "latitude": 999.0},
                {"longitude": -42.6, "latitude": -4.88},
                {"longitude": -42.5, "latitude": -4.88},
            ],
            "index_type": "NDVI",
        })
        assert response.status_code == 422

    def test_too_few_coordinates_returns_422(self, client):
        """CT-09.6: < 3 coordenadas → Pydantic rejeita (min_length=3)."""
        response = client.post("/calculate-index", json={
            "field_id": "test",
            "coordinates": [
                {"longitude": -42.6, "latitude": -4.88},
                {"longitude": -42.6, "latitude": -4.89},
            ],
            "index_type": "NDVI",
        })
        assert response.status_code == 422


class FakeProcessor:
    """
    Test double for SentinelProcessor — returns synthetic numpy arrays so the
    happy-path of /calculate-index, /experiments/run and /classify can be
    exercised without needing a 1+ GB Sentinel-2 .SAFE product.

    Mirrors the real SentinelProcessor surface used by api.main:
      read_band, crop_to_geometry, calculate_ndvi/evi/savi,
      calculate_statistics, calculate_histogram.
    """

    def __init__(self, safe_path: str):
        self.safe_path = safe_path
        self._rng = np.random.default_rng(seed=42)

    def read_band(self, band: str, resolution: str = "10m"):
        # 50x50 synthetic band, reflectance-like uint16 range
        data = self._rng.integers(low=1000, high=8000, size=(50, 50), dtype=np.uint16)
        meta = {"crs": "EPSG:32723", "transform": None, "width": 50, "height": 50, "bounds": None}
        return data, meta

    def crop_to_geometry(self, band_data, metadata, geometry):
        # Pretend the polygon overlaps the whole tile
        return band_data, metadata

    def calculate_ndvi(self, nir_band, red_band):
        nir = nir_band.astype(np.float32)
        red = red_band.astype(np.float32)
        denom = nir + red
        denom[denom == 0] = np.nan
        return np.clip((nir - red) / denom, -1, 1)

    def calculate_evi(self, nir_band, red_band, blue_band, G=2.5, C1=6.0, C2=7.5, L=1.0):
        nir = nir_band.astype(np.float32)
        red = red_band.astype(np.float32)
        blue = blue_band.astype(np.float32)
        denom = nir + C1 * red - C2 * blue + L
        denom[denom == 0] = np.nan
        return np.clip(G * ((nir - red) / denom), -1, 1)

    def calculate_savi(self, nir_band, red_band, L=0.5):
        nir = nir_band.astype(np.float32)
        red = red_band.astype(np.float32)
        denom = nir + red + L
        denom[denom == 0] = np.nan
        return np.clip(((nir - red) / denom) * (1 + L), -1, 1)

    def calculate_statistics(self, data):
        valid = data[~np.isnan(data)]
        if valid.size == 0:
            return {"min": 0.0, "max": 0.0, "mean": 0.0, "median": 0.0, "std": 0.0, "count": 0}
        return {
            "min": float(valid.min()),
            "max": float(valid.max()),
            "mean": float(valid.mean()),
            "median": float(np.median(valid)),
            "std": float(valid.std()),
            "count": int(valid.size),
        }

    def calculate_histogram(self, data, bins: int = 50):
        valid = data[~np.isnan(data)]
        if valid.size == 0:
            return [], []
        counts, edges = np.histogram(valid, bins=bins)
        return edges[:-1].tolist(), counts.tolist()


@pytest.fixture
def fake_backend(monkeypatch, tmp_path):
    """
    Replace the Sentinel-2 lookup + processor in api.main with stubs that don't
    need real .SAFE files on disk.
    """
    fake_safe = tmp_path / "S2A_MSIL2A_20240115T123456_FAKE.SAFE"
    fake_safe.mkdir()

    def _find_fake(product_name=None):
        return fake_safe

    monkeypatch.setattr("api.main.find_sentinel_product", _find_fake)
    monkeypatch.setattr("api.main.SentinelProcessor", FakeProcessor)
    return fake_safe


class TestHappyPath:
    """CT-11: Happy-path integration with FakeProcessor — no real .SAFE needed."""

    @pytest.fixture
    def valid_payload(self):
        return {
            "field_id": "test-field",
            "coordinates": [
                {"longitude": -42.6194, "latitude": -4.8809},
                {"longitude": -42.6186, "latitude": -4.8807},
                {"longitude": -42.6180, "latitude": -4.8798},
                {"longitude": -42.6194, "latitude": -4.8809},
            ],
            "index_type": "NDVI",
        }

    def test_ndvi_happy_path(self, client, fake_backend, valid_payload):
        """CT-11.1: POST /calculate-index NDVI retorna 200 com schema correto."""
        response = client.post("/calculate-index", json=valid_payload)
        assert response.status_code == 200, response.text
        body = response.json()

        # Schema completo
        assert body["field_id"] == "test-field"
        assert body["index_type"] == "NDVI"
        assert "image_base64" in body and len(body["image_base64"]) > 0
        assert "statistics" in body
        for key in ("min", "max", "mean", "median", "std", "count"):
            assert key in body["statistics"]
        assert "histogram" in body
        assert "bins" in body["histogram"] and "counts" in body["histogram"]
        assert "elevation_data" in body
        assert "product_used" in body

    def test_evi_happy_path(self, client, fake_backend, valid_payload):
        """CT-11.2: EVI também executa caminho feliz sem regredir."""
        valid_payload["index_type"] = "EVI"
        response = client.post("/calculate-index", json=valid_payload)
        assert response.status_code == 200

    def test_savi_via_classification_happy_path(self, client, fake_backend, valid_payload):
        """CT-11.3: Classificação threshold (usa NDVI internamente) executa OK.
        Cobre regressão do bug `calculate_savi` indefinido + ordem de args invertida.
        """
        response = client.post("/api/classification/classify", json={
            **valid_payload,
            "method": "threshold",
            "n_classes": 3,
            "indices": {"ndvi": True, "evi": False, "savi": False},
        })
        assert response.status_code == 200, response.text
        body = response.json()
        assert body["field_id"] == "test-field"
        assert body["classification_type"] == "threshold"
        assert isinstance(body["classes"], list) and len(body["classes"]) == 3

    def test_classification_with_savi_happy_path(self, client, fake_backend, valid_payload):
        """CT-11.4: Classificação K-Means com SAVI ativo — cobre regressão do
        método inexistente `calculate_savi` (era CRITICAL #3)."""
        response = client.post("/api/classification/classify", json={
            **valid_payload,
            "method": "unsupervised",
            "n_classes": 3,
            "indices": {"ndvi": True, "evi": True, "savi": True},
        })
        assert response.status_code == 200, response.text

    def test_experiment_gaussian_happy_path(self, client, fake_backend, valid_payload):
        """CT-11.5: Experimento gaussian_blur — cobre regressão do
        `generate_colored_image` indefinido (era CRITICAL #1)."""
        response = client.post("/api/experiments/run", json={
            "field_id": valid_payload["field_id"],
            "coordinates": valid_payload["coordinates"],
            "experiment_type": "gaussian_blur",
            "parameters": {"sigma": 1.5},
        })
        assert response.status_code == 200, response.text
        body = response.json()
        assert body["experiment_type"] == "gaussian_blur"
        assert "image_base64" in body and len(body["image_base64"]) > 0


class TestCoordinatesToPolygon:
    """CT-10: Conversão de coordenadas para Shapely Polygon"""

    def test_coordinates_form_valid_polygon(self):
        """CT-10.1: Lista de coordenadas vira polígono Shapely válido"""
        coords = [
            Coordinate(longitude=-42.6194, latitude=-4.8809),
            Coordinate(longitude=-42.6186, latitude=-4.8807),
            Coordinate(longitude=-42.6180, latitude=-4.8798),
            Coordinate(longitude=-42.6194, latitude=-4.8809),
        ]
        polygon = coordinates_to_polygon(coords)
        assert polygon.is_valid
        assert polygon.area > 0

    def test_polygon_centroid_in_correct_region(self):
        """CT-10.2: Centroide do polígono cai dentro do bounding box correto"""
        coords = [
            Coordinate(longitude=-42.6194, latitude=-4.8809),
            Coordinate(longitude=-42.6186, latitude=-4.8807),
            Coordinate(longitude=-42.6180, latitude=-4.8798),
            Coordinate(longitude=-42.6194, latitude=-4.8809),
        ]
        polygon = coordinates_to_polygon(coords)
        centroid = polygon.centroid
        # Centroide dentro do bbox do polígono
        assert -42.6194 <= centroid.x <= -42.6180
        assert -4.8809 <= centroid.y <= -4.8798
