# Diagramas de Arquitetura

## ICEV Remote Sensing Software

**Versão:** 1.0
**Data:** 08/03/2026
**Equipe:** Luis Gustavo Olimpio, Lauan Matheus, João Leonardi, João Vinícius Castello, Vinícius Henrique, Lucas Benevinuto, José Melquíades

---

## 1. Diagrama de Arquitetura Geral (Visão de Alto Nível)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           USUÁRIO (Navegador Web)                       │
└─────────────────────────┬───────────────────────────────────────────────┘
                          │ HTTP (porta 3000)
                          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     FRONTEND — Next.js 16 (React 19)                    │
│                                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │  Dashboard    │  │Classification│  │  API Route   │  │ Components │  │
│  │  (page.tsx)   │  │  (page.tsx)  │  │ /api/fields  │  │            │  │
│  │              │  │              │  │ (server-side)│  │ MapViewer  │  │
│  │ - Analytics  │  │ - Supervised │  │              │  │ Terrain3D  │  │
│  │ - Research   │  │ - Unsuperv.  │  │ Lê arquivos  │  │ ExpDialog  │  │
│  │ - 3D Toggle  │  │ - Threshold  │  │ KML do disco │  │ ExpMenu    │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────────┘  │ Legend     │  │
│         │                  │                             └────────────┘  │
└─────────┼──────────────────┼────────────────────────────────────────────┘
          │                  │
          │  REST API (JSON + base64 PNG)
          │  HTTP (porta 8000)
          ▼                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     BACKEND — FastAPI (Python 3.12)                      │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                        main.py (Rotas)                          │    │
