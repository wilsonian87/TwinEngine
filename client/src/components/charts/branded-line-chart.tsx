/**
 * BrandedLineChart Component
 *
 * Brand-styled line chart with draw animation and hover effects.
 * Wraps Recharts LineChart with OmniVor visual identity.
 *
 * @see ROADMAP-PHASE9-INTERACTION-EXPERIENCE.md M9A.4
 */

import React, { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  ComposedChart,
} from 'recharts';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  CHART_THEME,
  CHART_GRADIENTS,
  BrandedTooltip,
  formatChartValue,
  getCategoricalColor,
} from '@/lib/chart-theme';
import { BRAND_CONFIG } from '@/lib/brand-config';
import { staggerContainer, staggerCardChild } from '@/lib/motion-config';

// ============================================================================
// TYPES
// ============================================================================

export interface LineConfig {
  /** Data key for this line */
  dataKey: string;
  /** Display name for legend */
  name: string;
  /** Custom color (uses palette if not provided) */
  color?: string;
  /** Whether to show as dashed line */
  dashed?: boolean;
  /** Whether to show area fill under line */
  showArea?: boolean;
}

export interface BrandedLineChartProps {
  /** Chart data array */
  data: Array<Record<string, string | number>>;
  /** Line configurations */
  lines: LineConfig[];
  /** Key in data object for x-axis labels */
  xAxisKey: string;
  /** Chart height in pixels */
  height?: number;
  /** Whether to show grid lines */
  showGrid?: boolean;
  /** Whether to show dots on data points */
  showDots?: boolean;
  /** Whether to show area fill under lines */
  showArea?: boolean;
  /** Whether to animate on mount */
  animate?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Custom tooltip formatter */
  tooltipFormatter?: (value: number | string) => string;
  /** Whether to show legend */
  showLegend?: boolean;
  /** Line stroke width */
  strokeWidth?: number;
}

// ============================================================================
// CUSTOM DOT COMPONENT
// ============================================================================

interface CustomDotProps {
  cx?: number;
  cy?: number;
  r?: number;
  fill?: string;
  stroke?: string;
  isActive?: boolean;
}

const CustomActiveDot: React.FC<CustomDotProps> = ({
  cx = 0,
  cy = 0,
  fill = BRAND_CONFIG.colors.processViolet,
}) => {
  return (
    <g>
      {/* Outer glow */}
      <circle
        cx={cx}
        cy={cy}
        r={12}
        fill={fill}
        opacity={0.2}
      />
      {/* Inner ring */}
      <circle
        cx={cx}
        cy={cy}
        r={6}
        fill="none"
        stroke={fill}
        strokeWidth={2}
      />
      {/* Center dot */}
      <circle
        cx={cx}
        cy={cy}
        r={3}
        fill={fill}
      />
    </g>
  );
};

// ============================================================================
// CUSTOM LEGEND
// ============================================================================

interface CustomLegendProps {
  payload?: Array<{
    value: string;
    color: string;
    dataKey: string;
  }>;
}

const CustomLegend: React.FC<CustomLegendProps> = ({ payload }) => {
  if (!payload) return null;

  return (
    <div className="flex items-center justify-center gap-6 mt-4">
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span
            className="text-sm"
            style={{ color: BRAND_CONFIG.colors.dataGray }}
          >
            {entry.value}
          </span>
        </div>
      ))}
    </div>
  );
};

// ============================================================================
// COMPONENT
// ============================================================================

