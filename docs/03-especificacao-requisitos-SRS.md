# Especificação de Requisitos de Software (SRS)

## ICEV Remote Sensing Software

**Versão:** 1.0
**Data:** 08/03/2026
**Baseado em:** IEEE 830-1998 (adaptado)
**Equipe:** Luis Gustavo Olimpio, Lauan Matheus, João Leonardi, João Vinícius Castello, Vinícius Henrique, Lucas Benevinuto, José Melquíades

---

## 1. Introdução

### 1.1 Propósito
Este documento especifica os requisitos funcionais e não funcionais do ICEV Remote Sensing Software, uma plataforma web de sensoriamento remoto para agricultura de precisão. Destina-se a desenvolvedores, testadores e stakeholders do projeto.

### 1.2 Escopo do Produto
O sistema processa imagens multiespectrais do satélite Sentinel-2 sobre talhões agrícolas definidos por arquivos KML, gerando índices de vegetação, experimentos de processamento de imagem e classificações de culturas, apresentados via interface web interativa com mapa 2D e visualização 3D.

### 1.3 Definições, Acrônimos e Abreviações

| Termo | Definição |
|-------|-----------|
| **NDVI** | Normalized Difference Vegetation Index — índice de vegetação por diferença normalizada |
| **EVI** | Enhanced Vegetation Index — índice de vegetação melhorado |
| **SAVI** | Soil Adjusted Vegetation Index — índice de vegetação ajustado ao solo |
| **NDWI** | Normalized Difference Water Index — índice de água por diferença normalizada |
| **NDBI** | Normalized Difference Built-up Index — índice de área construída |
| **Sentinel-2** | Missão de observação terrestre da ESA com sensor multiespectral de 13 bandas |
| **KML** | Keyhole Markup Language — formato XML para dados geoespaciais |
| **NIR** | Near-Infrared — infravermelho próximo (banda B08 do Sentinel-2) |
| **CRS** | Coordinate Reference System — sistema de referência de coordenadas |
| **SAFE** | Standard Archive Format for Europe — formato de arquivo dos produtos Sentinel |
| **MVP** | Minimum Viable Product — produto mínimo viável |
| **JP2** | JPEG 2000 — formato de compressão de imagem usado pelo Sentinel-2 |

### 1.4 Referências
- Documentação Sentinel-2 da ESA: https://sentinel.esa.int/web/sentinel/missions/sentinel-2
- Especificação KML: https://www.ogc.org/standard/kml/
- rasterio documentation: https://rasterio.readthedocs.io/
- FastAPI documentation: https://fastapi.tiangolo.com/

---

## 2. Descrição Geral

### 2.1 Perspectiva do Produto
Sistema standalone composto por dois processos:
- **Backend:** Servidor FastAPI (Python) na porta 8000
- **Frontend:** Aplicação Next.js (React/TypeScript) na porta 3000

Comunicação via REST API (JSON + imagens codificadas em base64). Sem banco de dados — estado em memória.

### 2.2 Funções do Produto
1. Importação e visualização de talhões agrícolas (KML + desenho no mapa)
2. Processamento de índices espectrais sobre imagens Sentinel-2
3. Visualização 2D (mapa Leaflet) e 3D (Three.js) dos resultados
4. Laboratório de 13 experimentos de processamento de imagem
5. Classificação de culturas (K-Means, limiar, supervisionada simulada)
6. Geração de estatísticas descritivas e histogramas

### 2.3 Características dos Usuários
- **Técnicos agrícolas:** conhecimento básico de tecnologia, foco em interpretação visual
- **Pesquisadores:** conhecimento avançado de sensoriamento remoto e processamento de imagem
- **Estudantes:** em processo de aprendizado, necessitam de interface intuitiva e educativa

### 2.4 Restrições
- Imagens Sentinel-2 devem ser pré-baixadas manualmente
- Executado em localhost — não há autenticação ou multi-tenancy
- Sem persistência de dados entre sessões
- Python 3.12 obrigatório

### 2.5 Suposições e Dependências
- Navegador com suporte a WebGL (Chrome 90+, Firefox 80+, Edge 90+)
- Conexão com internet para carregar tiles de mapa base
- Imagens Sentinel-2 Level-2A no formato `.SAFE` disponíveis localmente

---

## 3. Requisitos Funcionais

