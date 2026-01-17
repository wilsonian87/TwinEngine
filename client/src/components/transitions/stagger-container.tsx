/**
 * StaggerContainer Components
 *
 * Components for animating lists and grids with staggered
 * entrance effects. Creates the "progressive reveal" feeling.
 *
 * @see ROADMAP-PHASE9-INTERACTION-EXPERIENCE.md M9B.4
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  staggerContainer,
  staggerChild,
  staggerCardChild,
  fastStaggerContainer,
  createStaggerContainer,
  MOTION_DURATION,
  MOTION_EASING,
} from '@/lib/motion-config';
import { useReducedMotion } from '@/lib/chart-animations';

// ============================================================================
// TYPES
// ============================================================================

export interface StaggerContainerProps {
  /** Container children (should be StaggerItems) */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Stagger timing preset */
  timing?: 'default' | 'fast' | 'slow';
  /** Custom stagger delay between items (overrides timing) */
  staggerDelay?: number;
  /** Delay before animation starts */
  initialDelay?: number;
  /** Whether to animate */
  animate?: boolean;
  /** HTML element to render as */
  as?: 'div' | 'ul' | 'ol' | 'section' | 'article';
}

export interface StaggerItemProps {
  /** Item content */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Custom animation variant */
  variant?: 'default' | 'card' | 'fade' | 'scale';
  /** HTML element to render as */
  as?: 'div' | 'li' | 'article';
}

export interface StaggerGridProps {
  /** Grid children */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Number of columns */
  columns?: 1 | 2 | 3 | 4 | 5 | 6;
  /** Gap between items */
  gap?: 'sm' | 'md' | 'lg';
  /** Whether to animate */
  animate?: boolean;
}

export interface StaggerListProps {
  /** List items */
  items: React.ReactNode[];
  /** Key extractor */
  keyExtractor: (item: React.ReactNode, index: number) => string;
  /** Additional CSS classes */
  className?: string;
  /** Gap between items */
  gap?: 'sm' | 'md' | 'lg';
  /** Whether to show dividers */
  dividers?: boolean;
  /** Empty state component */
  emptyState?: React.ReactNode;
}

// ============================================================================
// TIMING PRESETS
// ============================================================================

const timingPresets = {
  default: { stagger: 0.05, initial: 0.1 },
  fast: { stagger: 0.02, initial: 0.05 },
  slow: { stagger: 0.08, initial: 0.15 },
};

// ============================================================================
// ITEM VARIANTS
// ============================================================================

const itemVariants = {
  default: staggerChild,
  card: staggerCardChild,
  fade: {
    initial: { opacity: 0 },
    enter: {
      opacity: 1,
      transition: {
        duration: MOTION_DURATION.ui,
        ease: MOTION_EASING.out,
      },
    },
    exit: { opacity: 0 },
  },
  scale: {
    initial: { opacity: 0, scale: 0.9 },
    enter: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: MOTION_DURATION.ui,
        ease: MOTION_EASING.out,
      },
    },
    exit: { opacity: 0, scale: 0.95 },
  },
};

// ============================================================================
// STAGGER CONTAINER
// ============================================================================

/**
 * Container for staggered animations.
 * Wrap StaggerItems to create sequential reveal effects.
 *
 * @example
 * <StaggerContainer timing="default">
 *   {items.map(item => (
 *     <StaggerItem key={item.id}>
 *       <Card>{item.content}</Card>
 *     </StaggerItem>
 *   ))}
 * </StaggerContainer>
 */
export const StaggerContainer: React.FC<StaggerContainerProps> = ({
  children,
  className,
  timing = 'default',
  staggerDelay,
  initialDelay,
  animate = true,
  as: Component = 'div',
}) => {
  const prefersReducedMotion = useReducedMotion();
  const MotionComponent = motion[Component];

  if (prefersReducedMotion || !animate) {
    return <Component className={className}>{children}</Component>;
  }

  const preset = timingPresets[timing];
  const variants = staggerDelay !== undefined || initialDelay !== undefined
    ? createStaggerContainer(
        staggerDelay ?? preset.stagger,
        initialDelay ?? preset.initial
      )
    : timing === 'fast'
    ? fastStaggerContainer
    : staggerContainer;

  return (
    <MotionComponent
      variants={variants}
      initial="initial"
      animate="enter"
      exit="exit"
      className={className}
    >
      {children}
    </MotionComponent>
  );
};

// ============================================================================
// STAGGER ITEM
// ============================================================================

/**
 * Individual item within a StaggerContainer.
 *
 * @example
 * <StaggerItem variant="card">
 *   <ProductCard product={product} />
 * </StaggerItem>
 */
