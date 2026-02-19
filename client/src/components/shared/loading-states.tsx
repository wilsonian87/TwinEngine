/**
 * Loading States — Context-aware loading wrapper.
 *
 * Chooses particle animation (Direct Mode) or skeleton (Discover Mode)
 * based on platform mode. Provides brand-aligned loading experience.
 *
 * Labels follow brand voice: "CONSUMING SIGNALS...", "METABOLIZING...", "PROCESSING..."
 *
 * @see OMNIVOR-VIZ-ROADMAP.md V1.2
 */

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useMode } from "@/lib/mode-context";
import { SignalProcessor } from "./signal-processor";
import { Skeleton } from "@/components/ui/skeleton";

interface LoadingStateProps {
  isLoading: boolean;
  variant?: "particle" | "skeleton";
  label?: string;
  children: ReactNode;
  className?: string;
}

/**
 * LoadingState — Wraps content with context-aware loading indicator.
 *
 * Default variant:
 * - Direct Mode → particle (SignalProcessor)
 * - Discover Mode → skeleton
 *
 * Override with explicit `variant` prop.
 */
export function LoadingState({
  isLoading,
  variant,
  label = "PROCESSING...",
  children,
  className,
}: LoadingStateProps) {
  const { isDirectMode } = useMode();
  const resolvedVariant = variant ?? (isDirectMode ? "particle" : "skeleton");

  if (!isLoading) {
    return <>{children}</>;
  }

  if (resolvedVariant === "skeleton") {
    return (
      <div className={cn("space-y-3", className)}>
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 py-8",
        className,
      )}
    >
      <SignalProcessor state="processing" size="md" />
      {label && (
        <span className="text-[0.625rem] font-semibold uppercase tracking-[0.15em] text-zinc-500">
          {label}
        </span>
      )}
    </div>
  );
}
