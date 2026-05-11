"""
Testes unitários do SentinelProcessor.

Cobre:
- CT-01 / RF-05: Cálculo do NDVI
- CT-02 / RF-06: Cálculo do EVI
- CT-03 / RF-10: Estatísticas descritivas
- CT-04 / RF-11: Histograma
- CT-05: Tratamento de NaN e divisão por zero
"""
import numpy as np
import pytest

from api.sentinel_processor import SentinelProcessor


@pytest.fixture
def processor():
    """
    Cria um SentinelProcessor "vazio" sem inicializar o granule.
    Permite testar métodos puros (calcular índices, estatísticas) sem precisar
    de um produto .SAFE real.
    """
    proc = SentinelProcessor.__new__(SentinelProcessor)
    return proc


class TestNDVI:
    """RF-05: Cálculo do índice NDVI"""

    def test_ndvi_in_valid_range(self, processor, synthetic_nir_band, synthetic_red_band):
        """CT-01.1: NDVI deve estar sempre no intervalo [-1, 1]"""
        ndvi = processor.calculate_ndvi(synthetic_nir_band, synthetic_red_band)
        assert ndvi.min() >= -1.0
        assert ndvi.max() <= 1.0

    def test_ndvi_healthy_vegetation_is_positive(self, processor, synthetic_nir_band, synthetic_red_band):
        """CT-01.2: Vegetação saudável (NIR alto, Red baixo) deve dar NDVI > 0.4"""
        ndvi = processor.calculate_ndvi(synthetic_nir_band, synthetic_red_band)
        assert ndvi.mean() > 0.4

    def test_ndvi_formula_correctness(self, processor):
        """CT-01.3: Verifica a fórmula (NIR-Red)/(NIR+Red) com valores conhecidos"""
        nir = np.array([[8000]], dtype=np.uint16)
        red = np.array([[2000]], dtype=np.uint16)
        # NDVI esperado = (8000-2000)/(8000+2000) = 6000/10000 = 0.6
        ndvi = processor.calculate_ndvi(nir, red)
        assert pytest.approx(ndvi[0, 0], abs=1e-6) == 0.6

    def test_ndvi_handles_division_by_zero(self, processor):
        """CT-01.4: Divisão por zero (NIR + Red = 0) deve produzir NaN, não crashar"""
        nir = np.zeros((10, 10), dtype=np.uint16)
        red = np.zeros((10, 10), dtype=np.uint16)
        ndvi = processor.calculate_ndvi(nir, red)
        # Todos os pixels devem ser NaN (denominador zero)
        assert np.all(np.isnan(ndvi))

    def test_ndvi_zero_values_when_nir_equals_red(self, processor):
        """CT-01.5: Quando NIR == Red, NDVI deve ser exatamente 0"""
        nir = np.full((5, 5), 3000, dtype=np.uint16)
        red = np.full((5, 5), 3000, dtype=np.uint16)
        ndvi = processor.calculate_ndvi(nir, red)
        assert np.allclose(ndvi, 0.0)


class TestEVI:
    """RF-06: Cálculo do índice EVI"""

    def test_evi_in_valid_range(self, processor, synthetic_nir_band, synthetic_red_band, synthetic_blue_band):
        """CT-02.1: EVI deve ser limitado ao intervalo [-1, 1]"""
        evi = processor.calculate_evi(synthetic_nir_band, synthetic_red_band, synthetic_blue_band)
        assert evi.min() >= -1.0
        assert evi.max() <= 1.0

    def test_evi_default_coefficients(self, processor):
        """CT-02.2: EVI com coeficientes padrão (G=2.5, C1=6, C2=7.5, L=1)"""
        nir = np.array([[8000.0]])
        red = np.array([[2000.0]])
        blue = np.array([[1000.0]])
        # EVI = 2.5 * (8000-2000) / (8000 + 6*2000 - 7.5*1000 + 1)
        #     = 2.5 * 6000 / 12501 = 1.1999... → clipped a 1.0
        evi = processor.calculate_evi(nir, red, blue)
        assert evi[0, 0] == pytest.approx(1.0, abs=1e-6)

    def test_evi_custom_coefficients(self, processor):
        """CT-02.3: EVI aceita coeficientes customizados"""
        nir = np.array([[5000.0]])
        red = np.array([[2000.0]])
        blue = np.array([[1000.0]])
        evi_default = processor.calculate_evi(nir, red, blue)
        evi_custom = processor.calculate_evi(nir, red, blue, G=2.0, C1=5.0, C2=6.0, L=0.5)
        # Resultados devem ser diferentes
        assert evi_default[0, 0] != evi_custom[0, 0]


