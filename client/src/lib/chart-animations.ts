/**
 * OMNIVOR Chart Animation Utilities
 *
 * Reusable animation primitives for chart components.
 * Uses requestAnimationFrame for smooth 60fps animations.
 *
 * @see ROADMAP-PHASE9-INTERACTION-EXPERIENCE.md M9A.7
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { MOTION_DURATION, MOTION_EASING } from './motion-config';
import type { MotionProps } from 'framer-motion';

// ============================================================================
// EASING FUNCTIONS
// ============================================================================

/**
 * Easing function implementations for RAF animations
 */
export const easingFunctions = {
  /**
   * Smooth deceleration (primary brand easing)
   */
  easeOut: (t: number): number => {
    // Approximation of cubic-bezier(0.16, 1, 0.3, 1)
    return 1 - Math.pow(1 - t, 3);
  },

  /**
   * Smooth acceleration then deceleration
   */
  easeInOut: (t: number): number => {
    // Approximation of cubic-bezier(0.65, 0, 0.35, 1)
    return t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  },

  /**
   * Linear (no easing)
   */
  linear: (t: number): number => t,

  /**
   * Bounce effect (subtle)
   */
  bounce: (t: number): number => {
    const n1 = 7.5625;
    const d1 = 2.75;

    if (t < 1 / d1) {
      return n1 * t * t;
    } else if (t < 2 / d1) {
      return n1 * (t -= 1.5 / d1) * t + 0.75;
    } else if (t < 2.5 / d1) {
      return n1 * (t -= 2.25 / d1) * t + 0.9375;
    } else {
      return n1 * (t -= 2.625 / d1) * t + 0.984375;
    }
  },
} as const;

export type EasingFunction = keyof typeof easingFunctions;

// ============================================================================
// NUMBER COUNTING ANIMATION
// ============================================================================

interface UseCountAnimationOptions {
  duration?: number;
  easing?: EasingFunction;
  decimals?: number;
  onComplete?: () => void;
}

/**
 * Hook for animating number count-up/down
 */
export function useCountAnimation(
  target: number,
  options: UseCountAnimationOptions = {}
): number {
  const {
    duration = MOTION_DURATION.data * 1000,
    easing = 'easeOut',
    decimals = 0,
    onComplete,
  } = options;

  const [current, setCurrent] = useState(0);
  const previousTarget = useRef(0);
  const frameRef = useRef<number>();

  useEffect(() => {
    const startValue = previousTarget.current;
    const difference = target - startValue;
    const startTime = performance.now();
    const easingFn = easingFunctions[easing];

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easingFn(progress);

      const newValue = startValue + difference * easedProgress;
      setCurrent(Number(newValue.toFixed(decimals)));

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        setCurrent(target);
        previousTarget.current = target;
        onComplete?.();
      }
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [target, duration, easing, decimals, onComplete]);

  return current;
}

// ============================================================================
// PATH DRAW ANIMATION
// ============================================================================

interface UseDrawAnimationOptions {
  duration?: number;
  delay?: number;
  easing?: EasingFunction;
}

interface DrawAnimationState {
  strokeDashoffset: number;
  opacity: number;
}

/**
 * Hook for SVG path draw animation
 */
