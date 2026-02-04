/**
 * OMNIVOR LABS Brand Configuration
 *
 * Single source of truth for all brand values, enabling:
 * - Consistent brand application across the platform
 * - Easy white-label customization for future clients
 * - Type-safe access to brand tokens
 *
 * @see OMNIVOR_LABS___Brand_BibleVersion1_1.md for full brand guidelines
 */

// ============================================================================
// CORE BRAND CONFIGURATION
// ============================================================================

export const BRAND_CONFIG = {
  // Company identity (appears on splash, footer, legal)
  company: {
    name: "OMNIVOR LABS",
    legalName: "OMNIVOR LABS",
    shortName: "OMNIVOR",
    copyright: `\u00A9 ${new Date().getFullYear()} OMNIVOR LABS`,
    taglines: [
      { text: "Feeds on complexity.", tone: "primary" as const },
      { text: "Nothing wasted. Nothing missed.", tone: "conservative" as const },
      { text: "Complexity, metabolized.", tone: "technical" as const },
      { text: "Raw data in. Evolved insight out.", tone: "explanatory" as const },
    ],
  },

  // Product identity (appears in-app after login)
  product: {
    name: "OmniVor",
    displayName: "OmniVor",
    tagline: "Strategic Intelligence Platform",
    subtitle: "HCP Engagement Analytics",
  },

  // Module naming - Phase 13: descriptive, white-label ready
  modules: {
    dashboard: {
      id: "dashboard",
      label: "Dashboard",
      description: "Analytics & metrics dashboard",
      icon: "activity" as const,
    },
    hcpExplorer: {
      id: "hcp-explorer",
      label: "HCP Explorer",
      description: "HCP profile exploration",
      icon: "search" as const,
    },
    audienceBuilder: {
      id: "audience-builder",
      label: "Audience Builder",
      description: "AI-powered audience building",
      icon: "users" as const,
    },
    simulationStudio: {
      id: "simulation-studio",
      label: "Simulation Studio",
      description: "Campaign simulation",
      icon: "flask-conical" as const,
    },
    channelHealth: {
      id: "channel-health",
      label: "Channel Health",
      description: "Channel health analysis",
      icon: "stethoscope" as const,
    },
    actionQueue: {
      id: "action-queue",
      label: "Action Queue",
      description: "Next best actions",
      icon: "zap" as const,
    },
    audienceComparison: {
      id: "audience-comparison",
      label: "Audience Comparison",
      description: "Side-by-side audience analysis",
      icon: "git-compare" as const,
    },
    constraints: {
      id: "constraints",
      label: "Constraints",
      description: "Capacity, budget & compliance",
      icon: "shield" as const,
    },
    portfolioOptimizer: {
      id: "portfolio-optimizer",
      label: "Portfolio Optimizer",
      description: "Portfolio optimization",
      icon: "beaker" as const,
    },
    agentManager: {
      id: "agent-manager",
      label: "Agent Manager",
      description: "Autonomous agents & alerts",
      icon: "bot" as const,
    },
    omnivorLabs: {
      id: "omnivor-labs",
      label: "OmniVor Labs",
      description: "About & settings",
      icon: "hexagon" as const,
    },
  },

  // Brand color palette
  colors: {
    // Primary
    voidBlack: "#0a0a0b",
    consumptionPurple: "#6b21a8",

    // Secondary
    processViolet: "#a855f7",
    catalystGold: "#d97706",
    signalWhite: "#fafafa",

    // Supporting
    dataGray: "#71717a",
    mutedGray: "#52525b",
    borderGray: "#27272a",

    // Semantic status colors
    success: "#22c55e",
    warning: "#eab308",
    error: "#ef4444",
    info: "#3b82f6",
  },

  // Typography system
  typography: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontImport: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap",
    weights: {
      light: 300,
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800,
      black: 900,
    },
    sizes: {
      xs: "0.625rem",    // 10px - labels
      sm: "0.75rem",     // 12px - small text
      base: "0.875rem",  // 14px - body
      md: "1rem",        // 16px - emphasis
      lg: "1.125rem",    // 18px - subheadings
      xl: "1.25rem",     // 20px - taglines
      "2xl": "1.5rem",   // 24px - section headers
      "3xl": "2rem",     // 32px - page titles
      "4xl": "2.5rem",   // 40px - H1
      "5xl": "3rem",     // 48px - display
      "6xl": "4rem",     // 64px - hero
    },
  },

  // Animation timing (brand spec)
  animation: {
    duration: {
      micro: "150ms",    // Micro-interactions
      ui: "250ms",       // UI transitions
      page: "350ms",     // Page transitions
      hero: "800ms",     // Hero animations
      slow: "1000ms",    // Convergence, subtle background
    },
    easing: {
      out: "cubic-bezier(0.16, 1, 0.3, 1)",
      inOut: "cubic-bezier(0.65, 0, 0.35, 1)",
      spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
    },
  },

  // Brand voice copy patterns
  copy: {
    // Loading states
    loading: "Processing...",
    loadingAlt: "Consuming signals...",
    loadingData: "Synthesizing data...",

    // Empty states
    empty: "No signals yet.",
    emptyConnect: "Connect channels to begin.",
    emptySearch: "No signals match your criteria.",
    emptyQueue: "Queue clear. All actions processed.",

    // Error states
    error: "Connection interrupted.",
    errorRetry: "Reconnecting...",
    errorNetwork: "Signal lost. Check connection.",

    // Success states
    success: "Complete.",
    successCount: (n: number) => `${n} signal${n === 1 ? '' : 's'} processed.`,
    successInsight: (n: number) => `${n} pattern${n === 1 ? '' : 's'} crystallized.`,

    // Welcome messages
    welcome: (signals: number, patterns: number) =>
      `OmniVor has processed ${signals.toLocaleString()} signals since your last session. ${patterns} patterns have crystallized.`,
    welcomeShort: "Welcome back to OmniVor.",

    // Action labels (brand voice)
    actionExtract: "Extract",        // instead of "Download"
    actionCapture: "Capture",        // instead of "Save"
    actionProcess: "Process",        // instead of "Submit"
    actionAnalyze: "Analyze",        // instead of "Run"
    actionConnect: "Connect",        // instead of "Link"
    actionDissolve: "Dissolve",      // instead of "Delete"
  },

  // Gradients
  gradients: {
    brand: "linear-gradient(135deg, #6b21a8 0%, #4c1d95 100%)",
    glow: "radial-gradient(ellipse at center, rgba(107, 33, 168, 0.15) 0%, transparent 70%)",
    transform: "linear-gradient(90deg, rgba(107, 33, 168, 0.1) 0%, rgba(217, 119, 6, 0.1) 100%)",
    heroGlow: "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(107, 33, 168, 0.3), transparent)",
    cardElevated: "linear-gradient(135deg, rgba(107, 33, 168, 0.1) 0%, #0a0a0b 100%)",
  },
} as const;

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type BrandConfig = typeof BRAND_CONFIG;
export type ModuleKey = keyof typeof BRAND_CONFIG.modules;
export type ColorKey = keyof typeof BRAND_CONFIG.colors;
export type TaglineTone = typeof BRAND_CONFIG.company.taglines[number]["tone"];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get a module's display label by key
 */
