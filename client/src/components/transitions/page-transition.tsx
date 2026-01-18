/**
 * PageTransition Component
 *
 * Wraps page content with smooth enter/exit animations.
 * Used with AnimatePresence for route transitions.
 *
 * @see ROADMAP-PHASE9-INTERACTION-EXPERIENCE.md M9B.2
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  pageVariants,
  fadePageVariants,
  MOTION_DURATION,
  MOTION_EASING,
} from '@/lib/motion-config';
import { useReducedMotion } from '@/lib/chart-animations';

// ============================================================================
// TYPES
// ============================================================================

export interface PageTransitionProps {
  /** Page content */
  children: React.ReactNode;
  /** Unique key for AnimatePresence (usually route path) */
  pageKey?: string;
  /** Transition variant */
  variant?: 'default' | 'fade' | 'slide-up' | 'slide-left';
  /** Additional CSS classes */
  className?: string;
  /** Whether to animate on initial mount */
  initial?: boolean;
  /** Callback when enter animation completes */
  onAnimationComplete?: () => void;
}

// ============================================================================
// VARIANTS
// ============================================================================

const slideUpVariants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  enter: {
    opacity: 1,
    y: 0,
    transition: {
      duration: MOTION_DURATION.page,
      ease: MOTION_EASING.out,
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: {
      duration: MOTION_DURATION.ui,
      ease: MOTION_EASING.inOut,
    },
  },
};

const slideLeftVariants = {
  initial: {
    opacity: 0,
    x: 20,
  },
  enter: {
    opacity: 1,
    x: 0,
    transition: {
      duration: MOTION_DURATION.page,
      ease: MOTION_EASING.out,
    },
  },
  exit: {
    opacity: 0,
    x: -20,
    transition: {
      duration: MOTION_DURATION.ui,
      ease: MOTION_EASING.inOut,
    },
  },
};

const reducedMotionVariants = {
  initial: { opacity: 1 },
  enter: { opacity: 1 },
  exit: { opacity: 1 },
};

const variantMap = {
  default: pageVariants,
  fade: fadePageVariants,
  'slide-up': slideUpVariants,
  'slide-left': slideLeftVariants,
};

// ============================================================================
// COMPONENT
// ============================================================================

export const PageTransition: React.FC<PageTransitionProps> = ({
  children,
  pageKey,
  variant = 'default',
  className,
  initial = true,
  onAnimationComplete,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const variants = prefersReducedMotion ? reducedMotionVariants : variantMap[variant];

  return (
    <motion.div
      key={pageKey}
      initial={initial ? 'initial' : false}
      animate="enter"
      exit="exit"
      variants={variants}
      className={cn('w-full h-full', className)}
      onAnimationComplete={(definition) => {
        if (definition === 'enter') {
          onAnimationComplete?.();
        }
      }}
    >
      {children}
    </motion.div>
  );
};

// ============================================================================
// ROUTE TRANSITION WRAPPER
// ============================================================================

export interface RouteTransitionProps {
  /** Current location/route key */
  locationKey: string;
  /** Page content */
  children: React.ReactNode;
  /** Transition mode */
  mode?: 'wait' | 'sync' | 'popLayout';
  /** Transition variant */
  variant?: PageTransitionProps['variant'];
  /** Additional CSS classes */
  className?: string;
}

/**
 * Wrapper component that handles AnimatePresence for route changes.
 * Use this at the router level to enable page transitions.
 */
export const RouteTransition: React.FC<RouteTransitionProps> = ({
  locationKey,
  children,
  mode = 'wait',
  variant = 'default',
  className,
}) => {
  return (
    <AnimatePresence mode={mode}>
      <PageTransition
        key={locationKey}
        pageKey={locationKey}
        variant={variant}
        className={className}
      >
        {children}
      </PageTransition>
    </AnimatePresence>
  );
};

// ============================================================================
// SECTION TRANSITION
// ============================================================================

export interface SectionTransitionProps {
  /** Section content */
  children: React.ReactNode;
  /** Whether the section is visible */
  show?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Delay before animation starts */
  delay?: number;
}

/**
 * For animating sections within a page (e.g., conditional content).
 */
export const SectionTransition: React.FC<SectionTransitionProps> = ({
  children,
  show = true,
  className,
  delay = 0,
}) => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <AnimatePresence mode="wait">
      {show && (
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{
            duration: MOTION_DURATION.ui,
            delay,
            ease: MOTION_EASING.out,
          }}
          className={className}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ============================================================================
// LOADING TRANSITION
// ============================================================================

export interface LoadingTransitionProps {
  /** Content to show when loaded */
  children: React.ReactNode;
  /** Whether content is loading */
  isLoading: boolean;
  /** Loading placeholder (skeleton) */
  fallback?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Smooth transition between loading and loaded states.
 */
export const LoadingTransition: React.FC<LoadingTransitionProps> = ({
  children,
  isLoading,
  fallback,
  className,
}) => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className={className}>
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loading"
            initial={prefersReducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: MOTION_DURATION.micro }}
          >
            {fallback}
          </motion.div>
        ) : (
          <motion.div
            key="loaded"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: MOTION_DURATION.ui,
              ease: MOTION_EASING.out,
            }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================================================
// EXPORTS
// ============================================================================

export default PageTransition;
