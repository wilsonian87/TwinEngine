/**
 * Conditional Cell Background Utilities
 *
 * Provides style objects for numeric cell shading in data-dense tables
 * and grids. All functions delegate to getCellBackground from color-scales.ts
 * to maintain a single color authority.
 *
 * @see color-scales.ts
 */

import type { CSSProperties } from "react";
import { getCellBackground } from "./color-scales";

/**
 * Return background style for a numeric cell within a known [min, max] range.
 * Low values get faint shading, high values get stronger shading.
 */
export function getNumericCellStyle(
  value: number,
  min: number,
  max: number,
): CSSProperties {
  return { backgroundColor: getCellBackground(value, min, max) };
}

/**
 * Return background style treating `value` as a 0–100 percentage.
 */
export function getPercentCellStyle(value: number): CSSProperties {
  return { backgroundColor: getCellBackground(value, 0, 100) };
}

/**
 * Return background style for rank-based shading (rank 1 = hottest).
 * Inverts the scale so rank 1 maps to max intensity.
 */
export function getRankCellStyle(
  rank: number,
  total: number,
): CSSProperties {
  // Invert: rank 1 → value = total, rank N → value = 1
  const invertedValue = total - rank + 1;
  return { backgroundColor: getCellBackground(invertedValue, 1, total) };
}
