/**
 * Metric Delta — Directional change indicator with slide animation.
 *
 * Positive: slides in from below, green, up caret.
 * Negative: slides in from above, red, down caret.
 * Zero/neutral: muted gray dash.
 *
 * Designed to sit next to or below an AnimatedNumber.
 *
 * @see OMNIVOR-VIZ-ROADMAP.md V1.1
 */

import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricDeltaProps {
  value: number;
  format?: (n: number) => string;
  invertColor?: boolean;
  className?: string;
}

const defaultFormat = (n: number): string => {
  const abs = Math.abs(n);
  const formatted = abs % 1 === 0 ? abs.toString() : abs.toFixed(1);
  return `${n > 0 ? "+" : n < 0 ? "-" : ""}${formatted}`;
};

/**
 * MetricDelta — Compact delta indicator with directional animation.
 *
 * invertColor: true when a decrease is positive (e.g., churn rate going down is good).
 */
export function MetricDelta({
  value,
  format = defaultFormat,
  invertColor = false,
  className,
}: MetricDeltaProps) {
  const isPositive = value > 0;
  const isNegative = value < 0;
  const isNeutral = value === 0;

  // Determine color: green for "good", red for "bad"
  const isGood = invertColor ? isNegative : isPositive;
  const isBad = invertColor ? isPositive : isNegative;

  const colorClass = isGood
    ? "text-green-500"
    : isBad
      ? "text-red-500"
      : "text-zinc-500";

  // Check reduced motion
  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const slideY = isPositive ? 6 : isNegative ? -6 : 0;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={value}
        initial={prefersReduced ? false : { opacity: 0, y: slideY }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          "inline-flex items-center gap-1 text-sm font-medium",
          colorClass,
          className,
        )}
      >
        {isPositive && <TrendingUp className="h-3.5 w-3.5" />}
        {isNegative && <TrendingDown className="h-3.5 w-3.5" />}
        {isNeutral ? (
          <span className="text-xs">—</span>
        ) : (
          <span className="tabular-nums">{format(value)}</span>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