### RF-01: Carregar Talhões a partir de Arquivos KML
- **Descrição:** O sistema deve ler arquivos `.kml` do diretório `data/KML Fields/`, extrair polígonos de talhões com coordenadas geográficas, calcular bounding box, área aproximada em hectares e centroide.
- **Entrada:** Arquivos KML com elemento `Placemark > Polygon > outerBoundaryIs > LinearRing > coordinates`
- **Saída:** Lista de talhões com id, nome, coordenadas, bounds (north/south/east/west), área e centro
- **Prioridade:** Alta
- **Critério de Aceitação:** Ao iniciar o frontend, todos os arquivos KML válidos devem ser listados no dropdown de seleção de talhões.

### RF-02: Exibir Talhões no Mapa Interativo
- **Descrição:** O sistema deve renderizar os polígonos dos talhões sobre o mapa Leaflet. O talhão selecionado deve ser destacado em azul; os demais, em verde.
- **Entrada:** Lista de talhões carregados
- **Saída:** Polígonos renderizados no mapa com diferenciação visual por seleção
- **Prioridade:** Alta
- **Critério de Aceitação:** O mapa exibe todos os talhões; ao selecionar um, ele muda para azul e os demais ficam verdes.

### RF-03: Desenhar Novos Talhões no Mapa
- **Descrição:** O sistema deve permitir ao usuário desenhar polígonos e retângulos diretamente no mapa usando ferramentas de desenho (leaflet-draw). Os talhões desenhados devem ser adicionados à lista de talhões disponíveis com ID gerado automaticamente.
- **Entrada:** Interação de desenho do usuário no mapa
- **Saída:** Novo talhão adicionado à lista com coordenadas extraídas do polígono desenhado
- **Prioridade:** Média
- **Critério de Aceitação:** O usuário pode desenhar um polígono e imediatamente selecioná-lo para análise de índice espectral.

### RF-04: Listar Produtos Sentinel-2 Disponíveis
- **Descrição:** O sistema deve varrer o diretório `data/products/` e listar todos os diretórios com padrão `S2*_MSIL2A_*.SAFE`, extraindo nome, caminho e tile.
- **Entrada:** Conteúdo do diretório de produtos
- **Saída:** Lista JSON de produtos com campos `name`, `path`, `tile`
- **Prioridade:** Média
- **Critério de Aceitação:** O endpoint `GET /products` retorna a lista correta de produtos disponíveis.

### RF-05: Calcular Índice NDVI
- **Descrição:** O sistema deve calcular o NDVI pixel-a-pixel usando as bandas B08 (NIR, 10m) e B04 (Red, 10m) da imagem Sentinel-2, recortando a área ao polígono do talhão selecionado. Fórmula: `(NIR - Red) / (NIR + Red)`, com resultado limitado ao intervalo [-1, 1].
- **Entrada:** ID do talhão, coordenadas do polígono, tipo de índice "NDVI", produto Sentinel-2 (opcional)
- **Saída:** Imagem PNG colorida (base64), estatísticas (min, max, média, mediana, std, count), histograma (50 bins), dados de elevação para 3D
- **Prioridade:** Alta
- **Critério de Aceitação:** O NDVI é calculado corretamente e a imagem gerada usa gradiente marrom-amarelo-verde correspondente aos valores.

### RF-06: Calcular Índice EVI
- **Descrição:** O sistema deve calcular o EVI usando bandas B08, B04 e B02. Fórmula: `2.5 × (NIR - Red) / (NIR + 6×Red - 7.5×Blue + 1)`, limitado a [-1, 1].
- **Entrada:** Mesma estrutura de RF-05 com tipo "EVI"
- **Saída:** Mesma estrutura de RF-05
- **Prioridade:** Alta

### RF-07: Gerar Composição RGB (Cor Verdadeira)
- **Descrição:** O sistema deve gerar uma composição em cor verdadeira usando bandas B04 (Red), B03 (Green) e B02 (Blue) em resolução de 10m.
- **Entrada:** Tipo "RGB"
- **Saída:** Imagem RGBA PNG em cor verdadeira, base64
- **Prioridade:** Média

### RF-08: Gerar Composição em Falsa-Cor
- **Descrição:** O sistema deve gerar uma composição em falsa-cor usando bandas B08 (NIR), B04 (Red), B03 (Green) em 10m.
- **Entrada:** Tipo "FALSE_COLOR"
- **Saída:** Imagem RGBA PNG em falsa-cor, base64
- **Prioridade:** Média

### RF-09: Visualizar Bandas Espectrais Individuais
- **Descrição:** O sistema deve permitir a visualização individual de cada uma das 13 bandas Sentinel-2 (B01 a B12 + B8A) em suas resoluções nativas: 10m (B02, B03, B04, B08), 20m (B05, B06, B07, B8A, B11, B12) e 60m (B01, B09, B10).
- **Entrada:** Tipo correspondente à banda (ex: "B04")
- **Saída:** Imagem em escala de cinza, base64
- **Prioridade:** Média