export const BrandedLineChart: React.FC<BrandedLineChartProps> = ({
  data,
  lines,
  xAxisKey,
  height = 300,
  showGrid = true,
  showDots = false,
  showArea = false,
  animate = true,
  className,
  tooltipFormatter,
  showLegend = true,
  strokeWidth = 2,
}) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const getLineColor = (lineConfig: LineConfig, index: number): string => {
    if (lineConfig.color) return lineConfig.color;
    return getCategoricalColor(index);
  };

  // Use ComposedChart if any line needs area fill
  const needsComposedChart = showArea || lines.some((l) => l.showArea);
  const ChartComponent = needsComposedChart ? ComposedChart : LineChart;

  return (
    <motion.div
      className={cn('w-full', className)}
      variants={staggerContainer}
      initial="initial"
      animate="enter"
    >
      <motion.div variants={staggerCardChild}>
        <ResponsiveContainer width="100%" height={height}>
          <ChartComponent
            data={data}
            margin={{ top: 20, right: 20, left: 20, bottom: 20 }}
            onMouseMove={(state: { activeTooltipIndex?: number }) => {
              if (state?.activeTooltipIndex !== undefined) {
                setActiveIndex(state.activeTooltipIndex);
              }
            }}
            onMouseLeave={() => setActiveIndex(null)}
          >
            {/* Gradient definitions */}
            <defs>
              {lines.map((line, index) => {
                const color = getLineColor(line, index);
                return (
                  <linearGradient
                    key={`gradient-${line.dataKey}`}
                    id={`area-gradient-${line.dataKey}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                );
              })}
            </defs>

            {/* Grid */}
            {showGrid && (
              <CartesianGrid
                strokeDasharray={CHART_THEME.grid.strokeDasharray}
                stroke={CHART_THEME.grid.stroke}
                opacity={CHART_THEME.grid.opacity}
                vertical={CHART_THEME.grid.vertical}
                horizontal={CHART_THEME.grid.horizontal}
              />
            )}

            {/* Axes */}
            <XAxis
              dataKey={xAxisKey}
              axisLine={CHART_THEME.axis.axisLine}
              tickLine={CHART_THEME.axis.tickLine}
              tick={{
                fill: CHART_THEME.text.axisLabel.fill,
                fontSize: CHART_THEME.text.axisLabel.fontSize,
              }}
            />
            <YAxis
              axisLine={CHART_THEME.axis.axisLine}
              tickLine={CHART_THEME.axis.tickLine}
              tick={{
                fill: CHART_THEME.text.axisLabel.fill,
                fontSize: CHART_THEME.text.axisLabel.fontSize,
              }}
              tickFormatter={(value) => formatChartValue(value)}
            />

            {/* Tooltip */}
            <Tooltip
              content={
                <BrandedTooltip
                  formatter={tooltipFormatter || ((v) => formatChartValue(Number(v)))}
                />
              }
              cursor={{
                stroke: BRAND_CONFIG.colors.borderGray,
                strokeWidth: 1,
                strokeDasharray: '4 4',
              }}
            />

            {/* Legend */}
            {showLegend && lines.length > 1 && (
              <Legend content={<CustomLegend />} />
            )}

            {/* Area fills (if using ComposedChart) */}
            {needsComposedChart &&
              lines.map((line, index) => {
                if (!line.showArea && !showArea) return null;
                return (
                  <Area
                    key={`area-${line.dataKey}`}
                    type={CHART_THEME.line.type}
                    dataKey={line.dataKey}
                    stroke="none"
                    fill={`url(#area-gradient-${line.dataKey})`}
                    fillOpacity={CHART_THEME.area.fillOpacity}
                    animationDuration={animate ? CHART_THEME.animation.duration : 0}
                    isAnimationActive={animate}
                  />
                );
              })}

            {/* Lines */}
            {lines.map((line, index) => {
              const color = getLineColor(line, index);
              return (
                <Line
                  key={line.dataKey}
                  type={CHART_THEME.line.type}
                  dataKey={line.dataKey}
                  name={line.name}
                  stroke={color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={line.dashed ? '5 5' : undefined}
                  dot={showDots ? { r: 4, fill: color } : false}
                  activeDot={<CustomActiveDot fill={color} />}
                  animationDuration={animate ? CHART_THEME.animation.duration : 0}
                  animationEasing="ease-out"
                  isAnimationActive={animate}
                />
              );
            })}
          </ChartComponent>
        </ResponsiveContainer>
      </motion.div>
    </motion.div>
  );
};

// ============================================================================
// VARIANTS
// ============================================================================

/**
 * Simple single-line chart
 */
export const SimpleLineChart: React.FC<{
  data: Array<Record<string, string | number>>;
  dataKey: string;
  xAxisKey: string;
  height?: number;
  color?: string;
  showArea?: boolean;
  className?: string;
}> = ({ data, dataKey, xAxisKey, height = 200, color, showArea = true, className }) => (
  <BrandedLineChart
    data={data}
    lines={[{ dataKey, name: dataKey, color, showArea }]}
    xAxisKey={xAxisKey}
    height={height}
    showLegend={false}
    showArea={showArea}
    className={className}
  />
);

/**
 * Comparison line chart (two lines)
 */
export const ComparisonLineChart: React.FC<{
  data: Array<Record<string, string | number>>;
  primaryKey: string;
  secondaryKey: string;
  xAxisKey: string;
  primaryName?: string;
  secondaryName?: string;
  height?: number;
  className?: string;
}> = ({
  data,
  primaryKey,
  secondaryKey,
  xAxisKey,
  primaryName,
  secondaryName,
  height = 300,
  className,
}) => (
  <BrandedLineChart
    data={data}
    lines={[
      {
        dataKey: primaryKey,
        name: primaryName || primaryKey,
        color: BRAND_CONFIG.colors.consumptionPurple,
        showArea: true,
      },
      {
        dataKey: secondaryKey,
        name: secondaryName || secondaryKey,
        color: BRAND_CONFIG.colors.catalystGold,
        dashed: true,
      },
    ]}
    xAxisKey={xAxisKey}
    height={height}
    className={className}
  />
);

// ============================================================================
// EXPORTS
// ============================================================================

export default BrandedLineChart;
