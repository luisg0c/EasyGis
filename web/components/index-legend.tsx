'use client';

import { IndexType, SPECTRAL_INDICES } from '@/lib/spectral-indices';

interface IndexLegendProps {
  indexType: IndexType;
  statistics?: {
    min: number;
    max: number;
    mean: number;
    median: number;
  };
}

const NDVI_GUIDE: { range: string; meaning: string; tone: string }[] = [
  { range: '< 0',     meaning: 'Water, bare soil',          tone: 'text-stone' },
  { range: '0.0–0.2', meaning: 'Sparse vegetation',         tone: 'text-clay' },
  { range: '0.2–0.4', meaning: 'Moderate vegetation',       tone: 'text-amber' },
  { range: '0.4–0.6', meaning: 'Healthy vegetation',        tone: 'text-moss-600' },
  { range: '> 0.6',   meaning: 'Very healthy vegetation',   tone: 'text-moss-900' },
];

export function IndexLegend({ indexType, statistics }: IndexLegendProps) {
  const index = SPECTRAL_INDICES[indexType];

  return (
    <div className="border border-moss-100 bg-cream">
      {/* Header — index identity */}
      <div className="border-b border-moss-100 px-4 py-3.5">
        <p className="editorial-eyebrow text-stone">{indexType}</p>
        <h3 className="mt-1 font-display text-[16px] font-bold leading-tight tracking-tight text-moss-950">
          {index.name}
        </h3>
        <p className="mt-1.5 text-[12px] leading-relaxed text-smoke">{index.description}</p>
        <p className="mt-2 font-mono text-[10px] tracking-tight text-stone break-all">
          {index.formula}
        </p>
      </div>

      {/* Color scale */}
      <div className="px-4 py-3.5">
        <p className="editorial-num mb-2">— Color Scale</p>
        <div className="flex h-3 overflow-hidden border border-moss-100">
          {index.colorScale.map((color, i) => (
            <div key={i} style={{ backgroundColor: color }} className="flex-1" />
          ))}
        </div>
        <div className="mt-1.5 flex justify-between font-mono text-[10px] tabular-nums text-stone">
          <span>{index.range[0].toFixed(1)}</span>
          <span>{index.range[1].toFixed(1)}</span>
        </div>
      </div>

      {/* NDVI interpretation guide */}
      {indexType === 'NDVI' && (
        <div className="border-t border-moss-100 px-4 py-3.5">
          <p className="editorial-num mb-2">— Interpretation</p>
          <ul className="space-y-1.5">
            {NDVI_GUIDE.map(({ range, meaning, tone }) => (
              <li key={range} className="flex items-baseline justify-between gap-3 text-[12px]">
                <span className={`font-mono text-[11px] tabular-nums ${tone}`}>{range}</span>
                <span className="text-smoke">{meaning}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Stats footer */}
      {statistics && (
        <div className="border-t border-moss-100 bg-paper px-4 py-3">
          <div className="grid grid-cols-4 gap-2">
            {(['min', 'mean', 'median', 'max'] as const).map((k) => (
              <div key={k} className="text-center">
                <p className="font-mono text-[9px] tracking-widest uppercase text-stone">{k}</p>
                <p className="mt-1 font-mono text-[12px] tabular-nums text-moss-950">
                  {statistics[k].toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
