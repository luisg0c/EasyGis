'use client';

import { useState } from 'react';
import { Plus, Minus } from 'lucide-react';

interface ExperimentItem {
  type: string;
  title: string;
  description: string;
}

interface ExperimentCategory {
  title: string;
  tag: string;
  experiments: ExperimentItem[];
}

interface ExperimentMenuProps {
  onSelectExperiment: (type: string, title: string, description: string) => void;
}

const CATEGORIES: ExperimentCategory[] = [
  {
    title: 'Filtros de Imagem',
    tag: 'I',
    experiments: [
      { type: 'gaussian_blur', title: 'Borrão Gaussiano', description: 'Aplica filtro de suavização gaussiana' },
      { type: 'median_filter', title: 'Filtro Mediana', description: 'Remove ruído sal-e-pimenta' },
      { type: 'bilateral_filter', title: 'Filtro Bilateral', description: 'Suavização preservando bordas' },
    ],
  },
  {
    title: 'Detecção de Bordas',
    tag: 'II',
    experiments: [
      { type: 'sobel_edge', title: 'Sobel', description: 'Detecção de bordas por gradiente' },
      { type: 'canny_edge', title: 'Canny', description: 'Detecção de bordas multi-estágio' },
      { type: 'laplacian_edge', title: 'Laplaciano', description: 'Detecção por segunda derivada' },
    ],
  },
  {
    title: 'Realce',
    tag: 'III',
    experiments: [
      {
        type: 'histogram_equalization',
        title: 'Equalização de Histograma',
        description: 'Redistribui intensidade para melhorar contraste',
      },
    ],
  },
  {
    title: 'Morfologia',
    tag: 'IV',
    experiments: [
      { type: 'morphology_erosion', title: 'Erosão', description: 'Encolhe regiões brilhantes' },
      { type: 'morphology_dilation', title: 'Dilatação', description: 'Expande regiões brilhantes' },
      { type: 'morphology_opening', title: 'Abertura', description: 'Erosão seguida de dilatação' },
      { type: 'morphology_closing', title: 'Fechamento', description: 'Dilatação seguida de erosão' },
    ],
  },
  {
    title: 'Segmentação',
    tag: 'V',
    experiments: [
      { type: 'threshold_binary', title: 'Limiar Binário', description: 'Corte em valor fixo' },
      { type: 'threshold_otsu', title: 'Limiar Otsu', description: 'Auto-seleciona limiar ótimo' },
      { type: 'threshold_adaptive', title: 'Limiar Adaptativo', description: 'Corte local adaptativo' },
    ],
  },
];

export function ExperimentMenu({ onSelectExperiment }: ExperimentMenuProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['Filtros de Imagem']));

  const toggle = (title: string) => {
    const next = new Set(expanded);
    if (next.has(title)) next.delete(title);
    else next.add(title);
    setExpanded(next);
  };

  return (
    <div className="border-t border-moss-100">
      {CATEGORIES.map((cat) => {
        const isOpen = expanded.has(cat.title);
        return (
          <div key={cat.title} className="border-b border-moss-100">
            <button
              onClick={() => toggle(cat.title)}
              className="flex w-full items-center justify-between px-1 py-3 text-left transition-colors hover:bg-moss-50"
            >
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-[10px] tabular-nums tracking-widest text-stone">
                  {cat.tag}
                </span>
                <p className="font-display text-[15px] font-bold tracking-tight text-moss-950">{cat.title}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] tracking-widest text-stone">
                  {cat.experiments.length}
                </span>
                {isOpen ? (
                  <Minus className="h-3.5 w-3.5 text-moss-700" strokeWidth={1.5} />
                ) : (
                  <Plus className="h-3.5 w-3.5 text-moss-700" strokeWidth={1.5} />
                )}
              </div>
            </button>

            {isOpen && (
              <ul className="space-y-px pb-2.5">
                {cat.experiments.map((exp) => (
                  <li key={exp.type}>
                    <button
                      onClick={() => onSelectExperiment(exp.type, exp.title, exp.description)}
                      className="group flex w-full items-baseline justify-between gap-3 border-l-2 border-transparent px-3 py-2 text-left transition-all hover:border-moss-700 hover:bg-cream"
                    >
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-charcoal group-hover:text-moss-900">
                          {exp.title}
                        </p>
                        <p className="mt-0.5 text-[11px] leading-relaxed text-smoke">
                          {exp.description}
                        </p>
                      </div>
                      <span
                        aria-hidden
                        className="font-mono text-[11px] text-stone opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        →
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