### RF-10: Calcular Estatísticas Descritivas
- **Descrição:** Para cada cálculo de índice, o sistema deve retornar: valor mínimo, máximo, média, mediana, desvio padrão e contagem de pixels válidos (não-NaN).
- **Saída:** Objeto JSON `statistics` com campos `min`, `max`, `mean`, `median`, `std`, `count`
- **Prioridade:** Alta

### RF-11: Gerar Histograma de Distribuição
- **Descrição:** O sistema deve gerar um histograma com 50 bins dos valores do índice calculado.
- **Saída:** Objeto JSON `histogram` com arrays `bins` e `counts`
- **Prioridade:** Média

### RF-12: Aplicar Suavização Gaussiana
- **Descrição:** Quando a opção `smooth` estiver ativada, o sistema deve aplicar filtro gaussiano (sigma=1.5) à imagem do índice antes da renderização.
- **Entrada:** Flag `smooth: true` na requisição
- **Saída:** Imagem suavizada
- **Prioridade:** Baixa

### RF-13: Sobrepor Resultado no Mapa
- **Descrição:** O resultado do cálculo de índice ou classificação deve ser exibido como camada de imagem sobreposta ao mapa, posicionada sobre o bounding box do talhão.
- **Prioridade:** Alta

### RF-14: Exibir Nível de Estresse no Popup
- **Descrição:** Para o índice NDVI, ao clicar no mapa sobre um talhão analisado, o sistema deve exibir popup com classificação de estresse: Severo (<0.2), Moderado (0.2–0.4), Leve (0.4–0.6), Saudável (≥0.6).
- **Prioridade:** Média

### RF-15: Visualização 3D do Terreno Espectral
- **Descrição:** O sistema deve permitir alternar para um modo de visualização 3D onde os valores dos pixels são representados como elevação em um terreno tridimensional interativo (rotação, zoom, pan).
- **Entrada:** Toggle "3D View" ativado + resultado de índice carregado
- **Saída:** Renderização Three.js com geometria de plano deformada por elevação
- **Prioridade:** Média

### RF-16: Executar Experimentos de Processamento de Imagem
- **Descrição:** O sistema deve permitir a execução de 13 experimentos de processamento de imagem sobre a banda NIR (B08), organizados em 5 categorias:
  - **Filtros:** Gaussiano (sigma), Mediana (tamanho), Bilateral (d, sigma_color, sigma_space)
  - **Detecção de Bordas:** Sobel, Canny (low/high threshold), Laplaciano
  - **Equalização:** Equalização de Histograma
  - **Morfologia:** Erosão, Dilatação, Abertura, Fechamento (kernel_size)
  - **Segmentação:** Limiar Binário (threshold), Otsu, Adaptativo (block_size, c)
- **Entrada:** Tipo de experimento, parâmetros (via sliders), talhão selecionado
- **Saída:** Imagem processada (base64), estatísticas do resultado
- **Prioridade:** Média

### RF-17: Classificação por Limiar de NDVI
- **Descrição:** O sistema deve classificar os pixels de um talhão em 3 zonas de vigor: Baixo Vigor (NDVI < 0.3), Médio Vigor (0.3 ≤ NDVI < 0.6), Alto Vigor (NDVI ≥ 0.6), com cálculo de área em hectares por zona.
- **Entrada:** Método "threshold", talhão selecionado
- **Saída:** Imagem colorida com 3 classes, porcentagem e área (ha) por classe
- **Prioridade:** Alta

### RF-18: Classificação Não-Supervisionada (K-Means)
- **Descrição:** O sistema deve agrupar pixels em N classes (2 a 6, configurável) usando algoritmo K-Means sobre features selecionadas (combinação de NDVI, EVI, SAVI).
- **Entrada:** Método "unsupervised", n_classes, índices selecionados, talhão
- **Saída:** Imagem classificada, porcentagem e área por classe
- **Prioridade:** Média

### RF-19: Exibir Legenda de Classificação
- **Descrição:** Após classificação, o sistema deve exibir legenda com nome, cor, porcentagem e área em hectares de cada classe identificada.
- **Prioridade:** Alta

### RF-20: Verificação de Saúde do Sistema
- **Descrição:** O endpoint `GET /health` deve retornar o status do backend e se o diretório de produtos está acessível.
- **Saída:** `{ status: "healthy", products_dir: boolean }`
- **Prioridade:** Baixa

---

## 4. Requisitos Não Funcionais

