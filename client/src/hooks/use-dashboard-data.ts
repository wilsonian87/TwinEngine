/**
 * Shared data hook for Dashboard.
 *
 * Extracts data-fetching and type definitions from dashboard.tsx
 * so both Discover and Direct mode can consume the same data.
 */

import { useQuery } from "@tanstack/react-query";

export interface SystemHealth {
  healthy: boolean;
  status: "operational" | "degraded" | "down";
  dataLastUpdated: string;
  checks: {
    database: boolean;
    hcpData: boolean;
    exports: boolean;
  };
}

export interface OperationalMetrics {
  totalHcps: number;
  activeHcps: number;
  atRiskHcps: number;
  atRiskTrend: number;
  pendingNbas: number;
  avgEngagementScore: number;
  totalSimulations: number;
}

export interface AlertSummary {
  critical: number;
  warning: number;
  info: number;
  total: number;
}

export interface RecentActivity {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  entityId?: string;
}

export interface DashboardData {
  health: SystemHealth;
  metrics: OperationalMetrics;
  alerts: AlertSummary;
  recentActivity: RecentActivity[];
  pendingApprovals: number;
}

export function useDashboardData() {
  return useQuery<DashboardData>({
    queryKey: ["/api/dashboard"],
    refetchInterval: 60000,
  });
}

/**
 * Generate AI narrative for dashboard (client-side request).
 */
export function useDashboardNarrative(metrics?: OperationalMetrics) {
  return useQuery<{ narrative: string; usedAI: boolean }>({
    queryKey: ["/api/narrative/generate", "dashboard", metrics?.avgEngagementScore],
    queryFn: async () => {
      const response = await fetch("/api/narrative/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          context: "dashboard",
          data: metrics,
        }),
      });
      if (!response.ok) {
        return { narrative: "", usedAI: false };
      }
      return response.json();
    },
    enabled: !!metrics,
    staleTime: 5 * 60 * 1000, // Cache narrative for 5 minutes
  });
}
