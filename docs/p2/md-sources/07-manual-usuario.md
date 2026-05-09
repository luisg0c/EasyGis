# Manual do Usuário

## ICEV Remote Sensing Software

**Versão:** 1.0
**Público-alvo:** Produtores rurais, agrônomos, pesquisadores e estudantes — não exige conhecimento técnico em programação.

---

## O que este sistema faz?

O **ICEV Remote Sensing Software** é uma plataforma web que mostra como está a **saúde da sua plantação** usando imagens de satélite gratuitas (Sentinel-2 / ESA Copernicus).

Em poucos cliques, você:

1. **Vê o seu talhão** (área agrícola) sobre uma imagem de satélite.
2. Calcula **índices de vegetação** (NDVI, EVI, etc.) que mostram, em cores, onde a plantação está saudável e onde precisa de atenção.
3. Pode **classificar** o talhão em zonas (alto, médio, baixo vigor) e ver quantos hectares cada zona ocupa.
4. Visualiza tudo em um **mapa interativo** ou em **3D**.

> **Em uma frase:** vermelho/marrom = vegetação fraca; amarelo = razoável; verde = saudável.

---

## Antes de começar

Você precisa que **alguém com conhecimento técnico** tenha feito a instalação inicial uma única vez. Veja o [README.md](../README.md) para isso. Depois disso, basta abrir o sistema e usar.

### Para abrir o sistema (após a instalação)

1. Abrir um terminal e rodar o backend:
   ```
   ./run_api.sh
   ```
2. Em outro terminal, rodar o frontend:
   ```
   cd web && npm run dev
   ```
3. Abrir o navegador em **http://localhost:3000**

Se algo der errado, peça ajuda ao administrador. Se aparecer "Frontend OK" e o mapa carregar, pode usar.

---

## Tela Inicial — o que cada coisa faz

```
┌──────────────────────────────────────────────────────────────────┐
│  [Logo ICEV]                                  [Analytics][Research]│  ← Abas
├──────────┬───────────────────────────────────────────────────────┤
│          │                                                       │
│  Talhão  │                                                       │
│  [▼]     │                  M A P A                              │
│          │                  D O                                  │
│  Índice  │                  S A T É L I T E                      │
│  [▼]     │                                                       │
│          │            (com seu talhão destacado)                 │
│ [Calcular]│                                                       │
│          │                                                       │
│  Stats:  │                                                       │
│  Min: ..│                                                       │
│  Max: ..│                                                       │
│  Méd: ..│                                                       │
│          │                                                       │
│  [Histo] │                                                       │
│  [3D]    │                                                       │
└──────────┴───────────────────────────────────────────────────────┘
```

| Onde | O que é | Para que serve |
|------|---------|----------------|
| **Aba "Analytics"** | Tela de análise rápida | Dia a dia: vê NDVI/EVI do talhão |
| **Aba "Research"** | Tela de pesquisa avançada | Comparar bandas individuais e experimentos |
| **Talhão (dropdown)** | Lista das suas áreas | Escolha qual área quer analisar |
| **Índice (dropdown)** | Tipo de análise | NDVI = saúde da planta; EVI = idem com correção atmosférica; RGB = foto colorida; B01–B12 = bandas individuais |
| **Botão "Calcular"** | Roda a análise no satélite | Pode demorar 5–30 segundos |
| **Mapa** | Imagem do satélite com seu talhão | O resultado aparece aqui sobreposto |
| **Stats** | Números do índice | Mínimo, máximo, média da área |
| **Histograma** | Gráfico de distribuição | Mostra se o talhão está homogêneo ou desigual |
| **Botão 3D** | Liga visualização 3D | Vê o índice como "relevo" — picos = mais saudável |

---

## Como fazer um NDVI em 4 passos

> **NDVI = Normalized Difference Vegetation Index.** É o índice mais usado para ver saúde da plantação. Vai de **−1** (água, areia) a **+1** (vegetação muito densa e saudável).

**Passo 1.** Abrir http://localhost:3000

