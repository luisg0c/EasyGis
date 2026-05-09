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
    title: 'Image Filters',
    tag: 'I',
    experiments: [
      { type: 'gaussian_blur', title: 'Gaussian Blur', description: 'Apply Gaussian smoothing filter' },
      { type: 'median_filter', title: 'Median Filter', description: 'Remove salt and pepper noise' },
      { type: 'bilateral_filter', title: 'Bilateral Filter', description: 'Edge-preserving smoothing' },
    ],
  },
  {
    title: 'Edge Detection',
    tag: 'II',
    experiments: [
      { type: 'sobel_edge', title: 'Sobel', description: 'Gradient-based edge detection' },
      { type: 'canny_edge', title: 'Canny', description: 'Multi-stage edge detection' },
      { type: 'laplacian_edge', title: 'Laplacian', description: 'Second-derivative edge detection' },
    ],
  },
  {
    title: 'Enhancement',
    tag: 'III',
    experiments: [
      {
        type: 'histogram_equalization',
        title: 'Histogram Equalization',
        description: 'Redistribute intensity values to improve contrast',
      },
    ],
  },
  {
    title: 'Morphology',
    tag: 'IV',
    experiments: [
      { type: 'morphology_erosion', title: 'Erosion', description: 'Shrink bright regions' },
      { type: 'morphology_dilation', title: 'Dilation', description: 'Expand bright regions' },
      { type: 'morphology_opening', title: 'Opening', description: 'Erosion followed by dilation' },
      { type: 'morphology_closing', title: 'Closing', description: 'Dilation followed by erosion' },
    ],
  },
  {
    title: 'Segmentation',
    tag: 'V',
    experiments: [
      { type: 'threshold_binary', title: 'Binary Threshold', description: 'Cut at fixed value' },
      { type: 'threshold_otsu', title: 'Otsu Threshold', description: 'Auto-select optimal threshold' },
      { type: 'threshold_adaptive', title: 'Adaptive Threshold', description: 'Local adaptive cutoff' },
    ],
  },
];

export function ExperimentMenu({ onSelectExperiment }: ExperimentMenuProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['Image Filters']));

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
