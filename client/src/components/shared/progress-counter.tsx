/**
 * Progress Counter — "{reviewed} of {total} reviewed" with breakdown.
 *
 * Bar fills purple -> purple-to-gold gradient at 100%.
 * Used in: Action Queue Direct, Daily Brief.
 */

import { motion } from "framer-motion";
import { MOTION_DURATION, MOTION_EASING } from "@/lib/motion-config";
import { cn } from "@/lib/utils";

interface ProgressCounterProps {
  reviewed: number;
  total: number;
  approved?: number;
  deferred?: number;
  rejected?: number;
  className?: string;
}

export function ProgressCounter({
  reviewed,
  total,
  approved = 0,
  deferred = 0,
  rejected = 0,
  className,
}: ProgressCounterProps) {
  const percent = total > 0 ? (reviewed / total) * 100 : 0;
  const isComplete = percent >= 100;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          <span className="font-medium text-foreground tabular-nums">{reviewed}</span>
          {" "}of{" "}
          <span className="tabular-nums">{total}</span>
          {" "}reviewed
        </span>
        <div className="flex items-center gap-3 text-muted-foreground">
          {approved > 0 && <span className="text-green-600 dark:text-green-400 tabular-nums">{approved} approved</span>}
          {deferred > 0 && <span className="text-amber-600 dark:text-amber-400 tabular-nums">{deferred} deferred</span>}
          {rejected > 0 && <span className="text-red-600 dark:text-red-400 tabular-nums">{rejected} rejected</span>}
        </div>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full rounded-full"
          style={{
            background: isComplete
              ? "linear-gradient(90deg, var(--consumption-purple, #6b21a8), var(--catalyst-gold, #d97706))"
              : "var(--consumption-purple, #6b21a8)",
          }}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(percent, 100)}%` }}
          transition={{ duration: MOTION_DURATION.data, ease: MOTION_EASING.out }}
        />
      </div>
    </div>
  );
}
