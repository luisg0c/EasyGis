# Plano de Projeto Inicial

## ICEV Remote Sensing Software

**Versão:** 1.0
**Data:** 08/03/2026
**Equipe:** Luis Gustavo Olimpio, Lauan Matheus, João Leonardi, João Vinícius Castello, Vinícius Henrique, Lucas Benevinuto, José Melquíades

---

## 1. Visão Geral do Projeto

**Nome:** ICEV Remote Sensing Software
**Tipo:** Plataforma Web de Sensoriamento Remoto para Agricultura de Precisão
**Metodologia:** Scrum (sprints de 2 semanas)
**Duração Total Estimada:** 10 semanas (5 sprints)
**Status Atual:** MVP concluído — em fase de documentação e refinamento

---

## 2. Equipe e Responsabilidades

| Membro | Papel Principal | Responsabilidades |
|--------|----------------|-------------------|
| **Luis Gustavo Olimpio** | Tech Lead / Backend | Arquitetura geral, processamento geoespacial (SentinelProcessor), integração rasterio, revisão de código |
| **Lauan Matheus** | Frontend Lead | Arquitetura Next.js, componentes React, integração Leaflet, estado global |
| **João Leonardi** | Backend Developer | Endpoints FastAPI, modelos Pydantic, algoritmos de classificação |
| **João Vinícius Castello** | Frontend Developer | Componentes de UI (shadcn/ui), ExperimentDialog, ExperimentMenu, responsividade |
| **Vinícius Henrique** | Full Stack / 3D | Visualização 3D (Three.js/react-three-fiber), Terrain3DViewer, integração de dados de elevação |
| **Lucas Benevinuto** | Data / Geoespacial | Parser KML, processamento de bandas espectrais, testes com dados Sentinel-2 |
| **José Melquíades** | QA / DevOps | Testes, documentação, scripts de deploy (run_api.sh), gerenciamento de dependências (pyproject.toml) |

---

## 3. Cronograma Macro

### Sprint 1 — Fundação (Semanas 1–2)
**Objetivo:** Estrutura base do projeto e leitura de dados

| Tarefa | Responsável | Status |
|--------|-------------|--------|
| Configurar repositório Git e estrutura de diretórios | José Melquíades | ✅ Concluído |
| Criar projeto Next.js com TypeScript e Tailwind | Lauan Matheus | ✅ Concluído |
| Criar projeto FastAPI com uvicorn | Luis Gustavo | ✅ Concluído |
| Implementar SentinelProcessor (leitura de bandas JP2) | Luis Gustavo | ✅ Concluído |
| Implementar KMLParser (parsing de talhões) | Lucas Benevinuto | ✅ Concluído |
| Configurar CORS e comunicação frontend-backend | João Leonardi | ✅ Concluído |
| Definir tipos TypeScript (types/index.ts) | Lauan Matheus | ✅ Concluído |

**Entregável:** Backend lendo imagens Sentinel-2 e frontend renderizando mapa base.

---

### Sprint 2 — Funcionalidades Core (Semanas 3–4)
**Objetivo:** Cálculo de índices espectrais e visualização no mapa

| Tarefa | Responsável | Status |
|--------|-------------|--------|
| Implementar endpoint POST /calculate-index (NDVI, EVI) | Luis Gustavo | ✅ Concluído |
| Implementar crop_to_geometry (recorte por polígono) | Luis Gustavo | ✅ Concluído |
| Implementar renderização PNG com gradiente de cores | João Leonardi | ✅ Concluído |
| Criar componente MapViewer com Leaflet | Lauan Matheus | ✅ Concluído |
| Implementar overlay de resultado no mapa | Lauan Matheus | ✅ Concluído |
| Criar painel lateral (Analytics tab) | João Vinícius | ✅ Concluído |
| Implementar seleção de talhão e índice | João Vinícius | ✅ Concluído |
| Implementar estatísticas descritivas e histograma | Lucas Benevinuto | ✅ Concluído |
| Criar componente IndexLegend | João Vinícius | ✅ Concluído |

