# Build de todos os PDFs da entrega P2
# Uso:
#   make            -> compila todos os PDFs (P2 + TP1)
#   make p2         -> apenas docs da P2
#   make clean      -> remove artefatos (.aux, .log, .toc, .out)
#   make distclean  -> remove artefatos + PDFs

LATEX = pdflatex -interaction=nonstopmode -halt-on-error

P2_DOCS = 00-ENTREGA-P2 07-manual-usuario 08-plano-de-testes 09-relatorio-de-testes apresentacao-p2
TP1_DOCS = documento-unificado

P2_PDFS = $(addsuffix .pdf, $(P2_DOCS))
TP1_PDFS = $(addsuffix .pdf, $(TP1_DOCS))

.PHONY: all p2 tp1 clean distclean

all: p2 tp1

p2: $(P2_PDFS)

tp1: $(TP1_PDFS)

# Cada PDF é compilado em duas passadas para resolver TOC e refs cruzadas
%.pdf: %.tex p2-preamble.tex
	$(LATEX) $<
	$(LATEX) $<

# Documento TP1 não usa o preâmbulo da P2
documento-unificado.pdf: documento-unificado.tex
	$(LATEX) $<
	$(LATEX) $<

clean:
	rm -f *.aux *.log *.toc *.out *.nav *.snm *.vrb *.synctex.gz

distclean: clean
	rm -f $(P2_PDFS)

# Atalho para rebuild rápido (sem segunda passada)
quick:
	@for doc in $(P2_DOCS); do $(LATEX) $$doc.tex; done
