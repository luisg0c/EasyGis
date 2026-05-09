# Backlog do Produto Inicial

## ICEV Remote Sensing Software

**Versão:** 1.0
**Data:** 08/03/2026
**Equipe:** Luis Gustavo Olimpio, Lauan Matheus, João Leonardi, João Vinícius Castello, Vinícius Henrique, Lucas Benevinuto, José Melquíades

---

## Legenda de Prioridade

| Prioridade | Descrição |
|------------|-----------|
| 🔴 Alta | Essencial para o MVP — sem isso o produto não funciona |
| 🟡 Média | Importante para a experiência completa — agrega valor significativo |
| 🟢 Baixa | Desejável — melhoria incremental ou funcionalidade complementar |

---

## Épico 1: Gestão de Talhões Agrícolas

> Permitir que o usuário defina e gerencie as áreas agrícolas (talhões) que serão analisadas pelo sistema.

| ID | História de Usuário | Prioridade | Status |
|----|---------------------|------------|--------|
| US-01 | **Como** produtor rural, **quero** importar limites de talhões a partir de arquivos KML exportados do Google Earth, **para que** eu possa definir as áreas que desejo monitorar sem precisar redesenhá-las. | 🔴 Alta | Implementado |
| US-02 | **Como** agrônomo, **quero** visualizar todos os meus talhões sobre uma imagem de satélite no mapa interativo, **para que** eu tenha uma visão geral da propriedade. | 🔴 Alta | Implementado |
| US-03 | **Como** pesquisador, **quero** desenhar novos polígonos de talhão diretamente no mapa usando ferramentas de desenho, **para que** eu possa analisar áreas que ainda não estão cadastradas em KML. | 🟡 Média | Implementado |
| US-04 | **Como** produtor rural, **quero** ver a área em hectares de cada talhão, **para que** eu saiba a dimensão exata de cada área de cultivo. | 🟡 Média | Implementado |
| US-05 | **Como** agrônomo, **quero** salvar os talhões desenhados no mapa de forma persistente, **para que** eles não sejam perdidos ao recarregar a página. | 🟡 Média | Pendente |
| US-06 | **Como** produtor rural, **quero** buscar localizações por endereço no mapa, **para que** eu encontre rapidamente a região da minha propriedade. | 🟢 Baixa | Implementado |

---

## Épico 2: Processamento de Índices Espectrais

> Calcular e visualizar índices de vegetação e composições espectrais a partir de imagens Sentinel-2 sobre os talhões definidos.

| ID | História de Usuário | Prioridade | Status |
|----|---------------------|------------|--------|
| US-07 | **Como** agrônomo, **quero** calcular o índice NDVI sobre um talhão selecionado, **para que** eu possa avaliar a saúde e o vigor da vegetação na área. | 🔴 Alta | Implementado |
| US-08 | **Como** agrônomo, **quero** calcular o índice EVI sobre um talhão, **para que** eu tenha uma análise de vegetação com correção atmosférica, mais precisa em áreas de alta biomassa. | 🔴 Alta | Implementado |
| US-09 | **Como** pesquisador, **quero** visualizar composições em cor verdadeira (RGB) e falsa-cor dos talhões, **para que** eu possa interpretar visualmente as características da superfície. | 🟡 Média | Implementado |
| US-10 | **Como** estudante, **quero** visualizar cada uma das 13 bandas espectrais do Sentinel-2 individualmente, **para que** eu compreenda o que cada faixa do espectro eletromagnético revela sobre a superfície. | 🟡 Média | Implementado |
| US-11 | **Como** agrônomo, **quero** ver estatísticas descritivas (mínimo, máximo, média, mediana, desvio padrão) do índice calculado, **para que** eu tenha dados quantitativos além da visualização. | 🔴 Alta | Implementado |
| US-12 | **Como** pesquisador, **quero** ver o histograma de distribuição dos valores do índice, **para que** eu possa analisar a variabilidade espacial do talhão. | 🟡 Média | Implementado |
| US-13 | **Como** agrônomo, **quero** aplicar suavização gaussiana na visualização do índice, **para que** eu reduza ruído e identifique melhor padrões espaciais. | 🟢 Baixa | Implementado |
| US-14 | **Como** agrônomo, **quero** calcular os índices NDWI e SAVI, **para que** eu possa avaliar conteúdo hídrico e ajuste por solo respectivamente. | 🟡 Média | Pendente (parcial) |
| US-15 | **Como** agrônomo, **quero** selecionar qual produto Sentinel-2 usar quando houver múltiplas imagens disponíveis, **para que** eu possa comparar análises de datas diferentes. | 🟢 Baixa | Implementado (backend) |

---

## Épico 3: Visualização e Interação com Mapa

> Fornecer uma experiência de mapa interativa e rica para explorar os dados de sensoriamento remoto.

| ID | História de Usuário | Prioridade | Status |
|----|---------------------|------------|--------|
| US-16 | **Como** produtor rural, **quero** ver o resultado do índice espectral sobreposto ao mapa de satélite, **para que** eu identifique visualmente quais áreas do talhão estão com maior ou menor vigor. | 🔴 Alta | Implementado |
| US-17 | **Como** pesquisador, **quero** alternar entre camadas de mapa de satélite e mapa de ruas, **para que** eu tenha diferentes contextos visuais para a análise. | 🟢 Baixa | Implementado |
| US-18 | **Como** agrônomo, **quero** clicar em um ponto do mapa e ver o nível de estresse da vegetação naquele local, **para que** eu saiba exatamente onde intervir. | 🟡 Média | Implementado (popup NDVI) |
| US-19 | **Como** pesquisador, **quero** visualizar os dados espectrais como um terreno 3D interativo, **para que** eu compreenda a variabilidade espacial de forma intuitiva. | 🟡 Média | Implementado |
| US-20 | **Como** usuário, **quero** ver uma legenda de cores com a escala do índice e guia de interpretação, **para que** eu entenda o significado das cores exibidas no mapa. | 🔴 Alta | Implementado |