class TestSAVI:
    """RF: Cálculo do índice SAVI (Soil-Adjusted Vegetation Index)"""

    def test_savi_in_valid_range(self, processor, synthetic_nir_band, synthetic_red_band):
        """CT-SAVI.1: SAVI deve ser limitado a [-1, 1]"""
        savi = processor.calculate_savi(synthetic_nir_band, synthetic_red_band)
        assert savi.min() >= -1.0
        assert savi.max() <= 1.0

    def test_savi_formula_with_default_L(self, processor):
        """CT-SAVI.2: Fórmula correta com L=0.5: ((NIR-Red)/(NIR+Red+L))*(1+L)"""
        nir = np.array([[8000.0]])
        red = np.array([[2000.0]])
        # SAVI = ((8000-2000)/(8000+2000+0.5)) * 1.5 = (6000/10000.5) * 1.5 ≈ 0.89996
        savi = processor.calculate_savi(nir, red)
        assert savi[0, 0] == pytest.approx(0.89996, abs=1e-4)

    def test_savi_with_L_zero_equals_ndvi(self, processor):
        """CT-SAVI.3: Com L=0, SAVI degenera para NDVI"""
        nir = np.array([[5000.0]])
        red = np.array([[2000.0]])
        savi_l0 = processor.calculate_savi(nir, red, L=0.0)
        ndvi = processor.calculate_ndvi(nir.astype(np.uint16), red.astype(np.uint16))
        assert savi_l0[0, 0] == pytest.approx(ndvi[0, 0], abs=1e-6)

    def test_savi_handles_zero_denominator(self, processor):
        """CT-SAVI.4: Denominador zero (com L=0) → NaN, não crash"""
        nir = np.zeros((3, 3), dtype=np.uint16)
        red = np.zeros((3, 3), dtype=np.uint16)
        savi = processor.calculate_savi(nir, red, L=0.0)
        assert np.all(np.isnan(savi))


class TestNDWI:
    """RF (extensão): Normalized Difference Water Index — bandas B03 + B08."""

    def test_ndwi_in_valid_range(self, processor):
        """CT-NDWI.1: NDWI deve ser limitado a [-1, 1]"""
        green = np.array([[3000.0, 5000.0], [1500.0, 7000.0]])
        nir = np.array([[5000.0, 3000.0], [7000.0, 1500.0]])
        ndwi = processor.calculate_ndwi(green, nir)
        assert ndwi.min() >= -1.0
        assert ndwi.max() <= 1.0

    def test_ndwi_water_is_positive(self, processor):
        """CT-NDWI.2: Pixel de água (green > nir) → valor positivo."""
        green = np.array([[5000.0]])
        nir = np.array([[2000.0]])
        ndwi = processor.calculate_ndwi(green, nir)
        # NDWI = (5000-2000)/(5000+2000) = 3000/7000 ≈ 0.4286
        assert ndwi[0, 0] == pytest.approx(0.4286, abs=1e-4)

    def test_ndwi_vegetation_is_negative(self, processor):
        """CT-NDWI.3: Pixel de vegetação (nir > green) → valor negativo."""
        green = np.array([[2000.0]])
        nir = np.array([[5000.0]])
        ndwi = processor.calculate_ndwi(green, nir)
        assert ndwi[0, 0] < 0

    def test_ndwi_handles_zero_denominator(self, processor):
        """CT-NDWI.4: Green = NIR = 0 → NaN."""
        green = np.zeros((2, 2))
        nir = np.zeros((2, 2))
        ndwi = processor.calculate_ndwi(green, nir)
        assert np.all(np.isnan(ndwi))


class TestNDBI:
    """RF (extensão): Normalized Difference Built-up Index — B11 + B08."""

    def test_ndbi_in_valid_range(self, processor):
        """CT-NDBI.1: NDBI deve ser limitado a [-1, 1]"""
        swir = np.array([[4000.0, 6000.0], [2000.0, 8000.0]])
        nir = np.array([[6000.0, 4000.0], [8000.0, 2000.0]])
        ndbi = processor.calculate_ndbi(swir, nir)
        assert ndbi.min() >= -1.0
        assert ndbi.max() <= 1.0

    def test_ndbi_builtup_is_positive(self, processor):
        """CT-NDBI.2: Pixel de área construída (swir > nir) → positivo."""
        swir = np.array([[5000.0]])
        nir = np.array([[2000.0]])
        ndbi = processor.calculate_ndbi(swir, nir)
        # NDBI = (5000-2000)/(5000+2000) = 3000/7000 ≈ 0.4286
        assert ndbi[0, 0] == pytest.approx(0.4286, abs=1e-4)

    def test_ndbi_vegetation_is_negative(self, processor):
        """CT-NDBI.3: Vegetação (nir > swir) → negativo."""
        swir = np.array([[2000.0]])
        nir = np.array([[5000.0]])
        ndbi = processor.calculate_ndbi(swir, nir)
        assert ndbi[0, 0] < 0


