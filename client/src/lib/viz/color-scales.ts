/**
 * Brand-Aligned Color Scales for OMNIVOR Visualizations
 *
 * Reusable color scale definitions mapped to brand palette.
 * All scales tested for WCAG AA contrast against void-black (#0a0a0b)
 * and signal-white (#fafafa).
 *
 * @see OMNIVOR-VIZ-ROADMAP.md V1.3
 * @see skills/omnivor-brand/SKILL.md
 */

import { CHART_THEME } from "../chart-theme";

// ============================================================================
// SEQUENTIAL SCALE — Low to High Engagement
// ============================================================================

/**
 * 7-stop sequential scale from deep indigo (low) through purple to catalyst-gold (high).
 * Use for: heatmaps, engagement intensity, score gradients.
 */
export const BRAND_SEQUENTIAL_SCALE = [
  "#1e1b4b", // deep indigo (near void-black)
  "#312e81", // indigo-900
  "#4c1d95", // purple-900
  "#6b21a8", // consumption-purple
  "#7c3aed", // violet-600
  "#a855f7", // process-violet
  "#d97706", // catalyst-gold
] as const;

// ============================================================================
// DIVERGING SCALE — Negative / Neutral / Positive
// ============================================================================

/**
 * 7-stop diverging scale: red (negative) → gray (neutral) → purple/gold (positive).
 * Use for: comparison deltas, sentiment, change indicators.
 */
export const BRAND_DIVERGING_SCALE = [
  "#dc2626", // red-600
  "#f87171", // red-400
  "#fca5a5", // red-300
  "#71717a", // data-gray (neutral)
  "#a78bfa", // violet-400
  "#7c3aed", // violet-600
  "#d97706", // catalyst-gold
] as const;

// ============================================================================
// CATEGORICAL SCALE — Distinct Channel Colors
// ============================================================================

/**
 * 6 categorical colors for distinct data series.
 * Re-exported from chart-theme for single-source consistency.
 */
export const BRAND_CATEGORICAL_SCALE = CHART_THEME.colors.categorical;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Map a numeric value to a color in any scale via linear interpolation.
 * Returns the nearest color in the scale based on where `value` falls
 * between `min` and `max`.
 */
export function getColorForValue(
  value: number,
  min: number,
  max: number,
  scale: readonly string[] = BRAND_SEQUENTIAL_SCALE,
): string {
  if (max === min) return scale[Math.floor(scale.length / 2)];

  const normalized = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const index = Math.min(
    Math.floor(normalized * scale.length),
    scale.length - 1,
  );
  return scale[index];
}

/**
 * Return an rgba background color suitable for table cell shading.
 * Opacity ranges from 10% (low) to 25% (high) so text stays readable
 * on both dark and light backgrounds.
 */
export function getCellBackground(
  value: number,
  min: number,
  max: number,
): string {
  if (max === min) return "transparent";

  const normalized = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const opacity = 0.1 + normalized * 0.15; // 10% → 25%
  const color = getColorForValue(value, min, max);

  return hexToRgba(color, opacity);
}

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(2)})`;
}
