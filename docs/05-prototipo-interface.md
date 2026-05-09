# Protótipo de Interface (Wireframes)

## ICEV Remote Sensing Software

**Versão:** 1.0
**Data:** 08/03/2026
**Equipe:** Luis Gustavo Olimpio, Lauan Matheus, João Leonardi, João Vinícius Castello, Vinícius Henrique, Lucas Benevinuto, José Melquíades

---

## 1. Visão Geral das Telas

O sistema possui **2 páginas principais**:
1. **Dashboard Principal** (`/`) — Análise de índices espectrais e experimentos de imagem
2. **Classificação de Culturas** (`/classification`) — Classificação supervisionada/não-supervisionada

---

## 2. Tela 1: Dashboard Principal (`/`)

### Layout Geral
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         TELA COMPLETA (100vh × 100vw)                       │
│                                                                             │
│  ┌──┐┌──────────────────────┐┌─────────────────────────────────────────┐   │
│  │  ││                      ││                                         │   │
│  │  ││                      ││                                         │   │
│  │  ││    PAINEL LATERAL    ││           MAPA / VISUALIZAÇÃO 3D        │   │
│  │IC││      (384px)         ││           (restante da largura)         │   │
│  │ON││                      ││                                         │   │
│  │  ││                      ││                                         │   │
│  │NA││                      ││                                         │   │
│  │AV││                      ││                                         │   │
│  │  ││                      ││                                         │   │
│  └──┘└──────────────────────┘└─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.1 Barra de Ícones (Navegação Lateral)

```
┌────┐
│ 📊 │  ← Analytics (aba padrão)
├────┤
│ 🔬 │  ← Research / Experimentos
├────┤
│    │
│    │
│    │
│    │
├────┤
│ 🗺️ │  ← Link para /classification
└────┘
```
- Largura: ~48px
- Ícones: Lucide React (BarChart3, FlaskConical, Map)
- Ao clicar, alterna o conteúdo do painel lateral

### 2.2 Painel Lateral — Aba Analytics

```
┌──────────────────────────────┐
│  🌿 ICEV Remote Sensing     │
│     Plataforma de Análise    │
│     Agrícola                 │
├──────────────────────────────┤
│                              │
│  Selecionar Talhão           │
│  ┌────────────────────────┐  │
│  │ crop field 1        ▼  │  │
│  └────────────────────────┘  │
│  Área: 125.4 ha              │
│                              │
├──────────────────────────────┤
│  Análise Rápida              │
│  ┌────────┬────────┬───────┐ │
│  │  Zone  │Produc. │Nitrog.│ │
│  │ (NDVI) │ (EVI)  │(SAVI) │ │
│  └────────┴────────┴───────┘ │
│                              │
│  ┌────────────────────────┐  │
│  │ 📋 Max ROI             │  │
│  │ Minimizar custos...    │  │
│  ├────────────────────────┤  │
│  │ ⚖️  Balanced            │  │
│  │ Equilíbrio custo...    │  │
│  ├────────────────────────┤  │
│  │ 🌾 Max Yield           │  │
│  │ Maximizar produção...  │  │
│  └────────────────────────┘  │
│                              │
├──────────────────────────────┤
│  Smooth Visualization  [🔘] │
│                              │
│  ┌────────────────────────┐  │
│  │   ▶ Visualizar NDVI    │  │
│  └────────────────────────┘  │
│                              │
├──────────────────────────────┤
│  📊 Estatísticas             │
│  ┌────────┬────────┬───────┐ │
│  │  Média │  Min   │  Max  │ │
│  │  0.45  │ -0.12  │ 0.89  │ │
│  └────────┴────────┴───────┘ │
│                              │
│  3D View               [🔘] │
│                              │
├──────────────────────────────┤
│  LEGENDA DO ÍNDICE           │
│  ┌────────────────────────┐  │
│  │ ████████████████████   │  │
│  │ -1.0    0.0     1.0   │  │
│  │                        │  │
│  │ NDVI Interpretation:   │  │
│  │ < 0.2  Stressed        │  │
│  │ 0.2-0.4 Moderate       │  │
│  │ 0.4-0.6 Healthy        │  │
│  │ > 0.6  Very Healthy    │  │
│  └────────────────────────┘  │
│                              │
├──────────────────────────────┤
│  Índices Espectrais          │
│  VEGETAÇÃO                   │
│  [NDVI] [EVI] [SAVI]        │
│  [NDWI] [NDBI]              │
│                              │
│  COMPOSIÇÕES RGB             │
│  [True Color] [False Color]  │
│                              │
│  BANDAS INDIVIDUAIS          │
│  [B01][B02][B03][B04]        │
│  [B05][B06][B07][B08]        │
│  [B8A][B09][B10][B11]        │
│  [B12]                       │
└──────────────────────────────┘
```