│  │                                                                 │    │
│  │  GET /            GET /health         GET /products             │    │
│  │  POST /calculate-index                                          │    │
│  │  POST /api/experiments/run                                      │    │
│  │  POST /api/classification/classify                              │    │
│  └─────────────────────────┬───────────────────────────────────────┘    │
│                             │                                           │
│  ┌─────────────────────────▼───────────────────────────────────────┐    │
│  │              sentinel_processor.py (SentinelProcessor)          │    │
│  │                                                                 │    │
│  │  - read_band(band, resolution)     → numpy array               │    │
│  │  - crop_to_geometry(data, geom)    → masked array               │    │
│  │  - calculate_ndvi(nir, red)        → index array                │    │
│  │  - calculate_evi(nir, red, blue)   → index array                │    │
│  │  - calculate_savi(nir, red)        → index array                │    │
│  │  - calculate_statistics(data)      → dict                       │    │
│  │  - calculate_histogram(data)       → (bins, counts)             │    │
│  └─────────────────────────┬───────────────────────────────────────┘    │
│                             │                                           │
└─────────────────────────────┼───────────────────────────────────────────┘
                              │ File I/O (rasterio)
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        SISTEMA DE ARQUIVOS LOCAL                        │
│                                                                         │
│  data/                                                                  │
│  ├── products/                                                          │
│  │   └── S2*_MSIL2A_*.SAFE/                                            │
│  │       └── GRANULE/L2A_.../IMG_DATA/                                 │
│  │           ├── R10m/  (B02, B03, B04, B08)     ← 10m resolution      │
│  │           ├── R20m/  (B05-B07, B8A, B11, B12) ← 20m resolution      │
│  │           └── R60m/  (B01, B09, B10)          ← 60m resolution       │
│  │                                                                      │
│  └── KML Fields/                                                        │
│      └── *.kml  (polígonos de talhões agrícolas)                       │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js)                        │
│                                                                  │
│  ┌─────────────────────┐    ┌─────────────────────┐             │
│  │      PÁGINAS         │    │    COMPONENTES UI    │             │
│  │                      │    │                      │             │
│  │  / (Dashboard)       │───▶│  MapViewer           │             │
│  │  /classification     │    │  Terrain3DViewer     │             │
│  │                      │    │  ExperimentDialog    │             │
│  └──────────┬───────────┘    │  ExperimentMenu      │             │
│             │                │  IndexLegend         │             │
│             │                │  shadcn/ui (Button,  │             │
│             │                │   Dialog, Select...) │             │
│             │                └──────────────────────┘             │
│             │                                                     │
│  ┌──────────▼───────────┐    ┌─────────────────────┐             │
│  │    BIBLIOTECAS        │    │    TIPOS (TypeScript)│             │
│  │                       │    │                      │             │
│  │  kml-parser.ts        │    │  KMLField            │             │
│  │  spectral-indices.ts  │    │  SentinelProduct     │             │
│  │  utils.ts (cn)        │    │  IndexType           │             │
│  └───────────────────────┘    │  NDVIData            │             │
│                               └──────────────────────┘             │
│  ┌───────────────────────┐                                        │
│  │  API ROUTE (server)   │                                        │
│  │  /api/fields          │──── Lê KML do disco (fast-xml-parser)  │
│  └───────────────────────┘                                        │
└──────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        BACKEND (FastAPI)                          │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │                    CAMADA DE ROTAS                        │     │
│  │                    (main.py)                              │     │
│  │                                                           │     │
│  │  ┌──────────┐ ┌──────────────┐ ┌─────────────────────┐  │     │
│  │  │ Índices   │ │ Experimentos │ │    Classificação     │  │     │
│  │  │ Espectrais│ │ de Imagem    │ │    de Culturas       │  │     │
│  │  └─────┬─────┘ └──────┬───────┘ └──────────┬──────────┘  │     │
│  └────────┼──────────────┼─────────────────────┼─────────────┘     │
│           │              │                     │                    │
│  ┌────────▼──────────────▼─────────────────────▼─────────────┐     │
│  │              CAMADA DE PROCESSAMENTO                       │     │
│  │           (sentinel_processor.py)                          │     │
│  │                                                            │     │
│  │  ┌────────────┐  ┌─────────────┐  ┌──────────────────┐   │     │
│  │  │ Leitura de │  │ Recorte por │  │  Cálculo de      │   │     │
│  │  │ Bandas JP2 │  │ Geometria   │  │  Índices         │   │     │
│  │  │ (rasterio) │  │ (mask+crop) │  │  (NDVI/EVI/SAVI) │   │     │
│  │  └────────────┘  └─────────────┘  └──────────────────┘   │     │
│  │                                                            │     │
│  │  ┌────────────┐  ┌─────────────┐                          │     │
│  │  │Estatísticas│  │ Histograma  │                          │     │
│  │  │(numpy)     │  │ (numpy)     │                          │     │
│  │  └────────────┘  └─────────────┘                          │     │
│  └────────────────────────────────────────────────────────────┘     │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │              CAMADA DE RENDERIZAÇÃO                         │     │
│  │              (main.py — funções auxiliares)                 │     │
│  │                                                             │     │
│  │  - generate_index_image()  → PNG RGBA com gradiente        │     │
│  │  - generate_rgb_image()    → PNG cor verdadeira/falsa-cor   │     │
│  │  - generate_band_image()   → PNG escala de cinza            │     │
│  │  - PIL.Image → base64 string                                │     │
│  └────────────────────────────────────────────────────────────┘     │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │          BIBLIOTECAS DE PROCESSAMENTO DE IMAGEM            │     │
│  │                                                             │     │
│  │  scipy.ndimage  │  cv2 (OpenCV)  │  skimage  │  sklearn    │     │
│  │  (filtros,      │  (morfologia,  │  (Otsu)   │  (KMeans)   │     │
│  │   bordas)       │   Canny, etc.) │           │              │     │
│  └────────────────────────────────────────────────────────────┘     │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │              MODELOS DE DADOS (Pydantic)                    │     │
│  │                                                             │     │
│  │  Coordinate │ CalculateIndexRequest │ ExperimentRequest     │     │
│  │  IndexResult │ ExperimentResult │ ClassificationRequest     │     │
│  │  ClassificationResult │ CropClass                           │     │
│  └────────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Diagrama de Implantação

