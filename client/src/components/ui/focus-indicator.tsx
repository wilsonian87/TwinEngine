/**
 * Focus Indicator Component
 *
 * Visual indicator for keyboard navigation focus state.
 * Wraps items to show focus ring when keyboard-selected.
 *
 * @see ROADMAP-PHASE9-INTERACTION-EXPERIENCE.md M9G.1
 */

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

interface FocusIndicatorProps {
  /** Whether the item is currently focused */
  isFocused: boolean;
  /** Children to wrap */
  children: React.ReactNode;
  /** Additional className */
  className?: string;
  /** Focus ring color variant */
  variant?: 'default' | 'purple' | 'gold';
  /** Whether to show focus animation */
  animate?: boolean;
  /** Callback when item is clicked */
  onClick?: () => void;
  /** Whether the item is interactive */
  interactive?: boolean;
}

// ============================================================================
// CONFIG
// ============================================================================

const focusVariants = {
  default: {
    ring: 'ring-2 ring-signal-white/50 ring-offset-2 ring-offset-void-black',
    border: 'border-signal-white/50',
    glow: 'shadow-[0_0_8px_rgba(255,255,255,0.1)]',
  },
  purple: {
    ring: 'ring-2 ring-consumption-purple ring-offset-2 ring-offset-void-black',
    border: 'border-consumption-purple',
    glow: 'shadow-[0_0_12px_rgba(107,33,168,0.3)]',
  },
  gold: {
    ring: 'ring-2 ring-catalyst-gold ring-offset-2 ring-offset-void-black',
    border: 'border-catalyst-gold',
    glow: 'shadow-[0_0_12px_rgba(217,119,6,0.3)]',
  },
};

// ============================================================================
// FOCUS INDICATOR
// ============================================================================

export function FocusIndicator({
  isFocused,
  children,
  className,
  variant = 'purple',
  animate = true,
  onClick,
  interactive = true,
}: FocusIndicatorProps) {
  const variantStyles = focusVariants[variant];

  const baseClasses = cn(
    'relative transition-all duration-200',
    interactive && 'cursor-pointer',
    isFocused && [variantStyles.ring, variantStyles.glow],
    className
  );

  if (animate && isFocused) {
    return (
      <motion.div
        className={baseClasses}
        initial={{ scale: 1 }}
        animate={{ scale: 1.01 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        onClick={onClick}
        role={interactive ? 'button' : undefined}
        tabIndex={interactive ? 0 : undefined}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div
      className={baseClasses}
      onClick={onClick}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
    >
      {children}
    </div>
  );
}

// ============================================================================
// FOCUS OUTLINE
// ============================================================================

interface FocusOutlineProps {
  /** Whether to show the outline */
  show: boolean;
  /** Color variant */
  variant?: 'default' | 'purple' | 'gold';
  /** Border radius */
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

/**
 * Absolute positioned focus outline for custom focus styling.
 */
export function FocusOutline({
  show,
  variant = 'purple',
  rounded = 'lg',
}: FocusOutlineProps) {
  if (!show) return null;

  const roundedClasses = {
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    full: 'rounded-full',
  };

  const variantClasses = {
    default: 'border-signal-white/50',
    purple: 'border-consumption-purple',
    gold: 'border-catalyst-gold',
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.15 }}
      className={cn(
        'absolute inset-0 pointer-events-none border-2',
        roundedClasses[rounded],
        variantClasses[variant]
      )}
    />
  );
}

// ============================================================================
// KEYBOARD NAV LIST ITEM
// ============================================================================

interface KeyboardNavItemProps {
  /** Unique item ID */
  id: string;
  /** Currently focused item ID */
  focusedId: string | undefined;
  /** Children to render */
  children: React.ReactNode;
  /** Callback when item is selected */
  onSelect?: () => void;
  /** Additional className */
  className?: string;
  /** Focus variant */
  variant?: 'default' | 'purple' | 'gold';
}

/**
 * List item wrapper with keyboard navigation support.
 * Highlights when it matches the focusedId.
 */
export function KeyboardNavItem({
  id,
  focusedId,
  children,
  onSelect,
  className,
  variant = 'purple',
}: KeyboardNavItemProps) {
  const isFocused = id === focusedId;
  const itemRef = React.useRef<HTMLDivElement>(null);

  // Scroll into view when focused
  React.useEffect(() => {
    if (isFocused && itemRef.current) {
      itemRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [isFocused]);

  return (
    <FocusIndicator
      isFocused={isFocused}
      variant={variant}
      onClick={onSelect}
      className={cn('rounded-lg', className)}
    >
      <div ref={itemRef}>{children}</div>
    </FocusIndicator>
  );
}

// ============================================================================
// KEYBOARD NAV HINT
// ============================================================================

interface KeyboardNavHintProps {
  /** Whether to show the hint */
  show?: boolean;
  /** Custom hint text */
  hint?: string;
  /** Position */
  position?: 'top' | 'bottom';
}

/**
 * Visual hint showing keyboard navigation is available.
 */
export function KeyboardNavHint({
  show = true,
  hint = 'Use J/K or ↑/↓ to navigate, Enter to select',
  position = 'bottom',
}: KeyboardNavHintProps) {
  if (!show) return null;

  return (
    <div
      className={cn(
        'flex items-center justify-center gap-2 py-2 text-xs text-muted-gray',
        position === 'top' && 'border-b border-border-gray mb-2',
        position === 'bottom' && 'border-t border-border-gray mt-2'
      )}
    >
      <span className="inline-flex items-center gap-1">
        <kbd className="px-1.5 py-0.5 rounded bg-border-gray/50 text-[10px] font-mono">J</kbd>
        <kbd className="px-1.5 py-0.5 rounded bg-border-gray/50 text-[10px] font-mono">K</kbd>
      </span>
      <span>{hint}</span>
      <span className="inline-flex items-center gap-1">
        <kbd className="px-1.5 py-0.5 rounded bg-border-gray/50 text-[10px] font-mono">?</kbd>
        <span>for shortcuts</span>
      </span>
    </div>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default FocusIndicator;
