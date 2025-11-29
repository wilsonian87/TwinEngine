import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { LayoutGrid, List, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { HCPProfileCard } from "@/components/hcp-profile-card";
import { HCPFilterSidebar } from "@/components/hcp-filter-sidebar";
import { HCPDetailPanel } from "@/components/hcp-detail-panel";
import type { HCPProfile, HCPFilter } from "@shared/schema";

export default function HCPExplorer() {
  const [filter, setFilter] = useState<HCPFilter>({});
  const [selectedHcp, setSelectedHcp] = useState<HCPProfile | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const { data: hcps = [], isLoading, isError, error, refetch, isRefetching } = useQuery<HCPProfile[]>({
    queryKey: ["/api/hcps"],
  });

  const filteredHcps = useMemo(() => {
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

    if (filter.minEngagementScore !== undefined) {
      result = result.filter((hcp) => hcp.overallEngagementScore >= filter.minEngagementScore!);
    }

    if (filter.channelPreference) {
      result = result.filter((hcp) => hcp.channelPreference === filter.channelPreference);
    }

    return result;
  }, [hcps, filter]);

  return (
    <div className="flex h-full">
      <div className="w-72 shrink-0">
        <HCPFilterSidebar
          filter={filter}
          onFilterChange={setFilter}
          totalResults={filteredHcps.length}
        />
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background px-6 py-3">
          <div>
            <h1 className="text-lg font-semibold" data-testid="text-page-title">HCP Explorer</h1>
            <p className="text-sm text-muted-foreground">
              Browse and analyze healthcare professional profiles
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => refetch()}
              disabled={isRefetching}
              data-testid="button-refresh"
            >
              <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
            </Button>
            <div className="flex rounded-md border">
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="icon"
                className="rounded-r-none"
                onClick={() => setViewMode("grid")}
                data-testid="button-view-grid"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="icon"
                className="rounded-l-none"
                onClick={() => setViewMode("list")}
                data-testid="button-view-list"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="h-[calc(100%-64px)] overflow-auto p-6">
          {isError ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Alert variant="destructive" className="max-w-md">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error Loading HCPs</AlertTitle>
                <AlertDescription>
                  {error instanceof Error ? error.message : "Failed to load HCP data. Please try again."}
                </AlertDescription>
              </Alert>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => refetch()}
                data-testid="button-retry-load"
              >
                Try Again
              </Button>
            </div>
          ) : isLoading ? (
            <div className={viewMode === "grid" 
              ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
              : "space-y-3"
            }>
              {Array.from({ length: 9 }).map((_, i) => (
                <Skeleton key={i} className={viewMode === "grid" ? "h-64" : "h-24"} data-testid={`skeleton-hcp-${i}`} />
              ))}
            </div>
          ) : filteredHcps.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 rounded-full bg-muted p-6">
                <List className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold">No HCPs found</h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Try adjusting your filters or search criteria to find matching healthcare professionals.
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setFilter({})}
                data-testid="button-clear-all"
              >
                Clear all filters
              </Button>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredHcps.map((hcp) => (
                <HCPProfileCard
                  key={hcp.id}
                  hcp={hcp}
                  onSelect={setSelectedHcp}
                  isSelected={selectedHcp?.id === hcp.id}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredHcps.map((hcp) => (
                <HCPProfileCard
                  key={hcp.id}
                  hcp={hcp}
                  onSelect={setSelectedHcp}
                  isSelected={selectedHcp?.id === hcp.id}
                  compact
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <HCPDetailPanel
        hcp={selectedHcp}
        open={!!selectedHcp}
        onClose={() => setSelectedHcp(null)}
        onSelectHcp={setSelectedHcp}
      />
    </div>
  );
}
