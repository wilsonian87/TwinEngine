/**
 * MetricCard Component
 *
 * Brand-aligned metric cards with animated numbers, trends,
 * and secondary metrics. Used in Nerve Center grid.
 *
 * @see ROADMAP-PHASE9-INTERACTION-EXPERIENCE.md M9E.2
 */

import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, Info, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatedNumber } from '@/components/charts/animated-number';
import { SparkLine } from '@/components/charts/spark-line';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// ============================================================================
// TYPES
// ============================================================================

interface MetricCardProps {
  /** Metric label (uppercase) */
  label: string;
  /** Main metric value */
  value: number;
  /** Value format */
  format?: 'number' | 'currency' | 'percent';
  /** Prefix for value (e.g., "$") */
  prefix?: string;
  /** Suffix for value (e.g., "%") */
  suffix?: string;
  /** Percentage change vs previous period */
  trend?: number;
  /** Trend period label */
  trendLabel?: string;
  /** Secondary metric text */
  secondaryMetric?: string;
  /** Icon to display */
  icon?: LucideIcon;
  /** Tooltip help text */
  tooltip?: string;
  /** Sparkline data (optional) */
  sparklineData?: number[];
  /** Click handler */
  onClick?: () => void;
  /** Additional CSS classes */
  className?: string;
  /** Animation delay for stagger effect */
  delay?: number;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * MetricCard for dashboard metrics grid.
 *
 * @example
 * <MetricCard
 *   label="Signals Processed"
 *   value={12847}
 *   trend={14}
 *   trendLabel="vs last month"
 *   icon={Activity}
 *   sparklineData={[10, 15, 8, 20, 14, 22, 18]}
 * />
 */
export function MetricCard({
  label,
  value,
  format = 'number',
  prefix,
  suffix,
  trend,
  trendLabel = 'vs last period',
  secondaryMetric,
  icon: Icon,
  tooltip,
  sparklineData,
  onClick,
  className,
  delay = 0,
}: MetricCardProps) {
  const isClickable = !!onClick;
  const trendDirection = trend !== undefined ? (trend > 0 ? 'up' : trend < 0 ? 'down' : 'flat') : undefined;

  return (
    <motion.div
      className={cn(
        'relative rounded-xl border border-border bg-card p-5',
        'transition-all duration-200',
        isClickable && 'cursor-pointer hover:border-primary/50 hover:bg-primary/5',
        className
      )}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        delay,
        ease: [0.16, 1, 0.3, 1],
      }}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {label}
          </span>
          {tooltip && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3 w-3 text-muted-foreground hover:text-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs text-xs">{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        {Icon && <Icon className="h-4 w-4 text-primary" />}
      </div>

      {/* Main Value */}
      <div className="flex items-end justify-between">
        <div>
          <div className="text-2xl font-bold text-accent font-mono tracking-tight">
            {prefix}
            <AnimatedNumber
              value={value}
              format={format}
              duration={800}
              highlightColor="gold"
            />
            {suffix}
          </div>

          {/* Trend and Secondary Metric */}
          <div className="flex items-center gap-3 mt-2">
            {trend !== undefined && (
              <TrendIndicator value={trend} label={trendLabel} />
            )}
            {secondaryMetric && (
              <span className="text-xs text-muted-foreground">{secondaryMetric}</span>
            )}
          </div>
        </div>

        {/* Sparkline */}
        {sparklineData && sparklineData.length > 0 && (
          <div className="ml-4">
            <SparkLine
              data={sparklineData}
              width={64}
              height={32}
              color={trendDirection === 'down' ? 'gray' : 'purple'}
              showEndDot
              trend={trendDirection}
            />
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ============================================================================
// TREND INDICATOR
// ============================================================================

interface TrendIndicatorProps {
  value: number;
  label?: string;
}

function TrendIndicator({ value, label }: TrendIndicatorProps) {
  const isPositive = value > 0;
  const isNegative = value < 0;
  const isFlat = value === 0;

  const Icon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;
  const colorClass = isPositive
    ? 'text-emerald-400'
    : isNegative
    ? 'text-red-400'
    : 'text-muted-gray';

  return (
    <div className={cn('flex items-center gap-1 text-xs font-medium', colorClass)}>
      <Icon className="h-3 w-3" />
      <span>
        {isPositive && '+'}
        {value}%
      </span>
      {label && <span className="text-muted-foreground font-normal">{label}</span>}
    </div>
  );
}

// ============================================================================
// METRICS GRID
// ============================================================================

interface MetricsGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4 | 6;
  className?: string;
}

/**
 * Grid container for metric cards with stagger animation.
 */
export function MetricsGrid({ children, columns = 4, className }: MetricsGridProps) {
  const gridCols = {
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-2 lg:grid-cols-4',
    6: 'md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6',
  };

  return (
    <div className={cn('grid gap-4', gridCols[columns], className)}>
      {children}
    </div>
  );
}

// ============================================================================
// METRIC CARD VARIANTS
// ============================================================================

interface HighlightMetricCardProps extends Omit<MetricCardProps, 'className'> {
  /** Highlight color */
  highlightColor?: 'purple' | 'gold' | 'green';
}

/**
 * Highlighted variant for primary KPIs.
 */
export function HighlightMetricCard({
  highlightColor = 'purple',
  ...props
}: HighlightMetricCardProps) {
  const highlightClasses = {
    purple: 'border-primary/30 bg-primary/5',
    gold: 'border-accent/30 bg-accent/5',
    green: 'border-emerald-500/30 bg-emerald-500/5',
  };

  return <MetricCard {...props} className={highlightClasses[highlightColor]} />;
}

/**
 * Compact variant for smaller spaces.
 */
export function CompactMetricCard({
  label,
  value,
  format = 'number',
  prefix,
  suffix,
  trend,
  className,
}: Pick<MetricCardProps, 'label' | 'value' | 'format' | 'prefix' | 'suffix' | 'trend' | 'className'>) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-card p-3',
        className
      )}
    >
      <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <div className="flex items-baseline gap-2 mt-1">
        <span className="text-xl font-bold text-accent font-mono">
          {prefix}
          <AnimatedNumber value={value} format={format} duration={600} />
          {suffix}
        </span>
        {trend !== undefined && (
          <span
            className={cn(
              'text-xs font-medium',
              trend > 0 ? 'text-emerald-400' : trend < 0 ? 'text-red-400' : 'text-muted-foreground'
            )}
          >
            {trend > 0 && '+'}
            {trend}%
          </span>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default MetricCard;
