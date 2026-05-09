'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { IndexLegend } from '@/components/index-legend';
import { ExperimentDialog } from '@/components/experiment-dialog';
import { ExperimentMenu } from '@/components/experiment-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { KMLField } from '@/types';
import { IndexType } from '@/lib/spectral-indices';
import { Grid3x3, Wheat, Activity, MapPin, Settings, HelpCircle, User, BookOpen, Layers } from 'lucide-react';
import Link from 'next/link';

const MapViewer = dynamic(() => import('@/components/map-viewer').then(mod => ({ default: mod.MapViewer })), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full"><p className="text-muted-foreground">Loading map...</p></div>
});

const Terrain3DViewer = dynamic(() => import('@/components/terrain-3d-viewer').then(mod => ({ default: mod.Terrain3DViewer })), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full"><p className="text-muted-foreground">Loading 3D view...</p></div>
});

import type { SpectralStatistics, ElevationData, MapOverlayResult } from '@/types';

interface IndexResult {
  statistics: SpectralStatistics;
  histogram: {
    bins: number[];
    counts: number[];
  };
  image_base64: string;
  product_used: string;
  elevation_data?: ElevationData;
}

interface ExperimentResult {
  field_id: string;
  experiment_type: string;
  parameters: Record<string, unknown>;
  image_base64: string;
  statistics: Record<string, unknown>;
  timestamp: string;
  product_used: string;
}

type SidebarTab = 'analytics' | 'research';