**Passo 2.** No painel lateral esquerdo, clique no dropdown "Talhão" e escolha o seu (ex: `crop field 1`). O mapa centraliza na área.

**Passo 3.** No dropdown "Índice", escolha `NDVI`. Clique em **Calcular**.

**Passo 4.** Aguarde o resultado (5–30 segundos). Quando ficar pronto, você verá:
- Uma camada colorida sobre o talhão (marrom = baixo, amarelo = médio, verde = alto)
- Uma legenda no canto inferior com a escala de cores
- As estatísticas no painel lateral (média, máximo, mínimo)
- Um histograma mostrando a distribuição

> **Como interpretar:** se a média está acima de 0.6, a vegetação está saudável. Entre 0.3 e 0.6, em desenvolvimento ou estresse leve. Abaixo de 0.3, área degradada, solo exposto ou estresse forte.

### Clicar em um ponto do mapa

Depois do NDVI calculado, **clique em qualquer ponto** dentro do talhão. Aparecerá um popup classificando a saúde da vegetação naquele ponto exato:
- **Severo** (NDVI < 0.2)
- **Moderado** (0.2 a 0.4)
- **Leve** (0.4 a 0.6)
- **Saudável** (≥ 0.6)

---

## Outras análises disponíveis

| Índice | Quando usar |
|--------|-------------|
| **NDVI** | Padrão para saúde geral da vegetação. Use sempre primeiro. |
| **EVI** | Quando o talhão tem vegetação muito densa (NDVI satura). Mais preciso em soja, milho maduros. |
| **SAVI** | Quando há muito solo exposto entre as plantas (lavoura jovem, café espaçado). |
| **NDWI** | Para ver umidade e estresse hídrico. |
| **NDBI** | Para identificar áreas construídas (não-agrícolas). |
| **RGB** | Foto colorida normal — só visualizar o talhão. |
| **FALSE_COLOR** | Composição em falsa-cor (vegetação aparece em vermelho). Padrão em fotointerpretação. |
| **B01–B12** | Bandas individuais do satélite — para usuários avançados que sabem o que cada banda revela. |

### Suavização (opcional)

Existe um botão **"Smooth"** que aplica um filtro para reduzir ruído na imagem. Use quando o talhão estiver muito "granulado" — fica mais fácil ver padrões.

---

## Visualização 3D

Após calcular um índice, ative o switch **"3D View"** no canto superior do mapa. A área se transforma em um relevo onde:

- **Picos altos** = pixels com valor alto do índice (vegetação mais saudável)
- **Vales baixos** = valores baixos (estresse, solo exposto)

Você pode:
- **Arrastar** com o mouse para girar
- **Rolar** para zoom
- **Clicar com botão direito + arrastar** para mover

Útil para enxergar variabilidade dentro do talhão de forma intuitiva.

---

## Classificação de Culturas (página `/classification`)

