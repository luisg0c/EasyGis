# Documentação --- ICEV Remote Sensing Software

Esta pasta consolida toda a documentação do projeto, organizada por entrega.

---

## Entrega P2 (Avaliação 2 --- 11/05/2026)

Toda a documentação da **Avaliação P2** está em **[`p2/`](p2/)**. Comece por:

> **[`p2/00-ENTREGA-P2.pdf`](p2/00-ENTREGA-P2.pdf)** --- mapeia todos os entregáveis obrigatórios da P2 e indica onde cada um está.

| # | Entregável (P2) | Arquivo |
|---|-----------------|---------|
| 1 | Código-fonte do MVP | Raiz do repositório (`api/`, `web/`, `data/`) + [`tests/`](../tests/) |
| 2 | Plano de Testes | [`p2/08-plano-de-testes.pdf`](p2/08-plano-de-testes.pdf) |
| 2 | Relatório de Testes | [`p2/09-relatorio-de-testes.pdf`](p2/09-relatorio-de-testes.pdf) |
| 3 | Manual do Usuário | [`p2/07-manual-usuario.pdf`](p2/07-manual-usuario.pdf) |
| 4 | Apresentação | [`p2/apresentacao-p2.pdf`](p2/apresentacao-p2.pdf) ou [`.pptx`](p2/apresentacao-p2.pptx) |
| 5 | Documentação Técnica | Consolidada em [`p2/00-ENTREGA-P2.pdf`](p2/00-ENTREGA-P2.pdf) + docs do TP1 (abaixo) |

### Como recompilar os PDFs da P2

```bash
cd docs/p2
make p2          # gera os 5 PDFs
make clean       # remove artefatos (.aux, .log, .toc, .out)
make distclean   # remove artefatos + PDFs
```

---

## Documentação do TP1 (referenciada pela P2)

Os documentos abaixo foram produzidos no **TP1** (concepção, requisitos e arquitetura) e são **referenciados pela documentação técnica da P2**:

| Documento | Conteúdo |
|-----------|----------|
| [01-documento-visao-produto.md](01-documento-visao-produto.md) | Problema, solução proposta, usuários-alvo, contexto |
| [02-backlog-produto.md](02-backlog-produto.md) | 33 histórias de usuário em 6 épicos (priorizadas MoSCoW) |
| [03-especificacao-requisitos-SRS.md](03-especificacao-requisitos-SRS.md) | 20 RFs + 8 RNFs + matriz de rastreabilidade |
| [04-diagramas-arquitetura.md](04-diagramas-arquitetura.md) | 8 diagramas (alto nível, componentes, deployment, sequência, fluxo de dados, estrutura de diretórios) + stack consolidada + decisões DA-01 a DA-05 |
| [05-prototipo-interface.md](05-prototipo-interface.md) | Wireframes ASCII das telas |
| [06-plano-projeto-inicial.md](06-plano-projeto-inicial.md) | Cronograma, atribuições, riscos |

### Material complementar do TP1

Em **[`tp1/`](tp1/)**:

- [`tp1/documento-unificado.pdf`](tp1/documento-unificado.pdf) --- versão única consolidada (TP1) compilada de [`tp1/documento-unificado.tex`](tp1/documento-unificado.tex)
- [`tp1/canvas-experimento.tex`](tp1/canvas-experimento.tex) + [`tp1/canvas-experimentofinal.pdf`](tp1/canvas-experimentofinal.pdf) --- canvas de experimento
- [`tp1/atividade-unidade4.tex`](tp1/atividade-unidade4.tex) + [`tp1/atividade-unidade4.pdf`](tp1/atividade-unidade4.pdf) --- atividade da unidade 4
- [`tp1/images/`](tp1/images/) --- diagramas e figuras

---

## Estrutura completa da pasta `docs/`

```
docs/
├── README.md                                  ← você está aqui
│
├── 01-documento-visao-produto.md              ← TP1 (referenciado pela P2)
├── 02-backlog-produto.md
├── 03-especificacao-requisitos-SRS.md
├── 04-diagramas-arquitetura.md
├── 05-prototipo-interface.md
├── 06-plano-projeto-inicial.md
│
├── p2/                                        ← Entrega P2
│   ├── 00-ENTREGA-P2.{tex,pdf}                ← ponto de partida da avaliação
│   ├── 07-manual-usuario.{tex,pdf}
│   ├── 08-plano-de-testes.{tex,pdf}
│   ├── 09-relatorio-de-testes.{tex,pdf}
│   ├── apresentacao-p2.{tex,pdf,pptx}
│   ├── p2-preamble.tex                        ← preâmbulo LaTeX compartilhado
│   ├── Makefile                               ← build automatizado
│   ├── build_slides.py                        ← gerador do PPTX (backup)
│   └── md-sources/                            ← rascunhos markdown originais
│       ├── 00-ENTREGA-P2.md
│       ├── 07-manual-usuario.md
│       ├── 08-plano-de-testes.md
│       └── 09-relatorio-de-testes.md
│
└── tp1/                                       ← Material complementar do TP1
    ├── documento-unificado.{tex,pdf}
    ├── canvas-experimento.tex
    ├── canvas-experimentofinal.pdf
    ├── atividade-unidade4.{tex,pdf}
    └── images/
        ├── image.png
        ├── image3.png
        ├── image4.png
        └── image5.png
```

---

## Como avaliar esta entrega

1. Ler [`p2/00-ENTREGA-P2.pdf`](p2/00-ENTREGA-P2.pdf) (índice e mapeamento de entregáveis).
2. Seguir os links indicados para cada critério.
3. Para validar testes: `cd icev-remote-sensing-software && uv sync --group dev && uv run pytest tests/ -v`.
4. Para demonstração ao vivo: ver roteiro em [`p2/00-ENTREGA-P2.pdf`](p2/00-ENTREGA-P2.pdf) Seção 5.