---

## Épico 4: Laboratório de Experimentos de Processamento de Imagem

> Permitir que pesquisadores e estudantes apliquem algoritmos de visão computacional sobre as imagens de satélite para fins de estudo e análise.

| ID | História de Usuário | Prioridade | Status |
|----|---------------------|------------|--------|
| US-21 | **Como** estudante, **quero** aplicar filtros de suavização (gaussiano, mediana, bilateral) sobre a banda NIR de um talhão, **para que** eu aprenda como diferentes filtros afetam dados de sensoriamento remoto. | 🟡 Média | Implementado |
| US-22 | **Como** pesquisador, **quero** aplicar detectores de borda (Sobel, Canny, Laplaciano) sobre imagens de satélite, **para que** eu identifique limites entre diferentes tipos de cobertura do solo. | 🟡 Média | Implementado |
| US-23 | **Como** estudante, **quero** aplicar operações morfológicas (erosão, dilatação, abertura, fechamento) sobre imagens, **para que** eu compreenda como essas técnicas melhoram a segmentação. | 🟡 Média | Implementado |
| US-24 | **Como** pesquisador, **quero** aplicar segmentação por limiar (binário, Otsu, adaptativo) nas imagens, **para que** eu separe regiões de interesse (ex: vegetação vs. solo exposto). | 🟡 Média | Implementado |
| US-25 | **Como** estudante, **quero** ajustar os parâmetros de cada experimento por meio de sliders interativos, **para que** eu veja em tempo real o efeito de diferentes configurações. | 🟡 Média | Implementado |
| US-26 | **Como** pesquisador, **quero** exportar os resultados dos experimentos, **para que** eu possa incluí-los em relatórios e artigos. | 🟢 Baixa | Pendente (stub UI) |

---

## Épico 5: Classificação de Culturas

> Classificar automaticamente as áreas agrícolas em diferentes categorias de uso do solo ou tipo de cultura.

| ID | História de Usuário | Prioridade | Status |
|----|---------------------|------------|--------|
| US-27 | **Como** agrônomo, **quero** classificar um talhão em zonas de vigor usando limiar de NDVI (baixo/médio/alto), **para que** eu identifique rapidamente áreas que precisam de atenção. | 🔴 Alta | Implementado |
| US-28 | **Como** pesquisador, **quero** aplicar classificação não-supervisionada (K-Means) com número configurável de classes, **para que** eu descubra padrões de agrupamento nos dados multiespectrais. | 🟡 Média | Implementado |
| US-29 | **Como** agrônomo, **quero** ver a área em hectares e a porcentagem de cada classe resultante da classificação, **para que** eu quantifique a distribuição das zonas no talhão. | 🔴 Alta | Implementado |
| US-30 | **Como** pesquisador, **quero** selecionar quais índices (NDVI, EVI, SAVI) usar como features para a classificação, **para que** eu controle a informação espectral usada no agrupamento. | 🟡 Média | Implementado |
| US-31 | **Como** agrônomo, **quero** classificar culturas usando um modelo supervisionado treinado (Random Forest), **para que** eu identifique tipos específicos de cultura (soja, milho, café, cana). | 🟡 Média | Pendente (simulado) |
| US-32 | **Como** usuário, **quero** ver o resultado da classificação como overlay colorido no mapa, **para que** eu visualize a distribuição espacial das classes. | 🔴 Alta | Implementado |

---

## Épico 6: Gestão de Dados Sentinel-2

> Gerenciar a disponibilidade e seleção de produtos de imagem Sentinel-2.

| ID | História de Usuário | Prioridade | Status |
|----|---------------------|------------|--------|
| US-33 | **Como** usuário, **quero** ver a lista de produtos Sentinel-2 disponíveis no sistema, **para que** eu saiba quais imagens posso analisar. | 🟡 Média | Implementado |
| US-34 | **Como** pesquisador, **quero** verificar o status de saúde do sistema (disponibilidade do diretório de produtos), **para que** eu saiba se o backend está operacional. | 🟢 Baixa | Implementado |
| US-35 | **Como** usuário, **quero** baixar automaticamente imagens Sentinel-2 para uma região e data, **para que** eu não precise fazer download manual pelo Copernicus Open Access Hub. | 🟢 Baixa | Pendente |

---

## Resumo do Backlog

| Épico | Total | Implementado | Pendente |
|-------|-------|-------------|----------|
| 1. Gestão de Talhões | 6 | 5 | 1 |
| 2. Índices Espectrais | 9 | 8 | 1 |
| 3. Visualização e Mapa | 5 | 5 | 0 |
| 4. Laboratório de Experimentos | 6 | 5 | 1 |
| 5. Classificação de Culturas | 6 | 5 | 1 |
| 6. Gestão de Dados | 3 | 2 | 1 |
| **Total** | **35** | **30** | **5** |

---

## Priorização (MoSCoW)

### Must Have (MVP)
US-01, US-02, US-07, US-08, US-11, US-16, US-20, US-27, US-29, US-32

### Should Have
US-03, US-04, US-09, US-10, US-12, US-14, US-15, US-18, US-19, US-21–US-25, US-28, US-30, US-33

### Could Have
US-05, US-06, US-13, US-17, US-26, US-31, US-34

### Won't Have (this release)
US-35
