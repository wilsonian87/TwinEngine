/**
 * Simulation Reveal — Progressive reveal with confidence fan chart.
 *
 * Presents simulation results through a sequenced animation that builds
 * genuine insight moments: baseline -> fork -> fan -> resolve -> idle.
 * Inspired by MATLAB fan charts + scrollytelling progressive reveal.
 *
 * @see OMNIVOR-VIZ-ROADMAP.md
 */

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence, useAnimate } from "framer-motion";
import { cn } from "@/lib/utils";
import { AnimatedNumber } from "@/components/shared/animated-number";

type RevealState = "baseline" | "fork" | "fan" | "resolve" | "idle";

interface SimulationRevealProps {
  baseline: number;
  projected: number;
  confidence: number;
  delta: number;
  interventionLabel: string;
  metricLabel: string;
  autoPlay?: boolean;
  onStateChange?: (state: RevealState) => void;
  className?: string;
}

// Brand colors
const CATALYST_GOLD = "#F59E0B";
const CONSUMPTION_PURPLE = "#7C3AED";
const PURPLE_300 = "#C4B5FD";

// SVG layout constants
const VB_W = 400;
const VB_H = 200;
const PAD_LEFT = 40;
const PAD_RIGHT = 60;
const PAD_TOP = 40;
const PAD_BOTTOM = 50;
const CHART_W = VB_W - PAD_LEFT - PAD_RIGHT;
const CHART_H = VB_H - PAD_TOP - PAD_BOTTOM;
const FORK_X_RATIO = 0.4; // Fork happens at 40% of chart width

const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];

/**
 * SimulationReveal — Sequenced animation presenting simulation results
 * through baseline, fork, fan, and resolve states.
 */
