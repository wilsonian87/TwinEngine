/**
 * Message Saturation Direct Mode — Screen Time digest pattern.
 *
 * Design analogues:
 * - Screen Time (Apple): weekly digest with threshold alerts
 * - GitHub: contribution heatmap color scale
 *
 * Lead with the digest: how many HCPs are at risk, which themes are hot.
 * Heatmap below for drill-down.
 */

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  Flame,
  AlertTriangle,
  TrendingDown,
  Users,
  Clock,
  Shield,
  ChevronRight,
  X,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  staggerContainer,
  staggerChild,
  MOTION_DURATION,
  MOTION_EASING,
} from "@/lib/motion-config";
import { AINarrativeBlock } from "@/components/shared/ai-narrative-block";
import { MessageSaturationHeatmap } from "@/components/message-saturation";
import type { SavedAudience } from "@shared/schema";

// ============================================================================
// TYPES
// ============================================================================

interface HeatmapRow {
  hcpId: string;
  hcpName: string;
  themes: { themeId: string; themeName: string; msi: number }[];
  avgMsi: number;
}

interface HeatmapData {
  rows: HeatmapRow[];
  themes: { id: string; name: string }[];
  summary: {
    totalHcps: number;
    avgMsi: number;
    oversaturatedCount: number;
    topTheme: string;
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function getMsiStatus(msi: number): {
  label: string;
  color: string;
  bg: string;
} {
  if (msi >= 66) return { label: "Saturated", color: "text-red-600 dark:text-red-400", bg: "bg-red-500/10" };
  if (msi >= 51) return { label: "Approaching", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10" };
  if (msi >= 26) return { label: "Optimal", color: "text-green-600 dark:text-green-400", bg: "bg-green-500/10" };
  return { label: "Underexposed", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10" };
}

function generateDigest(data: HeatmapData | null): string {
  if (!data || !data.summary) {
    return "No saturation data available. Seed demo data to get started.";
  }

  const { totalHcps, oversaturatedCount, avgMsi, topTheme } = data.summary;

  let digest = `${totalHcps} HCPs analyzed.`;

  if (oversaturatedCount > 0) {
    const pct = Math.round((oversaturatedCount / totalHcps) * 100);
    digest += ` ${oversaturatedCount} (${pct}%) have crossed saturation thresholds.`;
  } else {
    digest += ` No HCPs currently oversaturated.`;
  }

  if (topTheme) {
    digest += ` Top theme: "${topTheme}."`;
  }

  if (avgMsi > 50) {
    digest += ` Portfolio average MSI is ${avgMsi.toFixed(0)} — consider reducing frequency on high-exposure themes.`;
  } else {
    digest += ` Portfolio average MSI is ${avgMsi.toFixed(0)} — within healthy range.`;
  }

  return digest;
}

function getCoolingRecommendations(data: HeatmapData | null): {
  hcpName: string;
  hcpId: string;
  avgMsi: number;
  topTheme: string;
}[] {
  if (!data?.rows) return [];

  return data.rows
    .filter((row) => row.avgMsi >= 60)
    .sort((a, b) => b.avgMsi - a.avgMsi)
    .slice(0, 5)
    .map((row) => {
      const topTheme = row.themes.length > 0
        ? [...row.themes].sort((a, b) => b.msi - a.msi)[0]
        : null;
      return {
        hcpName: row.hcpName,
        hcpId: row.hcpId,
        avgMsi: row.avgMsi,
        topTheme: topTheme?.themeName || "Unknown",
      };
    });
}

// ============================================================================
// DIGEST CARD — Screen Time pattern
// ============================================================================

function DigestStats({ data }: { data: HeatmapData | null }) {
  if (!data?.summary) return null;

  const { totalHcps, oversaturatedCount, avgMsi } = data.summary;
  const avgStatus = getMsiStatus(avgMsi);

  return (
    <div className="grid grid-cols-3 gap-3">
      <Card>
        <CardContent className="p-4 text-center">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
            HCPs Monitored
          </p>
          <p className="text-2xl font-bold tabular-nums mt-1">{totalHcps}</p>
        </CardContent>
      </Card>
      <Card className={oversaturatedCount > 0 ? "border-red-300/50 dark:border-red-800/50" : ""}>
        <CardContent className="p-4 text-center">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
            At Risk
          </p>
          <p className={cn(
            "text-2xl font-bold tabular-nums mt-1",
            oversaturatedCount > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"
          )}>
            {oversaturatedCount}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 text-center">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
            Avg MSI
          </p>
          <p className={cn("text-2xl font-bold tabular-nums mt-1", avgStatus.color)}>
            {avgMsi.toFixed(0)}
          </p>
          <Badge variant="outline" className={cn("text-[9px] mt-1", avgStatus.color)}>
            {avgStatus.label}
          </Badge>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// COOLING RECOMMENDATIONS — "Cooling off" periods
// ============================================================================

function CoolingRecommendations({
  recommendations,
  onHcpClick,
}: {
  recommendations: ReturnType<typeof getCoolingRecommendations>;
  onHcpClick: (hcpId: string) => void;
}) {
  if (recommendations.length === 0) return null;

  return (
    <div>
      <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
        <Shield className="h-3 w-3" />
        Recommended Cooling Periods
      </h2>
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="enter"
        className="space-y-2"
      >
        {recommendations.map((rec) => {
          const status = getMsiStatus(rec.avgMsi);
          return (
            <motion.div key={rec.hcpId} variants={staggerChild}>
              <Card className={cn("border-l-2", rec.avgMsi >= 75 ? "border-l-red-500" : "border-l-amber-500")}>
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn("rounded-md p-1.5", status.bg)}>
                      <Flame className={cn("h-3.5 w-3.5", status.color)} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{rec.hcpName}</p>
                      <p className="text-xs text-muted-foreground">
                        MSI {rec.avgMsi.toFixed(0)} · Top theme: {rec.topTheme}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className={cn("text-[10px]", status.color)}>
                      <Clock className="h-2.5 w-2.5 mr-0.5" />
                      2-week pause
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => onHcpClick(rec.hcpId)}
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function MessageSaturationDirect() {
  const [, navigate] = useLocation();
  const [selectedAudienceId, setSelectedAudienceId] = useState<string | null>(null);

  // Fetch audiences for filtering (enriched with validHcpCount)
  const { data: allAudiences = [] } = useQuery<(SavedAudience & { validHcpCount?: number })[]>({
    queryKey: ["/api/audiences"],
    queryFn: async () => {
      const res = await fetch("/api/audiences", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });
  // Filter out stale audiences with 0 valid HCPs
  const audiences = allAudiences.filter((a) => a.validHcpCount === undefined || a.validHcpCount > 0);

  // Fetch heatmap data for digest stats
  const { data: heatmapData, isLoading } = useQuery<HeatmapData>({
    queryKey: ["/api/message-saturation/heatmap-data", selectedAudienceId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedAudienceId) {
        const audience = audiences.find((a) => a.id === selectedAudienceId);
        if (audience?.hcpIds?.length) {
          params.set("hcpIds", audience.hcpIds.join(","));
        }
      }
      const res = await fetch(`/api/message-saturation/heatmap-data?${params}`, {
        credentials: "include",
      });
      if (!res.ok) return null;
      return res.json();
    },
  });

  const selectedAudience = audiences.find((a) => a.id === selectedAudienceId);
  const audienceHcpIds = selectedAudience?.hcpIds ?? undefined;
  const digest = useMemo(() => generateDigest(heatmapData ?? null), [heatmapData]);
  const coolingRecs = useMemo(() => getCoolingRecommendations(heatmapData ?? null), [heatmapData]);

  const handleHcpClick = (hcpId: string) => {
    navigate(`/?hcp=${hcpId}`);
  };

  return (
    <div className="h-full overflow-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur-sm px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold" data-testid="text-page-title">
              Message Saturation
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={selectedAudienceId ?? "all"}
              onValueChange={(v) => setSelectedAudienceId(v === "all" ? null : v)}
            >
              <SelectTrigger className="w-[180px] h-8 text-xs">
                <Users className="h-3 w-3 mr-1" />
                <SelectValue placeholder="All HCPs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All HCPs</SelectItem>
                {audiences.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                    <Badge variant="secondary" className="text-[10px] ml-1 h-4 px-1">
                      {a.hcpIds.length}
                    </Badge>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedAudience && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setSelectedAudienceId(null)}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-24" />
            <div className="grid grid-cols-3 gap-3">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
            <Skeleton className="h-64" />
          </div>
        ) : (
          <>
            {/* Digest — Screen Time weekly summary */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: MOTION_DURATION.data, ease: MOTION_EASING.out }}
            >
              <AINarrativeBlock narrative={digest} variant="verdict" />
            </motion.div>

            {/* Stats Cards */}
            <DigestStats data={heatmapData ?? null} />

            {/* Cooling Recommendations */}
            <CoolingRecommendations
              recommendations={coolingRecs}
              onHcpClick={handleHcpClick}
            />

            {/* Heatmap — full detail below the digest */}
            <div>
              <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                Saturation Heatmap
              </h2>
              <MessageSaturationHeatmap
                hcpIds={audienceHcpIds}
                onHcpClick={handleHcpClick}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
