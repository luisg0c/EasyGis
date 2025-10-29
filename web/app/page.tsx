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

export default function Home() {
  const [fields, setFields] = useState<KMLField[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string | undefined>();
  const [selectedIndex, setSelectedIndex] = useState<IndexType>('NDVI');
  const [loading, setLoading] = useState(true);

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
                  <Button className="w-full" disabled={!selectedFieldId}>
                    Calculate {selectedIndex}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    This will process Sentinel-2 bands for the selected field
                  </p>
                </div>
              </CardContent>
            </Card>

            <IndexLegend indexType={selectedIndex} />
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
                  {selectedIndex} results for {selectedField?.name || 'selected field'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px] flex items-center justify-center border border-dashed rounded-lg">
                  <div className="text-center space-y-2">
                    <Badge variant="outline">Coming Soon</Badge>
                    <p className="text-sm text-muted-foreground">
                      Click Calculate {selectedIndex} to generate visualization
                    </p>
                    <p className="text-xs text-muted-foreground">
                      This will show the calculated index overlaid on the field
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
