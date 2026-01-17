/**
 * useKeyboardShortcuts Hook
 *
 * Global keyboard shortcuts context and hook.
 * Manages shortcuts help modal (? key) and provides
 * context for keyboard navigation across the app.
 *
 * @see ROADMAP-PHASE9-INTERACTION-EXPERIENCE.md M9G.1
 */

import { useState, useEffect, useCallback, createContext, useContext } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface KeyboardShortcutsContextValue {
  /** Whether shortcuts modal is open */
  isShortcutsModalOpen: boolean;
  /** Open shortcuts modal */
  openShortcutsModal: () => void;
  /** Close shortcuts modal */
  closeShortcutsModal: () => void;
  /** Toggle shortcuts modal */
  toggleShortcutsModal: () => void;
  /** Whether keyboard navigation is globally enabled */
  keyboardNavigationEnabled: boolean;
  /** Enable/disable keyboard navigation */
  setKeyboardNavigationEnabled: (enabled: boolean) => void;
  /** Current focused section (for multi-section pages) */
  focusedSection: string | null;
  /** Set focused section */
  setFocusedSection: (section: string | null) => void;
}

// ============================================================================
// CONTEXT
// ============================================================================

const KeyboardShortcutsContext = createContext<KeyboardShortcutsContextValue | null>(null);

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook to manage global keyboard shortcuts state.
 * Use at app level to provide context.
 */
export function useKeyboardShortcutsState(): KeyboardShortcutsContextValue {
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [keyboardNavigationEnabled, setKeyboardNavigationEnabled] = useState(true);
  const [focusedSection, setFocusedSection] = useState<string | null>(null);

  // Global keyboard handler for ? shortcut
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger if in input field
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // ? to show shortcuts (Shift + /)
      if (event.key === '?' || (event.shiftKey && event.key === '/')) {
        event.preventDefault();
        setIsShortcutsModalOpen((prev) => !prev);
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const openShortcutsModal = useCallback(() => {
    setIsShortcutsModalOpen(true);
  }, []);

  const closeShortcutsModal = useCallback(() => {
    setIsShortcutsModalOpen(false);
  }, []);

  const toggleShortcutsModal = useCallback(() => {
    setIsShortcutsModalOpen((prev) => !prev);
  }, []);

  return {
    isShortcutsModalOpen,
    openShortcutsModal,
    closeShortcutsModal,
    toggleShortcutsModal,
    keyboardNavigationEnabled,
    setKeyboardNavigationEnabled,
    focusedSection,
    setFocusedSection,
  };
}

/**
 * Hook to access keyboard shortcuts context from any component.
 */
export function useKeyboardShortcuts(): KeyboardShortcutsContextValue {
  const context = useContext(KeyboardShortcutsContext);
  if (!context) {
    throw new Error('useKeyboardShortcuts must be used within KeyboardShortcutsProvider');
  }
  return context;
}

// ============================================================================
// PROVIDER
// ============================================================================

export const KeyboardShortcutsProvider = KeyboardShortcutsContext.Provider;

// ============================================================================
// FOCUS MANAGEMENT UTILITIES
// ============================================================================

/**
 * Check if an element is currently focused or an input-like element
 */
export function isInputFocused(): boolean {
  const target = document.activeElement as HTMLElement;
  if (!target) return false;
  return (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.isContentEditable ||
    target.getAttribute('role') === 'textbox'
  );
}

/**
 * Check if a modal or dialog is currently open
 */
export function isModalOpen(): boolean {
  return (
    document.querySelector('[role="dialog"][data-state="open"]') !== null ||
    document.querySelector('[role="alertdialog"][data-state="open"]') !== null
  );
}

// ============================================================================
// PREFERS REDUCED MOTION
// ============================================================================

/**
 * Hook to check if user prefers reduced motion
 */
export function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return prefersReducedMotion;
}

// ============================================================================
// EXPORTS
// ============================================================================

export { KeyboardShortcutsContext };
