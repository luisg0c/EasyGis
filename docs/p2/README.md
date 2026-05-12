# Entrega P2 · EasyGis

**Disciplina:** Gerência e Manutenção de Software
**Professor:** Mauro
**Instituição:** ICEV — Instituto de Ensino Superior · Teresina, PI
**Prazo:** 11/05/2026

---

## Como navegar esta pasta

Para avaliar o trabalho, abra os PDFs na ordem abaixo. **Comece pelo `00-ENTREGA-P2.pdf`** — ele explica onde cada critério da avaliação está atendido.

| # | Arquivo | Conteúdo | Tempo de leitura |
|---|---|---|---|
| 0 | **[`00-ENTREGA-P2.pdf`](00-ENTREGA-P2.pdf)** | Ponto de partida — mapeia cada critério da P2 ao artefato que comprova, com decisões de design DA-06 a DA-11 | ~10 min |
| 1 | [`07-manual-usuario.pdf`](07-manual-usuario.pdf) | Manual do usuário em linguagem leiga, com 8 screenshots passo-a-passo | ~5 min |
| 2 | [`08-plano-de-testes.pdf`](08-plano-de-testes.pdf) | Plano de testes — 54 casos planejados, matriz de rastreabilidade RF × CT | ~8 min |
| 3 | [`09-relatorio-de-testes.pdf`](09-relatorio-de-testes.pdf) | Relatório de execução — 54/54 passando em 1,20 s, cobertura 65% no processador | ~5 min |
| 4 | [`apresentacao-p2.pdf`](apresentacao-p2.pdf) | Slides da apresentação — 14 slides (também em [`.pptx`](apresentacao-p2.pptx)) | ~3 min |

> Para ver o código, voltar para a raiz: [`../../`](../../)
> Para a documentação do TP1 (visão, backlog, SRS, arquitetura): [`../`](../)

---

## Mapeamento dos critérios da Avaliação 2

| # | Critério (peso) | Onde está |
|---|---|---|
| **1** | **Implementação do MVP** (3,0 pt) | Código em [`../../api/`](../../api/) (FastAPI) + [`../../web/`](../../web/) (Next.js). Funcionamento: ver [`07-manual-usuario.pdf`](07-manual-usuario.pdf) (8 screenshots). Aderência ao backlog: ver [`00-ENTREGA-P2.pdf`](00-ENTREGA-P2.pdf) §2 (35 histórias, 30 entregues, 5 *Won't Have* conscientes) |
| **2** | **Qualidade do código** (2,0 pt) | E2E type-safety (Pydantic v2 + TypeScript strict), validators, exception hierarchy, separação `SentinelProcessor` / rotas HTTP (DA-06). Decisões em [`00-ENTREGA-P2.pdf`](00-ENTREGA-P2.pdf) §3 |
| **3** | **Testes de software** (2,0 pt) | [`08-plano-de-testes.pdf`](08-plano-de-testes.pdf) + [`09-relatorio-de-testes.pdf`](09-relatorio-de-testes.pdf). **54/54 passando** em 1,20 s. Cobertura **65% no processador**, **58% global**. Evidências em [`evidencias/`](evidencias/) |
| **4** | **Documentação técnica** (1,5 pt) | Arquitetura: [`../04-diagramas-arquitetura.md`](../04-diagramas-arquitetura.md) (8 diagramas, DA-01 a DA-05). Stack: [`00-ENTREGA-P2.pdf`](00-ENTREGA-P2.pdf) §4. Decisões adicionais DA-06 a DA-11: [`00-ENTREGA-P2.pdf`](00-ENTREGA-P2.pdf) §3 |
| **5** | **Manual do usuário** (0,5 pt) | [`07-manual-usuario.pdf`](07-manual-usuario.pdf) — fluxos passo-a-passo com screenshots, linguagem para usuários sem conhecimento de SIG |
| **6** | **Apresentação** (1,0 pt) | [`apresentacao-p2.pdf`](apresentacao-p2.pdf) — 14 slides cobrindo problema → solução → arquitetura → decisões → demo → testes → resultados → limitações → equipe. Tempo previsto: ~18 min |

---

## Como reproduzir os testes localmente

```bash
git clone https://github.com/luisg0c/EasyGis.git
cd EasyGis

uv sync --group dev
uv run pytest tests/ -v --cov=api --cov-report=term-missing
```

**Resultado esperado:** `54 passed in ~1.2s` · cobertura 65% no `sentinel_processor.py` · 58% global.

---

## Como rodar a aplicação (para a demonstração)

Pré-requisitos: Python 3.12+, Node 18+, GDAL (`brew install gdal` no macOS).

```bash
# Terminal 1 — backend
uv sync
./run_api.sh                  # porta 8000

# Terminal 2 — frontend
cd web && npm install && npm run dev      # porta 3000
```

Abrir http://localhost:3000 e seguir o [manual do usuário](07-manual-usuario.pdf).

---

## Estrutura desta pasta

```
docs/p2/
├── README.md                      ← você está aqui
│
├── 00-ENTREGA-P2.{tex,pdf}        ← ponto de partida da avaliação
├── 07-manual-usuario.{tex,pdf}    ← manual em linguagem leiga
├── 08-plano-de-testes.{tex,pdf}   ← 54 casos planejados
├── 09-relatorio-de-testes.{tex,pdf}  ← 54/54 passando, cobertura 65%/58%
├── apresentacao-p2.{tex,pdf,pptx} ← 14 slides
│
├── p2-preamble.tex                ← preâmbulo LaTeX compartilhado
├── Makefile                       ← `make p2` recompila todos os PDFs
├── build_slides.py                ← gerador do .pptx (backup do Beamer)
│
├── evidencias/                    ← logs de pytest, npm audit, git log
├── screenshots/                   ← screenshots usados no manual
└── md-sources/                    ← rascunhos markdown originais (antes do LaTeX)
```

---

## Equipe

- João Leonardi da Silva Melo
- João Vinícius Passos Castello Branco Carvalho
- José Melquíades Neto
- Lauan Matheus da Rocha Alves
- Lucas Benevinuto Pereira
- Luis Gustavo Olimpio
- Sammuel Moura Saraiva
- Vinicius Henrique Albino Andrade
