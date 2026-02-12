/**
 * Message Saturation Page
 *
 * Phase 12B: Visualize message theme saturation across HCP portfolio.
 * Features heatmap visualization with filtering and drill-down capabilities.
 */

import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Flame, RefreshCw, Download, Info, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MessageSaturationHeatmap } from "@/components/message-saturation";
import { useToast } from "@/hooks/use-toast";
import type { SavedAudience } from "@shared/schema";

export default function MessageSaturationPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isSeeding, setIsSeeding] = useState(false);
  const [selectedAudienceId, setSelectedAudienceId] = useState<string | null>(null);

  // Fetch saved audiences for filtering
  const { data: audiences = [] } = useQuery<SavedAudience[]>({
    queryKey: ["/api/audiences"],
    queryFn: async () => {
      const res = await fetch("/api/audiences", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const selectedAudience = audiences.find((a) => a.id === selectedAudienceId);
  const audienceHcpIds = selectedAudience?.hcpIds ?? undefined;

  // Handle HCP click - navigate to HCP detail
  const handleHcpClick = (hcpId: string) => {
    setLocation(`/hcp-explorer?hcpId=${hcpId}`);
  };

  // Seed demo data
  const handleSeedData = async () => {
    setIsSeeding(true);
    try {
      const res = await fetch("/api/message-saturation/seed", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to seed data");
      const result = await res.json();
      toast({
        title: "Data seeded successfully",
        description: `Created ${result.themesCreated} themes and ${result.exposuresCreated} exposures.`,
      });
      // Refresh the page to show new data
      window.location.reload();
    } catch (error) {
      toast({
        title: "Failed to seed data",
        description: "Please try again or check the console for errors.",
        variant: "destructive",
      });
    } finally {
      setIsSeeding(false);
    }
  };

  // Export data as CSV
  const handleExport = () => {
    // Open CSV export in new tab
    window.open("/api/competitive/export/signals", "_blank");
    toast({
      title: "Export started",
      description: "Your CSV file will download shortly.",
    });
  };

  return (
    <div className="h-full overflow-auto">
      <div className="container max-w-7xl mx-auto py-6 px-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
              <Flame className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                Message Saturation
              </h1>
              <p className="text-sm text-muted-foreground">
                Monitor message theme fatigue across your HCP portfolio
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSeedData}
                  disabled={isSeeding}
                >
                  {isSeeding ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  Seed Demo Data
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Generate synthetic message exposure data for demonstration
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={handleExport}>
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </TooltipTrigger>
              <TooltipContent>Export saturation data as CSV</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Info className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-sm text-left">
                <p className="text-sm font-semibold mb-2">Message Saturation Index (MSI)</p>
                <p className="text-xs mb-2">
                  MSI measures how saturated an HCP is with a specific message theme.
                  Higher values indicate fatigue risk.
                </p>
                <ul className="text-xs space-y-1">
                  <li>
                    <span className="inline-block w-3 h-3 rounded-sm bg-sky-200 mr-2" />
                    0-25: Underexposed (opportunity)
                  </li>
                  <li>
                    <span className="inline-block w-3 h-3 rounded-sm bg-emerald-100 mr-2" />
                    26-50: Optimal zone
                  </li>
                  <li>
                    <span className="inline-block w-3 h-3 rounded-sm bg-amber-100 mr-2" />
                    51-65: Approaching saturation
                  </li>
                  <li>
                    <span className="inline-block w-3 h-3 rounded-sm bg-red-300 mr-2" />
                    66-100: Saturated (fatigue risk)
                  </li>
                </ul>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Audience Filter */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="w-4 h-4" />
            <span>Audience:</span>
          </div>
          <Select
            value={selectedAudienceId ?? "all"}
            onValueChange={(v) => setSelectedAudienceId(v === "all" ? null : v)}
          >
            <SelectTrigger className="w-[220px] h-8 text-xs">
              <SelectValue placeholder="All HCPs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All HCPs</SelectItem>
              {audiences.map((audience) => (
                <SelectItem key={audience.id} value={audience.id}>
                  <div className="flex items-center gap-2">
                    {audience.name}
                    <Badge variant="secondary" className="text-[10px] h-4 px-1">
                      {audience.hcpIds.length}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedAudience && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => setSelectedAudienceId(null)}
            >
              <X className="w-3 h-3" />
              Clear
            </Button>
          )}
        </div>

        {/* Heatmap Visualization */}
        <MessageSaturationHeatmap
          hcpIds={audienceHcpIds}
          onHcpClick={handleHcpClick}
        />
      </div>
    </div>
  );
}
