/**
 * PatternHighlights Component
 *
 * "Patterns Crystallized" section showing recent insights
 * surfaced by OmniVor. Severity-based cards with left accent.
 *
 * @see ROADMAP-PHASE9-INTERACTION-EXPERIENCE.md M9E.3
 */

import React from 'react';
import { motion } from 'framer-motion';
import {
  Lightbulb,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
  Clock,
  Users,
  Activity,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { StaggerContainer, StaggerItem } from '@/components/transitions';

// ============================================================================
// TYPES
// ============================================================================

export interface PatternHighlight {
  id: string;
  /** Pattern title */
  title: string;
  /** Description of the pattern */
  description: string;
  /** Severity/type */
  severity: 'insight' | 'warning' | 'opportunity';
  /** When pattern was detected */
  timestamp: Date;
  /** Related HCP count */
  relatedHcpCount?: number;
  /** Related module path for navigation */
  modulePath?: string;
  /** Category for icon selection */
  category?: 'engagement' | 'audience' | 'channel' | 'trend';
}

interface PatternHighlightsProps {
  /** Array of pattern highlights */
  patterns: PatternHighlight[];
  /** Click handler for pattern cards */
  onPatternClick?: (pattern: PatternHighlight) => void;
  /** Maximum patterns to show */
  maxPatterns?: number;
  /** Additional CSS classes */
  className?: string;
}

interface PatternCardProps {
  pattern: PatternHighlight;
  onClick?: () => void;
}

// ============================================================================
// CONFIG
// ============================================================================

const severityConfig = {
  insight: {
    borderColor: 'border-l-consumption-purple',
    iconBg: 'bg-consumption-purple/10',
    iconColor: 'text-consumption-purple',
    Icon: Lightbulb,
  },
  warning: {
    borderColor: 'border-l-amber-500',
    iconBg: 'bg-amber-500/10',
    iconColor: 'text-amber-500',
    Icon: AlertTriangle,
  },
  opportunity: {
    borderColor: 'border-l-catalyst-gold',
    iconBg: 'bg-catalyst-gold/10',
    iconColor: 'text-catalyst-gold',
    Icon: TrendingUp,
  },
};

const categoryIcons = {
  engagement: Activity,
  audience: Users,
  channel: Zap,
  trend: TrendingUp,
};

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Format relative time
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

// ============================================================================
// PATTERN CARD COMPONENT
// ============================================================================

function PatternCard({ pattern, onClick }: PatternCardProps) {
  const config = severityConfig[pattern.severity];
  const SeverityIcon = config.Icon;
  const CategoryIcon = pattern.category ? categoryIcons[pattern.category] : null;

  return (
    <motion.div
      className={cn(
        'relative rounded-lg border border-border-gray bg-void-black',
        'border-l-4',
        config.borderColor,
        'transition-all duration-200',
        onClick && 'cursor-pointer hover:border-border-gray/80 hover:bg-white/[0.02]'
      )}
      onClick={onClick}
      whileHover={onClick ? { x: 4 } : undefined}
      transition={{ duration: 0.15 }}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div
            className={cn(
              'flex items-center justify-center w-8 h-8 rounded-lg shrink-0',
              config.iconBg
            )}
          >
            <SeverityIcon className={cn('w-4 h-4', config.iconColor)} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-signal-white mb-1">
              {pattern.title}
            </h4>
            <p className="text-xs text-data-gray line-clamp-2">
              {pattern.description}
            </p>

            {/* Footer */}
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1 text-[10px] text-muted-gray">
                <Clock className="w-3 h-3" />
                {formatRelativeTime(pattern.timestamp)}
              </div>
              {pattern.relatedHcpCount && (
                <div className="flex items-center gap-1 text-[10px] text-muted-gray">
                  <Users className="w-3 h-3" />
                  {pattern.relatedHcpCount.toLocaleString()} HCPs
                </div>
              )}
              {CategoryIcon && (
                <CategoryIcon className="w-3 h-3 text-muted-gray" />
              )}
            </div>
          </div>

          {/* Arrow */}
          {onClick && (
            <ArrowRight className="w-4 h-4 text-muted-gray shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * Pattern Highlights section for Nerve Center.
 *
 * @example
 * <PatternHighlights
 *   patterns={[
 *     {
 *       id: '1',
 *       title: 'Engagement spike detected',
 *       description: 'Cardiology segment showing 23% increase in email response rates.',
 *       severity: 'opportunity',
 *       timestamp: new Date(),
 *       relatedHcpCount: 142,
 *     },
 *   ]}
 *   onPatternClick={(pattern) => navigate(pattern.modulePath)}
 * />
 */
export function PatternHighlights({
  patterns,
  onPatternClick,
  maxPatterns = 5,
  className,
}: PatternHighlightsProps) {
  const displayPatterns = patterns.slice(0, maxPatterns);

  if (patterns.length === 0) {
    return (
      <div className={cn('py-8 text-center', className)}>
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-border-gray/50 mx-auto mb-3">
          <Lightbulb className="w-5 h-5 text-muted-gray" />
        </div>
        <p className="text-sm text-muted-gray">No patterns detected yet.</p>
        <p className="text-xs text-muted-gray mt-1">
          Patterns will appear as OmniVor processes more signals.
        </p>
      </div>
    );
  }

  return (
    <section className={className}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-signal-white">
          Patterns Crystallized
        </h2>
        {patterns.length > maxPatterns && (
          <button className="text-xs text-consumption-purple hover:underline">
            View all ({patterns.length})
          </button>
        )}
      </div>

      <StaggerContainer className="space-y-3">
        {displayPatterns.map((pattern) => (
          <StaggerItem key={pattern.id}>
            <PatternCard
              pattern={pattern}
              onClick={onPatternClick ? () => onPatternClick(pattern) : undefined}
            />
          </StaggerItem>
        ))}
      </StaggerContainer>
    </section>
  );
}

// ============================================================================
// COMPACT VARIANT
// ============================================================================

interface CompactPatternListProps {
  patterns: PatternHighlight[];
  onPatternClick?: (pattern: PatternHighlight) => void;
  className?: string;
}

/**
 * Compact pattern list for sidebar or mobile.
 */
export function CompactPatternList({
  patterns,
  onPatternClick,
  className,
}: CompactPatternListProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {patterns.slice(0, 3).map((pattern) => {
        const config = severityConfig[pattern.severity];

        return (
          <button
            key={pattern.id}
            onClick={() => onPatternClick?.(pattern)}
            className={cn(
              'w-full flex items-center gap-2 p-2 rounded-lg',
              'text-left transition-colors',
              'hover:bg-white/[0.02]'
            )}
          >
            <div className={cn('w-1.5 h-1.5 rounded-full', config.iconBg.replace('/10', ''))} />
            <span className="text-xs text-signal-white truncate flex-1">
              {pattern.title}
            </span>
            <span className="text-[10px] text-muted-gray shrink-0">
              {formatRelativeTime(pattern.timestamp)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default PatternHighlights;
