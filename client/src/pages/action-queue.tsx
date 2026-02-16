import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ActionQueue } from "@/components/action-queue";
import { HCPProfileDrawer } from "@/components/hcp-profile-drawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { SavedAudience, HCPProfile } from "@shared/schema";
import type { HCPDrawerAction } from "@/components/hcp-profile-drawer";

export default function ActionQueuePage() {
  const [, navigate] = useLocation();
  const [selectedAudienceId, setSelectedAudienceId] = useState<string>("");
  const [selectedHcpId, setSelectedHcpId] = useState<string | null>(null);

  // Fetch saved audiences (enriched with validHcpCount from server)
  const { data: allAudiences = [] } = useQuery<(SavedAudience & { validHcpCount?: number })[]>({
    queryKey: ["/api/audiences"],
    queryFn: async () => {
      const response = await fetch("/api/audiences");
      if (!response.ok) throw new Error("Failed to fetch audiences");
      return response.json();
    },
  });
  // Filter out stale audiences with 0 valid HCPs
  const audiences = allAudiences.filter((a) => a.validHcpCount === undefined || a.validHcpCount > 0);

  // Fetch all HCPs (for "All HCPs" option)
  const { data: allHcps = [] } = useQuery<HCPProfile[]>({
    queryKey: ["/api/hcps"],
    queryFn: async () => {
      const response = await fetch("/api/hcps");
      if (!response.ok) throw new Error("Failed to fetch HCPs");
      return response.json();
    },
  });

  // Get selected audience
  const selectedAudience = audiences.find((a) => a.id === selectedAudienceId);

  // Get HCP IDs based on selection
  const hcpIds =
    selectedAudienceId === "all"
      ? allHcps.map((h) => h.id)
      : selectedAudience?.hcpIds || [];

  const audienceName =
    selectedAudienceId === "all"
      ? "All HCPs"
      : selectedAudience?.name;

  // Phase 13.4: Handle HCP drawer actions
  const handleHcpDrawerAction = (action: HCPDrawerAction, hcpId: string) => {
    setSelectedHcpId(null);
    switch (action) {
      case "view":
        navigate(`/?hcp=${hcpId}`);
        break;
      case "ecosystem":
        navigate(`/ecosystem-map?hcp=${hcpId}`);
        break;
      case "audience":
        navigate(`/audience-builder?addHcp=${hcpId}`);
        break;
    }
  };

  return (
    <div className="h-full overflow-auto">
      <div className="sticky top-0 z-10 border-b bg-background px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold" data-testid="text-page-title">
              Action Queue
            </h1>
            <p className="text-sm text-muted-foreground">
              Prioritized next best actions for your cohorts
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={selectedAudienceId} onValueChange={setSelectedAudienceId}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Select an audience..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <div className="flex items-center gap-2">
                    All HCPs
                    <Badge variant="secondary" className="text-xs">
                      {allHcps.length}
                    </Badge>
                  </div>
                </SelectItem>
                {audiences.map((audience) => (
                  <SelectItem key={audience.id} value={audience.id}>
                    <div className="flex items-center gap-2">
                      {audience.name}
                      <Badge variant="secondary" className="text-xs">
                        {audience.hcpIds.length}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="p-6">
        {selectedAudienceId ? (
          <ActionQueue
            hcpIds={hcpIds}
            audienceName={audienceName}
            onHcpClick={(hcpId) => setSelectedHcpId(hcpId)}
          />
        ) : (
          <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
            <p className="text-sm">
              Select an audience from the dropdown above to view the action queue.
            </p>
            <p className="mt-2 text-xs">
              You can choose "All HCPs" or a saved audience from the Audience Builder.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => navigate("/audience-builder")}
              data-testid="button-go-to-audience-builder"
            >
              Go to Audience Builder
            </Button>
          </div>
        )}
      </div>

      {/* Phase 13.4: HCP Profile Drawer for quick preview */}
      <HCPProfileDrawer
        hcpId={selectedHcpId}
        isOpen={!!selectedHcpId}
        onClose={() => setSelectedHcpId(null)}
        onAction={handleHcpDrawerAction}
      />
    </div>
  );
}
