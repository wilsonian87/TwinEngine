/**
 * Shared data hook for HCP Explorer.
 *
 * Extracts HCP fetching, filtering, and sorting logic from hcp-explorer.tsx
 * so both Discover and Direct modes consume the same data.
 */

import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import type { HCPProfile, HCPFilter } from "@shared/schema";

export type SortField = "engagement" | "name" | "rxVolume" | "marketShare" | "conversion";
export type SortDirection = "asc" | "desc";

export function useHcpList() {
  return useQuery<HCPProfile[]>({
    queryKey: ["/api/hcps"],
  });
}

export function useFilteredHcps(
  hcps: HCPProfile[],
  filter: HCPFilter,
  sortField: SortField = "engagement",
  sortDirection: SortDirection = "desc"
) {
  return useMemo(() => {
    let result = hcps;

    if (filter.search) {
      const search = filter.search.toLowerCase();
      result = result.filter(
        (hcp) =>
          hcp.firstName.toLowerCase().includes(search) ||
          hcp.lastName.toLowerCase().includes(search) ||
          hcp.npi.includes(search)
      );
    }

    if (filter.specialties?.length) {
      result = result.filter((hcp) => filter.specialties!.includes(hcp.specialty));
    }

    if (filter.tiers?.length) {
      result = result.filter((hcp) => filter.tiers!.includes(hcp.tier));
    }

    if (filter.segments?.length) {
      result = result.filter((hcp) => filter.segments!.includes(hcp.segment));
    }

    if (filter.states?.length) {
      result = result.filter((hcp) => filter.states!.includes(hcp.state));
    }

    if (filter.minEngagementScore !== undefined) {
      result = result.filter((hcp) => hcp.overallEngagementScore >= filter.minEngagementScore!);
    }

    if (filter.maxEngagementScore !== undefined) {
      result = result.filter((hcp) => hcp.overallEngagementScore <= filter.maxEngagementScore!);
    }

    if (filter.channelPreferences?.length) {
      result = result.filter((hcp) => filter.channelPreferences!.includes(hcp.channelPreference));
    }

    // Sort
    const sortMultiplier = sortDirection === "asc" ? 1 : -1;
    result = [...result].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "engagement":
          comparison = a.overallEngagementScore - b.overallEngagementScore;
          break;
        case "name":
          comparison = `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`);
          break;
        case "rxVolume":
          comparison = a.monthlyRxVolume - b.monthlyRxVolume;
          break;
        case "marketShare":
          comparison = a.marketSharePct - b.marketSharePct;
          break;
        case "conversion":
          comparison = (a.conversionLikelihood || 0) - (b.conversionLikelihood || 0);
          break;
        default:
          comparison = 0;
      }
      return comparison * sortMultiplier;
    });

    return result;
  }, [hcps, filter, sortField, sortDirection]);
}

/**
 * Extract sparkline data from prescribing trend.
 */
export function getSparklineData(hcp: HCPProfile): number[] {
  if (!hcp.prescribingTrend?.length) return [];
  return hcp.prescribingTrend.map((pt) => pt.rxCount);
}

/**
 * Determine engagement trend direction from prescribing data.
 */
export function getEngagementTrend(hcp: HCPProfile): "up" | "down" | "flat" {
  const data = hcp.prescribingTrend;
  if (!data || data.length < 2) return "flat";
  const recent = data.slice(-3);
  const older = data.slice(-6, -3);
  if (!recent.length || !older.length) return "flat";
  const recentAvg = recent.reduce((s, d) => s + d.rxCount, 0) / recent.length;
  const olderAvg = older.reduce((s, d) => s + d.rxCount, 0) / older.length;
  const pctChange = ((recentAvg - olderAvg) / (olderAvg || 1)) * 100;
  if (pctChange > 5) return "up";
  if (pctChange < -5) return "down";
  return "flat";
}
