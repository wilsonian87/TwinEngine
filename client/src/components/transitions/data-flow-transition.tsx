/**
 * DataFlowTransition Components
 *
 * Shared element transitions that make data visually "travel"
 * between views, reinforcing the transformation metaphor.
 *
 * Uses Framer Motion's layoutId for smooth element morphing.
 *
 * @see ROADMAP-PHASE9-INTERACTION-EXPERIENCE.md M9B.3
 */

import React from 'react';
import { motion, LayoutGroup } from 'framer-motion';
import { cn } from '@/lib/utils';
import { sharedElementTransition, MOTION_DURATION, MOTION_EASING } from '@/lib/motion-config';
import { useReducedMotion } from '@/lib/chart-animations';

// ============================================================================
// TYPES
// ============================================================================

export interface DataFlowElementProps {
  /** Unique ID for tracking element across views (must match between pages) */
  layoutId: string;
  /** Element content */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Whether this element should animate */
  animate?: boolean;
  /** Callback when layout animation completes */
  onLayoutAnimationComplete?: () => void;
}

export interface DataFlowGroupProps {
  /** Group ID for isolating layout animations */
  id?: string;
  /** Children with DataFlowElements */
  children: React.ReactNode;
}

export interface DataFlowValueProps {
  /** Unique ID for this value across views */
  layoutId: string;
  /** The value to display */
  value: string | number;
  /** Format the value */
  format?: 'number' | 'currency' | 'percent';
  /** Additional CSS classes */
  className?: string;
  /** Label shown with the value */
  label?: string;
}

// ============================================================================
// DATA FLOW ELEMENT
// ============================================================================

/**
 * Wrap elements that should visually "travel" between pages.
 *
 * @example
 * // In Cohort Lab
 * <DataFlowElement layoutId="audience-count">
 *   <span className="text-2xl">{audienceCount}</span>
 * </DataFlowElement>
 *
 * // In Scenario Lab header (same layoutId)
 * <DataFlowElement layoutId="audience-count">
 *   <span className="text-lg">{audienceCount} HCPs</span>
 * </DataFlowElement>
 */
export const DataFlowElement: React.FC<DataFlowElementProps> = ({
  layoutId,
  children,
  className,
  animate = true,
  onLayoutAnimationComplete,
}) => {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion || !animate) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      layoutId={layoutId}
      className={className}
      transition={sharedElementTransition}
      onLayoutAnimationComplete={onLayoutAnimationComplete}
    >
      {children}
    </motion.div>
  );
};

// ============================================================================
// DATA FLOW GROUP
// ============================================================================

/**
 * Groups DataFlowElements to isolate their layout animations.
 * Prevents unrelated elements from affecting each other.
 *
 * @example
 * <DataFlowGroup id="cohort-metrics">
 *   <DataFlowElement layoutId="audience-count">...</DataFlowElement>
 *   <DataFlowElement layoutId="engagement-score">...</DataFlowElement>
 * </DataFlowGroup>
 */
export const DataFlowGroup: React.FC<DataFlowGroupProps> = ({
  id,
  children,
}) => {
  return <LayoutGroup id={id}>{children}</LayoutGroup>;
};

// ============================================================================
// DATA FLOW VALUE
// ============================================================================

/**
 * Pre-styled data value that flows between views.
 * Common use case for metrics that appear on multiple pages.
 */
export const DataFlowValue: React.FC<DataFlowValueProps> = ({
  layoutId,
  value,
  format = 'number',
  className,
  label,
}) => {
  const formattedValue = formatValue(value, format);

  return (
    <DataFlowElement layoutId={layoutId} className={cn('inline-flex items-baseline gap-2', className)}>
      <span className="font-bold tabular-nums">{formattedValue}</span>
      {label && <span className="text-data-gray text-sm">{label}</span>}
    </DataFlowElement>
  );
};

function formatValue(value: string | number, format: 'number' | 'currency' | 'percent'): string {
  if (typeof value === 'string') return value;

  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
      }).format(value);
    case 'percent':
      return `${value.toFixed(1)}%`;
    default:
      return value.toLocaleString();
  }
}

// ============================================================================
// DATA FLOW CARD
// ============================================================================

export interface DataFlowCardProps {
  /** Unique ID for the card */
  layoutId: string;
  /** Card content */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Click handler */
  onClick?: () => void;
  /** Whether card is selected/expanded */
  isSelected?: boolean;
}

