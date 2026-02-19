/**
 * Heatmap Data Transformation Utilities
 *
 * Converts flat row/col/value records into a matrix structure
 * suitable for rendering in EngagementHeatmap.
 *
 * @see engagement-heatmap.tsx
 */

// ============================================================================
// TYPES
// ============================================================================

export interface HeatmapCell {
  row: string;
  col: string;
  value: number;
}

export interface HeatmapMatrix {
  rows: string[];
  cols: string[];
  matrix: number[][];
  min: number;
  max: number;
}

// ============================================================================
// AGGREGATION
// ============================================================================

/**
 * Aggregate flat records into a dense matrix.
 * Duplicate (row, col) pairs are summed.
 */
export function aggregateToMatrix(
  records: HeatmapCell[],
): HeatmapMatrix {
  const rowSet = new Set<string>();
  const colSet = new Set<string>();
  const valueMap = new Map<string, number>();

  for (const { row, col, value } of records) {
    rowSet.add(row);
    colSet.add(col);
    const key = `${row}|||${col}`;
    valueMap.set(key, (valueMap.get(key) ?? 0) + value);
  }

  const rows = Array.from(rowSet);
  const cols = Array.from(colSet);

  let min = Infinity;
  let max = -Infinity;

  const matrix: number[][] = rows.map((row) =>
    cols.map((col) => {
      const v = valueMap.get(`${row}|||${col}`) ?? 0;
      if (v < min) min = v;
      if (v > max) max = v;
      return v;
    }),
  );

  // Handle edge case: no data
  if (min === Infinity) {
    min = 0;
    max = 0;
  }

  return { rows, cols, matrix, min, max };
}

// ============================================================================
// SORTING
// ============================================================================

/**
 * Sort rows by descending total value (hottest rows at top).
 * Returns new arrays — does not mutate inputs.
 */
export function sortRowsByTotal(
  matrix: number[][],
  rows: string[],
): { matrix: number[][]; rows: string[] } {
  const totals = matrix.map((row, i) => ({
    index: i,
    total: row.reduce((sum, v) => sum + v, 0),
  }));

  totals.sort((a, b) => b.total - a.total);

  return {
    rows: totals.map((t) => rows[t.index]),
    matrix: totals.map((t) => matrix[t.index]),
  };
}
