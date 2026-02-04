/**
 * View Customizer Component
 *
 * Premium popover for customizing Signal Index view:
 * - View mode (grid/list)
 * - Card density
 * - Grid columns
 * - Sort options
 */

import { LayoutGrid, List, Rows3, Columns3, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

export type ViewMode = "grid" | "list";
export type CardDensity = "compact" | "comfortable" | "spacious";
export type SortField = "engagement" | "name" | "rxVolume" | "marketShare" | "conversion";
export type SortDirection = "asc" | "desc";

export interface ViewSettings {
  mode: ViewMode;
  density: CardDensity;
  gridColumns: number;
  sortField: SortField;
  sortDirection: SortDirection;
}

interface ViewCustomizerProps {
  settings: ViewSettings;
  onSettingsChange: (settings: ViewSettings) => void;
  className?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const sortOptions: { value: SortField; label: string }[] = [
  { value: "engagement", label: "Signal Score" },
  { value: "name", label: "Name" },
  { value: "rxVolume", label: "Rx Volume" },
  { value: "marketShare", label: "Market Share" },
  { value: "conversion", label: "Conversion" },
];

const densityLabels: Record<CardDensity, string> = {
  compact: "Compact",
  comfortable: "Comfortable",
  spacious: "Spacious",
};

// ============================================================================
// COMPONENT
// ============================================================================

export function ViewCustomizer({
  settings,
  onSettingsChange,
  className,
}: ViewCustomizerProps) {
  const updateSetting = <K extends keyof ViewSettings>(
    key: K,
    value: ViewSettings[K]
  ) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "gap-2 transition-all duration-200",
            className
          )}
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span className="hidden sm:inline">Customize</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-4 bg-background border-border"
        align="end"
      >
        <div className="space-y-5">
          {/* Header */}
          <div className="border-b border-border pb-3">
            <h4 className="font-semibold text-sm text-foreground">
              View Settings
            </h4>
            <p className="text-xs mt-0.5 text-muted-foreground">
              Customize how signals are displayed
            </p>
          </div>

          {/* View Mode */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Layout
            </Label>
            <ToggleGroup
              type="single"
              value={settings.mode}
              onValueChange={(value) => value && updateSetting("mode", value as ViewMode)}
              className="justify-start"
            >
              <ToggleGroupItem
                value="grid"
                className="gap-2 data-[state=on]:bg-primary/10 data-[state=on]:text-primary"
              >
                <LayoutGrid className="h-4 w-4" />
                Grid
              </ToggleGroupItem>
              <ToggleGroupItem
                value="list"
                className="gap-2 data-[state=on]:bg-primary/10 data-[state=on]:text-primary"
              >
                <List className="h-4 w-4" />
                List
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          {/* Density */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Density
            </Label>
            <ToggleGroup
              type="single"
              value={settings.density}
              onValueChange={(value) => value && updateSetting("density", value as CardDensity)}
              className="justify-start"
            >
              {(["compact", "comfortable", "spacious"] as CardDensity[]).map((density) => (
                <ToggleGroupItem
                  key={density}
                  value={density}
                  className="text-xs data-[state=on]:bg-primary/10 data-[state=on]:text-primary"
                >
                  {densityLabels[density]}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          {/* Grid Columns (only for grid mode) */}
          {settings.mode === "grid" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Columns
                </Label>
                <span className="text-xs font-mono font-medium text-accent">
                  {settings.gridColumns}
                </span>
              </div>
              <Slider
                value={[settings.gridColumns]}
                onValueChange={([value]) => updateSetting("gridColumns", value)}
                min={2}
                max={5}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>2</span>
                <span>5</span>
              </div>
            </div>
          )}

          {/* Sort */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Sort By
            </Label>
            <div className="flex gap-2">
              <Select
                value={settings.sortField}
                onValueChange={(value) => updateSetting("sortField", value as SortField)}
              >
                <SelectTrigger className="flex-1 h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sortOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <ToggleGroup
                type="single"
                value={settings.sortDirection}
                onValueChange={(value) => value && updateSetting("sortDirection", value as SortDirection)}
              >
                <ToggleGroupItem
                  value="desc"
                  className="h-9 w-9 p-0 data-[state=on]:bg-primary/10 data-[state=on]:text-primary"
                  title="Descending"
                >
                  <Rows3 className="h-4 w-4 rotate-180" />
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="asc"
                  className="h-9 w-9 p-0 data-[state=on]:bg-primary/10 data-[state=on]:text-primary"
                  title="Ascending"
                >
                  <Rows3 className="h-4 w-4" />
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>

          {/* Reset */}
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs text-muted-foreground hover:text-foreground"
            onClick={() => onSettingsChange({
              mode: "grid",
              density: "comfortable",
              gridColumns: 3,
              sortField: "engagement",
              sortDirection: "desc",
            })}
          >
            Reset to defaults
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ============================================================================
// HOOKS
// ============================================================================

import { useState, useCallback, useMemo } from "react";

const STORAGE_KEY = "omnivor_view_settings";

const defaultSettings: ViewSettings = {
  mode: "grid",
  density: "comfortable",
  gridColumns: 3,
  sortField: "engagement",
  sortDirection: "desc",
};

/**
 * Hook for managing view settings with localStorage persistence
 */
export function useViewSettings() {
  const [settings, setSettingsState] = useState<ViewSettings>(() => {
    if (typeof window === "undefined") return defaultSettings;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? { ...defaultSettings, ...JSON.parse(stored) } : defaultSettings;
    } catch {
      return defaultSettings;
    }
  });

  const setSettings = useCallback((newSettings: ViewSettings) => {
    setSettingsState(newSettings);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
    } catch {
      // Ignore storage errors
    }
  }, []);

  const gridClasses = useMemo(() => {
    if (settings.mode === "list") return "flex flex-col gap-3";

    const columnClasses: Record<number, string> = {
      2: "grid grid-cols-2 gap-4",
      3: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4",
      4: "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4",
      5: "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4",
    };

    const densityGap: Record<CardDensity, string> = {
      compact: "gap-2",
      comfortable: "gap-4",
      spacious: "gap-6",
    };

    return cn(
      columnClasses[settings.gridColumns] || columnClasses[3],
      densityGap[settings.density]
    );
  }, [settings.mode, settings.gridColumns, settings.density]);

  const isCompactCards = settings.mode === "list" || settings.density === "compact";

  return {
    settings,
    setSettings,
    gridClasses,
    isCompactCards,
  };
}
