/**
 * Mode Toggle — Segmented control for switching between Discover and Direct modes.
 *
 * Clean, minimal design matching brand aesthetics.
 * Shows first-time tooltip explaining the difference.
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
      className="relative flex items-center rounded-lg bg-muted/50 p-0.5 border border-border/50"
      data-testid="mode-toggle"
    >
      {/* Sliding background indicator */}
      <motion.div
        className="absolute top-0.5 bottom-0.5 rounded-md"
        style={{
          background: mode === 'direct'
            ? 'var(--consumption-purple, hsl(var(--primary)))'
            : 'hsl(var(--accent))',
        }}
        initial={false}
        animate={{
          left: mode === 'discover' ? '2px' : '50%',
          right: mode === 'direct' ? '2px' : '50%',
        }}
        transition={{
          duration: MOTION_DURATION.ui,
          ease: MOTION_EASING.snap,
        }}
      />

      {/* Discover button */}
      <button
        onClick={() => handleModeChange('discover')}
        className={`relative z-10 flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors duration-200 ${
          mode === 'discover'
            ? 'text-foreground'
            : 'text-muted-foreground hover:text-foreground/70'
        }`}
        data-testid="mode-toggle-discover"
      >
        <Compass className="h-3 w-3" />
        {!compact && <span>Discover</span>}
      </button>

      {/* Direct button */}
      <button
        onClick={() => handleModeChange('direct')}
        className={`relative z-10 flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors duration-200 ${
          mode === 'direct'
            ? 'text-white'
            : 'text-muted-foreground hover:text-foreground/70'
        }`}
        data-testid="mode-toggle-direct"
      >
        <Zap className="h-3 w-3" />
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
