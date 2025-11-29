import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  MessageSquare, 
  Search,
  Users,
  Lightbulb,
  Clock,
  ArrowRight,
  Sparkles,
  Target,
  BarChart3,
  Filter,
  TrendingUp,
  Zap,
  History,
  ChevronRight,
  HelpCircle
} from "lucide-react";
import type { NLQueryResponse, HCPProfile } from "@shared/schema";

const exampleQueries = [
  "Find high-value oncologists in Texas who prefer email communication",
  "Show me Tier 1 cardiologists with low engagement that could benefit from rep visits",
  "Which neurologists have the highest prescribing volume but are at risk of churning?",
  "Identify growth potential HCPs in Boston who attend webinars",
  "List endocrinologists with strong digital engagement but limited rep coverage",
];

const recommendationIcons: Record<string, typeof Lightbulb> = {
  channel: MessageSquare,
  timing: Clock,
  content: BarChart3,
  frequency: TrendingUp,
  audience: Users,
};

export function NLAudienceBuilder() {
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [includeRecommendations, setIncludeRecommendations] = useState(true);
  const [currentResult, setCurrentResult] = useState<NLQueryResponse | null>(null);

  const { data: history = [], isLoading: loadingHistory, isError: historyError, refetch: refetchHistory } = useQuery<NLQueryResponse[]>({
    queryKey: ["/api/nl-query/history"],
  });

  const searchMutation = useMutation({
    mutationFn: async (request: { query: string; includeRecommendations: boolean; maxResults?: number }) => {
      const response = await apiRequest("POST", "/api/nl-query", request);
      return response.json() as Promise<NLQueryResponse>;
    },
    onSuccess: (result) => {
      setCurrentResult(result);
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

  const getRecommendationIcon = (type: string) => {
    const Icon = recommendationIcons[type] || Lightbulb;
    return <Icon className="h-4 w-4" />;
  };

  const formatConfidence = (confidence: number) => {
    const pct = (confidence * 100).toFixed(0);
    if (confidence >= 0.8) return { label: "High", className: "text-green-600 bg-green-50 dark:bg-green-900/20" };
    if (confidence >= 0.5) return { label: "Medium", className: "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20" };
    return { label: "Low", className: "text-red-600 bg-red-50 dark:bg-red-900/20" };
  };

  return (
    <div className="space-y-6" data-testid="nl-audience-builder">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
          <MessageSquare className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h2 className="text-2xl font-semibold">Natural Language Audience Builder</h2>
          <p className="text-muted-foreground">Build dynamic HCP cohorts using everyday language</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card data-testid="card-query-input">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Ask a Question
              </CardTitle>
              <CardDescription>
                Describe the HCP audience you want to find using natural language
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Example: Find high-value oncologists in Texas who prefer email communication"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="min-h-24 resize-none"
                data-testid="input-query"
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch
                    id="recommendations"
                    checked={includeRecommendations}
                    onCheckedChange={setIncludeRecommendations}
                    data-testid="switch-recommendations"
                  />
                  <Label htmlFor="recommendations" className="text-sm text-muted-foreground">
                    Include AI recommendations
                  </Label>
                </div>
                <Button
                  onClick={handleSearch}
                  disabled={searchMutation.isPending || !query.trim()}
                  className="gap-2"
                  data-testid="button-search"
                >
                  {searchMutation.isPending ? (
                    <>
                      <Search className="h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4" />
                      Find HCPs
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Try these examples
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {exampleQueries.map((example, i) => (
                <Button
                  key={i}
                  variant="ghost"
                  className="w-full justify-start text-left h-auto py-2 px-3 text-sm"
                  onClick={() => handleExampleClick(example)}
                  data-testid={`button-example-${i}`}
                >
                  <ChevronRight className="h-3 w-3 mr-2 text-muted-foreground" />
                  <span className="truncate">{example}</span>
                </Button>
              ))}
            </CardContent>
          </Card>

          {currentResult && (
            <Card data-testid="card-results">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      Query Results
                    </CardTitle>
                    <CardDescription>
                      Found <span data-testid="text-result-count">{currentResult.resultCount}</span> matching HCPs in <span data-testid="text-execution-time">{currentResult.executionTimeMs}ms</span>
                    </CardDescription>
                  </div>
                  {currentResult.parsedIntent && (
                    <Badge variant="outline" className="capitalize" data-testid="badge-parsed-intent">
                      {currentResult.parsedIntent}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {currentResult.filters && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <Filter className="h-4 w-4" />
                      Extracted Filters
                    </h4>
                    <div className="flex flex-wrap gap-2" data-testid="filters-container">
                      {currentResult.filters.tiers?.map((tier) => (
                        <Badge key={tier} variant="secondary" data-testid={`badge-filter-tier-${tier.toLowerCase().replace(/\s+/g, "-")}`}>{tier}</Badge>
                      ))}
                      {currentResult.filters.segments?.map((segment) => (
                        <Badge key={segment} variant="secondary" data-testid={`badge-filter-segment-${segment.toLowerCase().replace(/\s+/g, "-")}`}>{segment}</Badge>
                      ))}
                      {currentResult.filters.specialties?.map((specialty) => (
                        <Badge key={specialty} variant="secondary" data-testid={`badge-filter-specialty-${specialty.toLowerCase()}`}>{specialty}</Badge>
                      ))}
                      {currentResult.filters.channels?.map((channel) => (
                        <Badge key={channel} variant="secondary" className="capitalize" data-testid={`badge-filter-channel-${channel}`}>
                          {channel.replace("_", " ")}
                        </Badge>
                      ))}
                      {currentResult.filters.states?.map((state) => (
                        <Badge key={state} variant="secondary" data-testid={`badge-filter-state-${state}`}>{state}</Badge>
                      ))}
                      {currentResult.filters.engagementRange && (
                        <Badge variant="secondary" data-testid="badge-filter-engagement">
                          Engagement: {currentResult.filters.engagementRange.min || 0} - {currentResult.filters.engagementRange.max || 100}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {currentResult.results && currentResult.results.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Top Matching HCPs
                      </h4>
                      <ScrollArea className="h-64">
                        <div className="space-y-2">
                          {currentResult.results.slice(0, 15).map((hcp: HCPProfile) => (
                            <div
                              key={hcp.id}
                              className="flex items-center justify-between p-3 rounded-lg border bg-card hover-elevate"
                              data-testid={`result-hcp-${hcp.id}`}
                            >
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  Dr. {hcp.firstName} {hcp.lastName}
                                </span>
                                <span className="text-sm text-muted-foreground">
                                  {hcp.specialty} | {hcp.organization}
                                </span>
                              </div>
                              <div className="flex items-center gap-3">
                                <Badge variant="outline" data-testid={`hcp-tier-${hcp.id}`}>{hcp.tier}</Badge>
                                <div className="flex flex-col items-end">
                                  <span className="text-sm font-mono text-primary" data-testid={`hcp-engagement-${hcp.id}`}>
                                    {hcp.overallEngagementScore}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    Engagement
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  </>
                )}

                {currentResult.recommendations && currentResult.recommendations.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-yellow-500" />
                        AI Recommendations
                      </h4>
                      <div className="grid gap-3">
                        {currentResult.recommendations.map((rec, i) => {
                          const confidence = formatConfidence(rec.confidence);
                          return (
                            <Card key={i} className="border-dashed" data-testid={`recommendation-${i}`}>
                              <CardContent className="pt-4">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex items-start gap-3">
                                    <div className="p-2 rounded-md bg-muted">
                                      {getRecommendationIcon(rec.type)}
                                    </div>
                                    <div className="space-y-1">
                                      <p className="font-medium">{rec.recommendation}</p>
                                      <p className="text-sm text-muted-foreground">
                                        {rec.rationale}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex flex-col items-end gap-1">
                                    <Badge className={confidence.className} variant="outline">
                                      {confidence.label}
                                    </Badge>
                                    <Tooltip>
                                      <TooltipTrigger>
                                        <span className="text-xs text-muted-foreground flex items-center gap-1" data-testid={`recommendation-impact-${i}`}>
                                          <Zap className="h-3 w-3" />
                                          +{(rec.predictedImpact * 100).toFixed(0)}%
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        Predicted impact on engagement
                                      </TooltipContent>
                                    </Tooltip>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card data-testid="card-history">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="h-4 w-4" />
                Recent Queries
              </CardTitle>
              <CardDescription>
                Your query history
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingHistory ? (
                <div className="space-y-3" data-testid="history-loading">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="p-3 rounded-lg border bg-muted/50 animate-pulse">
                      <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                      <div className="h-3 bg-muted rounded w-1/4" />
                    </div>
                  ))}
                </div>
              ) : historyError ? (
                <div className="text-center py-8" data-testid="history-error">
                  <Search className="h-8 w-8 mx-auto mb-2 text-destructive opacity-50" />
                  <p className="text-sm text-destructive">Failed to load history</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2"
                    onClick={() => refetchHistory()}
                    data-testid="button-retry-history"
                  >
                    Try again
                  </Button>
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground" data-testid="history-empty">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No queries yet</p>
                  <p className="text-xs mt-1">Start by asking a question above</p>
                </div>
              ) : (
                <ScrollArea className="h-96">
                  <div className="space-y-3" data-testid="history-list">
                    {history.slice(0, 20).map((item) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-lg border bg-card hover-elevate cursor-pointer"
                        onClick={() => {
                          setQuery(item.query);
                          setCurrentResult(item);
                        }}
                        data-testid={`history-item-${item.id}`}
                      >
                        <p className="text-sm font-medium line-clamp-2" data-testid={`history-query-${item.id}`}>{item.query}</p>
                        <div className="flex items-center justify-between mt-2">
                          <Badge variant="secondary" className="text-xs" data-testid={`history-result-count-${item.id}`}>
                            {item.resultCount} results
                          </Badge>
                          <span className="text-xs text-muted-foreground" data-testid={`history-date-${item.id}`}>
                            {new Date(item.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <HelpCircle className="h-4 w-4" />
                Tips
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex gap-2">
                  <ArrowRight className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  Be specific about specialties, locations, and engagement preferences
                </li>
                <li className="flex gap-2">
                  <ArrowRight className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  Use terms like "high-value", "at-risk", or "growth potential"
                </li>
                <li className="flex gap-2">
                  <ArrowRight className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  Mention channel preferences (email, rep visits, webinars)
                </li>
                <li className="flex gap-2">
                  <ArrowRight className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  Include tiers (Tier 1, 2, 3) for targeting precision
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