/**
 * A card that can expand/morph when transitioning between views.
 * Useful for HCP cards that expand into detail views.
 *
 * @example
 * // In list view
 * <DataFlowCard layoutId={`hcp-${hcp.id}`} onClick={() => navigate(`/hcp/${hcp.id}`)}>
 *   <HCPSummary hcp={hcp} />
 * </DataFlowCard>
 *
 * // In detail view
 * <DataFlowCard layoutId={`hcp-${hcp.id}`} isSelected>
 *   <HCPDetail hcp={hcp} />
 * </DataFlowCard>
 */
export const DataFlowCard: React.FC<DataFlowCardProps> = ({
  layoutId,
  children,
  className,
  onClick,
  isSelected = false,
}) => {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return (
      <div
        className={cn(
          'rounded-lg border border-border-gray bg-void-black',
          onClick && 'cursor-pointer',
          className
        )}
        onClick={onClick}
      >
        {children}
      </div>
    );
  }

  return (
    <motion.div
      layoutId={layoutId}
      className={cn(
        'rounded-lg border border-border-gray bg-void-black',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
      transition={sharedElementTransition}
      initial={false}
      animate={{
        scale: isSelected ? 1 : 1,
        zIndex: isSelected ? 10 : 1,
      }}
      whileHover={onClick ? { scale: 1.02 } : undefined}
      whileTap={onClick ? { scale: 0.98 } : undefined}
    >
      {children}
    </motion.div>
  );
};

// ============================================================================
// DATA FLOW METRIC
// ============================================================================

export interface DataFlowMetricProps {
  /** Unique ID for this metric */
  layoutId: string;
  /** Metric label */
  label: string;
  /** Metric value */
  value: number;
  /** Previous value for trend */
  previousValue?: number;
  /** Value format */
  format?: 'number' | 'currency' | 'percent';
  /** Additional CSS classes */
  className?: string;
}

/**
 * A metric display that animates between views.
 * Includes the label, value, and optional trend indicator.
 */
export const DataFlowMetric: React.FC<DataFlowMetricProps> = ({
  layoutId,
  label,
  value,
  previousValue,
  format = 'number',
  className,
}) => {
  const formattedValue = formatValue(value, format);
  const trend = previousValue !== undefined
    ? value > previousValue ? 'up' : value < previousValue ? 'down' : 'flat'
    : undefined;

  return (
    <DataFlowElement
      layoutId={layoutId}
      className={cn('flex flex-col', className)}
    >
      <span className="text-xs text-data-gray uppercase tracking-wider mb-1">
        {label}
      </span>
      <div className="flex items-center gap-2">
        <span className="text-2xl font-bold text-signal-white tabular-nums">
          {formattedValue}
        </span>
        {trend && trend !== 'flat' && (
          <TrendBadge trend={trend} />
        )}
      </div>
    </DataFlowElement>
  );
};

// ============================================================================
// TREND BADGE
// ============================================================================

interface TrendBadgeProps {
  trend: 'up' | 'down';
}

const TrendBadge: React.FC<TrendBadgeProps> = ({ trend }) => {
  const isUp = trend === 'up';

  return (
    <span
      className={cn(
        'inline-flex items-center text-xs font-medium',
        isUp ? 'text-green-500' : 'text-red-500'
      )}
    >
      <svg
        width={12}
        height={12}
        viewBox="0 0 12 12"
        fill="none"
        className={cn(!isUp && 'rotate-180')}
      >
        <path
          d="M6 3L9 6L7.95 7.05L6.75 5.85V9H5.25V5.85L4.05 7.05L3 6L6 3Z"
          fill="currentColor"
        />
      </svg>
    </span>
  );
};

// ============================================================================
// HERO VALUE TRANSITION
// ============================================================================

export interface HeroValueProps {
  /** Unique layout ID */
  layoutId: string;
  /** The value */
  value: string | number;
  /** Whether this is the expanded/hero state */
  isHero?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * A value that transitions between inline and hero display.
 * Use for key metrics that become prominent when selected.
 */
export const HeroValue: React.FC<HeroValueProps> = ({
  layoutId,
  value,
  isHero = false,
  className,
}) => {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return (
      <span
        className={cn(
          'font-bold tabular-nums',
          isHero ? 'text-4xl text-catalyst-gold' : 'text-lg text-signal-white',
          className
        )}
      >
        {value}
      </span>
    );
  }

  return (
    <motion.span
      layoutId={layoutId}
      className={cn('font-bold tabular-nums', className)}
      animate={{
        fontSize: isHero ? '2.25rem' : '1.125rem',
        color: isHero ? '#d97706' : '#fafafa',
      }}
      transition={{
        duration: MOTION_DURATION.page,
        ease: MOTION_EASING.out,
      }}
    >
      {value}
    </motion.span>
  );
};

// ============================================================================
// EXPORTS
// ============================================================================

export default DataFlowElement;
