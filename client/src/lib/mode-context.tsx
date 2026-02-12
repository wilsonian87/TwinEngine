/**
 * Platform Mode Context
 *
 * Provides Discover/Direct mode switching across the application.
 * Mode affects only presentation and information density — never data access or business logic.
 *
 * - Discover Mode: Full data density, all controls visible. The workshop.
 * - Direct Mode: Curated, AI-narrated, action-oriented. The gallery.
 *
 * Persistence: Mode preference stored via feature flag system (localStorage fallback).
 * State: Filters, selections, React Query cache all persist across mode switch.
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

export type PlatformMode = 'discover' | 'direct';

interface ModeContextValue {
  mode: PlatformMode;
  setMode: (mode: PlatformMode) => void;
  toggleMode: () => void;
  isDirectMode: boolean;
  isDiscoverMode: boolean;
}

const ModeContext = createContext<ModeContextValue>({
  mode: 'direct',
  setMode: () => {},
  toggleMode: () => {},
  isDirectMode: true,
  isDiscoverMode: false,
});

const STORAGE_KEY = 'omnivor-platform-mode';

export function ModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<PlatformMode>(() => {
    if (typeof window === 'undefined') return 'direct';
    const stored = localStorage.getItem(STORAGE_KEY);
    return (stored === 'discover' || stored === 'direct') ? stored : 'direct';
  });

  const setMode = useCallback((newMode: PlatformMode) => {
    setModeState(newMode);
    localStorage.setItem(STORAGE_KEY, newMode);
  }, []);

  const toggleMode = useCallback(() => {
    setMode(mode === 'discover' ? 'direct' : 'discover');
  }, [mode, setMode]);

  // Sync across tabs
  useEffect(() => {
    function handleStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY && (e.newValue === 'discover' || e.newValue === 'direct')) {
        setModeState(e.newValue);
      }
    }
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return (
    <ModeContext.Provider
      value={{
        mode,
        setMode,
        toggleMode,
        isDirectMode: mode === 'direct',
        isDiscoverMode: mode === 'discover',
      }}
    >
      {children}
    </ModeContext.Provider>
  );
}

export function useMode() {
  const context = useContext(ModeContext);
  if (!context) {
    throw new Error('useMode must be used within a ModeProvider');
  }
  return context;
}

export { ModeContext };
