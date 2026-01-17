/**
 * QuickActions Component
 *
 * Fast access to common workflows from Nerve Center.
 * Action buttons styled as ghost/secondary.
 *
 * @see ROADMAP-PHASE9-INTERACTION-EXPERIENCE.md M9E.4
 */

import React from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  FlaskConical,
  Download,
  Stethoscope,
  Users,
  Bot,
  LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

// ============================================================================
// TYPES
// ============================================================================

interface QuickAction {
  id: string;
  label: string;
  description?: string;
  icon: LucideIcon;
  onClick: () => void;
  variant?: 'default' | 'primary';
}

interface QuickActionsProps {
  /** Custom actions to display */
  actions?: QuickAction[];
  /** Navigation handler */
  onNavigate?: (path: string) => void;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// DEFAULT ACTIONS
// ============================================================================

const getDefaultActions = (onNavigate?: (path: string) => void): QuickAction[] => [
  {
    id: 'new-audience',
    label: 'New Audience',
    icon: Plus,
    onClick: () => onNavigate?.('/audience-builder'),
    variant: 'primary',
  },
  {
    id: 'run-scenario',
    label: 'Run Scenario',
    icon: FlaskConical,
    onClick: () => onNavigate?.('/simulations'),
  },
  {
    id: 'export-report',
    label: 'Export Report',
    icon: Download,
    onClick: () => {
      // TODO: Implement export modal
    },
  },
  {
    id: 'signal-diagnostic',
    label: 'Diagnostic',
    icon: Stethoscope,
    onClick: () => onNavigate?.('/feature-store'),
  },
];

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * Quick Actions panel for Nerve Center.
 *
 * @example
 * <QuickActions onNavigate={(path) => navigate(path)} />
 *
 * @example
 * // With custom actions
 * <QuickActions
 *   actions={[
 *     { id: 'custom', label: 'Custom', icon: Star, onClick: () => {} },
 *   ]}
 * />
 */
export function QuickActions({ actions, onNavigate, className }: QuickActionsProps) {
  const displayActions = actions || getDefaultActions(onNavigate);

  return (
    <motion.section
      className={className}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
    >
      <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-gray mb-3">
        Quick Actions
      </h2>
      <div className="flex flex-wrap gap-2">
        {displayActions.map((action) => (
          <QuickActionButton key={action.id} action={action} />
        ))}
      </div>
    </motion.section>
  );
}

// ============================================================================
// ACTION BUTTON
// ============================================================================

interface QuickActionButtonProps {
  action: QuickAction;
}

function QuickActionButton({ action }: QuickActionButtonProps) {
  const Icon = action.icon;

  return (
    <Button
      variant={action.variant === 'primary' ? 'default' : 'outline'}
      size="sm"
      onClick={action.onClick}
      className={cn(
        'gap-2',
        action.variant !== 'primary' && 'border-border-gray hover:bg-white/[0.03] hover:border-consumption-purple/30'
      )}
    >
      <Icon className="w-4 h-4" />
      {action.label}
    </Button>
  );
}

// ============================================================================
// EXPANDED VARIANT
// ============================================================================

interface ExpandedQuickActionsProps {
  onNavigate?: (path: string) => void;
  className?: string;
}

/**
 * Expanded quick actions with descriptions for empty states.
 */
export function ExpandedQuickActions({ onNavigate, className }: ExpandedQuickActionsProps) {
  const actions: (QuickAction & { description: string })[] = [
    {
      id: 'new-audience',
      label: 'Create Audience',
      description: 'Build a new cohort using natural language queries',
      icon: Users,
      onClick: () => onNavigate?.('/audience-builder'),
      variant: 'primary',
    },
    {
      id: 'run-scenario',
      label: 'Run Scenario',
      description: 'Simulate campaign outcomes and predict lift',
      icon: FlaskConical,
      onClick: () => onNavigate?.('/simulations'),
    },
    {
      id: 'view-agents',
      label: 'View Agents',
      description: 'Monitor autonomous agent activity',
      icon: Bot,
      onClick: () => onNavigate?.('/agents'),
    },
    {
      id: 'signal-diagnostic',
      label: 'Signal Diagnostic',
      description: 'Analyze channel health and signal quality',
      icon: Stethoscope,
      onClick: () => onNavigate?.('/feature-store'),
    },
  ];

  return (
    <div className={cn('grid gap-3 sm:grid-cols-2 lg:grid-cols-4', className)}>
      {actions.map((action, index) => {
        const Icon = action.icon;

        return (
          <motion.button
            key={action.id}
            onClick={action.onClick}
            className={cn(
              'flex flex-col items-start p-4 rounded-xl border text-left transition-all',
              action.variant === 'primary'
                ? 'border-consumption-purple/30 bg-consumption-purple/5 hover:bg-consumption-purple/10'
                : 'border-border-gray bg-void-black hover:border-border-gray/80 hover:bg-white/[0.02]'
            )}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.4,
              delay: 0.1 + index * 0.05,
              ease: [0.16, 1, 0.3, 1],
            }}
            whileHover={{ y: -2 }}
          >
            <div
              className={cn(
                'flex items-center justify-center w-10 h-10 rounded-lg mb-3',
                action.variant === 'primary'
                  ? 'bg-consumption-purple/20 text-consumption-purple'
                  : 'bg-border-gray/50 text-muted-gray'
              )}
            >
              <Icon className="w-5 h-5" />
            </div>
            <span className="text-sm font-semibold text-signal-white mb-1">
              {action.label}
            </span>
            <span className="text-xs text-data-gray">{action.description}</span>
          </motion.button>
        );
      })}
    </div>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default QuickActions;
