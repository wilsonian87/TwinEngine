import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { NLAudienceBuilder } from "@/components/nl-audience-builder";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GitCompare, Users, FolderOpen, ChevronDown, ChevronUp, FlaskConical } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { SavedAudience } from "@shared/schema";

export default function AudienceBuilder() {
  const [, navigate] = useLocation();
  const [savedAudiencesOpen, setSavedAudiencesOpen] = useState(true);
  const [selectedForCompare, setSelectedForCompare] = useState<Set<string>>(new Set());

  // Fetch saved audiences
  const { data: audiences = [], isLoading: loadingAudiences } = useQuery<SavedAudience[]>({
    queryKey: ["/api/audiences"],
    queryFn: async () => {
      const response = await fetch("/api/audiences");
      if (!response.ok) throw new Error("Failed to fetch audiences");
      return response.json();
    },
  });

  // Toggle selection for comparison
  const toggleCompareSelection = (id: string) => {
    setSelectedForCompare((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        // Max 2 selections for comparison
        if (next.size >= 2) {
          // Remove first, add new
          const first = Array.from(next)[0];
          next.delete(first);
        }
        next.add(id);
      }
      return next;
    });
  };

  // Navigate to compare page with selected audiences
  const handleCompare = () => {
    const ids = Array.from(selectedForCompare);
    if (ids.length === 2) {
      navigate(`/cohort-compare?a=${ids[0]}&b=${ids[1]}`);
    }
  };

  return (
    <div className="h-full overflow-auto">
      <div className="sticky top-0 z-10 border-b bg-background px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold" data-testid="text-page-title">Audience Builder</h1>
            <p className="text-sm text-muted-foreground">
              Build and explore HCP cohorts using natural language
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Saved Audiences Section - Phase 13.3 */}
        <Collapsible open={savedAudiencesOpen} onOpenChange={setSavedAudiencesOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FolderOpen className="h-4 w-4" />
                    Saved Audiences
                    <Badge variant="secondary" className="ml-1">
                      {audiences.length}
                    </Badge>
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {selectedForCompare.size === 2 && (
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCompare();
                        }}
                        className="h-7 text-xs"
                        data-testid="button-compare-audiences"
                      >
                        <GitCompare className="h-3.5 w-3.5 mr-1" />
                        Compare Selected
                      </Button>
                    )}
                    {savedAudiencesOpen ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                {loadingAudiences ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="p-3 rounded-lg border bg-muted/50 animate-pulse">
                        <div className="h-4 bg-muted rounded w-1/3 mb-2" />
                        <div className="h-3 bg-muted rounded w-1/2" />
                      </div>
                    ))}
                  </div>
                ) : audiences.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No saved audiences yet</p>
                    <p className="text-xs mt-1">Create your first audience below</p>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground mb-3">
                      Select 2 audiences to compare them side-by-side
                    </p>
                    <ScrollArea className="h-48">
                      <div className="space-y-2 pr-4">
                        {audiences.map((audience) => (
                          <div
                            key={audience.id}
                            className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                              selectedForCompare.has(audience.id)
                                ? "border-primary bg-primary/5"
                                : "hover:bg-muted/50"
                            }`}
                            data-testid={`audience-item-${audience.id}`}
                          >
                            <Checkbox
                              checked={selectedForCompare.has(audience.id)}
                              onCheckedChange={() => toggleCompareSelection(audience.id)}
                              className="h-4 w-4"
                              data-testid={`checkbox-audience-${audience.id}`}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{audience.name}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {audience.description || "No description"}
                              </p>
                            </div>
                            <Badge variant="secondary" className="shrink-0">
                              {audience.hcpIds.length} HCPs
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/simulations?audience=${audience.id}`);
                              }}
                              data-testid={`button-simulate-${audience.id}`}
                            >
                              <FlaskConical className="h-3.5 w-3.5 mr-1" />
                              Simulate
                            </Button>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Main NL Audience Builder */}
        <NLAudienceBuilder />
      </div>
    </div>
  );
}
