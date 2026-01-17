/**
 * OMNIVOR Chart Theme Configuration
 *
 * Brand-aligned theming for all data visualizations.
 * Extends from brand-config.ts to ensure visual consistency.
 *
 * @see ROADMAP-PHASE9-INTERACTION-EXPERIENCE.md M9A.1
 */

import { BRAND_CONFIG } from './brand-config';

// ============================================================================
// CHART THEME CONFIGURATION
// ============================================================================

export const CHART_THEME = {
  // Color scales for different chart types
  colors: {
    // Primary palette - purple spectrum for main data series
    primary: [
      BRAND_CONFIG.colors.consumptionPurple, // #6b21a8
      BRAND_CONFIG.colors.processViolet,     // #a855f7
      '#c084fc', // purple-400
      '#e879f9', // fuchsia-400
      '#d8b4fe', // purple-300
    ],

    // Secondary palette - warm tones for comparison/highlight
    secondary: [
      BRAND_CONFIG.colors.catalystGold, // #d97706
      '#fbbf24', // amber-400
      '#fb923c', // orange-400
      '#f87171', // red-400
      '#fcd34d', // amber-300
    ],

    // Diverging palette - for positive/negative comparison
    diverging: [
      BRAND_CONFIG.colors.consumptionPurple,
      BRAND_CONFIG.colors.dataGray,
      BRAND_CONFIG.colors.catalystGold,
    ],

    // Sequential palettes for heatmaps/gradients
    sequential: {
      purple: ['#1e1b4b', '#3730a3', '#6b21a8', '#a855f7', '#d8b4fe'],
      gold: ['#451a03', '#92400e', '#d97706', '#fbbf24', '#fef3c7'],
      gray: ['#18181b', '#27272a', '#3f3f46', '#52525b', '#71717a'],
    },

    // Categorical for distinct data series
    categorical: [
      BRAND_CONFIG.colors.consumptionPurple,
      BRAND_CONFIG.colors.catalystGold,
      BRAND_CONFIG.colors.processViolet,
      '#22c55e', // green-500
      '#3b82f6', // blue-500
      '#f43f5e', // rose-500
    ],
  },

  // Typography for chart elements
  text: {
    fontFamily: BRAND_CONFIG.typography.fontFamily,
    fill: BRAND_CONFIG.colors.dataGray,
    fontSize: 12,
    fontWeight: 400,
    axisLabel: {
      fill: BRAND_CONFIG.colors.dataGray,
      fontSize: 11,
      fontWeight: 500,
    },
    valueLabel: {
      fill: BRAND_CONFIG.colors.signalWhite,
      fontSize: 12,
      fontWeight: 600,
    },
    legend: {
      fill: BRAND_CONFIG.colors.dataGray,
      fontSize: 12,
      fontWeight: 400,
    },
  },

  // Axis styling
  axis: {
    stroke: BRAND_CONFIG.colors.borderGray,
    strokeWidth: 1,
    tickLine: false,
    axisLine: { stroke: BRAND_CONFIG.colors.borderGray },
  },

  // Grid styling
  grid: {
    stroke: BRAND_CONFIG.colors.borderGray,
    strokeDasharray: '3 3',
    opacity: 0.3,
    horizontal: true,
    vertical: false,
  },

  // Tooltip styling
  tooltip: {
    background: 'rgba(10, 10, 11, 0.95)',
    border: `1px solid ${BRAND_CONFIG.colors.borderGray}`,
    borderRadius: 8,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
    padding: '12px 16px',
  },

  // Animation configuration
  animation: {
    duration: 800,
    easing: 'ease-out',
    delay: 0,
    staggerDelay: 50, // For staggered bar/element animations
  },

  // Chart-specific configurations
  bar: {
    radius: [4, 4, 0, 0], // Rounded top corners
    barGap: 4,
    barCategoryGap: '20%',
  },

  line: {
    strokeWidth: 2,
    dot: false,
    activeDot: { r: 6, strokeWidth: 2 },
    type: 'monotone' as const,
  },

  area: {
    fillOpacity: 0.15,
    strokeWidth: 2,
  },

  // Heatmap color scale function
  heatmap: {
    getColor: (value: number, max: number = 100): string => {
      const normalized = Math.min(value / max, 1);
      if (normalized < 0.3) return 'rgba(10, 10, 11, 0.8)';      // Dark (low)
      if (normalized < 0.5) return 'rgba(107, 33, 168, 0.5)';    // Purple low
      if (normalized < 0.7) return 'rgba(107, 33, 168, 0.8)';    // Purple mid
      if (normalized < 0.85) return 'rgba(168, 85, 247, 0.9)';   // Violet
      return 'rgba(217, 119, 6, 0.9)';                            // Gold (high)
    },
  },
} as const;

// ============================================================================
// SVG GRADIENT DEFINITIONS
// ============================================================================

