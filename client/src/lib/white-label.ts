/**
 * OmniVor White-Label Configuration System
 *
 * Enables client-specific branding customization while maintaining
 * the core OmniVor platform architecture.
 *
 * Usage:
 * 1. Create a client config file (e.g., client-acme.json)
 * 2. Load config at app initialization
 * 3. Merge with base brand config
 * 4. CSS variables auto-update from merged config
 */

import { BRAND_CONFIG, type ModuleKey } from "./brand-config";

// ============================================================================
// WHITE-LABEL CONFIGURATION SCHEMA
// ============================================================================

/**
 * White-label override configuration.
 * All fields are optional - only specified values override defaults.
 */
export interface WhiteLabelConfig {
  /** Company branding (appears on splash, footer, legal) */
  company?: {
    name?: string;
    legalName?: string;
    shortName?: string;
    logoUrl?: string;
    faviconUrl?: string;
    copyright?: string;
  };

  /** Product branding (appears in-app after login) */
  product?: {
    name?: string;
    displayName?: string;
    tagline?: string;
  };

  /** Custom taglines for splash page rotation */
  taglines?: Array<{
    text: string;
    tone?: "primary" | "conservative" | "technical" | "explanatory";
  }>;

  /** Color overrides - values should be hex codes */
  colors?: {
    /** Primary brand color (replaces consumption-purple) */
    primary?: string;
    /** Primary hover/gradient color (replaces process-violet) */
    primaryHover?: string;
    /** Accent color for CTAs (replaces catalyst-gold) */
    accent?: string;
    /** Background color (replaces void-black) */
    background?: string;
    /** Foreground text color (replaces signal-white) */
    foreground?: string;
    /** Secondary text color (replaces data-gray) */
    textSecondary?: string;
    /** Muted text color (replaces muted-gray) */
    textMuted?: string;
    /** Border color (replaces border-gray) */
    border?: string;
  };

  /** Module name overrides */
  modules?: Partial<Record<ModuleKey, {
    label?: string;
    icon?: string;
    description?: string;
  }>>;

  /** Typography overrides */
  typography?: {
    fontFamily?: string;
    fontImport?: string;
  };

  /** Feature flags for client-specific features */
  features?: {
    /** Show/hide specific navigation items */
    hideModules?: ModuleKey[];
    /** Enable/disable AI recommendations */
    enableAI?: boolean;
    /** Custom support URL */
    supportUrl?: string;
    /** Custom documentation URL */
    docsUrl?: string;
  };
}

// ============================================================================
// MERGE UTILITIES
// ============================================================================

/**
 * Deep merge utility for nested objects.
 * Source values override target values.
 */
function deepMerge<T extends Record<string, unknown>>(
  target: T,
  source: Partial<T>
): T {
  const result = { ...target };

  for (const key in source) {
    const sourceValue = source[key];
    const targetValue = target[key];

    if (
      sourceValue !== undefined &&
      typeof sourceValue === "object" &&
      sourceValue !== null &&
      !Array.isArray(sourceValue) &&
      typeof targetValue === "object" &&
      targetValue !== null &&
      !Array.isArray(targetValue)
    ) {
      // Recursively merge objects
      (result as Record<string, unknown>)[key] = deepMerge(
        targetValue as Record<string, unknown>,
        sourceValue as Record<string, unknown>
      );
    } else if (sourceValue !== undefined) {
      // Override with source value
      (result as Record<string, unknown>)[key] = sourceValue;
    }
  }

  return result;
}

/** Mutable version of brand config for white-label merging */
type MutableBrandConfig = {
  company: {
    name: string;
    legalName: string;
    shortName: string;
    copyright: string;
    taglines: readonly { text: string; tone: string }[];
  };
  product: {
    name: string;
    displayName: string;
    tagline: string;
    subtitle: string;
  };
  taglines: { text: string; tone: string }[];
  modules: Record<string, { id: string; label: string; description: string; icon: string }>;
  colors: Record<string, string>;
  typography: {
    fontFamily: string;
    fontImport: string;
    weights: Record<string, number>;
    sizes: Record<string, string>;
  };
  animations: Record<string, string>;
  gradients: Record<string, string>;
};

/**
 * Merge white-label config with base brand config.
 * Returns a new merged config object.
 */
