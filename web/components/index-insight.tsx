'use client';

import { Sparkles, AlertTriangle, CheckCircle2, Info, Activity, ArrowUpRight } from 'lucide-react';
import { generateInsight, type Severity } from '@/lib/insights';
import type { IndexType } from '@/lib/spectral-indices';

interface IndexInsightProps {
  indexType: IndexType;
  statistics: {
    min: number;
    max: number;
    mean: number;
    median: number;
    std: number;
    count: number;
  };
}

const SEVERITY_CONFIG: Record<
  Severity,
  { icon: typeof Activity; color: string; bg: string; label: string }
> = {
  critical: { icon: AlertTriangle, color: 'text-clay', bg: 'bg-clay/10', label: 'Crítico' },
  warning: { icon: AlertTriangle, color: 'text-amber', bg: 'bg-amber/10', label: 'Atenção' },
  neutral: { icon: Info, color: 'text-stone', bg: 'bg-moss-50', label: 'Neutro' },
  good: { icon: CheckCircle2, color: 'text-moss-700', bg: 'bg-moss-50', label: 'Bom' },
  excellent: { icon: CheckCircle2, color: 'text-moss-900', bg: 'bg-moss-100', label: 'Excelente' },
};

export function IndexInsight({ indexType, statistics }: IndexInsightProps) {
  const insight = generateInsight(indexType, statistics);
  const tierConfig = SEVERITY_CONFIG[insight.healthTier];

  return (
    <div className="border border-moss-100 bg-cream">
      {/* Header — IA tag + score */}
      <div className="flex items-start justify-between border-b border-moss-100 px-4 py-3.5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-moss-700" strokeWidth={2} />
          <p className="font-mono text-[10px] font-semibold tracking-widest uppercase text-moss-700">
            Análise IA
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono text-[9px] tracking-widest uppercase text-stone">Score</p>
          <p className="font-mono text-[18px] font-bold tabular-nums leading-none text-moss-950">
            {insight.healthScore}
            <span className="ml-0.5 text-[10px] font-normal text-stone">/100</span>
          </p>
        </div>
      </div>

      {/* Headline */}
      <div className="px-4 py-3.5">
        <div className={`mb-2 inline-flex items-center gap-1.5 px-2 py-1 ${tierConfig.bg}`}>
          <tierConfig.icon className={`h-3 w-3 ${tierConfig.color}`} strokeWidth={2} />
          <span
            className={`font-mono text-[10px] font-semibold tracking-widest uppercase ${tierConfig.color}`}
          >
            {tierConfig.label}
          </span>
        </div>

        <h4 className="font-display text-[18px] font-bold leading-tight tracking-tight text-moss-950">
          {insight.headline}
        </h4>

        <p className="mt-2 text-[12.5px] leading-relaxed text-smoke">{insight.summary}</p>
      </div>

      {/* Recomendações */}
      {insight.recommendations.length > 0 && (
        <div className="border-t border-moss-100 px-4 py-3.5">
          <p className="editorial-num mb-3">— Recomendações</p>
          <ul className="space-y-2.5">
            {insight.recommendations.map((rec, i) => {
              const cfg = SEVERITY_CONFIG[rec.severity];
              return (
                <li key={i} className="flex items-start gap-2.5">
                  <span
                    className={`mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center ${cfg.bg}`}
                  >
                    <cfg.icon className={`h-2.5 w-2.5 ${cfg.color}`} strokeWidth={2.5} />
                  </span>
                  <p className="text-[12.5px] leading-relaxed text-charcoal">{rec.text}</p>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Stats compactos */}
      <div className="border-t border-moss-100 bg-paper px-4 py-3">
        <p className="mb-2 font-mono text-[9px] tracking-widest uppercase text-stone">
          — Métricas observadas
        </p>
        <div className="grid grid-cols-4 gap-2">
          {(
            [
              { k: 'mean', label: 'Média' },
              { k: 'min', label: 'Mín' },
              { k: 'max', label: 'Máx' },
              { k: 'std', label: 'σ' },
            ] as const
          ).map(({ k, label }) => (
            <div key={k} className="text-center">
              <p className="font-mono text-[9px] tracking-widest uppercase text-stone">{label}</p>
              <p className="mt-1 font-mono text-[12px] tabular-nums text-moss-950">
                {statistics[k].toFixed(2)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="border-t border-moss-100 bg-cream px-4 py-2.5">
        <p className="flex items-center gap-1.5 font-mono text-[9px] tracking-wider text-stone">
          <ArrowUpRight className="h-2.5 w-2.5" strokeWidth={2} />
          Análise gerada por IA com base nos {statistics.count.toLocaleString('pt-BR')} pixels
          analisados.
        </p>
      </div>
    </div>
  );
}
