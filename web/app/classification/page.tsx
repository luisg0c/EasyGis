'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { KMLField } from '@/types';
import { ArrowLeft, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

const MapViewer = dynamic(() => import('@/components/map-viewer').then(mod => ({ default: mod.MapViewer })), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full"><p className="text-muted-foreground">Loading map...</p></div>
});

interface ClassificationResult {
  field_id: string;
  classification_type: string;
  classes: {
    name: string;
    color: string;
    percentage: number;
    area_hectares: number;
  }[];
  image_base64: string;
  confidence_map?: string;
  statistics: {
    total_area: number;
    classified_area: number;
    unclassified_percentage: number;
  };
  timestamp: string;
  product_used: string;
}

type ClassificationMethod = 'supervised' | 'unsupervised' | 'threshold';
type CropType = 'soja' | 'milho' | 'cafe' | 'cana' | 'multi';

export default function ClassificationPage() {
  const [fields, setFields] = useState<KMLField[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [classifying, setClassifying] = useState(false);
  const [classificationResult, setClassificationResult] = useState<ClassificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Classification parameters
  const [method, setMethod] = useState<ClassificationMethod>('supervised');
  const [cropType, setCropType] = useState<CropType>('multi');
  const [nClasses, setNClasses] = useState<number>(3);
  const [useNDVI, setUseNDVI] = useState(true);
  const [useEVI, setUseEVI] = useState(true);
  const [useSAVI, setUseSAVI] = useState(true);

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

  const handleClassify = async () => {
    if (!selectedFieldId) return;

    const field = fields.find((f) => f.id === selectedFieldId);
    if (!field) return;

    setClassifying(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:8000/api/classification/classify', {
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
          method: method,
          crop_type: cropType,
          n_classes: nClasses,
          indices: {
            ndvi: useNDVI,
            evi: useEVI,
            savi: useSAVI,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Classification failed');
      }

      const result = await response.json();
      setClassificationResult(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error classifying:', err);
    } finally {
      setClassifying(false);
    }
  };

  return (
    <div className="flex w-screen h-screen overflow-hidden">
      {/* Left side - Controls and Results (50%) */}
      <div className="w-1/2 flex flex-col border-r bg-background">
        {/* Header */}
        <div className="border-b px-6 py-4">
          <div className="flex items-center gap-3 mb-2">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
          </div>
          <h1 className="text-2xl font-bold">Crop Classification</h1>
          <p className="text-sm text-muted-foreground">
            Classify agricultural areas using machine learning
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* Field Selection */}
          <Card className="p-4 space-y-3">
            <div>
              <Label className="text-sm font-semibold">Select Field</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Choose the area to classify
              </p>
            </div>
            <Select value={selectedFieldId} onValueChange={setSelectedFieldId}>
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
          </Card>

          {/* Classification Method */}
          <Card className="p-4 space-y-3">
            <div>
              <Label className="text-sm font-semibold">Classification Method</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Select the algorithm to use
              </p>
            </div>
            <Tabs value={method} onValueChange={(v) => setMethod(v as ClassificationMethod)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="supervised">Supervised</TabsTrigger>
                <TabsTrigger value="unsupervised">Unsupervised</TabsTrigger>
                <TabsTrigger value="threshold">Threshold</TabsTrigger>
              </TabsList>
            </Tabs>

            {method === 'supervised' && (
              <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
                Uses Random Forest with pre-trained crop signatures for accurate classification
              </div>
            )}
            {method === 'unsupervised' && (
              <div className="text-xs text-muted-foreground bg-purple-50 dark:bg-purple-950 p-3 rounded-lg">
                Uses K-Means clustering to automatically identify {nClasses} distinct crop types
              </div>
            )}
            {method === 'threshold' && (
              <div className="text-xs text-muted-foreground bg-green-50 dark:bg-green-950 p-3 rounded-lg">
                Uses spectral index thresholds to separate crop types based on vegetation health
              </div>
            )}
          </Card>

          {/* Crop Type Selection */}
          {method === 'supervised' && (
            <Card className="p-4 space-y-3">
              <div>
                <Label className="text-sm font-semibold">Target Crop</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Specify which crop to identify
                </p>
              </div>
              <Select value={cropType} onValueChange={(v) => setCropType(v as CropType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="soja">Soja (Soybean)</SelectItem>
                  <SelectItem value="milho">Milho (Corn)</SelectItem>
                  <SelectItem value="cafe">Café (Coffee)</SelectItem>
                  <SelectItem value="cana">Cana (Sugarcane)</SelectItem>
                  <SelectItem value="multi">Multi-crop</SelectItem>
                </SelectContent>
              </Select>
            </Card>
          )}

          {/* Number of Classes */}
          {method === 'unsupervised' && (
            <Card className="p-4 space-y-3">
              <div>
                <Label className="text-sm font-semibold">Number of Classes</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  How many crop types to identify
                </p>
              </div>
              <Select value={nClasses.toString()} onValueChange={(v) => setNClasses(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 classes</SelectItem>
                  <SelectItem value="3">3 classes</SelectItem>
                  <SelectItem value="4">4 classes</SelectItem>
                  <SelectItem value="5">5 classes</SelectItem>
                  <SelectItem value="6">6 classes</SelectItem>
                </SelectContent>
              </Select>
            </Card>
          )}

          {/* Spectral Indices */}
          <Card className="p-4 space-y-3">
            <div>
              <Label className="text-sm font-semibold">Spectral Indices</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Select features for classification
              </p>
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useNDVI}
                  onChange={(e) => setUseNDVI(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm">NDVI (Vegetation Health)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useEVI}
                  onChange={(e) => setUseEVI(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm">EVI (Enhanced Vegetation)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useSAVI}
                  onChange={(e) => setUseSAVI(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm">SAVI (Soil Adjusted)</span>
              </label>
            </div>
          </Card>

          {/* Classify Button */}
          <Button
            className="w-full"
            size="lg"
            disabled={!selectedFieldId || classifying}
            onClick={handleClassify}
          >
            {classifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {classifying ? 'Classifying...' : 'Run Classification'}
          </Button>

          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Results */}
          {classificationResult && (
            <Card className="p-4 space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <Label className="text-sm font-semibold">Classification Results</Label>
              </div>

              {/* Statistics */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 border rounded-lg">
                  <div className="text-xs text-muted-foreground">Total Area</div>
                  <div className="text-lg font-semibold">
                    {classificationResult.statistics.total_area.toFixed(2)} ha
                  </div>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="text-xs text-muted-foreground">Classified</div>
                  <div className="text-lg font-semibold">
                    {classificationResult.statistics.classified_area.toFixed(2)} ha
                  </div>
                </div>
              </div>

              {/* Classes */}
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground">Detected Classes</div>
                {classificationResult.classes.map((cls, idx) => (
                  <div key={idx} className="p-3 border rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: cls.color }}
                        />
                        <span className="font-medium text-sm">{cls.name}</span>
                      </div>
                      <Badge variant="secondary">{cls.percentage.toFixed(1)}%</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Area: {cls.area_hectares.toFixed(2)} hectares
                    </div>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1">
                  Export Report
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  Save Classification
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Right side - Map (50%) */}
      <div className="w-1/2 relative">
        {loading ? (
          <div className="flex items-center justify-center h-full bg-muted">
            <p className="text-muted-foreground">Loading map...</p>
          </div>
        ) : fields.length > 0 ? (
          <MapViewer
            fields={fields}
            selectedFieldId={selectedFieldId}
            onFieldClick={setSelectedFieldId}
            indexResult={
              classificationResult
                ? {
                    kind: 'classification',
                    statistics: classificationResult.statistics,
                    image_base64: classificationResult.image_base64,
                    product_used: classificationResult.product_used,
                  }
                : null
            }
            indexType="CLASSIFICATION"
            onNewField={() => {}}
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
