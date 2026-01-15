import { useState } from "react";
import { Search, Filter, X, ChevronDown, ChevronUp, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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

// US States for location filtering
const usStates = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
] as const;

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
  const [locationOpen, setLocationOpen] = useState(false);

  // Engagement mode: "min" finds high engagers, "max" finds low engagers needing attention
  const [engagementMode, setEngagementMode] = useState<"min" | "max">("min");

  const activeFilterCount = [
    filter.specialties?.length ?? 0,
    filter.tiers?.length ?? 0,
    filter.segments?.length ?? 0,
    filter.states?.length ?? 0,
    filter.channelPreference ? 1 : 0,
    filter.minEngagementScore !== undefined || filter.maxEngagementScore !== undefined ? 1 : 0,
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

  const handleStateChange = (state: string, checked: boolean) => {
    const current = filter.states ?? [];
    const updated = checked
      ? [...current, state]
      : current.filter((s) => s !== state);
    onFilterChange({ ...filter, states: updated.length > 0 ? updated : undefined });
  };

  const handleEngagementModeToggle = (isMax: boolean) => {
    const newMode = isMax ? "max" : "min";
    setEngagementMode(newMode);
    // Clear the opposite filter when switching modes
    if (newMode === "max") {
      onFilterChange({
        ...filter,
        minEngagementScore: undefined,
        maxEngagementScore: filter.minEngagementScore ?? 50,
      });
    } else {
      onFilterChange({
        ...filter,
        maxEngagementScore: undefined,
        minEngagementScore: filter.maxEngagementScore ?? 50,
      });
    }
  };

  const clearFilters = () => {
    onFilterChange({ search: filter.search });
    setEngagementMode("min");
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

          <Collapsible open={locationOpen} onOpenChange={setLocationOpen}>
            <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium hover-elevate">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>Location</span>
                {(filter.states?.length ?? 0) > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {filter.states?.length}
                  </Badge>
                )}
              </div>
              {locationOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent className="px-3 py-2">
              <div className="grid grid-cols-5 gap-1 max-h-40 overflow-y-auto">
                {usStates.map((state) => (
                  <div key={state} className="flex items-center">
                    <Checkbox
                      id={`state-${state}`}
                      checked={filter.states?.includes(state) ?? false}
                      onCheckedChange={(checked) =>
                        handleStateChange(state, checked as boolean)
                      }
                      className="h-3.5 w-3.5"
                      data-testid={`checkbox-state-${state.toLowerCase()}`}
                    />
                    <Label
                      htmlFor={`state-${state}`}
                      className="ml-1 text-xs font-normal cursor-pointer"
                    >
                      {state}
                    </Label>
                  </div>
                ))}
              </div>
              {(filter.states?.length ?? 0) > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 h-6 text-xs w-full"
                  onClick={() => onFilterChange({ ...filter, states: undefined })}
                >
                  Clear states
                </Button>
              )}
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
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">
                    {engagementMode === "min" ? "Minimum" : "Maximum"} Score: {
                      engagementMode === "min"
                        ? (filter.minEngagementScore ?? 0)
                        : (filter.maxEngagementScore ?? 100)
                    }
                  </Label>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">High</span>
                    <Switch
                      checked={engagementMode === "max"}
                      onCheckedChange={handleEngagementModeToggle}
                      className="scale-75"
                      data-testid="switch-engagement-mode"
                    />
                    <span className="text-[10px] text-muted-foreground">Low</span>
                  </div>
                </div>
                <Slider
                  value={[engagementMode === "min"
                    ? (filter.minEngagementScore ?? 0)
                    : (filter.maxEngagementScore ?? 100)
                  ]}
                  onValueChange={([value]) => {
                    if (engagementMode === "min") {
                      onFilterChange({
                        ...filter,
                        minEngagementScore: value > 0 ? value : undefined,
                      });
                    } else {
                      onFilterChange({
                        ...filter,
                        maxEngagementScore: value < 100 ? value : undefined,
                      });
                    }
                  }}
                  max={100}
                  step={5}
                  className="w-full"
                  data-testid="slider-engagement"
                />
                <p className="text-[10px] text-muted-foreground">
                  {engagementMode === "min"
                    ? "Find high engagers (score ≥ threshold)"
                    : "Find low engagers needing attention (score ≤ threshold)"
                  }
                </p>
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
