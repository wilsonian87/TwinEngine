/**
 * Shared data hook for Action Queue.
 *
 * Extracts data-fetching logic from action-queue.tsx so both
 * Discover and Direct mode can consume the same data.
 */

import { useQuery } from "@tanstack/react-query";
import type { SavedAudience, HCPProfile } from "@shared/schema";

export interface NBORecommendation {
  hcpId: string;
  hcpName: string;
  specialty: string;
  tier: string;
  segment: string;
  action: string;
  channel: string;
  rationale: string;
  confidence: number;
  urgency: "high" | "medium" | "low";
  urgencyBucket?: "act-now" | "this-week" | "backlog";
  compositeScore: number;
  factors: {
    engagement: number;
    adoption: number;
    channelAffinity: number;
    saturation: number;
    competitive: number;
    recency: number;
  };
}

export interface NBOPriorityResponse {
  recommendations: NBORecommendation[];
  totalAnalyzed: number;
  returned: number;
}

/**
 * Map server NBO recommendation fields to client field names.
 * Server uses actionType/recommendedChannel; client uses action/channel.
 */
function mapServerRecommendation(raw: Record<string, unknown>): NBORecommendation {
  const r = raw as Record<string, unknown>;
  const componentScores = r.componentScores as Record<string, number> | undefined;

  return {
    hcpId: (r.hcpId as string) || "",
    hcpName: (r.hcpName as string) || "Unknown HCP",
    specialty: (r.specialty as string) || "",
    tier: (r.tier as string) || "",
    segment: (r.segment as string) || "",
    action: (r.actionType as string) || (r.action as string) || "engage",
    channel: (r.recommendedChannel as string) || (r.channel as string) || "email",
    rationale: (r.rationale as string) || "",
    confidence: (r.confidence as number) || 0,
    urgency: (r.urgency as "high" | "medium" | "low") || "medium",
    urgencyBucket: (r.urgencyBucket as "act-now" | "this-week" | "backlog") || undefined,
    compositeScore: (r.compositeScore as number) || 0,
    factors: {
      engagement: componentScores?.engagementScore ?? 0.5,
      adoption: componentScores?.adoptionScore ?? 0.5,
      channelAffinity: componentScores?.channelScore ?? 0.5,
      saturation: componentScores?.saturationScore ?? 0.5,
      competitive: componentScores?.competitiveScore ?? 0.5,
      recency: componentScores?.recencyScore ?? 0.5,
    },
  };
}

export function useAudiences() {
  return useQuery<SavedAudience[]>({
    queryKey: ["/api/audiences"],
    queryFn: async () => {
      const response = await fetch("/api/audiences", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch audiences");
      return response.json();
    },
  });
}

export function useAllHcps() {
  return useQuery<HCPProfile[]>({
    queryKey: ["/api/hcps"],
    queryFn: async () => {
      const response = await fetch("/api/hcps", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch HCPs");
      return response.json();
    },
  });
}

export function useNBOPriorityQueue(limit: number = 50, urgencyFilter?: string) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (urgencyFilter && urgencyFilter !== "all") {
    params.set("urgency", urgencyFilter);
  }

  return useQuery<NBOPriorityResponse>({
    queryKey: ["/api/nbo/priority-queue", limit, urgencyFilter],
    queryFn: async () => {
      const response = await fetch(`/api/nbo/priority-queue?${params}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch NBO priority queue");
      const data = await response.json();

      // Map server field names to client field names
      return {
        ...data,
        recommendations: (data.recommendations || []).map(mapServerRecommendation),
      };
    },
    refetchInterval: 120000, // 2 minutes
  });
}

/**
 * Bucket recommendations into temporal groups for Things 3-style display.
 */
export function bucketRecommendations(recommendations: NBORecommendation[]) {
  const actNow: NBORecommendation[] = [];
  const thisWeek: NBORecommendation[] = [];
  const backlog: NBORecommendation[] = [];

  for (const rec of recommendations) {
    // Prefer server-assigned bucket, fall back to client-side heuristic
    const bucket = rec.urgencyBucket;

    if (bucket === "act-now" || (!bucket && rec.urgency === "high" && rec.confidence >= 0.70)) {
      actNow.push(rec);
    } else if (bucket === "this-week" || (!bucket && rec.urgency === "medium" && rec.confidence >= 0.55)) {
      thisWeek.push(rec);
    } else if (bucket === "backlog") {
      backlog.push(rec);
    } else {
      // Remaining unclassified go to backlog
      backlog.push(rec);
    }
  }

  return { actNow, thisWeek, backlog };
}
