/**
 * Celebration Overlay — "The Gold Protocol"
 *
 * Three-tier celebration system for the OmniVor analytics platform.
 * Restrained, gold, professional — Bloomberg acknowledging a successful trade.
 *
 * Tier 1 (confirm):    Gold checkmark + subtle ring pulse. 600ms.
 * Tier 2 (accomplish): Checkmark + pulse ring + metric counter + shimmer. 1200ms.
 * Tier 3 (triumph):    Checkmark + double pulse + particle burst + hero text + ambient glow. 2400ms.
 *
 * Respects prefers-reduced-motion. Silent (no audio). Overlay, not fullscreen.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { AnimatedNumber } from "@/components/shared/animated-number";

// ============================================================================
// TYPES
// ============================================================================

export interface CelebrationOverlayProps {
  tier: "confirm" | "accomplish" | "triumph";
  message: string;
  count?: number;
  onComplete?: () => void;
  className?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CATALYST_GOLD = "#F59E0B";
const CATALYST_GOLD_DARK = "#d97706";

/** Total animation duration per tier (ms) */
const TIER_DURATION: Record<CelebrationOverlayProps["tier"], number> = {
  confirm: 600,
  accomplish: 1200,
  triumph: 2400,
};

// SVG checkmark path — a clean, geometric check fitting a 24x24 viewBox
const CHECK_PATH = "M5 12.5l5 5L19 7";

// ============================================================================
// PARTICLES (Tier 3 only)
// ============================================================================

interface Particle {
  id: number;
  angle: number; // radians
  distance: number; // px travel
  size: number; // px
  delay: number; // seconds
}

