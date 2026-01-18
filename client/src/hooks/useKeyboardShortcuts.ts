/**
 * useKeyboardShortcuts - Constellation Navigation Keyboard Shortcuts
 *
 * Phase 10H.3: Mac keyboard shortcuts for zoom level control and navigation.
 *
 * Shortcuts:
 * - Cmd + / Cmd = → Zoom in (L1→L2→L3)
 * - Cmd - → Zoom out (L3→L2→L1)
 * - Cmd 0 → Reorient (north star)
 * - Escape → Clear selection / exit story mode
 */

import { useEffect, useCallback } from 'react';
import { useConstellationStore, type ZoomLevel } from '@/stores/constellationStore';
import { useStoryStore } from '@/stores/storyStore';

const ZOOM_ORDER: ZoomLevel[] = ['ecosystem', 'campaign', 'hcp'];

export function useKeyboardShortcuts() {
  const zoomLevel = useConstellationStore((s) => s.zoomLevel);
  const setZoomLevel = useConstellationStore((s) => s.setZoomLevel);
  const requestCameraAnimation = useConstellationStore((s) => s.requestCameraAnimation);
  const clearSelection = useConstellationStore((s) => s.clearSelection);
  const storyModeActive = useConstellationStore((s) => s.storyModeActive);
  const toggleStoryMode = useConstellationStore((s) => s.toggleStoryMode);

  const zoomIn = useCallback(() => {
    const currentIndex = ZOOM_ORDER.indexOf(zoomLevel);
    if (currentIndex < ZOOM_ORDER.length - 1) {
      const nextLevel = ZOOM_ORDER[currentIndex + 1];
      setZoomLevel(nextLevel);
      requestCameraAnimation(nextLevel);
    }
  }, [zoomLevel, setZoomLevel, requestCameraAnimation]);

  const zoomOut = useCallback(() => {
    const currentIndex = ZOOM_ORDER.indexOf(zoomLevel);
    if (currentIndex > 0) {
      const nextLevel = ZOOM_ORDER[currentIndex - 1];
      setZoomLevel(nextLevel);
      requestCameraAnimation(nextLevel);
    }
  }, [zoomLevel, setZoomLevel, requestCameraAnimation]);

  const reorient = useCallback(() => {
    // Find and click the north star button if it exists
    const northStarButton = document.querySelector<HTMLButtonElement>(
      '[aria-label*="Reorient"], [aria-label*="Reset View"]'
    );
    if (northStarButton) {
      northStarButton.click();
    } else {
      // Fallback: reset to origin
      requestCameraAnimation('ecosystem', [0, 0, 0]);
    }
  }, [requestCameraAnimation]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Mac: Cmd key (metaKey)
      // Windows/Linux: Ctrl key (ctrlKey) - future support
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifierPressed = isMac ? e.metaKey : e.ctrlKey;

      // Story mode has its own keyboard handling (arrows, space, D, Esc)
      // Only handle zoom shortcuts when modifier is pressed
      if (modifierPressed) {
        // Cmd/Ctrl + Plus (or =) → Zoom In
        if (e.key === '+' || e.key === '=') {
          e.preventDefault();
          zoomIn();
          return;
        }

        // Cmd/Ctrl + Minus → Zoom Out
        if (e.key === '-') {
          e.preventDefault();
          zoomOut();
          return;
        }

        // Cmd/Ctrl + 0 → Reset view (north star)
        if (e.key === '0') {
          e.preventDefault();
          reorient();
          return;
        }
      }

      // Escape → Clear selection / Exit story mode (no modifier needed)
      if (e.key === 'Escape' && !storyModeActive) {
        e.preventDefault();
        clearSelection();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zoomIn, zoomOut, reorient, clearSelection, storyModeActive, toggleStoryMode]);
}
