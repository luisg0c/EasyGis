'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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

export function IndexLegend({ indexType, statistics }: IndexLegendProps) {
  const index = SPECTRAL_INDICES[indexType];

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div>
          <h3 className="font-semibold text-lg">{index.name}</h3>
          <p className="text-sm text-muted-foreground">{index.description}</p>
          <p className="text-xs text-muted-foreground mt-1 font-mono">
            {index.formula}
          </p>
        </div>

        <div>
          <p className="text-sm font-medium mb-2">Color Scale</p>
          <div className="h-6 rounded overflow-hidden flex">
            {index.colorScale.map((color, i) => (
              <div
                key={i}
                style={{ backgroundColor: color }}
                className="flex-1"
              />
            ))}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>{index.range[0].toFixed(1)}</span>
            <span>{index.range[1].toFixed(1)}</span>
          </div>
        </div>

        {statistics && (
          <div>
            <p className="text-sm font-medium mb-2">Statistics</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs text-muted-foreground">Min</p>
                <Badge variant="outline">{statistics.min.toFixed(3)}</Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Max</p>
                <Badge variant="outline">{statistics.max.toFixed(3)}</Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Mean</p>
                <Badge variant="outline">{statistics.mean.toFixed(3)}</Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Median</p>
                <Badge variant="outline">{statistics.median.toFixed(3)}</Badge>
              </div>
            </div>
          </div>
        )}

        {indexType === 'NDVI' && (
          <div className="text-xs space-y-1 text-muted-foreground">
            <p><span className="font-semibold">&lt; 0:</span> Water, bare soil</p>
            <p><span className="font-semibold">0.0 - 0.2:</span> Sparse vegetation</p>
            <p><span className="font-semibold">0.2 - 0.4:</span> Moderate vegetation</p>
            <p><span className="font-semibold">0.4 - 0.6:</span> Healthy vegetation</p>
            <p><span className="font-semibold">&gt; 0.6:</span> Very healthy vegetation</p>
          </div>
        )}
      </div>
    </Card>
  );
}