export function mergeWhiteLabelConfig(
  clientConfig: WhiteLabelConfig
): MutableBrandConfig {
  // Deep clone base config to make it mutable
  const merged: MutableBrandConfig = JSON.parse(JSON.stringify(BRAND_CONFIG));

  // Merge company settings
  if (clientConfig.company) {
    merged.company = { ...merged.company, ...clientConfig.company };
  }

  // Merge product settings
  if (clientConfig.product) {
    merged.product = { ...merged.product, ...clientConfig.product };
  }

  // Override taglines if provided
  if (clientConfig.taglines && clientConfig.taglines.length > 0) {
    merged.taglines = clientConfig.taglines.map((t) => ({
      text: t.text,
      tone: t.tone || "primary",
    }));
  }

  // Merge color mappings
  if (clientConfig.colors) {
    const colorMap: Record<string, string> = {
      primary: "consumptionPurple",
      primaryHover: "processViolet",
      accent: "catalystGold",
      background: "voidBlack",
      foreground: "signalWhite",
      textSecondary: "dataGray",
      textMuted: "mutedGray",
      border: "borderGray",
    };

    for (const [clientKey, brandKey] of Object.entries(colorMap)) {
      const clientColor = clientConfig.colors[clientKey as keyof typeof clientConfig.colors];
      if (clientColor) {
        merged.colors[brandKey] = clientColor;
      }
    }
  }

  // Merge module settings
  if (clientConfig.modules) {
    for (const [key, overrides] of Object.entries(clientConfig.modules)) {
      if (merged.modules[key] && overrides) {
        merged.modules[key] = {
          ...merged.modules[key],
          ...overrides,
        };
      }
    }
  }

  // Merge typography
  if (clientConfig.typography) {
    merged.typography = { ...merged.typography, ...clientConfig.typography };
  }

  return merged;
}

// ============================================================================
// CSS VARIABLE INJECTION
// ============================================================================

/**
 * Apply white-label colors to CSS custom properties.
 * Call this after merging config to update the DOM.
 */
export function applyWhiteLabelColors(config: MutableBrandConfig): void {
  const root = document.documentElement;

  // Map brand colors to CSS variables
  const cssVarMap: Record<string, string> = {
    voidBlack: "--void-black",
    consumptionPurple: "--consumption-purple",
    processViolet: "--process-violet",
    catalystGold: "--catalyst-gold",
    signalWhite: "--signal-white",
    dataGray: "--data-gray",
    mutedGray: "--muted-gray",
    borderGray: "--border-gray",
  };

  for (const [colorKey, cssVar] of Object.entries(cssVarMap)) {
    const colorValue = config.colors[colorKey];
    if (colorValue) {
      root.style.setProperty(cssVar, colorValue);
    }
  }

  // Update semantic mappings
  root.style.setProperty("--background", `var(--void-black)`);
  root.style.setProperty("--foreground", `var(--signal-white)`);
  root.style.setProperty("--primary", `var(--consumption-purple)`);
  root.style.setProperty("--accent", `var(--catalyst-gold)`);
}

/**
 * Apply white-label font family.
 */
export function applyWhiteLabelTypography(config: MutableBrandConfig): void {
  const root = document.documentElement;

  if (config.typography.fontFamily) {
    root.style.setProperty("--font-sans", config.typography.fontFamily);
  }

  // Inject font import if provided
  if (config.typography.fontImport) {
    const existingLink = document.querySelector(`link[href="${config.typography.fontImport}"]`);
    if (!existingLink) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = config.typography.fontImport;
      document.head.appendChild(link);
    }
  }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize white-label configuration.
 * Loads client config, merges with base, and applies to DOM.
 *
 * @param clientConfig - Optional client-specific configuration
 * @returns Merged brand configuration
 */
export function initWhiteLabel(
  clientConfig?: WhiteLabelConfig
): MutableBrandConfig {
  // If no client config, return base brand config as mutable
  if (!clientConfig) {
    return JSON.parse(JSON.stringify(BRAND_CONFIG));
  }

  // Merge configurations
  const mergedConfig = mergeWhiteLabelConfig(clientConfig);

  // Apply to DOM
  applyWhiteLabelColors(mergedConfig);
  applyWhiteLabelTypography(mergedConfig);

  return mergedConfig;
}

// ============================================================================
// EXAMPLE CLIENT CONFIG
// ============================================================================

/**
 * Example white-label configuration for reference.
 * This demonstrates all available customization options.
 */
export const EXAMPLE_CLIENT_CONFIG: WhiteLabelConfig = {
  company: {
    name: "Acme Pharma Analytics",
    legalName: "Acme Pharmaceuticals, Inc.",
    shortName: "ACME",
    logoUrl: "/assets/acme-logo.svg",
    faviconUrl: "/assets/acme-favicon.ico",
    copyright: "© 2026 Acme Pharmaceuticals",
  },
  product: {
    name: "Acme Insights",
    displayName: "Acme Insights Platform",
    tagline: "Precision analytics for healthcare.",
  },
  taglines: [
    { text: "Precision analytics for healthcare.", tone: "primary" },
    { text: "Data-driven HCP engagement.", tone: "conservative" },
    { text: "Intelligent prescriber insights.", tone: "technical" },
  ],
  colors: {
    primary: "#1e40af", // Blue
    primaryHover: "#3b82f6",
    accent: "#16a34a", // Green
    background: "#0f172a",
    foreground: "#f8fafc",
  },
  modules: {
    signalIndex: {
      label: "HCP Directory",
      description: "Explore healthcare professional profiles",
    },
    cohortLab: {
      label: "Audience Builder",
    },
  },
  features: {
    hideModules: ["agentOrchestrator"],
    enableAI: true,
    supportUrl: "https://support.acme.com",
  },
};

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type { MutableBrandConfig };
