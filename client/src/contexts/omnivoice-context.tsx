/**
 * Omni-Voice Context Provider
 *
 * Provides page context (current HCP, campaign, etc.) to the Omni-Voice chat widget.
 * Components can update the context when user navigates or selects items.
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useLocation } from "wouter";
import type { OmniVoiceContext } from "@/hooks/use-omnivoice";

// ============================================================================
// TYPES
// ============================================================================

interface OmniVoiceContextValue {
  /** Current context to inject into chat */
  context: OmniVoiceContext;
  /** Update context with new values */
  updateContext: (updates: Partial<OmniVoiceContext>) => void;
  /** Set the selected HCP */
  setHcp: (hcp: OmniVoiceContext["hcp"] | null) => void;
  /** Set the selected campaign */
  setCampaign: (campaign: OmniVoiceContext["campaign"] | null) => void;
  /** Set the therapeutic area */
  setTherapeuticArea: (ta: string | null) => void;
  /** Set custom context string */
  setCustomContext: (custom: string | null) => void;
  /** Clear all context */
  clearContext: () => void;
}

// ============================================================================
// CONTEXT
// ============================================================================

const OmniVoiceCtx = createContext<OmniVoiceContextValue | null>(null);

// ============================================================================
// PAGE NAME MAPPING
// ============================================================================

function getPageName(pathname: string): string {
  const pageMap: Record<string, string> = {
    "/": "Dashboard",
    "/hcps": "HCP Explorer",
    "/simulations": "Simulations",
    "/audiences": "Audience Builder",
    "/campaigns": "Campaigns",
    "/settings": "Settings",
    "/analytics": "Analytics",
    "/reports": "Reports",
  };

  // Check exact matches first
  if (pageMap[pathname]) {
    return pageMap[pathname];
  }

  // Check pattern matches
  if (pathname.startsWith("/hcps/")) {
    return "HCP Profile";
  }
  if (pathname.startsWith("/simulations/")) {
    return "Simulation Details";
  }
  if (pathname.startsWith("/campaigns/")) {
    return "Campaign Details";
  }

  return "TwinEngine";
}

// ============================================================================
// PROVIDER
// ============================================================================

export function OmniVoiceProvider({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [context, setContext] = useState<OmniVoiceContext>({});

  // Auto-update page context based on route
  const currentPage = getPageName(location);
  const contextWithPage: OmniVoiceContext = {
    ...context,
    page: currentPage,
  };

  const updateContext = useCallback((updates: Partial<OmniVoiceContext>) => {
    setContext((prev) => ({ ...prev, ...updates }));
  }, []);

  const setHcp = useCallback((hcp: OmniVoiceContext["hcp"] | null) => {
    setContext((prev) => ({
      ...prev,
      hcp: hcp || undefined,
    }));
  }, []);

  const setCampaign = useCallback((campaign: OmniVoiceContext["campaign"] | null) => {
    setContext((prev) => ({
      ...prev,
      campaign: campaign || undefined,
    }));
  }, []);

  const setTherapeuticArea = useCallback((ta: string | null) => {
    setContext((prev) => ({
      ...prev,
      therapeuticArea: ta || undefined,
    }));
  }, []);

  const setCustomContext = useCallback((custom: string | null) => {
    setContext((prev) => ({
      ...prev,
      custom: custom || undefined,
    }));
  }, []);

  const clearContext = useCallback(() => {
    setContext({});
  }, []);

  return (
    <OmniVoiceCtx.Provider
      value={{
        context: contextWithPage,
        updateContext,
        setHcp,
        setCampaign,
        setTherapeuticArea,
        setCustomContext,
        clearContext,
      }}
    >
      {children}
    </OmniVoiceCtx.Provider>
  );
}

// ============================================================================
// HOOK
// ============================================================================

export function useOmniVoiceCtx(): OmniVoiceContextValue {
  const ctx = useContext(OmniVoiceCtx);
  if (!ctx) {
    throw new Error("useOmniVoiceCtx must be used within OmniVoiceProvider");
  }
  return ctx;
}

// ============================================================================
// UTILITY HOOKS
// ============================================================================

/**
 * Hook to set HCP context when viewing an HCP profile
 */
export function useSetHcpContext(hcp: {
  id?: string;
  firstName?: string;
  lastName?: string;
  specialty?: string;
  tier?: string;
} | null) {
  const { setHcp } = useOmniVoiceCtx();

  // Set context when HCP changes
  if (hcp) {
    setHcp({
      id: hcp.id,
      name: `${hcp.firstName || ""} ${hcp.lastName || ""}`.trim() || undefined,
      specialty: hcp.specialty,
      tier: hcp.tier,
    });
  }
}

/**
 * Hook to set campaign context when viewing a campaign
 */
export function useSetCampaignContext(campaign: {
  id?: string;
  name?: string;
  therapeuticArea?: string;
} | null) {
  const { setCampaign, setTherapeuticArea } = useOmniVoiceCtx();

  if (campaign) {
    setCampaign({
      id: campaign.id,
      name: campaign.name,
    });
    if (campaign.therapeuticArea) {
      setTherapeuticArea(campaign.therapeuticArea);
    }
  }
}
