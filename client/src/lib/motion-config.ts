/**
 * OMNIVOR Motion Configuration
 *
 * Framer Motion presets for page transitions, data flow animations,
 * and micro-interactions. Follows brand animation principles.
 *
 * Motion Principles:
 * - Purposeful, not decorative
 * - Intake → Process → Output (gather → transform → reveal)
 * - Smooth, never bouncy (ease-out for entrances, ease-in for exits)
 * - Progressive disclosure (content reveals in sequence)
 *
 * @see ROADMAP-PHASE9-INTERACTION-EXPERIENCE.md M9B.1
 */

import type { Variants, Transition, MotionProps } from 'framer-motion';
import { BRAND_CONFIG } from './brand-config';

// ============================================================================
// TIMING CONSTANTS
// ============================================================================

export const MOTION_DURATION = {
  micro: 0.15,      // 150ms - hover, press
  ui: 0.25,         // 250ms - panels, modals
  page: 0.35,       // 350ms - page transitions
  data: 0.6,        // 600ms - data reveals
  hero: 0.8,        // 800ms - hero animations
  stagger: 1.2,     // 1200ms - staggered sequences
} as const;

// Custom easing functions for brand consistency
export const MOTION_EASING = {
  // Primary easing - smooth deceleration
  out: [0.16, 1, 0.3, 1] as [number, number, number, number],
  // Entrance/exit transitions
  inOut: [0.65, 0, 0.35, 1] as [number, number, number, number],
  // Quick snap (for micro-interactions)
  snap: [0.2, 0, 0.38, 0.9] as [number, number, number, number],
  // Gentle spring-like (no actual spring, stays professional)
  soft: [0.22, 0.61, 0.36, 1] as [number, number, number, number],
} as const;

// ============================================================================
// PAGE TRANSITION PRESETS
// ============================================================================

/**
 * Standard page transition configuration
 */
export const pageTransition: Transition = {
  duration: MOTION_DURATION.page,
  ease: MOTION_EASING.out,
};

/**
 * Page variants for AnimatePresence
 */
export const pageVariants: Variants = {
  initial: {
    opacity: 0,
    y: 8,
    filter: 'blur(4px)',
  },
  enter: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: pageTransition,
  },
  exit: {
    opacity: 0,
    y: -8,
    filter: 'blur(4px)',
    transition: {
      duration: MOTION_DURATION.ui,
      ease: MOTION_EASING.inOut,
    },
  },
};

/**
 * Fade-only page variant (for less dramatic transitions)
 */
export const fadePageVariants: Variants = {
  initial: {
    opacity: 0,
  },
  enter: {
    opacity: 1,
    transition: {
      duration: MOTION_DURATION.page,
      ease: MOTION_EASING.out,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: MOTION_DURATION.ui,
      ease: MOTION_EASING.inOut,
    },
  },
};

// ============================================================================
// SHARED ELEMENT TRANSITIONS (Data Flow)
// ============================================================================

/**
 * Shared element transition for layoutId animations
 * Creates the "data flowing between views" effect
 */
export const sharedElementTransition: Transition = {
  type: 'spring',
  stiffness: 300,
  damping: 30,
};

/**
 * Configuration for data flow elements
 */
export const dataFlowConfig = {
  transition: sharedElementTransition,
  // Use this for elements that "travel" between pages
  layoutDependency: true,
};

// ============================================================================
// STAGGER ANIMATION PRESETS
// ============================================================================

/**
 * Container variant for staggered children
 */
export const staggerContainer: Variants = {
  initial: {},
  enter: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
  exit: {
    transition: {
      staggerChildren: 0.03,
      staggerDirection: -1,
    },
  },
};

/**
 * Fast stagger for large lists
 */
export const fastStaggerContainer: Variants = {
  initial: {},
  enter: {
    transition: {
      staggerChildren: 0.02,
      delayChildren: 0.05,
    },
  },
};

/**
 * Child element for stagger animations
 */
export const staggerChild: Variants = {
  initial: {
    opacity: 0,
    y: 12,
  },
  enter: {
    opacity: 1,
    y: 0,
    transition: {
      duration: MOTION_DURATION.ui,
      ease: MOTION_EASING.out,
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: {
      duration: MOTION_DURATION.micro,
    },
  },
};

/**
 * Stagger item with scale for cards/grid items
 */
export const staggerCardChild: Variants = {
  initial: {
    opacity: 0,
    y: 20,
    scale: 0.95,
  },
  enter: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: MOTION_DURATION.ui + 0.1,
      ease: MOTION_EASING.out,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: {
      duration: MOTION_DURATION.micro,
    },
  },
};

// ============================================================================
// MODAL & DIALOG TRANSITIONS
// ============================================================================

/**
 * Modal/dialog overlay variants
 */
export const overlayVariants: Variants = {
  initial: {
    opacity: 0,
  },
  enter: {
    opacity: 1,
    transition: {
      duration: MOTION_DURATION.ui,
      ease: MOTION_EASING.out,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: MOTION_DURATION.micro,
    },
  },
};

