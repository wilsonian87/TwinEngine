/**
 * ModePage — Renders Discover or Direct variant based on current platform mode.
 *
 * Usage:
 *   <ModePage discover={HCPExplorer} direct={HCPExplorerDirect} />
 *
 * Both components share the same route, API endpoints, React Query cache,
 * filter state, and navigation context. Mode affects only presentation.
 *
 * Transition: gentle crossfade (250ms) matching brand motion config.
 */

import { AnimatePresence, motion } from 'framer-motion';
import { useMode } from '@/lib/mode-context';
import { MOTION_DURATION, MOTION_EASING } from '@/lib/motion-config';

interface ModePageProps {
  discover: React.ComponentType;
  direct: React.ComponentType;
}

const modeTransition = {
  duration: MOTION_DURATION.ui,
  ease: MOTION_EASING.out,
};

export function ModePage({ discover: DiscoverComponent, direct: DirectComponent }: ModePageProps) {
  const { mode } = useMode();

  return (
    <AnimatePresence mode="wait">
      {mode === 'discover' ? (
        <motion.div
          key="discover"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={modeTransition}
          className="h-full"
        >
          <DiscoverComponent />
        </motion.div>
      ) : (
        <motion.div
          key="direct"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={modeTransition}
          className="h-full"
        >
          <DirectComponent />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