**Entregável:** Usuário pode selecionar talhão, calcular NDVI/EVI e ver resultado no mapa com estatísticas.

---

### Sprint 3 — Funcionalidades Avançadas (Semanas 5–6)
**Objetivo:** Visualização 3D, bandas individuais e composições RGB

| Tarefa | Responsável | Status |
|--------|-------------|--------|
| Implementar Terrain3DViewer (Three.js) | Vinícius Henrique | ✅ Concluído |
| Implementar dados de elevação (downsampling 4x) | Luis Gustavo | ✅ Concluído |
| Adicionar toggle 2D/3D no painel | João Vinícius | ✅ Concluído |
| Implementar composições RGB e falsa-cor | João Leonardi | ✅ Concluído |
| Implementar visualização de bandas individuais (B01-B12, B8A) | Lucas Benevinuto | ✅ Concluído |
| Implementar registro de índices espectrais (spectral-indices.ts) | Lucas Benevinuto | ✅ Concluído |
| Adicionar ferramentas de desenho (leaflet-draw) | Lauan Matheus | ✅ Concluído |
| Adicionar busca de endereço (leaflet-geosearch) | Lauan Matheus | ✅ Concluído |
| Implementar popup de estresse NDVI | Lauan Matheus | ✅ Concluído |
| Implementar suavização gaussiana (smooth toggle) | Luis Gustavo | ✅ Concluído |

**Entregável:** Visualização 3D funcional, todas as bandas e composições disponíveis, desenho de talhões no mapa.

---

### Sprint 4 — Experimentos e Classificação (Semanas 7–8)
**Objetivo:** Laboratório de experimentos e classificação de culturas

| Tarefa | Responsável | Status |
|--------|-------------|--------|
| Implementar endpoint POST /api/experiments/run | João Leonardi | ✅ Concluído |
| Implementar 13 algoritmos de processamento de imagem | João Leonardi, Luis Gustavo | ✅ Concluído |
| Criar componente ExperimentMenu (accordion) | João Vinícius | ✅ Concluído |
| Criar componente ExperimentDialog (sliders dinâmicos) | João Vinícius | ✅ Concluído |
| Implementar aba Research no painel lateral | Lauan Matheus | ✅ Concluído |
| Criar página /classification | Lauan Matheus | ✅ Concluído |
| Implementar endpoint POST /api/classification/classify | Luis Gustavo | ✅ Concluído |
| Implementar K-Means clustering | Luis Gustavo | ✅ Concluído |
| Implementar classificação por limiar NDVI | João Leonardi | ✅ Concluído |
| Implementar cálculo de área por classe (hectares) | Lucas Benevinuto | ✅ Concluído |
| Exibir resultados de classificação (legenda, overlay) | Lauan Matheus | ✅ Concluído |

**Entregável:** Laboratório de experimentos funcional e classificação de culturas com 3 métodos.

---

### Sprint 5 — Refinamento e Documentação (Semanas 9–10)
**Objetivo:** Correção de bugs, documentação e preparação para entrega

| Tarefa | Responsável | Status |
|--------|-------------|--------|
| Corrigir dependências não declaradas (scipy, cv2, sklearn, skimage) | José Melquíades | 🔲 Pendente |
| Corrigir função generate_colored_image ausente | João Leonardi | 🔲 Pendente |
| Conectar NDWI/NDBI/SAVI no endpoint /calculate-index | Luis Gustavo | 🔲 Pendente |
| Elaborar Documento de Visão do Produto | José Melquíades | ✅ Concluído |
| Elaborar Backlog do Produto | José Melquíades | ✅ Concluído |
| Elaborar Especificação de Requisitos (SRS) | José Melquíades | ✅ Concluído |
| Elaborar Diagramas de Arquitetura | Luis Gustavo | ✅ Concluído |
| Elaborar Protótipo de Interface | Lauan Matheus, João Vinícius | ✅ Concluído |
| Elaborar Plano de Projeto | José Melquíades | ✅ Concluído |
| Testes de integração end-to-end | Vinícius Henrique, Lucas Benevinuto | 🔲 Pendente |
| Implementar persistência de talhões desenhados | Lauan Matheus | 🔲 Pendente |

