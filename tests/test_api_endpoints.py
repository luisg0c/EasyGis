"""
Testes de integração dos endpoints da API.

Cobre:
- CT-06 / RF-20: GET /health
- CT-07: GET / (raiz)
- CT-08 / RF-04: GET /products
- CT-09: Validação de entrada do POST /calculate-index (Pydantic)
- CT-10: Tratamento de erros 404/500
"""
from fastapi.testclient import TestClient
import pytest

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
        """CT-09.3: index_type desconhecido deve retornar erro
        (404 se não houver produto, 400/500 se houver mas índice inválido)"""
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
        # Sem produtos no diretório, retorna 404. Com produtos, retornaria 400.
        assert response.status_code in (400, 404, 500)


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