export function useDrawAnimation(
  pathLength: number,
  options: UseDrawAnimationOptions = {}
): DrawAnimationState {
  const {
    duration = MOTION_DURATION.hero * 1000,
    delay = 0,
    easing = 'easeOut',
  } = options;

  const [state, setState] = useState<DrawAnimationState>({
    strokeDashoffset: pathLength,
    opacity: 0,
  });
  const frameRef = useRef<number>();

  useEffect(() => {
    const easingFn = easingFunctions[easing];
    const startTime = performance.now() + delay;

    const animate = (currentTime: number) => {
      if (currentTime < startTime) {
        frameRef.current = requestAnimationFrame(animate);
        return;
      }

      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easingFn(progress);

      setState({
        strokeDashoffset: pathLength * (1 - easedProgress),
        opacity: Math.min(progress * 4, 1),
      });

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [pathLength, duration, delay, easing]);

  return state;
}

// ============================================================================
// STAGGERED ENTRANCE UTILITIES
// ============================================================================

/**
 * Generate motion props for staggered entrance
 */
export function staggeredEntrance(
  index: number,
  total: number,
  options: {
    totalDuration?: number;
    yOffset?: number;
    scale?: boolean;
  } = {}
): MotionProps {
  const {
    totalDuration = MOTION_DURATION.hero,
    yOffset = 20,
    scale = false,
  } = options;

  const delay = index * (totalDuration / Math.max(total, 1));

  return {
    initial: {
      opacity: 0,
      y: yOffset,
      ...(scale ? { scale: 0.95 } : {}),
    },
    animate: {
      opacity: 1,
      y: 0,
      ...(scale ? { scale: 1 } : {}),
    },
    transition: {
      duration: MOTION_DURATION.ui,
      delay,
      ease: MOTION_EASING.out,
    },
  };
}

/**
 * Generate stagger delays for grid items (top-left to bottom-right)
 */
export function gridStaggerDelay(
  row: number,
  col: number,
  columns: number,
  baseDelay: number = 0.02
): number {
  return (row + col) * baseDelay;
}

// ============================================================================
// ANIMATION STATE HOOKS
// ============================================================================

/**
 * Hook to track when an element is in view for triggering animations
 */
export function useInViewAnimation(
  ref: React.RefObject<HTMLElement>,
  options: IntersectionObserverInit = {}
): boolean {
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.1,
        ...options,
      }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [ref, options]);

  return isInView;
}

/**
 * Hook to detect reduced motion preference
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
}

// ============================================================================
// BAR CHART ANIMATIONS
// ============================================================================

interface BarAnimationState {
  scaleY: number;
  opacity: number;
}

/**
 * Hook for animating a single bar from bottom
 */
export function useBarAnimation(
  index: number,
  total: number,
  options: {
    duration?: number;
    totalDuration?: number;
  } = {}
): BarAnimationState {
  const {
    duration = MOTION_DURATION.data * 1000,
    totalDuration = MOTION_DURATION.hero * 1000,
  } = options;

  const [state, setState] = useState<BarAnimationState>({
    scaleY: 0,
    opacity: 0,
  });
  const frameRef = useRef<number>();

  useEffect(() => {
    const delay = (index / total) * (totalDuration - duration);
    const startTime = performance.now() + delay;
    const easingFn = easingFunctions.easeOut;

    const animate = (currentTime: number) => {
      if (currentTime < startTime) {
        frameRef.current = requestAnimationFrame(animate);
        return;
      }

      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easingFn(progress);

      setState({
        scaleY: easedProgress,
        opacity: Math.min(progress * 3, 1),
      });

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [index, total, duration, totalDuration]);

  return state;
}

// ============================================================================
// VALUE INTERPOLATION
// ============================================================================

/**
 * Interpolate between two values with easing
 */
export function interpolate(
  start: number,
  end: number,
  progress: number,
  easing: EasingFunction = 'easeOut'
): number {
  const easedProgress = easingFunctions[easing](progress);
  return start + (end - start) * easedProgress;
}

/**
 * Interpolate colors (hex format)
 */
export function interpolateColor(
  startHex: string,
  endHex: string,
  progress: number
): string {
  const start = hexToRgb(startHex);
  const end = hexToRgb(endHex);

  if (!start || !end) return startHex;

  const r = Math.round(start.r + (end.r - start.r) * progress);
  const g = Math.round(start.g + (end.g - start.g) * progress);
  const b = Math.round(start.b + (end.b - start.b) * progress);

  return `rgb(${r}, ${g}, ${b})`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

// ============================================================================
// PERFORMANCE UTILITIES
// ============================================================================

/**
 * Throttle animation frame requests
 */
export function useThrottledAnimation<T>(
  callback: () => T,
  fps: number = 60
): T | undefined {
  const [result, setResult] = useState<T>();
  const lastFrameTime = useRef(0);
  const frameRef = useRef<number>();

  const throttledCallback = useCallback(() => {
    const now = performance.now();
    const elapsed = now - lastFrameTime.current;
    const frameInterval = 1000 / fps;

    if (elapsed >= frameInterval) {
      lastFrameTime.current = now - (elapsed % frameInterval);
      setResult(callback());
    }

    frameRef.current = requestAnimationFrame(throttledCallback);
  }, [callback, fps]);

  useEffect(() => {
    frameRef.current = requestAnimationFrame(throttledCallback);
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [throttledCallback]);

  return result;
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type { UseCountAnimationOptions, UseDrawAnimationOptions };
