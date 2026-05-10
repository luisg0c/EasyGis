# Pitch de Apresentação — ICEV Remote Sensing Software

> Script falado, slide a slide, com cronometragem. Apresentação Beamer em [`apresentacao-p2.pdf`](apresentacao-p2.pdf) — **17 slides** após adição do slide de Divisão de Responsabilidades. **Tempo alvo: 18 minutos** de fala + 1–2 min de Q&A. Rubrica avalia "participação dos membros da equipe" — cada um dos 8 integrantes tem bloco designado.

## Resumo da divisão

| Integrante | Bloco principal | Slides | Tempo |
|------------|----------------|--------|-------|
| **Lucas Benevinuto Pereira** | Capa + Agenda + Problema + Solução | 1–4 | 3:30 |
| **João Vinícius Passos Castello Branco Carvalho** | Para quem é? + Demo (condutor) | 5, 11 | 6:30 |
| **José Melquíades Neto** | Backlog priorizado | 6 | 1:00 |
| **Vinicius Henrique Albino Andrade** | Arquitetura + Fluxo NDVI | 7, 10 | 2:00 |
| **Luis Gustavo Olimpio** | Stack tecnológica + Decisões de design | 8, 9 | 2:00 |
| **Lauan Matheus da Rocha Alves** | Estratégia de testes + Resultados | 12, 13 | 1:30 |
| **Sammuel Moura Saraiva** | Limitações + Próximos passos | 14, 15 | 1:00 |
| **João Leonardi da Silva Melo** | Divisão de Responsabilidades + Encerramento | 16, 17 | 0:30 |
| **Todos** | Q&A | 17 | 1–2 min |

> **Total fala:** ≈ 18:00 min. Margem de 1–2 min para Q&A dentro dos 20 min permitidos.

---

## Pitch de elevador (30 segundos · ≤ 80 palavras)

> Versão curta. Use no corredor, no Slack, ou se a apresentação cair.

> "Pequenos produtores rurais não usam imagens de satélite gratuitas porque as ferramentas existentes são complexas demais. O **ICEV Remote Sensing Software** abre uma imagem Sentinel-2 e, em poucos cliques, calcula NDVI, classifica zonas em hectares e visualiza tudo em mapa 2D ou 3D. É voltado a produtores, agrônomos e pesquisadores que precisam de informação acionável sem horas de aprendizado em GIS. Web, gratuito, com 28 testes automatizados validando a lógica de cálculo."

---

## Pitch slide a slide

### Slide 1 — Capa  *(0:00 – 0:30 — Lucas Benevinuto)*

**Fala:**
> "Boa tarde. Somos o grupo que apresenta o **ICEV Remote Sensing Software**, uma plataforma web que calcula índices de vegetação a partir de imagens Sentinel-2 para qualquer talhão. Eu sou Lucas Benevinuto Pereira, e comigo estão João Leonardi da Silva Melo, João Vinícius Passos Castello Branco Carvalho, José Melquíades Neto, Lauan Matheus da Rocha Alves, Luis Gustavo Olimpio, Sammuel Moura Saraiva e Vinicius Henrique Albino Andrade."

**Transição:**
> "Vamos começar pela agenda."

---

### Slide 2 — Agenda  *(0:30 – 1:00 — Lucas Benevinuto)*

**Fala:**
> "Em 20 minutos vamos passar por: o problema que resolvemos, a solução, o backlog, a arquitetura, a stack, decisões de design, demonstração ao vivo, testes, limitações e próximos passos. A demo é o coração."

**Transição:**
> "Antes de mostrar o sistema, deixa eu contar o problema."

---

### Slide 3 — O problema  *(1:00 – 2:30 — Lucas Benevinuto)*

