/**
 * WelcomeMessage Component
 *
 * Personalized welcome with animated signal/pattern counts.
 * Sets the tone for the Nerve Center experience.
 *
 * @see ROADMAP-PHASE9-INTERACTION-EXPERIENCE.md M9E.1
 */

import React from 'react';
import { motion } from 'framer-motion';
import { AnimatedNumber } from '@/components/charts/animated-number';

// ============================================================================
// TYPES
// ============================================================================

interface WelcomeMessageProps {
  /** Number of signals processed */
  signalCount: number;
  /** Number of patterns crystallized */
  patternCount: number;
  /** User's name (optional) */
  userName?: string;
  /** Custom greeting based on time of day */
  customGreeting?: string;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Get time-based greeting
 */
function getTimeBasedGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * Welcome message component with animated metrics.
 *
 * @example
 * <WelcomeMessage
 *   signalCount={12847}
 *   patternCount={47}
 *   userName="Sarah"
 * />
 */
export function WelcomeMessage({
  signalCount,
  patternCount,
  userName,
  customGreeting,
  className,
}: WelcomeMessageProps) {
  const greeting = customGreeting || getTimeBasedGreeting();

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      <h1 className="text-2xl font-bold text-signal-white mb-2">
        {greeting}{userName ? `, ${userName}` : ''}.
      </h1>
      <p className="text-data-gray text-base leading-relaxed">
        OmniVor has processed{' '}
        <AnimatedNumber
          value={signalCount}
          highlightColor="gold"
          className="font-semibold"
          format="number"
        />{' '}
        signals since your last session.{' '}
        <AnimatedNumber
          value={patternCount}
          highlightColor="purple"
          className="font-semibold"
          format="number"
        />{' '}
        patterns have crystallized.
      </p>
    </motion.div>
  );
}

// ============================================================================
// COMPACT VARIANT
// ============================================================================

interface CompactWelcomeProps {
  signalCount: number;
  className?: string;
}

/**
 * Compact welcome for mobile or constrained spaces.
 */
export function CompactWelcome({ signalCount, className }: CompactWelcomeProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <p className="text-data-gray text-sm">
        <AnimatedNumber
          value={signalCount}
          highlightColor="gold"
          className="font-semibold"
          format="number"
        />{' '}
        signals processed
      </p>
    </motion.div>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default WelcomeMessage;
