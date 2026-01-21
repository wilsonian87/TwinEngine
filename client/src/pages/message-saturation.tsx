/**
 * Message Saturation Page
 *
 * Phase 12B: Visualize message theme saturation across HCP portfolio.
 * Features heatmap visualization with filtering and drill-down capabilities.
 */

import { useState } from "react";
import { useLocation } from "wouter";
import { Flame, RefreshCw, Download, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MessageSaturationHeatmap } from "@/components/message-saturation";
import { useToast } from "@/hooks/use-toast";

export default function MessageSaturationPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isSeeding, setIsSeeding] = useState(false);

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

        {/* Heatmap Visualization */}
        <MessageSaturationHeatmap onHcpClick={handleHcpClick} />
      </div>
    </div>
  );
}