**Fala:**
> "A ESA libera imagens Sentinel-2 do Brasil inteiro a cada cinco dias, **de graça e em resolução de 10 metros**. Mas pouquíssimo produtor rural usa esses dados — porque a ferramenta para abrir é o problema, não o dado. ArcGIS e ENVI custam milhares de reais por ano. Scripts em Python pedem GDAL e treinamento. O resultado: produtores tomam decisão sobre adubação, irrigação e colheita sem informação que já está disponível. É a diferença entre **saber que existe** e **poder usar**."

**Pontos a NÃO esquecer:**
- Mencionar **gratuidade** do Sentinel-2 (chave do pitch).
- Ressaltar **barreira técnica**, não barreira de custo do dado.

**Transição:**
> "Foi pensando nisso que construímos a solução."

---

### Slide 4 — A solução  *(2:30 – 3:30 — Lucas Benevinuto)*

**Fala:**
> "O sistema é uma página web local. Você importa o talhão de um KML, escolhe o índice — NDVI, EVI, ou um dos outros 11 — e clica calcular. Em 5 a 30 segundos aparece o resultado: imagem colorida sobre o mapa, estatísticas no painel lateral, histograma. E vamos além de só calcular: classificamos o talhão em zonas de alto, médio e baixo vigor com áreas em hectares — informação direta para planejar aplicação de insumos. **Sem custo de licenciamento.**"

**Transição:**
> "Agora o João Vinícius vai contar pra quem isso é feito."

---

### Slide 5 — Para quem é?  *(3:30 – 4:00 — João Vinícius Castello)*

**Fala:**
> "Quatro perfis: **produtor rural** que decide hoje onde aplicar amanhã; **agrônomo** que faz prescrição de insumos por mapa de variabilidade; **pesquisador** que experimenta algoritmos sobre dados reais; e **estudante** aprendendo sensoriamento remoto na prática."

**Transição:**
> "Antes da demo, José Melquíades fala do que está dentro e do que está fora do MVP."

---

### Slide 6 — Backlog priorizado  *(4:00 – 5:00 — José Melquíades)*

**Fala:**
> "São 6 épicos e 35 histórias. Aplicamos **MoSCoW**: 28 implementadas mais 2 parciais funcionais, totalizando 85,7 % do backlog. Conscientemente fora do escopo — as Won't Haves — ficaram persistência de talhões desenhados, classificação supervisionada com modelo treinado real, exportação GeoTIFF, autenticação multiusuário e download automático do Copernicus. Cada um desses tem motivo registrado no `docs/02-backlog-produto.md`."

**Transição:**
> "Agora a demo. João Vinícius."

---

### Slide 11 — Demonstração ao vivo  *(5:00 – 11:30 — João Vinícius Castello, condutor)*

> ⚠️ Os slides 7, 8, 9, 10 são pulados ou exibidos brevemente — a demo é o coração.

**Fala de abertura:**
> "Vou abrir o sistema agora. Vocês vão ver: lista de talhões, cálculo de NDVI, classificação em zonas, visualização 3D e o laboratório de experimentos. Tudo rodando local."

**Roteiro detalhado:** ver [`ROTEIRO_DEMO.md`](ROTEIRO_DEMO.md). Resumo:
1. Abrir http://localhost:3000.
2. Selecionar `crop field 1` → calcular NDVI.
3. Mostrar overlay, stats, histograma. Clicar em ponto → popup com nível de estresse.
4. Trocar para EVI → comparar.
5. Ativar 3D → rotacionar.
6. Ir em `/classification` → K-Means com 3 classes → mostrar áreas em hectares.
7. (Se sobrar tempo) Aba "Research" → 1 experimento (Canny edge).

**Se travar:**
> "Vamos para o próximo passo enquanto isso reinicia."
> Continuar com o slide. **Plano B** descrito no roteiro de demo.

**Transição (ao voltar para slides):**
> "Esse é o que o usuário vê. Agora Vinícius Henrique mostra a arquitetura por baixo."

---

### Slide 7 — Arquitetura  *(11:30 – 12:30 — Vinícius Henrique)*

