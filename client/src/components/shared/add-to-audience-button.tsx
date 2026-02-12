/**
 * Add to Audience Button — One-tap HCP -> audience gesture.
 *
 * Appears on: Explorer cards, Audience Builder preview, Action Queue cards,
 * NBO recommendation cards, Simulation results.
 *
 * Quick-save with dropdown to select target audience.
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bookmark, BookmarkCheck, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { SavedAudience } from "@shared/schema";

interface AddToAudienceButtonProps {
  hcpId: string;
  hcpName?: string;
  compact?: boolean;
  className?: string;
}

export function AddToAudienceButton({
  hcpId,
  hcpName,
  compact = false,
  className,
}: AddToAudienceButtonProps) {
  const [saved, setSaved] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: audiences = [] } = useQuery<SavedAudience[]>({
    queryKey: ["/api/audiences"],
    queryFn: async () => {
      const response = await fetch("/api/audiences", { credentials: "include" });
      if (!response.ok) return [];
      return response.json();
    },
  });

  const addMutation = useMutation({
    mutationFn: async (audienceId: string) => {
      const audience = audiences.find((a) => a.id === audienceId);
      if (!audience) throw new Error("Audience not found");

      const response = await fetch(`/api/audiences/${audienceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          hcpIds: Array.from(new Set([...audience.hcpIds, hcpId])),
        }),
      });
      if (!response.ok) throw new Error("Failed to add to audience");
      return response.json();
    },
    onSuccess: (_, audienceId) => {
      const audience = audiences.find((a) => a.id === audienceId);
      setSaved(true);
      toast({
        title: "Added to audience",
        description: `${hcpName || "HCP"} added to ${audience?.name || "audience"}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/audiences"] });
    },
    onError: () => {
      toast({
        title: "Failed to add",
        description: "Could not add HCP to audience. Try again.",
        variant: "destructive",
      });
    },
  });

  if (compact) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-7 w-7", className)}
          >
            {saved ? (
              <BookmarkCheck className="h-3.5 w-3.5" style={{ color: "var(--catalyst-gold, #d97706)" }} />
            ) : (
              <Bookmark className="h-3.5 w-3.5" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {audiences.map((audience) => (
            <DropdownMenuItem
              key={audience.id}
              onClick={() => addMutation.mutate(audience.id)}
              disabled={audience.hcpIds.includes(hcpId)}
            >
              {audience.name}
              {audience.hcpIds.includes(hcpId) && (
                <span className="ml-auto text-xs text-muted-foreground">Added</span>
              )}
            </DropdownMenuItem>
          ))}
          {audiences.length === 0 && (
            <DropdownMenuItem disabled>No audiences yet</DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className={cn("gap-1.5", className)}>
          {saved ? (
            <BookmarkCheck className="h-3.5 w-3.5" style={{ color: "var(--catalyst-gold, #d97706)" }} />
          ) : (
            <Bookmark className="h-3.5 w-3.5" />
          )}
          <span>Save</span>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {audiences.map((audience) => (
          <DropdownMenuItem
            key={audience.id}
            onClick={() => addMutation.mutate(audience.id)}
            disabled={audience.hcpIds.includes(hcpId)}
          >
            {audience.name}
            <span className="ml-auto text-xs text-muted-foreground">
              {audience.hcpIds.length} HCPs
            </span>
          </DropdownMenuItem>
        ))}
        {audiences.length === 0 && (
          <DropdownMenuItem disabled>No audiences yet</DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