export function SimulationReveal({
  baseline,
  projected,
  confidence,
  delta,
  interventionLabel,
  metricLabel,
  autoPlay = true,
  onStateChange,
  className,
}: SimulationRevealProps) {
  const [state, setState] = useState<RevealState>("baseline");
  const [svgScope, animateSvg] = useAnimate<SVGSVGElement>();
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const prefersReducedMotion = useRef(false);

  // Detect reduced motion preference
  useEffect(() => {
    if (typeof window !== "undefined") {
      prefersReducedMotion.current = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;
    }
  }, []);

  // Propagate state changes
  useEffect(() => {
    onStateChange?.(state);
  }, [state, onStateChange]);

  // Compute Y positions: map value range to SVG coordinates
  const { baselineY, projectedY, fanHalfHeight } = useMemo(() => {
    const minVal = Math.min(baseline, projected) * 0.9;
    const maxVal = Math.max(baseline, projected) * 1.1;
    const range = maxVal - minVal || 1;

    const bY = PAD_TOP + CHART_H * (1 - (baseline - minVal) / range);
    const pY = PAD_TOP + CHART_H * (1 - (projected - minVal) / range);

    // Fan width inversely proportional to confidence
    const uncertainty = 1 - confidence;
    const maxFanHeight = CHART_H * 0.4;
    const fH = uncertainty * maxFanHeight;

    return { baselineY: bY, projectedY: pY, fanHalfHeight: fH };
  }, [baseline, projected, confidence]);

  // Key X coordinates
  const startX = PAD_LEFT;
  const forkX = PAD_LEFT + CHART_W * FORK_X_RATIO;
  const endX = PAD_LEFT + CHART_W;

  // Projected path: cubic bezier from fork to end
  const projectedPath = `M ${forkX} ${baselineY} C ${forkX + CHART_W * 0.2} ${baselineY}, ${endX - CHART_W * 0.2} ${projectedY}, ${endX} ${projectedY}`;

  // Fan band paths (upper and lower area fill)
  const buildFanPath = (halfH: number) => {
    const upperY = projectedY - halfH;
    const lowerY = projectedY + halfH;
    const upperMidY = baselineY - halfH * 0.3;
    const lowerMidY = baselineY + halfH * 0.3;

    return [
      `M ${forkX} ${baselineY}`,
      `C ${forkX + CHART_W * 0.2} ${upperMidY}, ${endX - CHART_W * 0.2} ${upperY}, ${endX} ${upperY}`,
      `L ${endX} ${lowerY}`,
      `C ${endX - CHART_W * 0.2} ${lowerY}, ${forkX + CHART_W * 0.2} ${lowerMidY}, ${forkX} ${baselineY}`,
      "Z",
    ].join(" ");
  };

  const innerFanPath = buildFanPath(fanHalfHeight);
  const outerFanPath = buildFanPath(fanHalfHeight * 1.8);

  // Particle positions: 4-6 gold particles drifting upward from projected line
  const particles = useMemo(() => {
    const count = 4 + Math.floor(Math.random() * 3); // 4-6
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      cx: forkX + (endX - forkX) * (0.3 + Math.random() * 0.6),
      cy: projectedY - Math.random() * 10,
      r: 1.5 + Math.random() * 1.5,
      delay: 1.2 + Math.random() * 0.6,
    }));
  }, [forkX, endX, projectedY]);

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach(clearTimeout);
    };
  }, []);

  // Main animation sequence
  useEffect(() => {
    if (!autoPlay) return;

    // Reduced motion: skip to resolve immediately
    if (prefersReducedMotion.current) {
      setState("resolve");
      const t = setTimeout(() => setState("idle"), 100);
      timersRef.current.push(t);
      return;
    }

    // State 1: baseline (already set)
    setState("baseline");

    const t1 = setTimeout(() => {
      setState("fork");
    }, 600);

    const t2 = setTimeout(() => {
      setState("fan");
    }, 1200);

    const t3 = setTimeout(() => {
      setState("resolve");
    }, 2000);

    const t4 = setTimeout(() => {
      setState("idle");
    }, 3000);

    timersRef.current.push(t1, t2, t3, t4);
  }, [autoPlay]);

  const showFork = state !== "baseline";
  const showFan = state === "fan" || state === "resolve" || state === "idle";
  const showResolve = state === "resolve" || state === "idle";
  const isIdle = state === "idle";

  return (
    <div className={cn("relative w-full", className)}>
      {/* SVG Chart */}
      <svg
        ref={svgScope}
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="w-full h-auto"
        role="img"
        aria-label={`Simulation reveal: ${metricLabel} from ${baseline} to ${projected}`}
      >
        {/* Baseline label */}
        <AnimatePresence>
          {(state === "baseline" || showFork) && (
            <motion.text
              x={startX}
              y={baselineY - 12}
              className="fill-foreground"
              fontSize="12"
              fontFamily="IBM Plex Sans, sans-serif"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, ease: EASE_OUT }}
            >
              {metricLabel}: {Number(baseline.toFixed(2))}
            </motion.text>
          )}
        </AnimatePresence>

        {/* Baseline line — dims when fork starts */}
        <motion.line
          x1={startX}
          y1={baselineY}
          x2={endX}
          y2={baselineY}
          stroke={CATALYST_GOLD}
          strokeWidth={3}
          initial={{ pathLength: 0, opacity: 1 }}
          animate={{
            pathLength: 1,
            opacity: showFork ? 0.4 : 1,
          }}
          transition={{
            pathLength: { duration: 0.5, ease: EASE_OUT },
            opacity: { duration: 0.3 },
          }}
        />

        {/* Fork glow */}
        <AnimatePresence>
          {showFork && (
            <motion.circle
              cx={forkX}
              cy={baselineY}
              r={12}
              fill={CONSUMPTION_PURPLE}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 0.2, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{
                type: "spring",
                stiffness: 120,
                damping: 14,
              }}
            />
          )}
        </AnimatePresence>

        {/* Outer fan band */}
        <AnimatePresence>
          {showFan && (
            <motion.path
              d={outerFanPath}
              fill={CONSUMPTION_PURPLE}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: EASE_OUT }}
            />
          )}
        </AnimatePresence>

        {/* Inner fan band */}
        <AnimatePresence>
          {showFan && (
            <motion.path
              d={innerFanPath}
              fill={CONSUMPTION_PURPLE}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: EASE_OUT }}
            />
          )}
        </AnimatePresence>

        {/* Projected line */}
        <AnimatePresence>
          {showFork && (
            <motion.path
              d={projectedPath}
              fill="none"
              stroke={CONSUMPTION_PURPLE}
              strokeWidth={3}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{
                type: "spring",
                stiffness: 120,
                damping: 14,
              }}
            />
          )}
        </AnimatePresence>

        {/* Gold particles */}
        <AnimatePresence>
          {showFan &&
            particles.map((p) => (
              <motion.circle
                key={p.id}
                cx={p.cx}
                cy={p.cy}
                r={p.r}
                fill={CATALYST_GOLD}
                initial={{ opacity: 0, y: 0 }}
                animate={{
                  opacity: [0, 0.8, 0],
                  y: -20 - Math.random() * 15,
                }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: 1.5,
                  delay: p.delay,
                  repeat: isIdle ? Infinity : 0,
                  repeatDelay: 1,
                }}
              />
            ))}
        </AnimatePresence>

        {/* Projected endpoint dot with breathing glow in idle */}
        <AnimatePresence>
          {showResolve && (
            <motion.circle
              cx={endX}
              cy={projectedY}
              r={5}
              fill={CONSUMPTION_PURPLE}
              initial={{ opacity: 0, scale: 0 }}
              animate={{
                opacity: 1,
                scale: isIdle ? [1, 1.02, 1] : 1,
              }}
              transition={
                isIdle
                  ? { scale: { duration: 2, repeat: Infinity, ease: "easeInOut" } }
                  : { type: "spring", stiffness: 200, damping: 12 }
              }
            />
          )}
        </AnimatePresence>

        {/* X-axis label */}
        <text
          x={PAD_LEFT + CHART_W / 2}
          y={VB_H - 8}
          textAnchor="middle"
          className="fill-muted-foreground"
          fontSize="10"
          fontFamily="IBM Plex Sans, sans-serif"
          letterSpacing="0.05em"
        >
          Timeline
        </text>

        {/* Y-axis label */}
        <text
          x={12}
          y={PAD_TOP + CHART_H / 2}
          textAnchor="middle"
          className="fill-muted-foreground"
          fontSize="10"
          fontFamily="IBM Plex Sans, sans-serif"
          letterSpacing="0.05em"
          transform={`rotate(-90, 12, ${PAD_TOP + CHART_H / 2})`}
        >
          {metricLabel}
        </text>
      </svg>

      {/* Overlay text: hero number, delta badge, confidence badge, intervention label */}
      <AnimatePresence>
        {showResolve && (
          <motion.div
            className="absolute bottom-2 right-3 flex flex-col items-end gap-1.5 rounded-lg border border-border/50 bg-card/80 p-3 backdrop-blur-sm"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE_OUT }}
          >
            {/* Hero projected number */}
            <div className="text-2xl font-semibold text-foreground tabular-nums">
              <AnimatedNumber
                value={projected}
                variant="hero"
                duration={0.8}
              />
            </div>

            {/* Delta + confidence badges */}
            <div className="flex items-center gap-2">
              <motion.span
                className="text-sm font-medium tabular-nums"
                style={{ color: CATALYST_GOLD }}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 200,
                  damping: 14,
                  delay: 0.15,
                }}
              >
                +{delta.toFixed(2)}%
              </motion.span>

              <motion.span
                className="text-xs tabular-nums"
                style={{ color: PURPLE_300 }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.3 }}
              >
                {Math.round(confidence * 100)}% confidence
              </motion.span>
            </div>

            {/* Intervention label */}
            <motion.p
              className="text-xs text-muted-foreground max-w-[220px] text-right"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              {interventionLabel}
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
