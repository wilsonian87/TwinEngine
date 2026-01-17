/**
 * ConvergenceAnimation Component
 *
 * CSS-based loading animation representing data being "consumed" and processed.
 * Dots/signals converge toward the center, reinforcing the brand metaphor
 * of "consumption → transformation → intelligence".
 *
 * @see ROADMAP-PHASE9-INTERACTION-EXPERIENCE.md M9D.3
 */

import React from 'react';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

interface ConvergenceAnimationProps {
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Animation speed */
  speed?: 'slow' | 'normal' | 'fast';
  /** Additional CSS classes */
  className?: string;
  /** Whether to show the center glow effect */
  showCenterGlow?: boolean;
}

// ============================================================================
// SIZE CONFIG
// ============================================================================

const sizeConfig = {
  sm: {
    container: 'w-12 h-12',
    dotSize: 'w-1.5 h-1.5',
    radius: 20, // px from center
    centerSize: 'w-2 h-2',
  },
  md: {
    container: 'w-20 h-20',
    dotSize: 'w-2 h-2',
    radius: 32,
    centerSize: 'w-3 h-3',
  },
  lg: {
    container: 'w-32 h-32',
    dotSize: 'w-3 h-3',
    radius: 52,
    centerSize: 'w-4 h-4',
  },
};

const speedConfig = {
  slow: '3s',
  normal: '2s',
  fast: '1.2s',
};

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * Convergence loading animation with dots pulsing inward.
 *
 * @example
 * // Basic usage
 * <ConvergenceAnimation />
 *
 * @example
 * // Large with slow animation
 * <ConvergenceAnimation size="lg" speed="slow" />
 *
 * @example
 * // With center glow
 * <ConvergenceAnimation showCenterGlow />
 */
export function ConvergenceAnimation({
  size = 'md',
  speed = 'normal',
  className,
  showCenterGlow = true,
}: ConvergenceAnimationProps) {
  const config = sizeConfig[size];
  const duration = speedConfig[speed];
  const dotCount = 8;

  return (
    <div
      className={cn('relative flex items-center justify-center', config.container, className)}
      role="status"
      aria-label="Loading"
    >
      {/* Convergence dots */}
      {Array.from({ length: dotCount }).map((_, i) => {
        const angle = (i / dotCount) * 360;
        const delay = (i / dotCount) * parseFloat(duration);

        return (
          <div
            key={i}
            className={cn(
              'absolute rounded-full bg-consumption-purple',
              config.dotSize
            )}
            style={{
              transform: `rotate(${angle}deg) translateY(-${config.radius}px)`,
              transformOrigin: 'center center',
              animation: `convergence ${duration} ease-in-out infinite`,
              animationDelay: `${delay}s`,
            }}
          />
        );
      })}

      {/* Center glow point */}
      {showCenterGlow && (
        <div
          className={cn(
            'absolute rounded-full bg-catalyst-gold',
            config.centerSize,
            'animate-pulse-glow'
          )}
        />
      )}

      {/* Screen reader text */}
      <span className="sr-only">Loading...</span>
    </div>
  );
}

// ============================================================================
// INLINE VARIANT
// ============================================================================

interface InlineLoaderProps {
  /** Size in pixels */
  size?: number;
  /** Color variant */
  color?: 'purple' | 'gold' | 'white';
  className?: string;
}

/**
 * Inline spinner for buttons and small spaces.
 */
export function InlineLoader({ size = 16, color = 'purple', className }: InlineLoaderProps) {
  const colorClass = {
    purple: 'border-consumption-purple border-t-transparent',
    gold: 'border-catalyst-gold border-t-transparent',
    white: 'border-signal-white border-t-transparent',
  };

  return (
    <div
      className={cn('animate-spin rounded-full border-2', colorClass[color], className)}
      style={{ width: size, height: size }}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}

// ============================================================================
// FULL PAGE LOADER
// ============================================================================

interface FullPageLoaderProps {
  /** Loading message */
  message?: string;
}

/**
 * Full page loading overlay with convergence animation.
 */
export function FullPageLoader({ message = 'Processing signals...' }: FullPageLoaderProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-void-black/95 backdrop-blur-sm">
      <ConvergenceAnimation size="lg" />
      <p className="mt-6 text-data-gray text-sm animate-pulse">{message}</p>
    </div>
  );
}

// ============================================================================
// SECTION LOADER
// ============================================================================

interface SectionLoaderProps {
  /** Loading message */
  message?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Section-level loading indicator.
 */
export function SectionLoader({ message, size = 'md', className }: SectionLoaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12',
        className
      )}
    >
      <ConvergenceAnimation size={size} />
      {message && (
        <p className="mt-4 text-muted-gray text-sm">{message}</p>
      )}
    </div>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default ConvergenceAnimation;
