/**
 * NavigationContext
 *
 * Phase 13.1: Context for tracking navigation path and drill-down context.
 * Enables breadcrumb navigation and context preservation across modules.
 *
 * @example
 * // Provider usage (in App.tsx)
 * <NavigationProvider>
 *   <App />
 * </NavigationProvider>
 *
 * // Consumer usage
 * const { path, push, pop, setContext } = useNavigation();
 * push({ label: 'Email Fatigue', href: '/hcp-explorer', params: { filter: 'email' } });
 */

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { useLocation } from 'wouter';

// ============================================================================
// TYPES
// ============================================================================

export interface PathItem {
  /** Display label for the breadcrumb */
  label: string;
  /** URL to navigate to */
  href: string;
  /** Optional query/filter parameters */
  params?: Record<string, string>;
  /** Optional icon identifier */
  icon?: string;
}

export interface NavigationContextValue {
  /** Current navigation path (breadcrumb trail) */
  path: PathItem[];
  /** Add a new item to the path */
  push: (item: PathItem) => void;
  /** Remove the last item from the path */
  pop: () => void;
  /** Clear the entire path */
  clear: () => void;
  /** Replace the current path with a new one */
  setPath: (path: PathItem[]) => void;
  /** Set context label for current page (updates last item) */
  setContext: (label: string, params?: Record<string, string>) => void;
  /** Get the previous item in the path */
  getPrevious: () => PathItem | null;
}

// ============================================================================
// CONTEXT
// ============================================================================

const NavigationContext = createContext<NavigationContextValue | null>(null);

// ============================================================================
// PROVIDER
// ============================================================================

export interface NavigationProviderProps {
  children: React.ReactNode;
  /** Maximum path depth before auto-trimming */
  maxDepth?: number;
}

export function NavigationProvider({ children, maxDepth = 5 }: NavigationProviderProps) {
  const [location] = useLocation();
  const [path, setPathState] = useState<PathItem[]>([]);

  // Push a new item to the path
  const push = useCallback(
    (item: PathItem) => {
      setPathState((prev) => {
        // Check if we're navigating back to an existing item
        const existingIndex = prev.findIndex((p) => p.href === item.href);
        if (existingIndex !== -1) {
          // Truncate to that point
          return prev.slice(0, existingIndex + 1);
        }

        // Add new item, respecting max depth
        const newPath = [...prev, item];
        if (newPath.length > maxDepth) {
          return newPath.slice(-maxDepth);
        }
        return newPath;
      });
    },
    [maxDepth]
  );

  // Pop the last item
  const pop = useCallback(() => {
    setPathState((prev) => prev.slice(0, -1));
  }, []);

  // Clear all items
  const clear = useCallback(() => {
    setPathState([]);
  }, []);

  // Replace the entire path
  const setPath = useCallback((newPath: PathItem[]) => {
    setPathState(newPath.slice(-5)); // Always respect max depth
  }, []);

  // Update the context of the current (last) item
  const setContext = useCallback((label: string, params?: Record<string, string>) => {
    setPathState((prev) => {
      if (prev.length === 0) return prev;
      const updated = [...prev];
      const last = updated[updated.length - 1];
      updated[updated.length - 1] = { ...last, label, params: { ...last.params, ...params } };
      return updated;
    });
  }, []);

  // Get the previous item
  const getPrevious = useCallback((): PathItem | null => {
    if (path.length < 2) return null;
    return path[path.length - 2];
  }, [path]);

  const value = useMemo(
    () => ({
      path,
      push,
      pop,
      clear,
      setPath,
      setContext,
      getPrevious,
    }),
    [path, push, pop, clear, setPath, setContext, getPrevious]
  );

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
}

// ============================================================================
// HOOK
// ============================================================================

export function useNavigation(): NavigationContextValue {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
}

// ============================================================================
// OPTIONAL HOOK (safe version that returns default)
// ============================================================================

export function useNavigationSafe(): NavigationContextValue | null {
  return useContext(NavigationContext);
}

// ============================================================================
// EXPORTS
// ============================================================================

export default NavigationContext;
