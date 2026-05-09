'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Sprout,
  Map as MapIcon,
  Layers,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Sparkles,
  Activity,
  Upload,
  Loader2,
} from 'lucide-react';
import { KMLField } from '@/types';
import { MOCK_MODE } from '@/lib/api';
import { SideNav } from '@/components/side-nav';
import { Logo } from '@/components/logo';

interface ActivityItem {
  type: 'analysis' | 'import' | 'alert' | 'classification';
  title: string;
  detail: string;
  when: string;
}

const RECENT_ACTIVITY: ActivityItem[] = [
  {
    type: 'analysis',
    title: 'NDVI calculado',
    detail: 'crop field 1 · NDVI médio 0,67 · vigor saudável',
    when: 'há 2 horas',
  },
  {
    type: 'classification',
    title: 'Classificação por limiar',
    detail: 'crop field 1 · 3 zonas detectadas · 4,82 ha total',
    when: 'há 5 horas',
  },
  {
    type: 'analysis',
    title: 'EVI calculado',
    detail: 'crop field 1 · EVI médio 0,52',
    when: 'ontem · 14:32',
  },
  {
    type: 'alert',
    title: 'Atenção: heterogeneidade detectada',
    detail: 'crop field 1 · σ = 0,18 · sugerido manejo por zonas',
    when: 'ontem · 09:15',
  },
];

const ACTIVITY_ICONS = {
  analysis: TrendingUp,
  import: Upload,
  alert: AlertTriangle,
  classification: Layers,
};

const ACTIVITY_COLORS = {
  analysis: 'text-moss-700',
  import: 'text-stone',
  alert: 'text-amber',
  classification: 'text-moss-900',
};

