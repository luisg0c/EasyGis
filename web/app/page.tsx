'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { IndexLegend } from '@/components/index-legend';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { KMLField } from '@/types';
import { IndexType } from '@/lib/spectral-indices';

const MapViewer = dynamic(() => import('@/components/map-viewer').then(mod => ({ default: mod.MapViewer })), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full"><p className="text-muted-foreground">Loading map...</p></div>
});

interface IndexResult {
  statistics: {
    min: number;
    max: number;
    mean: number;
    median: number;
    std: number;
    count: number;
  };
  histogram: {
    bins: number[];
    counts: number[];
  };
  image_base64: string;
  product_used: string;
}

export default function Home() {
  const [fields, setFields] = useState<KMLField[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string | undefined>();
  const [selectedIndex, setSelectedIndex] = useState<IndexType>('NDVI');
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [indexResult, setIndexResult] = useState<IndexResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFields();
  }, []);

  const fetchFields = async () => {
    try {
      const response = await fetch('/api/fields');
      const data = await response.json();
      setFields(data.fields || []);
      if (data.fields?.length > 0) {
        setSelectedFieldId(data.fields[0].id);
      }
    } catch (error) {
      console.error('Error fetching fields:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateIndex = async () => {
    if (!selectedFieldId) return;

    const field = fields.find((f) => f.id === selectedFieldId);
    if (!field) return;

    setCalculating(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:8000/calculate-index', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          field_id: field.id,
          coordinates: field.coordinates.map((c) => ({
            longitude: c.longitude,
            latitude: c.latitude,
          })),
          index_type: selectedIndex,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to calculate index');
      }

      const result = await response.json();
      setIndexResult(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error calculating index:', err);
    } finally {
      setCalculating(false);
    }
  };

  const selectedField = fields.find((f) => f.id === selectedFieldId);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-3xl font-bold">Remote Sensing Analysis Platform</h1>
          <p className="text-muted-foreground">
            Sentinel-2 imagery analysis and vegetation indices visualization
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left sidebar - Controls */}
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Field Selection</CardTitle>
                <CardDescription>Choose a field to analyze</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Agricultural Field
                  </label>
                  <Select
                    value={selectedFieldId}
                    onValueChange={setSelectedFieldId}
                    disabled={loading || fields.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a field" />
                    </SelectTrigger>
                    <SelectContent>
                      {fields.map((field) => (
                        <SelectItem key={field.id} value={field.id}>
                          {field.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedField && (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Field ID:</span>
                      <span className="font-mono">{selectedField.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Coordinates:</span>
                      <span className="font-mono">
                        {selectedField.coordinates.length} points
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Spectral Index</CardTitle>
                <CardDescription>Select vegetation or other index</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Tabs value={selectedIndex} onValueChange={(v) => setSelectedIndex(v as IndexType)}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="NDVI">NDVI</TabsTrigger>
                    <TabsTrigger value="EVI">EVI</TabsTrigger>
                    <TabsTrigger value="SAVI">SAVI</TabsTrigger>
                  </TabsList>
                  <TabsList className="grid w-full grid-cols-2 mt-2">
                    <TabsTrigger value="NDWI">NDWI</TabsTrigger>
                    <TabsTrigger value="NDBI">NDBI</TabsTrigger>
                  </TabsList>
                </Tabs>

                <div className="pt-2">
                  <Button
                    className="w-full"
                    disabled={!selectedFieldId || calculating}
                    onClick={calculateIndex}
                  >
                    {calculating ? 'Calculating...' : `Calculate ${selectedIndex}`}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    This will process Sentinel-2 bands for the selected field
                  </p>
                  {error && (
                    <p className="text-xs text-destructive mt-2">
                      Error: {error}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <IndexLegend indexType={selectedIndex} statistics={indexResult?.statistics} />
          </div>

          {/* Right side - Map and visualization */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Field Map</CardTitle>
                <CardDescription>
                  {fields.length > 0
                    ? `Showing ${fields.length} field(s)`
                    : 'No fields available'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[600px]">
                  {loading ? (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-muted-foreground">Loading fields...</p>
                    </div>
                  ) : fields.length > 0 ? (
                    <MapViewer
                      fields={fields}
                      selectedFieldId={selectedFieldId}
                      onFieldClick={setSelectedFieldId}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full border border-dashed rounded-lg">
                      <div className="text-center space-y-2">
                        <p className="text-muted-foreground">No fields found</p>
                        <p className="text-sm text-muted-foreground">
                          Make sure KML files are in data/KML Fields directory
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Index Visualization</CardTitle>
                <CardDescription>
                  {indexResult
                    ? `${selectedIndex} results for ${selectedField?.name || 'selected field'}`
                    : 'Click Calculate to generate visualization'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!indexResult ? (
                  <div className="h-[400px] flex items-center justify-center border border-dashed rounded-lg">
                    <div className="text-center space-y-2">
                      <Badge variant="outline">Ready to Calculate</Badge>
                      <p className="text-sm text-muted-foreground">
                        Select a field and click Calculate {selectedIndex}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        This will process Sentinel-2 bands and show the {selectedIndex} visualization
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-lg overflow-hidden border">
                      <img
                        src={`data:image/png;base64,${indexResult.image_base64}`}
                        alt={`${selectedIndex} visualization`}
                        className="w-full h-auto"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div className="p-3 border rounded-lg">
                        <p className="text-xs text-muted-foreground">Mean</p>
                        <p className="font-semibold">{indexResult.statistics.mean.toFixed(3)}</p>
                      </div>
                      <div className="p-3 border rounded-lg">
                        <p className="text-xs text-muted-foreground">Min</p>
                        <p className="font-semibold">{indexResult.statistics.min.toFixed(3)}</p>
                      </div>
                      <div className="p-3 border rounded-lg">
                        <p className="text-xs text-muted-foreground">Max</p>
                        <p className="font-semibold">{indexResult.statistics.max.toFixed(3)}</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Using product: {indexResult.product_used}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
