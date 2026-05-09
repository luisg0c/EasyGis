# Documento de Visão do Produto

## ICEV Remote Sensing Software — Plataforma de Sensoriamento Remoto para Agricultura de Precisão

**Versão:** 1.0
**Data:** 08/03/2026
**Equipe:** Luis Gustavo Olimpio, Lauan Matheus, João Leonardi, João Vinícius Castello, Vinícius Henrique, Lucas Benevinuto, José Melquíades

---

## 1. Introdução

### 1.1 Propósito
Este documento descreve a visão geral do produto ICEV Remote Sensing Software, uma plataforma web voltada para agricultura de precisão que processa e analisa imagens de satélite Sentinel-2 sobre áreas agrícolas definidas por arquivos KML.

### 1.2 Escopo
O sistema cobre desde a ingestão de dados geoespaciais (imagens Sentinel-2 Level-2A e polígonos KML de talhões) até a visualização interativa de índices espectrais, experimentos de processamento de imagem e classificação de culturas, tudo acessível via navegador web.

---

## 2. Descrição do Problema

| Item | Descrição |
|------|-----------|
| **O problema de** | Monitorar a saúde de culturas agrícolas de forma rápida e acessível, sem depender de vistorias presenciais ou softwares GIS proprietários de alto custo. |
| **Afeta** | Produtores rurais, agrônomos, pesquisadores e estudantes do setor agropecuário brasileiro. |
| **Cujo impacto é** | Decisões tardias ou desinformadas sobre irrigação, aplicação de insumos e manejo de pragas, resultando em perdas de produtividade e aumento de custos operacionais. |
| **Uma solução bem-sucedida seria** | Uma plataforma web gratuita que permita carregar limites de talhões, processar imagens multiespectrais de satélite e gerar mapas de índices vegetativos com estatísticas, sem necessidade de conhecimento avançado em geoprocessamento. |

---

## 3. Descrição da Solução Proposta

O ICEV Remote Sensing Software é uma aplicação web composta por:

- **Backend Python (FastAPI):** Processamento geoespacial de imagens Sentinel-2 usando rasterio, NumPy, SciPy e OpenCV. Responsável pelo cálculo de índices espectrais (NDVI, EVI, SAVI), composições RGB, experimentos de visão computacional e classificação de culturas.

- **Frontend Next.js (React + TypeScript):** Interface interativa com mapa Leaflet sobre imagens de satélite, painéis de controle para seleção de talhões e índices, visualização 3D do terreno via Three.js, e página dedicada para classificação de culturas.

### 3.1 Funcionalidades Principais

1. **Carregamento de Talhões:** Importação de polígonos de áreas agrícolas a partir de arquivos KML (exportados do Google Earth) e desenho de novos polígonos diretamente no mapa.

2. **Cálculo de Índices Espectrais:** Processamento pixel-a-pixel das bandas Sentinel-2 para gerar NDVI (saúde vegetal), EVI (vegetação corrigida atmosfericamente), SAVI (vegetação ajustada ao solo), além de composições em cor verdadeira e falsa-cor.

3. **Visualização de Bandas Individuais:** Acesso direto a todas as 13 bandas espectrais do Sentinel-2 (B01 a B12 + B8A) em diferentes resoluções (10m, 20m, 60m).

4. **Visualização 3D:** Renderização tridimensional interativa dos dados espectrais como mapa de relevo, usando os valores dos pixels como elevação.

5. **Laboratório de Experimentos:** 13 algoritmos de processamento de imagem organizados em 5 categorias (filtros, detecção de bordas, equalização, morfologia, segmentação) com parâmetros ajustáveis por sliders.

6. **Classificação de Culturas:** Classificação supervisionada (simulada), não-supervisionada (K-Means) e por limiar (NDVI threshold), com relatório de área em hectares por classe.

7. **Estatísticas e Histogramas:** Cálculo automático de mínimo, máximo, média, mediana, desvio padrão e histograma de 50 bins para cada análise.

---

## 4. Usuários-Alvo

