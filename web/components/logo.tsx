/**
 * Logo da EasyGis.
 *
 * Identidade visual:
 * - LogoMark: quadrado arredondado moss-900 com 4 barras horizontais
 *   decrescentes em opacidade verde-claro → cream, evocando "níveis de
 *   NDVI" e "camadas de mapa" sobrepostas (referência direta ao
 *   sensoriamento remoto e ao gradiente do índice de vegetação).
 * - Wordmark: "Easy" em moss-950 + "Gis" em moss-600, Manrope 800 com
 *   tracking apertado.
 */

import { cn } from "@/lib/utils";

export type LogoSize = "sm" | "md" | "lg" | "xl";

interface LogoProps {
  size?: LogoSize;
  /** Quando true, esconde o wordmark e mostra apenas o símbolo. */
  markOnly?: boolean;
  className?: string;
}

const SIZE_CONFIG: Record<
  LogoSize,
  { mark: number; gap: string; text: string }
> = {
  sm: { mark: 22, gap: "gap-2", text: "text-base" },
  md: { mark: 30, gap: "gap-2.5", text: "text-xl" },
  lg: { mark: 40, gap: "gap-3", text: "text-2xl" },
  xl: { mark: 56, gap: "gap-4", text: "text-4xl" },
};

export function LogoMark({ size = 30, className }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      fill="none"
      className={className}
      role="img"
      aria-label="EasyGis"
    >
      <rect width="32" height="32" rx="6" fill="#1B3A2F" />
      {/* Barras horizontais — NDVI tiers */}
      <rect x="7" y="8" width="18" height="2" rx="1" fill="#A7C957" />
      <rect x="7" y="13" width="14" height="2" rx="1" fill="#FAF7EE" opacity="0.88" />
      <rect x="7" y="18" width="10" height="2" rx="1" fill="#FAF7EE" opacity="0.58" />
      <rect x="7" y="23" width="6" height="2" rx="1" fill="#FAF7EE" opacity="0.32" />
    </svg>
  );
}

export function Logo({ size = "md", markOnly = false, className }: LogoProps) {
  const cfg = SIZE_CONFIG[size];

  if (markOnly) {
    return <LogoMark size={cfg.mark} className={className} />;
  }

  return (
    <div className={cn("inline-flex items-center", cfg.gap, className)}>
      <LogoMark size={cfg.mark} />
      <span
        className={cn(
          "font-display font-extrabold tracking-tight leading-none text-moss-950",
          cfg.text
        )}
      >
        Easy<span className="text-moss-600">Gis</span>
      </span>
    </div>
  );
}
