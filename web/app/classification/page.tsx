'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { KMLField } from '@/types';
import { classify } from '@/lib/api';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

const MapViewer = dynamic(
  () => import('@/components/map-viewer').then((mod) => ({ default: mod.MapViewer })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-paper-grain">
        <p className="editorial-eyebrow text-stone">Carregando mapa…</p>
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
    label: 'Limiar',
    description: 'Divide o talhão em zonas de vigor Baixo / Médio / Alto a partir de cortes em NDVI.',
  },
  {
    value: 'unsupervised',
    label: 'Não-supervisionada',
    description: 'Agrupamento K-Means — agrupa pixels em N classes a partir de features espectrais.',
  },
  {
    value: 'supervised',
    label: 'Supervisionada',
    description: 'Pareamento por assinatura de cultura: soja, milho, café ou cana a partir de faixas conhecidas.',
  },
];

const CROPS: { value: CropType; label: string }[] = [
  { value: 'multi', label: 'Multi' },
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
      const result = await classify({
        field_id: field.id,
        coordinates: field.coordinates.map((c) => ({
          longitude: c.longitude,
          latitude: c.latitude,
        })),
        method,
        crop_type: cropType,
        n_classes: nClasses,
        indices: { ndvi: useNDVI, evi: useEVI, savi: useSAVI },
      });
      setClassificationResult(result as ClassificationResult);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      console.error('Erro classificando:', err);
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
              Voltar ao painel
            </button>
          </Link>
          <p className="editorial-eyebrow mt-5">— Módulo · Classificação</p>
          <h1 className="mt-2 font-display text-[42px] font-extrabold leading-[0.95] tracking-tight text-moss-950">
            Classificação
            <br />
            <span className="text-moss-700">de talhões.</span>
          </h1>
          <p className="mt-3 max-w-md text-[13px] leading-relaxed text-smoke">
            Particione talhões agrícolas em zonas de vigor, agrupamentos espectrais ou
            assinaturas de cultura — com relatório de hectares por classe.
          </p>
        </header>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-8 py-7">
          <div className="editorial-rise space-y-7">
            {/* 01 · Talhão */}
            <section>
              <p className="editorial-num mb-3">01 · Talhão</p>
              <select
                value={selectedFieldId ?? ''}
                onChange={(e) => setSelectedFieldId(e.target.value)}
                disabled={loading || fields.length === 0}
                className="w-full appearance-none border border-moss-100 bg-cream px-3.5 py-2.5 font-mono text-[13px] text-moss-950 transition-colors focus:border-moss-700 focus:outline-none disabled:opacity-40"
              >
                <option value="">— Selecione um talhão —</option>
                {fields.map((field) => (
                  <option key={field.id} value={field.id}>
                    {field.name}
                  </option>
                ))}
              </select>
            </section>

            {/* 02 · Método */}
            <section>
              <p className="editorial-num mb-3">02 · Método</p>
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
                <p className="editorial-num mb-3">03 · Cultura</p>
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
                <p className="editorial-num mb-3">03 · Número de classes</p>
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
              <p className="editorial-num mb-3">04 · Features Espectrais</p>
              <div className="space-y-2">
                {[
                  { key: 'NDVI', label: 'Saúde da vegetação', state: useNDVI, setter: setUseNDVI },
                  { key: 'EVI', label: 'Vegetação corrigida atmosfericamente', state: useEVI, setter: setUseEVI },
                  { key: 'SAVI', label: 'Vegetação ajustada ao solo', state: useSAVI, setter: setUseSAVI },
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
                    <span>Classificando</span>
                  </>
                ) : (
                  <>
                    <span>Executar Classificação</span>
                    <span aria-hidden>→</span>
                  </>
                )}
              </button>
              {error && (
                <p className="mt-3 border-l-2 border-clay bg-clay/5 px-3 py-2 font-mono text-[11px] leading-relaxed text-clay">
                  Erro · {error}
                </p>
              )}
            </section>

            {/* 06 · Results */}
            {classificationResult && (
              <section>
                <div className="mb-3 editorial-rule">Resultado da Classificação</div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="stat-card">
                    <p className="stat-label">Área Total</p>
                    <p className="stat-value">
                      {classificationResult.statistics.total_area.toFixed(2)}
                      <span className="ml-1 text-stone text-sm">ha</span>
                    </p>
                  </div>
                  <div className="stat-card">
                    <p className="stat-label">Classificada</p>
                    <p className="stat-value">
                      {classificationResult.statistics.classified_area.toFixed(2)}
                      <span className="ml-1 text-stone text-sm">ha</span>
                    </p>
                  </div>
                </div>

                <div className="mt-5">
                  <p className="editorial-num mb-3">— Classes Detectadas</p>
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
                  {new Date(classificationResult.timestamp).toLocaleString('pt-BR')}
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
              <p className="mt-3 editorial-eyebrow text-stone">Carregando talhões</p>
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
              <p className="editorial-eyebrow text-stone">— Nenhum talhão carregado —</p>
              <h2 className="mt-3 font-display text-2xl font-bold text-moss-900">Nada para classificar</h2>
              <p className="mt-2 text-[13px] leading-relaxed text-smoke">
                Coloque arquivos KML em <span className="font-mono text-[12px]">data/KML Fields/</span>{' '}
                para começar a classificação.
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