### RNF-01: Desempenho
- O cálculo de índice espectral para um talhão típico (< 1000 hectares) deve completar em até 30 segundos.
- A renderização do mapa 2D deve manter taxa de quadros acima de 30 FPS durante navegação.
- A visualização 3D deve ser responsiva em hardware com GPU integrada.

### RNF-02: Usabilidade
- A interface deve ser utilizável sem treinamento prévio por um agrônomo com conhecimento básico de informática.
- Todos os índices espectrais devem ter legenda com escala de cores e guia de interpretação.
- Os parâmetros de experimentos devem ser ajustáveis via sliders com valores padrão razoáveis.
- As telas devem ter layout responsivo (mínimo 1024px de largura).

### RNF-03: Compatibilidade
- **Navegadores suportados:** Chrome 90+, Firefox 80+, Edge 90+, Safari 15+
- **Sistema operacional backend:** Linux (Ubuntu 22.04+), macOS, Windows (via WSL)
- **Python:** 3.12+
- **Node.js:** 18+ (exigido pelo Next.js 16)

### RNF-04: Confiabilidade
- O backend deve retornar mensagens de erro claras (HTTP 400/500) com descrição do problema.
- O frontend deve exibir feedback visual (loading state) durante processamentos longos.
- O sistema deve lidar graciosamente com arquivos KML malformados (ignorar, não crashar).

### RNF-05: Manutenibilidade
- Código fonte organizado em módulos separados: API, processador, componentes UI, utilitários.
- Tipagem estática no frontend (TypeScript) e modelos Pydantic no backend.
- Separação de responsabilidades: SentinelProcessor (I/O geoespacial) isolado das rotas HTTP.

### RNF-06: Portabilidade
- O sistema deve rodar em qualquer máquina com Python 3.12 e Node.js 18+ instalados.
- Sem dependência de banco de dados ou serviços externos obrigatórios (exceto tiles de mapa).
- Gerenciamento de dependências Python via `uv` (pyproject.toml + uv.lock).

### RNF-07: Segurança
- CORS configurado para aceitar apenas requisições de `http://localhost:3000`.
- Sem autenticação (sistema local single-user).
- Dados de imagem transferidos via base64 dentro de JSON (sem upload de arquivos pelo usuário).

### RNF-08: Escalabilidade
- O sistema é projetado para uso single-user em ambiente local.
- Não há requisitos de escalabilidade horizontal nesta versão.
- O processamento é limitado pela memória RAM disponível (imagens Sentinel-2 podem consumir GB de RAM para talhões grandes).

---

## 5. Requisitos de Interface

### 5.1 Interface com Usuário
- Mapa interativo Leaflet com camadas de satélite (Esri) e ruas (OSM)
- Painel lateral com controles organizados em abas (Analytics / Research)
- Página dedicada para classificação de culturas
- Diálogos modais para configuração de parâmetros de experimentos
- Componentes shadcn/ui com tema neutro e ícones Lucide

### 5.2 Interface com Hardware
- WebGL para renderização 3D (Three.js via react-three-fiber)
- Nenhum dispositivo especial necessário

### 5.3 Interface com Software
- **Sentinel-2 .SAFE:** Leitura de arquivos JP2 via rasterio
- **KML:** Parsing de XML via fast-xml-parser
- **Tiles de mapa:** HTTP GET para Esri World Imagery e OpenStreetMap
- **Geocoding:** HTTP GET para OpenStreetMap Nominatim

### 5.4 Interface de Comunicação
- REST API entre frontend (porta 3000) e backend (porta 8000)
- Protocolo HTTP, formato JSON
- Imagens transferidas como strings base64 dentro do JSON
- Sem WebSocket, SSE ou comunicação em tempo real

---

## 6. Rastreabilidade Requisitos × Histórias de Usuário

| Requisito | Histórias Relacionadas |
|-----------|----------------------|
| RF-01 | US-01, US-04 |
| RF-02 | US-02 |
| RF-03 | US-03 |
| RF-04 | US-33 |
| RF-05 | US-07 |
| RF-06 | US-08 |
| RF-07, RF-08 | US-09 |
| RF-09 | US-10 |
| RF-10 | US-11 |
| RF-11 | US-12 |
| RF-12 | US-13 |
| RF-13 | US-16 |
| RF-14 | US-18 |
| RF-15 | US-19 |
| RF-16 | US-21, US-22, US-23, US-24, US-25 |
| RF-17 | US-27 |
| RF-18 | US-28, US-30 |
| RF-19 | US-29, US-32 |
| RF-20 | US-34 |