```
┌─────────────────────────────────────────────────────────────────────┐
│                     MÁQUINA LOCAL DO USUÁRIO                         │
│                     (Linux / macOS / Windows WSL)                     │
│                                                                      │
│  ┌──────────────────────┐     ┌──────────────────────┐              │
│  │    Processo 1:        │     │    Processo 2:        │              │
│  │    Next.js Dev Server │     │    Uvicorn ASGI       │              │
│  │                       │     │                       │              │
│  │    Porta: 3000        │────▶│    Porta: 8000        │              │
│  │                       │REST │                       │              │
│  │    Node.js 18+        │     │    Python 3.12        │              │
│  │    Next.js 16         │     │    FastAPI             │              │
│  │    React 19           │     │    rasterio            │              │
│  │    TypeScript          │     │    numpy               │              │
│  │    Tailwind CSS 4     │     │    scipy/cv2/sklearn   │              │
│  │    Leaflet            │     │                       │              │
│  │    Three.js           │     │                       │              │
│  └──────────┬────────────┘     └───────────┬───────────┘              │
│             │                               │                         │
│             │ Lê KML do disco               │ Lê JP2 do disco         │
│             ▼                               ▼                         │
│  ┌──────────────────────────────────────────────────────────┐        │
│  │                    Sistema de Arquivos                     │        │
│  │                                                           │        │
│  │  /data/KML Fields/*.kml    /data/products/*.SAFE/         │        │
│  └──────────────────────────────────────────────────────────┘        │
│                                                                      │
│  ┌──────────────────────┐                                            │
│  │    Navegador Web      │                                            │
│  │    (Chrome/Firefox)   │                                            │
│  │                       │                                            │
│  │    Acessa:            │                                            │
│  │    http://localhost:  │                                            │
│  │    3000               │                                            │
│  └──────────────────────┘                                            │
└──────────────────────────────────────────────────────────────────────┘

              ┌──────────────────────────────┐
              │     SERVIÇOS EXTERNOS         │
              │     (somente leitura,         │
              │      via internet)            │
              │                               │
              │  - Esri World Imagery (tiles) │
              │  - OpenStreetMap (tiles)       │
              │  - Nominatim (geocoding)       │
              └──────────────────────────────┘
```

---

## 4. Diagrama de Sequência — Cálculo de Índice NDVI

```
┌────────┐          ┌──────────┐          ┌──────────┐          ┌───────────────┐
│Usuário │          │ Frontend │          │ Backend  │          │ SentinelProc. │
│        │          │ (Next.js)│          │ (FastAPI)│          │               │
└───┬────┘          └────┬─────┘          └────┬─────┘          └──────┬────────┘
    │                     │                     │                       │
    │  1. Seleciona       │                     │                       │
    │     talhão + NDVI   │                     │                       │
    │  ──────────────────▶│                     │                       │
    │                     │                     │                       │
    │                     │  2. POST /calculate │                       │
    │                     │     -index          │                       │
    │                     │  {field_id,         │                       │
    │                     │   coordinates,      │                       │
    │                     │   index_type:"NDVI"}│                       │
    │                     │  ──────────────────▶│                       │
    │                     │                     │                       │
    │                     │                     │  3. Resolve produto   │
    │                     │                     │     .SAFE mais recente│
    │                     │                     │  ──────────────────▶  │
    │                     │                     │                       │
    │                     │                     │  4. read_band(B08,    │
    │                     │                     │     10m) → NIR array  │
    │                     │                     │  ──────────────────▶  │
    │                     │                     │                       │
    │                     │                     │  5. read_band(B04,    │
    │                     │                     │     10m) → Red array  │
    │                     │                     │  ──────────────────▶  │
    │                     │                     │                       │
    │                     │                     │  6. crop_to_geometry  │
    │                     │                     │     (reprojeção +     │
    │                     │                     │      rasterio.mask)   │
    │                     │                     │  ──────────────────▶  │
    │                     │                     │  ◀──────────────────  │
    │                     │                     │                       │
    │                     │                     │  7. calculate_ndvi    │
    │                     │                     │     (NIR-Red)/        │
    │                     │                     │     (NIR+Red)         │
    │                     │                     │  ──────────────────▶  │
    │                     │                     │  ◀──────────────────  │
    │                     │                     │                       │
    │                     │                     │  8. Gera PNG RGBA     │
    │                     │                     │     com gradiente     │
    │                     │                     │     + stats + hist    │
    │                     │                     │     + elevation_data  │
    │                     │                     │                       │
    │                     │  9. Response JSON   │                       │
    │                     │  {image_base64,     │                       │
    │                     │   statistics,       │                       │
    │                     │   histogram,        │                       │
    │                     │   elevation_data}   │                       │
    │                     │  ◀─────────────────│                       │
    │                     │                     │                       │
    │  10. Exibe overlay  │                     │                       │
    │      no mapa +      │                     │                       │
    │      stats + legenda│                     │                       │
    │  ◀─────────────────│                     │                       │
    │                     │                     │                       │
```

