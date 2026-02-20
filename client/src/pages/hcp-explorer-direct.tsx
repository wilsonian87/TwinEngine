/**
 * HCP Explorer Direct Mode — Airbnb card pattern.
 *
 * Design analogues:
 * - Airbnb: sparkline hero, behavioral badges, engagement letter grade, quick-save
 * - Zillow: progressive disclosure profile scroll
 * - VRBO: match reasoning one-liner
 *
 * Cards sell the HCP at a glance. You shouldn't have to read metadata to evaluate.
 */

import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  Search,
  SlidersHorizontal,
  ChevronDown,
  Users,
  LayoutGrid,
  CreditCard,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { staggerContainer, staggerCardChild } from "@/lib/motion-config";
import { SparkLine } from "@/components/charts";
import { EngagementGrade } from "@/components/shared/engagement-grade";
import {
  BehavioralBadgeRow,
  deriveBadges,
} from "@/components/shared/behavioral-badges";
import { AddToAudienceButton } from "@/components/shared/add-to-audience-button";
import { HCPDetailPanel } from "@/components/hcp-detail-panel";
import {
  useHcpList,
  useFilteredHcps,
  getSparklineData,
  getEngagementTrend,
} from "@/hooks/use-hcp-data";
import { HCPProfileCard } from "@/components/viz/hcp-profile-card";
import type { HCPProfile, HCPFilter } from "@shared/schema";
import type { SortField } from "@/hooks/use-hcp-data";

// ============================================================================
// CONSTANTS
// ============================================================================

const ITEMS_PER_PAGE = 24;

const tierColors: Record<string, string> = {
  "Tier 1": "bg-purple-500/15 text-purple-600 dark:text-purple-400",
  "Tier 2": "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  "Tier 3": "bg-slate-500/15 text-slate-500 dark:text-slate-400",
};

const channelLabels: Record<string, string> = {
  email: "Email",
  rep_visit: "Rep Visit",
  webinar: "Webinar",
  conference: "Events",
  digital_ad: "Digital",
  phone: "Phone",
};

// ============================================================================
// HCP CARD — Airbnb pattern
// ============================================================================

