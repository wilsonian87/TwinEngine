/**
 * useCommandPalette Hook
 *
 * Global keyboard handler for command palette (⌘K / Ctrl+K).
 * Manages open state and provides navigation utilities.
 *
 * @see ROADMAP-PHASE9-INTERACTION-EXPERIENCE.md M9C.2
 */

import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { useLocation } from 'wouter';

// ============================================================================
// TYPES
// ============================================================================

export interface CommandPaletteContextValue {
  /** Whether the command palette is open */
  isOpen: boolean;
  /** Open the command palette */
  open: () => void;
  /** Close the command palette */
  close: () => void;
  /** Toggle the command palette */
  toggle: () => void;
  /** Set open state */
  setOpen: (open: boolean) => void;
  /** Navigate to a path and close palette */
  navigateTo: (path: string) => void;
  /** Recent items for quick access */
  recentItems: RecentItem[];
  /** Add item to recent history */
  addRecentItem: (item: RecentItem) => void;
  /** Search query */
  searchQuery: string;
  /** Set search query */
  setSearchQuery: (query: string) => void;
}

export interface RecentItem {
  id: string;
  type: 'page' | 'hcp' | 'audience' | 'action';
  label: string;
  path: string;
  icon?: string;
  timestamp: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const MAX_RECENT_ITEMS = 5;
const RECENT_ITEMS_KEY = 'omnivor-recent-items';

// ============================================================================
// CONTEXT
// ============================================================================

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(null);

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook to manage command palette state and keyboard shortcuts.
 * Use this at the app level to provide context.
 */
export function useCommandPaletteState(): CommandPaletteContextValue {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [recentItems, setRecentItems] = useState<RecentItem[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(RECENT_ITEMS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [, navigate] = useLocation();

  // Save recent items to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(RECENT_ITEMS_KEY, JSON.stringify(recentItems));
    } catch {
      // Ignore localStorage errors
    }
  }, [recentItems]);

  // Global keyboard handler
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // ⌘K or Ctrl+K to toggle
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        setIsOpen((prev) => !prev);
        if (!isOpen) {
          setSearchQuery(''); // Clear search when opening
        }
        return;
      }

      // Escape to close
      if (event.key === 'Escape' && isOpen) {
        event.preventDefault();
        setIsOpen(false);
        return;
      }

      // / to open (when not in an input)
      if (event.key === '/' && !isOpen) {
        const target = event.target as HTMLElement;
        const isInputFocused =
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable;

        if (!isInputFocused) {
          event.preventDefault();
          setIsOpen(true);
          setSearchQuery('');
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const open = useCallback(() => {
    setIsOpen(true);
    setSearchQuery('');
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggle = useCallback(() => {
    setIsOpen((prev) => !prev);
    if (!isOpen) {
      setSearchQuery('');
    }
  }, [isOpen]);

  const navigateTo = useCallback(
    (path: string) => {
      navigate(path);
      setIsOpen(false);
    },
    [navigate]
  );

  const addRecentItem = useCallback((item: RecentItem) => {
    setRecentItems((prev) => {
      // Remove existing item with same id
      const filtered = prev.filter((i) => i.id !== item.id);
      // Add new item at the beginning
      const updated = [{ ...item, timestamp: Date.now() }, ...filtered];
      // Keep only max items
      return updated.slice(0, MAX_RECENT_ITEMS);
    });
  }, []);

  return {
    isOpen,
    open,
    close,
    toggle,
    setOpen: setIsOpen,
    navigateTo,
    recentItems,
    addRecentItem,
    searchQuery,
    setSearchQuery,
  };
}

/**
 * Hook to access command palette from any component.
 */
export function useCommandPalette(): CommandPaletteContextValue {
  const context = useContext(CommandPaletteContext);
  if (!context) {
    throw new Error('useCommandPalette must be used within CommandPaletteProvider');
  }
  return context;
}

// ============================================================================
// PROVIDER
// ============================================================================

export const CommandPaletteProvider = CommandPaletteContext.Provider;

// ============================================================================
// KEYBOARD NAVIGATION HOOK
// ============================================================================

export interface UseKeyboardNavigationOptions {
  /** IDs of navigable items */
  items: string[];
  /** Callback when an item is selected */
  onSelect: (id: string) => void;
  /** Optional callback for item actions */
  onAction?: (id: string, action: 'edit' | 'delete' | 'view') => void;
  /** Whether keyboard navigation is enabled */
  enabled?: boolean;
  /** Whether to wrap around at ends */
  wrap?: boolean;
}

/**
 * Hook for keyboard navigation within lists.
 */
export function useKeyboardNavigation({
  items,
  onSelect,
  onAction,
  enabled = true,
  wrap = true,
}: UseKeyboardNavigationOptions) {
  const [focusedIndex, setFocusedIndex] = useState(0);

  useEffect(() => {
    if (!enabled || items.length === 0) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't handle if in input
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      switch (event.key) {
        case 'j':
        case 'ArrowDown':
          event.preventDefault();
          setFocusedIndex((prev) => {
            if (prev >= items.length - 1) {
              return wrap ? 0 : prev;
            }
            return prev + 1;
          });
          break;

        case 'k':
        case 'ArrowUp':
          event.preventDefault();
          setFocusedIndex((prev) => {
            if (prev <= 0) {
              return wrap ? items.length - 1 : prev;
            }
            return prev - 1;
          });
          break;

        case 'Enter':
          event.preventDefault();
          if (items[focusedIndex]) {
            onSelect(items[focusedIndex]);
          }
          break;

        case 'e':
          if (onAction && items[focusedIndex]) {
            event.preventDefault();
            onAction(items[focusedIndex], 'edit');
          }
          break;

        case 'd':
          if (onAction && items[focusedIndex]) {
            event.preventDefault();
            onAction(items[focusedIndex], 'delete');
          }
          break;

        case 'v':
          if (onAction && items[focusedIndex]) {
            event.preventDefault();
            onAction(items[focusedIndex], 'view');
          }
          break;

        case 'Home':
          event.preventDefault();
          setFocusedIndex(0);
          break;

        case 'End':
          event.preventDefault();
          setFocusedIndex(items.length - 1);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enabled, items, focusedIndex, onSelect, onAction, wrap]);

  // Reset focus when items change
  useEffect(() => {
    setFocusedIndex(0);
  }, [items.length]);

  return {
    focusedIndex,
    setFocusedIndex,
    focusedId: items[focusedIndex],
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export { CommandPaletteContext };
