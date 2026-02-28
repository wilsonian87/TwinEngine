/**
 * Shared data hook for Audience Comparison.
 *
 * Extracts types and data-fetching from cohort-compare.tsx
 * for both Discover and Direct mode consumption.
 */

import { useQuery } from "@tanstack/react-query";
import type { SavedAudience } from "@shared/schema";

export interface CohortMetrics {
  a: number;
  b: number;
  delta: number;
  percentDelta?: number;
  significant?: boolean;
}

export interface HistogramBin {
  min: number;
  max: number;
  count: number;
}

export interface CohortComparisonResponse {
  cohortA: { id: string; name: string; count: number };
  cohortB: { id: string; name: string; count: number };
  overlap: { count: number; percentage: number };
  metrics: {
    avgEngagement: CohortMetrics;
    avgCPI: CohortMetrics;
    avgMSI: CohortMetrics;
    avgChurnRisk: CohortMetrics;
    avgConversionLikelihood: CohortMetrics;
    totalRxVolume: CohortMetrics;
    avgMarketShare: CohortMetrics;
  };
  distributions: {
    tier: { a: Record<string, number>; b: Record<string, number> };
    segment: { a: Record<string, number>; b: Record<string, number> };
    specialty: { a: Record<string, number>; b: Record<string, number> };
    channelPreference: { a: Record<string, number>; b: Record<string, number> };
    engagement: { a: HistogramBin[]; b: HistogramBin[] };
  };
}

export interface ComparisonPreset {
  id: string;
  name: string;
  description: string;
  cohortA: { name: string; hcpIds: string[]; count: number };
  cohortB: { name: string; hcpIds: string[]; count: number };
}

export const METRIC_LABELS: Record<string, string> = {
  avgEngagement: "Avg Engagement Score",
  avgCPI: "Avg Competitive Pressure (CPI)",
  avgMSI: "Avg Message Saturation (MSI)",
  avgChurnRisk: "Avg Churn Risk",
  avgConversionLikelihood: "Avg Conversion Likelihood",
  totalRxVolume: "Total Rx Volume",
  avgMarketShare: "Avg Market Share",
};

export function useComparisonPresets() {
  return useQuery<ComparisonPreset[]>({
    queryKey: ["/api/cohort-compare/presets"],
    queryFn: async () => {
      const response = await fetch("/api/cohort-compare/presets", {
        credentials: "include",
      });
      if (!response.ok) return [];
      return response.json();
    },
  });
}

export function useAudiencesForComparison() {
  return useQuery<SavedAudience[]>({
    queryKey: ["/api/audiences"],
    queryFn: async () => {
      const response = await fetch("/api/audiences", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch audiences");
      return response.json();
    },
  });
}

export function useComparisonNarrative(
  comparison?: CohortComparisonResponse
) {
  return useQuery<{ narrative: string; verdict: string; usedAI: boolean }>({
    queryKey: [
      "/api/narrative/generate",
      "comparison",
      comparison?.cohortA?.id,
      comparison?.cohortB?.id,
    ],
    queryFn: async () => {
      const response = await fetch("/api/narrative/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          context: "comparison",
          data: comparison,
        }),
      });
      if (!response.ok) {
        return { narrative: "", verdict: "", usedAI: false };
      }
      return response.json();
    },
    enabled: !!comparison,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Identify which metrics have the largest divergence.
 */
export function findMostDivergent(
  metrics: CohortComparisonResponse["metrics"],
  topN: number = 2
): string[] {
  const entries = Object.entries(metrics) as [string, CohortMetrics][];
  return entries
    .sort((a, b) => Math.abs(b[1].percentDelta || b[1].delta) - Math.abs(a[1].percentDelta || a[1].delta))
    .slice(0, topN)
    .map(([key]) => key);
}

// ============================================================================
// LETTER GRADE SYSTEM
// ============================================================================

const GRADE_SCALE: [number, string][] = [
  [97, "A+"],
  [93, "A"],
  [90, "A-"],
  [87, "B+"],
  [83, "B"],
  [80, "B-"],
  [77, "C+"],
  [73, "C"],
  [70, "C-"],
  [67, "D+"],
  [63, "D"],
  [60, "D-"],
  [0, "F"],
];

const METRIC_WEIGHTS: Record<string, { weight: number; invert: boolean }> = {
  avgEngagement: { weight: 0.20, invert: false },
  avgConversionLikelihood: { weight: 0.20, invert: false },
  totalRxVolume: { weight: 0.20, invert: false },
  avgChurnRisk: { weight: 0.15, invert: true },
  avgCPI: { weight: 0.10, invert: true },
  avgMSI: { weight: 0.10, invert: true },
  avgMarketShare: { weight: 0.05, invert: false },
};

/**
 * Compute raw weighted score for one side (internal helper).
 * Returns 0–100 based on weighted metric values.
 */
function computeRawScore(
  metrics: CohortComparisonResponse["metrics"],
  side: "a" | "b"
): number {
  let weightedSum = 0;

  for (const [key, config] of Object.entries(METRIC_WEIGHTS)) {
    const m = metrics[key as keyof typeof metrics];
    if (!m) continue;

    let value = m[side];

    // Normalize totalRxVolume relative to max of a/b
    if (key === "totalRxVolume") {
      const maxVal = Math.max(m.a, m.b);
      value = maxVal > 0 ? Math.min((value / maxVal) * 100, 100) : 0;
    }

    // Invert "lower is better" metrics
    if (config.invert) {
      value = 100 - value;
    }

    weightedSum += value * config.weight;
  }

  return Math.max(0, Math.min(100, weightedSum));
}

/**
 * Compute a letter grade for one side of a cohort comparison.
 *
 * Head-to-head methodology: the winner's grade reflects dominance
 * (larger gap → higher grade). The loser's grade is the winner's
 * score minus the weighted gap, preserving relative distance.
 *
 * Gap 0  → both ~B+      (close contest)
 * Gap 10 → winner A, loser B
 * Gap 20 → winner A+, loser C+
 */
export function computeCohortGrade(
  metrics: CohortComparisonResponse["metrics"],
  side: "a" | "b"
): { grade: string; score: number } {
  const rawA = computeRawScore(metrics, "a");
  const rawB = computeRawScore(metrics, "b");
  const gap = Math.abs(rawA - rawB);
  const isWinner = side === "a" ? rawA >= rawB : rawB >= rawA;

  // Winner anchors high, scaled by dominance (gap)
  const winnerScore = Math.min(97, 88 + gap * 0.5);

  let score: number;
  if (isWinner) {
    score = winnerScore;
  } else {
    // Loser: winner's score minus the gap
    score = Math.max(40, winnerScore - gap);
  }

  score = Math.round(score);
  const grade = GRADE_SCALE.find(([threshold]) => score >= threshold)?.[1] ?? "F";

  return { grade, score };
}

/**
 * Determine winner per metric.
 */
export function getWinners(
  metrics: CohortComparisonResponse["metrics"]
): Record<string, "a" | "b" | "tie"> {
  const result: Record<string, "a" | "b" | "tie"> = {};
  for (const [key, m] of Object.entries(metrics)) {
    // For CPI, MSI, churnRisk — lower is better
    const lowerIsBetter = key.includes("CPI") || key.includes("MSI") || key.includes("Churn");
    if (Math.abs(m.delta) < 0.5) {
      result[key] = "tie";
    } else if (lowerIsBetter) {
      result[key] = m.delta < 0 ? "a" : "b";
    } else {
      result[key] = m.delta > 0 ? "a" : "b";
    }
  }
  return result;
}
