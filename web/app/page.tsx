'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { IndexLegend } from '@/components/index-legend';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { KMLField } from '@/types';
import { IndexType } from '@/lib/spectral-indices';
import { Grid3x3, Wheat, Activity, MapPin, Settings, HelpCircle, User } from 'lucide-react';

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

  const handleNewField = (coordinates: { latitude: number; longitude: number }[]) => {
    // Generate a temporary ID for the new field
    const newFieldId = `field-${Date.now()}`;
    const newField: KMLField = {
      id: newFieldId,
      name: `New Field ${fields.length + 1}`,
      coordinates: coordinates,
    };

    // Add to fields list
    setFields([...fields, newField]);
    setSelectedFieldId(newFieldId);

    console.log('New field created:', newField);
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
    <div className="flex w-screen h-screen overflow-hidden">
      {/* Left side - Navigation and Sidebar */}
      <div className="flex flex-shrink-0">
        {/* Icon navigation bar */}
        <div className="w-14 bg-background border-r flex flex-col items-center py-4 space-y-4">
          <button className="p-3 hover:bg-accent rounded-lg transition-colors" title="Dashboard">
            <Grid3x3 className="w-5 h-5" />
          </button>
          <button className="p-3 hover:bg-accent rounded-lg transition-colors" title="Fields">
            <Wheat className="w-5 h-5" />
          </button>
          <button className="p-3 bg-primary/10 text-primary rounded-lg" title="Analytics">
            <Activity className="w-5 h-5" />
          </button>
          <button className="p-3 hover:bg-accent rounded-lg transition-colors" title="Map">
            <MapPin className="w-5 h-5" />
          </button>

          <div className="flex-1" />

          <button className="p-3 hover:bg-accent rounded-lg transition-colors" title="Settings">
            <Settings className="w-5 h-5" />
          </button>
          <button className="p-3 hover:bg-accent rounded-lg transition-colors" title="Help">
            <HelpCircle className="w-5 h-5" />
          </button>
          <button className="p-3 hover:bg-accent rounded-lg transition-colors" title="Profile">
            <User className="w-5 h-5" />
          </button>
        </div>

        {/* Main sidebar panel */}
        <div className="w-96 bg-background border-r overflow-auto">
          <div className="p-6 space-y-6">
            {/* Header */}
            <div className="space-y-1">
              <h1 className="text-2xl font-bold">Zone Management</h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Field:</span>
                <Select
                  value={selectedFieldId}
                  onValueChange={setSelectedFieldId}
                  disabled={loading || fields.length === 0}
                >
                  <SelectTrigger className="w-[200px] h-8">
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
            </div>

            {/* Tabs */}
            <Tabs value={selectedIndex} onValueChange={(v) => setSelectedIndex(v as IndexType)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="NDVI">Zone</TabsTrigger>
                <TabsTrigger value="EVI">Productivity</TabsTrigger>
                <TabsTrigger value="SAVI">Nitrogen Rx</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Recommendation section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Recommendation date</span>
                <span className="text-sm text-muted-foreground">05 Jun 2024</span>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium">Recommendation</h3>
                {indexResult && (
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Yield potential:</span>
                      <span className="font-medium">
                        {indexResult.statistics.min.toFixed(2)} - {indexResult.statistics.max.toFixed(2)} {selectedIndex}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Goal cards */}
              <div className="grid grid-cols-3 gap-2">
                <button className="p-3 border rounded-lg hover:bg-accent transition-colors text-left">
                  <div className="text-xs text-muted-foreground mb-1">Max Roi</div>
                  <div className="text-sm font-medium">40</div>
                  <div className="text-xs text-muted-foreground mt-1">21% yield</div>
                </button>
                <button className="p-3 border-2 border-primary rounded-lg bg-primary/5 text-left">
                  <div className="text-xs text-muted-foreground mb-1">Balanced</div>
                  <div className="text-sm font-medium">63</div>
                  <div className="text-xs text-muted-foreground mt-1">56% yield</div>
                </button>
                <button className="p-3 border rounded-lg hover:bg-accent transition-colors text-left">
                  <div className="text-xs text-muted-foreground mb-1">Max yield</div>
                  <div className="text-sm font-medium">68</div>
                  <div className="text-xs text-muted-foreground mt-1">71% yield</div>
                </button>
              </div>
            </div>

            {/* Calculate button */}
            <Button
              className="w-full"
              disabled={!selectedFieldId || calculating}
              onClick={calculateIndex}
            >
              {calculating ? 'Processing...' : `Visualize ${selectedIndex}`}
            </Button>
            {error && (
              <p className="text-xs text-destructive text-center">
                Error: {error}
              </p>
            )}

            {/* Statistics section */}
            {indexResult && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium">Product: {selectedIndex}</h3>
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground">Statistics</div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-2 border rounded">
                      <div className="text-xs text-muted-foreground">Mean</div>
                      <div className="text-sm font-medium">{indexResult.statistics.mean.toFixed(3)}</div>
                    </div>
                    <div className="p-2 border rounded">
                      <div className="text-xs text-muted-foreground">Min</div>
                      <div className="text-sm font-medium">{indexResult.statistics.min.toFixed(3)}</div>
                    </div>
                    <div className="p-2 border rounded">
                      <div className="text-xs text-muted-foreground">Max</div>
                      <div className="text-sm font-medium">{indexResult.statistics.max.toFixed(3)}</div>
                    </div>
                  </div>
                </div>
                <IndexLegend indexType={selectedIndex} statistics={indexResult.statistics} />
                <p className="text-xs text-muted-foreground">
                  Using product: {indexResult.product_used}
                </p>
              </div>
            )}

            {/* Index and Band selector */}
            <div className="space-y-3">
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground">Spectral Indices</div>
                <Tabs value={selectedIndex} onValueChange={(v) => setSelectedIndex(v as IndexType)}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="NDVI" className="text-xs">NDVI</TabsTrigger>
                    <TabsTrigger value="EVI" className="text-xs">EVI</TabsTrigger>
                    <TabsTrigger value="SAVI" className="text-xs">SAVI</TabsTrigger>
                  </TabsList>
                  <TabsList className="grid w-full grid-cols-2 mt-2">
                    <TabsTrigger value="NDWI" className="text-xs">NDWI</TabsTrigger>
                    <TabsTrigger value="NDBI" className="text-xs">NDBI</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground">RGB Composites</div>
                <Tabs value={selectedIndex} onValueChange={(v) => setSelectedIndex(v as IndexType)}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="RGB" className="text-xs">True Color</TabsTrigger>
                    <TabsTrigger value="FALSE_COLOR" className="text-xs">False Color</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground">Individual Bands</div>
                <Tabs value={selectedIndex} onValueChange={(v) => setSelectedIndex(v as IndexType)}>
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="B01" className="text-xs">B01</TabsTrigger>
                    <TabsTrigger value="B02" className="text-xs">B02</TabsTrigger>
                    <TabsTrigger value="B03" className="text-xs">B03</TabsTrigger>
                    <TabsTrigger value="B04" className="text-xs">B04</TabsTrigger>
                  </TabsList>
                  <TabsList className="grid w-full grid-cols-4 mt-2">
                    <TabsTrigger value="B05" className="text-xs">B05</TabsTrigger>
                    <TabsTrigger value="B06" className="text-xs">B06</TabsTrigger>
                    <TabsTrigger value="B07" className="text-xs">B07</TabsTrigger>
                    <TabsTrigger value="B08" className="text-xs">B08</TabsTrigger>
                  </TabsList>
                  <TabsList className="grid w-full grid-cols-4 mt-2">
                    <TabsTrigger value="B8A" className="text-xs">B8A</TabsTrigger>
                    <TabsTrigger value="B09" className="text-xs">B09</TabsTrigger>
                    <TabsTrigger value="B11" className="text-xs">B11</TabsTrigger>
                    <TabsTrigger value="B12" className="text-xs">B12</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Map */}
      <div className="flex-1 relative">
        {loading ? (
          <div className="flex items-center justify-center h-full bg-muted">
            <p className="text-muted-foreground">Loading fields...</p>
          </div>
        ) : fields.length > 0 ? (
          <MapViewer
            fields={fields}
            selectedFieldId={selectedFieldId}
            onFieldClick={setSelectedFieldId}
            indexResult={indexResult}
            indexType={selectedIndex}
            onNewField={handleNewField}
          />
        ) : (
          <div className="flex items-center justify-center h-full bg-muted">
            <div className="text-center space-y-2">
              <p className="text-muted-foreground">No fields found</p>
              <p className="text-sm text-muted-foreground">
                Make sure KML files are in data/KML Fields directory
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