---

## 5. Diagrama de Sequência — Classificação de Culturas

```
┌────────┐          ┌──────────┐          ┌──────────┐          ┌───────────────┐
│Usuário │          │ Frontend │          │ Backend  │          │ SentinelProc. │
└───┬────┘          └────┬─────┘          └────┬─────┘          └──────┬────────┘
    │                     │                     │                       │
    │  1. Seleciona       │                     │                       │
    │     talhão, método  │                     │                       │
    │     "unsupervised", │                     │                       │
    │     n_classes=3,    │                     │                       │
    │     índices=[NDVI,  │                     │                       │
    │     EVI]            │                     │                       │
    │  ──────────────────▶│                     │                       │
    │                     │                     │                       │
    │                     │  2. POST /api/      │                       │
    │                     │  classification/    │                       │
    │                     │  classify           │                       │
    │                     │  ──────────────────▶│                       │
    │                     │                     │                       │
    │                     │                     │  3. Para cada índice: │
    │                     │                     │  read_band + crop +   │
    │                     │                     │  calculate_index      │
    │                     │                     │  ──────────────────▶  │
    │                     │                     │  ◀──────────────────  │
    │                     │                     │                       │
    │                     │                     │  4. Stack features    │
    │                     │                     │     (NDVI + EVI)      │
    │                     │                     │                       │
    │                     │                     │  5. KMeans.fit(       │
    │                     │                     │     n_clusters=3)     │
    │                     │                     │                       │
    │                     │                     │  6. Calcula área/ha   │
    │                     │                     │     por classe        │
    │                     │                     │     (pixel=10m×10m)   │
    │                     │                     │                       │
    │                     │                     │  7. Gera PNG colorido │
    │                     │                     │     por classe        │
    │                     │                     │                       │
    │                     │  8. Response:       │                       │
    │                     │  {classes: [{name,  │                       │
    │                     │   color, %, ha}],   │                       │
    │                     │   image_base64,     │                       │
    │                     │   statistics}       │                       │
    │                     │  ◀─────────────────│                       │
    │                     │                     │                       │
    │  9. Exibe overlay   │                     │                       │
    │     + legenda com   │                     │                       │
    │     classes, %,     │                     │                       │
    │     área (ha)       │                     │                       │
    │  ◀─────────────────│                     │                       │
```

---

## 6. Diagrama de Pacotes / Estrutura de Diretórios

