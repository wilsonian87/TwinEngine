/**
 * Message Saturation Heatmap
 *
 * Phase 12B: Visual matrix showing HCP × Message Theme saturation levels.
 *
 * Color Encoding:
 * - Blues (0-25): Underexposed - opportunity to increase
 * - Greens/Yellows (26-50): Optimal exposure zone
 * - Oranges/Reds (51-100): Saturated - risk of fatigue
 */

import { useMemo, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, TrendingUp, TrendingDown, Minus, Filter, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  MessageSaturationHeatmapData,
  SaturationRiskLevel,
  AdoptionStage,
  MessageThemeCategory,
} from "@shared/schema";

// ============================================================================
// Color scales for MSI visualization
// ============================================================================

/**
 * Get background color for MSI value
 * Blues (underexposed) → Greens (optimal) → Reds (saturated)
 */
function getMsiColor(msi: number): string {
  if (msi <= 15) return "bg-sky-100 dark:bg-sky-900/30";
  if (msi <= 25) return "bg-sky-200 dark:bg-sky-800/40";
  if (msi <= 35) return "bg-emerald-100 dark:bg-emerald-900/30";
  if (msi <= 50) return "bg-lime-100 dark:bg-lime-900/30";
  if (msi <= 65) return "bg-amber-100 dark:bg-amber-900/40";
  if (msi <= 75) return "bg-orange-200 dark:bg-orange-800/40";
  if (msi <= 85) return "bg-red-200 dark:bg-red-800/40";
  return "bg-red-300 dark:bg-red-700/50";
}

/**
 * Get text color for MSI value
 */
function getMsiTextColor(msi: number): string {
  if (msi <= 25) return "text-sky-700 dark:text-sky-300";
  if (msi <= 50) return "text-emerald-700 dark:text-emerald-300";
  if (msi <= 75) return "text-orange-700 dark:text-orange-300";
  return "text-red-700 dark:text-red-300";
}

/**
 * Get risk level badge styling
 */
const riskLevelConfig: Record<SaturationRiskLevel, { bg: string; text: string; label: string }> = {
  low: { bg: "bg-sky-100 dark:bg-sky-900/40", text: "text-sky-700 dark:text-sky-300", label: "Low" },
  medium: { bg: "bg-lime-100 dark:bg-lime-900/40", text: "text-lime-700 dark:text-lime-300", label: "Medium" },
  high: { bg: "bg-orange-100 dark:bg-orange-900/40", text: "text-orange-700 dark:text-orange-300", label: "High" },
  critical: { bg: "bg-red-100 dark:bg-red-900/40", text: "text-red-700 dark:text-red-300", label: "Critical" },
};

// ============================================================================
// Heatmap Cell Component
// ============================================================================

interface HeatmapCellProps {
  hcpId: string;
  themeId: string;
  themeName: string;
  msi: number;
  saturationRisk: SaturationRiskLevel;
  adoptionStage: AdoptionStage | null;
  onClick?: (hcpId: string, themeId: string) => void;
}

