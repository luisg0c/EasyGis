# Entrega da Avaliação P2 — Engenharia de Software

## ICEV Remote Sensing Software

**Disciplina:** Engenharia de Software
**Avaliação:** P2 — Produto Mínimo Viável (MVP)
**Data de Entrega:** 11/05/2026
**Equipe:** Luis Gustavo Olimpio, Lauan Matheus, João Leonardi, João Vinícius Castello, Vinícius Henrique, Lucas Benevinuto, José Melquíades

---

## 1. Mapeamento dos Entregáveis Obrigatórios

Este documento é o ponto de partida da avaliação. Cada entregável obrigatório da P2 está mapeado abaixo para o arquivo correspondente no repositório.

| # | Entregável (P2) | Localização |
|---|-----------------|-------------|
| 1 | **Código-fonte do MVP** (versionado, organizado) | Raiz do repositório — diretórios [api/](../api/), [web/](../web/), [data/](../data/). Histórico Git completo. |
| 2 | **Plano de Testes** (casos baseados em requisitos) | [docs/08-plano-de-testes.md](08-plano-de-testes.md) |
| 2 | **Relatório de Testes** (evidências + análise) | [docs/09-relatorio-de-testes.md](09-relatorio-de-testes.md) — execução em [tests/](../tests/) |
| 3 | **Manual do Usuário Simplificado** | [docs/07-manual-usuario.md](07-manual-usuario.md) |
| 4 | **Apresentação e Demonstração** | [docs/apresentacao-p2.tex](apresentacao-p2.tex) (Beamer → PDF) |
| 5 | **Documentação Técnica** | Ver Seção 2 abaixo (consolidada) |

---

## 2. Documentação Técnica (Critério 4 — 1,5 pt)

A documentação técnica está **distribuída em vários documentos especializados** já produzidos no Sprint inicial. O escopo de cada um está mapeado aqui:

| Item exigido pela P2 | Documento(s) |
|----------------------|--------------|
| Descrição detalhada da arquitetura | [04-diagramas-arquitetura.md](04-diagramas-arquitetura.md) — 8 diagramas (alto nível, componentes, deployment, sequência NDVI, sequência classificação, estrutura de diretórios, fluxo de dados) |
| Tecnologias utilizadas | [04-diagramas-arquitetura.md § 8](04-diagramas-arquitetura.md) — stack consolidada frontend + backend |
| Decisões de design e justificativas | [04-diagramas-arquitetura.md § 9](04-diagramas-arquitetura.md) — DA-01 a DA-05 + complemento na **Seção 3** deste documento |
| Requisitos funcionais e não funcionais | [03-especificacao-requisitos-SRS.md](03-especificacao-requisitos-SRS.md) — 20 RFs e 8 RNFs |
| Backlog priorizado e rastreabilidade | [02-backlog-produto.md](02-backlog-produto.md) — 33 histórias em 6 épicos, [03-SRS § 6](03-especificacao-requisitos-SRS.md) (matriz RF × US) |
| Visão de produto e usuários-alvo | [01-documento-visao-produto.md](01-documento-visao-produto.md) |
| Protótipo de interface | [05-prototipo-interface.md](05-prototipo-interface.md) |
| Plano de projeto | [06-plano-projeto-inicial.md](06-plano-projeto-inicial.md) |

---

## 3. Decisões de Design Complementares

Em complemento às decisões DA-01 a DA-05 já documentadas em [04-diagramas-arquitetura.md § 9](04-diagramas-arquitetura.md), estas são as decisões adicionais relevantes para a entrega do MVP:

### DA-06: Separação `SentinelProcessor` ↔ Camada de Rotas
**Decisão:** A classe `SentinelProcessor` (em [api/sentinel_processor.py](../api/sentinel_processor.py)) concentra toda a lógica de I/O geoespacial e cálculo numérico. As rotas FastAPI em [api/main.py](../api/main.py) só fazem orquestração e serialização.
**Justificativa:** Permite testar a camada de processamento em isolamento (sem precisar subir o servidor HTTP) — o que é exatamente o que fazemos em [tests/test_sentinel_processor.py](../tests/test_sentinel_processor.py). Reduz acoplamento e melhora a manutenibilidade (RNF-05).

### DA-07: Tipagem Estática End-to-End
**Decisão:** TypeScript estrito no frontend e Pydantic no backend, com modelos espelhados (`Coordinate`, `IndexResult`, `ClassificationResult`).
**Justificativa:** Erros de contrato entre cliente e servidor são detectados em build/runtime, não em produção. Pydantic também valida a entrada do usuário automaticamente, reduzindo código de validação manual.

### DA-08: Resolução do Produto Sentinel-2 mais Recente como Padrão
**Decisão:** Quando `product_name` é omitido, o backend ordena os produtos `.SAFE` por nome (que contém data ISO) e usa o mais recente.
**Justificativa:** Otimiza o caminho feliz do usuário leigo, que normalmente quer "ver agora". O usuário avançado ainda pode passar um produto específico para comparações temporais.