class TestStatistics:
    """RF-10: Estatísticas descritivas"""

    def test_statistics_all_keys_present(self, processor, healthy_vegetation_ndvi):
        """CT-03.1: Resultado deve conter min, max, mean, median, std, count"""
        stats = processor.calculate_statistics(healthy_vegetation_ndvi)
        for key in ['min', 'max', 'mean', 'median', 'std', 'count']:
            assert key in stats

    def test_statistics_correct_values(self, processor):
        """CT-03.2: Valores estatísticos devem estar matematicamente corretos"""
        data = np.array([[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]], dtype=np.float32)
        stats = processor.calculate_statistics(data)
        assert stats['min'] == pytest.approx(0.1, abs=1e-6)
        assert stats['max'] == pytest.approx(0.6, abs=1e-6)
        assert stats['mean'] == pytest.approx(0.35, abs=1e-6)
        assert stats['count'] == 6

    def test_statistics_ignores_nan(self, processor, ndvi_with_nans):
        """CT-03.3: NaN devem ser excluídos do cálculo (count menor que total)"""
        stats = processor.calculate_statistics(ndvi_with_nans)
        # Array tem 20*20 = 400 pixels; 5 colunas de 20 = 100 pixels NaN; 300 válidos
        assert stats['count'] == 300
        assert stats['mean'] == pytest.approx(0.6, abs=1e-3)

    def test_statistics_empty_data(self, processor):
        """CT-03.4: Array totalmente NaN não deve crashar; deve retornar zeros"""
        empty = np.full((10, 10), np.nan, dtype=np.float32)
        stats = processor.calculate_statistics(empty)
        assert stats['count'] == 0
        assert stats['mean'] == 0.0


class TestHistogram:
    """RF-11: Geração de histograma"""

    def test_histogram_default_50_bins(self, processor, healthy_vegetation_ndvi):
        """CT-04.1: Padrão de 50 bins (RF-11)"""
        bins, counts = processor.calculate_histogram(healthy_vegetation_ndvi)
        assert len(counts) == 50
        assert len(bins) == 50  # Borda esquerda de cada bin

    def test_histogram_custom_bins(self, processor, healthy_vegetation_ndvi):
        """CT-04.2: Aceita número customizado de bins"""
        bins, counts = processor.calculate_histogram(healthy_vegetation_ndvi, bins=10)
        assert len(counts) == 10

    def test_histogram_total_count_matches(self, processor, healthy_vegetation_ndvi):
        """CT-04.3: Soma dos counts deve igualar total de pixels válidos"""
        _, counts = processor.calculate_histogram(healthy_vegetation_ndvi)
        assert sum(counts) == healthy_vegetation_ndvi.size

    def test_histogram_empty_data(self, processor):
        """CT-04.4: Array vazio (todo NaN) deve retornar listas vazias"""
        empty = np.full((5, 5), np.nan, dtype=np.float32)
        bins, counts = processor.calculate_histogram(empty)
        assert len(bins) == 0
        assert len(counts) == 0


class TestEdgeCases:
    """CT-05: Casos de borda"""

    def test_integer_to_float_conversion(self, processor):
        """CT-05.1: NDVI converte uint16 para float32 (evita divisão inteira)"""
        nir = np.full((3, 3), 8000, dtype=np.uint16)
        red = np.full((3, 3), 2000, dtype=np.uint16)
        ndvi = processor.calculate_ndvi(nir, red)
        assert ndvi.dtype == np.float32

    def test_negative_ndvi_for_water(self, processor):
        """CT-05.2: Água (NIR baixo, Red alto) deve dar NDVI negativo"""
        nir = np.full((3, 3), 500, dtype=np.uint16)  # Água absorve NIR
        red = np.full((3, 3), 2000, dtype=np.uint16)
        ndvi = processor.calculate_ndvi(nir, red)
        assert np.all(ndvi < 0)