export const StaggerItem: React.FC<StaggerItemProps> = ({
  children,
  className,
  variant = 'default',
  as: Component = 'div',
}) => {
  const prefersReducedMotion = useReducedMotion();
  const MotionComponent = motion[Component];

  if (prefersReducedMotion) {
    return <Component className={className}>{children}</Component>;
  }

  return (
    <MotionComponent
      variants={itemVariants[variant]}
      className={className}
    >
      {children}
    </MotionComponent>
  );
};

// ============================================================================
// STAGGER GRID
// ============================================================================

const gridColumnClasses = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  5: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5',
  6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
};

const gapClasses = {
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
};

/**
 * Pre-configured grid with stagger animation.
 *
 * @example
 * <StaggerGrid columns={3} gap="md">
 *   {cards.map(card => (
 *     <Card key={card.id}>{card.content}</Card>
 *   ))}
 * </StaggerGrid>
 */
export const StaggerGrid: React.FC<StaggerGridProps> = ({
  children,
  className,
  columns = 3,
  gap = 'md',
  animate = true,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const childArray = React.Children.toArray(children);

  if (prefersReducedMotion || !animate) {
    return (
      <div className={cn('grid', gridColumnClasses[columns], gapClasses[gap], className)}>
        {children}
      </div>
    );
  }

  return (
    <StaggerContainer
      className={cn('grid', gridColumnClasses[columns], gapClasses[gap], className)}
      timing="default"
    >
      {childArray.map((child, index) => (
        <StaggerItem key={index} variant="card">
          {child}
        </StaggerItem>
      ))}
    </StaggerContainer>
  );
};

// ============================================================================
// STAGGER LIST
// ============================================================================

/**
 * Animated list with stagger effect.
 *
 * @example
 * <StaggerList
 *   items={notifications}
 *   keyExtractor={(_, i) => `notification-${i}`}
 *   dividers
 *   emptyState={<EmptyNotifications />}
 * />
 */
export const StaggerList: React.FC<StaggerListProps> = ({
  items,
  keyExtractor,
  className,
  gap = 'sm',
  dividers = false,
  emptyState,
}) => {
  const prefersReducedMotion = useReducedMotion();

  if (items.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  const gapClass = {
    sm: dividers ? 'divide-y divide-border-gray' : 'space-y-2',
    md: dividers ? 'divide-y divide-border-gray' : 'space-y-4',
    lg: dividers ? 'divide-y divide-border-gray' : 'space-y-6',
  };

  if (prefersReducedMotion) {
    return (
      <ul className={cn(gapClass[gap], className)}>
        {items.map((item, index) => (
          <li key={keyExtractor(item, index)}>{item}</li>
        ))}
      </ul>
    );
  }

  return (
    <StaggerContainer as="ul" className={cn(gapClass[gap], className)} timing="fast">
      <AnimatePresence>
        {items.map((item, index) => (
          <StaggerItem key={keyExtractor(item, index)} as="li" variant="default">
            {item}
          </StaggerItem>
        ))}
      </AnimatePresence>
    </StaggerContainer>
  );
};

// ============================================================================
// ANIMATED LIST (with add/remove animations)
// ============================================================================

export interface AnimatedListProps<T> {
  /** List items */
  items: T[];
  /** Render function for each item */
  renderItem: (item: T, index: number) => React.ReactNode;
  /** Key extractor */
  keyExtractor: (item: T) => string;
  /** Additional CSS classes */
  className?: string;
  /** Gap between items */
  gap?: 'sm' | 'md' | 'lg';
}

/**
 * List that animates items when they're added or removed.
 * Uses AnimatePresence for enter/exit animations.
 */
export function AnimatedList<T>({
  items,
  renderItem,
  keyExtractor,
  className,
  gap = 'md',
}: AnimatedListProps<T>): React.ReactElement {
  const prefersReducedMotion = useReducedMotion();
  const gapClass = { sm: 'space-y-2', md: 'space-y-4', lg: 'space-y-6' };

  if (prefersReducedMotion) {
    return (
      <div className={cn(gapClass[gap], className)}>
        {items.map((item, index) => (
          <div key={keyExtractor(item)}>{renderItem(item, index)}</div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn(gapClass[gap], className)}>
      <AnimatePresence mode="popLayout">
        {items.map((item, index) => (
          <motion.div
            key={keyExtractor(item)}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{
              duration: MOTION_DURATION.ui,
              ease: MOTION_EASING.out,
            }}
            layout
          >
            {renderItem(item, index)}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default StaggerContainer;