### DA-09: Suavização Gaussiana com Preservação de NaN
**Decisão:** O filtro gaussiano (`apply_smooth_filter`) divide o resultado pela máscara também filtrada, preservando o limite do polígono do talhão.
**Justificativa:** Aplicar gaussiano direto "sangra" os valores válidos para fora do talhão, criando halos artificiais. A correção por máscara é a abordagem padrão em sensoriamento remoto.

### DA-10: Visualização 3D via Downsampling
**Decisão:** Para o terreno 3D ([web/components/terrain-3d-viewer.tsx](../web/components/terrain-3d-viewer.tsx)), reduzimos a resolução por fator 4 antes de enviar ao cliente.
**Justificativa:** Talhões grandes podem ter milhões de pixels. Renderizar isso direto em WebGL trava navegadores em GPU integrada (RNF-01). O downsample mantém a interpretação visual sem custo de performance.

### DA-11: Gerenciamento de Dependências Python via `uv`
**Decisão:** Usar `uv` (pyproject.toml + uv.lock) em vez de pip + requirements.txt.
**Justificativa:** `uv` é ~10× mais rápido em instalação, garante builds reprodutíveis via lock file e simplifica o setup em máquinas novas (`uv sync` resolve tudo). Trade-off: dependência extra que o usuário precisa instalar — mitigado pela documentação clara no [README.md](../README.md).

---

## 4. Tecnologias — Justificativa Resumida

Tabela completa em [04-diagramas-arquitetura.md § 8](04-diagramas-arquitetura.md). Justificativas-chave:

| Tecnologia | Por que esta e não outra |
|------------|--------------------------|
| **FastAPI** | Validação automática via Pydantic, OpenAPI grátis (`/docs`), async nativo. Alternativas (Flask) exigiriam plugins para o mesmo nível. |
| **rasterio** | Padrão de fato para I/O de imagens geoespaciais em Python. Wrapper Pythonic sobre GDAL. |
| **Next.js + React** | App Router permite SSR + API routes no mesmo projeto (ex: `/api/fields` lê KML do disco sem expor o filesystem). |
| **Leaflet** | Maduro, leve, integra bem com tiles do Esri/OSM. Alternativas (Mapbox GL) exigem token e são pagas. |
| **Three.js / react-three-fiber** | Visualização 3D nativa em WebGL. Alternativa (Cesium) é overkill para terreno simples. |
| **Tailwind + shadcn/ui** | Componentes acessíveis (Radix por baixo), sem CSS-in-JS, sem bundler extra. |
| **fast-xml-parser** | KML é XML; este parser é o mais rápido em Node.js sem dependências nativas. |

---

## 5. Como Avaliar Esta Entrega

**Setup rápido (5 minutos):**
```bash
# Pré-requisitos: Python 3.12+, Node 18+, GDAL (brew install gdal)
uv sync                       # instala dependências Python
cd web && npm install         # instala dependências Node
cd ..

# Em 2 terminais:
./run_api.sh                  # backend na porta 8000
cd web && npm run dev         # frontend na porta 3000
```

**Roteiro de demonstração (5 minutos):**
1. Abrir http://localhost:3000
2. Selecionar talhão "crop field 1"
3. Calcular NDVI → ver overlay no mapa, estatísticas e histograma
4. Trocar para EVI → comparar
5. Ativar visualização 3D → rotacionar terreno
6. Ir em `/classification` → rodar K-Means com 3 classes → ver áreas em hectares

**Para testes:**
```bash
uv sync --group dev           # instala pytest
uv run pytest tests/ -v       # roda 12 testes — ver relatório em docs/09
```

---

## 6. Estrutura Final do Repositório

```
icev-remote-sensing-software/
├── README.md                  # Setup + instruções de execução
├── pyproject.toml             # Dependências Python
├── api/                       # Backend FastAPI
│   ├── main.py
│   └── sentinel_processor.py
├── web/                       # Frontend Next.js
│   ├── app/
│   ├── components/
│   ├── lib/
│   └── types/
├── data/
│   ├── products/              # Imagens Sentinel-2 .SAFE
│   └── KML Fields/            # Polígonos de talhões
├── tests/                     # Suite de testes (pytest)  ← NOVO P2
│   ├── conftest.py
│   ├── test_sentinel_processor.py
│   └── test_api_endpoints.py
└── docs/
    ├── 00-ENTREGA-P2.md       # ← Você está aqui
    ├── 01-documento-visao-produto.md
    ├── 02-backlog-produto.md
    ├── 03-especificacao-requisitos-SRS.md
    ├── 04-diagramas-arquitetura.md
    ├── 05-prototipo-interface.md
    ├── 06-plano-projeto-inicial.md
    ├── 07-manual-usuario.md           # ← NOVO P2
    ├── 08-plano-de-testes.md          # ← NOVO P2
    ├── 09-relatorio-de-testes.md      # ← NOVO P2
    └── apresentacao-p2.tex            # ← NOVO P2 (Beamer)
```
