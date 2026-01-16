import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ActionQueue } from "@/components/action-queue";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { SavedAudience, HCPProfile } from "@shared/schema";

export default function ActionQueuePage() {
  const [selectedAudienceId, setSelectedAudienceId] = useState<string>("");

  // Fetch saved audiences
  const { data: audiences = [] } = useQuery<SavedAudience[]>({
    queryKey: ["/api/audiences"],
    queryFn: async () => {
      const response = await fetch("/api/audiences");
      if (!response.ok) throw new Error("Failed to fetch audiences");
      return response.json();
    },
  });

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

  return (
    <div className="h-full overflow-auto">
      <div className="sticky top-0 z-10 border-b bg-background px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold" data-testid="text-page-title">
              Action Queue
            </h1>
            <p className="text-sm text-muted-foreground">
              Prioritized next best actions for your HCP cohorts
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
          <ActionQueue hcpIds={hcpIds} audienceName={audienceName} />
        ) : (
          <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
            <p className="text-sm">
              Select an audience from the dropdown above to view the action queue.
            </p>
            <p className="mt-2 text-xs">
              You can choose "All HCPs" or a saved audience from the Audience Builder.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