### 2.3 Painel Lateral — Aba Research (Experimentos)

```
┌──────────────────────────────┐
│  🔬 Research Lab             │
│     Experiment Station       │
├──────────────────────────────┤
│                              │
│  ▼ Image Filters             │
│    ├── Gaussian Blur         │
│    ├── Median Filter         │
│    └── Bilateral Filter      │
│                              │
│  ▶ Edge Detection            │
│  ▶ Histogram Equalization    │
│  ▶ Morphological Operations  │
│  ▶ Threshold Segmentation    │
│                              │
├──────────────────────────────┤
│  Recent Experiments          │
│  ┌────────────────────────┐  │
│  │ 🟢 NDVI Analysis       │  │
│  │    Field Alpha - 2h ago│  │
│  ├────────────────────────┤  │
│  │ 🔵 Edge Detection      │  │
│  │    Field Beta - 5h ago │  │
│  └────────────────────────┘  │
│                              │
├──────────────────────────────┤
│  Quick Actions               │
│  [📤 Export] [📊 Compare]    │
│  [💾 Save]  [📂 Load]       │
└──────────────────────────────┘
```

### 2.4 Diálogo de Experimento (Modal)

```
┌───────────────────────────────────────┐
│  Gaussian Blur                     ✕  │
├───────────────────────────────────────┤
│                                       │
│  Configure the experiment parameters  │
│                                       │
│  Sigma                                │
│  ──────────●──────────  2.0           │
│  0.1                          10.0    │
│                                       │
│                                       │
│  ┌─────────────┐  ┌────────────────┐  │
│  │   Cancel     │  │ Run Experiment │  │
│  └─────────────┘  └────────────────┘  │
└───────────────────────────────────────┘
```

### 2.5 Área do Mapa (2D — Leaflet)

```
┌─────────────────────────────────────────────────────┐
│ 🔍 Search location...                               │
├─────────────────────────────────────────────────────┤
│                                                      │
│        ┌────────────────────────┐    ┌──┐           │
│        │                        │    │🗺️│ Layer     │
│        │    Imagem de Satélite  │    │  │ Switcher  │
│        │    (Esri World Imagery)│    └──┘           │
│        │                        │                    │
│        │   ┌──────────────┐    │                    │
│        │   │  POLÍGONO DO │    │    ┌──┐           │
│        │   │  TALHÃO      │    │    │▭ │ Draw      │
│        │   │  (azul se    │    │    │◇ │ Tools     │
│        │   │  selecionado)│    │    └──┘           │
│        │   │              │    │                    │
│        │   │  ┌────────┐  │    │                    │
│        │   │  │OVERLAY │  │    │                    │
│        │   │  │DO NDVI │  │    │                    │
│        │   │  │(cores) │  │    │                    │
│        │   │  └────────┘  │    │                    │
│        │   └──────────────┘    │                    │
│        │                        │                    │
│        └────────────────────────┘                    │
│                                                      │
│  ┌─┐┌─┐                                            │
│  │+││-│  Zoom                                       │
│  └─┘└─┘                                            │
└─────────────────────────────────────────────────────┘
```

### 2.6 Área do Mapa (3D — Three.js)

```
┌─────────────────────────────────────────────────────┐
│                                                      │
│                                                      │
│              ╱╲    ╱╲                                │
│            ╱    ╲╱    ╲     ╱╲                       │
│          ╱              ╲ ╱    ╲                     │
│        ╱     TERRENO 3D    ╲    ╲                    │
│       │   (elevação =       │    │                   │
│       │    valor do pixel)  │    │                   │
│       │                     │   ╱                    │
│        ╲   Textura =       ╱  ╱                     │
│          ╲  imagem NDVI  ╱  ╱                       │
│            ╲           ╱  ╱                          │
│              ╲       ╱  ╱                            │
│                ╲   ╱  ╱                              │
│                  ╲╱ ╱                                │
│                  ╱╲                                  │
│               ╱    ╲                                 │
│              ────────── Grid                         │
│                                                      │
│  🖱️ Arrastar: Rotacionar                             │
│  🖱️ Scroll: Zoom                                     │
│  🖱️ Botão direito: Pan                               │
└─────────────────────────────────────────────────────┘
```