**Fala:**
> "Dois processos separados. Frontend Next.js na porta 3000 com Leaflet para o mapa, Three.js para o 3D e shadcn/ui. Backend FastAPI na porta 8000 com rasterio fazendo a leitura dos JP2 do Sentinel. **Sem banco de dados** — KMLs e produtos ficam no filesystem. A separação importante é entre a classe `SentinelProcessor`, que tem toda a matemática, e os handlers FastAPI, que só orquestram."

**Transição:**
> "E o fluxo de cálculo passa por essas dez etapas..."

---

### Slide 10 — Fluxo de cálculo de NDVI  *(12:30 – 13:00 — Vinícius Henrique)*

**Fala:**
> "Dez passos: usuário escolhe NDVI, frontend manda POST com coordenadas, backend resolve o produto Sentinel mais recente, rasterio lê NIR e Red, pyproj reprojeta o polígono para UTM, recorta as bandas, calcula a fórmula `(NIR − Red) / (NIR + Red)`, gera PNG colorido, retorna em base64 e o frontend sobrepõe no Leaflet."

**Transição:**
> "Stack — Luis Gustavo."

---

### Slide 8 — Stack tecnológica  *(13:00 – 13:45 — Luis Gustavo)*

**Fala:**
> "Cada escolha tem razão. **FastAPI** por causa do Pydantic — validação de input automática e OpenAPI grátis. **Rasterio** é padrão de fato sobre GDAL. **Next.js App Router** junta SSR e API routes no mesmo projeto. **Leaflet** em vez de Mapbox por ser leve e não exigir token. E **uv** como gerenciador Python — dez vezes mais rápido que pip."

**Transição:**
> "E as decisões importantes."

---

### Slide 9 — Decisões de design  *(13:45 – 14:30 — Luis Gustavo)*

**Fala:**
> "Documentamos 11 ADRs no doc técnico — 5 no TP1 e 6 na P2. As três que importam aqui: **DA-06**, separação processador-rotas que permitiu rodar 28 testes em menos de 1 segundo sem produto Sentinel real. **DA-07**, tipagem fim-a-fim com Pydantic espelhado em TypeScript — erros de contrato viram HTTP 422 ou erro de build, nunca 500 silencioso. E **DA-09**, suavização gaussiana com preservação de NaN — filtro direto sangra valores para fora do polígono criando halo, então filtramos também a máscara binária e dividimos."

**Transição:**
> "Lauan, fala dos testes."

---

### Slide 12 — Estratégia de testes  *(14:30 – 15:15 — Lauan Matheus)*

**Fala:**
> "Plano em três níveis. **Unitário** com pytest sobre o `SentinelProcessor` cobrindo cálculo de NDVI, EVI, estatísticas, histograma e casos de borda. **Integração** com TestClient do FastAPI para os endpoints HTTP e validação Pydantic. **Manual** end-to-end com produto Sentinel real na demonstração. Fixtures sintéticas em NumPy substituem o produto de 1 GB — a suíte roda em menos de 1 segundo."

**Transição:**
> "E o resultado."

---

### Slide 13 — Resultados dos testes  *(15:15 – 16:00 — Lauan Matheus)*

**Fala:**
> "**28 casos, 100 % aprovados**, 0,79 segundos para rodar. Cobertura de 55 % no `sentinel_processor.py` — que é onde a lógica está. Cobertura global de 24 % porque os endpoints de cálculo dependem do produto Sentinel real, e a gente declara isso como dívida técnica DT-03 no `00-ENTREGA-P2.pdf` em vez de fingir cobertura. Honestidade conta mais que falsa cobertura. Casos vinculados aos requisitos RF-04, 05, 06, 10, 11, 20 — temos matriz de rastreabilidade no plano de testes."

**Transição:**
> "Sammuel fala do que ficou de fora."

---

### Slide 14 — Limitações conhecidas  *(16:00 – 16:30 — Sammuel Moura)*

