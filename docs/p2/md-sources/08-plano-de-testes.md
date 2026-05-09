# Plano de Testes

## ICEV Remote Sensing Software

**Versão:** 1.0
**Data:** 09/05/2026
**Projeto:** ICEV Remote Sensing Software — Avaliação P2

---

## 1. Objetivo

Definir a estratégia, escopo e casos de teste para validar o MVP do sistema, com foco nos requisitos funcionais críticos de processamento de imagens Sentinel-2 (NDVI, EVI, estatísticas) e nos endpoints HTTP da API.

---

## 2. Escopo

### 2.1 No escopo
- **Cálculo de índices espectrais** (NDVI, EVI) — funções puras do `SentinelProcessor`
- **Estatísticas e histograma** — agregações sobre arrays NumPy
- **Endpoints HTTP** — `/`, `/health`, `/products`, validação de entrada de `/calculate-index`
- **Conversão de coordenadas** — geração de polígonos Shapely a partir de coordenadas geográficas
- **Tratamento de casos de borda** — divisão por zero, NaN, arrays vazios

### 2.2 Fora do escopo
- **Integração com produto Sentinel-2 real** — exigiria download de ~1 GB de dados; testado manualmente na demonstração.
- **Testes de UI** (frontend Next.js) — fora do escopo da entrega P2 acordado com o professor; testes manuais via demonstração.
- **Performance e carga** — sistema é local, single-user; não há requisito de carga.
- **Endpoints `/api/experiments/run` e `/api/classification/classify`** — exigem produto Sentinel-2 real para teste end-to-end. Validação por inspeção manual.

---

## 3. Estratégia de Teste

### 3.1 Níveis
| Nível | Ferramenta | Cobertura Pretendida |
|-------|------------|----------------------|
| **Unitário** | pytest | Funções puras de `sentinel_processor.py` (cálculo de índices, estatísticas) |
| **Integração** | pytest + `fastapi.testclient.TestClient` | Endpoints HTTP, validação Pydantic |
| **Manual** | Demonstração ao vivo | Fluxo completo end-to-end com produto Sentinel-2 e KML real |

### 3.2 Abordagem
- **Caixa branca** nas funções de cálculo: validação contra resultados matemáticos conhecidos.
- **Caixa preta** nos endpoints: requisições HTTP com payloads válidos/inválidos, verificação de status code e estrutura de resposta.
- **Fixtures sintéticas** (NumPy) substituem o I/O de imagens reais, permitindo execução rápida (<1s) e reprodutível.

### 3.3 Critérios de aceitação
- 100% dos casos de teste planejados executados.
- Taxa de sucesso ≥ 95%.
- Falhas analisadas e documentadas no Relatório de Testes ([09-relatorio-de-testes.md](09-relatorio-de-testes.md)).

---

## 4. Ambiente de Teste

| Item | Especificação |
|------|---------------|
| Sistema operacional | macOS 15 (Darwin 25.4.0) |
| Python | 3.12.13 |
| pytest | 9.0.3 |
| Gerenciador de pacotes | uv 0.11.3 |
| Dependências | `pyproject.toml` grupo `[dependency-groups.dev]` |

**Comando de execução:**
```bash
uv sync --group dev
uv run pytest tests/ -v --cov=api --cov-report=term-missing
```

---

## 5. Casos de Teste

### Convenção de identificação
- `CT-XX.Y` → Caso de teste número XX, sub-caso Y
- Vinculado ao requisito funcional correspondente em [03-especificacao-requisitos-SRS.md](03-especificacao-requisitos-SRS.md)

### 5.1 RF-05 — Cálculo de NDVI

| ID | Caso | Pré-condições | Entrada | Resultado Esperado |
|----|------|---------------|---------|--------------------|
| CT-01.1 | NDVI no intervalo válido | Bandas NIR e Red sintéticas (uint16, 100×100) | `calculate_ndvi(nir, red)` | Array com `min ≥ -1` e `max ≤ 1` |
| CT-01.2 | Vegetação saudável produz NDVI alto | NIR alto (3000–8000), Red baixo (500–2000) | Idem | `mean > 0.4` |
| CT-01.3 | Fórmula matemática correta | NIR = 8000, Red = 2000 | Idem | NDVI = 0.6 (= 6000/10000) com tolerância 1e-6 |
| CT-01.4 | Tratamento de divisão por zero | NIR = 0, Red = 0 | Idem | Todos os pixels são NaN (não crash) |
| CT-01.5 | NDVI zero quando NIR == Red | NIR = Red = 3000 | Idem | NDVI ≈ 0.0 |

### 5.2 RF-06 — Cálculo de EVI

| ID | Caso | Entrada | Resultado Esperado |
|----|------|---------|--------------------|
| CT-02.1 | EVI no intervalo válido | NIR, Red, Blue sintéticos | `min ≥ -1` e `max ≤ 1` (clipping aplicado) |
| CT-02.2 | Coeficientes padrão | NIR=8000, Red=2000, Blue=1000 (G=2.5, C1=6, C2=7.5, L=1) | EVI clipado em 1.0 |
| CT-02.3 | Coeficientes customizados produzem resultado diferente | Mesmas bandas, G=2.0 vs G=2.5 | Resultados numericamente diferentes |

### 5.3 RF-10 — Estatísticas Descritivas

