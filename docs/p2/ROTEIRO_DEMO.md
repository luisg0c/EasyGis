# Roteiro de Demo — EasyGis

> Demonstração ao vivo no slide 11 da apresentação. **Tempo alvo: 6:30 minutos.** Conduzida pelo João Vinícius Castello.

## Estado inicial necessário

> ⚠️ **Crítico:** sem produto Sentinel-2 e sem dependências instaladas, a demo trava. Validar 24 h antes da apresentação.

Antes da apresentação, **na máquina que vai apresentar**:

- [ ] Repositório clonado e dependências instaladas:
  ```bash
  uv sync                  # backend Python
  cd web && npm install    # frontend Node
  ```
- [ ] Pelo menos **1 produto Sentinel-2 Level-2A** descompactado em `data/products/`
  (ex.: `S2A_MSIL2A_20251020T...SAFE/`). Sem isso, `/calculate-index` retorna 404.
- [ ] Pelo menos **1 KML** em `data/KML Fields/` (já existe `crop field 1.kml`).
- [ ] **Backend rodando:** terminal 1 com `./run_api.sh` → http://localhost:8000 acessível.
- [ ] **Frontend rodando:** terminal 2 com `cd web && npm run dev` → http://localhost:3000.
- [ ] Cache do navegador limpo. Janela já aberta em http://localhost:3000.
- [ ] **Zoom do navegador em 110–125 %** para a plateia enxergar.
- [ ] Notificações silenciadas (Slack, e-mail).
- [ ] **Backup obrigatório:** sistema também rodando em uma segunda máquina; produto `.SAFE` em pendrive.

## Dados de teste prontos

- **Talhão:** `crop field 1` (já no dropdown).
- **Coordenadas usadas pelos testes:** Picos-PI (`−42,6194 −4,8809` etc.) — área agrícola real.
- **Credenciais:** **não há** — sistema é local, sem login.

## Como baixar o produto Sentinel-2