**Entregável:** Documentação completa, bugs críticos corrigidos, sistema estável para apresentação.

---

## 4. Marcos do Projeto (Milestones)

| Marco | Data Estimada | Critério de Conclusão |
|-------|---------------|----------------------|
| **M1 — Infraestrutura** | Fim Sprint 1 | Backend lendo JP2, frontend com mapa base |
| **M2 — MVP Funcional** | Fim Sprint 2 | NDVI calculado e exibido no mapa com estatísticas |
| **M3 — Features Completas** | Fim Sprint 3 | 3D, todas as bandas, drawing tools, search |
| **M4 — Produto Completo** | Fim Sprint 4 | Experimentos + Classificação funcionais |
| **M5 — Entrega Final** | Fim Sprint 5 | Documentação, bugs corrigidos, testes passando |

---

## 5. Riscos Identificados

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Imagens Sentinel-2 muito grandes para processar em RAM | Média | Alto | Limitar tamanho máximo de talhão; processar em blocos |
| Dependências Python não declaradas causam erros em ambiente limpo | Alta | Médio | Adicionar scipy, opencv-python, scikit-learn, scikit-image ao pyproject.toml |
| Função `generate_colored_image` ausente quebra experimentos | Alta | Alto | Implementar a função ou refatorar para usar funções existentes |
| Latência de processamento ruim para talhões grandes | Média | Médio | Implementar feedback de progresso; otimizar com downsampling |
| Navegadores antigos sem suporte a WebGL | Baixa | Baixo | Manter visualização 2D como fallback; documentar requisitos |
| Dados KML malformados causam crash | Baixa | Médio | Validação e tratamento de erro no parser |

---

## 6. Definição de Pronto (Definition of Done)

Uma tarefa é considerada **concluída** quando:

1. O código está implementado e funcional
2. O código segue os padrões do projeto (TypeScript com tipos, Pydantic para validação)
3. Não há erros de console no frontend nem exceções não tratadas no backend
4. A funcionalidade foi testada manualmente com dados reais (imagem Sentinel-2 + KML)
5. O código foi revisado por pelo menos um outro membro da equipe
6. O código está commitado no repositório Git

---

## 7. Ferramentas e Ambiente de Desenvolvimento

| Ferramenta | Uso |
|------------|-----|
| **Git / GitHub** | Controle de versão e colaboração |
| **VS Code** | IDE principal |
| **uv** | Gerenciamento de dependências Python |
| **npm** | Gerenciamento de dependências Node.js |
| **uvicorn** | Servidor de desenvolvimento backend |
| **Next.js Dev Server** | Servidor de desenvolvimento frontend |
| **Google Earth** | Criação de arquivos KML de talhões |
| **Copernicus Open Access Hub** | Download de imagens Sentinel-2 |

---

## 8. Preparação para o Trabalho Prático 2

### Itens pendentes para a próxima fase:

1. **Persistência de dados**
   - Implementar banco de dados (SQLite ou PostgreSQL) para salvar talhões desenhados, resultados de análises e classificações
   - Histórico de análises por talhão

2. **Classificação supervisionada real**
   - Treinar modelo Random Forest com dados rotulados reais
   - Implementar pipeline de treinamento e inferência

3. **Correções técnicas**
   - Adicionar dependências faltantes ao pyproject.toml
   - Implementar função `generate_colored_image`
   - Conectar NDWI, NDBI e SAVI ao endpoint `/calculate-index`

4. **Qualidade de código**
   - Implementar testes unitários (pytest para backend, Jest para frontend)
   - Configurar CI/CD (GitHub Actions)
   - Lint e formatação automática (ruff para Python, ESLint para TypeScript)

5. **Melhorias de UX**
   - Loading states durante processamento longo
   - Mensagens de erro amigáveis
   - Download automático de imagens Sentinel-2

6. **Documentação técnica**
   - API documentation (OpenAPI/Swagger já disponível via FastAPI)
   - Guia de instalação e configuração
   - Manual do usuário
