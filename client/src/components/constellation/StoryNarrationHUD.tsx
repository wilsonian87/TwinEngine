/**
 * StoryNarrationHUD - Headline/Deep Dive Narrative UI
 *
 * Implements two-layer narrative pattern:
 * - Headline: Always visible, max 60 chars
 * - Deep Dive: Expandable detailed analysis
 *
 * Features:
 * - Auto-advance with visual progress
 * - Keyboard navigation
 * - Smooth transitions
 * - Phase 10H.4: Dockable to bottom, top, or right sidebar
 */

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Play, Pause, RotateCcw } from 'lucide-react';
import { useStoryStore } from '@/stores/storyStore';
import { useConstellationStore } from '@/stores/constellationStore';
import { StoryPanelPositionToggle } from './StoryPanelPositionToggle';
import { cn } from '@/lib/utils';

// Auto-advance duration in milliseconds
const AUTO_ADVANCE_DURATION = 8000;

export function StoryNarrationHUD() {
  const {
    currentBeatIndex,
    beats,
    isDeepDiveOpen,
    isPlaying,
    panelPosition,
    nextBeat,
    prevBeat,
    setBeat,
    toggleDeepDive,
    togglePlayback,
    stopPlayback,
  } = useStoryStore();

  const toggleStoryMode = useConstellationStore((s) => s.toggleStoryMode);

  const currentBeat = beats[currentBeatIndex];
  const isFirstBeat = currentBeatIndex === 0;
  const isLastBeat = currentBeatIndex === beats.length - 1;
  const isRightPosition = panelPosition === 'right';

  // Progress for auto-advance timer
  const [progress, setProgress] = useState(0);
  const progressIntervalRef = useRef<number | null>(null);

  // Auto-advance when playing
  useEffect(() => {
    if (!isPlaying || isDeepDiveOpen) {
      setProgress(0);
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      return;
    }

    // Reset progress on beat change
    setProgress(0);

    // Update progress every 100ms
    progressIntervalRef.current = window.setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev + (100 / AUTO_ADVANCE_DURATION) * 100;
        if (newProgress >= 100) {
          if (currentBeatIndex < beats.length - 1) {
            nextBeat();
          } else {
            stopPlayback();
          }
          return 0;
        }
        return newProgress;
      });
    }, 100);

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [isPlaying, isDeepDiveOpen, currentBeatIndex, beats.length, nextBeat, stopPlayback]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault();
          nextBeat();
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          prevBeat();
          break;
        case ' ':
          e.preventDefault();
          togglePlayback();
          break;
        case 'd':
        case 'D':
          e.preventDefault();
          toggleDeepDive();
          break;
        case 'Escape':
          e.preventDefault();
          if (isDeepDiveOpen) {
            toggleDeepDive();
          } else {
            toggleStoryMode(); // Exit story mode
          }
          break;
        case 'r':
        case 'R':
          e.preventDefault();
          setBeat(0); // Restart from beginning
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextBeat, prevBeat, togglePlayback, isDeepDiveOpen, toggleDeepDive, toggleStoryMode, setBeat]);

  if (!currentBeat) return null;

  // Light theme status colors
  const statusColors = {
    healthy: 'from-green-50 to-white border-green-200',
    warning: 'from-amber-50 to-white border-amber-200',
    critical: 'from-red-50 to-white border-red-200',
    bypass: 'from-purple-50 to-white border-purple-200',
  };

  const statusGlow = {
    healthy: 'shadow-green-100',
    warning: 'shadow-amber-100',
    critical: 'shadow-red-100',
    bypass: 'shadow-purple-100',
  };

  const statusBadge = {
    healthy: 'bg-green-100 text-green-700',
    warning: 'bg-amber-100 text-amber-700',
    critical: 'bg-red-100 text-red-700',
    bypass: 'bg-purple-100 text-purple-700',
  };

  const progressBarColor = {
    healthy: 'bg-green-500',
    warning: 'bg-amber-500',
    critical: 'bg-red-500',
    bypass: 'bg-purple-500',
  };

  // Position-based container classes
  const positionClasses = {
    bottom: 'bottom-8 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4',
    top: 'top-20 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4',
    right: 'top-16 right-0 bottom-0 w-80',
  };

  // Animation variants based on position
  const getAnimationVariants = () => {
    switch (panelPosition) {
      case 'top':
        return { initial: { opacity: 0, y: -20 }, animate: { opacity: 1, y: 0 } };
      case 'right':
        return { initial: { opacity: 0, x: 20 }, animate: { opacity: 1, x: 0 } };
      default:
        return { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } };
    }
  };

  const animationVariants = getAnimationVariants();

  return (
    <motion.div
      className={cn('absolute z-30', positionClasses[panelPosition])}
      initial={animationVariants.initial}
      animate={animationVariants.animate}
      transition={{ duration: 0.3 }}
      key={panelPosition} // Re-animate on position change
    >
      {/* Right sidebar layout */}
      {isRightPosition ? (
        <div className="h-full flex flex-col bg-white/95 backdrop-blur-xl border-l border-slate-200 shadow-xl">
          {/* Header with position toggle */}
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Story Mode
            </span>
            <StoryPanelPositionToggle />
          </div>

          {/* Progress dots - vertical for right sidebar */}
          <div className="flex flex-col items-center gap-2 py-4 px-4">
            {beats.map((beat, i) => (
              <button
                key={beat.id}
                onClick={() => setBeat(i)}
                className={cn(
                  "w-2 rounded-full transition-all duration-300 relative overflow-hidden",
                  i === currentBeatIndex
                    ? "h-8 bg-slate-200"
                    : "h-2 bg-slate-300 hover:bg-slate-400"
                )}
                aria-label={`Go to beat ${i + 1}: ${beat.headline}`}
              >
                {i === currentBeatIndex && (
                  <motion.div
                    className={cn("absolute inset-0 rounded-full", progressBarColor[beat.visualState])}
                    initial={{ height: 0 }}
                    animate={{ height: isPlaying ? `${progress}%` : '100%' }}
                    transition={{ duration: 0.1 }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* Scrollable content area */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-500">
                {currentBeatIndex + 1} of {beats.length}
              </span>
              <span className={cn(
                "text-xs font-medium px-2 py-1 rounded-full capitalize",
                statusBadge[currentBeat.visualState]
              )}>
                {currentBeat.visualState}
              </span>
            </div>

            <AnimatePresence mode="wait">
              <motion.h2
                key={currentBeat.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="text-xl font-semibold text-slate-900 mb-3"
              >
                {currentBeat.headline}
              </motion.h2>
            </AnimatePresence>

            {/* Deep dive always visible in right sidebar, scrollable */}
            <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
              {currentBeat.deepDive}
            </div>
          </div>

          {/* Navigation Controls - fixed at bottom */}
          <div className="p-4 border-t border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={prevBeat}
                disabled={isFirstBeat}
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  isFirstBeat
                    ? "text-slate-300 cursor-not-allowed"
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                )}
                aria-label="Previous beat"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setBeat(0)}
                  className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors"
                  aria-label="Restart"
                >
                  <RotateCcw className="w-4 h-4 text-slate-500" />
                </button>
                <button
                  onClick={togglePlayback}
                  className={cn(
                    "p-3 rounded-full transition-colors",
                    isPlaying
                      ? "bg-indigo-600 hover:bg-indigo-700"
                      : "bg-indigo-500 hover:bg-indigo-600"
                  )}
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5 text-white" />
                  ) : (
                    <Play className="w-5 h-5 text-white ml-0.5" />
                  )}
                </button>
              </div>

              <button
                onClick={nextBeat}
                disabled={isLastBeat}
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  isLastBeat
                    ? "text-slate-300 cursor-not-allowed"
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                )}
                aria-label="Next beat"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Compact keyboard hints */}
            <div className="flex justify-center gap-2 text-[10px] text-slate-400">
              <span><kbd className="px-1 py-0.5 rounded bg-slate-100 font-mono">←→</kbd></span>
              <span><kbd className="px-1 py-0.5 rounded bg-slate-100 font-mono">Space</kbd></span>
              <span><kbd className="px-1 py-0.5 rounded bg-slate-100 font-mono">Esc</kbd></span>
            </div>
          </div>
        </div>
      ) : (
        /* Bottom/Top horizontal layout */
        <>
          {/* Progress Dots */}
          <div className="flex justify-center gap-2 mb-4">
            {beats.map((beat, i) => (
              <button
                key={beat.id}
                onClick={() => setBeat(i)}
                className={cn(
                  "h-2 rounded-full transition-all duration-300 relative overflow-hidden",
                  i === currentBeatIndex
                    ? "w-8 bg-slate-200"
                    : "w-2 bg-slate-300 hover:bg-slate-400"
                )}
                aria-label={`Go to beat ${i + 1}: ${beat.headline}`}
              >
                {i === currentBeatIndex && (
                  <motion.div
                    className={cn("absolute inset-0 rounded-full", progressBarColor[beat.visualState])}
                    initial={{ width: 0 }}
                    animate={{ width: isPlaying ? `${progress}%` : '100%' }}
                    transition={{ duration: 0.1 }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* Main Card */}
          <motion.div
            layout
            className={cn(
              "rounded-2xl border backdrop-blur-xl relative",
              "bg-gradient-to-b",
              statusColors[currentBeat.visualState],
              "shadow-xl",
              statusGlow[currentBeat.visualState]
            )}
          >
            {/* Position toggle in corner */}
            <div className="absolute top-3 right-3">
              <StoryPanelPositionToggle />
            </div>

            {/* Headline Section */}
            <div className="p-6 pr-24">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  {currentBeatIndex + 1} of {beats.length}
                </span>
                <span className={cn(
                  "text-xs font-medium px-2 py-1 rounded-full capitalize",
                  statusBadge[currentBeat.visualState]
                )}>
                  {currentBeat.visualState}
                </span>
              </div>

              <AnimatePresence mode="wait">
                <motion.h2
                  key={currentBeat.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="text-2xl font-semibold text-slate-900 mb-2"
                >
                  {currentBeat.headline}
                </motion.h2>
              </AnimatePresence>

              {/* Expand/Collapse Toggle */}
              <button
                onClick={toggleDeepDive}
                className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 transition-colors"
              >
                {isDeepDiveOpen ? (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    <span>Hide details</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    <span>Show analysis</span>
                  </>
                )}
              </button>
            </div>

            {/* Deep Dive Section (Collapsible) */}
            <AnimatePresence>
              {isDeepDiveOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="px-6 pb-6 pt-2 border-t border-slate-200">
                    <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                      {currentBeat.deepDive}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation Controls */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200">
              <button
                onClick={prevBeat}
                disabled={isFirstBeat}
                className={cn(
                  "flex items-center gap-1 text-sm transition-colors",
                  isFirstBeat
                    ? "text-slate-300 cursor-not-allowed"
                    : "text-slate-500 hover:text-slate-900"
                )}
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              <div className="flex items-center gap-2">
                {/* Restart button */}
                <button
                  onClick={() => setBeat(0)}
                  className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors"
                  aria-label="Restart"
                >
                  <RotateCcw className="w-4 h-4 text-slate-500" />
                </button>

                {/* Play/Pause button */}
                <button
                  onClick={togglePlayback}
                  className={cn(
                    "p-3 rounded-full transition-colors",
                    isPlaying
                      ? "bg-indigo-600 hover:bg-indigo-700"
                      : "bg-indigo-500 hover:bg-indigo-600"
                  )}
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5 text-white" />
                  ) : (
                    <Play className="w-5 h-5 text-white ml-0.5" />
                  )}
                </button>
              </div>

              <button
                onClick={nextBeat}
                disabled={isLastBeat}
                className={cn(
                  "flex items-center gap-1 text-sm transition-colors",
                  isLastBeat
                    ? "text-slate-300 cursor-not-allowed"
                    : "text-slate-500 hover:text-slate-900"
                )}
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>

          {/* Keyboard hints */}
          <div className="flex justify-center gap-4 mt-3">
            <span className="text-xs text-slate-500">
              <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-600 font-mono text-[10px] shadow-sm">←→</kbd> Navigate
            </span>
            <span className="text-xs text-slate-500">
              <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-600 font-mono text-[10px] shadow-sm">Space</kbd> Play/Pause
            </span>
            <span className="text-xs text-slate-500">
              <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-600 font-mono text-[10px] shadow-sm">D</kbd> Details
            </span>
            <span className="text-xs text-slate-500">
              <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-600 font-mono text-[10px] shadow-sm">Esc</kbd> Exit
            </span>
          </div>
        </>
      )}
    </motion.div>
  );
}
