/**
 * Skeleton Component
 *
 * Brand-aligned loading placeholder with purple-tinted shimmer animation.
 * Used for content loading states throughout the app.
 *
 * @see ROADMAP-PHASE9-INTERACTION-EXPERIENCE.md M9D.1
 */

import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Shape variant for the skeleton */
  variant?: 'default' | 'card' | 'text' | 'avatar' | 'button' | 'badge';
  /** Whether to use the shimmer animation (default) or pulse */
  animated?: boolean;
}

// ============================================================================
// VARIANT STYLES
// ============================================================================

const variantStyles = {
  default: '',
  card: 'rounded-xl',
  text: 'h-4 rounded',
  avatar: 'rounded-full aspect-square',
  button: 'h-10 rounded-lg',
  badge: 'h-5 w-16 rounded-full',
};

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * Branded skeleton loader with purple-tinted shimmer.
 *
 * @example
 * // Basic usage
 * <Skeleton className="h-12 w-full" />
 *
 * @example
 * // Card skeleton
 * <Skeleton variant="card" className="h-48 w-full" />
 *
 * @example
 * // Text lines
 * <div className="space-y-2">
 *   <Skeleton variant="text" className="w-3/4" />
 *   <Skeleton variant="text" className="w-1/2" />
 * </div>
 *
 * @example
 * // Avatar
 * <Skeleton variant="avatar" className="w-10 h-10" />
 */
function Skeleton({ className, variant = 'default', animated = true, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        'bg-gradient-to-r from-border-gray via-consumption-purple/10 to-border-gray bg-[length:200%_100%]',
        animated && 'animate-shimmer',
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
}

// ============================================================================
// PRESET SKELETONS
// ============================================================================

/**
 * Skeleton for HCP profile cards (Signal Index)
 */
function HCPCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border-gray bg-void-black p-4 space-y-4',
        className
      )}
    >
      {/* Header with avatar and name */}
      <div className="flex items-center gap-3">
        <Skeleton variant="avatar" className="w-10 h-10" />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" className="w-3/4" />
          <Skeleton variant="text" className="w-1/2 h-3" />
        </div>
      </div>
      {/* Content */}
      <div className="space-y-2">
        <Skeleton variant="text" className="w-full" />
        <Skeleton variant="text" className="w-2/3" />
      </div>
      {/* Footer badges */}
      <div className="flex gap-2">
        <Skeleton variant="badge" />
        <Skeleton variant="badge" className="w-20" />
      </div>
    </div>
  );
}

/**
 * Skeleton for metric cards (Nerve Center)
 */
function MetricCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border-gray bg-void-black p-6 space-y-4',
        className
      )}
    >
      {/* Label */}
      <Skeleton variant="text" className="w-24 h-3" />
      {/* Large number */}
      <Skeleton className="h-10 w-32 rounded" />
      {/* Trend */}
      <Skeleton variant="text" className="w-20 h-3" />
    </div>
  );
}

/**
 * Skeleton for table rows
 */
function TableRowSkeleton({ columns = 4, className }: { columns?: number; className?: string }) {
  return (
    <div className={cn('flex items-center gap-4 py-3 px-4', className)}>
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          className={cn('flex-1', i === 0 && 'w-1/4', i === columns - 1 && 'w-16')}
        />
      ))}
    </div>
  );
}

/**
 * Skeleton for list items
 */
function ListItemSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-3 py-3', className)}>
      <Skeleton variant="avatar" className="w-8 h-8" />
      <div className="flex-1 space-y-2">
        <Skeleton variant="text" className="w-3/4" />
        <Skeleton variant="text" className="w-1/2 h-3" />
      </div>
      <Skeleton variant="badge" />
    </div>
  );
}

/**
 * Skeleton for chart areas
 */
function ChartSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-xl border border-border-gray bg-void-black p-4', className)}>
      {/* Chart title */}
      <div className="flex justify-between items-center mb-4">
        <Skeleton variant="text" className="w-32" />
        <Skeleton variant="badge" />
      </div>
      {/* Chart area */}
      <div className="h-48 flex items-end gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton
            key={i}
            className="flex-1 rounded-t"
            style={{ height: `${30 + Math.random() * 70}%` }}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  Skeleton,
  HCPCardSkeleton,
  MetricCardSkeleton,
  TableRowSkeleton,
  ListItemSkeleton,
  ChartSkeleton,
};
