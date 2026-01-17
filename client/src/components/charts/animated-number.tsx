/**
 * AnimatedNumber Component
 *
 * Smoothly animates number values with brand-aligned styling.
 * Uses RAF-based animation for 60fps performance.
 *
 * @see ROADMAP-PHASE9-INTERACTION-EXPERIENCE.md M9A.2
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { BRAND_CONFIG } from '@/lib/brand-config';
import { MOTION_DURATION, numberReveal } from '@/lib/motion-config';
import { easingFunctions } from '@/lib/chart-animations';

// ============================================================================
// TYPES
// ============================================================================

export interface AnimatedNumberProps {
  /** The target value to animate to */
  value: number;
  /** Animation duration in milliseconds */
  duration?: number;
  /** Number format type */
  format?: 'number' | 'currency' | 'percent' | 'compact';
  /** Text to display before the number */
  prefix?: string;
  /** Text to display after the number */
  suffix?: string;
  /** Additional CSS classes */
  className?: string;
  /** Color variant for emphasis */
  highlightColor?: 'gold' | 'purple' | 'white' | 'gray';
  /** Number of decimal places */
  decimals?: number;
  /** Whether to show trend indicator */
  showTrend?: boolean;
  /** Previous value for trend calculation */
  previousValue?: number;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  /** Whether to animate on mount */
  animateOnMount?: boolean;
  /** Callback when animation completes */
  onComplete?: () => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const SIZE_CLASSES: Record<string, string> = {
  sm: 'text-sm font-medium',
  md: 'text-base font-semibold',
  lg: 'text-lg font-bold',
  xl: 'text-2xl font-bold',
  '2xl': 'text-3xl font-extrabold tracking-tight',
};

const HIGHLIGHT_COLORS: Record<string, string> = {
  gold: `text-[${BRAND_CONFIG.colors.catalystGold}]`,
  purple: `text-[${BRAND_CONFIG.colors.processViolet}]`,
  white: `text-[${BRAND_CONFIG.colors.signalWhite}]`,
  gray: `text-[${BRAND_CONFIG.colors.dataGray}]`,
};

// Inline style fallback for dynamic colors
const getHighlightStyle = (color: string): React.CSSProperties => {
  const colorMap: Record<string, string> = {
    gold: BRAND_CONFIG.colors.catalystGold,
    purple: BRAND_CONFIG.colors.processViolet,
    white: BRAND_CONFIG.colors.signalWhite,
    gray: BRAND_CONFIG.colors.dataGray,
  };
  return { color: colorMap[color] || colorMap.white };
};

// ============================================================================
// FORMATTING UTILITIES
// ============================================================================

function formatNumber(
  value: number,
  format: 'number' | 'currency' | 'percent' | 'compact',
  decimals: number
): string {
  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(value);

    case 'percent':
      return new Intl.NumberFormat('en-US', {
        style: 'percent',
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(value / 100);

    case 'compact':
      if (value >= 1000000) {
        return `${(value / 1000000).toFixed(decimals)}M`;
      }
      if (value >= 1000) {
        return `${(value / 1000).toFixed(decimals)}K`;
      }
      return value.toFixed(decimals);

    default:
      return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(value);
  }
}

// ============================================================================
// COMPONENT
// ============================================================================

export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  duration = MOTION_DURATION.data * 1000,
  format = 'number',
  prefix = '',
  suffix = '',
  className,
  highlightColor = 'white',
  decimals = 0,
  showTrend = false,
  previousValue,
  size = 'md',
  animateOnMount = true,
  onComplete,
}) => {
  const [displayValue, setDisplayValue] = useState(animateOnMount ? 0 : value);
  const previousValueRef = useRef(animateOnMount ? 0 : value);
  const frameRef = useRef<number>();
  const hasAnimated = useRef(false);

  // Calculate trend
  const trend = previousValue !== undefined
    ? value > previousValue ? 'up' : value < previousValue ? 'down' : 'flat'
    : undefined;

  useEffect(() => {
    // Skip animation if reduced motion is preferred
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    if (prefersReducedMotion) {
      setDisplayValue(value);
      previousValueRef.current = value;
      onComplete?.();
      return;
    }

    // Skip initial animation if animateOnMount is false and hasn't animated yet
    if (!animateOnMount && !hasAnimated.current) {
      setDisplayValue(value);
      previousValueRef.current = value;
      hasAnimated.current = true;
      return;
    }

    const startValue = previousValueRef.current;
    const difference = value - startValue;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easingFunctions.easeOut(progress);

      const newValue = startValue + difference * easedProgress;
      setDisplayValue(newValue);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(value);
        previousValueRef.current = value;
        hasAnimated.current = true;
        onComplete?.();
      }
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [value, duration, animateOnMount, onComplete]);

  const formattedValue = formatNumber(displayValue, format, decimals);

  return (
    <motion.span
      className={cn(
        'inline-flex items-center gap-1 tabular-nums',
        SIZE_CLASSES[size],
        className
      )}
      style={getHighlightStyle(highlightColor)}
      initial={animateOnMount ? 'initial' : false}
      animate="enter"
      variants={numberReveal}
    >
      {prefix && (
        <span className="opacity-70">{prefix}</span>
      )}

      <span className="font-inherit">
        {formattedValue}
      </span>

      {suffix && (
        <span className="opacity-70">{suffix}</span>
      )}

      {showTrend && trend && trend !== 'flat' && (
        <TrendIndicator trend={trend} size={size} />
      )}
    </motion.span>
  );
};

// ============================================================================
// TREND INDICATOR
// ============================================================================

interface TrendIndicatorProps {
  trend: 'up' | 'down';
  size: string;
}

const TrendIndicator: React.FC<TrendIndicatorProps> = ({ trend, size }) => {
  const isUp = trend === 'up';
  const iconSize = size === 'sm' ? 12 : size === 'md' ? 14 : 16;

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.3, duration: 0.2 }}
      className={cn(
        'inline-flex items-center',
        isUp ? 'text-green-500' : 'text-red-500'
      )}
    >
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 16 16"
        fill="none"
        className={cn(!isUp && 'rotate-180')}
      >
        <path
          d="M8 4L12 8L10.6 9.4L9 7.8V12H7V7.8L5.4 9.4L4 8L8 4Z"
          fill="currentColor"
        />
      </svg>
    </motion.span>
  );
};

// ============================================================================
// VARIANTS
// ============================================================================

/**
 * Large metric display variant
 */
export const MetricNumber: React.FC<AnimatedNumberProps> = (props) => (
  <AnimatedNumber
    {...props}
    size="2xl"
    highlightColor={props.highlightColor || 'gold'}
  />
);

/**
 * Compact inline variant
 */
export const InlineNumber: React.FC<AnimatedNumberProps> = (props) => (
  <AnimatedNumber
    {...props}
    size="sm"
    highlightColor={props.highlightColor || 'white'}
    animateOnMount={false}
  />
);

/**
 * Currency display variant
 */
export const CurrencyNumber: React.FC<Omit<AnimatedNumberProps, 'format'>> = (props) => (
  <AnimatedNumber
    {...props}
    format="currency"
    highlightColor={props.highlightColor || 'gold'}
  />
);

/**
 * Percentage display variant
 */
export const PercentNumber: React.FC<Omit<AnimatedNumberProps, 'format'>> = (props) => (
  <AnimatedNumber
    {...props}
    format="percent"
    decimals={props.decimals ?? 1}
  />
);

// ============================================================================
// EXPORTS
// ============================================================================

export default AnimatedNumber;
