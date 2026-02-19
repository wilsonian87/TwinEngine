/**
 * Distribution & Statistical Utilities
 *
 * Kernel density estimation and histogram binning for beeswarm
 * and ridgeline plot components.
 *
 * @see beeswarm-plot.tsx
 * @see ridgeline-plot.tsx
 */

// ============================================================================
// TYPES
// ============================================================================

export interface BinResult {
  x: number;
  count: number;
}

// ============================================================================
// KERNEL DENSITY ESTIMATION
// ============================================================================

/**
 * Compute a kernel density estimate for a set of values.
 *
 * Uses a Gaussian kernel. Returns an array of [x, density] pairs
 * sampled across the data range with a small padding on each side.
 *
 * @param values - Raw numeric values
 * @param bandwidth - Smoothing bandwidth (defaults to Silverman's rule of thumb)
 * @param nSamples - Number of sample points along the x-axis (default 100)
 */
export function kernelDensityEstimation(
  values: number[],
  bandwidth?: number,
  nSamples: number = 100,
): [number, number][] {
  if (values.length === 0) return [];

  const n = values.length;
  const sorted = [...values].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[n - 1];

  // Silverman's rule of thumb for bandwidth
  const stdDev = standardDeviation(values);
  const iqr = interquartileRange(sorted);
  const h = bandwidth ?? 0.9 * Math.min(stdDev, iqr / 1.34) * Math.pow(n, -0.2);
  const effectiveH = Math.max(h, (max - min) / 100 || 1);

  // Sample range with 10% padding
  const pad = (max - min) * 0.1 || 1;
  const xMin = min - pad;
  const xMax = max + pad;
  const step = (xMax - xMin) / (nSamples - 1);

  const result: [number, number][] = [];

  for (let i = 0; i < nSamples; i++) {
    const x = xMin + i * step;
    let density = 0;

    for (const v of values) {
      density += gaussianKernel((x - v) / effectiveH);
    }

    density /= n * effectiveH;
    result.push([x, density]);
  }

  return result;
}

// ============================================================================
// HISTOGRAM BINNING
// ============================================================================

/**
 * Bin numeric values into equal-width histogram bins.
 *
 * @param values - Raw numeric values
 * @param bins - Number of bins (default 20)
 */
export function binData(values: number[], bins: number = 20): BinResult[] {
  if (values.length === 0) return [];

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const binWidth = range / bins;

  const counts = new Array<number>(bins).fill(0);

  for (const v of values) {
    const idx = Math.min(Math.floor((v - min) / binWidth), bins - 1);
    counts[idx]++;
  }

  return counts.map((count, i) => ({
    x: min + (i + 0.5) * binWidth,
    count,
  }));
}

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

function gaussianKernel(u: number): number {
  return Math.exp(-0.5 * u * u) / Math.sqrt(2 * Math.PI);
}

function standardDeviation(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / n;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1);
  return Math.sqrt(variance);
}

function interquartileRange(sorted: number[]): number {
  const n = sorted.length;
  if (n < 4) return sorted[n - 1] - sorted[0];
  const q1 = sorted[Math.floor(n * 0.25)];
  const q3 = sorted[Math.floor(n * 0.75)];
  return q3 - q1;
}
