/**
 * PostActionMenu Component
 *
 * Phase 13.1: Menu that appears after save/create actions
 * to offer next steps and maintain workflow continuity.
 *
 * @example
 * <PostActionMenu
 *   isOpen={showPostAction}
 *   title="Audience saved"
 *   subtitle="Q1 Targets (127 HCPs)"
 *   actions={[
 *     { label: 'Run Simulation', description: 'Test campaign impact', onClick: handleSimulate, icon: <FlaskConical /> },
 *     { label: 'Generate Recommendations', description: 'Get next best actions', onClick: handleNBO, icon: <Zap /> },
 *   ]}
 *   onDismiss={() => setShowPostAction(false)}
 * />
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

export interface PostActionItem {
  label: string;
  description?: string;
  onClick: () => void;
  icon?: React.ReactNode;
}

export interface PostActionMenuProps {
  /** Whether the menu is visible */
  isOpen: boolean;
  /** Success message title */
  title: string;
  /** Optional subtitle (e.g., object name) */
  subtitle?: string;
  /** Available next actions */
  actions: PostActionItem[];
  /** Callback when dismissed */
  onDismiss?: () => void;
  /** Display variant */
  variant?: 'modal' | 'drawer' | 'inline';
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// ANIMATION VARIANTS
// ============================================================================

const backdropVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

const menuVariants = {
  modal: {
    initial: { opacity: 0, scale: 0.95, y: 10 },
    animate: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: { type: 'spring', stiffness: 400, damping: 30 },
    },
    exit: { opacity: 0, scale: 0.95, y: 10 },
  },
  drawer: {
    initial: { opacity: 0, x: '100%' },
    animate: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } },
    exit: { opacity: 0, x: '100%' },
  },
  inline: {
    initial: { opacity: 0, height: 0 },
    animate: { opacity: 1, height: 'auto' },
    exit: { opacity: 0, height: 0 },
  },
};

// ============================================================================
// COMPONENT
// ============================================================================

export function PostActionMenu({
  isOpen,
  title,
  subtitle,
  actions,
  onDismiss,
  variant = 'modal',
  className,
}: PostActionMenuProps) {
  const handleActionClick = (action: PostActionItem) => {
    action.onClick();
    onDismiss?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onDismiss?.();
    }
  };

  if (variant === 'inline') {
    return (
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className={cn('overflow-hidden', className)}
            variants={menuVariants.inline}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <div>
                    <CardTitle className="text-base">{title}</CardTitle>
                    {subtitle && (
                      <p className="text-sm text-muted-foreground">{subtitle}</p>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">What's next?</p>
                <div className="flex flex-wrap gap-2">
                  {actions.map((action) => (
                    <Button
                      key={action.label}
                      variant="outline"
                      size="sm"
                      onClick={() => handleActionClick(action)}
                      className="gap-2"
                    >
                      {action.icon}
                      {action.label}
                    </Button>
                  ))}
                  {onDismiss && (
                    <Button variant="ghost" size="sm" onClick={onDismiss}>
                      Dismiss
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  // Modal variant (default)
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            variants={backdropVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            onClick={onDismiss}
          />

          {/* Menu */}
          <motion.div
            className={cn(
              'fixed z-50',
              variant === 'drawer'
                ? 'right-0 top-0 h-full w-full max-w-md'
                : 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md',
              className
            )}
            variants={menuVariants[variant]}
            initial="initial"
            animate="animate"
            exit="exit"
            onKeyDown={handleKeyDown}
            role="dialog"
            aria-modal="true"
            aria-labelledby="post-action-title"
          >
            <Card className="shadow-xl">
              <CardHeader className="relative">
                {/* Success icon and title */}
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="flex-1">
                    <CardTitle id="post-action-title" className="text-lg">
                      {title}
                    </CardTitle>
                    {subtitle && (
                      <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
                    )}
                  </div>
                  {onDismiss && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 absolute top-4 right-4"
                      onClick={onDismiss}
                      aria-label="Dismiss"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground mb-4">What's next?</p>

                {/* Action list */}
                <div className="space-y-2">
                  {actions.map((action) => (
                    <button
                      key={action.label}
                      onClick={() => handleActionClick(action)}
                      className={cn(
                        'w-full flex items-center gap-3 p-3 rounded-lg',
                        'border border-border hover:border-primary/50',
                        'hover:bg-primary/5 transition-colors',
                        'text-left group'
                      )}
                    >
                      {action.icon && (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary">
                          {action.icon}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground">{action.label}</p>
                        {action.description && (
                          <p className="text-sm text-muted-foreground truncate">
                            {action.description}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary shrink-0" />
                    </button>
                  ))}
                </div>

                {/* Dismiss option */}
                {onDismiss && (
                  <Button
                    variant="ghost"
                    className="w-full mt-4 text-muted-foreground"
                    onClick={onDismiss}
                  >
                    Continue editing
                  </Button>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default PostActionMenu;
