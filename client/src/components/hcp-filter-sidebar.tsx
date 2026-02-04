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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { HCPFilter, Channel } from "@shared/schema";
import { specialties, tiers, segments, channels } from "@shared/schema";

// US States and territories for location filtering
const usStates = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "PR", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
] as const;

const stateNames: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri",
  MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
  NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio",
  OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", PR: "Puerto Rico", RI: "Rhode Island",
  SC: "South Carolina", SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah",
  VT: "Vermont", VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin",
  WY: "Wyoming"
};

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
    filter.channelPreferences?.length ?? 0,
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

  const handleChannelChange = (channel: Channel, checked: boolean) => {
    const current = filter.channelPreferences ?? [];
    const updated = checked
      ? [...current, channel]
      : current.filter((c) => c !== channel);
    onFilterChange({ ...filter, channelPreferences: updated.length > 0 ? updated : undefined });
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
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between h-9 text-sm font-normal"
                    data-testid="button-location-picker"
                  >
                    {(filter.states?.length ?? 0) > 0 ? (
                      <span className="truncate">
                        {filter.states!.length === 1
                          ? stateNames[filter.states![0]] || filter.states![0]
                          : `${filter.states!.length} states selected`}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Select locations...</span>
                    )}
                    <ChevronDown className="h-4 w-4 ml-2 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-0" align="start">
                  <div className="p-2 border-b">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">
                        {filter.states?.length ?? 0} selected
                      </span>
                      {(filter.states?.length ?? 0) > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs px-2"
                          onClick={() => onFilterChange({ ...filter, states: undefined })}
                        >
                          Clear all
                        </Button>
                      )}
                    </div>
                  </div>
                  <ScrollArea className="h-64">
                    <div className="p-2 space-y-1">
                      {usStates.map((state) => (
                        <div
                          key={state}
                          className="flex items-center space-x-2 px-2 py-1.5 rounded-md hover:bg-muted cursor-pointer"
                          onClick={() => handleStateChange(state, !filter.states?.includes(state))}
                        >
                          <Checkbox
                            id={`state-${state}`}
                            checked={filter.states?.includes(state) ?? false}
                            onCheckedChange={(checked) =>
                              handleStateChange(state, checked as boolean)
                            }
                            data-testid={`checkbox-state-${state.toLowerCase()}`}
                          />
                          <Label
                            htmlFor={`state-${state}`}
                            className="text-sm font-normal cursor-pointer flex-1"
                          >
                            {stateNames[state]} ({state})
                          </Label>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </PopoverContent>
              </Popover>
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
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between h-9 text-sm font-normal"
                      data-testid="button-channel-picker"
                    >
                      {(filter.channelPreferences?.length ?? 0) > 0 ? (
                        <span className="truncate">
                          {filter.channelPreferences!.length === 1
                            ? channelLabels[filter.channelPreferences![0]]
                            : `${filter.channelPreferences!.length} channels selected`}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">All channels</span>
                      )}
                      <ChevronDown className="h-4 w-4 ml-2 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-0" align="start">
                    <div className="p-2 border-b">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">
                          {filter.channelPreferences?.length ?? 0} selected
                        </span>
                        {(filter.channelPreferences?.length ?? 0) > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs px-2"
                            onClick={() => onFilterChange({ ...filter, channelPreferences: undefined })}
                          >
                            Clear all
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="p-2 space-y-1">
                      {channels.map((channel) => (
                        <div
                          key={channel}
                          className="flex items-center space-x-2 px-2 py-1.5 rounded-md hover:bg-muted cursor-pointer"
                          onClick={() => handleChannelChange(channel, !filter.channelPreferences?.includes(channel))}
                        >
                          <Checkbox
                            id={`channel-${channel}`}
                            checked={filter.channelPreferences?.includes(channel) ?? false}
                            onCheckedChange={(checked) =>
                              handleChannelChange(channel, checked as boolean)
                            }
                            data-testid={`checkbox-channel-${channel}`}
                          />
                          <Label
                            htmlFor={`channel-${channel}`}
                            className="text-sm font-normal cursor-pointer flex-1"
                          >
                            {channelLabels[channel]}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
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