export const CHART_GRADIENTS = {
  // Vertical gradient for bar charts
  barGradient: {
    id: 'omnivor-bar-gradient',
    x1: '0',
    y1: '0',
    x2: '0',
    y2: '1',
    stops: [
      { offset: '0%', stopColor: '#a855f7', stopOpacity: 1 },
      { offset: '100%', stopColor: '#6b21a8', stopOpacity: 1 },
    ],
  },

  // Horizontal gradient for line areas
  areaGradient: {
    id: 'omnivor-area-gradient',
    x1: '0',
    y1: '0',
    x2: '0',
    y2: '1',
    stops: [
      { offset: '0%', stopColor: '#a855f7', stopOpacity: 0.3 },
      { offset: '100%', stopColor: '#a855f7', stopOpacity: 0 },
    ],
  },

  // Gold accent gradient
  goldGradient: {
    id: 'omnivor-gold-gradient',
    x1: '0',
    y1: '0',
    x2: '0',
    y2: '1',
    stops: [
      { offset: '0%', stopColor: '#fbbf24', stopOpacity: 1 },
      { offset: '100%', stopColor: '#d97706', stopOpacity: 1 },
    ],
  },

  // Glow effect for hover states
  glowGradient: {
    id: 'omnivor-glow-gradient',
    type: 'radial' as const,
    cx: '50%',
    cy: '50%',
    r: '50%',
    stops: [
      { offset: '0%', stopColor: '#a855f7', stopOpacity: 0.4 },
      { offset: '100%', stopColor: '#a855f7', stopOpacity: 0 },
    ],
  },
} as const;

// ============================================================================
// RECHARTS CUSTOM COMPONENTS
// ============================================================================

import React from 'react';

interface TooltipPayloadItem {
  color?: string;
  name?: string;
  value?: number | string;
  payload?: Record<string, unknown>;
}

interface BrandedTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
  formatter?: (value: number | string) => string;
}

/**
 * Brand-styled tooltip for Recharts
 */
export const BrandedTooltip: React.FC<BrandedTooltipProps> = ({
  active,
  payload,
  label,
  formatter
}) => {
  if (!active || !payload?.length) return null;

  return (
    <div
      style={{
        ...CHART_THEME.tooltip,
        backdropFilter: 'blur(8px)',
      }}
      className="omnivor-chart-tooltip"
    >
      {label && (
        <p
          style={{
            color: BRAND_CONFIG.colors.signalWhite,
            fontSize: 13,
            fontWeight: 500,
            marginBottom: 8,
          }}
        >
          {label}
        </p>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {payload.map((entry, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 12,
            }}
          >
            <span
              style={{
                color: entry.color,
                fontSize: 10,
              }}
            >
              ●
            </span>
            <span style={{ color: BRAND_CONFIG.colors.dataGray }}>
              {entry.name}:
            </span>
            <span style={{ color: BRAND_CONFIG.colors.signalWhite, fontWeight: 500 }}>
              {formatter ? formatter(entry.value ?? 0) : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get a color from the primary palette by index
 */
export function getPrimaryColor(index: number): string {
  return CHART_THEME.colors.primary[index % CHART_THEME.colors.primary.length];
}

/**
 * Get a color from the secondary palette by index
 */
export function getSecondaryColor(index: number): string {
  return CHART_THEME.colors.secondary[index % CHART_THEME.colors.secondary.length];
}

/**
 * Get a color from the categorical palette by index
 */
export function getCategoricalColor(index: number): string {
  return CHART_THEME.colors.categorical[index % CHART_THEME.colors.categorical.length];
}

/**
 * Format number for chart display
 */
export function formatChartValue(value: number, type: 'number' | 'percent' | 'currency' = 'number'): string {
  switch (type) {
    case 'percent':
      return `${value.toFixed(1)}%`;
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    default:
      if (value >= 1000000) {
        return `${(value / 1000000).toFixed(1)}M`;
      }
      if (value >= 1000) {
        return `${(value / 1000).toFixed(1)}K`;
      }
      return value.toLocaleString();
  }
}

/**
 * Generate SVG gradient definitions for use in charts
 */
export function renderChartGradients(): React.ReactNode {
  return (
    <defs>
      <linearGradient
        id={CHART_GRADIENTS.barGradient.id}
        x1={CHART_GRADIENTS.barGradient.x1}
        y1={CHART_GRADIENTS.barGradient.y1}
        x2={CHART_GRADIENTS.barGradient.x2}
        y2={CHART_GRADIENTS.barGradient.y2}
      >
        {CHART_GRADIENTS.barGradient.stops.map((stop, i) => (
          <stop
            key={i}
            offset={stop.offset}
            stopColor={stop.stopColor}
            stopOpacity={stop.stopOpacity}
          />
        ))}
      </linearGradient>

      <linearGradient
        id={CHART_GRADIENTS.areaGradient.id}
        x1={CHART_GRADIENTS.areaGradient.x1}
        y1={CHART_GRADIENTS.areaGradient.y1}
        x2={CHART_GRADIENTS.areaGradient.x2}
        y2={CHART_GRADIENTS.areaGradient.y2}
      >
        {CHART_GRADIENTS.areaGradient.stops.map((stop, i) => (
          <stop
            key={i}
            offset={stop.offset}
            stopColor={stop.stopColor}
            stopOpacity={stop.stopOpacity}
          />
        ))}
      </linearGradient>

      <linearGradient
        id={CHART_GRADIENTS.goldGradient.id}
        x1={CHART_GRADIENTS.goldGradient.x1}
        y1={CHART_GRADIENTS.goldGradient.y1}
        x2={CHART_GRADIENTS.goldGradient.x2}
        y2={CHART_GRADIENTS.goldGradient.y2}
      >
        {CHART_GRADIENTS.goldGradient.stops.map((stop, i) => (
          <stop
            key={i}
            offset={stop.offset}
            stopColor={stop.stopColor}
            stopOpacity={stop.stopOpacity}
          />
        ))}
      </linearGradient>
    </defs>
  );
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type ChartTheme = typeof CHART_THEME;
export type ChartColorPalette = keyof typeof CHART_THEME.colors;
