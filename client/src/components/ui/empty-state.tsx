/**
 * EmptyState Component
 *
 * Brand-aligned empty state displays with convergence animation
 * and clear calls-to-action. Every empty state is a brand moment.
 *
 * @see ROADMAP-PHASE9-INTERACTION-EXPERIENCE.md M9D.2
 */

import React from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Users,
  FlaskConical,
  Activity,
  Inbox,
  FileQuestion,
  Database,
  Zap,
  Filter,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ConvergenceAnimation } from './convergence-animation';

// ============================================================================
// TYPES
// ============================================================================

interface EmptyStateProps {
  /** Main title */
  title: string;
  /** Description text */
  description?: string;
  /** Icon name or custom icon element */
  icon?: string | React.ReactNode;
  /** Primary action button */
  action?: {
    label: string;
    onClick: () => void;
  };
  /** Secondary action */
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  /** Visual variant */
  variant?: 'default' | 'search' | 'error' | 'minimal';
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Additional CSS classes */
  className?: string;
  /** Whether to show convergence animation */
  showAnimation?: boolean;
}

// ============================================================================
// ICON MAPPING
// ============================================================================

const iconMap: Record<string, React.ReactNode> = {
  search: <Search className="w-6 h-6" />,
  users: <Users className="w-6 h-6" />,
  flask: <FlaskConical className="w-6 h-6" />,
  activity: <Activity className="w-6 h-6" />,
  inbox: <Inbox className="w-6 h-6" />,
  question: <FileQuestion className="w-6 h-6" />,
  database: <Database className="w-6 h-6" />,
  zap: <Zap className="w-6 h-6" />,
  filter: <Filter className="w-6 h-6" />,
  alert: <AlertCircle className="w-6 h-6" />,
};

const sizeConfig = {
  sm: {
    container: 'py-8',
    iconWrapper: 'mb-3',
    title: 'text-base',
    description: 'text-xs',
    maxWidth: 'max-w-xs',
  },
  md: {
    container: 'py-12',
    iconWrapper: 'mb-4',
    title: 'text-lg',
    description: 'text-sm',
    maxWidth: 'max-w-sm',
  },
  lg: {
    container: 'py-16',
    iconWrapper: 'mb-6',
    title: 'text-xl',
    description: 'text-base',
    maxWidth: 'max-w-md',
  },
};

const variantConfig = {
  default: {
    iconBg: 'bg-muted',
    iconColor: 'text-muted-foreground',
  },
  search: {
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
  },
  error: {
    iconBg: 'bg-destructive/10',
    iconColor: 'text-destructive',
  },
  minimal: {
    iconBg: 'bg-transparent',
    iconColor: 'text-muted-foreground',
  },
};

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * EmptyState component for displaying when there's no data.
 *
 * @example
 * // Basic usage
 * <EmptyState
 *   title="No signals yet."
 *   description="Connect your data sources and let OmniVor feed."
 *   icon="database"
 *   action={{ label: "Connect Channels", onClick: () => {} }}
 * />
 *
 * @example
 * // Search results
 * <EmptyState
 *   title="No signals match."
 *   description="Try adjusting your filters or search terms."
 *   variant="search"
 *   icon="search"
 * />
 */
