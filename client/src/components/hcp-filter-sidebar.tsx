import { useState } from "react";
import { Search, Filter, X, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { HCPFilter, Channel } from "@shared/schema";
import { specialties, tiers, segments, channels } from "@shared/schema";

const channelLabels: Record<Channel, string> = {
  email: "Email",
  rep_visit: "Rep Visit",
  webinar: "Webinar",
  conference: "Conference",
  digital_ad: "Digital Ads",
  phone: "Phone",
};

interface FilterSidebarProps {
  filter: HCPFilter;
  onFilterChange: (filter: HCPFilter) => void;
  totalResults: number;
}

export function HCPFilterSidebar({
  filter,
  onFilterChange,
  totalResults,
}: FilterSidebarProps) {
  const [specialtiesOpen, setSpecialtiesOpen] = useState(true);
  const [tiersOpen, setTiersOpen] = useState(true);
  const [segmentsOpen, setSegmentsOpen] = useState(true);
  const [engagementOpen, setEngagementOpen] = useState(true);

  const activeFilterCount = [
    filter.specialties?.length ?? 0,
    filter.tiers?.length ?? 0,
    filter.segments?.length ?? 0,
    filter.channelPreference ? 1 : 0,
    filter.minEngagementScore !== undefined ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const handleSpecialtyChange = (specialty: typeof specialties[number], checked: boolean) => {
    const current = filter.specialties ?? [];
    const updated = checked
      ? [...current, specialty]
      : current.filter((s) => s !== specialty);
    onFilterChange({ ...filter, specialties: updated.length > 0 ? updated : undefined });
  };

  const handleTierChange = (tier: typeof tiers[number], checked: boolean) => {
    const current = filter.tiers ?? [];
    const updated = checked
      ? [...current, tier]
      : current.filter((t) => t !== tier);
    onFilterChange({ ...filter, tiers: updated.length > 0 ? updated : undefined });
  };

  const handleSegmentChange = (segment: typeof segments[number], checked: boolean) => {
    const current = filter.segments ?? [];
    const updated = checked
      ? [...current, segment]
      : current.filter((s) => s !== segment);
    onFilterChange({ ...filter, segments: updated.length > 0 ? updated : undefined });
  };

  const clearFilters = () => {
    onFilterChange({ search: filter.search });
  };

  return (
    <div className="flex h-full flex-col border-r border-sidebar-border bg-sidebar">
      <div className="border-b border-sidebar-border p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or NPI..."
            value={filter.search ?? ""}
            onChange={(e) => onFilterChange({ ...filter, search: e.target.value || undefined })}
            className="pl-9"
            data-testid="input-search-hcp"
          />
        </div>
      </div>

      <div className="flex items-center justify-between border-b border-sidebar-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filters</span>
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="text-xs" data-testid="badge-filter-count">
              {activeFilterCount}
            </Badge>
          )}
        </div>
        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-7 text-xs"
            data-testid="button-clear-filters"
          >
            Clear all
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-1 p-2">
          <Collapsible open={specialtiesOpen} onOpenChange={setSpecialtiesOpen}>
            <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium hover-elevate">
              <span>Specialty</span>
              {specialtiesOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-1 px-3 py-2">
              {specialties.map((specialty) => (
                <div key={specialty} className="flex items-center space-x-2">
                  <Checkbox
                    id={`specialty-${specialty}`}
                    checked={filter.specialties?.includes(specialty) ?? false}
                    onCheckedChange={(checked) =>
                      handleSpecialtyChange(specialty, checked as boolean)
                    }
                    data-testid={`checkbox-specialty-${specialty.toLowerCase()}`}
                  />
                  <Label
                    htmlFor={`specialty-${specialty}`}
                    className="text-sm font-normal"
                  >
                    {specialty}
                  </Label>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>

          <Collapsible open={tiersOpen} onOpenChange={setTiersOpen}>
            <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium hover-elevate">
              <span>Tier</span>
              {tiersOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-1 px-3 py-2">
              {tiers.map((tier) => (
                <div key={tier} className="flex items-center space-x-2">
                  <Checkbox
                    id={`tier-${tier}`}
                    checked={filter.tiers?.includes(tier) ?? false}
                    onCheckedChange={(checked) =>
                      handleTierChange(tier, checked as boolean)
                    }
                    data-testid={`checkbox-tier-${tier.toLowerCase().replace(/\s+/g, "-")}`}
                  />
                  <Label htmlFor={`tier-${tier}`} className="text-sm font-normal">
                    {tier}
                  </Label>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>

          <Collapsible open={segmentsOpen} onOpenChange={setSegmentsOpen}>
            <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium hover-elevate">
              <span>Segment</span>
              {segmentsOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-1 px-3 py-2">
              {segments.map((segment) => (
                <div key={segment} className="flex items-center space-x-2">
                  <Checkbox
                    id={`segment-${segment}`}
                    checked={filter.segments?.includes(segment) ?? false}
                    onCheckedChange={(checked) =>
                      handleSegmentChange(segment, checked as boolean)
                    }
                    data-testid={`checkbox-segment-${segment.toLowerCase().replace(/\s+/g, "-")}`}
                  />
                  <Label
                    htmlFor={`segment-${segment}`}
                    className="text-sm font-normal"
                  >
                    {segment}
                  </Label>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>

          <Collapsible open={engagementOpen} onOpenChange={setEngagementOpen}>
            <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium hover-elevate">
              <span>Engagement & Channel</span>
              {engagementOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 px-3 py-2">
              <div className="space-y-3">
                <Label className="text-xs text-muted-foreground">
                  Min Engagement Score: {filter.minEngagementScore ?? 0}
                </Label>
                <Slider
                  value={[filter.minEngagementScore ?? 0]}
                  onValueChange={([value]) =>
                    onFilterChange({
                      ...filter,
                      minEngagementScore: value > 0 ? value : undefined,
                    })
                  }
                  max={100}
                  step={5}
                  className="w-full"
                  data-testid="slider-min-engagement"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Channel Preference
                </Label>
                <Select
                  value={filter.channelPreference ?? "all"}
                  onValueChange={(value) =>
                    onFilterChange({
                      ...filter,
                      channelPreference: value === "all" ? undefined : (value as Channel),
                    })
                  }
                >
                  <SelectTrigger className="w-full" data-testid="select-channel-preference">
                    <SelectValue placeholder="All channels" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All channels</SelectItem>
                    {channels.map((channel) => (
                      <SelectItem key={channel} value={channel}>
                        {channelLabels[channel]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </ScrollArea>

      <div className="border-t border-sidebar-border p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Results</span>
          <span className="font-mono font-medium" data-testid="text-result-count">{totalResults}</span>
        </div>
      </div>
    </div>
  );
}