**Fala:**
> "Sem persistência de dados — talhões desenhados manualmente são perdidos ao recarregar. Classificação supervisionada **simulada**, não usa modelo treinado real. Imagens Sentinel baixadas manualmente — não tem download automático via API Copernicus. Single-user em localhost — sem auth ou multi-tenancy. Cobertura de I/O limitada. **Tudo isso é consciente**, está em Won't Have do backlog."

**Transição:**
> "E o roadmap."

---

### Slide 15 — Próximos passos  *(16:30 – 17:00 — Sammuel Moura)*

**Fala:**
> "Cinco prioridades. Integração com a API do Copernicus para download automático. Persistência via SQLite ou PostGIS. Random Forest treinado para classificação supervisionada real. Exportação GeoTIFF, Shapefile e CSV. Comparação temporal multi-data. CI no GitHub Actions com pytest e npm audit a cada push."

**Transição:**
> "Para fechar, João Leonardi."

---

### Slide 16 — Divisão de Responsabilidades  *(17:00 – 17:30 — João Leonardi, com participação de todos)*

**Fala (João Leonardi):**
> "O trabalho foi dividido por área técnica. Cada um conhece e defende a sua parte."

> Cada integrante diz a própria linha (curtíssima):

| Integrante | Fala (uma frase) |
|------------|------------------|
| João Leonardi | "Eu fiz o backend e a integração Git." |
| João Vinícius Castello | "Eu fiz o frontend e conduzi a demo." |
| José Melquíades | "Eu cuidei da modelagem de dados e do backlog." |
| Lauan Matheus | "Eu escrevi os testes automatizados." |
| Lucas Benevinuto | "Eu montei a apresentação e o pitch." |
| Luis Gustavo | "Eu escrevi a documentação técnica e os ADRs." |
| Sammuel Moura | "Eu escrevi o manual do usuário e o glossário." |
| Vinícius Henrique | "Eu cuidei da arquitetura, do DevOps e do roteiro de demo." |

**Transição:**
> "Encerramos com o resumo."

---

### Slide 17 — Encerramento  *(17:30 – 18:00 — João Leonardi)*

**Fala:**
> "Resumindo: nosso MVP transforma imagens públicas Sentinel-2 em informação acionável para produtores rurais, sem dor de GIS. Estamos abertos a perguntas. Obrigado!"

---

### Q&A  *(18:00 – 20:00 — Todos)*

> Quem souber, responde. Se ninguém souber: "Excelente pergunta — vamos investigar e voltar com a resposta."

**Perguntas previsíveis e quem responde:**

| # | Pergunta | Responde |
|---|----------|----------|
| Q1 | "Por que FastAPI e não Flask?" | Luis Gustavo |
| Q2 | "Por que NDVI é confiável?" | João Vinícius |
| Q3 | "O que K-Means faz?" | João Vinícius |
| Q4 | "Cobertura de 24 % é baixa?" | Lauan |
| Q5 | "Como vocês trabalharam em equipe?" | Lucas |
| Q6 | "Por que não tem CI/CD?" | Vinícius |
| Q7 | "Como adicionar um índice novo?" | Luis Gustavo |
| Q8 | "E se mudar de Sentinel-2 para Landsat?" | José Melquíades |
| Q9 | "Por que sem autenticação?" | Sammuel |
| Q10 | "E os 10 vulnerabilities do npm?" | João Leonardi |

---

## Regras de ensaio

- **Cronometre cada bloco** — não deixe ninguém estourar mais de 30 s.
- **Quem não está falando, não interrompe** — anota dúvida e fala no Q&A.
- **Se a demo travar:** condutor diz "Vamos para o próximo passo enquanto isso reinicia" e segue. Plano B no `ROTEIRO_DEMO.md`.
- **Última frase de cada integrante prepara a próxima** — transições explícitas como nos roteiros acima.
- **Ensaiar pelo menos 1 vez completo antes da apresentação** — sem ensaio, o tempo estoura.
