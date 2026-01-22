/**
 * ContextualActionBar Component
 *
 * Phase 13.1: Sticky bottom bar that appears when user has selections.
 * Shows selection count and action buttons.
 *
 * @example
 * <ContextualActionBar
 *   selectionCount={5}
 *   selectionLabel="HCPs"
 *   actions={[
 *     { label: 'Create Audience', onClick: handleCreateAudience, variant: 'primary' },
 *     { label: 'Export', onClick: handleExport, variant: 'secondary' },
 *   ]}
 *   onClear={clearSelection}
 * />
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

export interface ActionItem {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  icon?: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
}

export interface ContextualActionBarProps {
  /** Number of selected items */
  selectionCount: number;
  /** Label for the selection (e.g., "HCPs", "Audiences") */
  selectionLabel: string;
  /** Action buttons to display */
  actions: ActionItem[];
  /** Callback when clear button is clicked */
  onClear: () => void;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// ANIMATION VARIANTS
// ============================================================================

const barVariants = {
  initial: {
    opacity: 0,
    y: 20,
    scale: 0.95,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 30,
    },
  },
  exit: {
    opacity: 0,
    y: 20,
    scale: 0.95,
    transition: {
      duration: 0.2,
      ease: 'easeOut',
    },
  },
};

// ============================================================================
// COMPONENT
// ============================================================================

export function ContextualActionBar({
  selectionCount,
  selectionLabel,
  actions,
  onClear,
  className,
}: ContextualActionBarProps) {
  const isVisible = selectionCount > 0;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className={cn(
            'fixed bottom-6 left-1/2 -translate-x-1/2 z-50',
            'flex items-center gap-3 px-4 py-3',
            'bg-card border border-border rounded-full shadow-lg',
            'backdrop-blur-sm',
            className
          )}
          variants={barVariants}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          {/* Selection count */}
          <div className="flex items-center gap-2 pr-3 border-r border-border">
            <span className="text-sm font-medium text-foreground">
              {selectionCount} {selectionLabel} selected
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
              onClick={onClear}
              aria-label={`Clear ${selectionLabel} selection`}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {actions.map((action, index) => (
              <Button
                key={action.label}
                variant={
                  action.variant === 'primary'
                    ? 'default'
                    : action.variant === 'ghost'
                      ? 'ghost'
                      : 'secondary'
                }
                size="sm"
                onClick={action.onClick}
                disabled={action.loading || action.disabled}
                className={cn(
                  'min-w-[100px]',
                  action.variant === 'primary' && 'bg-primary hover:bg-primary/90'
                )}
              >
                {action.loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : action.icon ? (
                  <span className="mr-2">{action.icon}</span>
                ) : null}
                {action.label}
              </Button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default ContextualActionBar;
