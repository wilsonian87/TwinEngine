/**
 * Mode Toggle — Segmented control for switching between Discover and Direct modes.
 *
 * Brand purple for selected state, clear unselected state.
 * Thicker buttons, bold icons, no color bleed between segments.
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Compass, Zap } from 'lucide-react';
import { useMode, type PlatformMode } from '@/lib/mode-context';
import { MOTION_DURATION, MOTION_EASING } from '@/lib/motion-config';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const TOOLTIP_SEEN_KEY = 'omnivor-mode-tooltip-seen';

export function ModeToggle({ compact = false }: { compact?: boolean }) {
  const { mode, setMode } = useMode();
  const [showTooltip, setShowTooltip] = useState(false);

  // Show tooltip on first visit
  useEffect(() => {
    const seen = localStorage.getItem(TOOLTIP_SEEN_KEY);
    if (!seen) {
      const timer = setTimeout(() => setShowTooltip(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  function handleModeChange(newMode: PlatformMode) {
    setMode(newMode);
    if (showTooltip) {
      setShowTooltip(false);
      localStorage.setItem(TOOLTIP_SEEN_KEY, 'true');
    }
  }

  const toggle = (
    <div
      className="relative flex items-center rounded-lg bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700"
      data-testid="mode-toggle"
    >
      {/* Sliding background indicator — solid purple for selected */}
      <motion.div
        className="absolute top-1 bottom-1 rounded-md bg-purple-700 dark:bg-purple-600 shadow-sm"
        initial={false}
        animate={{
          left: mode === 'discover' ? '4px' : '50%',
          right: mode === 'direct' ? '4px' : '50%',
        }}
        transition={{
          duration: MOTION_DURATION.ui,
          ease: MOTION_EASING.snap,
        }}
      />

      {/* Discover button */}
      <button
        onClick={() => handleModeChange('discover')}
        className={`relative z-10 flex items-center gap-2 rounded-md px-3.5 py-1.5 text-sm font-semibold transition-colors duration-200 ${
          mode === 'discover'
            ? 'text-white'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
        }`}
        data-testid="mode-toggle-discover"
      >
        <Compass className="h-4 w-4" strokeWidth={2.5} />
        {!compact && <span>Discover</span>}
      </button>

      {/* Direct button */}
      <button
        onClick={() => handleModeChange('direct')}
        className={`relative z-10 flex items-center gap-2 rounded-md px-3.5 py-1.5 text-sm font-semibold transition-colors duration-200 ${
          mode === 'direct'
            ? 'text-white'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
        }`}
        data-testid="mode-toggle-direct"
      >
        <Zap className="h-4 w-4" strokeWidth={2.5} />
        {!compact && <span>Direct</span>}
      </button>
    </div>
  );

  if (showTooltip) {
    return (
      <Tooltip open={showTooltip} onOpenChange={setShowTooltip}>
        <TooltipTrigger asChild>
          {toggle}
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-[220px] text-xs">
          <p className="font-medium mb-1">Platform Mode</p>
          <p className="text-muted-foreground">
            Discover shows you everything. Direct shows you what matters.
          </p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {toggle}
      </TooltipTrigger>
      <TooltipContent side="right" className="text-xs">
        {mode === 'discover' ? 'Full data exploration' : 'Curated insights & actions'}
      </TooltipContent>
    </Tooltip>
  );
}
