# EasyGis

> Plataforma web de sensoriamento remoto para agricultura de precisão. Processa imagens Sentinel-2 sobre talhões agrícolas, calcula índices de vegetação e classifica zonas — sem custo de licenciamento.

**Avaliação P2 · Gerência e Manutenção de Software · Prof. Mauro · ICEV · 2026.1**

[![Python 3.12+](https://img.shields.io/badge/Python-3.12+-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Next.js 16](https://img.shields.io/badge/Next.js-16-000?logo=next.js&logoColor=white)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Tests](https://img.shields.io/badge/tests-54%20passing-3FB950)](docs/p2/09-relatorio-de-testes.pdf)
[![Coverage](https://img.shields.io/badge/coverage%20core-65%25-3FB950)](docs/p2/09-relatorio-de-testes.pdf)

---

## Para o avaliador

Esta tabela mapeia cada critério da Avaliação P2 ao artefato que comprova a entrega. Tudo está versionado neste repositório.

| # | Critério (peso) | Onde encontrar |
|---|---|---|
| **1** | **Implementação do MVP** (3,0 pt) | [`api/`](api/) · [`web/`](web/) · [Como executar](#como-executar) (2 comandos) · [Demo na apresentação](docs/p2/apresentacao-p2.pdf) |
| **2** | **Qualidade do código** (2,0 pt) | [`api/main.py`](api/main.py) (Pydantic v2, `Literal`, validators, exception handling) · [`web/`](web/) (TS strict, sem `any`, Server/Client boundary) · [Decisões de design — DA-06/07/09](docs/p2/00-ENTREGA-P2.pdf) |
| **3** | **Testes de software** (2,0 pt) | [`tests/`](tests/) · **54 casos, 100% aprovados, 1,20 s** · cobertura **65%** no processador · [Plano](docs/p2/08-plano-de-testes.pdf) · [Relatório](docs/p2/09-relatorio-de-testes.pdf) |
| **4** | **Documentação técnica** (1,5 pt) | [Visão de produto](docs/01-documento-visao-produto.md) · [Backlog (35 histórias)](docs/02-backlog-produto.md) · [SRS (20 RFs + 8 RNFs)](docs/03-especificacao-requisitos-SRS.md) · [Arquitetura (8 diagramas + ADRs)](docs/04-diagramas-arquitetura.md) · [Mapeamento P2](docs/p2/00-ENTREGA-P2.pdf) |
| **5** | **Manual do usuário** (0,5 pt) | [`docs/p2/07-manual-usuario.pdf`](docs/p2/07-manual-usuario.pdf) — linguagem leiga, 8 screenshots passo-a-passo |
| **6** | **Apresentação** (1,0 pt) | [`docs/p2/apresentacao-p2.pdf`](docs/p2/apresentacao-p2.pdf) — 14 slides conceituais + demo ao vivo |

> **Quick start em 30 segundos:** `uv sync && cd web && npm install && cd .. && ./run_api.sh & cd web && npm run dev` → abrir `http://localhost:3000`

---

## Visão geral

| | |
|---|---|
| **Problema** | Softwares GIS comerciais (ArcGIS, ENVI) custam milhares de R$/ano e exigem treinamento especializado. Imagens Sentinel-2 (gratuitas, 10 m, revisita 5 dias) são subutilizadas no Brasil. |
| **Solução** | Aplicação web local que ingere produtos Sentinel-2 + polígonos KML, calcula índices espectrais (NDVI, EVI, SAVI, NDWI, NDBI), classifica zonas por vigor e renderiza tudo em mapa 2D + visualização 3D interativa. |
| **Público** | Produtores rurais · Agrônomos · Pesquisadores · Estudantes |

Para entender o produto em profundidade, comece por [`docs/01-documento-visao-produto.md`](docs/01-documento-visao-produto.md).

---

## Funcionalidades

### Análise espectral
- **5 índices de vegetação** — NDVI, EVI, SAVI, NDWI, NDBI
- **13 bandas Sentinel-2 individuais** — B01–B12 + B8A em resoluções nativas (10/20/60 m)
- **Composições RGB e falsa-cor** — visualização natural e em infravermelho
- **Estatísticas descritivas + histograma** automáticos por análise

### Visualização
- **Mapa 2D interativo** (Leaflet) com camadas Esri (satélite) e OSM (ruas)
- **Visualização 3D** (Three.js / WebGL) com elevação proporcional ao valor do índice
- **Popup pixel-a-pixel** classificando estresse vegetativo no ponto clicado
- **Suavização gaussiana opcional** preservando bordas do polígono

### Gestão de talhões
- Importação a partir de **arquivos KML** do Google Earth
- **Desenho direto no mapa** com leaflet-draw (polígonos + retângulos)
- Cálculo automático de **área em hectares** e bounding box

### Classificação de culturas
- **Threshold por NDVI** — Baixo / Médio / Alto Vigor com hectares por classe
- **K-Means não-supervisionado** — 2 a 6 classes, features configuráveis
- **Supervisionada simulada** — assinaturas espectrais para soja, milho, café, cana

### Laboratório de experimentos
14 algoritmos de processamento de imagem com parâmetros ajustáveis em sliders:
- Filtros: Gaussiano · Mediana · Bilateral
- Detecção de bordas: Sobel · Canny · Laplaciano
- Equalização de histograma
- Morfologia: Erosão · Dilatação · Abertura · Fechamento
- Segmentação: Limiar binário · Otsu · Adaptativo

---

## Stack

### Frontend
- **[Next.js 16](https://nextjs.org/)** + **[React 19](https://react.dev/)** + **[TypeScript 5](https://www.typescriptlang.org/)**
- **[Tailwind CSS 4](https://tailwindcss.com/)** + **[shadcn/ui](https://ui.shadcn.com/)** (componentes acessíveis via Radix)
- **[Leaflet](https://leafletjs.com/)** + **leaflet-draw** + **leaflet-geosearch** (mapa 2D)
- **[Three.js](https://threejs.org/)** + **[@react-three/fiber](https://r3f.docs.pmnd.rs/)** (renderização 3D)
- **fast-xml-parser** (parsing de KML)

### Backend
- **[Python 3.12](https://www.python.org/)** + **[FastAPI](https://fastapi.tiangolo.com/)** + **[Uvicorn](https://www.uvicorn.org/)**
- **[rasterio](https://rasterio.readthedocs.io/)** (I/O geoespacial sobre GDAL)
- **NumPy** · **SciPy** · **scikit-learn** · **scikit-image** · **OpenCV** · **Pillow**
- **[Shapely](https://shapely.readthedocs.io/)** + **[pyproj](https://pyproj4.github.io/pyproj/stable/)** (geometria + reprojeção)
- **[uv](https://docs.astral.sh/uv/)** (gerenciamento de dependências)

### Comunicação
REST API entre frontend (porta 3000) e backend (porta 8000) com JSON e imagens em base64. Sem banco de dados — processamento em memória, stateless.

---

## Pré-requisitos

| Ferramenta | Versão | Como instalar |
|---|---|---|
| **Python** | 3.12+ | [python.org](https://www.python.org/downloads/) ou [pyenv](https://github.com/pyenv/pyenv) |
| **Node.js** | 18+ | [nodejs.org](https://nodejs.org/) ou [nvm](https://github.com/nvm-sh/nvm) |
| **uv** | mais recente | `curl -LsSf https://astral.sh/uv/install.sh \| sh` |
| **GDAL** | 3.x+ | `brew install gdal` (macOS) · `apt-get install gdal-bin libgdal-dev` (Linux) |

---

## Instalação

```bash
git clone git@github.com:luisg0c/EasyGis.git
cd EasyGis

# Backend
uv sync                       # produção
uv sync --group dev           # com pytest, httpx, python-pptx

# Frontend
cd web && npm install && cd ..
```

---

## Como executar

Em **dois terminais**:

```bash
# Terminal 1 — Backend (porta 8000)
./run_api.sh

# Terminal 2 — Frontend (porta 3000)
cd web && npm run dev
```

| Endpoint | URL |
|---|---|
| Aplicação | http://localhost:3000 |
| API REST | http://localhost:8000 |
| Documentação OpenAPI | http://localhost:8000/docs |

---

## Como usar

### 1. Preparar os dados

**Imagens Sentinel-2:**
Baixe um produto Level-2A (`.SAFE`) do [Copernicus Browser](https://browser.dataspace.copernicus.eu/) e descompacte em `data/products/`.

**Polígonos de talhões:**
Coloque arquivos `.kml` exportados do Google Earth em `data/KML Fields/`. Já existe um exemplo (`crop field 1.kml`) para teste rápido.

### 2. Fluxo padrão (NDVI em 4 cliques)

1. Abrir http://localhost:3000
2. Selecionar talhão no dropdown
3. Escolher índice **NDVI**
4. Clicar em **Calcular**

Resultado: overlay colorido (marrom→amarelo→verde) sobre o talhão + estatísticas + histograma. Ative o switch **3D View** para ver como relevo.

### 3. Classificação

Acesse http://localhost:3000/classification para classificar o talhão em zonas e ver a distribuição de hectares por classe.

> **Manual completo do usuário (PT-BR):** [`docs/p2/07-manual-usuario.pdf`](docs/p2/07-manual-usuario.pdf)

---

## Estrutura do projeto

```
.
├── api/                        # Backend FastAPI
│   ├── main.py                 # Rotas, modelos Pydantic, renderização
│   └── sentinel_processor.py   # I/O JP2, recorte, cálculo de índices
│
├── web/                        # Frontend Next.js
│   ├── app/                    # App Router (páginas + API routes)
│   ├── components/             # Componentes React (mapa, 3D, painéis)
│   ├── lib/                    # kml-parser, spectral-indices, utils
│   └── types/                  # Tipos TypeScript
│
├── tests/                      # Suíte pytest (54 casos)
│   ├── conftest.py             # Fixtures sintéticas (NumPy)
│   ├── test_sentinel_processor.py
│   └── test_api_endpoints.py   # FastAPI TestClient
│
├── data/
│   ├── products/               # Sentinel-2 .SAFE (não versionado)
│   └── KML Fields/             # Polígonos KML
│
├── docs/                       # Toda a documentação
│   ├── 01-06-*.md              # TP1 (visão, backlog, SRS, arquitetura)
│   ├── p2/                     # Entrega P2 (PDFs + LaTeX)
│   └── tp1/                    # Material complementar do TP1
│
├── pyproject.toml              # Dependências Python (uv)
├── uv.lock                     # Lock file
└── run_api.sh                  # Script de inicialização do backend
```

---

## Testes

A suíte cobre os requisitos funcionais críticos com fixtures sintéticas (NumPy) para evitar dependência de produtos Sentinel-2 reais.

```bash
uv sync --group dev
uv run pytest tests/ -v --cov=api --cov-report=term-missing
```

| Métrica | Valor |
|---|---|
| Casos planejados | 54 |
| **Aprovados** | **54 (100%)** |
| Tempo total | 1,20 s |
| Cobertura `sentinel_processor.py` (lógica de negócio) | 65% |
| Cobertura global (`api/`) | 58% |

> **Plano + Relatório completos:** [`docs/p2/08-plano-de-testes.pdf`](docs/p2/08-plano-de-testes.pdf) · [`docs/p2/09-relatorio-de-testes.pdf`](docs/p2/09-relatorio-de-testes.pdf)

---

## Documentação

| Documento | Descrição |
|---|---|
| [`docs/README.md`](docs/README.md) | Índice geral da documentação |
| [`docs/tp1/documento-unificado.pdf`](docs/tp1/documento-unificado.pdf) | **TP1 consolidado** — visão de produto, backlog (35 histórias / 6 épicos), SRS (20 RFs + 8 RNFs / IEEE 830), 8 diagramas de arquitetura, protótipo de interface e plano de projeto |
| [`docs/p2/00-ENTREGA-P2.pdf`](docs/p2/00-ENTREGA-P2.pdf) | Mapeamento dos entregáveis P2 + decisões de design DA-06 a DA-11 |
| [`docs/p2/07-manual-usuario.pdf`](docs/p2/07-manual-usuario.pdf) | Manual do usuário (linguagem leiga) |
| [`docs/p2/08-plano-de-testes.pdf`](docs/p2/08-plano-de-testes.pdf) | Plano de testes — 54 casos + matriz de rastreabilidade |
| [`docs/p2/09-relatorio-de-testes.pdf`](docs/p2/09-relatorio-de-testes.pdf) | Relatório de execução — 54/54 passando + evidências |
| [`docs/p2/apresentacao-p2.pdf`](docs/p2/apresentacao-p2.pdf) | Slides de apresentação (14 slides, identidade EasyGis) |

### Recompilar os PDFs

```bash
cd docs/p2 && make p2          # 5 PDFs da entrega P2
cd docs/tp1 && pdflatex documento-unificado.tex && pdflatex documento-unificado.tex
```

---

## Equipe

Desenvolvido como projeto acadêmico no **ICEV — Instituto de Ensino Superior** (Teresina, PI), na disciplina **Gerência e Manutenção de Software** ministrada pelo **Prof. Mauro** (2026.1).

- João Leonardi da Silva Melo
- João Vinícius Passos Castello Branco Carvalho
- José Melquíades Neto
- Lauan Matheus da Rocha Alves
- Lucas Benevinuto Pereira
- Luis Gustavo Olimpio
- Sammuel Moura Saraiva
- Vinicius Henrique Albino Andrade

---

## Uso de Inteligência Artificial

Em respeito à transparência acadêmica, declaramos o uso de assistentes de IA (Claude, da Anthropic, e outras ferramentas equivalentes) como apoio em tarefas pontuais de alta complexidade ou alto custo de tempo durante o desenvolvimento deste projeto.

**Onde a IA foi utilizada:**

- Geração inicial de *boilerplate* para integração com bibliotecas geoespaciais (rasterio, pyproj, Shapely) — funções que envolvem reprojeção de coordenadas, recorte de raster por geometria e leitura de produtos `.SAFE`
- Implementação dos 13 algoritmos do laboratório de experimentos de processamento de imagem (filtros, detecção de bordas, morfologia, segmentação)
- Estruturação de testes automatizados (suíte pytest com fixtures sintéticas)
- Diagramação e formatação dos documentos LaTeX/Beamer da entrega P2
- Revisão de código pontual em trechos com manipulação numérica densa (NumPy, NaN handling, broadcasting)

**Onde a IA NÃO foi utilizada:**

- Decisões de produto, escopo, priorização e arquitetura (de responsabilidade da equipe e validadas com o Product Owner)
- Definição dos requisitos funcionais e não funcionais
- Backlog, planejamento de sprints e gestão de projeto
- Análise crítica dos resultados de testes e validação manual da demonstração
- Apresentação ao avaliador

**Princípio adotado:** a IA é tratada como ferramenta de produtividade, equivalente a *frameworks*, *linters* ou geradores de código. Toda saída gerada por IA passou por revisão humana, foi testada, e a equipe assume total responsabilidade pela correção, segurança e adequação acadêmica do código e da documentação entregues.

Esta declaração segue o princípio de honestidade acadêmica e a tendência crescente de instituições e periódicos científicos exigirem disclosure explícito do uso de IA generativa.

---

## Licença

Projeto educacional desenvolvido no ICEV. Uso acadêmico livre.

Dados utilizados:
- **Sentinel-2** — Copernicus Programme / ESA ([termos de uso](https://sentinel.esa.int/web/sentinel/terms-conditions))
- **Tiles de mapa** — Esri World Imagery + OpenStreetMap
