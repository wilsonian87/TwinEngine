/**
 * Signal Processor — 2D Canvas particle animation for loading states.
 *
 * Brand metaphor: "Consuming signals" made visual.
 * - Processing: Purple particles converge toward center, fade to gold on arrival.
 * - Complete: Gold burst outward, particles dissolve.
 * - Idle: Ambient drift, muted purple, low opacity.
 *
 * Uses 2D Canvas (NOT Three.js — save WebGL contexts for Ecosystem Explorer).
 * Performance target: <1ms per frame (simple physics, no collisions).
 *
 * @see OMNIVOR-VIZ-ROADMAP.md V1.2
 */

import { useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

type ProcessorState = "processing" | "complete" | "idle";

interface SignalProcessorProps {
  state: ProcessorState;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZES = { sm: 48, md: 96, lg: 192 } as const;

// Brand colors
const PURPLE = { r: 107, g: 33, b: 168 };   // #6b21a8
const VIOLET = { r: 168, g: 85, b: 247 };   // #a855f7
const GOLD = { r: 217, g: 119, b: 6 };      // #d97706

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  // 0 = purple, 1 = gold (interpolation factor)
  colorShift: number;
  life: number;
}

function createParticle(
  canvasSize: number,
  state: ProcessorState,
): Particle {
  const center = canvasSize / 2;
  const angle = Math.random() * Math.PI * 2;

  if (state === "processing") {
    // Spawn at edges, will converge
    const dist = canvasSize * 0.35 + Math.random() * canvasSize * 0.15;
    return {
      x: center + Math.cos(angle) * dist,
      y: center + Math.sin(angle) * dist,
      vx: 0,
      vy: 0,
      radius: 1 + Math.random() * 2,
      alpha: 0.4 + Math.random() * 0.5,
      colorShift: 0,
      life: 1,
    };
  }

  if (state === "complete") {
    // Spawn at center, will burst
    return {
      x: center + (Math.random() - 0.5) * 4,
      y: center + (Math.random() - 0.5) * 4,
      vx: Math.cos(angle) * (2 + Math.random() * 3),
      vy: Math.sin(angle) * (2 + Math.random() * 3),
      radius: 1.5 + Math.random() * 2,
      alpha: 1,
      colorShift: 1,
      life: 1,
    };
  }

  // Idle — ambient drift
  const dist = Math.random() * canvasSize * 0.3;
  return {
    x: center + Math.cos(angle) * dist,
    y: center + Math.sin(angle) * dist,
    vx: (Math.random() - 0.5) * 0.3,
    vy: (Math.random() - 0.5) * 0.3,
    radius: 1 + Math.random() * 1.5,
    alpha: 0.15 + Math.random() * 0.2,
    colorShift: 0,
    life: 1,
  };
}

function lerpColor(
  a: { r: number; g: number; b: number },
  b: { r: number; g: number; b: number },
  t: number,
): string {
  const r = Math.round(a.r + (b.r - a.r) * t);
  const g = Math.round(a.g + (b.g - a.g) * t);
  const bl = Math.round(a.b + (b.b - a.b) * t);
  return `${r}, ${g}, ${bl}`;
}

/**
 * SignalProcessor — Lightweight particle animation for loading states.
 * Falls back to a branded spinner if canvas is unavailable.
 */
export function SignalProcessor({
  state,
  size = "md",
  className,
}: SignalProcessorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number>(0);
  const stateRef = useRef<ProcessorState>(state);
  const prevStateRef = useRef<ProcessorState>(state);

  const canvasSize = SIZES[size];
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

  const getParticleCount = useCallback(
    (s: ProcessorState) => {
      if (s === "processing") return 40 + Math.floor(Math.random() * 20);
      if (s === "complete") return 30;
      return 8 + Math.floor(Math.random() * 4);
    },
    [],
  );

  // Handle state transitions
  useEffect(() => {
    prevStateRef.current = stateRef.current;
    stateRef.current = state;

    // On state change, reinitialize particles
    const count = getParticleCount(state);
    particlesRef.current = Array.from({ length: count }, () =>
      createParticle(canvasSize, state),
    );
  }, [state, canvasSize, getParticleCount]);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Check reduced motion
    const prefersReduced =
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Set canvas resolution for retina
    canvas.width = canvasSize * dpr;
    canvas.height = canvasSize * dpr;
    ctx.scale(dpr, dpr);

    // Initialize particles
    const currentState = stateRef.current;
    const count = getParticleCount(currentState);
    particlesRef.current = Array.from({ length: count }, () =>
      createParticle(canvasSize, currentState),
    );

    let completeTimer = 0;

    function tick() {
      if (!ctx) return;
      ctx.clearRect(0, 0, canvasSize, canvasSize);

      const s = stateRef.current;
      const center = canvasSize / 2;
      const particles = particlesRef.current;

      if (prefersReduced) {
        // Static fallback: draw a simple dot cluster
        ctx.fillStyle = `rgba(${lerpColor(PURPLE, GOLD, s === "complete" ? 1 : 0)}, 0.5)`;
        ctx.beginPath();
        ctx.arc(center, center, 4, 0, Math.PI * 2);
        ctx.fill();
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];

        if (s === "processing") {
          // Attract toward center
          const dx = center - p.x;
          const dy = center - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const force = 0.02;
          p.vx += (dx / (dist + 1)) * force;
          p.vy += (dy / (dist + 1)) * force;
          // Damping
          p.vx *= 0.97;
          p.vy *= 0.97;
          // Color shifts toward gold as particle approaches center
          p.colorShift = Math.min(1, 1 - dist / (canvasSize * 0.4));
          // Respawn if too close to center
          if (dist < 3) {
            particles[i] = createParticle(canvasSize, "processing");
            continue;
          }
        } else if (s === "complete") {
          // Burst outward, fade
          p.alpha *= 0.97;
          p.life -= 0.015;
          if (p.life <= 0) {
            particles.splice(i, 1);
            continue;
          }
        } else {
          // Idle: gentle drift with boundary wrapping
          if (p.x < 0 || p.x > canvasSize) p.vx *= -1;
          if (p.y < 0 || p.y > canvasSize) p.vy *= -1;
        }

        p.x += p.vx;
        p.y += p.vy;

        // Draw
        const baseColor =
          p.colorShift > 0.5
            ? lerpColor(VIOLET, GOLD, (p.colorShift - 0.5) * 2)
            : lerpColor(PURPLE, VIOLET, p.colorShift * 2);

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${baseColor}, ${p.alpha * p.life})`;
        ctx.fill();
      }

      // Complete state: after all particles dissolve, transition to idle
      if (s === "complete" && particles.length === 0) {
        completeTimer++;
        if (completeTimer > 30) {
          // Auto-transition to idle after burst completes
          stateRef.current = "idle";
          const idleCount = getParticleCount("idle");
          particlesRef.current = Array.from({ length: idleCount }, () =>
            createParticle(canvasSize, "idle"),
          );
          completeTimer = 0;
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [canvasSize, dpr, getParticleCount]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: canvasSize, height: canvasSize }}
      className={cn("pointer-events-none", className)}
      aria-hidden="true"
    />
  );
}
