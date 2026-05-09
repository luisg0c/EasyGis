'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';

interface ExperimentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  experimentType: string;
  experimentTitle: string;
  experimentDescription: string;
  onRun: (params: Record<string, number>) => Promise<void>;
}

interface ParamConfig {
  name: string;
  label: string;
  min: number;
  max: number;
  default: number;
  step: number;
}

function getParameterConfig(experimentType: string): ParamConfig[] {
  switch (experimentType) {
    case 'gaussian_blur':
      return [{ name: 'sigma', label: 'Sigma (suavização)', min: 0.5, max: 5, default: 2.0, step: 0.1 }];
    case 'median_filter':
      return [{ name: 'size', label: 'Tamanho do kernel', min: 3, max: 15, default: 5, step: 2 }];
    case 'bilateral_filter':
      return [
        { name: 'd', label: 'Diâmetro', min: 3, max: 15, default: 9, step: 2 },
        { name: 'sigma_color', label: 'Sigma cor', min: 10, max: 150, default: 75, step: 5 },
        { name: 'sigma_space', label: 'Sigma espaço', min: 10, max: 150, default: 75, step: 5 },
      ];
    case 'canny_edge':
      return [
        { name: 'low_threshold', label: 'Limiar inferior', min: 10, max: 150, default: 50, step: 10 },
        { name: 'high_threshold', label: 'Limiar superior', min: 50, max: 250, default: 150, step: 10 },
      ];
    case 'morphology_erosion':
    case 'morphology_dilation':
    case 'morphology_opening':
    case 'morphology_closing':
      return [{ name: 'kernel_size', label: 'Tamanho do kernel', min: 3, max: 15, default: 3, step: 2 }];
    case 'threshold_binary':
      return [{ name: 'threshold', label: 'Limiar', min: 0, max: 1, default: 0.5, step: 0.01 }];
    case 'threshold_adaptive':
      return [
        { name: 'block_size', label: 'Tamanho do bloco', min: 3, max: 25, default: 11, step: 2 },
        { name: 'c', label: 'Constante', min: -10, max: 10, default: 2, step: 1 },
      ];
    default:
      return [];
  }
}

export function ExperimentDialog({
  open,
  onOpenChange,
  experimentType,
  experimentTitle,
  experimentDescription,
  onRun,
}: ExperimentDialogProps) {
  const [running, setRunning] = useState(false);
  const [parameters, setParameters] = useState<Record<string, number>>({});

  const paramConfig = getParameterConfig(experimentType);

  const handleRun = async () => {
    setRunning(true);
    try {
      const params: Record<string, number> = {};
      paramConfig.forEach((p) => {
        params[p.name] = parameters[p.name] ?? p.default;
      });
      await onRun(params);
      onOpenChange(false);
    } catch (error) {
      console.error('Experimento falhou:', error);
    } finally {
      setRunning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] border-moss-100 bg-cream-grain p-0 [&>button]:hidden">
        {/* Editorial header */}
        <DialogHeader className="border-b border-moss-100 px-7 pb-5 pt-6 text-left">
          <p className="editorial-eyebrow text-stone">— Configuração do Experimento</p>
          <DialogTitle className="mt-2 font-display text-[24px] font-extrabold tracking-tight leading-[1.05] text-moss-950">
            {experimentTitle}
          </DialogTitle>
          <DialogDescription className="mt-2 text-[13px] leading-relaxed text-smoke">
            {experimentDescription}
          </DialogDescription>
        </DialogHeader>

        {/* Parameter controls */}
        <div className="space-y-6 px-7 py-6">
          {paramConfig.length > 0 ? (
            paramConfig.map((param) => {
              const value = parameters[param.name] ?? param.default;
              return (
                <div key={param.name} className="space-y-2.5">
                  <div className="flex items-baseline justify-between">
                    <label htmlFor={param.name} className="text-[13px] font-medium text-charcoal">
                      {param.label}
                    </label>
                    <span className="font-mono text-[14px] tabular-nums text-moss-900">
                      {value.toFixed(param.step < 1 ? 2 : 0)}
                    </span>
                  </div>
                  <Slider
                    id={param.name}
                    min={param.min}
                    max={param.max}
                    step={param.step}
                    value={[value]}
                    onValueChange={(values) =>
                      setParameters({ ...parameters, [param.name]: values[0] })
                    }
                  />
                  <div className="flex justify-between font-mono text-[10px] tabular-nums text-stone">
                    <span>{param.min}</span>
                    <span>{param.max}</span>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="font-mono text-[12px] tracking-wide text-smoke">
              Este experimento usa parâmetros padrão.
            </p>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-2 border-t border-moss-100 bg-paper px-7 py-4">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={running}
            className="editorial-link font-mono text-[11px] tracking-widest uppercase text-smoke transition-colors hover:text-moss-900 disabled:opacity-40"
          >
            Cancelar
          </button>
          <button onClick={handleRun} disabled={running} className="btn-ribbon">
            {running ? (
              <>
                <span className="editorial-spinner" />
                <span>Executando</span>
              </>
            ) : (
              <>
                <span>Executar Experimento</span>
                <span aria-hidden>→</span>
              </>
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
