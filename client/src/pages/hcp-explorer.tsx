import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { RefreshCw, Download, Save, CheckSquare, FlaskConical, Zap, GitCompare, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { FilteredEmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { HCPProfileCard } from "@/components/hcp-profile-card";
import { HCPFilterSidebar } from "@/components/hcp-filter-sidebar";
import { HCPDetailPanel } from "@/components/hcp-detail-panel";
import { ViewCustomizer, useViewSettings } from "@/components/view-customizer";
import { SavedViewsSelector } from "@/components/filters/SavedViewsSelector";
import { KeyboardNavHint } from "@/components/ui/focus-indicator";
import { PostActionMenu } from "@/components/ui/post-action-menu";
import { ContextualActionBar } from "@/components/ui/contextual-action-bar";
import { useToast } from "@/hooks/use-toast";
import { useKeyboardNavigation } from "@/hooks/use-command-palette";
import type { HCPProfile, HCPFilter } from "@shared/schema";

export default function HCPExplorer() {
  const [filter, setFilter] = useState<HCPFilter>({});
  const [selectedHcp, setSelectedHcp] = useState<HCPProfile | null>(null);
  const { settings: viewSettings, setSettings: setViewSettings, gridClasses, isCompactCards } = useViewSettings();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastClickedId, setLastClickedId] = useState<string | null>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [audienceName, setAudienceName] = useState("");
  const [audienceDescription, setAudienceDescription] = useState("");
  const [showPostActionMenu, setShowPostActionMenu] = useState(false);
  const [savedAudienceInfo, setSavedAudienceInfo] = useState<{ id: string; name: string; count: number } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 50;

  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: hcps = [], isLoading, isError, error, refetch, isRefetching } = useQuery<HCPProfile[]>({
    queryKey: ["/api/hcps"],
  });

  const saveAudienceMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; hcpIds: string[] }) => {
      const response = await fetch("/api/audiences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          description: data.description,
          hcpIds: data.hcpIds,
          hcpCount: data.hcpIds.length,
          filters: filter,
          source: "explorer",
        }),
      });
      if (!response.ok) throw new Error("Failed to save audience");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/audiences"] });
      // Store saved audience info for PostActionMenu
      setSavedAudienceInfo({
        id: data.id,
        name: audienceName,
        count: selectedIds.size,
      });
      setSaveDialogOpen(false);
      setShowPostActionMenu(true);
      clearSelection();
      setAudienceName("");
      setAudienceDescription("");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
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

    if (filter.states?.length) {
      result = result.filter((hcp) => filter.states!.includes(hcp.state));
    }

    if (filter.minEngagementScore !== undefined) {
      result = result.filter((hcp) => hcp.overallEngagementScore >= filter.minEngagementScore!);
    }

    if (filter.maxEngagementScore !== undefined) {
      result = result.filter((hcp) => hcp.overallEngagementScore <= filter.maxEngagementScore!);
    }

    if (filter.channelPreference) {
      result = result.filter((hcp) => hcp.channelPreference === filter.channelPreference);
    }

    return result;
  }, [hcps, filter]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

  // Pagination
  const totalPages = Math.ceil(filteredHcps.length / ITEMS_PER_PAGE);
  const paginatedHcps = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredHcps.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredHcps, currentPage]);

  // Keyboard navigation for HCP list (only current page)
  const hcpIds = useMemo(() => paginatedHcps.map((h) => h.id), [paginatedHcps]);

  const handleKeyboardSelect = useCallback((id: string) => {
    const hcp = paginatedHcps.find((h) => h.id === id);
    if (hcp) {
      setSelectedHcp(hcp);
    }
  }, [paginatedHcps]);

  const handleKeyboardAction = useCallback((id: string, action: 'edit' | 'delete' | 'view') => {
    const hcp = paginatedHcps.find((h) => h.id === id);
    if (!hcp) return;

    if (action === 'view') {
      setSelectedHcp(hcp);
    }
    // Note: edit and delete actions can be implemented as needed
  }, [filteredHcps]);

  const { focusedIndex, focusedId } = useKeyboardNavigation({
    items: hcpIds,
    onSelect: handleKeyboardSelect,
    onAction: handleKeyboardAction,
    enabled: !selectedHcp && !saveDialogOpen, // Disable when detail panel or dialog is open
  });

  // Multi-select handlers
  const handleCardClick = useCallback((hcp: HCPProfile, event: React.MouseEvent) => {
    const isShiftClick = event.shiftKey;
    const isCtrlClick = event.ctrlKey || event.metaKey;

    if (isShiftClick && lastClickedId) {
      // Range selection
      const startIdx = filteredHcps.findIndex((h) => h.id === lastClickedId);
      const endIdx = filteredHcps.findIndex((h) => h.id === hcp.id);
      if (startIdx !== -1 && endIdx !== -1) {
        const [start, end] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
        const rangeIds = filteredHcps.slice(start, end + 1).map((h) => h.id);
        setSelectedIds((prev) => {
          const newSet = new Set(prev);
          rangeIds.forEach((id) => newSet.add(id));
          return newSet;
        });
      }
    } else if (isCtrlClick) {
      // Toggle individual selection
      setSelectedIds((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(hcp.id)) {
          newSet.delete(hcp.id);
        } else {
          newSet.add(hcp.id);
        }
        return newSet;
      });
    } else {
      // Open detail panel (single click behavior)
      setSelectedHcp(hcp);
    }
    setLastClickedId(hcp.id);
  }, [filteredHcps, lastClickedId]);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(filteredHcps.map((h) => h.id)));
  }, [filteredHcps]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const exportToCsv = useCallback(() => {
    const selectedHcps = filteredHcps.filter((h) => selectedIds.has(h.id));
    const headers = ["NPI", "First Name", "Last Name", "Specialty", "Tier", "Segment", "Organization", "City", "State", "Engagement Score", "Channel Preference", "Monthly Rx Volume", "Market Share %"];
    const rows = selectedHcps.map((h) => [
      h.npi, h.firstName, h.lastName, h.specialty, h.tier, h.segment,
      h.organization, h.city, h.state, h.overallEngagementScore,
      h.channelPreference, h.monthlyRxVolume, h.marketSharePct
    ]);

    const csvContent = [headers.join(","), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `hcp-export-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast({ title: "Export Complete", description: `Exported ${selectedHcps.length} HCPs to CSV` });
  }, [filteredHcps, selectedIds, toast]);

  const handleSaveAudience = useCallback(() => {
    if (!audienceName.trim()) return;
    saveAudienceMutation.mutate({
      name: audienceName.trim(),
      description: audienceDescription.trim(),
      hcpIds: Array.from(selectedIds),
    });
  }, [audienceName, audienceDescription, selectedIds, saveAudienceMutation]);

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
              Search and browse HCP profiles
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={selectAll}
              className="text-xs"
              data-testid="button-select-all"
            >
              <CheckSquare className="h-3.5 w-3.5 mr-1.5" />
              Select All ({filteredHcps.length})
            </Button>
            <SavedViewsSelector
              viewType="hcp_list"
              currentFilters={filter as Record<string, unknown>}
              onApplyView={(filters) => setFilter(filters as HCPFilter)}
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => refetch()}
              disabled={isRefetching}
              data-testid="button-refresh"
            >
              <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
            </Button>
            <ViewCustomizer
              settings={viewSettings}
              onSettingsChange={setViewSettings}
              data-testid="view-customizer"
            />
          </div>
        </div>

        <div className="h-[calc(100%-64px)] overflow-auto p-6">
          {isError ? (
            <ErrorState
              title="Unable to load HCP data."
              message={error instanceof Error ? error.message : "Failed to load HCP data. Please try again."}
              type="server"
              retry={() => refetch()}
              size="lg"
            />
          ) : isLoading ? (
            <div className={gridClasses}>
              {Array.from({ length: 9 }).map((_, i) => (
                <Skeleton key={i} className={isCompactCards ? "h-24" : "h-64"} data-testid={`skeleton-hcp-${i}`} />
              ))}
            </div>
          ) : filteredHcps.length === 0 ? (
            <FilteredEmptyState
              onClearFilters={() => setFilter({})}
              className="py-16"
            />
          ) : (
            <>
              {/* Pagination info */}
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">
                  Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredHcps.length)} of {filteredHcps.length.toLocaleString()} HCPs
                </p>
                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      data-testid="button-prev-page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground min-w-[80px] text-center">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      data-testid="button-next-page"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              <div className={gridClasses}>
                {paginatedHcps.map((hcp) => (
                  <HCPProfileCard
                    key={hcp.id}
                    hcp={hcp}
                    onSelect={setSelectedHcp}
                    isSelected={selectedHcp?.id === hcp.id}
                    isMultiSelected={selectedIds.has(hcp.id)}
                    onMultiSelectClick={handleCardClick}
                    compact={isCompactCards}
                    isKeyboardFocused={focusedId === hcp.id}
                  />
                ))}
              </div>

              {/* Bottom pagination for long pages */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground mx-4">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}

              <KeyboardNavHint
                show={paginatedHcps.length > 0}
                hint="navigate • Enter to view"
              />
            </>
          )}
        </div>
      </div>

      <HCPDetailPanel
        hcp={selectedHcp}
        open={!!selectedHcp}
        onClose={() => setSelectedHcp(null)}
        onSelectHcp={setSelectedHcp}
      />

      {/* Save Audience Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Save as Audience</DialogTitle>
            <DialogDescription>
              Save {selectedIds.size} selected HCP{selectedIds.size !== 1 ? "s" : ""} as a reusable audience for simulations and campaigns.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="audience-name">Audience Name</Label>
              <Input
                id="audience-name"
                placeholder="e.g., High-Value Oncologists Q1"
                value={audienceName}
                onChange={(e) => setAudienceName(e.target.value)}
                data-testid="input-audience-name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="audience-description">Description (optional)</Label>
              <Textarea
                id="audience-description"
                placeholder="Describe this audience segment..."
                value={audienceDescription}
                onChange={(e) => setAudienceDescription(e.target.value)}
                rows={3}
                data-testid="input-audience-description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveAudience}
              disabled={!audienceName.trim() || saveAudienceMutation.isPending}
              data-testid="button-confirm-save-audience"
            >
              {saveAudienceMutation.isPending ? "Saving..." : "Save Audience"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Post-save action menu - Phase 13.2 */}
      <PostActionMenu
        isOpen={showPostActionMenu}
        title="Audience saved"
        subtitle={savedAudienceInfo ? `${savedAudienceInfo.name} (${savedAudienceInfo.count} HCPs)` : undefined}
        actions={[
          {
            label: "Run Simulation",
            description: "Test campaign impact on this audience",
            icon: <FlaskConical className="h-5 w-5" />,
            onClick: () => {
              if (savedAudienceInfo) {
                navigate(`/simulations?audience=${savedAudienceInfo.id}`);
              }
            },
          },
          {
            label: "Generate Recommendations",
            description: "Get next best actions for this audience",
            icon: <Zap className="h-5 w-5" />,
            onClick: () => {
              if (savedAudienceInfo) {
                navigate(`/action-queue?audience=${savedAudienceInfo.id}`);
              }
            },
          },
          {
            label: "Compare Audiences",
            description: "Analyze against another audience",
            icon: <GitCompare className="h-5 w-5" />,
            onClick: () => {
              if (savedAudienceInfo) {
                navigate(`/cohort-compare?a=${savedAudienceInfo.id}`);
              }
            },
          },
        ]}
        onDismiss={() => {
          setShowPostActionMenu(false);
          setSavedAudienceInfo(null);
        }}
      />

      {/* Phase 13.2: Contextual action bar for multi-select */}
      <ContextualActionBar
        selectionCount={selectedIds.size}
        selectionLabel="HCP"
        actions={[
          {
            label: "Export CSV",
            onClick: exportToCsv,
            variant: "secondary",
            icon: <Download className="h-4 w-4" />,
          },
          {
            label: "Save as Audience",
            onClick: () => setSaveDialogOpen(true),
            variant: "primary",
            icon: <Save className="h-4 w-4" />,
          },
        ]}
        onClear={clearSelection}
      />
    </div>
  );
}
