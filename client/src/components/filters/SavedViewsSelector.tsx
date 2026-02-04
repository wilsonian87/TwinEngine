import { useState, useEffect } from "react";
import {
  Save,
  Star,
  StarOff,
  Trash2,
  MoreHorizontal,
  Bookmark,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useSavedViews, type SavedView } from "@/hooks/use-saved-views";

// ============================================================================
// TYPES
// ============================================================================

interface SavedViewsSelectorProps {
  viewType: string;
  currentFilters: Record<string, unknown>;
  onApplyView: (filters: Record<string, unknown>) => void;
  onDefaultLoaded?: (view: SavedView) => void;
}

// ============================================================================
// SAVE DIALOG
// ============================================================================

interface SaveViewDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (name: string, isDefault: boolean) => void;
  isPending: boolean;
  existingName?: string;
}

function SaveViewDialog({
  open,
  onClose,
  onSave,
  isPending,
  existingName,
}: SaveViewDialogProps) {
  const [name, setName] = useState(existingName || "");
  const [isDefault, setIsDefault] = useState(false);

  useEffect(() => {
    if (open) {
      setName(existingName || "");
      setIsDefault(false);
    }
  }, [open, existingName]);

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSave(name.trim(), isDefault);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Save Current View</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="view-name">View Name</Label>
            <Input
              id="view-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., High-Value Oncologists"
              autoFocus
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="set-default"
              checked={isDefault}
              onCheckedChange={(checked) => setIsDefault(!!checked)}
            />
            <Label htmlFor="set-default" className="text-sm font-normal">
              Set as default view
            </Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending || !name.trim()}>
            {isPending ? "Saving..." : "Save View"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function SavedViewsSelector({
  viewType,
  currentFilters,
  onApplyView,
  onDefaultLoaded,
}: SavedViewsSelectorProps) {
  const { toast } = useToast();
  const {
    views,
    defaultView,
    isLoading,
    saveView,
    deleteView,
    setDefault,
  } = useSavedViews(viewType);

  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [selectedViewId, setSelectedViewId] = useState<string | undefined>();
  const [defaultApplied, setDefaultApplied] = useState(false);

  // Apply default view on first load
  useEffect(() => {
    if (!defaultApplied && defaultView && !isLoading) {
      setSelectedViewId(defaultView.id);
      onApplyView(defaultView.filters);
      onDefaultLoaded?.(defaultView);
      setDefaultApplied(true);
    }
  }, [defaultView, isLoading, defaultApplied, onApplyView, onDefaultLoaded]);

  const handleSelectView = (viewId: string) => {
    if (viewId === "__save__") {
      setSaveDialogOpen(true);
      return;
    }

    const view = views.find((v) => v.id === viewId);
    if (view) {
      setSelectedViewId(viewId);
      onApplyView(view.filters);
    }
  };

  const handleSaveView = (name: string, isDefault: boolean) => {
    saveView.mutate(
      { name, filters: currentFilters, isDefault },
      {
        onSuccess: (newView) => {
          toast({ title: "View saved successfully" });
          setSaveDialogOpen(false);
          setSelectedViewId(newView.id);
        },
        onError: () => {
          toast({ title: "Failed to save view", variant: "destructive" });
        },
      }
    );
  };

  const handleSetDefault = (viewId: string) => {
    setDefault.mutate(viewId, {
      onSuccess: () => {
        toast({ title: "Default view updated" });
      },
      onError: () => {
        toast({ title: "Failed to set default", variant: "destructive" });
      },
    });
  };

  const handleDeleteView = (viewId: string) => {
    if (!confirm("Delete this saved view?")) return;

    deleteView.mutate(viewId, {
      onSuccess: () => {
        toast({ title: "View deleted" });
        if (selectedViewId === viewId) {
          setSelectedViewId(undefined);
        }
      },
      onError: () => {
        toast({ title: "Failed to delete view", variant: "destructive" });
      },
    });
  };

  const selectedView = views.find((v) => v.id === selectedViewId);

  return (
    <div className="flex items-center gap-2">
      <Select
        value={selectedViewId || ""}
        onValueChange={handleSelectView}
      >
        <SelectTrigger className="w-48">
          <div className="flex items-center gap-2">
            <Bookmark className="h-4 w-4 text-muted-foreground" />
            <SelectValue placeholder="Saved Views" />
          </div>
        </SelectTrigger>
        <SelectContent>
          {views.length === 0 && !isLoading && (
            <div className="px-2 py-4 text-sm text-muted-foreground text-center">
              No saved views
            </div>
          )}
          {views.map((view) => (
            <SelectItem key={view.id} value={view.id}>
              <div className="flex items-center gap-2">
                {view.isDefault && (
                  <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                )}
                <span>{view.name}</span>
              </div>
            </SelectItem>
          ))}
          {views.length > 0 && (
            <div className="border-t my-1" />
          )}
          <SelectItem value="__save__">
            <div className="flex items-center gap-2 text-primary">
              <Save className="h-3 w-3" />
              <span>Save Current View</span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>

      {/* Quick save button */}
      <Button
        variant="outline"
        size="icon"
        onClick={() => setSaveDialogOpen(true)}
        title="Save current view"
      >
        <Save className="h-4 w-4" />
      </Button>

      {/* Actions for selected view */}
      {selectedView && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => handleSetDefault(selectedView.id)}
              disabled={selectedView.isDefault}
            >
              {selectedView.isDefault ? (
                <>
                  <StarOff className="h-4 w-4 mr-2" />
                  Current Default
                </>
              ) : (
                <>
                  <Star className="h-4 w-4 mr-2" />
                  Set as Default
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => handleDeleteView(selectedView.id)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete View
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Save Dialog */}
      <SaveViewDialog
        open={saveDialogOpen}
        onClose={() => setSaveDialogOpen(false)}
        onSave={handleSaveView}
        isPending={saveView.isPending}
      />
    </div>
  );
}