export default function HomePage() {
  const [fields, setFields] = useState<KMLField[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFields = async () => {
      try {
        const res = await fetch('/api/fields');
        const data = await res.json();
        setFields(data.fields || []);
      } catch (err) {
        console.error('Erro carregando talhões:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchFields();
  }, []);

  const today = new Date()
    .toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
    .toUpperCase();

  // Mock-derived KPIs
  const totalFields = fields.length;
  // Soma da área real de cada polígono (shoelace + correção de longitude por lat).
  const totalArea = fields.reduce((s, f) => {
    if (f.coordinates.length < 3) return s;
    let sum = 0;
    for (let i = 0; i < f.coordinates.length; i++) {
      const j = (i + 1) % f.coordinates.length;
      sum += f.coordinates[i].longitude * f.coordinates[j].latitude;
      sum -= f.coordinates[j].longitude * f.coordinates[i].latitude;
    }
    const areaDegSq = Math.abs(sum) / 2;
    const meanLat =
      f.coordinates.reduce((acc, c) => acc + c.latitude, 0) / f.coordinates.length;
    const kmPerDegLat = 111;
    const kmPerDegLon = 111 * Math.cos((meanLat * Math.PI) / 180);
    const areaKm2 = areaDegSq * kmPerDegLat * kmPerDegLon;
    return s + areaKm2 * 100; // km² → ha
  }, 0);

  const lastNdvi = 0.67; // mock
  const activeAlerts: number = 1;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-paper-grain text-charcoal">
      <SideNav active="home" />

      {/* ──── Main content ──── */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-10 py-10">
          {/* Masthead */}
          <header className="border-b border-moss-100 pb-7">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Logo size="lg" />
                <span className="ml-1 font-mono text-[10px] tracking-widest text-stone">v0.1</span>
                {MOCK_MODE && (
                  <span
                    className="ml-1 border border-amber/60 bg-amber/10 px-1.5 py-0.5 font-mono text-[9px] font-semibold tracking-widest uppercase text-amber"
                    title="Dados sintéticos para apresentação"
                  >
                    Demo
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="block h-2 w-2 rounded-full bg-lime ring-2 ring-lime/20" />
                <p className="font-mono text-[10px] tracking-widest text-stone">{today}</p>
              </div>
            </div>

            <h1 className="mt-7 font-display text-[44px] font-extrabold leading-[0.95] tracking-tight text-moss-950">
              Bom dia.
              <br />
              <span className="text-moss-700">Vamos olhar a lavoura?</span>
            </h1>
            <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-smoke">
              Visão geral dos seus talhões, atividade recente de análises e atalhos para as
              ferramentas de sensoriamento remoto.
            </p>
          </header>

          {/* KPIs */}
          <section className="mt-8 editorial-rise">
            <div className="grid grid-cols-4 gap-3">
              <KpiCard
                label="Talhões"
                value={loading ? '—' : String(totalFields)}
                hint={`${loading ? '—' : totalFields} ativos`}
                icon={Sprout}
              />
              <KpiCard
                label="Área total"
                value={loading ? '—' : totalArea.toFixed(1)}
                unit="ha"
                hint="todos os talhões"
                icon={MapIcon}
              />
              <KpiCard
                label="Último NDVI"
                value={lastNdvi.toFixed(2)}
                hint="média · vigor saudável"
                icon={TrendingUp}
                tone="good"
              />
              <KpiCard
                label="Alertas"
                value={String(activeAlerts)}
                hint={activeAlerts === 0 ? 'nenhum' : 'pendente'}
                icon={AlertTriangle}
                tone={activeAlerts > 0 ? 'warning' : 'neutral'}
              />
            </div>
          </section>

          <div className="mt-10 grid grid-cols-3 gap-8">
            {/* Talhões */}
            <section className="col-span-2">
              <div className="mb-4 flex items-baseline justify-between">
                <p className="editorial-eyebrow">— Seus talhões</p>
                <Link
                  href="/atlas"
                  className="editorial-link font-mono text-[11px] tracking-widest uppercase text-moss-700 hover:text-moss-900"
                >
                  Ver no mapa →
                </Link>
              </div>

              {loading ? (
                <div className="flex h-32 items-center justify-center border border-moss-100 bg-cream">
                  <Loader2
                    className="h-4 w-4 animate-spin text-moss-700"
                    strokeWidth={1.5}
                  />
                </div>
              ) : fields.length === 0 ? (
                <div className="border border-dashed border-moss-300 bg-cream px-6 py-10 text-center">
                  <Sprout
                    className="mx-auto h-6 w-6 text-stone"
                    strokeWidth={1.5}
                  />
                  <p className="mt-3 font-display text-lg font-bold text-moss-900">
                    Nenhum talhão cadastrado
                  </p>
                  <p className="mt-1 text-[13px] text-smoke">
                    Coloque arquivos KML em{' '}
                    <span className="font-mono text-[12px]">data/KML Fields/</span>.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {fields.map((field) => (
                    <FieldCard key={field.id} field={field} />
                  ))}

                  {/* Add new */}
                  <Link
                    href="/atlas"
                    className="group flex flex-col items-center justify-center border border-dashed border-moss-300 bg-cream px-4 py-8 text-center transition-colors hover:border-moss-700 hover:bg-moss-50"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-full border border-moss-300 bg-paper transition-colors group-hover:border-moss-700">
                      <ArrowRight
                        className="h-4 w-4 text-moss-700 transition-transform group-hover:translate-x-0.5"
                        strokeWidth={2}
                      />
                    </span>
                    <p className="mt-3 font-display text-sm font-semibold text-moss-900">
                      Desenhar novo talhão
                    </p>
                    <p className="mt-1 text-[11px] text-smoke">
                      No mapa, com leaflet-draw
                    </p>
                  </Link>
                </div>
              )}
            </section>

            {/* Atividade recente */}
            <section>
              <p className="mb-4 editorial-eyebrow">— Atividade recente</p>
              <div className="border border-moss-100 bg-cream divide-y divide-moss-50">
                {RECENT_ACTIVITY.map((item, i) => {
                  const Icon = ACTIVITY_ICONS[item.type];
                  const colorClass = ACTIVITY_COLORS[item.type];
                  return (
                    <div key={i} className="flex gap-3 px-4 py-3.5">
                      <div className="mt-0.5 shrink-0">
                        <Icon
                          className={`h-3.5 w-3.5 ${colorClass}`}
                          strokeWidth={2}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium leading-tight text-moss-950">
                          {item.title}
                        </p>
                        <p className="mt-1 text-[11.5px] leading-relaxed text-smoke">
                          {item.detail}
                        </p>
                        <p className="mt-1 font-mono text-[10px] text-stone">{item.when}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          {/* Quick actions */}
          <section className="mt-10 editorial-rise">
            <p className="mb-4 editorial-eyebrow">— Ações rápidas</p>
            <div className="grid grid-cols-3 gap-3">
              <QuickAction
                href="/atlas"
                title="Calcular índice"
                description="Visualizar NDVI, EVI, SAVI, NDWI ou NDBI sobre um talhão."
                icon={TrendingUp}
              />
              <QuickAction
                href="/classification"
                title="Classificar talhão"
                description="Particionar em zonas de vigor, K-Means ou cultura."
                icon={Layers}
              />
              <QuickAction
                href="/atlas"
                title="Lab. de experimentos"
                description="Filtros, detecção de bordas e segmentação sobre Sentinel-2."
                icon={Activity}
              />
            </div>
          </section>

          {/* Footer */}
          <footer className="mt-12 border-t border-moss-100 pt-4">
            <div className="flex items-center justify-between">
              <p className="font-mono text-[10px] tracking-widest text-stone">
                EasyGis · Sentinel-2 · 2026.1
              </p>
              <p className="flex items-center gap-1.5 font-mono text-[10px] tracking-widest text-stone">
                <Sparkles className="h-2.5 w-2.5" strokeWidth={2} />
                Powered by Copernicus
              </p>
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string;
  unit?: string;
  hint?: string;
  icon: typeof Sprout;
  tone?: 'neutral' | 'good' | 'warning';
}

function KpiCard({ label, value, unit, hint, icon: Icon, tone = 'neutral' }: KpiCardProps) {
  const toneClasses = {
    neutral: 'text-moss-950',
    good: 'text-moss-700',
    warning: 'text-amber',
  };
  return (
    <div className="border border-moss-100 bg-cream px-4 py-3.5">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] tracking-widest uppercase text-stone">{label}</p>
        <Icon className="h-3.5 w-3.5 text-stone" strokeWidth={1.5} />
      </div>
      <p
        className={`mt-2 font-display text-[28px] font-extrabold tabular-nums leading-none tracking-tight ${toneClasses[tone]}`}
      >
        {value}
        {unit && <span className="ml-1 text-base font-medium text-stone">{unit}</span>}
      </p>
      {hint && (
        <p className="mt-2 font-mono text-[10px] tracking-wide text-stone">{hint}</p>
      )}
    </div>
  );
}

function FieldCard({ field }: { field: KMLField }) {
  // Mini SVG do polígono — escala simples ao bbox
  const { coordinates, bounds } = field;
  const lonSpan = bounds.east - bounds.west || 1;
  const latSpan = bounds.north - bounds.south || 1;
  const points = coordinates
    .map((c) => {
      const x = ((c.longitude - bounds.west) / lonSpan) * 100;
      const y = 100 - ((c.latitude - bounds.south) / latSpan) * 100;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  // Área real do polígono via shoelace + correção de longitude por lat
  let sum = 0;
  for (let i = 0; i < coordinates.length; i++) {
    const j = (i + 1) % coordinates.length;
    sum += coordinates[i].longitude * coordinates[j].latitude;
    sum -= coordinates[j].longitude * coordinates[i].latitude;
  }
  const meanLat =
    coordinates.reduce((acc, c) => acc + c.latitude, 0) / coordinates.length;
  const areaKm2 =
    (Math.abs(sum) / 2) * 111 * (111 * Math.cos((meanLat * Math.PI) / 180));
  const areaHa = areaKm2 * 100;

  return (
    <Link
      href="/atlas"
      className="group flex flex-col border border-moss-100 bg-cream transition-all hover:border-moss-700"
    >
      <div className="aspect-video overflow-hidden bg-paper">
        <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" className="h-full w-full">
          {/* Background grid */}
          <defs>
            <pattern id={`grid-${field.id}`} width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#DDE5DD" strokeWidth="0.3" />
            </pattern>
          </defs>
          <rect width="100" height="100" fill={`url(#grid-${field.id})`} />
          <polygon
            points={points}
            fill="#A4C3B2"
            fillOpacity="0.4"
            stroke="#1B3A2F"
            strokeWidth="0.8"
            strokeLinejoin="round"
            className="transition-all group-hover:fill-moss-300/70"
          />
        </svg>
      </div>
      <div className="flex items-baseline justify-between border-t border-moss-100 px-4 py-3">
        <div>
          <p className="text-[13px] font-medium text-moss-950">{field.name}</p>
          <p className="mt-0.5 font-mono text-[10px] text-stone">
            {areaHa.toFixed(1)} ha · {field.coordinates.length} vértices
          </p>
        </div>
        <ArrowRight
          className="h-3.5 w-3.5 text-stone transition-all group-hover:translate-x-0.5 group-hover:text-moss-900"
          strokeWidth={2}
        />
      </div>
    </Link>
  );
}

interface QuickActionProps {
  href: string;
  title: string;
  description: string;
  icon: typeof Sprout;
}

function QuickAction({ href, title, description, icon: Icon }: QuickActionProps) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-3 border border-moss-100 bg-cream px-4 py-4 transition-all hover:border-moss-700 hover:bg-moss-50"
    >
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center bg-moss-900 text-cream transition-colors group-hover:bg-moss-950">
        <Icon className="h-4 w-4" strokeWidth={1.5} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-display text-[15px] font-bold leading-tight tracking-tight text-moss-950">
          {title}
        </p>
        <p className="mt-1 text-[11.5px] leading-relaxed text-smoke">{description}</p>
      </div>
      <ArrowRight
        className="mt-1 h-3.5 w-3.5 shrink-0 text-stone transition-transform group-hover:translate-x-0.5 group-hover:text-moss-900"
        strokeWidth={2}
      />
    </Link>
  );
}