function HCPCard({
  hcp,
  onClick,
}: {
  hcp: HCPProfile;
  onClick: (hcp: HCPProfile) => void;
}) {
  const sparkData = getSparklineData(hcp);
  const trend = getEngagementTrend(hcp);
  const badges = deriveBadges({
    overallEngagementScore: hcp.overallEngagementScore,
    segment: hcp.segment,
  });

  return (
    <motion.div variants={staggerCardChild}>
      <Card
        className="cursor-pointer hover:shadow-md hover:border-primary/30 transition-all group overflow-hidden"
        onClick={() => onClick(hcp)}
      >
        {/* Sparkline Hero — the visual that differentiates cards */}
        {sparkData.length > 1 && (
          <div className="px-4 pt-3 pb-1">
            <SparkLine
              data={sparkData}
              width={260}
              height={48}
              trend={trend}
              filled
              showEndDot
              color={trend === "up" ? "green" : trend === "down" ? "red" : "purple"}
            />
          </div>
        )}

        <CardContent className={cn("p-4", sparkData.length > 1 && "pt-2")}>
          {/* Row 1: Name + Grade + Save */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm truncate">
                  {hcp.firstName} {hcp.lastName}
                </h3>
                <EngagementGrade
                  score={hcp.overallEngagementScore}
                  size="sm"
                />
              </div>
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {hcp.specialty} · {hcp.organization}
              </p>
            </div>
            <AddToAudienceButton
              hcpId={hcp.id}
              hcpName={`${hcp.firstName} ${hcp.lastName}`}
              compact
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            />
          </div>

          {/* Row 2: Behavioral Badges */}
          {badges.length > 0 && (
            <div className="mt-2">
              <BehavioralBadgeRow badges={badges} compact maxVisible={2} />
            </div>
          )}

          {/* Row 3: Key Metrics */}
          <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] h-5",
                tierColors[hcp.tier] || ""
              )}
            >
              {hcp.tier}
            </Badge>
            <span className="tabular-nums">
              {hcp.monthlyRxVolume.toLocaleString()} Rx/mo
            </span>
            <span className="tabular-nums">
              {hcp.marketSharePct}% share
            </span>
          </div>

          {/* Row 4: Channel preference */}
          <div className="mt-2 text-[10px] text-muted-foreground">
            Prefers {channelLabels[hcp.channelPreference] || hcp.channelPreference}
            {hcp.conversionLikelihood > 60 && (
              <span className="ml-2 text-green-600 dark:text-green-400 font-medium">
                {hcp.conversionLikelihood}% conversion
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ============================================================================
// DOSSIER VIEW HELPERS
// ============================================================================

function mapTier(tier: string): "platinum" | "gold" | "silver" | "bronze" {
  if (tier === "Tier 1") return "platinum";
  if (tier === "Tier 2") return "gold";
  return "silver";
}

function mapAdoptionStage(
  segment: string | null,
): "early" | "growing" | "mature" | "advocate" {
  if (!segment) return "growing";
  const s = segment.toLowerCase();
  if (s.includes("champion") || s.includes("advocate")) return "advocate";
  if (s.includes("rising") || s.includes("growing")) return "growing";
  if (s.includes("stable") || s.includes("loyal")) return "mature";
  return "early";
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function HCPExplorerDirect() {
  const [filter, setFilter] = useState<HCPFilter>({});
  const [sortField, setSortField] = useState<SortField>("engagement");
  const [selectedHcp, setSelectedHcp] = useState<HCPProfile | null>(null);
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const [viewMode, setViewMode] = useState<"card" | "dossier">("card");
  const [, navigate] = useLocation();

  const { data: hcps = [], isLoading, isError } = useHcpList();

  const filteredHcps = useFilteredHcps(hcps, filter, sortField, "desc");

  const visibleHcps = useMemo(
    () => filteredHcps.slice(0, visibleCount),
    [filteredHcps, visibleCount]
  );

  const handleSearch = useCallback((value: string) => {
    setFilter((prev) => ({ ...prev, search: value || undefined }));
    setVisibleCount(ITEMS_PER_PAGE);
  }, []);

  const handleTierFilter = useCallback((tier: string) => {
    if (tier === "all") {
      setFilter((prev) => ({ ...prev, tiers: undefined }));
    } else {
      setFilter((prev) => ({
        ...prev,
        tiers: [tier] as HCPFilter["tiers"],
      }));
    }
    setVisibleCount(ITEMS_PER_PAGE);
  }, []);

  const handleCardClick = useCallback((hcp: HCPProfile) => {
    setSelectedHcp(hcp);
  }, []);

  const hasMore = visibleCount < filteredHcps.length;

  return (
    <div className="flex h-full">
      <div className="flex-1 overflow-hidden">
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur-sm px-6 py-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1
                className="text-lg font-semibold"
                data-testid="text-page-title"
              >
                HCP Explorer
              </h1>
            </div>

            <div className="flex items-center gap-2 flex-1 max-w-xl">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search by name or NPI..."
                  className="pl-8 h-8 text-sm"
                  value={filter.search || ""}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>

              <Select
                value={filter.tiers?.[0] || "all"}
                onValueChange={handleTierFilter}
              >
                <SelectTrigger className="w-[110px] h-8 text-xs">
                  <SelectValue placeholder="All Tiers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tiers</SelectItem>
                  <SelectItem value="Tier 1">Tier 1</SelectItem>
                  <SelectItem value="Tier 2">Tier 2</SelectItem>
                  <SelectItem value="Tier 3">Tier 3</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={sortField}
                onValueChange={(v) => setSortField(v as SortField)}
              >
                <SelectTrigger className="w-[130px] h-8 text-xs">
                  <SlidersHorizontal className="h-3 w-3 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="engagement">Engagement</SelectItem>
                  <SelectItem value="conversion">Conversion</SelectItem>
                  <SelectItem value="rxVolume">Rx Volume</SelectItem>
                  <SelectItem value="marketShare">Market Share</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center border rounded-md">
              <Button
                variant={viewMode === "card" ? "default" : "ghost"}
                size="sm"
                className="h-8 px-2"
                onClick={() => setViewMode("card")}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant={viewMode === "dossier" ? "default" : "ghost"}
                size="sm"
                className="h-8 px-2"
                onClick={() => setViewMode("dossier")}
              >
                <CreditCard className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="text-xs text-muted-foreground tabular-nums">
              {filteredHcps.length.toLocaleString()} HCPs
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="h-[calc(100%-56px)] overflow-auto p-6">
          {isError ? (
            <div className="text-center py-16 text-muted-foreground">
              <p>Failed to load HCP data. Please try again.</p>
            </div>
          ) : isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <Skeleton key={i} className="h-48 rounded-lg" />
              ))}
            </div>
          ) : filteredHcps.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No HCPs match your filters</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => {
                  setFilter({});
                  setVisibleCount(ITEMS_PER_PAGE);
                }}
              >
                Clear filters
              </Button>
            </div>
          ) : (
            <>
              <motion.div
                variants={staggerContainer}
                initial="initial"
                animate="enter"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
              >
                {viewMode === "card"
                  ? visibleHcps.map((hcp) => (
                      <HCPCard
                        key={hcp.id}
                        hcp={hcp}
                        onClick={handleCardClick}
                      />
                    ))
                  : visibleHcps.map((hcp) => (
                      <HCPProfileCard
                        key={hcp.id}
                        hcp={{
                          name: `${hcp.firstName} ${hcp.lastName}`,
                          specialty: hcp.specialty,
                          engagementScore: hcp.overallEngagementScore,
                          tier: mapTier(hcp.tier),
                          adoptionStage: mapAdoptionStage(hcp.segment),
                          riskLevel:
                            hcp.churnRisk > 60
                              ? "high"
                              : hcp.churnRisk > 30
                                ? "medium"
                                : "low",
                          channelPreference: hcp.channelPreference,
                          radarAxes: {
                            engagement: hcp.overallEngagementScore / 100,
                            recency: Math.max(0, 1 - hcp.churnRisk / 100),
                            channelDiversity: 0.5,
                            contentAffinity: hcp.conversionLikelihood / 100,
                            peerInfluence: (hcp.marketSharePct || 0) / 100,
                            adoptionProgress:
                              hcp.overallEngagementScore / 100,
                          },
                        }}
                        onClick={() => handleCardClick(hcp)}
                      />
                    ))}
              </motion.div>

              {/* Load More */}
              {hasMore && (
                <div className="mt-6 text-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setVisibleCount((v) => v + ITEMS_PER_PAGE)
                    }
                  >
                    Show more
                    <ChevronDown className="h-3 w-3 ml-1" />
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">
                    Showing {visibleHcps.length} of{" "}
                    {filteredHcps.length.toLocaleString()}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Detail Panel */}
      <HCPDetailPanel
        hcp={selectedHcp}
        open={!!selectedHcp}
        onClose={() => setSelectedHcp(null)}
        onSelectHcp={setSelectedHcp}
      />
    </div>
  );
}
