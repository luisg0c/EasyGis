/**
 * Gerador procedural de insights agritech a partir dos stats de um índice.
 *
 * Apresentado como "análise gerada por IA". Para a demo P2 a geração é
 * 100% determinística — escolhemos textos a partir do tier de saúde
 * (mean), heterogeneidade (std) e tipo de índice. É um mock honesto:
 * usa os números reais, mas a "análise" é template-based.
 *
 * Pra plugar um LLM real depois é só substituir `generateInsight`
 * por uma chamada ao endpoint de IA, mantendo a mesma assinatura.
 */
import type { IndexType } from "@/lib/spectral-indices";

interface SpectralStatistics {
  min: number;
  max: number;
  mean: number;
  median: number;
  std: number;
  count: number;
}

export type Severity = "critical" | "warning" | "neutral" | "good" | "excellent";

export interface InsightRecommendation {
  severity: Severity;
  text: string;
}

export interface Insight {
  /** Frase curta de manchete. */
  headline: string;
  /** Análise narrativa em 2–3 linhas. */
  summary: string;
  /** Recomendações práticas, ordenadas por urgência. */
  recommendations: InsightRecommendation[];
  /** Score de saúde geral (0–100), usado pra UI. */
  healthScore: number;
  /** Tier qualitativo. */
  healthTier: Severity;
  /** Aviso de variabilidade. */
  variability: "low" | "medium" | "high";
}

// ── Helpers ──────────────────────────────────────────────────────────────

function getHealthTier(indexType: IndexType, mean: number): Severity {
  // Para NDVI/EVI/SAVI o range é [-1, 1] e a interpretação é direta.
  if (["NDVI", "EVI", "SAVI"].includes(indexType)) {
    if (mean < 0.2) return "critical";
    if (mean < 0.4) return "warning";
    if (mean < 0.55) return "neutral";
    if (mean < 0.7) return "good";
    return "excellent";
  }
  // NDWI: positivo = água/úmido (depende do contexto)
  if (indexType === "NDWI") {
    if (mean < -0.3) return "warning"; // muito seco
    if (mean < 0.0) return "neutral";
    if (mean < 0.3) return "good";
    return "excellent";
  }
  // NDBI: alto = construído (mau pra agricultura)
  if (indexType === "NDBI") {
    if (mean > 0.3) return "critical";
    if (mean > 0.0) return "warning";
    return "good";
  }
  // Bandas / RGB / Falsa cor → neutro (não tem semântica de saúde)
  return "neutral";
}

function getVariability(std: number): "low" | "medium" | "high" {
  if (std < 0.08) return "low";
  if (std < 0.18) return "medium";
  return "high";
}

function tierToScore(tier: Severity): number {
  return { critical: 18, warning: 38, neutral: 55, good: 75, excellent: 92 }[tier];
}

// ── Templates (PT-BR) ───────────────────────────────────────────────────

interface TierContent {
  headline: string;
  summary: (mean: number) => string;
}

const NDVI_CONTENT: Record<Severity, TierContent> = {
  critical: {
    headline: "Estresse severo detectado",
    summary: (m) =>
      `O índice médio de ${m.toFixed(2)} indica vegetação fortemente comprometida. ` +
      `A maioria dos pixels está abaixo do limite de fotossíntese ativa — provável estresse hídrico, déficit nutricional ou ataque de pragas.`,
  },
  warning: {
    headline: "Vegetação com estresse moderado",
    summary: (m) =>
      `Com média de ${m.toFixed(2)}, a lavoura está em estado intermediário. ` +
      `Há sinais de estresse pontual ou estádio fenológico inicial. Inspeção em campo é recomendada antes da próxima janela de manejo.`,
  },
  neutral: {
    headline: "Vigor moderado, em desenvolvimento",
    summary: (m) =>
      `O índice médio de ${m.toFixed(2)} sugere lavoura em fase de crescimento ativo, mas ainda longe do pico produtivo. ` +
      `Continuidade do manejo previsto deve aproximar a área do potencial máximo.`,
  },
  good: {
    headline: "Lavoura saudável, dentro do esperado",
    summary: (m) =>
      `Com média de ${m.toFixed(2)}, a vegetação apresenta vigor consistente com a fase produtiva. ` +
      `Os valores estão alinhados com referência histórica para a cultura na região.`,
  },
  excellent: {
    headline: "Vigor excelente, próximo do pico",
    summary: (m) =>
      `O índice médio de ${m.toFixed(2)} indica lavoura no pico fotossintético. ` +
      `Cobertura densa e uniforme — condições ideais para maximizar produtividade na próxima colheita.`,
  },
};

function variabilityLine(
  variability: "low" | "medium" | "high",
  std: number
): string {
  if (variability === "low") {
    return `Distribuição muito homogênea (σ = ${std.toFixed(2)}) — o talhão se comporta como uma única zona de manejo.`;
  }
  if (variability === "medium") {
    return `Heterogeneidade moderada (σ = ${std.toFixed(2)}) — vale considerar ao menos duas zonas distintas para aplicação variável.`;
  }
  return `Variabilidade alta (σ = ${std.toFixed(2)}) — recomenda-se segmentar o talhão em zonas e aplicar manejo diferenciado.`;
}