export function getModuleLabel(key: ModuleKey): string {
  return BRAND_CONFIG.modules[key]?.label ?? key;
}

/**
 * Get a module's description by key
 */
export function getModuleDescription(key: ModuleKey): string {
  return BRAND_CONFIG.modules[key]?.description ?? "";
}

/**
 * Get a color value by key
 */
export function getColor(key: ColorKey): string {
  return BRAND_CONFIG.colors[key];
}

/**
 * Get a random tagline
 */
export function getRandomTagline(): { text: string; tone: TaglineTone } {
  const index = Math.floor(Math.random() * BRAND_CONFIG.company.taglines.length);
  return BRAND_CONFIG.company.taglines[index];
}

/**
 * Get tagline by index (for session-based rotation)
 */
export function getTaglineByIndex(index: number): { text: string; tone: TaglineTone } {
  const safeIndex = index % BRAND_CONFIG.company.taglines.length;
  return BRAND_CONFIG.company.taglines[safeIndex];
}

/**
 * Get the primary tagline
 */
export function getPrimaryTagline(): string {
  return BRAND_CONFIG.company.taglines.find(t => t.tone === "primary")?.text ?? BRAND_CONFIG.company.taglines[0].text;
}

/**
 * Format a metric with brand voice
 */
export function formatMetricLabel(value: number, type: "signals" | "patterns" | "insights"): string {
  const formatted = value.toLocaleString();
  switch (type) {
    case "signals":
      return `${formatted} signal${value === 1 ? '' : 's'}`;
    case "patterns":
      return `${formatted} pattern${value === 1 ? '' : 's'}`;
    case "insights":
      return `${formatted} insight${value === 1 ? '' : 's'}`;
    default:
      return formatted;
  }
}

// ============================================================================
// CSS VARIABLE MAPPING
// ============================================================================

/**
 * Generate CSS custom properties from brand config
 * Used for runtime theme injection
 */
export function generateCSSVariables(): Record<string, string> {
  return {
    "--void-black": BRAND_CONFIG.colors.voidBlack,
    "--consumption-purple": BRAND_CONFIG.colors.consumptionPurple,
    "--process-violet": BRAND_CONFIG.colors.processViolet,
    "--catalyst-gold": BRAND_CONFIG.colors.catalystGold,
    "--signal-white": BRAND_CONFIG.colors.signalWhite,
    "--data-gray": BRAND_CONFIG.colors.dataGray,
    "--muted-gray": BRAND_CONFIG.colors.mutedGray,
    "--border-gray": BRAND_CONFIG.colors.borderGray,
    "--font-sans": BRAND_CONFIG.typography.fontFamily,
    "--duration-micro": BRAND_CONFIG.animation.duration.micro,
    "--duration-ui": BRAND_CONFIG.animation.duration.ui,
    "--duration-page": BRAND_CONFIG.animation.duration.page,
    "--duration-hero": BRAND_CONFIG.animation.duration.hero,
    "--ease-out": BRAND_CONFIG.animation.easing.out,
    "--ease-in-out": BRAND_CONFIG.animation.easing.inOut,
  };
}