Para classificar o talhão em zonas, acesse o link **"Classification"** no topo do site (ou abra http://localhost:3000/classification).

### Três métodos disponíveis

**1. Por Limiar (Threshold)** — *recomendado para iniciantes*
Divide o talhão em 3 zonas usando NDVI:
- 🔴 **Baixo Vigor** (NDVI < 0.3) — área que precisa de atenção urgente
- 🟡 **Médio Vigor** (0.3 a 0.6) — área em desenvolvimento ou com estresse leve
- 🟢 **Alto Vigor** (≥ 0.6) — área saudável

Cada zona vem com **% e área em hectares** — útil para planejar aplicação de insumos.

**2. K-Means (Não-supervisionado)** — *para análise exploratória*
Você escolhe quantas classes (de 2 a 6) e o sistema agrupa automaticamente. Bom para descobrir padrões que você não esperava.

**3. Supervisionada (Simulada)** — *demonstrativa*
Tenta identificar tipos de cultura (soja, milho, café, cana) com base em assinaturas espectrais conhecidas.

### Como rodar

1. Selecionar o talhão
2. Escolher o método (recomendado: **Threshold** se estiver começando)
3. Clicar em **"Classify"**
4. Ver o resultado colorido no mapa + tabela com hectares de cada classe

---

## Laboratório de Experimentos (Aba "Research")

Para usuários avançados que querem aplicar técnicas de processamento de imagem. Funciona com a banda NIR (B08) por padrão. Você pode experimentar:

- **Filtros** — Suavizar imagem (Gaussiano, Mediana, Bilateral)
- **Detecção de Bordas** — Achar limites entre tipos de cobertura (Sobel, Canny, Laplaciano)
- **Morfologia** — Erosão, Dilatação, Abertura, Fechamento
- **Segmentação** — Separar regiões (Limiar binário, Otsu, Adaptativo)

Em cada experimento, sliders permitem ajustar os parâmetros e ver o resultado em tempo real.

> Não é necessário entender todos os filtros — eles servem como ferramenta de aprendizado e exploração.

---

## Perguntas Frequentes

### "Por que demora tanto para calcular?"
Porque o sistema lê arquivos de satélite com centenas de megabytes e faz o recorte na hora. Para um talhão típico (até 100 ha), espere de 5 a 30 segundos. Talhões muito grandes podem levar mais.

### "Os meus talhões somem quando recarrego a página."
Sim, no MVP atual o sistema não salva o estado entre sessões. Os talhões importados via KML são lidos do disco toda vez (em `data/KML Fields/`), então esses ficam. Apenas os desenhados manualmente no mapa são perdidos.

### "Como adiciono um novo talhão?"
**Opção 1 — KML (recomendado):** No Google Earth, desenhe um polígono e exporte como `.kml`. Coloque o arquivo em `data/KML Fields/` e recarregue a página — ele aparecerá no dropdown.

**Opção 2 — Desenhar no mapa:** Use os ícones de polígono/retângulo no canto esquerdo do mapa. O talhão aparece imediatamente para análise (mas não fica salvo após recarregar).

### "Como adiciono uma nova imagem de satélite?"
Baixe um produto Sentinel-2 Level-2A do [Copernicus Open Access Hub](https://browser.dataspace.copernicus.eu/) e descompacte o `.SAFE` em `data/products/`. O sistema usa automaticamente a imagem mais recente.

### "Apareceu uma mensagem de erro vermelha. O que faço?"
A maioria dos erros está descrita na própria mensagem (ex: "Band B08 not found", "Polygon outside image bounds"). Os mais comuns:
- **"No products found"** — você esqueceu de colocar a imagem `.SAFE` em `data/products/`
- **"Field not found"** — o talhão não foi carregado; verifique se o arquivo `.kml` está em `data/KML Fields/`
- **"Polygon outside image bounds"** — o talhão está em uma região não coberta pela imagem; baixe outra imagem da área correta

Se o erro persistir, peça ajuda ao administrador.

### "O 3D está travando o navegador."
Use a aba "Analytics" sem ativar o 3D. A renderização 3D exige GPU e pode pesar em máquinas mais antigas. Talhões muito grandes geram mais polígonos — tente um talhão menor para testar.

---

## Glossário

| Termo | Significado simples |
|-------|---------------------|
| **NDVI / EVI / SAVI** | "Termômetros" da saúde da plantação. Calculados a partir de bandas do satélite. |
| **Banda** | Cada cor que o satélite enxerga (incluindo cores invisíveis ao olho humano, como infravermelho). |
| **Sentinel-2** | Satélite gratuito da Europa que fotografa o Brasil a cada 5 dias com resolução de 10 metros. |
| **Talhão** | Área de cultivo definida por seus limites geográficos. |
| **KML** | Formato de arquivo do Google Earth para guardar polígonos. |
| **Hectare (ha)** | 10 000 m² (um quadrado de 100 × 100 metros). |

---

## Suporte

Em caso de dúvida, problema ou sugestão, contate a equipe de desenvolvimento ou consulte os documentos técnicos em [docs/](.).
