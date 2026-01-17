/**
 * OmniVor Brand Context Provider
 *
 * Provides brand configuration access throughout the application.
 * Enables session-based tagline rotation and centralized brand value access.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  BRAND_CONFIG,
  getModuleLabel,
  getModuleDescription,
  getColor,
  getTaglineByIndex,
  type ModuleKey,
  type ColorKey,
  type TaglineTone,
} from '@/lib/brand-config';

// ============================================================================
// TYPES
// ============================================================================

interface BrandContextValue {
  /** Full brand configuration object */
  config: typeof BRAND_CONFIG;

  /** Current session tagline (rotates each session) */
  currentTagline: string;

  /** Current tagline's tone */
  currentTaglineTone: TaglineTone;

  /** Manually rotate to next tagline */
  rotateTagline: () => void;

  /** Get a module's display label */
  getModuleName: (key: ModuleKey) => string;

  /** Get a module's description */
  getModuleDescription: (key: ModuleKey) => string;

  /** Get a color value by key */
  getColor: (key: ColorKey) => string;

  /** Get brand copy for common UI states */
  getCopy: (key: keyof typeof BRAND_CONFIG.copy) => string | ((...args: never[]) => string);
}

// ============================================================================
// CONTEXT
// ============================================================================

const BrandContext = createContext<BrandContextValue | null>(null);

// Storage key for tagline rotation
const TAGLINE_STORAGE_KEY = 'omnivor_tagline_index';

// ============================================================================
// PROVIDER
// ============================================================================

interface BrandProviderProps {
  children: React.ReactNode;
}

export function BrandProvider({ children }: BrandProviderProps) {
  const [taglineIndex, setTaglineIndex] = useState(0);

  // Initialize tagline from sessionStorage (rotates each session)
  useEffect(() => {
    const stored = sessionStorage.getItem(TAGLINE_STORAGE_KEY);
    if (stored !== null) {
      // Rotate to next tagline on new page load within same session
      // For new session, sessionStorage will be empty
      const currentIndex = parseInt(stored, 10);
      if (!isNaN(currentIndex)) {
        setTaglineIndex(currentIndex);
      }
    } else {
      // First visit in this session - pick random tagline
      const randomIndex = Math.floor(Math.random() * BRAND_CONFIG.company.taglines.length);
      setTaglineIndex(randomIndex);
      sessionStorage.setItem(TAGLINE_STORAGE_KEY, String(randomIndex));
    }
  }, []);

  // Rotate to next tagline
  const rotateTagline = useCallback(() => {
    setTaglineIndex((prev) => {
      const next = (prev + 1) % BRAND_CONFIG.company.taglines.length;
      sessionStorage.setItem(TAGLINE_STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  // Get module name helper
  const getModuleNameFn = useCallback((key: ModuleKey): string => {
    return getModuleLabel(key);
  }, []);

  // Get module description helper
  const getModuleDescriptionFn = useCallback((key: ModuleKey): string => {
    return getModuleDescription(key);
  }, []);

  // Get color helper
  const getColorFn = useCallback((key: ColorKey): string => {
    return getColor(key);
  }, []);

  // Get copy helper
  const getCopy = useCallback((key: keyof typeof BRAND_CONFIG.copy) => {
    return BRAND_CONFIG.copy[key];
  }, []);

  // Current tagline data
  const currentTaglineData = useMemo(() => {
    return getTaglineByIndex(taglineIndex);
  }, [taglineIndex]);

  // Context value
  const value = useMemo<BrandContextValue>(() => ({
    config: BRAND_CONFIG,
    currentTagline: currentTaglineData.text,
    currentTaglineTone: currentTaglineData.tone,
    rotateTagline,
    getModuleName: getModuleNameFn,
    getModuleDescription: getModuleDescriptionFn,
    getColor: getColorFn,
    getCopy,
  }), [currentTaglineData, rotateTagline, getModuleNameFn, getModuleDescriptionFn, getColorFn, getCopy]);

  return (
    <BrandContext.Provider value={value}>
      {children}
    </BrandContext.Provider>
  );
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Access the full brand context
 *
 * @example
 * const { config, currentTagline, getModuleName } = useBrand();
 */
export function useBrand(): BrandContextValue {
  const context = useContext(BrandContext);
  if (!context) {
    throw new Error('useBrand must be used within a BrandProvider');
  }
  return context;
}

/**
 * Get the current session tagline
 *
 * @example
 * const { text, tone, rotate } = useTagline();
 */
export function useTagline() {
  const { currentTagline, currentTaglineTone, rotateTagline } = useBrand();
  return {
    text: currentTagline,
    tone: currentTaglineTone,
    rotate: rotateTagline,
  };
}

/**
 * Get a module's display name
 *
 * @example
 * const moduleName = useModuleName('signalIndex'); // "Signal Index"
 */
export function useModuleName(key: ModuleKey): string {
  const { getModuleName } = useBrand();
  return getModuleName(key);
}

/**
 * Get brand colors
 *
 * @example
 * const { primary, accent } = useBrandColors();
 */
export function useBrandColors() {
  const { getColor } = useBrand();
  return {
    primary: getColor('consumptionPurple'),
    accent: getColor('catalystGold'),
    background: getColor('voidBlack'),
    foreground: getColor('signalWhite'),
    muted: getColor('mutedGray'),
    border: getColor('borderGray'),
  };
}

/**
 * Get brand copy for a specific key
 *
 * @example
 * const loadingText = useBrandCopy('loading'); // "Processing..."
 */
export function useBrandCopy<K extends keyof typeof BRAND_CONFIG.copy>(key: K) {
  const { getCopy } = useBrand();
  return getCopy(key) as typeof BRAND_CONFIG.copy[K];
}