```
icev-remote-sensing-software/
│
├── main.py                      # Ponto de entrada (não utilizado diretamente)
├── pyproject.toml               # Dependências Python (uv)
├── uv.lock                      # Lock file de dependências
├── run_api.sh                   # Script para iniciar o backend
│
├── api/                         # ══════ BACKEND ══════
│   ├── __init__.py
│   ├── main.py                  # App FastAPI, rotas, modelos Pydantic,
│   │                            #   renderização de imagens
│   └── sentinel_processor.py    # Classe SentinelProcessor:
│                                #   leitura JP2, crop por geometria,
│                                #   cálculo de índices, estatísticas
│
├── web/                         # ══════ FRONTEND ══════
│   ├── package.json             # Dependências Node.js
│   ├── next.config.ts           # Configuração Next.js
│   ├── tsconfig.json            # Configuração TypeScript
│   ├── tailwind.config.ts       # Configuração Tailwind CSS
│   │
│   ├── app/                     # App Router (Next.js)
│   │   ├── layout.tsx           # Layout raiz
│   │   ├── page.tsx             # Dashboard principal (Analytics + Research)
│   │   ├── globals.css          # Estilos globais
│   │   ├── api/
│   │   │   └── fields/
│   │   │       └── route.ts     # API interna: leitura de KML
│   │   └── classification/
│   │       └── page.tsx         # Página de classificação de culturas
│   │
│   ├── components/              # Componentes React
│   │   ├── map-viewer.tsx       # Mapa Leaflet (2D)
│   │   ├── terrain-3d-viewer.tsx# Visualização 3D (Three.js)
│   │   ├── experiment-dialog.tsx# Modal de parâmetros de experimento
│   │   ├── experiment-menu.tsx  # Menu accordion de experimentos
│   │   ├── index-legend.tsx     # Legenda de índice espectral
│   │   └── ui/                  # Componentes shadcn/ui
│   │       ├── button.tsx
│   │       ├── dialog.tsx
│   │       ├── select.tsx
│   │       ├── slider.tsx
│   │       ├── switch.tsx
│   │       ├── tabs.tsx
│   │       └── label.tsx
│   │
│   ├── lib/                     # Utilitários e lógica de domínio
│   │   ├── kml-parser.ts        # Parser de KML (fast-xml-parser)
│   │   ├── spectral-indices.ts  # Registro de índices, cores, fórmulas
│   │   └── utils.ts             # Função cn() (clsx + tailwind-merge)
│   │
│   └── types/                   # Definições de tipos TypeScript
│       └── index.ts             # KMLField, SentinelProduct, IndexType...
│
└── data/                        # ══════ DADOS ══════
    ├── products/                # Imagens Sentinel-2 (.SAFE)
    │   └── S2*_MSIL2A_*.SAFE/
    │       └── GRANULE/L2A_.../
    │           └── IMG_DATA/
    │               ├── R10m/*.jp2
    │               ├── R20m/*.jp2
    │               └── R60m/*.jp2
    └── KML Fields/              # Polígonos de talhões
        └── *.kml
```

---

## 7. Diagrama de Fluxo de Dados

```
                    ┌──────────────┐
                    │ Arquivos KML │
                    │ (talhões)    │
                    └──────┬───────┘
                           │ Parse XML
                           ▼
                    ┌──────────────┐         ┌──────────────────┐
                    │ Lista de     │         │ Seleção do       │
                    │ Talhões      │────────▶│ Usuário          │
                    │ (coordenadas)│         │ (talhão + índice)│
                    └──────────────┘         └────────┬─────────┘
                                                       │
                    ┌──────────────┐                   │
                    │ Imagens      │                   │
                    │ Sentinel-2   │                   │
                    │ (.SAFE/JP2)  │                   │
                    └──────┬───────┘                   │
                           │                           │
                           ▼                           ▼
                    ┌──────────────────────────────────────┐
                    │       PROCESSAMENTO (Backend)         │
                    │                                       │
                    │  1. Leitura das bandas JP2 (rasterio) │
                    │  2. Reprojeção CRS (pyproj)           │
                    │  3. Recorte por polígono (mask)        │
                    │  4. Cálculo do índice (numpy)          │
                    │  5. Renderização PNG (Pillow)          │
                    │  6. Estatísticas (numpy)               │
                    │  7. Histograma (numpy)                 │
                    └──────────────┬────────────────────────┘
                                   │
                    ┌──────────────▼────────────────────────┐
                    │         RESULTADO (JSON)               │
                    │                                        │
                    │  - image_base64 (PNG RGBA)             │
                    │  - statistics {min,max,mean,median...} │
                    │  - histogram {bins, counts}            │
                    │  - elevation_data (grid 3D)            │
                    └──────────────┬────────────────────────┘
                                   │
                    ┌──────────────▼────────────────────────┐
                    │      VISUALIZAÇÃO (Frontend)           │
                    │                                        │
                    │  ┌────────────┐  ┌─────────────────┐  │
                    │  │ Mapa 2D    │  │ Terreno 3D      │  │
                    │  │ (Leaflet   │  │ (Three.js       │  │
                    │  │  overlay)  │  │  displacement)  │  │
                    │  └────────────┘  └─────────────────┘  │
                    │                                        │
                    │  ┌────────────┐  ┌─────────────────┐  │
                    │  │ Estatísticas│  │ Legenda +       │  │
                    │  │ (badges)   │  │ Guia de         │  │
                    │  │            │  │ Interpretação   │  │
                    │  └────────────┘  └─────────────────┘  │
                    └───────────────────────────────────────┘
```

