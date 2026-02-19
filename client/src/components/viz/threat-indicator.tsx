/**
 * ThreatIndicator — Ambient threat severity encoding with triple encoding
 * (color + size + motion).
 *
 * Levels 1-5 map to Monitor → Critical with progressively urgent visual
 * treatment. At least two encoding channels (color, size, motion) are always
 * distinguishable for any viewer, satisfying accessibility requirements.
 *
 * @see OMNIVOR-VIZ-ROADMAP.md VIZ-4
 */

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Level config
// ---------------------------------------------------------------------------

export interface ThreatLevelConfig {
  level: 1 | 2 | 3 | 4 | 5;
  label: string;
  color: string;
  size: number;
  labelClass: string;
  glow: string | null;
  pulse: { scale: number; duration: number } | null;
  ring: boolean;
}

export const THREAT_LEVELS: Record<1 | 2 | 3 | 4 | 5, ThreatLevelConfig> = {
  1: {
    level: 1,
    label: "Monitor",
    color: "#6366F1",
    size: 8,
    labelClass: "text-slate-400",
    glow: null,
    pulse: null,
    ring: false,
  },
  2: {
    level: 2,
    label: "Watch",
    color: "#8B5CF6",
    size: 10,
    labelClass: "text-purple-300",
    glow: null,
    pulse: null,
    ring: false,
  },
  3: {
    level: 3,
    label: "Alert",
    color: "#F59E0B",
    size: 12,
    labelClass: "text-amber-400",
    glow: "0 0 8px #F59E0B30",
    pulse: { scale: 1.15, duration: 3 },
    ring: false,
  },
  4: {
    level: 4,
    label: "Escalate",
    color: "#EF4444",
    size: 14,
    labelClass: "text-red-400",
    glow: "0 0 12px #EF444440",
    pulse: { scale: 1.25, duration: 2 },
    ring: false,
  },
  5: {
    level: 5,
    label: "Critical",
    color: "#DC2626",
    size: 16,
    labelClass: "text-red-300 font-semibold",
    glow: "0 0 20px #DC262650",
    pulse: { scale: 1.3, duration: 1.2 },
    ring: true,
  },
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ThreatIndicatorProps {
  level: 1 | 2 | 3 | 4 | 5;
  label?: string;
  compact?: boolean;
  animated?: boolean;
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ThreatIndicator({
  level,
  label: labelOverride,
  compact = false,
  animated,
  className,
}: ThreatIndicatorProps) {
  const config = THREAT_LEVELS[level];
  const prefersReducedMotion = useReducedMotion();

  // Default: animate for levels 4-5 unless explicitly overridden
  const shouldAnimate =
    !prefersReducedMotion &&
    (animated !== undefined ? animated : level >= 4) &&
    config.pulse !== null;

  const displayLabel = labelOverride ?? config.label;

  // SVG viewport needs room for the ring (level 5) and glow
  const ringSize = config.ring ? config.size + 4 : config.size;
  const viewBox = ringSize + 8; // padding for glow bleed
  const center = viewBox / 2;
  const radius = config.size / 2;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5",
        className,
      )}
    >
      {/* Dot with optional pulse and glow */}
      <motion.svg
        width={viewBox}
        height={viewBox}
        viewBox={`0 0 ${viewBox} ${viewBox}`}
        aria-hidden="true"
        className="shrink-0"
        animate={
          shouldAnimate && config.pulse
            ? { scale: [1, config.pulse.scale, 1] }
            : undefined
        }
        transition={
          shouldAnimate && config.pulse
            ? {
                duration: config.pulse.duration,
                repeat: Infinity,
                ease: "easeInOut",
              }
            : undefined
        }
      >
        {/* Glow filter */}
        {config.glow && (
          <defs>
            <filter id={`glow-${level}`} x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow
                dx="0"
                dy="0"
                stdDeviation="3"
                floodColor={config.color}
                floodOpacity={level === 5 ? 0.31 : level === 4 ? 0.25 : 0.19}
              />
            </filter>
          </defs>
        )}

        {/* Outer ring for level 5 */}
        {config.ring && (
          <circle
            cx={center}
            cy={center}
            r={ringSize / 2}
            fill="none"
            stroke={config.color}
            strokeWidth={1}
            opacity={0.6}
          />
        )}

        {/* Filled dot */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill={config.color}
          filter={config.glow ? `url(#glow-${level})` : undefined}
        />
      </motion.svg>

      {/* Label */}
      {!compact && (
        <span className={cn("text-xs leading-none select-none", config.labelClass)}>
          {displayLabel}
        </span>
      )}
    </span>
  );
}