export default function Home() {
  const [fields, setFields] = useState<KMLField[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string | undefined>();
  const [selectedIndex, setSelectedIndex] = useState<IndexType>('NDVI');
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [indexResult, setIndexResult] = useState<IndexResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [smoothEnabled, setSmoothEnabled] = useState(false);
  const [view3D, setView3D] = useState(false);
  const [activeTab, setActiveTab] = useState<SidebarTab>('analytics');
  const [experimentDialogOpen, setExperimentDialogOpen] = useState(false);
  const [selectedExperiment, setSelectedExperiment] = useState<{
    type: string;
    title: string;
    description: string;
  } | null>(null);
  const [experimentResult, setExperimentResult] = useState<ExperimentResult | null>(null);
  const [experimentHistory, setExperimentHistory] = useState<ExperimentResult[]>([]);

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
    // Compute bounds from the drawn polygon (required by KMLField).
    const lats = coordinates.map((c) => c.latitude);
    const lons = coordinates.map((c) => c.longitude);

    const newFieldId = `field-${Date.now()}`;
    const newField: KMLField = {
      id: newFieldId,
      name: `New Field ${fields.length + 1}`,
      coordinates,
      bounds: {
        north: Math.max(...lats),
        south: Math.min(...lats),
        east: Math.max(...lons),
        west: Math.min(...lons),
      },
    };

    setFields([...fields, newField]);
    setSelectedFieldId(newFieldId);
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
          smooth: smoothEnabled,
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

  const handleOpenExperiment = (type: string, title: string, description: string) => {
    if (!selectedFieldId) {
      alert('Please select a field first');
      return;
    }
    setSelectedExperiment({ type, title, description });
    setExperimentDialogOpen(true);
  };

  const handleRunExperiment = async (parameters: Record<string, number>) => {
    if (!selectedFieldId || !selectedExperiment) return;

    const field = fields.find((f) => f.id === selectedFieldId);
    if (!field) return;

    try {
      const response = await fetch('http://localhost:8000/api/experiments/run', {
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
          experiment_type: selectedExperiment.type,
          parameters: parameters,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Experiment failed');
      }

      const result: ExperimentResult = await response.json();
      setExperimentResult(result);
      setExperimentHistory([result, ...experimentHistory]);

      // Switch to analytics tab to show result
      setActiveTab('analytics');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      alert(`Experiment error: ${errorMessage}`);
      console.error('Error running experiment:', err);
    }
  };

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
          <button
            className={`p-3 rounded-lg transition-colors ${activeTab === 'analytics' ? 'bg-primary/10 text-primary' : 'hover:bg-accent'}`}
            title="Analytics"
            onClick={() => setActiveTab('analytics')}
          >
            <Activity className="w-5 h-5" />
          </button>
          <button
            className={`p-3 rounded-lg transition-colors ${activeTab === 'research' ? 'bg-primary/10 text-primary' : 'hover:bg-accent'}`}
            title="Research"
            onClick={() => setActiveTab('research')}
          >
            <BookOpen className="w-5 h-5" />
          </button>
          <Link href="/classification">
            <button className="p-3 hover:bg-accent rounded-lg transition-colors" title="Crop Classification">
              <Layers className="w-5 h-5" />
            </button>
          </Link>
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
            {activeTab === 'analytics' ? (
              <>
                {/* Analytics Tab Content */}
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

            {/* Visualization options */}
            <div className="space-y-2">
              <div className="flex items-center justify-between space-x-2 py-2">
                <Label htmlFor="smooth-mode" className="text-sm font-medium cursor-pointer">
                  Smooth Visualization
                </Label>
                <Switch
                  id="smooth-mode"
                  checked={smoothEnabled}
                  onCheckedChange={setSmoothEnabled}
                />
              </div>

              {indexResult && (
                <div className="flex items-center justify-between space-x-2 py-2">
                  <Label htmlFor="3d-mode" className="text-sm font-medium cursor-pointer">
                    3D View
                  </Label>
                  <Switch
                    id="3d-mode"
                    checked={view3D}
                    onCheckedChange={setView3D}
                  />
                </div>
              )}
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
            {experimentResult && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium">Experiment Result</h3>
                <div className="p-3 border rounded-lg bg-accent/50">
                  <div className="text-xs font-medium mb-1">{experimentResult.experiment_type.replace(/_/g, ' ').toUpperCase()}</div>
                  <div className="text-xs text-muted-foreground">
                    {Object.entries(experimentResult.parameters).map(([key, value]) => (
                      <div key={key}>
                        {key}: {typeof value === 'number' ? value.toFixed(2) : String(value ?? '')}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground">Statistics</div>
                  <div className="grid grid-cols-3 gap-2">
                    {typeof experimentResult.statistics.mean === 'number' && (
                      <div className="p-2 border rounded">
                        <div className="text-xs text-muted-foreground">Mean</div>
                        <div className="text-sm font-medium">{experimentResult.statistics.mean.toFixed(3)}</div>
                      </div>
                    )}
                    {typeof experimentResult.statistics.min === 'number' && (
                      <div className="p-2 border rounded">
                        <div className="text-xs text-muted-foreground">Min</div>
                        <div className="text-sm font-medium">{experimentResult.statistics.min.toFixed(3)}</div>
                      </div>
                    )}
                    {typeof experimentResult.statistics.max === 'number' && (
                      <div className="p-2 border rounded">
                        <div className="text-xs text-muted-foreground">Max</div>
                        <div className="text-sm font-medium">{experimentResult.statistics.max.toFixed(3)}</div>
                      </div>
                    )}
                  </div>
                </div>
                <Button
                  className="w-full"
                  variant="outline"
                  size="sm"
                  onClick={() => setExperimentResult(null)}
                >
                  Clear Experiment
                </Button>
              </div>
            )}
            {indexResult && !experimentResult && (
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
              </>
            ) : (
              <>
                {/* Experiments Tab Content */}
                <div className="space-y-1">
                  <h1 className="text-2xl font-bold">Experiments Lab</h1>
                  <p className="text-sm text-muted-foreground">
                    Test and validate image processing techniques
                  </p>
                </div>

                {/* Active Experiments */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold mb-3">Available Experiments</h3>
                    <ExperimentMenu onSelectExperiment={handleOpenExperiment} />
                  </div>

                  {/* Experiment History */}
                  <div>
                    <h3 className="text-sm font-semibold mb-3">Recent Experiments</h3>
                    <div className="space-y-2">
                      <div className="p-3 rounded-lg border bg-card">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-medium text-sm">Gaussian Blur Test</div>
                          <span className="text-xs text-muted-foreground">2h ago</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Sigma: 1.5, Kernel: 5x5
                        </div>
                        <div className="mt-2 flex gap-2">
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Completed</span>
                          <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">Field #1</span>
                        </div>
                      </div>

                      <div className="p-3 rounded-lg border bg-card">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-medium text-sm">NDVI Threshold Analysis</div>
                          <span className="text-xs text-muted-foreground">5h ago</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Threshold: 0.5, Method: Otsu
                        </div>
                        <div className="mt-2 flex gap-2">
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Completed</span>
                          <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">Field #2</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div>
                    <h3 className="text-sm font-semibold mb-3">Quick Actions</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" size="sm" className="text-xs">
                        Export Results
                      </Button>
                      <Button variant="outline" size="sm" className="text-xs">
                        Compare
                      </Button>
                      <Button variant="outline" size="sm" className="text-xs">
                        Save Config
                      </Button>
                      <Button variant="outline" size="sm" className="text-xs">
                        Load Config
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Right side - Map/3D View */}
      <div className="flex-1 relative">
        {loading ? (
          <div className="flex items-center justify-center h-full bg-muted">
            <p className="text-muted-foreground">Loading fields...</p>
          </div>
        ) : fields.length > 0 ? (
          view3D && indexResult && indexResult.elevation_data && selectedFieldId ? (
            <Terrain3DViewer
              imageData={indexResult.image_base64}
              bounds={fields.find(f => f.id === selectedFieldId)?.bounds || { north: 0, south: 0, east: 0, west: 0 }}
              elevationScale={100}
            />
          ) : (
            <MapViewer
              fields={fields}
              selectedFieldId={selectedFieldId}
              onFieldClick={setSelectedFieldId}
              indexResult={
                experimentResult
                  ? ({
                      kind: 'spectral',
                      // Experiments don't share the strict spectral schema; coerce
                      // numeric stats to keep the popup happy and skip what we don't have.
                      statistics: {
                        min: Number(experimentResult.statistics.min ?? 0),
                        max: Number(experimentResult.statistics.max ?? 0),
                        mean: Number(experimentResult.statistics.mean ?? 0),
                        median: Number(experimentResult.statistics.median ?? 0),
                        std: Number(experimentResult.statistics.std ?? 0),
                        count: Number(experimentResult.statistics.count ?? 0),
                      },
                      histogram: { bins: [], counts: [] },
                      image_base64: experimentResult.image_base64,
                      product_used: experimentResult.product_used,
                    } satisfies MapOverlayResult)
                  : indexResult
                  ? ({ kind: 'spectral', ...indexResult } satisfies MapOverlayResult)
                  : null
              }
              indexType={experimentResult ? ('EXPERIMENT' as IndexType) : selectedIndex}
              onNewField={handleNewField}
            />
          )
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

      {/* Experiment Dialog */}
      {selectedExperiment && (
        <ExperimentDialog
          open={experimentDialogOpen}
          onOpenChange={setExperimentDialogOpen}
          experimentType={selectedExperiment.type}
          experimentTitle={selectedExperiment.title}
          experimentDescription={selectedExperiment.description}
          onRun={handleRunExperiment}
        />
      )}
    </div>
  );
}