---

## 8. Stack Tecnológica Consolidada

### Frontend
| Tecnologia | Versão | Função |
|------------|--------|--------|
| Next.js | 16.0.1 | Framework React com SSR e App Router |
| React | 19.2.0 | Biblioteca de UI |
| TypeScript | 5.x | Tipagem estática |
| Tailwind CSS | 4.x | Framework CSS utilitário |
| Leaflet | 1.9.4 | Mapa interativo 2D |
| leaflet-draw | 1.0.4 | Ferramentas de desenho no mapa |
| Three.js | 0.180.0 | Renderização 3D (WebGL) |
| @react-three/fiber | 9.4.0 | React renderer para Three.js |
| shadcn/ui + Radix | — | Componentes de interface |
| fast-xml-parser | 5.3.0 | Parsing de KML |

### Backend
| Tecnologia | Versão | Função |
|------------|--------|--------|
| Python | 3.12 | Linguagem do backend |
| FastAPI | 0.115+ | Framework web REST |
| Uvicorn | 0.32+ | Servidor ASGI |
| rasterio | 1.4+ | Leitura de imagens geoespaciais (JP2) |
| NumPy | 2.0+ | Processamento de arrays numéricos |
| Shapely | 2.0+ | Geometria computacional |
| Pillow | 10.0+ | Geração de imagens PNG |
| pyproj | 3.6+ | Reprojeção de coordenadas |
| SciPy | — | Filtros e operações de imagem |
| OpenCV | — | Visão computacional |
| scikit-learn | — | Machine Learning (K-Means) |
| scikit-image | — | Processamento de imagem (Otsu) |

---

## 9. Decisões Arquiteturais

### DA-01: Arquitetura em Dois Processos
**Decisão:** Separar frontend e backend em processos independentes comunicando-se via REST.
**Justificativa:** Permite que o processamento pesado de imagens (Python/rasterio) não bloqueie a interface do usuário. Facilita o desenvolvimento paralelo das equipes de frontend e backend.

### DA-02: Transferência de Imagens via Base64
**Decisão:** Codificar imagens PNG como strings base64 dentro do payload JSON.
**Justificativa:** Simplifica a API (uma única resposta JSON contém todos os dados), elimina a necessidade de servir arquivos estáticos ou gerenciar URLs temporários. Trade-off: overhead de ~33% no tamanho da transferência.

### DA-03: Processamento em Memória sem Persistência
**Decisão:** Não utilizar banco de dados; processar tudo em memória e por requisição.
**Justificativa:** Reduz complexidade de infraestrutura para um MVP educacional. Cada análise é independente e stateless.

### DA-04: Reprojeção Dinâmica de Coordenadas
**Decisão:** Aceitar coordenadas em EPSG:4326 (WGS84) do frontend e reprojetar para o CRS nativo da imagem Sentinel-2 no backend.
**Justificativa:** O frontend trabalha com coordenadas geográficas padrão (lat/lon); as imagens Sentinel-2 usam projeções UTM. A reprojeção automática via pyproj garante compatibilidade sem expor complexidade ao usuário.

### DA-05: KML como Formato de Entrada de Talhões
**Decisão:** Usar arquivos KML para definir limites de talhões.
**Justificativa:** KML é amplamente suportado por ferramentas GIS populares (Google Earth, QGIS), facilitando a interoperabilidade. Formato XML legível e simples para polígonos.
