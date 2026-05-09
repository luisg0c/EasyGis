'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { KMLField } from '@/types';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

const MapViewer = dynamic(
  () => import('@/components/map-viewer').then((mod) => ({ default: mod.MapViewer })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-paper-grain">
        <p className="editorial-eyebrow text-stone">Loading map…</p>
      </div>
    ),
  }
);

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

const METHODS: {
  value: ClassificationMethod;
  label: string;
  description: string;
}[] = [
  {
    value: 'threshold',
    label: 'Threshold',
    description: 'Cuts the plot into Low / Medium / High vigor zones using NDVI cutoffs.',
  },
  {
    value: 'unsupervised',
    label: 'Unsupervised',
    description: 'K-Means clustering — groups pixels into N classes from spectral features.',
  },
  {
    value: 'supervised',
    label: 'Supervised',
    description: 'Crop-signature matching: soja, milho, café or cana from known ranges.',
  },
];

const CROPS: { value: CropType; label: string }[] = [
  { value: 'multi', label: 'Multi-crop' },
  { value: 'soja', label: 'Soja' },
  { value: 'milho', label: 'Milho' },
  { value: 'cafe', label: 'Café' },
  { value: 'cana', label: 'Cana' },
];

export default function ClassificationPage() {
  const [fields, setFields] = useState<KMLField[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [classifying, setClassifying] = useState(false);
  const [classificationResult, setClassificationResult] = useState<ClassificationResult | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  const [method, setMethod] = useState<ClassificationMethod>('threshold');
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
    } catch (err) {
      console.error('Error fetching fields:', err);
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
      const response = await fetch('http://localhost:8001/api/classification/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          field_id: field.id,
          coordinates: field.coordinates.map((c) => ({
            longitude: c.longitude,
            latitude: c.latitude,
          })),
          method,
          crop_type: cropType,
          n_classes: nClasses,
          indices: { ndvi: useNDVI, evi: useEVI, savi: useSAVI },
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
    <div className="flex h-screen w-screen overflow-hidden bg-paper-grain text-charcoal">
      {/* ──── Left panel — controls ──── */}
      <section className="flex w-1/2 flex-col border-r border-moss-100 bg-cream-grain">
        {/* Masthead */}
        <header className="border-b border-moss-100 px-8 py-5">
          <Link href="/">
            <button className="editorial-link flex items-center gap-1.5 font-mono text-[11px] tracking-widest uppercase text-smoke hover:text-moss-900">
              <ArrowLeft className="h-3 w-3" strokeWidth={2} />
              Back to dashboard
            </button>
          </Link>
          <p className="editorial-eyebrow mt-5">— Module · Classification</p>
          <h1 className="mt-2 font-display text-[42px] font-extrabold leading-[0.95] tracking-tight text-moss-950">
            Plot
            <br />
            <span className="text-moss-700">classification.</span>
          </h1>
          <p className="mt-3 max-w-md text-[13px] leading-relaxed text-smoke">
            Partition agricultural plots into vigor zones, spectral clusters, or crop signatures —
            with hectare-level reporting per class.
          </p>
        </header>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-8 py-7">
          <div className="editorial-rise space-y-7">
            {/* 01 · Field */}
            <section>
              <p className="editorial-num mb-3">01 · Plot</p>
              <select
                value={selectedFieldId ?? ''}
                onChange={(e) => setSelectedFieldId(e.target.value)}
                disabled={loading || fields.length === 0}
                className="w-full appearance-none border border-moss-100 bg-cream px-3.5 py-2.5 font-mono text-[13px] text-moss-950 transition-colors focus:border-moss-700 focus:outline-none disabled:opacity-40"
              >
                <option value="">— Select a plot —</option>
                {fields.map((field) => (
                  <option key={field.id} value={field.id}>
                    {field.name}
                  </option>
                ))}
              </select>
            </section>

            {/* 02 · Method */}
            <section>
              <p className="editorial-num mb-3">02 · Method</p>
              <div className="grid grid-cols-1 gap-2">
                {METHODS.map((m) => (
                  <button
                    key={m.value}
                    onClick={() => setMethod(m.value)}
                    className={`group border px-4 py-3.5 text-left transition-all ${
                      method === m.value
                        ? 'border-moss-900 bg-moss-900 text-cream'
                        : 'border-moss-100 bg-cream text-charcoal hover:border-moss-500'
                    }`}
                  >
                    <div className="flex items-baseline justify-between">
                      <p className="font-display text-base font-bold tracking-tight">{m.label}</p>
                      <span
                        className={`font-mono text-[10px] tracking-widest uppercase ${
                          method === m.value ? 'text-moss-300' : 'text-stone'
                        }`}
                      >
                        {m.value}
                      </span>
                    </div>
                    <p
                      className={`mt-1 text-[12px] leading-relaxed ${
                        method === m.value ? 'text-moss-100' : 'text-smoke'
                      }`}
                    >
                      {m.description}
                    </p>
                  </button>
                ))}
              </div>
            </section>

            {/* 03 · Method-specific options */}
            {method === 'supervised' && (
              <section>
                <p className="editorial-num mb-3">03 · Crop</p>
                <div className="grid grid-cols-5 gap-1.5">
                  {CROPS.map((c) => (
                    <button
                      key={c.value}
                      data-active={cropType === c.value}
                      onClick={() => setCropType(c.value)}
                      className="index-chip"
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </section>
            )}

            {method === 'unsupervised' && (
              <section>
                <p className="editorial-num mb-3">03 · Number of Classes</p>
                <div className="grid grid-cols-5 gap-1.5">
                  {[2, 3, 4, 5, 6].map((n) => (
                    <button
                      key={n}
                      data-active={nClasses === n}
                      onClick={() => setNClasses(n)}
                      className="index-chip"
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* 04 · Features */}
            <section>
              <p className="editorial-num mb-3">04 · Spectral Features</p>
              <div className="space-y-2">
                {[
                  { key: 'NDVI', label: 'Vegetation health', state: useNDVI, setter: setUseNDVI },
                  { key: 'EVI', label: 'Atmospheric-corrected vegetation', state: useEVI, setter: setUseEVI },
                  { key: 'SAVI', label: 'Soil-adjusted vegetation', state: useSAVI, setter: setUseSAVI },
                ].map(({ key, label, state, setter }) => (
                  <label
                    key={key}
                    className="flex cursor-pointer items-center justify-between border border-moss-100 bg-cream px-4 py-3 transition-colors hover:border-moss-300"
                  >
                    <div>
                      <p className="font-mono text-[12px] font-medium text-moss-950">{key}</p>
                      <p className="mt-0.5 text-[11px] text-smoke">{label}</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={state}
                      onChange={(e) => setter(e.target.checked)}
                      className="h-4 w-4 cursor-pointer accent-moss-900"
                    />
                  </label>
                ))}
              </div>
            </section>

            {/* 05 · Action */}
            <section>
              <button
                onClick={handleClassify}
                disabled={!selectedFieldId || classifying}
                className="btn-ribbon w-full"
              >
                {classifying ? (
                  <>
                    <span className="editorial-spinner" />
                    <span>Classifying</span>
                  </>
                ) : (
                  <>
                    <span>Run Classification</span>
                    <span aria-hidden>→</span>
                  </>
                )}
              </button>
              {error && (
                <p className="mt-3 border-l-2 border-clay bg-clay/5 px-3 py-2 font-mono text-[11px] leading-relaxed text-clay">
                  Error · {error}
                </p>
              )}
            </section>

            {/* 06 · Results */}
            {classificationResult && (
              <section>
                <div className="mb-3 editorial-rule">Classification Result</div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="stat-card">
                    <p className="stat-label">Total Area</p>
                    <p className="stat-value">
                      {classificationResult.statistics.total_area.toFixed(2)}
                      <span className="ml-1 text-stone text-sm">ha</span>
                    </p>
                  </div>
                  <div className="stat-card">
                    <p className="stat-label">Classified</p>
                    <p className="stat-value">
                      {classificationResult.statistics.classified_area.toFixed(2)}
                      <span className="ml-1 text-stone text-sm">ha</span>
                    </p>
                  </div>
                </div>

                <div className="mt-5">
                  <p className="editorial-num mb-3">— Detected Classes</p>
                  <div className="border border-moss-100 bg-cream divide-y divide-moss-50">
                    {classificationResult.classes.map((cls, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-3 px-4 py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className="h-6 w-1.5 shrink-0"
                            style={{ backgroundColor: cls.color }}
                          />
                          <div className="min-w-0">
                            <p className="text-[13px] font-medium text-moss-950 truncate">
                              {cls.name}
                            </p>
                            <p className="font-mono text-[10px] text-stone">
                              {cls.area_hectares.toFixed(2)} ha
                            </p>
                          </div>
                        </div>
                        <span className="font-mono text-[14px] tabular-nums text-moss-900 shrink-0">
                          {cls.percentage.toFixed(1)}
                          <span className="ml-0.5 text-[10px] text-stone">%</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <p className="mt-4 font-mono text-[10px] leading-relaxed text-stone">
                  {new Date(classificationResult.timestamp).toLocaleString('en-GB')}
                  <br />
                  <span className="text-smoke break-all">{classificationResult.product_used}</span>
                </p>
              </section>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-moss-100 px-8 py-3">
          <p className="font-mono text-[10px] tracking-widest text-stone">
            EasyGis · Sentinel-2 · 2026.1
          </p>
        </footer>
      </section>

      {/* ──── Right panel — map ──── */}
      <section className="relative w-1/2">
        {loading ? (
          <div className="flex h-full items-center justify-center bg-paper-grain">
            <div className="text-center">
              <Loader2 className="mx-auto h-5 w-5 animate-spin text-moss-700" strokeWidth={1.5} />
              <p className="mt-3 editorial-eyebrow text-stone">Loading plots</p>
            </div>
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
          <div className="flex h-full items-center justify-center bg-paper-grain">
            <div className="max-w-sm text-center px-6">
              <p className="editorial-eyebrow text-stone">— No plots loaded —</p>
              <h2 className="mt-3 font-display text-2xl font-bold text-moss-900">Nothing to classify</h2>
              <p className="mt-2 text-[13px] leading-relaxed text-smoke">
                Place KML files in <span className="font-mono text-[12px]">data/KML Fields/</span>{' '}
                to begin classification.
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