| Perfil | Descrição | Necessidades Principais |
|--------|-----------|------------------------|
| **Produtor Rural** | Proprietário ou gestor de propriedade agrícola no Brasil | Monitorar saúde das lavouras, identificar áreas de estresse hídrico ou nutricional, otimizar aplicação de insumos |
| **Agrônomo** | Profissional técnico responsável pelo manejo agrícola | Gerar mapas de variabilidade para prescrição de insumos, analisar vigor vegetativo ao longo do ciclo |
| **Pesquisador Acadêmico** | Pesquisador em sensoriamento remoto ou agronomia | Experimentar algoritmos de processamento de imagem sobre dados reais, comparar índices espectrais |
| **Estudante** | Aluno de cursos de agronomia, engenharia agrícola ou ciência da computação | Aprender conceitos de sensoriamento remoto na prática, visualizar bandas espectrais e seus significados |

---

## 5. Contexto do Setor Agropecuário

O Brasil é um dos maiores produtores agrícolas do mundo, com aproximadamente 66 milhões de hectares de área plantada. A agricultura de precisão — uso de tecnologias para gerenciar a variabilidade espacial e temporal das lavouras — tem crescido significativamente, mas ainda enfrenta barreiras de adoção:

- **Custo de ferramentas GIS comerciais** (ArcGIS, ENVI) que podem ultrapassar milhares de reais anuais
- **Complexidade técnica** de softwares profissionais de sensoriamento remoto
- **Falta de soluções integradas** que combinem processamento de imagem, análise espectral e visualização em uma única plataforma acessível

O programa Copernicus da ESA disponibiliza gratuitamente imagens Sentinel-2 com resolução de 10m e revisita a cada 5 dias, oferecendo uma oportunidade única para democratizar o acesso à agricultura de precisão. Este software aproveita esses dados abertos para oferecer uma ferramenta acessível e educacional.

---

## 6. Visão Geral do Produto

### 6.1 Perspectiva do Produto
O ICEV Remote Sensing Software é um sistema standalone que opera localmente, processando imagens Sentinel-2 previamente baixadas. Não depende de serviços externos em tempo de execução (exceto tiles de mapa base). É uma ferramenta de análise e educação, não um sistema de produção contínua.

### 6.2 Premissas
- As imagens Sentinel-2 Level-2A (`.SAFE`) já estão disponíveis no diretório `data/products/`
- Os limites dos talhões são fornecidos como arquivos `.kml` no diretório `data/KML Fields/`
- O usuário possui um navegador moderno com suporte a WebGL (para visualização 3D)
- O sistema é executado em ambiente local (localhost)

### 6.3 Dependências Externas
- **Sentinel-2 (ESA/Copernicus):** Fonte dos dados multiespectrais
- **Esri World Imagery / OpenStreetMap:** Tiles de mapa base para visualização
- **OpenStreetMap Nominatim:** Serviço de busca de endereços no mapa

---

## 7. Características Diferenciais

1. **Gratuito e de código aberto** — sem custos de licenciamento
2. **Interface web intuitiva** — não requer instalação de software GIS desktop
3. **Visualização 3D interativa** — diferencial pedagógico para compreender variabilidade espacial
4. **Laboratório de experimentos** — permite aplicar e comparar 13 algoritmos de visão computacional sobre dados reais de satélite
5. **Classificação de culturas integrada** — da ingestão do dado à área classificada em hectares em uma única plataforma
6. **Foco no contexto brasileiro** — tipos de cultura (soja, milho, café, cana-de-açúcar) e geolocalização padrão em Piauí

---

## 8. Restrições

- O sistema não realiza download automático de imagens Sentinel-2
- Não há persistência de dados — resultados são perdidos ao recarregar a página
- A classificação supervisionada é simulada (não utiliza modelo treinado real)
- O sistema é projetado para execução local, sem suporte a múltiplos usuários simultâneos
- O cálculo de área utiliza aproximação (fórmula de Shoelace sobre coordenadas geográficas)