function buildRecommendations(
  indexType: IndexType,
  tier: Severity,
  variability: "low" | "medium" | "high",
  stats: SpectralStatistics
): InsightRecommendation[] {
  const recs: InsightRecommendation[] = [];

  if (["NDVI", "EVI", "SAVI"].includes(indexType)) {
    if (tier === "critical") {
      recs.push({
        severity: "critical",
        text: "Inspecionar a lavoura em campo nas próximas 48 h para identificar a causa do estresse.",
      });
      recs.push({
        severity: "warning",
        text: "Avaliar status hídrico do solo e checar a sanidade da cultura (pragas, doenças foliares).",
      });
    } else if (tier === "warning") {
      recs.push({
        severity: "warning",
        text: `Investigar regiões com índice abaixo de ${stats.min.toFixed(2)} e correlacionar com histórico de irrigação/adubação.`,
      });
      if (variability !== "low") {
        recs.push({
          severity: "warning",
          text: "Considerar aplicação foliar localizada nas áreas de menor vigor.",
        });
      }
    } else if (tier === "neutral") {
      recs.push({
        severity: "neutral",
        text: "Manter o calendário de manejo atual; reavaliar em 7–10 dias.",
      });
    } else if (tier === "good") {
      recs.push({
        severity: "good",
        text: "Manejo dentro da meta — manter rotina de monitoramento semanal.",
      });
    } else {
      recs.push({
        severity: "good",
        text: "Condição ideal — preparar logística de colheita conforme cronograma.",
      });
    }

    if (variability === "high") {
      recs.push({
        severity: "warning",
        text: `Segmentar o talhão em zonas (faixa observada ${stats.min.toFixed(2)}–${stats.max.toFixed(2)}) para taxa variável.`,
      });
    }
  } else if (indexType === "NDWI") {
    recs.push({
      severity: stats.mean < 0 ? "warning" : "neutral",
      text:
        stats.mean < 0
          ? "Conteúdo hídrico baixo — revisar plano de irrigação."
          : "Disponibilidade hídrica adequada para o estádio atual.",
    });
  } else if (indexType === "NDBI") {
    if (stats.mean > 0) {
      recs.push({
        severity: "warning",
        text: "Sinal de áreas construídas/expostas dentro do polígono — verificar limites do talhão no KML.",
      });
    } else {
      recs.push({
        severity: "good",
        text: "Talhão sem ocupação urbana detectada — consistente com uso agrícola.",
      });
    }
  } else if (indexType === "RGB" || indexType === "FALSE_COLOR") {
    recs.push({
      severity: "neutral",
      text: "Composição visual gerada — útil para fotointerpretação e validação de talhões.",
    });
  } else {
    recs.push({
      severity: "neutral",
      text: `Banda ${indexType} renderizada em escala de cinza — útil como insumo para índices customizados.`,
    });
  }

  return recs;
}

// ── Função principal ────────────────────────────────────────────────────

export function generateInsight(
  indexType: IndexType,
  statistics: SpectralStatistics
): Insight {
  const tier = getHealthTier(indexType, statistics.mean);
  const variability = getVariability(statistics.std);
  const score = tierToScore(tier);

  // Para índices não-vegetativos usamos texto neutro
  const isVegetationIndex = ["NDVI", "EVI", "SAVI"].includes(indexType);

  let headline: string;
  let summary: string;

  if (isVegetationIndex) {
    const content = NDVI_CONTENT[tier];
    headline = content.headline;
    summary = `${content.summary(statistics.mean)} ${variabilityLine(variability, statistics.std)}`;
  } else if (indexType === "NDWI") {
    headline =
      statistics.mean < 0
        ? "Disponibilidade hídrica reduzida"
        : "Conteúdo de água adequado";
    summary =
      `O índice NDWI médio é ${statistics.mean.toFixed(2)}, com variação de ${statistics.min.toFixed(2)} a ${statistics.max.toFixed(2)}. ` +
      variabilityLine(variability, statistics.std);
  } else if (indexType === "NDBI") {
    headline =
      statistics.mean > 0 ? "Área não-agrícola detectada" : "Talhão livre de áreas construídas";
    summary =
      `NDBI médio de ${statistics.mean.toFixed(2)}. ` +
      (statistics.mean > 0
        ? "Pixels positivos sugerem solo exposto, estradas ou edificações."
        : "Distribuição compatível com cobertura vegetal e solo agricultável.") +
      " " +
      variabilityLine(variability, statistics.std);
  } else if (indexType === "RGB" || indexType === "FALSE_COLOR") {
    headline =
      indexType === "RGB" ? "Composição em cor verdadeira" : "Composição em falsa-cor";
    summary =
      indexType === "RGB"
        ? `Reflectância natural sobre o talhão. Use para validar limites e identificar feições visuais óbvias (estradas, corpos d'água, áreas degradadas).`
        : `A vegetação aparece em tons de vermelho/rosa por causa da banda NIR. Padrão clássico para fotointerpretação agrícola.`;
  } else {
    headline = `Banda ${indexType} renderizada`;
    summary =
      `Visualização monoespectral da banda ${indexType}. Os valores foram contrastados pelo intervalo percentílico [2%, 98%] para destacar variações sutis.`;
  }

  return {
    headline,
    summary,
    recommendations: buildRecommendations(indexType, tier, variability, statistics),
    healthScore: score,
    healthTier: tier,
    variability,
  };
}