| ID | Caso | Entrada | Resultado Esperado |
|----|------|---------|--------------------|
| CT-03.1 | Todas as chaves presentes | Array NDVI 50×50 | Dict contém `min, max, mean, median, std, count` |
| CT-03.2 | Valores matematicamente corretos | `[[0.1,0.2,0.3],[0.4,0.5,0.6]]` | min=0.1, max=0.6, mean=0.35, count=6 |
| CT-03.3 | NaN ignorados no cálculo | Array 20×20 com 100 NaN | count = 300 (= 400 − 100) |
| CT-03.4 | Array totalmente NaN | Array 10×10 todo NaN | count = 0, mean = 0.0 (sem crash) |

### 5.4 RF-11 — Histograma

| ID | Caso | Entrada | Resultado Esperado |
|----|------|---------|--------------------|
| CT-04.1 | Padrão 50 bins | Array NDVI saudável | `len(counts) == 50` e `len(bins) == 50` |
| CT-04.2 | Bins customizados | `bins=10` | `len(counts) == 10` |
| CT-04.3 | Soma de counts = total de pixels | Array 50×50 | `sum(counts) == 2500` |
| CT-04.4 | Array vazio | Array 5×5 todo NaN | Listas vazias retornadas (sem crash) |

### 5.5 CT-05 — Casos de Borda

| ID | Caso | Entrada | Resultado Esperado |
|----|------|---------|--------------------|
| CT-05.1 | Conversão uint16 → float32 | NIR e Red como uint16 | `ndvi.dtype == np.float32` (evita divisão inteira) |
| CT-05.2 | NDVI negativo para água | NIR=500, Red=2000 (água) | Todos os pixels < 0 |

### 5.6 RF-20 — Endpoint /health

| ID | Caso | Requisição | Resultado Esperado |
|----|------|-----------|--------------------|
| CT-06.1 | Health responde 200 | `GET /health` | HTTP 200 |
| CT-06.2 | Estrutura da resposta | `GET /health` | JSON com `status: "healthy"` e `products_dir: bool` |

### 5.7 CT-07 — Endpoint Raiz

| ID | Caso | Requisição | Resultado Esperado |
|----|------|-----------|--------------------|
| CT-07.1 | Raiz retorna info da API | `GET /` | JSON com `message`, `version`, `endpoints` |

### 5.8 RF-04 — Listagem de Produtos

| ID | Caso | Requisição | Resultado Esperado |
|----|------|-----------|--------------------|
| CT-08.1 | Endpoint responde 200 mesmo sem produtos | `GET /products` | HTTP 200 |
| CT-08.2 | Estrutura JSON correta | `GET /products` | `products` (lista) e `count` (int) |

### 5.9 CT-09 — Validação de Entrada (Pydantic)

| ID | Caso | Requisição | Resultado Esperado |
|----|------|-----------|--------------------|
| CT-09.1 | Campos obrigatórios faltando | `POST /calculate-index` com body vazio | HTTP 422 |
| CT-09.2 | Tipo de coordenada inválido | longitude="invalid" (string) | HTTP 422 |
| CT-09.3 | index_type desconhecido | index_type="INVALID_INDEX" | HTTP 400/404/500 (erro reportado) |

### 5.10 CT-10 — Conversão de Coordenadas para Polígono

| ID | Caso | Entrada | Resultado Esperado |
|----|------|---------|--------------------|
| CT-10.1 | Polígono Shapely válido | 4 coordenadas formando triângulo fechado | `polygon.is_valid == True`, `area > 0` |
| CT-10.2 | Centroide dentro do bbox | Coordenadas em Picos-PI | `-42.6194 ≤ centroid.x ≤ -42.6180` e `-4.8809 ≤ centroid.y ≤ -4.8798` |

---

## 6. Matriz de Rastreabilidade Requisito × Caso de Teste

| Requisito (SRS) | Casos de Teste |
|-----------------|----------------|
| RF-04 (Listar produtos) | CT-08.1, CT-08.2 |
| RF-05 (Calcular NDVI) | CT-01.1 a CT-01.5 |
| RF-06 (Calcular EVI) | CT-02.1, CT-02.2, CT-02.3 |
| RF-10 (Estatísticas) | CT-03.1 a CT-03.4 |
| RF-11 (Histograma) | CT-04.1 a CT-04.4 |
| RF-20 (Health check) | CT-06.1, CT-06.2 |
| RNF-04 (Confiabilidade — erros claros) | CT-01.4, CT-03.4, CT-04.4, CT-09.1, CT-09.2, CT-09.3 |
| RNF-05 (Manutenibilidade — separação de camadas) | Toda a suite (testa `SentinelProcessor` isoladamente das rotas HTTP) |

---

## 7. Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| Testes dependem de produtos Sentinel-2 reais (~1 GB) | Uso de fixtures sintéticas via NumPy. Apenas testes manuais usam dados reais (na demo). |
| Ambiente de CI sem GDAL/rasterio | Execução em máquina local com GDAL instalado via Homebrew. Não há CI configurado neste MVP (escopo P2). |
| Cobertura limitada de funções de I/O (`read_band`, `crop_to_geometry`) | Aceitável para o MVP — essas funções são thin wrappers sobre rasterio, validados em demonstração manual. |

---

## 8. Critério de Saída

A entrega da P2 está pronta quando:
- [x] Todos os 28 casos de teste foram executados
- [x] Taxa de sucesso ≥ 95% (atingido: **100%**)
- [x] Relatório consolidado com evidências está disponível em [09-relatorio-de-testes.md](09-relatorio-de-testes.md)
- [x] Suite executa em < 30 segundos (atingido: ~17 s na primeira execução, < 1 s em re-runs)
