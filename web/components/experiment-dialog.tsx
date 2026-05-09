'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Loader2 } from 'lucide-react';

interface ExperimentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  experimentType: string;
  experimentTitle: string;
  experimentDescription: string;
  onRun: (params: Record<string, number>) => Promise<void>;
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

  const getParameterConfig = () => {
    switch (experimentType) {
      case 'gaussian_blur':
        return [
          { name: 'sigma', label: 'Sigma (Smoothing)', min: 0.5, max: 5, default: 2.0, step: 0.1 }
        ];
      case 'median_filter':
        return [
          { name: 'size', label: 'Kernel Size', min: 3, max: 15, default: 5, step: 2 }
        ];
      case 'bilateral_filter':
        return [
          { name: 'd', label: 'Diameter', min: 3, max: 15, default: 9, step: 2 },
          { name: 'sigma_color', label: 'Sigma Color', min: 10, max: 150, default: 75, step: 5 },
          { name: 'sigma_space', label: 'Sigma Space', min: 10, max: 150, default: 75, step: 5 }
        ];
      case 'canny_edge':
        return [
          { name: 'low_threshold', label: 'Low Threshold', min: 10, max: 150, default: 50, step: 10 },
          { name: 'high_threshold', label: 'High Threshold', min: 50, max: 250, default: 150, step: 10 }
        ];
      case 'morphology_erosion':
      case 'morphology_dilation':
      case 'morphology_opening':
      case 'morphology_closing':
        return [
          { name: 'kernel_size', label: 'Kernel Size', min: 3, max: 15, default: 3, step: 2 }
        ];
      case 'threshold_binary':
        return [
          { name: 'threshold', label: 'Threshold', min: 0, max: 1, default: 0.5, step: 0.01 }
        ];
      case 'threshold_adaptive':
        return [
          { name: 'block_size', label: 'Block Size', min: 3, max: 25, default: 11, step: 2 },
          { name: 'c', label: 'Constant', min: -10, max: 10, default: 2, step: 1 }
        ];
      default:
        return [];
    }
  };

  const paramConfig = getParameterConfig();

  const handleRun = async () => {
    setRunning(true);
    try {
      const params: Record<string, number> = {};
      paramConfig.forEach(param => {
        params[param.name] = parameters[param.name] ?? param.default;
      });
      await onRun(params);
      onOpenChange(false);
    } catch (error) {
      console.error('Experiment failed:', error);
    } finally {
      setRunning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{experimentTitle}</DialogTitle>
          <DialogDescription>{experimentDescription}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {paramConfig.length > 0 ? (
            paramConfig.map((param) => {
              const value = parameters[param.name] ?? param.default;
              return (
                <div key={param.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={param.name}>{param.label}</Label>
                    <span className="text-sm text-muted-foreground font-mono">
                      {value.toFixed(param.step < 1 ? 2 : 0)}
                    </span>
                  </div>
                  <Slider
                    id={param.name}
                    min={param.min}
                    max={param.max}
                    step={param.step}
                    value={[value]}
                    onValueChange={(values) => {
                      setParameters({ ...parameters, [param.name]: values[0] });
                    }}
                  />
                </div>
              );
            })
          ) : (
            <p className="text-sm text-muted-foreground">
              This experiment runs with default parameters.
            </p>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={running}
          >
            Cancel
          </Button>
          <Button onClick={handleRun} disabled={running}>
            {running && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Run Experiment
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
