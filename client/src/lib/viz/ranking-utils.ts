/**
 * Ranking Utilities for Bump Charts
 *
 * Converts raw time-series values into rank positions per period
 * for competitive position visualization.
 *
 * @see bump-chart.tsx
 */

// ============================================================================
// TYPES
// ============================================================================

export interface BumpSeries {
  label: string;
  values: { period: string; rank: number }[];
}

export interface RawTimeSeries {
  label: string;
  values: { period: string; value: number }[];
}

// ============================================================================
// CONVERSION
// ============================================================================

/**
 * Convert raw time-series values to rank positions per period.
 *
 * For each period, ranks are assigned by descending value (highest value = rank 1).
 * Ties receive the same rank; subsequent ranks are offset accordingly.
 */
export function convertToRankings(series: RawTimeSeries[]): BumpSeries[] {
  if (series.length === 0) return [];

  // Collect all unique periods in order from first series
  const periods = series[0].values.map((v) => v.period);

  // Build a lookup: label -> period -> value
  const lookup = new Map<string, Map<string, number>>();
  for (const s of series) {
    const periodMap = new Map<string, number>();
    for (const v of s.values) {
      periodMap.set(v.period, v.value);
    }
    lookup.set(s.label, periodMap);
  }

  // For each period, rank all series by descending value
  const ranksByLabelPeriod = new Map<string, Map<string, number>>();
  Array.from(lookup.keys()).forEach((label) => {
    ranksByLabelPeriod.set(label, new Map());
  });

  for (const period of periods) {
    // Gather (label, value) pairs for this period
    const entries: { label: string; value: number }[] = [];
    Array.from(lookup.entries()).forEach(([label, periodMap]) => {
      entries.push({ label, value: periodMap.get(period) ?? 0 });
    });

    // Sort descending by value
    entries.sort((a, b) => b.value - a.value);

    // Assign ranks with tie handling
    let currentRank = 1;
    for (let i = 0; i < entries.length; i++) {
      if (i > 0 && entries[i].value < entries[i - 1].value) {
        currentRank = i + 1;
      }
      ranksByLabelPeriod.get(entries[i].label)!.set(period, currentRank);
    }
  }

  // Build output
  return series.map((s) => {
    const ranks = ranksByLabelPeriod.get(s.label)!;
    return {
      label: s.label,
      values: periods.map((period) => ({
        period,
        rank: ranks.get(period) ?? series.length,
      })),
    };
  });
}