export function EmptyState({
  title,
  description,
  icon = 'inbox',
  action,
  secondaryAction,
  variant = 'default',
  size = 'md',
  className,
  showAnimation = true,
}: EmptyStateProps) {
  const sizeStyles = sizeConfig[size];
  const variantStyles = variantConfig[variant];
  const IconElement = typeof icon === 'string' ? iconMap[icon] || iconMap.inbox : icon;

  return (
    <motion.div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        sizeStyles.container,
        className
      )}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Icon with optional convergence animation */}
      <div className={cn('relative', sizeStyles.iconWrapper)}>
        {showAnimation && variant !== 'minimal' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <ConvergenceAnimation size="sm" showCenterGlow={false} />
          </div>
        )}
        <div
          className={cn(
            'relative z-10 flex items-center justify-center w-16 h-16 rounded-2xl',
            variantStyles.iconBg
          )}
        >
          <div className={variantStyles.iconColor}>{IconElement}</div>
        </div>
      </div>

      {/* Title */}
      <h3
        className={cn(
          'font-semibold text-foreground mb-2',
          sizeStyles.title
        )}
      >
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p
          className={cn(
            'text-muted-foreground mb-6',
            sizeStyles.description,
            sizeStyles.maxWidth
          )}
        >
          {description}
        </p>
      )}

      {/* Actions */}
      {(action || secondaryAction) && (
        <div className="flex items-center gap-3">
          {action && (
            <Button onClick={action.onClick} variant="default">
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button onClick={secondaryAction.onClick} variant="ghost">
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </motion.div>
  );
}

// ============================================================================
// PRESET EMPTY STATES
// ============================================================================

/**
 * Preset empty state copy for different modules.
 * Use brand voice consistently.
 */
export const EMPTY_STATE_COPY = {
  // Phase 13.5: Updated module names and forward actions
  hcpExplorer: {
    title: 'No HCPs found.',
    description: 'Connect your data sources or adjust your search criteria.',
    icon: 'users',
    actionLabel: 'Clear Filters',
  },
  hcpExplorerSearch: {
    title: 'No HCPs match.',
    description: 'Try adjusting your filters or search terms.',
    icon: 'search',
  },
  audienceBuilder: {
    title: 'No saved audiences yet.',
    description: 'Create your first audience using natural language or filters.',
    icon: 'users',
    actionLabel: 'Go to HCP Explorer',
    secondaryLabel: 'Learn More',
  },
  simulationStudio: {
    title: 'No simulations run yet.',
    description: 'Build your first scenario to predict outcomes and optimize engagement.',
    icon: 'flask',
    actionLabel: 'Create Simulation',
  },
  actionQueue: {
    title: 'Select an audience to begin.',
    description: 'Choose an audience to view personalized action recommendations.',
    icon: 'zap',
    actionLabel: 'Create Audience',
  },
  actionQueueEmpty: {
    title: 'All actions completed!',
    description: 'Great work! All recommended actions have been processed.',
    icon: 'zap',
    actionLabel: 'View Dashboard',
  },
  dashboard: {
    title: 'No data yet.',
    description: 'Start exploring HCPs to populate your dashboard.',
    icon: 'activity',
    actionLabel: 'Go to HCP Explorer',
  },
  comparison: {
    title: 'Select audiences to compare.',
    description: 'Choose two audiences to see side-by-side analysis.',
    icon: 'users',
    actionLabel: 'Go to Audience Builder',
  },
  agentRuns: {
    title: 'No agent runs.',
    description: 'Autonomous agents will log their activity here.',
    icon: 'activity',
  },
  filteredResults: {
    title: 'No results match filters.',
    description: 'Try adjusting or clearing some filters.',
    icon: 'filter',
  },
} as const;

// ============================================================================
// PRESET COMPONENTS
// ============================================================================

interface PresetEmptyStateProps {
  onAction?: () => void;
  className?: string;
}

/**
 * HCP Explorer empty state
 */
export function HcpExplorerEmptyState({ onAction, className }: PresetEmptyStateProps) {
  return (
    <EmptyState
      title={EMPTY_STATE_COPY.hcpExplorer.title}
      description={EMPTY_STATE_COPY.hcpExplorer.description}
      icon={EMPTY_STATE_COPY.hcpExplorer.icon}
      action={onAction ? { label: EMPTY_STATE_COPY.hcpExplorer.actionLabel!, onClick: onAction } : undefined}
      className={className}
    />
  );
}

/**
 * Search results empty state
 */
export function SearchEmptyState({ className }: { className?: string }) {
  return (
    <EmptyState
      title={EMPTY_STATE_COPY.hcpExplorerSearch.title}
      description={EMPTY_STATE_COPY.hcpExplorerSearch.description}
      icon={EMPTY_STATE_COPY.hcpExplorerSearch.icon}
      variant="search"
      showAnimation={false}
      className={className}
    />
  );
}

/**
 * Audience Builder empty state
 */
export function AudienceBuilderEmptyState({ onAction, className }: PresetEmptyStateProps) {
  return (
    <EmptyState
      title={EMPTY_STATE_COPY.audienceBuilder.title}
      description={EMPTY_STATE_COPY.audienceBuilder.description}
      icon={EMPTY_STATE_COPY.audienceBuilder.icon}
      action={onAction ? { label: EMPTY_STATE_COPY.audienceBuilder.actionLabel!, onClick: onAction } : undefined}
      className={className}
    />
  );
}

/**
 * Simulation Studio empty state
 */
export function SimulationStudioEmptyState({ onAction, className }: PresetEmptyStateProps) {
  return (
    <EmptyState
      title={EMPTY_STATE_COPY.simulationStudio.title}
      description={EMPTY_STATE_COPY.simulationStudio.description}
      icon={EMPTY_STATE_COPY.simulationStudio.icon}
      action={onAction ? { label: EMPTY_STATE_COPY.simulationStudio.actionLabel!, onClick: onAction } : undefined}
      className={className}
    />
  );
}

/**
 * Filtered results empty state
 */
export function FilteredEmptyState({
  onClearFilters,
  className,
}: {
  onClearFilters?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      title={EMPTY_STATE_COPY.filteredResults.title}
      description={EMPTY_STATE_COPY.filteredResults.description}
      icon={EMPTY_STATE_COPY.filteredResults.icon}
      variant="search"
      showAnimation={false}
      action={onClearFilters ? { label: 'Clear Filters', onClick: onClearFilters } : undefined}
      className={className}
    />
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default EmptyState;