function HeatmapCell({
  hcpId,
  themeId,
  themeName,
  msi,
  saturationRisk,
  adoptionStage,
  onClick,
}: HeatmapCellProps) {
  const riskConfig = riskLevelConfig[saturationRisk];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
          className={cn(
            "w-10 h-10 rounded-sm flex items-center justify-center cursor-pointer",
            "border border-transparent hover:border-slate-400 dark:hover:border-slate-500",
            "transition-all duration-150",
            getMsiColor(msi)
          )}
          onClick={() => onClick?.(hcpId, themeId)}
        >
          <span className={cn("text-xs font-semibold tabular-nums", getMsiTextColor(msi))}>
            {msi.toFixed(0)}
          </span>
        </motion.div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <div className="space-y-2">
          <div className="font-semibold text-sm">{themeName}</div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs text-muted-foreground">MSI Score</span>
            <span className={cn("text-sm font-bold", getMsiTextColor(msi))}>{msi.toFixed(1)}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs text-muted-foreground">Risk Level</span>
            <Badge variant="outline" className={cn(riskConfig.bg, riskConfig.text, "text-xs")}>
              {riskConfig.label}
            </Badge>
          </div>
          {adoptionStage && (
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-muted-foreground">Adoption Stage</span>
              <span className="text-xs capitalize">{adoptionStage}</span>
            </div>
          )}
          <p className="text-xs text-muted-foreground pt-1 border-t">
            Click for HCP detail
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

// ============================================================================
// Empty Cell (no data)
// ============================================================================

function EmptyCell() {
  return (
    <div className="w-10 h-10 rounded-sm bg-slate-50 dark:bg-slate-800/30 flex items-center justify-center">
      <span className="text-[10px] text-slate-300 dark:text-slate-600">—</span>
    </div>
  );
}

// ============================================================================
// Filter Controls Component
// ============================================================================

interface FilterControlsProps {
  categories: MessageThemeCategory[];
  selectedCategory: string | null;
  onCategoryChange: (category: string | null) => void;
  selectedRiskLevel: SaturationRiskLevel | null;
  onRiskLevelChange: (level: SaturationRiskLevel | null) => void;
  selectedStage: AdoptionStage | null;
  onStageChange: (stage: AdoptionStage | null) => void;
}

function FilterControls({
  categories,
  selectedCategory,
  onCategoryChange,
  selectedRiskLevel,
  onRiskLevelChange,
  selectedStage,
  onStageChange,
}: FilterControlsProps) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Filters:</span>
      </div>

      <Select
        value={selectedCategory ?? "all"}
        onValueChange={(v) => onCategoryChange(v === "all" ? null : v)}
      >
        <SelectTrigger className="w-[160px] h-8 text-xs">
          <SelectValue placeholder="Theme Category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Categories</SelectItem>
          {categories.map((cat) => (
            <SelectItem key={cat} value={cat} className="capitalize">
              {cat.replace(/_/g, " ")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={selectedRiskLevel ?? "all"}
        onValueChange={(v) => onRiskLevelChange(v === "all" ? null : (v as SaturationRiskLevel))}
      >
        <SelectTrigger className="w-[140px] h-8 text-xs">
          <SelectValue placeholder="Risk Level" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Risk Levels</SelectItem>
          <SelectItem value="low">Low</SelectItem>
          <SelectItem value="medium">Medium</SelectItem>
          <SelectItem value="high">High</SelectItem>
          <SelectItem value="critical">Critical</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={selectedStage ?? "all"}
        onValueChange={(v) => onStageChange(v === "all" ? null : (v as AdoptionStage))}
      >
        <SelectTrigger className="w-[150px] h-8 text-xs">
          <SelectValue placeholder="Adoption Stage" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Stages</SelectItem>
          <SelectItem value="awareness">Awareness</SelectItem>
          <SelectItem value="consideration">Consideration</SelectItem>
          <SelectItem value="trial">Trial</SelectItem>
          <SelectItem value="loyalty">Loyalty</SelectItem>
        </SelectContent>
      </Select>

      {(selectedCategory || selectedRiskLevel || selectedStage) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            onCategoryChange(null);
            onRiskLevelChange(null);
            onStageChange(null);
          }}
          className="h-8 text-xs"
        >
          Clear Filters
        </Button>
      )}
    </div>
  );
}

// ============================================================================
// Summary Statistics Panel
// ============================================================================

interface SummaryStatsPanelProps {
  data: MessageSaturationHeatmapData;
}