---

## 3. Tela 2: Classificação de Culturas (`/classification`)

### Layout Geral
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         TELA COMPLETA (100vh × 100vw)                       │
│                                                                             │
│  ┌──────────────────────────────┐┌─────────────────────────────────────┐   │
│  │                              ││                                     │   │
│  │     PAINEL DE CONTROLE       ││        MAPA COM OVERLAY DE          │   │
│  │     E RESULTADOS             ││        CLASSIFICAÇÃO                │   │
│  │     (50% largura)            ││        (50% largura)                │   │
│  │                              ││                                     │   │
│  │                              ││                                     │   │
│  └──────────────────────────────┘└─────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.1 Painel de Controle (Esquerda)

```
┌──────────────────────────────────┐
│  🗺️ Crop Classification         │
│     AI-powered crop mapping      │
│                                  │
│  ← Back to Dashboard            │
├──────────────────────────────────┤
│                                  │
│  Select Field                    │
│  ┌────────────────────────────┐  │
│  │ crop field 1            ▼  │  │
│  └────────────────────────────┘  │
│                                  │
├──────────────────────────────────┤
│  Classification Method           │
│  ┌──────────┬──────────┬───────┐ │
│  │Supervised│Unsuperv. │Thresh.│ │
│  └──────────┴──────────┴───────┘ │
│                                  │
│  ┌─ Se Supervised ─────────────┐ │
│  │  Crop Type                  │ │
│  │  ┌──────────────────────┐   │ │
│  │  │ Soja              ▼  │   │ │
│  │  └──────────────────────┘   │ │
│  │  Opções: Soja, Milho,      │ │
│  │  Café, Cana, Multi         │ │
│  └─────────────────────────────┘ │
│                                  │
│  ┌─ Se Unsupervised ──────────┐ │
│  │  Number of Classes          │ │
│  │  ┌──────────────────────┐   │ │
│  │  │ 3                 ▼  │   │ │
│  │  └──────────────────────┘   │ │
│  │  Range: 2 a 6               │ │
│  └─────────────────────────────┘ │
│                                  │
│  Input Features                  │
│  ☑ NDVI    ☑ EVI    ☐ SAVI     │
│                                  │
│  ┌────────────────────────────┐  │
│  │  ▶ Run Classification      │  │
│  └────────────────────────────┘  │
│                                  │
├══════════════════════════════════┤
│  RESULTADOS                      │
│                                  │
│  Total Area:      125.4 ha       │
│  Classified Area: 118.7 ha       │
│                                  │
│  ┌────────────────────────────┐  │
│  │ 🟩 High Vigor     42.3%    │  │
│  │    50.2 ha                 │  │
│  ├────────────────────────────┤  │
│  │ 🟨 Medium Vigor   35.1%    │  │
│  │    41.6 ha                 │  │
│  ├────────────────────────────┤  │
│  │ 🟥 Low Vigor      22.6%    │  │
│  │    26.9 ha                 │  │
│  └────────────────────────────┘  │
│                                  │
│  [📤 Export Report]              │
│  [💾 Save Classification]       │
└──────────────────────────────────┘
```

### 3.2 Mapa com Overlay de Classificação (Direita)

```
┌─────────────────────────────────────────┐
│                                          │
│     Imagem de Satélite                   │
│                                          │
│        ┌─────────────────┐               │
│        │ ┌───┐┌───┐┌───┐│               │
│        │ │🟩 ││🟨 ││🟩 ││               │
│        │ │   ││   ││   ││               │
│        │ ├───┤├───┤├───┤│               │
│        │ │🟨 ││🟥 ││🟨 ││               │
│        │ │   ││   ││   ││               │
│        │ ├───┤├───┤├───┤│               │
│        │ │🟩 ││🟩 ││🟥 ││               │
│        │ │   ││   ││   ││               │
│        │ └───┘└───┘└───┘│               │
│        │  OVERLAY DE     │               │
│        │  CLASSIFICAÇÃO  │               │
│        └─────────────────┘               │
│                                          │
└─────────────────────────────────────────┘
```

