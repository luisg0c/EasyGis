'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { IndexInsight } from '@/components/index-insight';
import { ExperimentDialog } from '@/components/experiment-dialog';
import { ExperimentMenu } from '@/components/experiment-menu';
import { Switch } from '@/components/ui/switch';
import { KMLField } from '@/types';
import { IndexType } from '@/lib/spectral-indices';
import { calculateIndex as apiCalculateIndex, runExperiment as apiRunExperiment, MOCK_MODE } from '@/lib/api';
import {
  LayoutDashboard,
  Sprout,
  Activity,
  BookOpen,
  Layers,
  Settings,
  HelpCircle,
  User,
  Loader2,
} from 'lucide-react';
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

const Terrain3DViewer = dynamic(
  () => import('@/components/terrain-3d-viewer').then((mod) => ({ default: mod.Terrain3DViewer })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-paper-grain">
        <p className="editorial-eyebrow text-stone">Carregando visualização 3D…</p>
      </div>
    ),
  }
);

import type { SpectralStatistics, ElevationData, MapOverlayResult } from '@/types';

interface IndexResult {
  statistics: SpectralStatistics;
  histogram: { bins: number[]; counts: number[] };
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

const SPECTRAL_INDICES: IndexType[] = ['NDVI', 'EVI', 'SAVI', 'NDWI', 'NDBI'];
const COMPOSITES: IndexType[] = ['RGB', 'FALSE_COLOR'];
const BANDS: IndexType[] = [
  'B01', 'B02', 'B03', 'B04', 'B05', 'B06', 'B07', 'B08', 'B8A', 'B09', 'B11', 'B12',
];

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
    } catch (err) {
      console.error('Error fetching fields:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleNewField = (coordinates: { latitude: number; longitude: number }[]) => {
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
      const result = await apiCalculateIndex({
        field_id: field.id,
        coordinates: field.coordinates.map((c) => ({
          longitude: c.longitude,
          latitude: c.latitude,
        })),
        index_type: selectedIndex,
        smooth: smoothEnabled,
      });
      setIndexResult(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      console.error('Erro calculando índice:', err);
    } finally {
      setCalculating(false);
    }
  };

  const handleOpenExperiment = (type: string, title: string, description: string) => {
    if (!selectedFieldId) {
      alert('Selecione um talhão primeiro');
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
      const result = await apiRunExperiment({
        field_id: field.id,
        coordinates: field.coordinates.map((c) => ({
          longitude: c.longitude,
          latitude: c.latitude,
        })),
        experiment_type: selectedExperiment.type,
        parameters,
      });
      setExperimentResult(result as ExperimentResult);
      setExperimentHistory([result as ExperimentResult, ...experimentHistory]);
      setActiveTab('analytics');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      alert(`Erro no experimento: ${errorMessage}`);
      console.error('Erro executando experimento:', err);
    }
  };

  const selectedField = fields.find((f) => f.id === selectedFieldId);
  const today = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).toUpperCase();

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-paper-grain text-charcoal">
      {/* ──── Left rail — icon nav ──── */}
      <aside className="flex w-14 flex-shrink-0 flex-col items-center border-r border-moss-100 bg-cream py-6">
        <Link href="/" aria-label="Dashboard">
          <button className="rounded-sm p-2.5 text-moss-900 transition-colors hover:bg-moss-50">
            <LayoutDashboard className="h-[18px] w-[18px]" strokeWidth={1.5} />
          </button>
        </Link>
        <button
          aria-label="Fields"
          className="rounded-sm p-2.5 text-smoke transition-colors hover:bg-moss-50 hover:text-moss-900"
        >
          <Sprout className="h-[18px] w-[18px]" strokeWidth={1.5} />
        </button>
        <button
          aria-label="Analytics"
          onClick={() => setActiveTab('analytics')}
          className={`rounded-sm p-2.5 transition-colors ${
            activeTab === 'analytics'
              ? 'bg-moss-900 text-cream'
              : 'text-smoke hover:bg-moss-50 hover:text-moss-900'
          }`}
        >
          <Activity className="h-[18px] w-[18px]" strokeWidth={1.5} />
        </button>
        <button
          aria-label="Research"
          onClick={() => setActiveTab('research')}
          className={`rounded-sm p-2.5 transition-colors ${
            activeTab === 'research'
              ? 'bg-moss-900 text-cream'
              : 'text-smoke hover:bg-moss-50 hover:text-moss-900'
          }`}
        >
          <BookOpen className="h-[18px] w-[18px]" strokeWidth={1.5} />
        </button>
        <Link href="/classification" aria-label="Classification">
          <button className="rounded-sm p-2.5 text-smoke transition-colors hover:bg-moss-50 hover:text-moss-900">
            <Layers className="h-[18px] w-[18px]" strokeWidth={1.5} />
          </button>
        </Link>

        <div className="flex-1" />

        <button className="rounded-sm p-2.5 text-stone transition-colors hover:text-moss-900">
          <Settings className="h-4 w-4" strokeWidth={1.5} />
        </button>
        <button className="rounded-sm p-2.5 text-stone transition-colors hover:text-moss-900">
          <HelpCircle className="h-4 w-4" strokeWidth={1.5} />
        </button>
        <button className="rounded-sm p-2.5 text-stone transition-colors hover:text-moss-900">
          <User className="h-4 w-4" strokeWidth={1.5} />
        </button>
      </aside>

      {/* ──── Sidebar panel ──── */}
      <section className="flex w-[400px] flex-shrink-0 flex-col border-r border-moss-100 bg-cream-grain overflow-hidden">
        {/* Masthead */}
        <header className="border-b border-moss-100 px-7 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="block h-2 w-2 rounded-full bg-lime ring-2 ring-lime/20" />
              <p className="font-mono text-[10px] font-semibold tracking-widest uppercase text-moss-900">
                EasyGis · v0.1
              </p>
              {MOCK_MODE && (
                <span
                  className="ml-1 border border-amber/60 bg-amber/10 px-1.5 py-0.5 font-mono text-[9px] font-semibold tracking-widest uppercase text-amber"
                  title="Dados sintéticos para apresentação — backend pytest valida o cálculo real"
                >
                  Demo
                </span>
              )}
            </div>
            <p className="font-mono text-[10px] tracking-widest text-stone">{today}</p>
          </div>

          <h1 className="mt-5 font-display text-[40px] font-extrabold leading-[0.92] tracking-tight text-moss-950">
            Agricultura
            <br />
            de precisão
            <br />
            <span className="text-moss-700">por satélite.</span>
          </h1>
          <p className="mt-3 max-w-[320px] text-[13px] leading-relaxed text-smoke">
            Imagens Sentinel-2, índices de vegetação e analítica por zona sobre os
            talhões que você gerencia.
          </p>
        </header>

        {/* Scroll body */}
        <div className="flex-1 overflow-y-auto px-7 py-6">
          {activeTab === 'analytics' ? (
            <div className="editorial-rise space-y-7">
              {/* 01 · Talhão */}
              <section>
                <div className="mb-3 flex items-center justify-between">
                  <span className="editorial-num">01 · Talhão</span>
                  <span className="font-mono text-[10px] tracking-widest text-stone">
                    {fields.length} {fields.length === 1 ? 'talhão' : 'talhões'}
                  </span>
                </div>
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
                {selectedField && (
                  <p className="mt-2 font-mono text-[10px] tracking-widest text-stone">
                    BBOX  {selectedField.bounds.south.toFixed(3)}°S  {Math.abs(selectedField.bounds.west).toFixed(3)}°W →
                    {' '}{selectedField.bounds.north.toFixed(3)}°N {Math.abs(selectedField.bounds.east).toFixed(3)}°E
                  </p>
                )}
              </section>

              {/* 02 · Índices */}
              <section>
                <div className="mb-3 editorial-rule">Biblioteca de Índices</div>

                <div className="space-y-4">
                  <div>
                    <p className="editorial-num mb-2">— Índices Espectrais</p>
                    <div className="grid grid-cols-5 gap-1.5">
                      {SPECTRAL_INDICES.map((idx) => (
                        <button
                          key={idx}
                          data-active={selectedIndex === idx}
                          onClick={() => setSelectedIndex(idx)}
                          className="index-chip"
                        >
                          {idx}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="editorial-num mb-2">— Composições RGB</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {COMPOSITES.map((idx) => (
                        <button
                          key={idx}
                          data-active={selectedIndex === idx}
                          onClick={() => setSelectedIndex(idx)}
                          className="index-chip"
                        >
                          {idx === 'RGB' ? 'Cor Verdadeira' : 'Falsa Cor'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="editorial-num mb-2">— Bandas Individuais</p>
                    <div className="grid grid-cols-6 gap-1.5">
                      {BANDS.map((band) => (
                        <button
                          key={band}
                          data-active={selectedIndex === band}
                          onClick={() => setSelectedIndex(band)}
                          className="index-chip"
                        >
                          {band}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              {/* 03 · Render options */}
              <section>
                <div className="mb-3 editorial-rule">Opções de Renderização</div>

                <div className="space-y-3">
                  <label className="flex cursor-pointer items-center justify-between border border-moss-100 bg-cream px-4 py-3 text-[13px] hover:border-moss-300 transition-colors">
                    <div>
                      <p className="font-medium text-moss-950">Suavização Gaussiana</p>
                      <p className="font-mono text-[10px] tracking-widest text-stone mt-0.5">
                        GAUSSIANA σ = 1.5
                      </p>
                    </div>
                    <Switch checked={smoothEnabled} onCheckedChange={setSmoothEnabled} />
                  </label>

                  {indexResult && (
                    <label className="flex cursor-pointer items-center justify-between border border-moss-100 bg-cream px-4 py-3 text-[13px] hover:border-moss-300 transition-colors">
                      <div>
                        <p className="font-medium text-moss-950">Terreno 3D</p>
                        <p className="font-mono text-[10px] tracking-widest text-stone mt-0.5">
                          ELEVAÇÃO × VALOR
                        </p>
                      </div>
                      <Switch checked={view3D} onCheckedChange={setView3D} />
                    </label>
                  )}
                </div>
              </section>

              {/* 04 · Compute action */}
              <section>
                <button
                  onClick={calculateIndex}
                  disabled={!selectedFieldId || calculating}
                  className="btn-ribbon w-full"
                >
                  {calculating ? (
                    <>
                      <span className="editorial-spinner" />
                      <span>Processando</span>
                    </>
                  ) : (
                    <>
                      <span>Visualizar {selectedIndex}</span>
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

              {/* 05 · Result panel */}
              {experimentResult && (
                <section>
                  <div className="mb-3 editorial-rule">Resultado do Experimento</div>
                  <div className="border border-moss-100 bg-cream p-4 space-y-3">
                    <p className="font-display text-base font-semibold tracking-tight text-moss-900 capitalize">
                      {experimentResult.experiment_type.replace(/_/g, ' ')}
                    </p>
                    <div className="space-y-1 font-mono text-[11px] text-smoke">
                      {Object.entries(experimentResult.parameters).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="text-stone">{key.toUpperCase()}</span>
                          <span>{typeof value === 'number' ? value.toFixed(2) : String(value ?? '')}</span>
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-1">
                      {(['mean', 'min', 'max'] as const).map((k) => {
                        const v = experimentResult.statistics[k];
                        return typeof v === 'number' ? (
                          <div key={k} className="stat-card">
                            <p className="stat-label">{k}</p>
                            <p className="stat-value">{v.toFixed(3)}</p>
                          </div>
                        ) : null;
                      })}
                    </div>
                  </div>
                  <button
                    onClick={() => setExperimentResult(null)}
                    className="editorial-link mt-3 font-mono text-[11px] tracking-widest uppercase text-smoke hover:text-moss-900"
                  >
                    Limpar experimento
                  </button>
                </section>
              )}

              {indexResult && !experimentResult && (
                <section>
                  <div className="mb-3 editorial-rule">{selectedIndex} · Estatísticas</div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="stat-card">
                      <p className="stat-label">Média</p>
                      <p className="stat-value">{indexResult.statistics.mean.toFixed(3)}</p>
                    </div>
                    <div className="stat-card">
                      <p className="stat-label">Mín</p>
                      <p className="stat-value">{indexResult.statistics.min.toFixed(3)}</p>
                    </div>
                    <div className="stat-card">
                      <p className="stat-label">Máx</p>
                      <p className="stat-value">{indexResult.statistics.max.toFixed(3)}</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <IndexInsight indexType={selectedIndex} statistics={indexResult.statistics} />
                  </div>
                  <p className="mt-4 font-mono text-[10px] leading-relaxed text-stone">
                    PRODUTO DE ORIGEM
                    <br />
                    <span className="text-smoke break-all">{indexResult.product_used}</span>
                  </p>
                </section>
              )}
            </div>
          ) : (
            /* ──── Research tab ──── */
            <div className="editorial-rise space-y-7">
              <section>
                <p className="editorial-eyebrow">— Laboratório</p>
                <h2 className="mt-2 font-display text-[30px] font-extrabold leading-none tracking-tight text-moss-950">
                  Experimentos de<br />
                  <span className="text-moss-700">processamento</span>
                </h2>
                <p className="mt-2 text-[13px] leading-relaxed text-smoke">
                  Aplique filtros, detectores de borda, operadores morfológicos e técnicas
                  de segmentação sobre a banda NIR do talhão selecionado.
                </p>
              </section>

              <section>
                <div className="mb-3 editorial-rule">Experimentos Disponíveis</div>
                <ExperimentMenu onSelectExperiment={handleOpenExperiment} />
              </section>

              {experimentHistory.length > 0 && (
                <section>
                  <div className="mb-3 editorial-rule">Execuções Recentes</div>
                  <div className="space-y-2">
                    {experimentHistory.slice(0, 5).map((exp, i) => (
                      <div
                        key={i}
                        className="border border-moss-100 bg-cream px-4 py-3"
                      >
                        <div className="flex items-baseline justify-between">
                          <p className="font-medium text-[13px] text-moss-950 capitalize">
                            {exp.experiment_type.replace(/_/g, ' ')}
                          </p>
                          <span className="font-mono text-[10px] tracking-widest text-stone">
                            {new Date(exp.timestamp).toLocaleTimeString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="mt-1 font-mono text-[11px] text-smoke">
                          {Object.entries(exp.parameters)
                            .map(([k, v]) => `${k}=${typeof v === 'number' ? v.toFixed(2) : v}`)
                            .join('  ·  ')}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="border-t border-moss-100 px-7 py-3">
          <p className="font-mono text-[10px] tracking-widest text-stone">
            EasyGis · Sentinel-2 · 2026.1
          </p>
        </footer>
      </section>

      {/* ──── Map / 3D viewport ──── */}
      <section className="relative flex-1 overflow-hidden">
        {/* Floating chrome — index label + 3D pill */}
        <div className="pointer-events-none absolute left-0 right-0 top-0 z-[400] flex items-start justify-between px-6 pt-5">
          <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-moss-100 bg-cream/95 px-4 py-1.5 backdrop-blur-sm">
            <span className="dot h-1.5 w-1.5 rounded-full bg-lime" />
            <span className="font-mono text-[11px] tracking-[0.18em] text-moss-900 uppercase">
              {experimentResult ? 'Experimento' : selectedIndex}
            </span>
            {indexResult?.product_used && (
              <span className="font-mono text-[10px] tracking-[0.1em] text-stone">
                · {indexResult.product_used.split('_')[2]?.slice(0, 8) ?? '—'}
              </span>
            )}
          </div>

          {selectedField && (
            <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-moss-100 bg-cream/95 px-4 py-1.5 backdrop-blur-sm">
              <span className="font-mono text-[10px] tracking-widest text-stone">TALHÃO</span>
              <span className="font-mono text-[11px] text-moss-900">{selectedField.name}</span>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex h-full items-center justify-center bg-paper-grain">
            <div className="text-center">
              <Loader2 className="mx-auto h-5 w-5 animate-spin text-moss-700" strokeWidth={1.5} />
              <p className="mt-3 editorial-eyebrow text-stone">Carregando talhões</p>
            </div>
          </div>
        ) : fields.length > 0 ? (
          view3D && indexResult && indexResult.elevation_data && selectedFieldId ? (
            <Terrain3DViewer
              imageData={indexResult.image_base64}
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
          <div className="flex h-full items-center justify-center bg-paper-grain">
            <div className="text-center max-w-sm px-6">
              <p className="editorial-eyebrow text-stone">— Nenhum talhão carregado —</p>
              <h2 className="mt-3 font-display text-2xl font-bold text-moss-900">
                Nada para exibir
              </h2>
              <p className="mt-2 text-[13px] leading-relaxed text-smoke">
                Coloque arquivos KML em <span className="font-mono text-[12px]">data/KML Fields/</span> ou
                desenhe um polígono direto no mapa para começar.
              </p>
            </div>
          </div>
        )}
      </section>

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