function SummaryStatsPanel({ data }: SummaryStatsPanelProps) {
  const { summary, themes } = data;

  // Calculate saturation distribution
  const totalCells = data.hcpCells.length;
  const riskDistribution = useMemo(() => {
    const dist = { low: 0, medium: 0, high: 0, critical: 0 };
    data.hcpCells.forEach((cell) => {
      dist[cell.saturationRisk]++;
    });
    return dist;
  }, [data.hcpCells]);

  const saturatedPercentage =
    totalCells > 0
      ? (((riskDistribution.high + riskDistribution.critical) / totalCells) * 100).toFixed(0)
      : 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card className="bg-slate-50 dark:bg-slate-800/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">HCPs Analyzed</p>
              <p className="text-2xl font-bold">{summary.totalHcpsAnalyzed}</p>
            </div>
            <BarChart3 className="w-8 h-8 text-slate-400" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-50 dark:bg-slate-800/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Avg MSI</p>
              <p className={cn("text-2xl font-bold", getMsiTextColor(summary.avgOverallMsi))}>
                {summary.avgOverallMsi.toFixed(1)}
              </p>
            </div>
            {summary.avgOverallMsi > 50 ? (
              <TrendingUp className="w-8 h-8 text-orange-500" />
            ) : summary.avgOverallMsi < 30 ? (
              <TrendingDown className="w-8 h-8 text-sky-500" />
            ) : (
              <Minus className="w-8 h-8 text-emerald-500" />
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-50 dark:bg-slate-800/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">HCPs at Risk</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {summary.hcpsAtRisk}
              </p>
            </div>
            <AlertTriangle className="w-8 h-8 text-orange-400" />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {saturatedPercentage}% of exposures saturated
          </p>
        </CardContent>
      </Card>

      <Card className="bg-slate-50 dark:bg-slate-800/50">
        <CardContent className="p-4">
          <div>
            <p className="text-xs text-muted-foreground">Most Saturated</p>
            <p className="text-sm font-semibold truncate text-red-600 dark:text-red-400">
              {summary.mostSaturatedTheme || "N/A"}
            </p>
          </div>
          <div className="mt-2">
            <p className="text-xs text-muted-foreground">Least Saturated</p>
            <p className="text-sm font-semibold truncate text-sky-600 dark:text-sky-400">
              {summary.leastSaturatedTheme || "N/A"}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// Color Legend
// ============================================================================

function ColorLegend() {
  return (
    <div className="flex items-center gap-4 text-xs">
      <span className="text-muted-foreground">MSI Scale:</span>
      <div className="flex items-center gap-1">
        <div className="w-6 h-4 rounded-sm bg-sky-200" />
        <span>0-25</span>
      </div>
      <div className="flex items-center gap-1">
        <div className="w-6 h-4 rounded-sm bg-emerald-100" />
        <span>26-50</span>
      </div>
      <div className="flex items-center gap-1">
        <div className="w-6 h-4 rounded-sm bg-amber-100" />
        <span>51-65</span>
      </div>
      <div className="flex items-center gap-1">
        <div className="w-6 h-4 rounded-sm bg-orange-200" />
        <span>66-75</span>
      </div>
      <div className="flex items-center gap-1">
        <div className="w-6 h-4 rounded-sm bg-red-300" />
        <span>76-100</span>
      </div>
    </div>
  );
}

// ============================================================================
// Main Heatmap Component
// ============================================================================

interface MessageSaturationHeatmapProps {
  hcpIds?: string[];
  onHcpClick?: (hcpId: string) => void;
  className?: string;
}

export function MessageSaturationHeatmap({
  hcpIds,
  onHcpClick,
  className,
}: MessageSaturationHeatmapProps) {
  // Filter state
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedRiskLevel, setSelectedRiskLevel] = useState<SaturationRiskLevel | null>(null);
  const [selectedStage, setSelectedStage] = useState<AdoptionStage | null>(null);

  // Fetch heatmap data
  const { data, isLoading, error } = useQuery<MessageSaturationHeatmapData>({
    queryKey: ["message-saturation-heatmap"],
    queryFn: async () => {
      const res = await fetch("/api/message-saturation/heatmap-data", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch heatmap data");
      return res.json();
    },
    staleTime: 60000, // 1 minute
  });

  // Get unique HCP IDs from cells
  const hcpIdList = useMemo(() => {
    if (!data) return [];
    const ids = new Set(data.hcpCells.map((c) => c.hcpId));
    // If specific HCP IDs provided, filter to only those
    if (hcpIds?.length) {
      return Array.from(ids).filter((id) => hcpIds.includes(id));
    }
    return Array.from(ids);
  }, [data, hcpIds]);

  // Get categories for filter
  const categories = useMemo(() => {
    if (!data) return [];
    return Array.from(
      new Set(data.themes.map((t) => t.category).filter(Boolean))
    ) as MessageThemeCategory[];
  }, [data]);

  // Filter themes based on selected category
  const filteredThemes = useMemo(() => {
    if (!data) return [];
    if (!selectedCategory) return data.themes;
    return data.themes.filter((t) => t.category === selectedCategory);
  }, [data, selectedCategory]);

  // Build cell lookup map for efficient rendering
  type HeatmapCell = MessageSaturationHeatmapData["hcpCells"][0];
  const cellMap = useMemo(() => {
    if (!data) return new Map<string, HeatmapCell>();
    const map = new Map<string, HeatmapCell>();
    data.hcpCells.forEach((cell) => {
      // Apply filters
      if (selectedRiskLevel && cell.saturationRisk !== selectedRiskLevel) return;
      if (selectedStage && cell.adoptionStage !== selectedStage) return;
      map.set(`${cell.hcpId}-${cell.themeId}`, cell);
    });
    return map;
  }, [data, selectedRiskLevel, selectedStage]);

  // Handle cell click
  const handleCellClick = useCallback(
    (hcpId: string, _themeId: string) => {
      onHcpClick?.(hcpId);
    },
    [onHcpClick]
  );

  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center h-64", className)}>
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={cn("flex items-center justify-center h-64", className)}>
        <div className="text-center">
          <AlertTriangle className="w-8 h-8 mx-auto text-destructive mb-2" />
          <p className="text-sm text-muted-foreground">Failed to load heatmap data</p>
        </div>
      </div>
    );
  }

  if (data.hcpCells.length === 0) {
    return (
      <div className={cn("flex items-center justify-center h-64", className)}>
        <div className="text-center">
          <BarChart3 className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No message saturation data available</p>
          <p className="text-xs text-muted-foreground mt-1">
            Seed data using POST /api/message-saturation/seed
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Summary Statistics */}
      <SummaryStatsPanel data={data} />

      {/* Filters and Legend */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <FilterControls
          categories={categories}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          selectedRiskLevel={selectedRiskLevel}
          onRiskLevelChange={setSelectedRiskLevel}
          selectedStage={selectedStage}
          onStageChange={setSelectedStage}
        />
        <ColorLegend />
      </div>

      {/* Heatmap Matrix */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">HCP × Message Theme Saturation Matrix</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className="sticky left-0 bg-background z-10 w-20 text-left text-xs font-medium text-muted-foreground p-2">
                    HCP
                  </th>
                  {filteredThemes.map((theme) => (
                    <th
                      key={theme.id}
                      className="text-center p-1"
                      style={{ minWidth: "44px" }}
                    >
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="text-[10px] font-medium text-muted-foreground truncate max-w-[40px] cursor-help">
                            {theme.name.slice(0, 6)}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div>
                            <p className="font-semibold">{theme.name}</p>
                            {theme.category && (
                              <p className="text-xs text-muted-foreground capitalize">
                                {theme.category.replace(/_/g, " ")}
                              </p>
                            )}
                            <p className="text-xs mt-1">
                              Avg MSI: {theme.avgMsi.toFixed(1)} | {theme.affectedHcpCount} HCPs
                            </p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {hcpIdList.slice(0, 50).map((hcpId) => (
                    <motion.tr
                      key={hcpId}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    >
                      <td className="sticky left-0 bg-background z-10 p-2">
                        <button
                          onClick={() => onHcpClick?.(hcpId)}
                          className="text-xs font-mono text-left truncate max-w-[80px] hover:text-primary hover:underline"
                        >
                          {hcpId.slice(0, 8)}...
                        </button>
                      </td>
                      {filteredThemes.map((theme) => {
                        const cell = cellMap.get(`${hcpId}-${theme.id}`);
                        return (
                          <td key={theme.id} className="p-0.5">
                            {cell ? (
                              <HeatmapCell
                                hcpId={hcpId}
                                themeId={theme.id}
                                themeName={theme.name}
                                msi={cell.msi}
                                saturationRisk={cell.saturationRisk}
                                adoptionStage={cell.adoptionStage}
                                onClick={handleCellClick}
                              />
                            ) : (
                              <EmptyCell />
                            )}
                          </td>
                        );
                      })}
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

          {hcpIdList.length > 50 && (
            <div className="mt-4 text-center">
              <p className="text-xs text-muted-foreground">
                Showing 50 of {hcpIdList.length} HCPs.{" "}
                <span className="text-primary cursor-pointer hover:underline">
                  Load more
                </span>
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