function generateParticles(count: number): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.3;
    particles.push({
      id: i,
      angle,
      distance: 28 + Math.random() * 20,
      size: 2 + Math.random() * 2,
      delay: 0.4 + Math.random() * 0.15,
    });
  }
  return particles;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function CelebrationOverlay({
  tier,
  message,
  count,
  onComplete,
  className,
}: CelebrationOverlayProps) {
  const prefersReduced = useReducedMotion();
  const completeCalled = useRef(false);
  const [showCount, setShowCount] = useState(false);

  const particles = useMemo(
    () => (tier === "triumph" ? generateParticles(14) : []),
    [tier],
  );

  // Fire onComplete after tier duration
  useEffect(() => {
    if (completeCalled.current) return;

    if (prefersReduced) {
      // Instant — call immediately
      completeCalled.current = true;
      onComplete?.();
      return;
    }

    const timeout = setTimeout(() => {
      if (!completeCalled.current) {
        completeCalled.current = true;
        onComplete?.();
      }
    }, TIER_DURATION[tier]);

    return () => clearTimeout(timeout);
  }, [tier, onComplete, prefersReduced]);

  // Delay showing AnimatedNumber so it animates from 0 after checkmark draws
  useEffect(() => {
    if (prefersReduced || tier === "confirm") {
      setShowCount(true);
      return;
    }
    const t = setTimeout(() => setShowCount(true), 400);
    return () => clearTimeout(t);
  }, [prefersReduced, tier]);

  // ---- Reduced motion: show final state instantly ----
  if (prefersReduced) {
    return (
      <div
        className={cn(
          "relative flex flex-col items-center justify-center gap-2",
          className,
        )}
      >
        <svg
          width={24}
          height={24}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d={CHECK_PATH}
            stroke={CATALYST_GOLD}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {count !== undefined && (
          <span
            className="tabular-nums text-sm font-medium"
            style={{ color: CATALYST_GOLD }}
          >
            {count}
          </span>
        )}
        <span className="text-xs text-slate-400">{message}</span>
      </div>
    );
  }

  // ---- Animated version ----
  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center gap-2",
        className,
      )}
      style={
        tier === "triumph"
          ? {
              animation: `triumph-glow 1s ease-out 1.4s forwards`,
            }
          : undefined
      }
    >
      {/* Inline keyframes for triumph ambient glow */}
      {tier === "triumph" && (
        <style>{`
          @keyframes triumph-glow {
            from { box-shadow: 0 0 0px rgba(245, 158, 11, 0); }
            to   { box-shadow: 0 0 40px rgba(245, 158, 11, 0.08); }
          }
        `}</style>
      )}

      {/* SVG Layer: checkmark + rings */}
      <div className="relative">
        <svg
          width={24}
          height={24}
          viewBox="0 0 24 24"
          fill="none"
          className="relative z-10"
          aria-hidden="true"
        >
          <motion.path
            d={CHECK_PATH}
            stroke={CATALYST_GOLD}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          />
        </svg>

        {/* Ring(s) — expand from center */}
        <PulseRing
          delay={0.2}
          duration={0.3}
          endSize={48}
          endOpacity={tier === "confirm" ? 0.4 : 0.6}
          endStrokeWidth={tier === "confirm" ? 1.5 : 2}
          strokeWidthEnd={tier === "confirm" ? 1.5 : 0.5}
        />

        {(tier === "accomplish" || tier === "triumph") && (
          <PulseRing
            delay={0.2}
            duration={0.6}
            endSize={56}
            endOpacity={0.5}
            endStrokeWidth={1.5}
            strokeWidthEnd={0.5}
          />
        )}

        {tier === "triumph" && (
          <PulseRing
            delay={0.4}
            duration={0.8}
            endSize={64}
            endOpacity={0.4}
            endStrokeWidth={1.5}
            strokeWidthEnd={0.3}
          />
        )}

        {/* Tier 3: Particle burst */}
        {tier === "triumph" &&
          particles.map((p) => (
            <motion.div
              key={p.id}
              className="absolute rounded-full"
              style={{
                width: p.size,
                height: p.size,
                backgroundColor: CATALYST_GOLD,
                left: "50%",
                top: "50%",
                marginLeft: -p.size / 2,
                marginTop: -p.size / 2,
              }}
              initial={{ x: 0, y: 0, opacity: 0.9, scale: 1 }}
              animate={{
                x: Math.cos(p.angle) * p.distance,
                y: Math.sin(p.angle) * p.distance,
                opacity: 0,
                scale: 0.3,
              }}
              transition={{
                duration: 1.2,
                delay: p.delay,
                ease: "easeOut",
              }}
            />
          ))}
      </div>

      {/* Metric counter (Tier 2+) */}
      {count !== undefined && (tier === "accomplish" || tier === "triumph") && (
        <div
          className="text-sm font-medium tabular-nums"
          style={{ color: CATALYST_GOLD }}
        >
          {showCount ? (
            <AnimatedNumber value={count} duration={0.6} variant="hero" />
          ) : (
            <span className="invisible">0</span>
          )}
        </div>
      )}

      {/* Status text */}
      {tier === "triumph" ? (
        <motion.span
          className="text-xs font-semibold tracking-wide"
          style={{ color: CATALYST_GOLD }}
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            delay: 0.8,
            duration: 0.4,
            type: "spring",
            bounce: 0.25,
          }}
        >
          {message}
        </motion.span>
      ) : (
        <motion.span
          className="text-xs text-slate-400"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.3 }}
        >
          {message}
        </motion.span>
      )}

      {/* Tier 2: Shimmer sweep */}
      {tier === "accomplish" && <ShimmerSweep />}
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/** Expanding ring that fades out */
function PulseRing({
  delay,
  duration,
  endSize,
  endOpacity,
  endStrokeWidth,
  strokeWidthEnd,
}: {
  delay: number;
  duration: number;
  endSize: number;
  endOpacity: number;
  endStrokeWidth: number;
  strokeWidthEnd: number;
}) {
  return (
    <motion.div
      className="pointer-events-none absolute"
      style={{
        left: "50%",
        top: "50%",
        width: 24,
        height: 24,
        marginLeft: -12,
        marginTop: -12,
        borderRadius: "50%",
        border: `${endStrokeWidth}px solid ${CATALYST_GOLD}`,
      }}
      initial={{ scale: 1, opacity: endOpacity }}
      animate={{
        scale: endSize / 24,
        opacity: 0,
        borderWidth: `${strokeWidthEnd}px`,
      }}
      transition={{ delay, duration, ease: "easeOut" }}
    />
  );
}

/** Linear gradient sweep across the component — Tier 2 shimmer */
function ShimmerSweep() {
  return (
    <motion.div
      className="pointer-events-none absolute inset-0 overflow-hidden rounded"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.8, duration: 0.05 }}
    >
      <motion.div
        className="absolute inset-y-0"
        style={{
          width: "40%",
          background: `linear-gradient(90deg, transparent, ${CATALYST_GOLD}18, transparent)`,
        }}
        initial={{ left: "-40%" }}
        animate={{ left: "140%" }}
        transition={{ delay: 0.8, duration: 0.4, ease: "linear" }}
      />
    </motion.div>
  );
}
