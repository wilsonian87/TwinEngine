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
 */

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Play, Pause, RotateCcw } from 'lucide-react';
import { useStoryStore } from '@/stores/storyStore';
import { useConstellationStore } from '@/stores/constellationStore';
import { cn } from '@/lib/utils';

// Auto-advance duration in milliseconds
const AUTO_ADVANCE_DURATION = 8000;

export function StoryNarrationHUD() {
  const {
    currentBeatIndex,
    beats,
    isDeepDiveOpen,
    isPlaying,
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

  const statusColors = {
    healthy: 'from-green-500/20 to-green-500/5 border-green-500/30',
    warning: 'from-amber-500/20 to-amber-500/5 border-amber-500/30',
    critical: 'from-red-500/20 to-red-500/5 border-red-500/30',
    bypass: 'from-purple-500/20 to-purple-500/5 border-purple-500/30',
  };

  const statusGlow = {
    healthy: 'shadow-green-500/20',
    warning: 'shadow-amber-500/20',
    critical: 'shadow-red-500/20',
    bypass: 'shadow-purple-500/20',
  };

  const statusBadge = {
    healthy: 'bg-green-500/20 text-green-400',
    warning: 'bg-amber-500/20 text-amber-400',
    critical: 'bg-red-500/20 text-red-400',
    bypass: 'bg-purple-500/20 text-purple-400',
  };

  const progressBarColor = {
    healthy: 'bg-green-500',
    warning: 'bg-amber-500',
    critical: 'bg-red-500',
    bypass: 'bg-purple-500',
  };

  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 z-30">
      {/* Progress Dots */}
      <div className="flex justify-center gap-2 mb-4">
        {beats.map((beat, i) => (
          <button
            key={beat.id}
            onClick={() => setBeat(i)}
            className={cn(
              "h-2 rounded-full transition-all duration-300 relative overflow-hidden",
              i === currentBeatIndex
                ? "w-8 bg-white/30"
                : "w-2 bg-white/30 hover:bg-white/50"
            )}
            aria-label={`Go to beat ${i + 1}: ${beat.headline}`}
          >
            {/* Active indicator with progress */}
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
          "rounded-2xl border backdrop-blur-xl",
          "bg-gradient-to-b",
          statusColors[currentBeat.visualState],
          "shadow-2xl",
          statusGlow[currentBeat.visualState]
        )}
      >
        {/* Headline Section */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
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
              className="text-2xl font-semibold text-white mb-2"
            >
              {currentBeat.headline}
            </motion.h2>
          </AnimatePresence>

          {/* Expand/Collapse Toggle */}
          <button
            onClick={toggleDeepDive}
            className="flex items-center gap-1 text-sm text-slate-400 hover:text-white transition-colors"
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
              <div className="px-6 pb-6 pt-2 border-t border-white/10">
                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                  {currentBeat.deepDive}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation Controls */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/10">
          <button
            onClick={prevBeat}
            disabled={isFirstBeat}
            className={cn(
              "flex items-center gap-1 text-sm transition-colors",
              isFirstBeat
                ? "text-slate-600 cursor-not-allowed"
                : "text-slate-400 hover:text-white"
            )}
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          <div className="flex items-center gap-2">
            {/* Restart button */}
            <button
              onClick={() => setBeat(0)}
              className="p-2 rounded-full bg-white/5 hover:bg-white/15 transition-colors"
              aria-label="Restart"
            >
              <RotateCcw className="w-4 h-4 text-slate-400" />
            </button>

            {/* Play/Pause button */}
            <button
              onClick={togglePlayback}
              className={cn(
                "p-3 rounded-full transition-colors",
                isPlaying
                  ? "bg-white/20 hover:bg-white/30"
                  : "bg-white/10 hover:bg-white/20"
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
                ? "text-slate-600 cursor-not-allowed"
                : "text-slate-400 hover:text-white"
            )}
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </motion.div>

      {/* Keyboard hints */}
      <div className="flex justify-center gap-4 mt-3">
        <span className="text-xs text-slate-600">
          <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono text-[10px]">←→</kbd> Navigate
        </span>
        <span className="text-xs text-slate-600">
          <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono text-[10px]">Space</kbd> Play/Pause
        </span>
        <span className="text-xs text-slate-600">
          <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono text-[10px]">D</kbd> Details
        </span>
        <span className="text-xs text-slate-600">
          <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono text-[10px]">Esc</kbd> Exit
        </span>
      </div>
    </div>
  );
}
