/**
 * Animated Number — Spring-physics number interpolation.
 *
 * Every metric in the app animates on value change. Hero metrics use smooth ease-out,
 * supporting metrics use spring with slight overshoot.
 *
 * Used in: Dashboard Direct (hero + supporting), metric cards, counters.
 *
 * @see OMNIVOR-VIZ-ROADMAP.md V1.1
 */

import { useEffect, useRef } from "react";
import { useMotionValue, useTransform, animate, motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface AnimatedNumberProps {
  value: number;
  format?: (n: number) => string;
  duration?: number;
  variant?: "hero" | "supporting";
  className?: string;
}

const defaultFormat = (n: number): string =>
  Math.round(n).toLocaleString("en-US");

/**
 * AnimatedNumber — Animates between number values with Framer Motion.
 *
 * Hero variant: smooth ease-out (600ms default, no overshoot).
 * Supporting variant: spring with slight overshoot (300ms default).
 * Respects prefers-reduced-motion — instant swap.
 */
export function AnimatedNumber({
  value,
  format = defaultFormat,
  duration,
  variant = "supporting",
  className,
}: AnimatedNumberProps) {
  const motionValue = useMotionValue(0);
  const displayRef = useRef<HTMLSpanElement>(null);
  const isInitial = useRef(true);

  // Resolve duration from variant if not explicitly set
  const resolvedDuration = duration ?? (variant === "hero" ? 0.6 : 0.3);

  // Update display text when motion value changes
  const rounded = useTransform(motionValue, (latest) => format(latest));

  useEffect(() => {
    const unsubscribe = rounded.on("change", (v) => {
      if (displayRef.current) {
        displayRef.current.textContent = v;
      }
    });
    return unsubscribe;
  }, [rounded]);

  // Animate on value change
  useEffect(() => {
    // Check reduced motion preference
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduced) {
      motionValue.set(value);
      return;
    }

    // On initial mount, animate from 0 → value (the "data arriving" reveal)
    if (isInitial.current) {
      isInitial.current = false;
    }

    const controls =
      variant === "hero"
        ? animate(motionValue, value, {
            duration: resolvedDuration,
            ease: [0.16, 1, 0.3, 1], // brand ease-out
          })
        : animate(motionValue, value, {
            type: "spring",
            duration: resolvedDuration,
            bounce: 0.15, // slight overshoot
          });

    return () => controls.stop();
  }, [value, motionValue, variant, resolvedDuration]);

  return (
    <motion.span
      ref={displayRef}
      className={cn("tabular-nums", className)}
      aria-live="polite"
      aria-atomic="true"
    >
      {format(value)}
    </motion.span>
  );
}
