/**
 * Feature Tooltip Component
 *
 * Contextual tooltips for explaining new features and nomenclature.
 * Tracks dismissal in localStorage to avoid showing repeatedly.
 *
 * @see ROADMAP-PHASE9-INTERACTION-EXPERIENCE.md M9H.1
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

interface FeatureTooltipProps {
  /** Unique ID for tracking dismissal */
  id: string;
  /** Tooltip title */
  title: string;
  /** Tooltip description */
  description: string;
  /** Former name (for renamed features) */
  formerName?: string;
  /** Position of the tooltip */
  position?: 'top' | 'bottom' | 'left' | 'right';
  /** Children to wrap */
  children: React.ReactNode;
  /** Whether to show on first render (auto-open) */
  showOnMount?: boolean;
  /** Delay before auto-showing (ms) */
  showDelay?: number;
  /** Custom dismiss text */
  dismissText?: string;
  /** Whether the tooltip is enabled */
  enabled?: boolean;
}

// ============================================================================
// STORAGE
// ============================================================================

const STORAGE_PREFIX = 'omnivor_tooltip_';

function isDismissed(id: string): boolean {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem(`${STORAGE_PREFIX}${id}`) === 'dismissed';
}

function setDismissed(id: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`${STORAGE_PREFIX}${id}`, 'dismissed');
}

/**
 * Reset all tooltip dismissals (useful for testing or user preference)
 */
export function resetAllTooltips(): void {
  if (typeof window === 'undefined') return;
  const keys = Object.keys(localStorage);
  keys.forEach((key) => {
    if (key.startsWith(STORAGE_PREFIX)) {
      localStorage.removeItem(key);
    }
  });
}

/**
 * Reset a specific tooltip
 */
export function resetTooltip(id: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(`${STORAGE_PREFIX}${id}`);
}

// ============================================================================
// FEATURE TOOLTIP
// ============================================================================

export function FeatureTooltip({
  id,
  title,
  description,
  formerName,
  position = 'bottom',
  children,
  showOnMount = false,
  showDelay = 500,
  dismissText = 'Got it',
  enabled = true,
}: FeatureTooltipProps) {
  const [dismissed, setDismissedState] = useState(() => isDismissed(id));
  const [isOpen, setIsOpen] = useState(false);

  // Auto-show on mount if enabled
  useEffect(() => {
    if (showOnMount && !dismissed && enabled) {
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, showDelay);
      return () => clearTimeout(timer);
    }
  }, [showOnMount, dismissed, showDelay, enabled]);

  const handleDismiss = () => {
    setDismissed(id);
    setDismissedState(true);
    setIsOpen(false);
  };

  // If disabled or already dismissed, just render children
  if (!enabled || dismissed) {
    return <>{children}</>;
  }

  return (
    <Tooltip open={isOpen} onOpenChange={setIsOpen}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent
        side={position}
        sideOffset={8}
        className={cn(
          'max-w-xs p-0 bg-void-black/95 border-consumption-purple/30',
          'shadow-lg shadow-consumption-purple/10'
        )}
      >
        <div className="p-4">
          {/* Header with sparkle */}
          <div className="flex items-start gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-consumption-purple shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-signal-white">
                {title}
              </h4>
              {formerName && (
                <p className="text-xs text-muted-gray">
                  Formerly: {formerName}
                </p>
              )}
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-data-gray mb-3 ml-6">{description}</p>

          {/* Dismiss button */}
          <button
            onClick={handleDismiss}
            className="ml-6 text-xs text-consumption-purple hover:text-consumption-purple/80 hover:underline transition-colors"
          >
            {dismissText}
          </button>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

// ============================================================================
// FEATURE HIGHLIGHT
// ============================================================================

interface FeatureHighlightProps {
  /** Unique ID for tracking */
  id: string;
  /** Children to highlight */
  children: React.ReactNode;
  /** Whether highlight is active */
  active?: boolean;
  /** Pulse animation */
  pulse?: boolean;
}

/**
 * Visual highlight ring around new features.
 * Shows a subtle animated ring to draw attention.
 */
export function FeatureHighlight({
  id,
  children,
  active = true,
  pulse = true,
}: FeatureHighlightProps) {
  const [dismissed, setDismissedState] = useState(() => isDismissed(id));

  if (dismissed || !active) {
    return <>{children}</>;
  }

  return (
    <div className="relative inline-block">
      {children}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={cn(
          'absolute inset-0 -m-1 rounded-lg pointer-events-none',
          'border-2 border-consumption-purple/50',
          pulse && 'animate-pulse-glow'
        )}
      />
      <button
        onClick={() => {
          setDismissed(id);
          setDismissedState(true);
        }}
        className="absolute -top-1 -right-1 p-0.5 rounded-full bg-consumption-purple text-signal-white hover:bg-consumption-purple/80 transition-colors"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

// ============================================================================
// NOMENCLATURE DEFINITIONS
// ============================================================================

/**
 * Predefined feature tooltip content for OmniVor nomenclature.
 */
export const NOMENCLATURE_TOOLTIPS = {
  hcpExplorer: {
    id: 'hcp-explorer',
    title: 'HCP Explorer',
    description: 'Browse and search your complete HCP ecosystem. Each profile represents engagement signals across channels.',
  },
  audienceBuilder: {
    id: 'audience-builder',
    title: 'Audience Builder',
    description: 'Build, refine, and manage HCP audiences using natural language queries or filters.',
  },
  simulationStudio: {
    id: 'simulation-studio',
    title: 'Simulation Studio',
    description: 'Project engagement outcomes for different channel strategies and timing scenarios.',
  },
  dashboard: {
    id: 'dashboard',
    title: 'Dashboard',
    description: 'Your mission control for monitoring metrics, patterns, and platform health.',
  },
  channelHealth: {
    id: 'channel-health',
    title: 'Channel Health',
    description: 'Diagnose channel performance and identify optimization opportunities.',
  },
  portfolioOptimizer: {
    id: 'portfolio-optimizer',
    title: 'Portfolio Optimizer',
    description: 'Optimize resource allocation across HCPs and channels using constraint-aware algorithms.',
  },
} as const;

// ============================================================================
// EXPORTS
// ============================================================================

export default FeatureTooltip;
