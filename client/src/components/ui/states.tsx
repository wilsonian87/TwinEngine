/**
 * Unified State Components
 *
 * Consolidates loading, empty, and error state components for consistent
 * async view handling across the application.
 *
 * Usage Pattern:
 * ```tsx
 * if (isLoading) return <LoadingSkeleton variant="table" count={10} />;
 * if (error) return <ErrorState error={error} onRetry={refetch} />;
 * if (!data?.length) return <EmptyState icon={Users} title="No data" ... />;
 * ```
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Skeleton,
  HCPCardSkeleton,
  MetricCardSkeleton,
  TableRowSkeleton,
  ListItemSkeleton,
  ChartSkeleton,
} from "./skeleton";

// Re-export existing components for unified imports
export { EmptyState, EMPTY_STATE_COPY } from "./empty-state";
export type { } from "./empty-state";
export { ErrorState, InlineError, QueryError } from "./error-state";

// ============================================================================
// TYPES
// ============================================================================

export type LoadingSkeletonVariant =
  | "table"
  | "card"
  | "profile"
  | "list"
  | "metric"
  | "chart";

interface LoadingSkeletonProps {
  /** The type of skeleton to display */
  variant: LoadingSkeletonVariant;
  /** Number of skeleton items to render (default: 3) */
  count?: number;
  /** Number of columns for table variant (default: 4) */
  columns?: number;
  /** Additional CSS classes for the container */
  className?: string;
}

// ============================================================================
// LOADING SKELETON COMPONENT
// ============================================================================

/**
 * Unified loading skeleton component with multiple variants.
 *
 * @example
 * // Table loading state
 * <LoadingSkeleton variant="table" count={10} />
 *
 * @example
 * // Card grid loading state
 * <LoadingSkeleton variant="card" count={6} />
 *
 * @example
 * // Profile list loading state
 * <LoadingSkeleton variant="profile" count={5} />
 */
export function LoadingSkeleton({
  variant,
  count = 3,
  columns = 4,
  className,
}: LoadingSkeletonProps) {
  const items = Array.from({ length: count });

  switch (variant) {
    case "table":
      return (
        <div className={cn("rounded-lg border border-border", className)}>
          {/* Table header skeleton */}
          <div className="flex items-center gap-4 py-3 px-4 border-b border-border bg-muted/30">
            {Array.from({ length: columns }).map((_, i) => (
              <Skeleton
                key={`header-${i}`}
                variant="text"
                className={cn(
                  "h-3",
                  i === 0 ? "w-1/4" : i === columns - 1 ? "w-16" : "flex-1"
                )}
              />
            ))}
          </div>
          {/* Table rows */}
          {items.map((_, i) => (
            <TableRowSkeleton
              key={i}
              columns={columns}
              className={i < count - 1 ? "border-b border-border/50" : ""}
            />
          ))}
        </div>
      );

    case "card":
      return (
        <div
          className={cn(
            "grid gap-4 md:grid-cols-2 lg:grid-cols-3",
            className
          )}
        >
          {items.map((_, i) => (
            <HCPCardSkeleton key={i} />
          ))}
        </div>
      );

    case "profile":
      return (
        <div className={cn("space-y-4", className)}>
          {items.map((_, i) => (
            <div
              key={i}
              className="flex items-start gap-4 p-4 rounded-lg border border-border"
            >
              {/* Avatar */}
              <Skeleton variant="avatar" className="w-12 h-12 shrink-0" />
              {/* Content */}
              <div className="flex-1 space-y-2">
                <Skeleton variant="text" className="w-1/3 h-5" />
                <Skeleton variant="text" className="w-1/2 h-4" />
                <div className="flex gap-2 mt-3">
                  <Skeleton variant="badge" />
                  <Skeleton variant="badge" className="w-20" />
                </div>
              </div>
              {/* Action area */}
              <Skeleton variant="button" className="w-24 h-8" />
            </div>
          ))}
        </div>
      );

    case "list":
      return (
        <div className={cn("space-y-2", className)}>
          {items.map((_, i) => (
            <ListItemSkeleton key={i} />
          ))}
        </div>
      );

    case "metric":
      return (
        <div
          className={cn(
            "grid gap-4 md:grid-cols-2 lg:grid-cols-4",
            className
          )}
        >
          {items.map((_, i) => (
            <MetricCardSkeleton key={i} />
          ))}
        </div>
      );

    case "chart":
      return (
        <div
          className={cn(
            "grid gap-6 md:grid-cols-2",
            className
          )}
        >
          {items.map((_, i) => (
            <ChartSkeleton key={i} />
          ))}
        </div>
      );

    default:
      return null;
  }
}

// ============================================================================
// PAGE SKELETON PRESETS
// ============================================================================

/**
 * Full page loading skeleton for HCP Explorer
 */
export function HCPExplorerSkeleton() {
  return (
    <div className="space-y-4">
      {/* Filter bar skeleton */}
      <div className="flex gap-3">
        <Skeleton className="h-10 w-64 rounded-lg" />
        <Skeleton className="h-10 w-32 rounded-lg" />
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>
      {/* Cards grid */}
      <LoadingSkeleton variant="card" count={9} />
    </div>
  );
}

/**
 * Full page loading skeleton for Dashboard
 */
export function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      {/* Welcome skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-64 rounded" />
        <Skeleton className="h-5 w-96 rounded" />
      </div>
      {/* Metrics grid */}
      <LoadingSkeleton variant="metric" count={6} />
      {/* Charts */}
      <LoadingSkeleton variant="chart" count={4} />
    </div>
  );
}

/**
 * Full page loading skeleton for Simulations
 */
export function SimulationsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Tabs skeleton */}
      <div className="flex gap-2">
        <Skeleton className="h-9 w-32 rounded-lg" />
        <Skeleton className="h-9 w-32 rounded-lg" />
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>
      {/* Cards */}
      <LoadingSkeleton variant="card" count={6} />
    </div>
  );
}

/**
 * Full page loading skeleton for Audience Builder
 */
export function AudienceBuilderSkeleton() {
  return (
    <div className="space-y-6">
      {/* Saved audiences card */}
      <div className="rounded-lg border border-border p-4 space-y-3">
        <Skeleton className="h-5 w-40 rounded" />
        <LoadingSkeleton variant="list" count={3} />
      </div>
      {/* Builder area */}
      <div className="rounded-lg border border-border p-6">
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>
    </div>
  );
}

/**
 * Full page loading skeleton for Action Queue
 */
export function ActionQueueSkeleton() {
  return (
    <div className="space-y-4">
      {/* Header controls */}
      <div className="flex gap-3">
        <Skeleton className="h-10 w-48 rounded-lg" />
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>
      {/* Table */}
      <LoadingSkeleton variant="table" count={10} columns={5} />
    </div>
  );
}
