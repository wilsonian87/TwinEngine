/**
 * BrandedBarChart Component
 *
 * Brand-styled bar chart with animations and hover effects.
 * Wraps Recharts BarChart with OmniVor visual identity.
 *
 * @see ROADMAP-PHASE9-INTERACTION-EXPERIENCE.md M9A.3
 */

import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  CHART_THEME,
  CHART_GRADIENTS,
  BrandedTooltip,
  formatChartValue,
  renderChartGradients,
} from '@/lib/chart-theme';
import { BRAND_CONFIG } from '@/lib/brand-config';
import { staggerContainer, staggerCardChild } from '@/lib/motion-config';

// ============================================================================
// TYPES
// ============================================================================

export interface BarChartDataPoint {
  name: string;
  value: number;
  [key: string]: string | number;
}

export interface BrandedBarChartProps {
  /** Chart data array */
  data: BarChartDataPoint[];
  /** Key in data object for bar values */
  dataKey?: string;
  /** Key in data object for x-axis labels */
  xAxisKey?: string;
  /** Chart height in pixels */
  height?: number;
  /** Whether to show grid lines */
  showGrid?: boolean;
  /** Whether to animate on mount */
  animate?: boolean;
  /** Whether to use gradient fill */
  gradient?: boolean;
  /** Color variant */
  colorVariant?: 'primary' | 'gold' | 'secondary';
  /** Click handler for bars */
  onBarClick?: (data: BarChartDataPoint, index: number) => void;
  /** Whether to show horizontal layout */
  layout?: 'vertical' | 'horizontal';
  /** Additional CSS classes */
  className?: string;
  /** Custom tooltip formatter */
  tooltipFormatter?: (value: number | string) => string;
  /** Bar corner radius */
  barRadius?: number;
  /** Show value labels on bars */
  showLabels?: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const GRADIENT_IDS = {
  primary: CHART_GRADIENTS.barGradient.id,
  gold: CHART_GRADIENTS.goldGradient.id,
  secondary: 'omnivor-bar-secondary',
};

// ============================================================================
// CUSTOM BAR SHAPE
// ============================================================================

interface CustomBarProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fill?: string;
  index?: number;
  isHovered?: boolean;
  radius?: number;
}

const CustomBar: React.FC<CustomBarProps> = ({
  x = 0,
  y = 0,
  width = 0,
  height = 0,
  fill,
  index = 0,
  isHovered = false,
  radius = 4,
}) => {
  const actualHeight = Math.abs(height);
  const actualY = height < 0 ? y : y;

  return (
    <g>
      {/* Glow effect on hover */}
      {isHovered && (
        <rect
          x={x - 4}
          y={actualY - 4}
          width={width + 8}
          height={actualHeight + 8}
          rx={radius + 2}
          ry={radius + 2}
          fill={BRAND_CONFIG.colors.processViolet}
          opacity={0.2}
          filter="blur(8px)"
        />
      )}

      {/* Main bar */}
      <rect
        x={x}
        y={actualY}
        width={width}
        height={actualHeight}
        rx={radius}
        ry={radius}
        fill={fill}
        style={{
          transition: 'all 0.15s ease-out',
          transform: isHovered ? 'scaleY(1.02)' : 'scaleY(1)',
          transformOrigin: 'bottom',
        }}
      />
    </g>
  );
};

// ============================================================================
// COMPONENT
// ============================================================================

export const BrandedBarChart: React.FC<BrandedBarChartProps> = ({
  data,
  dataKey = 'value',
  xAxisKey = 'name',
  height = 300,
  showGrid = true,
  animate = true,
  gradient = true,
  colorVariant = 'primary',
  onBarClick,
  layout = 'vertical',
  className,
  tooltipFormatter,
  barRadius = 4,
  showLabels = false,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const getFill = () => {
    if (gradient) {
      return `url(#${GRADIENT_IDS[colorVariant]})`;
    }
    switch (colorVariant) {
      case 'gold':
        return BRAND_CONFIG.colors.catalystGold;
      case 'secondary':
        return BRAND_CONFIG.colors.processViolet;
      default:
        return BRAND_CONFIG.colors.consumptionPurple;
    }
  };

  const handleMouseEnter = (index: number) => {
    setHoveredIndex(index);
  };

  const handleMouseLeave = () => {
    setHoveredIndex(null);
  };

  const handleClick = (entry: BarChartDataPoint, index: number) => {
    if (onBarClick) {
      onBarClick(entry, index);
    }
  };

  return (
    <motion.div
      className={cn('w-full', className)}
      variants={staggerContainer}
      initial="initial"
      animate="enter"
    >
      <motion.div variants={staggerCardChild}>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart
            data={data}
            layout={layout === 'horizontal' ? 'vertical' : 'horizontal'}
            margin={{ top: 20, right: 20, left: 20, bottom: 20 }}
          >
            {/* Gradient definitions */}
            <defs>
              {renderChartGradients()}
              <linearGradient id="omnivor-bar-secondary" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#c084fc" stopOpacity={1} />
                <stop offset="100%" stopColor="#a855f7" stopOpacity={1} />
              </linearGradient>
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
              dataKey={layout === 'horizontal' ? dataKey : xAxisKey}
              axisLine={CHART_THEME.axis.axisLine}
              tickLine={CHART_THEME.axis.tickLine}
              tick={{
                fill: CHART_THEME.text.axisLabel.fill,
                fontSize: CHART_THEME.text.axisLabel.fontSize,
              }}
              type={layout === 'horizontal' ? 'number' : 'category'}
            />
            <YAxis
              dataKey={layout === 'horizontal' ? xAxisKey : undefined}
              axisLine={CHART_THEME.axis.axisLine}
              tickLine={CHART_THEME.axis.tickLine}
              tick={{
                fill: CHART_THEME.text.axisLabel.fill,
                fontSize: CHART_THEME.text.axisLabel.fontSize,
              }}
              type={layout === 'horizontal' ? 'category' : 'number'}
              tickFormatter={(value) =>
                typeof value === 'number' ? formatChartValue(value) : value
              }
            />

            {/* Tooltip */}
            <Tooltip
              content={
                <BrandedTooltip
                  formatter={tooltipFormatter || ((v) => formatChartValue(Number(v)))}
                />
              }
              cursor={{ fill: 'rgba(107, 33, 168, 0.1)' }}
            />

            {/* Bars */}
            <Bar
              dataKey={dataKey}
              fill={getFill()}
              radius={CHART_THEME.bar.radius as [number, number, number, number]}
              animationDuration={animate ? CHART_THEME.animation.duration : 0}
              animationEasing="ease-out"
              isAnimationActive={animate}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={getFill()}
                  onMouseEnter={() => handleMouseEnter(index)}
                  onMouseLeave={handleMouseLeave}
                  onClick={() => handleClick(entry, index)}
                  cursor={onBarClick ? 'pointer' : 'default'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </motion.div>
    </motion.div>
  );
};

// ============================================================================
// VARIANTS
// ============================================================================

/**
 * Compact bar chart for dashboard cards
 */
export const CompactBarChart: React.FC<Omit<BrandedBarChartProps, 'height' | 'showGrid'>> = (
  props
) => (
  <BrandedBarChart
    {...props}
    height={150}
    showGrid={false}
    barRadius={2}
  />
);

/**
 * Horizontal bar chart for rankings
 */
export const RankingBarChart: React.FC<Omit<BrandedBarChartProps, 'layout'>> = (props) => (
  <BrandedBarChart
    {...props}
    layout="horizontal"
  />
);

// ============================================================================
// EXPORTS
// ============================================================================

export default BrandedBarChart;
