/**
 * usePhase11Keyboard - Keyboard shortcuts for Phase 11 navigation
 *
 * Phase 11E: Keyboard navigation for the three-level hierarchy.
 * - Esc: Go back one level (L3→L2→L1)
 * - Backspace: Go back one level
 * - Home: Return to L1
 */

import { useEffect, useCallback } from 'react';
import { useConstellationStore } from '@/stores/constellationStore';

export function usePhase11Keyboard() {
  const {
    navigationContext,
    navigateToL1,
    navigateToL2,
    viewMode,
  } = useConstellationStore();

  // Handle going back one level
  const handleBack = useCallback(() => {
    if (viewMode !== 'phase11') return;

    switch (navigationContext.level) {
      case 'L3':
        // Go back to L2
        navigateToL2(navigationContext.channelId, navigationContext.channelLabel);
        break;
      case 'L2':
        // Go back to L1
        navigateToL1();
        break;
      case 'L1':
        // Already at top level, do nothing
        break;
    }
  }, [navigationContext, navigateToL1, navigateToL2, viewMode]);

  // Handle going to home (L1)
  const handleHome = useCallback(() => {
    if (viewMode !== 'phase11') return;
    navigateToL1();
  }, [navigateToL1, viewMode]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Skip if user is typing in an input
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Skip if Phase 11 view is not active
      if (viewMode !== 'phase11') return;

      switch (event.key) {
        case 'Escape':
        case 'Backspace':
          event.preventDefault();
          handleBack();
          break;

        case 'Home':
          event.preventDefault();
          handleHome();
          break;

        // Number keys for quick level access (optional)
        case '1':
          if (event.metaKey || event.ctrlKey) {
            event.preventDefault();
            navigateToL1();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleBack, handleHome, viewMode, navigateToL1]);

  return {
    handleBack,
    handleHome,
  };
}