1. Acessar [Copernicus Browser](https://browser.dataspace.copernicus.eu/) (conta gratuita).
2. Filtrar produtos: **Sentinel-2 L2A**, região **Picos-PI** (lat ≈ −4,88; lon ≈ −42,62), nuvens < 20 %.
3. Baixar 1 produto (`.zip`, ~1 GB).
4. Descompactar dentro de `data/products/` (resulta em `data/products/S2A_MSIL2A_*.SAFE/`).
5. Validar: `curl http://localhost:8000/products` deve retornar `count >= 1`.

---

## Roteiro passo a passo (≈ 6:30 min)

### 1. Tela inicial *(0:00 – 0:15)*

**Ação:** mostrar a página em http://localhost:3000.

**Fala:**
> "Essa é a tela inicial. À esquerda, o painel de controle. À direita, o mapa Leaflet com tile de satélite. No topo, a aba Analytics ativa, e Research para o laboratório de experimentos."

---

### 2. Selecionar talhão *(0:15 – 0:30)*

**Ação:** clicar no dropdown "Talhão" → escolher `crop field 1`.

**Fala:**
> "Os talhões vêm de arquivos KML do Google Earth, lidos pela rota server-side. Quando seleciono, o mapa centraliza."

**Ponto de atenção:** o mapa deve animar até a região de Picos-PI.

---

### 3. Calcular NDVI *(0:30 – 1:30)*

**Ação:** dropdown "Índice" → `NDVI` → clicar **Calcular**.

**Fala (durante o cálculo):**
> "Por baixo, o backend está abrindo as bandas B08 (NIR) e B04 (Red) do produto Sentinel mais recente, recortando para o polígono do talhão e calculando NDVI = (NIR − Red) / (NIR + Red). Pode levar 5 a 30 segundos dependendo do tamanho."

**Ação ao terminar:** mostrar o overlay colorido + estatísticas + histograma.

**Fala:**
> "Aqui está. Verde escuro é NDVI alto, vegetação saudável. Amarelo médio. Marrom problemático. As estatísticas mostram média 0,XX, indicando vegetação razoavelmente saudável."

---

### 4. Clicar em um ponto *(1:30 – 1:50)*

**Ação:** clicar em um pixel verde dentro do talhão.

**Fala:**
> "Posso clicar em qualquer ponto e ver a classificação local — Severo, Moderado, Leve ou Saudável."

---

### 5. Trocar para EVI *(1:50 – 2:20)*

**Ação:** dropdown "Índice" → `EVI` → **Calcular**.

**Fala:**
> "EVI usa a banda azul também, com coeficientes que reduzem efeito atmosférico — útil em vegetação densa onde NDVI satura. Vejam que a faixa de valores muda."

---

### 6. Ativar 3D *(2:20 – 3:05)*

**Ação:** ligar o switch "3D View".

**Fala:**
> "A mesma área agora como relevo. Picos altos = pixels saudáveis. Vou rotacionar..."

**Ação:** arrastar o mouse para girar.

**Fala:**
> "...e dá pra ver visualmente onde tem variabilidade. Por baixo, o backend faz downsampling de fator 4 para o WebGL não travar."

---

### 7. Classificação *(3:05 – 4:35)*

**Ação:** clicar no link **Classification** no topo (ou abrir `/classification`).

**Fala:**
> "Agora classifico zonas de manejo. Três métodos."

**Ação:** selecionar talhão → método **K-Means** → `n_classes = 3` → **Classify**.

**Fala:**
> "K-Means agrupa pixels por similaridade nos índices NDVI, EVI e SAVI. Em poucos segundos..."

**Ação ao terminar:** mostrar mapa colorido + tabela de áreas.

**Fala:**
> "Três zonas com porcentagem e área em hectares. Para o produtor, isso é input direto: 'aplicar mais fertilizante na zona 2 que tem 4,3 hectares de baixo vigor'."

---

### 8. Aba Research — experimento *(4:35 – 5:35)*

**Ação:** voltar para `/`, clicar na aba **Research**.

**Fala:**
> "Para pesquisadores e estudantes, um laboratório com 14 técnicas de processamento de imagem."

**Ação:** abrir o menu de experimentos → selecionar **Canny edge** → executar.

**Fala:**
> "Canny detecta bordas — útil para identificar limites entre tipos de cobertura. Cada filtro tem sliders para ajustar parâmetros."

---

### 9. Encerramento da demo *(5:35 – 5:55)*

**Fala:**
> "Em resumo: lista de talhões, cálculo de 13 tipos de índice e bandas, classificação por três métodos, visualização 3D e laboratório de experimentos. Tudo rodando local. Volto para os slides."

**Ação:** alt-tab para os slides.

**Folga (5:55 – 6:30):** colchão para imprevistos da demo.

---

## Plano B — se algo falhar

| O que travou | Plano B |
|--------------|---------|
| **Backend não responde** | Mostrar a documentação OpenAPI em http://localhost:8000/docs e dizer "o cálculo está implementado conforme contrato — vou cobrir nos slides de arquitetura" |
| **Cálculo de NDVI demora >60 s** | Falar enquanto carrega: "como mencionei, depende do tamanho do produto. Se demorar mais, vamos para o próximo passo" |
| **Frontend tela branca** | Recarregar (F5). Se persistir, abrir aba Network e mostrar uma chamada bem-sucedida ao `/products` para evidenciar que o backend funciona |
| **3D trava o navegador** | Desligar imediatamente o switch 3D. Falar: "exato exemplo do trade-off que motivou o downsampling — DA-10" |
| **Classification falha** | Pular direto para os slides 12–13 (Testes) e citar: "fluxo equivalente ao NDVI — falamos sobre na arquitetura" |
| **Sem produto `.SAFE` em `data/products/`** | Mostrar `GET /products` retornando `count: 0` em http://localhost:8000/docs e explicar que sem o produto não dá para calcular — pular para os slides técnicos |
| **Energia/internet cai** | Continuar a apresentação só com slides; explicar que demo gravada está em backup (gravar antes!) |

---

## Pós-demo — perguntas comuns

| Pergunta provável | Resposta-padrão |
|-------------------|-----------------|
| "Pode rodar online?" | Sim, basta deploy do backend e frontend separados. Sem auth no MVP, então hoje é local. |
| "E o tempo real?" | Sentinel-2 imageia o Brasil a cada 5 dias. O sistema usa o produto mais recente disponível em `data/products/`. |
| "Quanto custa?" | Os dados são gratuitos (ESA Copernicus). O sistema é educacional sem custo de licença. |
| "Funciona em qualquer talhão?" | Em qualquer um dentro da imagem Sentinel disponível. Para outras áreas, basta baixar o produto da região. |
| "E culturas que o classificador não conhece?" | O método "supervisionado" é simulado no MVP (DT-04). K-Means e Threshold são genéricos. |
| "Por que não tem auth?" | Está em Won't Have do backlog. Adicionar requer banco, hashing (bcrypt/argon2 — nunca MD5/SHA1) e gestão de sessão. |
