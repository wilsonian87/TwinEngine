/**
 * OmniVor Brand Copy Library
 *
 * Centralized UI copy strings following brand voice guidelines:
 * - Confident and direct
 * - Technical but accessible
 * - No apologetic language
 * - Metabolism/consumption metaphors where appropriate
 */

export const BRAND_COPY = {
  // Loading states
  loading: {
    default: "Processing...",
    data: "Consuming signals...",
    simulation: "Computing scenarios...",
    analysis: "Analyzing patterns...",
    search: "Scanning index...",
  },

  // Empty states
  empty: {
    default: "No signals yet.",
    hcps: "No HCPs match your criteria.",
    simulations: "No scenarios run yet.",
    audiences: "No cohorts defined.",
    results: "No signals match.",
    history: "No query history.",
  },

  // Error states
  error: {
    default: "Connection interrupted.",
    retry: "Connection interrupted. Reconnecting.",
    load: "Failed to consume data.",
    save: "Failed to capture.",
    network: "Signal lost. Retrying.",
  },

  // Success states
  success: {
    saved: "Captured successfully.",
    exported: "Data extracted.",
    simulation: "Scenario complete.",
    audience: "Cohort captured.",
  },

  // Actions (button/CTA labels)
  actions: {
    save: "Capture",
    download: "Extract",
    export: "Extract Data",
    delete: "Remove",
    cancel: "Dismiss",
    confirm: "Confirm",
    retry: "Reconnect",
    refresh: "Refresh Signals",
    submit: "Process",
    search: "Scan",
    filter: "Refine",
    clear: "Clear",
    reset: "Reset",
    view: "Examine",
    details: "View Details",
    simulate: "Run Scenario",
    apply: "Apply",
  },

  // Labels
  labels: {
    engagement: "Signal Score",
    engagementShort: "Signal",
    hcp: "HCP",
    hcps: "HCPs",
    audience: "Cohort",
    audiences: "Cohorts",
    simulation: "Scenario",
    simulations: "Scenarios",
    dashboard: "Nerve Center",
    explorer: "Signal Index",
    builder: "Cohort Lab",
    queue: "Catalyst Queue",
  },

  // Tooltips and hints
  hints: {
    multiSelect: "Ctrl+click to select multiple",
    rangeSelect: "Shift+click for range selection",
    search: "Describe your target audience...",
    filter: "Refine your signal selection",
  },

  // Dynamic messages
  messages: {
    welcome: (signals: number, patterns: number) =>
      `OmniVor has processed ${signals.toLocaleString()} signals since your last session. ${patterns} patterns have crystallized.`,
    resultsFound: (count: number) =>
      `${count.toLocaleString()} signal${count !== 1 ? "s" : ""} detected.`,
    itemsSelected: (count: number) =>
      `${count} ${count !== 1 ? "items" : "item"} selected`,
    savedAs: (name: string) => `Captured as "${name}"`,
    exportComplete: (count: number) =>
      `Extracted ${count.toLocaleString()} records.`,
    simulationComplete: (lift: number, engagement: number) =>
      `Predicted ${lift.toFixed(1)}% Rx lift with ${engagement.toFixed(1)}% engagement rate.`,
  },

  // Module descriptions
  modules: {
    signalIndex: "Explore and analyze HCP engagement signals",
    cohortLab: "Build and explore HCP cohorts using natural language",
    scenarioLab: "Build and run what-if scenarios to optimize engagement",
    catalystQueue: "Review and action pending recommendations",
    nerveCenter: "Strategic intelligence dashboard",
  },
} as const;

// Helper function to get copy with fallback
export function getCopy<T extends keyof typeof BRAND_COPY>(
  category: T,
  key: keyof typeof BRAND_COPY[T]
): string {
  const categoryObj = BRAND_COPY[category];
  const value = categoryObj[key as keyof typeof categoryObj];
  return typeof value === "string" ? value : String(value);
}

// Type exports
export type BrandCopyCategory = keyof typeof BRAND_COPY;