---

## 4. Fluxo de Navegação

```
┌──────────────────┐
│                  │
│  Dashboard (/)   │◀──────────────────────────┐
│                  │                            │
│  ┌────────────┐  │     ┌───────────────────┐  │
│  │ Analytics  │──│────▶│ Resultado no Mapa │  │
│  │ Tab        │  │     │ (overlay 2D)      │  │
│  └────────────┘  │     └─────────┬─────────┘  │
│                  │               │             │
│  ┌────────────┐  │     ┌────────▼──────────┐  │
│  │ Research   │──│────▶│ Visualização 3D   │  │
│  │ Tab        │  │     │ (toggle)          │  │
│  └────────────┘  │     └───────────────────┘  │
│                  │                             │
│  ┌────────────┐  │     ┌───────────────────┐  │
│  │ Link       │──│────▶│  /classification  │──┘
│  │ Classif.   │  │     │                   │
│  └────────────┘  │     │  ← Back to        │
│                  │     │    Dashboard       │
└──────────────────┘     └───────────────────┘
```

---

## 5. Componentes de Interface Reutilizáveis

### 5.1 Componentes shadcn/ui Utilizados

| Componente | Uso no Sistema |
|------------|----------------|
| **Button** | Ações principais (Visualizar, Run Classification, Export) |
| **Select** | Seleção de talhão, tipo de cultura, número de classes |
| **Tabs** | Alternância Analytics/Research, métodos de classificação, análise rápida |
| **Dialog** | Modal de configuração de parâmetros de experimento |
| **Slider** | Ajuste de parâmetros numéricos (sigma, threshold, kernel size) |
| **Switch** | Toggles de smooth visualization e 3D view |
| **Label** | Rótulos de campos de formulário |

### 5.2 Componentes Customizados

| Componente | Descrição |
|------------|-----------|
| **MapViewer** | Mapa Leaflet com camadas de satélite/ruas, ferramentas de desenho, overlay de resultados, popups de estresse NDVI, busca de endereço |
| **Terrain3DViewer** | Visualização Three.js com plano deformado por elevação, iluminação 3 pontos, orbit controls |
| **ExperimentMenu** | Accordion com 5 categorias e 13 experimentos clicáveis |
| **ExperimentDialog** | Modal com sliders dinâmicos baseados no tipo de experimento |
| **IndexLegend** | Legenda com gradiente de cores, fórmula do índice, guia de interpretação (NDVI) |

---

## 6. Paleta de Cores e Estilo Visual

### Cores do Sistema
| Elemento | Cor | Uso |
|----------|-----|-----|
| Background | `#09090b` (zinc-950) | Fundo principal (tema escuro) |
| Card | `#18181b` (zinc-900) | Painéis e cards |
| Primary | `#22c55e` (green-500) | Botões de ação, indicadores positivos |
| Accent | `#3b82f6` (blue-500) | Talhão selecionado, links |
| Text | `#fafafa` (zinc-50) | Texto principal |
| Muted | `#a1a1aa` (zinc-400) | Texto secundário |

### Gradiente de Índices (NDVI)
| Valor | Cor | Significado |
|-------|-----|-------------|
| -1.0 a -0.2 | `#8B4513` (marrom) | Água/solo exposto |
| -0.2 a 0.0 | `#D2691E` (marrom claro) | Solo |
| 0.0 a 0.2 | `#DAA520` (dourado) | Vegetação escassa |
| 0.2 a 0.4 | `#ADFF2F` (amarelo-verde) | Vegetação moderada |
| 0.4 a 0.6 | `#32CD32` (verde lima) | Vegetação saudável |
| 0.6 a 1.0 | `#006400` (verde escuro) | Vegetação densa |

---

## 7. Responsividade

- **Largura mínima recomendada:** 1024px
- O painel lateral tem largura fixa de 384px (w-96)
- O mapa ocupa o espaço restante (`flex-1`)
- Na página de classificação, o layout é 50/50
- Componentes shadcn/ui são nativamente responsivos
- A visualização 3D adapta o canvas ao container
