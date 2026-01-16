import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  MessageSquare,
  Search,
  Users,
  Lightbulb,
  ArrowRight,
  Sparkles,
  Target,
  Filter,
  History,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  PieChart,
  BarChart2,
  Download,
  Save,
  RefreshCw,
  Zap,
  X,
  RotateCcw,
  Copy,
  Plus,
  Activity
} from "lucide-react";
import { CohortHealthView } from "./cohort-health-view";
import { specialties, tiers, segments } from "@shared/schema";
import type { NLQueryResponse, HCPProfile, HCPFilter, Tier, Segment, Specialty } from "@shared/schema";

const exampleQueries = [
  "Find high-value oncologists in Texas who prefer email communication",
  "Show me Tier 1 cardiologists with low engagement that could benefit from rep visits",
  "Which neurologists have the highest prescribing volume but are at risk of churning?",
  "Identify growth potential HCPs in Boston who attend webinars",
  "List endocrinologists with strong digital engagement but limited rep coverage",
];

// Recommendation type icons
const recommendationIcons: Record<string, typeof Lightbulb> = {
  channel: MessageSquare,
  timing: History,
  content: BarChart2,
  frequency: Zap,
  audience: Users,
};

export function NLAudienceBuilder() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollPositionRef = useRef(0);

  // Query state
  const [query, setQuery] = useState("");
  const [includeRecommendations, setIncludeRecommendations] = useState(true);

  // Filter state
  const [selectedSpecialties, setSelectedSpecialties] = useState<Specialty[]>([]);
  const [selectedTiers, setSelectedTiers] = useState<Tier[]>([]);
  const [selectedSegments, setSelectedSegments] = useState<Segment[]>([]);
  const [engagementMin, setEngagementMin] = useState(0);
  const [engagementMax, setEngagementMax] = useState(100);

  // UI state
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [audienceName, setAudienceName] = useState("");
  const [audienceDescription, setAudienceDescription] = useState("");
  const [refineQuery, setRefineQuery] = useState("");
  const [showRefine, setShowRefine] = useState(false);
  const [aiInsightsOpen, setAiInsightsOpen] = useState(true);
  const [cohortHealthOpen, setCohortHealthOpen] = useState(false);
  const [lastQueryResult, setLastQueryResult] = useState<NLQueryResponse | null>(null);

  // Build filter object from state
  const filter: HCPFilter = useMemo(() => ({
    specialties: selectedSpecialties.length > 0 ? selectedSpecialties : undefined,
    tiers: selectedTiers.length > 0 ? selectedTiers : undefined,
    segments: selectedSegments.length > 0 ? selectedSegments : undefined,
    minEngagementScore: engagementMin > 0 ? engagementMin : undefined,
    maxEngagementScore: engagementMax < 100 ? engagementMax : undefined,
  }), [selectedSpecialties, selectedTiers, selectedSegments, engagementMin, engagementMax]);

  // Fetch all HCPs for client-side filtering (live preview)
  const { data: allHcps = [], isLoading: loadingHcps } = useQuery<HCPProfile[]>({
    queryKey: ["/api/hcps"],
  });

  // History query
  const { data: history = [], isLoading: loadingHistory, refetch: refetchHistory } = useQuery<NLQueryResponse[]>({
    queryKey: ["/api/nl-query/history"],
  });

  // NL Query mutation
  const searchMutation = useMutation({
    mutationFn: async (request: { query: string; includeRecommendations: boolean; maxResults?: number }) => {
      const response = await apiRequest("POST", "/api/nl-query", request);
      return response.json() as Promise<NLQueryResponse>;
    },
    onSuccess: (result) => {
      // Apply extracted filters to state
      if (result.filters) {
        if (result.filters.specialties) setSelectedSpecialties(result.filters.specialties);
        if (result.filters.tiers) setSelectedTiers(result.filters.tiers);
        if (result.filters.segments) setSelectedSegments(result.filters.segments);
        if (result.filters.engagementRange?.min) setEngagementMin(result.filters.engagementRange.min);
        if (result.filters.engagementRange?.max) setEngagementMax(result.filters.engagementRange.max);
      }
      // Save result for AI insights panel
      setLastQueryResult(result);
      if (result.recommendations && result.recommendations.length > 0) {
        setAiInsightsOpen(true);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/nl-query/history"] });
      toast({
        title: "Query Processed",
        description: `Found ${result.resultCount} matching HCPs`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to process your query. Please try rephrasing.",
        variant: "destructive",
      });
    },
  });

  // Save audience mutation
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
          source: "audience_builder",
        }),
      });
      if (!response.ok) throw new Error("Failed to save audience");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/audiences"] });
      toast({ title: "Audience Saved", description: `"${audienceName}" saved with ${filteredHcps.length} HCPs` });
      setSaveDialogOpen(false);
      setAudienceName("");
      setAudienceDescription("");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Filter HCPs client-side for live preview
  const filteredHcps = useMemo(() => {
    let result = allHcps;

    if (filter.specialties?.length) {
      result = result.filter((hcp) => filter.specialties!.includes(hcp.specialty));
    }
    if (filter.tiers?.length) {
      result = result.filter((hcp) => filter.tiers!.includes(hcp.tier));
    }
    if (filter.segments?.length) {
      result = result.filter((hcp) => filter.segments!.includes(hcp.segment));
    }
    if (filter.minEngagementScore !== undefined) {
      result = result.filter((hcp) => hcp.overallEngagementScore >= filter.minEngagementScore!);
    }
    if (filter.maxEngagementScore !== undefined) {
      result = result.filter((hcp) => hcp.overallEngagementScore <= filter.maxEngagementScore!);
    }

    return result;
  }, [allHcps, filter]);

  // Compute stats
  const stats = useMemo(() => {
    const tierCounts: Record<string, number> = {};
    const segmentCounts: Record<string, number> = {};
    let totalEngagement = 0;

    filteredHcps.forEach((hcp) => {
      tierCounts[hcp.tier] = (tierCounts[hcp.tier] || 0) + 1;
      segmentCounts[hcp.segment] = (segmentCounts[hcp.segment] || 0) + 1;
      totalEngagement += hcp.overallEngagementScore;
    });

    return {
      total: filteredHcps.length,
      avgEngagement: filteredHcps.length > 0 ? Math.round(totalEngagement / filteredHcps.length) : 0,
      tierBreakdown: tiers.map((tier) => ({
        tier,
        count: tierCounts[tier] || 0,
        pct: filteredHcps.length > 0 ? Math.round(((tierCounts[tier] || 0) / filteredHcps.length) * 100) : 0,
      })),
      segmentBreakdown: segments.map((segment) => ({
        segment,
        count: segmentCounts[segment] || 0,
        pct: filteredHcps.length > 0 ? Math.round(((segmentCounts[segment] || 0) / filteredHcps.length) * 100) : 0,
      })).filter((s) => s.count > 0).sort((a, b) => b.count - a.count),
    };
  }, [filteredHcps]);

  // Preserve scroll position on filter changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollPositionRef.current;
    }
  }, [filteredHcps]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    scrollPositionRef.current = e.currentTarget.scrollTop;
  }, []);

  const handleSearch = () => {
    if (!query.trim()) {
      toast({
        title: "Query Required",
        description: "Please enter a natural language query",
        variant: "destructive",
      });
      return;
    }

    searchMutation.mutate({
      query: query.trim(),
      includeRecommendations,
      maxResults: 50,
    });
  };

  const handleExampleClick = (example: string) => {
    setQuery(example);
  };

  const clearFilters = () => {
    setSelectedSpecialties([]);
    setSelectedTiers([]);
    setSelectedSegments([]);
    setEngagementMin(0);
    setEngagementMax(100);
  };

  // Refine: append modification to current query
  const handleRefine = () => {
    if (!refineQuery.trim()) return;
    const newQuery = query.trim()
      ? `${query.trim()}, and ${refineQuery.trim()}`
      : refineQuery.trim();
    setQuery(newQuery);
    setRefineQuery("");
    setShowRefine(false);
    // Auto-run the refined query
    searchMutation.mutate({
      query: newQuery,
      includeRecommendations,
      maxResults: 50,
    });
  };

  // Reset: clear everything to blank state
  const handleReset = () => {
    setQuery("");
    setRefineQuery("");
    setShowRefine(false);
    clearFilters();
    toast({ title: "Reset", description: "Audience builder cleared to blank state" });
  };

  // Clone: create a duplicate with " (copy)" suffix in name
  const handleClone = () => {
    const cloneName = `Cloned: ${query.trim().slice(0, 30) || "Unnamed"}...`;
    setAudienceName(cloneName);
    setSaveDialogOpen(true);
  };

  // Remove individual filter chips
  const removeSpecialty = (s: Specialty) => {
    setSelectedSpecialties(selectedSpecialties.filter((x) => x !== s));
  };

  const removeTier = (t: Tier) => {
    setSelectedTiers(selectedTiers.filter((x) => x !== t));
  };

  const removeSegment = (s: Segment) => {
    setSelectedSegments(selectedSegments.filter((x) => x !== s));
  };

  // Apply recommendation to query/filters
  const applyRecommendation = (recommendation: { type: string; recommendation: string }) => {
    // Append recommendation to query as a refinement
    const refinement = recommendation.recommendation;
    const newQuery = query.trim()
      ? `${query.trim()}, applying: ${refinement}`
      : refinement;
    setQuery(newQuery);
    toast({
      title: "Recommendation Applied",
      description: `Added "${refinement.slice(0, 50)}..." to your criteria`,
    });
  };

  // Format confidence for display
  const getConfidenceStyle = (confidence: number) => {
    if (confidence >= 0.8) return { label: "High", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" };
    if (confidence >= 0.5) return { label: "Medium", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" };
    return { label: "Low", className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" };
  };

  // Get icon for recommendation type
  const getRecommendationIcon = (type: string) => {
    const Icon = recommendationIcons[type] || Lightbulb;
    return <Icon className="h-4 w-4" />;
  };

  const exportToCsv = () => {
    const headers = ["NPI", "First Name", "Last Name", "Specialty", "Tier", "Segment", "Organization", "City", "State", "Engagement Score", "Channel Preference"];
    const rows = filteredHcps.map((h) => [
      h.npi, h.firstName, h.lastName, h.specialty, h.tier, h.segment,
      h.organization, h.city, h.state, h.overallEngagementScore, h.channelPreference
    ]);

    const csvContent = [headers.join(","), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `audience-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast({ title: "Export Complete", description: `Exported ${filteredHcps.length} HCPs to CSV` });
  };

  const handleSaveAudience = () => {
    if (!audienceName.trim()) return;
    saveAudienceMutation.mutate({
      name: audienceName.trim(),
      description: audienceDescription.trim(),
      hcpIds: filteredHcps.map((h) => h.id),
    });
  };

  const activeFilterCount = [
    selectedSpecialties.length,
    selectedTiers.length,
    selectedSegments.length,
    engagementMin > 0 ? 1 : 0,
    engagementMax < 100 ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-6" data-testid="nl-audience-builder">
      {/* Left Column - Query & Filters */}
      <div className="w-96 shrink-0 flex flex-col gap-4 overflow-auto">
        {/* NL Query Input */}
        <Card data-testid="card-query-input">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" />
              Natural Language Query
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              placeholder="Describe your target audience..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="min-h-20 resize-none text-sm"
              data-testid="input-query"
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  id="recommendations"
                  checked={includeRecommendations}
                  onCheckedChange={setIncludeRecommendations}
                  className="scale-90"
                  data-testid="switch-recommendations"
                />
                <Label htmlFor="recommendations" className="text-xs text-muted-foreground">
                  AI recommendations
                </Label>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowRefine(!showRefine)}
                  className="text-xs"
                  data-testid="button-show-refine"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Refine
                </Button>
                <Button
                  onClick={handleSearch}
                  disabled={searchMutation.isPending || !query.trim()}
                  size="sm"
                  data-testid="button-search"
                >
                  {searchMutation.isPending ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  ) : (
                    <Search className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  Parse
                </Button>
              </div>
            </div>

            {/* Refine input */}
            {showRefine && (
              <div className="flex gap-2 pt-2 border-t">
                <Input
                  placeholder="Add criteria, e.g., 'but exclude Texas'"
                  value={refineQuery}
                  onChange={(e) => setRefineQuery(e.target.value)}
                  className="text-xs h-8"
                  onKeyDown={(e) => e.key === "Enter" && handleRefine()}
                  data-testid="input-refine"
                />
                <Button
                  size="sm"
                  onClick={handleRefine}
                  disabled={!refineQuery.trim()}
                  className="h-8 text-xs"
                  data-testid="button-refine"
                >
                  Apply
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setShowRefine(false); setRefineQuery(""); }}
                  className="h-8 px-2"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Examples */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Try an example
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 pt-0">
            {exampleQueries.slice(0, 3).map((example, i) => (
              <Button
                key={i}
                variant="ghost"
                className="w-full justify-start text-left h-auto py-1.5 px-2 text-xs"
                onClick={() => handleExampleClick(example)}
                data-testid={`button-example-${i}`}
              >
                <ChevronRight className="h-3 w-3 mr-1.5 text-muted-foreground shrink-0" />
                <span className="truncate">{example}</span>
              </Button>
            ))}
          </CardContent>
        </Card>

        {/* Manual Filters */}
        <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 rounded-t-lg transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Filter className="h-4 w-4" />
                    Manual Filters
                    {activeFilterCount > 0 && (
                      <Badge variant="secondary" className="text-xs ml-1">
                        {activeFilterCount}
                      </Badge>
                    )}
                  </CardTitle>
                  {filtersOpen ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4 pt-0">
                {activeFilterCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="w-full text-xs h-7">
                    Clear all filters
                  </Button>
                )}

                {/* Specialties */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Specialty</Label>
                  <div className="grid grid-cols-2 gap-1 max-h-32 overflow-y-auto">
                    {specialties.map((specialty) => (
                      <div key={specialty} className="flex items-center space-x-1.5">
                        <Checkbox
                          id={`specialty-${specialty}`}
                          checked={selectedSpecialties.includes(specialty)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedSpecialties([...selectedSpecialties, specialty]);
                            } else {
                              setSelectedSpecialties(selectedSpecialties.filter((s) => s !== specialty));
                            }
                          }}
                          className="h-3.5 w-3.5"
                        />
                        <Label htmlFor={`specialty-${specialty}`} className="text-xs font-normal cursor-pointer truncate">
                          {specialty}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Tiers */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Tier</Label>
                  <div className="flex gap-2">
                    {tiers.map((tier) => (
                      <div key={tier} className="flex items-center space-x-1.5">
                        <Checkbox
                          id={`tier-${tier}`}
                          checked={selectedTiers.includes(tier)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedTiers([...selectedTiers, tier]);
                            } else {
                              setSelectedTiers(selectedTiers.filter((t) => t !== tier));
                            }
                          }}
                          className="h-3.5 w-3.5"
                        />
                        <Label htmlFor={`tier-${tier}`} className="text-xs font-normal cursor-pointer">
                          {tier}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Segments */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Segment</Label>
                  <div className="grid grid-cols-2 gap-1 max-h-28 overflow-y-auto">
                    {segments.map((segment) => (
                      <div key={segment} className="flex items-center space-x-1.5">
                        <Checkbox
                          id={`segment-${segment}`}
                          checked={selectedSegments.includes(segment)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedSegments([...selectedSegments, segment]);
                            } else {
                              setSelectedSegments(selectedSegments.filter((s) => s !== segment));
                            }
                          }}
                          className="h-3.5 w-3.5"
                        />
                        <Label htmlFor={`segment-${segment}`} className="text-xs font-normal cursor-pointer truncate">
                          {segment}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Engagement Range */}
                <div className="space-y-3">
                  <Label className="text-xs text-muted-foreground">
                    Engagement Score: {engagementMin} - {engagementMax}
                  </Label>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-8">Min:</span>
                      <Slider
                        value={[engagementMin]}
                        onValueChange={([v]) => setEngagementMin(Math.min(v, engagementMax))}
                        max={100}
                        step={5}
                        className="flex-1"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-8">Max:</span>
                      <Slider
                        value={[engagementMax]}
                        onValueChange={([v]) => setEngagementMax(Math.max(v, engagementMin))}
                        max={100}
                        step={5}
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* History */}
        <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 rounded-t-lg transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <History className="h-4 w-4" />
                    Query History
                  </CardTitle>
                  {historyOpen ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                {loadingHistory ? (
                  <div className="space-y-2">
                    {[1, 2].map((i) => (
                      <div key={i} className="p-2 rounded border bg-muted/50 animate-pulse">
                        <div className="h-3 bg-muted rounded w-3/4 mb-1" />
                        <div className="h-2 bg-muted rounded w-1/4" />
                      </div>
                    ))}
                  </div>
                ) : history.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    <MessageSquare className="h-6 w-6 mx-auto mb-1 opacity-50" />
                    <p className="text-xs">No queries yet</p>
                  </div>
                ) : (
                  <ScrollArea className="h-48">
                    <div className="space-y-2">
                      {history.slice(0, 10).map((item) => (
                        <div
                          key={item.id}
                          className="p-2 rounded border bg-card hover-elevate cursor-pointer"
                          onClick={() => {
                            setQuery(item.query);
                            if (item.filters) {
                              if (item.filters.specialties) setSelectedSpecialties(item.filters.specialties);
                              if (item.filters.tiers) setSelectedTiers(item.filters.tiers);
                              if (item.filters.segments) setSelectedSegments(item.filters.segments);
                            }
                          }}
                        >
                          <p className="text-xs font-medium line-clamp-2">{item.query}</p>
                          <div className="flex items-center justify-between mt-1">
                            <Badge variant="secondary" className="text-[10px] h-4">
                              {item.resultCount} results
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(item.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Tips */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-xs text-muted-foreground">
              <HelpCircle className="h-3 w-3" />
              Tips
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="space-y-1 text-[11px] text-muted-foreground">
              <li className="flex gap-1.5">
                <ArrowRight className="h-3 w-3 mt-0.5 text-primary shrink-0" />
                Use specific terms like "high-value", "at-risk"
              </li>
              <li className="flex gap-1.5">
                <ArrowRight className="h-3 w-3 mt-0.5 text-primary shrink-0" />
                Mention specialties, locations, tiers
              </li>
              <li className="flex gap-1.5">
                <ArrowRight className="h-3 w-3 mt-0.5 text-primary shrink-0" />
                Include channel preferences (email, rep)
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Right Column - Live Preview */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        {/* Stats Bar */}
        <div className="grid grid-cols-4 gap-3">
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <div>
                <p className="text-2xl font-bold" data-testid="stat-total">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total HCPs</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-chart-1" />
              <div>
                <p className="text-2xl font-bold" data-testid="stat-engagement">{stats.avgEngagement}</p>
                <p className="text-xs text-muted-foreground">Avg Engagement</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-chart-2" />
              <div>
                <div className="flex items-center gap-1">
                  {stats.tierBreakdown.map((t, i) => (
                    <Tooltip key={t.tier}>
                      <TooltipTrigger asChild>
                        <div
                          className={`h-5 rounded text-[10px] flex items-center justify-center font-medium ${
                            i === 0 ? "bg-chart-1 text-white" : i === 1 ? "bg-chart-2 text-white" : "bg-chart-3 text-white"
                          }`}
                          style={{ width: `${Math.max(t.pct * 0.6, 20)}px` }}
                        >
                          {t.count > 0 ? t.count : ""}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{t.tier}: {t.count} ({t.pct}%)</p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">Tier Split</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <PieChart className="h-4 w-4 text-chart-3" />
              <div>
                <p className="text-sm font-medium truncate" data-testid="stat-top-segment">
                  {stats.segmentBreakdown[0]?.segment || "—"}
                </p>
                <p className="text-xs text-muted-foreground">Top Segment</p>
              </div>
            </div>
          </Card>
        </div>

        {/* AI Insights Panel */}
        {lastQueryResult?.recommendations && lastQueryResult.recommendations.length > 0 && (
          <Collapsible open={aiInsightsOpen} onOpenChange={setAiInsightsOpen}>
            <Card className="border-primary/20 bg-primary/5">
              <CollapsibleTrigger asChild>
                <CardHeader className="py-2 cursor-pointer hover:bg-primary/10 transition-colors">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Lightbulb className="h-4 w-4 text-yellow-500" />
                      AI Insights
                      <Badge variant="secondary" className="text-[10px] ml-1">
                        {lastQueryResult.recommendations.length}
                      </Badge>
                    </CardTitle>
                    {aiInsightsOpen ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 space-y-2">
                  {lastQueryResult.recommendations.map((rec, i) => {
                    const confidenceStyle = getConfidenceStyle(rec.confidence);
                    return (
                      <div
                        key={i}
                        className="flex items-start gap-3 p-2 rounded-lg border bg-card"
                        data-testid={`ai-recommendation-${i}`}
                      >
                        <div className="p-1.5 rounded bg-muted shrink-0">
                          {getRecommendationIcon(rec.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium leading-tight">{rec.recommendation}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">
                            {rec.rationale}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <Badge className={`text-[9px] h-4 px-1.5 ${confidenceStyle.className}`}>
                              {confidenceStyle.label} ({Math.round(rec.confidence * 100)}%)
                            </Badge>
                            <Badge variant="outline" className="text-[9px] h-4 px-1.5">
                              +{Math.round(rec.predictedImpact * 100)}% impact
                            </Badge>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => applyRecommendation(rec)}
                          className="h-6 text-[10px] shrink-0"
                          data-testid={`button-apply-rec-${i}`}
                        >
                          Apply
                        </Button>
                      </div>
                    );
                  })}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        )}

        {/* Cohort Channel Health Panel */}
        {filteredHcps.length > 0 && (
          <Collapsible open={cohortHealthOpen} onOpenChange={setCohortHealthOpen}>
            <Card className="border-chart-1/20 bg-chart-1/5">
              <CollapsibleTrigger asChild>
                <CardHeader className="py-2 cursor-pointer hover:bg-chart-1/10 transition-colors">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Activity className="h-4 w-4 text-chart-1" />
                      Channel Health Analysis
                    </CardTitle>
                    {cohortHealthOpen ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <CohortHealthView
                    hcpIds={filteredHcps.map((h) => h.id)}
                    audienceName={query ? "Current Query Results" : undefined}
                  />
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        )}

        {/* Actions Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs">
              {stats.total} HCPs match your criteria
            </Badge>
            {activeFilterCount > 0 && (
              <div className="flex items-center gap-1 flex-wrap">
                {selectedSpecialties.map((s) => (
                  <Badge
                    key={s}
                    variant="secondary"
                    className="text-[10px] pr-1 cursor-pointer hover:bg-destructive/20 group"
                    onClick={() => removeSpecialty(s)}
                  >
                    {s}
                    <X className="h-2.5 w-2.5 ml-1 group-hover:text-destructive" />
                  </Badge>
                ))}
                {selectedTiers.map((t) => (
                  <Badge
                    key={t}
                    variant="secondary"
                    className="text-[10px] pr-1 cursor-pointer hover:bg-destructive/20 group"
                    onClick={() => removeTier(t)}
                  >
                    {t}
                    <X className="h-2.5 w-2.5 ml-1 group-hover:text-destructive" />
                  </Badge>
                ))}
                {selectedSegments.map((s) => (
                  <Badge
                    key={s}
                    variant="secondary"
                    className="text-[10px] pr-1 cursor-pointer hover:bg-destructive/20 group"
                    onClick={() => removeSegment(s)}
                  >
                    {s}
                    <X className="h-2.5 w-2.5 ml-1 group-hover:text-destructive" />
                  </Badge>
                ))}
                {(engagementMin > 0 || engagementMax < 100) && (
                  <Badge
                    variant="secondary"
                    className="text-[10px] pr-1 cursor-pointer hover:bg-destructive/20 group"
                    onClick={() => { setEngagementMin(0); setEngagementMax(100); }}
                  >
                    Eng: {engagementMin}-{engagementMax}
                    <X className="h-2.5 w-2.5 ml-1 group-hover:text-destructive" />
                  </Badge>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  className="h-8 px-2"
                  data-testid="button-reset"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Reset to blank</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClone}
                  disabled={stats.total === 0}
                  className="h-8 px-2"
                  data-testid="button-clone"
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Clone as new audience</TooltipContent>
            </Tooltip>
            <Button variant="outline" size="sm" onClick={exportToCsv} disabled={stats.total === 0}>
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Export
            </Button>
            <Button size="sm" onClick={() => setSaveDialogOpen(true)} disabled={stats.total === 0}>
              <Save className="h-3.5 w-3.5 mr-1.5" />
              Save Audience
            </Button>
          </div>
        </div>

        {/* HCP List Preview */}
        <Card className="flex-1 overflow-hidden">
          <CardHeader className="py-3 border-b">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Target className="h-4 w-4" />
              Live Preview
            </CardTitle>
          </CardHeader>
          <ScrollArea className="h-[calc(100%-3.5rem)]" ref={scrollRef} onScroll={handleScroll}>
            {loadingHcps ? (
              <div className="p-4 space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="p-3 rounded-lg border bg-muted/50 animate-pulse">
                    <div className="h-4 bg-muted rounded w-1/3 mb-2" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : filteredHcps.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Users className="h-10 w-10 text-muted-foreground mb-4 opacity-50" />
                <h3 className="text-sm font-medium">No HCPs match your criteria</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                  Try adjusting your filters or using a natural language query
                </p>
              </div>
            ) : (
              <div className="p-4 space-y-2">
                {filteredHcps.slice(0, 50).map((hcp) => (
                  <div
                    key={hcp.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover-elevate"
                    data-testid={`preview-hcp-${hcp.id}`}
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="font-medium text-sm truncate">
                        Dr. {hcp.firstName} {hcp.lastName}
                      </span>
                      <span className="text-xs text-muted-foreground truncate">
                        {hcp.specialty} • {hcp.organization} • {hcp.city}, {hcp.state}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <Badge variant="outline" className="text-xs">{hcp.tier}</Badge>
                      <Badge variant="secondary" className="text-xs">{hcp.segment}</Badge>
                      <div className="flex flex-col items-end">
                        <span className="text-sm font-mono font-semibold text-primary">
                          {hcp.overallEngagementScore}
                        </span>
                        <span className="text-[10px] text-muted-foreground">Engagement</span>
                      </div>
                    </div>
                  </div>
                ))}
                {filteredHcps.length > 50 && (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    Showing first 50 of {filteredHcps.length} results
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </Card>
      </div>

      {/* Save Audience Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Save Audience</DialogTitle>
            <DialogDescription>
              Save {stats.total} HCPs as a reusable audience for simulations and campaigns.
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
            >
              {saveAudienceMutation.isPending ? "Saving..." : "Save Audience"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