/**
 * Modal content variants (scale + fade)
 */
export const modalVariants: Variants = {
  initial: {
    opacity: 0,
    scale: 0.95,
    y: 8,
  },
  enter: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: MOTION_DURATION.ui,
      ease: MOTION_EASING.out,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 8,
    transition: {
      duration: MOTION_DURATION.micro,
    },
  },
};

/**
 * Slide-up modal (for command palette, sheets)
 */
export const slideUpVariants: Variants = {
  initial: {
    opacity: 0,
    y: '100%',
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
    y: '100%',
    transition: {
      duration: MOTION_DURATION.ui,
      ease: MOTION_EASING.inOut,
    },
  },
};

// ============================================================================
// MICRO-INTERACTION PRESETS
// ============================================================================

/**
 * Button press animation
 */
export const buttonPress: MotionProps = {
  whileTap: { scale: 0.98 },
  transition: { duration: MOTION_DURATION.micro },
};

/**
 * Card hover lift effect
 */
export const cardHover: MotionProps = {
  whileHover: {
    y: -4,
    transition: { duration: MOTION_DURATION.micro, ease: MOTION_EASING.out },
  },
};

/**
 * Glow on hover (for interactive elements)
 */
export const glowHover: MotionProps = {
  whileHover: {
    boxShadow: `0 0 20px 4px ${BRAND_CONFIG.colors.consumptionPurple}33`,
    transition: { duration: MOTION_DURATION.ui, ease: MOTION_EASING.out },
  },
};

// ============================================================================
// DATA ANIMATION PRESETS
// ============================================================================

/**
 * Number count-up animation props
 */
export const numberReveal: Variants = {
  initial: {
    opacity: 0,
    scale: 0.8,
  },
  enter: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: MOTION_DURATION.data,
      ease: MOTION_EASING.out,
    },
  },
};

/**
 * Chart bar grow animation
 */
export const barGrow: Variants = {
  initial: {
    scaleY: 0,
    originY: 1,
  },
  enter: {
    scaleY: 1,
    transition: {
      duration: MOTION_DURATION.data,
      ease: MOTION_EASING.out,
    },
  },
};

/**
 * Line draw animation (for SVG paths)
 */
export const lineDraw: Variants = {
  initial: {
    pathLength: 0,
    opacity: 0,
  },
  enter: {
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: {
        duration: MOTION_DURATION.hero,
        ease: MOTION_EASING.out,
      },
      opacity: {
        duration: MOTION_DURATION.ui,
      },
    },
  },
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate staggered entrance props for a specific element index
 */
export function getStaggerProps(index: number, total: number): MotionProps {
  return {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: {
      duration: MOTION_DURATION.ui,
      delay: index * (MOTION_DURATION.hero / total),
      ease: MOTION_EASING.out,
    },
  };
}

/**
 * Create a custom stagger container with specific timing
 */
export function createStaggerContainer(
  staggerDelay: number = 0.05,
  initialDelay: number = 0.1
): Variants {
  return {
    initial: {},
    enter: {
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: initialDelay,
      },
    },
    exit: {
      transition: {
        staggerChildren: staggerDelay / 2,
        staggerDirection: -1,
      },
    },
  };
}

/**
 * Respects user's reduced motion preference
 */
export function getReducedMotionProps(): MotionProps {
  if (typeof window !== 'undefined') {
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    if (prefersReducedMotion) {
      return {
        initial: false,
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0 },
      };
    }
  }
  return {};
}

// ============================================================================
// TOAST/NOTIFICATION TRANSITIONS
// ============================================================================

/**
 * Toast slide-in from bottom-right
 */
export const toastVariants: Variants = {
  initial: {
    opacity: 0,
    y: 20,
    scale: 0.95,
    x: 20,
  },
  enter: {
    opacity: 1,
    y: 0,
    scale: 1,
    x: 0,
    transition: {
      duration: MOTION_DURATION.ui,
      ease: MOTION_EASING.out,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    x: 20,
    transition: {
      duration: MOTION_DURATION.micro,
      ease: MOTION_EASING.inOut,
    },
  },
};

// ============================================================================
// ACCORDION/COLLAPSE TRANSITIONS
// ============================================================================

/**
 * Accordion content expand/collapse
 */
export const accordionVariants: Variants = {
  initial: {
    height: 0,
    opacity: 0,
  },
  enter: {
    height: 'auto',
    opacity: 1,
    transition: {
      height: {
        duration: MOTION_DURATION.ui,
        ease: MOTION_EASING.out,
      },
      opacity: {
        duration: MOTION_DURATION.micro,
        delay: 0.1,
      },
    },
  },
  exit: {
    height: 0,
    opacity: 0,
    transition: {
      height: {
        duration: MOTION_DURATION.ui,
        ease: MOTION_EASING.inOut,
      },
      opacity: {
        duration: MOTION_DURATION.micro,
      },
    },
  },
};

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type MotionDuration = typeof MOTION_DURATION;
export type MotionEasing = typeof MOTION_EASING;
