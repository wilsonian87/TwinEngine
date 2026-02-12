/**
 * Completion Animation — IntakeDiamond + ParticleBurst
 *
 * Brand mark completion checkbox. Transitions from purple-idle to gold-active.
 * Used in: Action Queue triage, Daily Brief, Simulation runs.
 *
 * Reference: omnivor-completion-animation.jsx prototype
 */

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const PURPLE = "#6b21a8";
const PURPLE_LIGHT = "#7c3aed";
const GOLD = "#d97706";
const GOLD_LIGHT = "#f59e0b";

interface IntakeDiamondProps {
  completed: boolean;
  onClick?: () => void;
  size?: number;
  className?: string;
}

/**
 * IntakeDiamond — Brand mark used as completion checkbox.
 * Outer diamond stroke, inner diamond fill, center dot.
 */
export function IntakeDiamond({ completed, onClick, size = 24, className }: IntakeDiamondProps) {
  const strokeColor = completed ? GOLD : PURPLE_LIGHT;
  const fillColor = completed ? GOLD_LIGHT : "transparent";
  const dotColor = completed ? GOLD : PURPLE;
  const half = size / 2;
  const inset = size * 0.2;

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={cn("cursor-pointer", className)}
      onClick={onClick}
      whileHover={{ scale: 1.15 }}
      whileTap={{ scale: 0.9 }}
      transition={{ duration: 0.15 }}
    >
      {/* Outer diamond (stroke only) */}
      <motion.polygon
        points={`${half},1 ${size - 1},${half} ${half},${size - 1} 1,${half}`}
        fill="none"
        stroke={strokeColor}
        strokeWidth={1.5}
        animate={{ stroke: strokeColor }}
        transition={{ duration: 0.3 }}
      />
      {/* Inner diamond (fill on completion) */}
      <motion.polygon
        points={`${half},${inset} ${size - inset},${half} ${half},${size - inset} ${inset},${half}`}
        fill={fillColor}
        stroke="none"
        animate={{ fill: fillColor, scale: completed ? 1 : 0.8 }}
        transition={{ duration: 0.3 }}
      />
      {/* Center dot */}
      <motion.circle
        cx={half}
        cy={half}
        r={size * 0.08}
        fill={dotColor}
        animate={{ fill: dotColor, r: completed ? size * 0.06 : size * 0.08 }}
        transition={{ duration: 0.3 }}
      />
    </motion.svg>
  );
}

/**
 * ParticleBurst — 6 particles (alternating gold/purple) burst on completion.
 */
function ParticleBurst({ active, size = 24 }: { active: boolean; size?: number }) {
  const particles = Array.from({ length: 6 }, (_, i) => {
    const angle = (i * 60 * Math.PI) / 180;
    const distance = size * 1.5;
    return {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      color: i % 2 === 0 ? GOLD_LIGHT : PURPLE_LIGHT,
    };
  });

  return (
    <AnimatePresence>
      {active && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          {particles.map((p, i) => (
            <motion.div
              key={i}
              className="absolute h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: p.color }}
              initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
              animate={{
                x: p.x,
                y: p.y,
                opacity: 0,
                scale: 0.3,
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}

/**
 * CompletionCheckbox — IntakeDiamond + ParticleBurst combined.
 */
export function CompletionCheckbox({
  completed,
  onComplete,
  size = 24,
  className,
}: {
  completed: boolean;
  onComplete: () => void;
  size?: number;
  className?: string;
}) {
  const [showBurst, setShowBurst] = useState(false);

  const handleClick = useCallback(() => {
    if (!completed) {
      setShowBurst(true);
      onComplete();
      setTimeout(() => setShowBurst(false), 700);
    }
  }, [completed, onComplete]);

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <IntakeDiamond completed={completed} onClick={handleClick} size={size} />
      <ParticleBurst active={showBurst} size={size} />
    </div>
  );
}

/**
 * QueueClearCelebration — Full-width celebration when queue is empty.
 */
export function QueueClearCelebration({
  stats,
  streakDays,
}: {
  stats: { approved: number; deferred: number; rejected: number };
  streakDays?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-center justify-center py-16 text-center"
    >
      <IntakeDiamond completed size={64} />
      <h2 className="mt-6 text-xl font-semibold text-foreground">Queue Clear</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        All critical actions reviewed
      </p>
      <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
        <span>{stats.approved} approved</span>
        <span className="text-border">&middot;</span>
        <span>{stats.deferred} deferred</span>
        <span className="text-border">&middot;</span>
        <span>{stats.rejected} rejected</span>
      </div>
      {streakDays && streakDays > 1 && (
        <p className="mt-3 text-sm font-medium" style={{ color: GOLD }}>
          {streakDays}-day streak
        </p>
      )}
    </motion.div>
  );
}
