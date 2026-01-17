/**
 * SparkLine Component
 *
 * Minimal inline line chart for cards and tables.
 * Pure SVG implementation - no Recharts dependency for maximum performance.
 *
 * @see ROADMAP-PHASE9-INTERACTION-EXPERIENCE.md M9A.6
 */

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { BRAND_CONFIG } from '@/lib/brand-config';

// ============================================================================
// TYPES
// ============================================================================

export interface SparkLineProps {
  /** Data points (numeric values) */
  data: number[];
  /** Chart width in pixels */
  width?: number;
  /** Chart height in pixels */
  height?: number;
  /** Color variant */
  color?: 'purple' | 'gold' | 'gray' | 'green' | 'red';
  /** Custom color (overrides color prop) */
  customColor?: string;
  /** Whether to show end dot */
  showEndDot?: boolean;
  /** Trend direction for styling (auto-calculated if not provided) */
  trend?: 'up' | 'down' | 'flat';
  /** Whether to fill area under line */
  filled?: boolean;
  /** Line stroke width */
  strokeWidth?: number;
  /** Additional CSS classes */
  className?: string;
  /** Whether to animate on mount */
  animate?: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const COLOR_MAP: Record<string, string> = {
  purple: BRAND_CONFIG.colors.processViolet,
  gold: BRAND_CONFIG.colors.catalystGold,
  gray: BRAND_CONFIG.colors.dataGray,
  green: '#22c55e',
  red: '#ef4444',
};

// ============================================================================
// UTILITIES
// ============================================================================

function calculatePath(
  data: number[],
  width: number,
  height: number,
  padding: number = 2
): { linePath: string; areaPath: string; endPoint: { x: number; y: number } } {
  if (data.length === 0) {
    return {
      linePath: '',
      areaPath: '',
      endPoint: { x: 0, y: 0 },
    };
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1; // Avoid division by zero

  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 2;

  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1)) * usableWidth;
    const y = padding + usableHeight - ((value - min) / range) * usableHeight;
    return { x, y };
  });

  // Create smooth curve using bezier
  let linePath = `M ${points[0].x} ${points[0].y}`;

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];

    // Simple quadratic bezier for smoothness
    const cpX = (prev.x + curr.x) / 2;
    linePath += ` Q ${prev.x + (curr.x - prev.x) * 0.5} ${prev.y} ${cpX} ${(prev.y + curr.y) / 2}`;
  }

  // Add final point
  const lastPoint = points[points.length - 1];
  linePath += ` L ${lastPoint.x} ${lastPoint.y}`;

  // Create area path (closes to bottom)
  const areaPath = `${linePath} L ${lastPoint.x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

  return {
    linePath,
    areaPath,
    endPoint: lastPoint,
  };
}

function calculateTrend(data: number[]): 'up' | 'down' | 'flat' {
  if (data.length < 2) return 'flat';

  const first = data[0];
  const last = data[data.length - 1];
  const threshold = (Math.max(...data) - Math.min(...data)) * 0.05;

  if (last - first > threshold) return 'up';
  if (first - last > threshold) return 'down';
  return 'flat';
}

// ============================================================================
// COMPONENT
// ============================================================================

export const SparkLine: React.FC<SparkLineProps> = ({
  data,
  width = 80,
  height = 24,
  color = 'purple',
  customColor,
  showEndDot = true,
  trend: trendProp,
  filled = true,
  strokeWidth = 1.5,
  className,
  animate = false,
}) => {
  const { linePath, areaPath, endPoint } = useMemo(
    () => calculatePath(data, width, height),
    [data, width, height]
  );

  const trend = trendProp ?? calculateTrend(data);

  // Determine color based on trend or explicit color
  let strokeColor = customColor || COLOR_MAP[color];
  if (!customColor && trend === 'down' && color === 'purple') {
    strokeColor = COLOR_MAP.red;
  } else if (!customColor && trend === 'up' && color === 'purple') {
    strokeColor = COLOR_MAP.green;
  }

  const uniqueId = useMemo(() => `sparkline-${Math.random().toString(36).substr(2, 9)}`, []);

  if (data.length === 0) {
    return (
      <div
        className={cn('inline-flex items-center justify-center text-muted-gray text-xs', className)}
        style={{ width, height }}
      >
        -
      </div>
    );
  }

  return (
    <svg
      width={width}
      height={height}
      className={cn('inline-block', className)}
      viewBox={`0 0 ${width} ${height}`}
      style={{ overflow: 'visible' }}
    >
      {/* Gradient definition */}
      <defs>
        <linearGradient id={`${uniqueId}-gradient`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity={0.3} />
          <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
        </linearGradient>
      </defs>

      {/* Area fill */}
      {filled && (
        <path
          d={areaPath}
          fill={`url(#${uniqueId}-gradient)`}
          className={animate ? 'animate-fade-in' : ''}
        />
      )}

      {/* Line */}
      <path
        d={linePath}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={animate ? 'animate-draw' : ''}
        style={
          animate
            ? {
                strokeDasharray: width * 2,
                strokeDashoffset: width * 2,
                animation: 'draw 0.6s ease-out forwards',
              }
            : undefined
        }
      />

      {/* End dot */}
      {showEndDot && (
        <g>
          {/* Outer glow */}
          <circle
            cx={endPoint.x}
            cy={endPoint.y}
            r={4}
            fill={strokeColor}
            opacity={0.3}
          />
          {/* Inner dot */}
          <circle
            cx={endPoint.x}
            cy={endPoint.y}
            r={2}
            fill={strokeColor}
          />
        </g>
      )}
    </svg>
  );
};

// ============================================================================
// VARIANTS
// ============================================================================

/**
 * Trend sparkline with automatic coloring
 */
export const TrendSparkLine: React.FC<Omit<SparkLineProps, 'showEndDot' | 'filled'>> = (props) => {
  const trend = props.trend ?? calculateTrend(props.data);

  return (
    <SparkLine
      {...props}
      showEndDot={true}
      filled={true}
      color={trend === 'up' ? 'green' : trend === 'down' ? 'red' : 'gray'}
    />
  );
};

/**
 * Minimal sparkline (no fill, no dot)
 */
export const MinimalSparkLine: React.FC<Omit<SparkLineProps, 'showEndDot' | 'filled'>> = (props) => (
  <SparkLine
    {...props}
    showEndDot={false}
    filled={false}
    strokeWidth={1}
  />
);

/**
 * Large sparkline for cards
 */
export const CardSparkLine: React.FC<Omit<SparkLineProps, 'width' | 'height'>> = (props) => (
  <SparkLine
    {...props}
    width={120}
    height={40}
    strokeWidth={2}
  />
);

/**
 * Inline sparkline for table cells
 */
export const TableSparkLine: React.FC<Omit<SparkLineProps, 'width' | 'height' | 'showEndDot'>> = (
  props
) => (
  <SparkLine
    {...props}
    width={60}
    height={16}
    showEndDot={false}
    strokeWidth={1}
  />
);

// ============================================================================
// CSS FOR ANIMATION
// ============================================================================

// Add this to your global CSS or a style tag:
// @keyframes draw {
//   to {
//     stroke-dashoffset: 0;
//   }
// }
// @keyframes fade-in {
//   from {
//     opacity: 0;
//   }
//   to {
//     opacity: 1;
//   }
// }
// .animate-draw {
//   animation: draw 0.6s ease-out forwards;
// }
// .animate-fade-in {
//   animation: fade-in 0.4s ease-out;
// }

// ============================================================================
// EXPORTS
// ============================================================================

export default SparkLine;
