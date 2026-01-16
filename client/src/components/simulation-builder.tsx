import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Play, RotateCcw, Target, Zap, BarChart2, UserSearch, Sparkles, Users, ChevronDown, ChevronUp, X, TrendingUp, Save, RefreshCw, HelpCircle, Info, Mail, Phone, Video, Globe, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { Channel, SimulationResult, InsertSimulationScenario, HCPProfile } from "@shared/schema";

const channelLabels: Record<Channel, string> = {
  email: "Email",
  rep_visit: "Rep Visit",
  webinar: "Webinar",
  conference: "Conference",
  digital_ad: "Digital Ads",
  phone: "Phone",
};

const channelIcons: Record<Channel, typeof Mail> = {
  email: Mail,
  rep_visit: Users,
  webinar: Video,
  conference: Calendar,
  digital_ad: Globe,
  phone: Phone,
};

const channelTooltips: Record<Channel, string> = {
  email: "Direct email campaigns with personalized content",
  rep_visit: "In-person visits from pharmaceutical representatives",
  webinar: "Online educational sessions and product presentations",
  conference: "Industry conferences, symposiums, and medical meetings",
  digital_ad: "Targeted online advertising across platforms",
  phone: "Telephone outreach and follow-up calls",
};

const contentTypeTooltips: Record<string, string> = {
  educational: "Focus on disease education and treatment protocols",
  promotional: "Product-focused messaging with promotional offers",
  clinical_data: "Evidence-based content with clinical trial results",
  mixed: "Balanced approach combining all content types",
};

// Helper component for parameter labels with tooltips
function LabelWithTooltip({ label, tooltip }: { label: string; tooltip: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <Label>{label}</Label>
      <Tooltip>
        <TooltipTrigger asChild>
          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[250px]">
          <p className="text-xs">{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

interface SimulationBuilderProps {
  onRunSimulation: (scenario: InsertSimulationScenario) => void;
  onSaveResult?: (result: SimulationResult, name: string) => void;
  isRunning?: boolean;
  result?: SimulationResult | null;
  selectedHcpCount?: number;
  seedHcp?: HCPProfile | null;
}

export function SimulationBuilder({
  onRunSimulation,
  onSaveResult,
  isRunning = false,
  result,
  selectedHcpCount = 0,
  seedHcp = null,
}: SimulationBuilderProps) {
  const [scenarioName, setScenarioName] = useState("New Campaign Scenario");
  const [description, setDescription] = useState("");
  const [frequency, setFrequency] = useState(4);
  const [duration, setDuration] = useState(3);
  const [contentType, setContentType] = useState<"educational" | "promotional" | "clinical_data" | "mixed">("mixed");
  const [channelMix, setChannelMix] = useState<Record<Channel, number>>({
    email: 30,
    rep_visit: 25,
    webinar: 15,
    conference: 10,
    digital_ad: 15,
    phone: 5,
  });
  const [expandedAudience, setExpandedAudience] = useState(false);
  const [includeLookalikes, setIncludeLookalikes] = useState(false);

  const { data: allHcps = [] } = useQuery<HCPProfile[]>({
    queryKey: ["/api/hcps"],
  });

  const { data: similarHcps = [], isLoading: loadingSimilar } = useQuery<HCPProfile[]>({
    queryKey: [`/api/hcps/${seedHcp?.id}/similar`],
    enabled: !!seedHcp?.id,
  });

  const topPerformers = useMemo(() => {
    return allHcps
      .filter(h => h.overallEngagementScore >= 70)
      .sort((a, b) => b.overallEngagementScore - a.overallEngagementScore)
      .slice(0, 5);
  }, [allHcps]);

  const totalAllocation = Object.values(channelMix).reduce((a, b) => a + b, 0);
  const isValidAllocation = totalAllocation === 100;

  const handleChannelChange = (channel: Channel, value: number) => {
    setChannelMix((prev) => ({ ...prev, [channel]: value }));
  };

  const normalizeChannels = () => {
    const total = Object.values(channelMix).reduce((a, b) => a + b, 0);
    if (total === 0) return;
    
    const normalized = {} as Record<Channel, number>;
    let remaining = 100;
    const entries = Object.entries(channelMix) as [Channel, number][];
    
    entries.slice(0, -1).forEach(([channel, value]) => {
      const normalized_value = Math.round((value / total) * 100);
      normalized[channel] = normalized_value;
      remaining -= normalized_value;
    });
    
    normalized[entries[entries.length - 1][0]] = remaining;
    setChannelMix(normalized);
  };

  const handleRun = () => {
    const targetIds: string[] = [];
    
    if (seedHcp) {
      targetIds.push(seedHcp.id);
    }
    
    if (includeLookalikes && similarHcps.length > 0) {
      similarHcps.forEach(hcp => targetIds.push(hcp.id));
    }
    
    onRunSimulation({
      name: scenarioName,
      description: description || undefined,
      targetHcpIds: targetIds,
      channelMix,
      frequency,
      duration,
      contentType,
    });
  };

  const resetForm = () => {
    setScenarioName("New Campaign Scenario");
    setDescription("");
    setFrequency(4);
    setDuration(3);
    setContentType("mixed");
    setChannelMix({
      email: 30,
      rep_visit: 25,
      webinar: 15,
      conference: 10,
      digital_ad: 15,
      phone: 5,
    });
    setIncludeLookalikes(false);
  };

  const audienceCount = useMemo(() => {
    let count = selectedHcpCount > 0 ? selectedHcpCount : allHcps.length;
    if (includeLookalikes && seedHcp && similarHcps.length > 0) {
      count += similarHcps.length;
    }
    return count;
  }, [selectedHcpCount, allHcps.length, includeLookalikes, seedHcp, similarHcps.length]);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Scenario Configuration
            </CardTitle>
            <CardDescription>
              Define your campaign parameters and channel mix
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="scenario-name">Scenario Name</Label>
                <Input
                  id="scenario-name"
                  value={scenarioName}
                  onChange={(e) => setScenarioName(e.target.value)}
                  placeholder="Enter scenario name"
                  data-testid="input-scenario-name"
                />
              </div>
              <div className="space-y-2">
                <LabelWithTooltip
                  label="Content Strategy"
                  tooltip="The type of messaging and content used in your campaign communications"
                />
                <Select value={contentType} onValueChange={(v) => setContentType(v as typeof contentType)}>
                  <SelectTrigger id="content-type" data-testid="select-content-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="educational">
                      <div className="flex flex-col items-start">
                        <span>Educational</span>
                        <span className="text-xs text-muted-foreground">{contentTypeTooltips.educational}</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="promotional">
                      <div className="flex flex-col items-start">
                        <span>Promotional</span>
                        <span className="text-xs text-muted-foreground">{contentTypeTooltips.promotional}</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="clinical_data">
                      <div className="flex flex-col items-start">
                        <span>Clinical Data</span>
                        <span className="text-xs text-muted-foreground">{contentTypeTooltips.clinical_data}</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="mixed">
                      <div className="flex flex-col items-start">
                        <span>Mixed</span>
                        <span className="text-xs text-muted-foreground">{contentTypeTooltips.mixed}</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the campaign objectives..."
                className="resize-none"
                rows={2}
                data-testid="input-description"
              />
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <LabelWithTooltip
                    label="Contact Frequency"
                    tooltip="How often each HCP receives communications. Higher frequency increases engagement but may cause fatigue."
                  />
                  <span className="font-mono text-sm font-medium">{frequency}/month</span>
                </div>
                <Slider
                  value={[frequency]}
                  onValueChange={([v]) => setFrequency(v)}
                  min={1}
                  max={20}
                  step={1}
                  data-testid="slider-frequency"
                />
                <p className="text-xs text-muted-foreground">
                  {frequency <= 4 ? "Low frequency - optimal for busy specialists" :
                   frequency <= 8 ? "Moderate frequency - balanced approach" :
                   "High frequency - aggressive outreach"}
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <LabelWithTooltip
                    label="Campaign Duration"
                    tooltip="Length of the campaign. Longer campaigns build awareness but require sustained engagement."
                  />
                  <span className="font-mono text-sm font-medium">{duration} months</span>
                </div>
                <Slider
                  value={[duration]}
                  onValueChange={([v]) => setDuration(v)}
                  min={1}
                  max={12}
                  step={1}
                  data-testid="slider-duration"
                />
                <p className="text-xs text-muted-foreground">
                  {duration <= 3 ? "Short burst campaign" :
                   duration <= 6 ? "Standard campaign cycle" :
                   "Extended awareness campaign"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  Channel Mix
                </CardTitle>
                <CardDescription>
                  Allocate budget across engagement channels
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={isValidAllocation ? "default" : "destructive"}
                  className="font-mono"
                  data-testid="badge-allocation-total"
                >
                  {totalAllocation}%
                </Badge>
                {!isValidAllocation && (
                  <Button variant="outline" size="sm" onClick={normalizeChannels} data-testid="button-normalize">
                    Normalize
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              {(Object.entries(channelMix) as [Channel, number][]).map(([channel, value]) => {
                const Icon = channelIcons[channel];
                return (
                  <div key={channel} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-2 cursor-help">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                            <Label className="text-sm cursor-help">{channelLabels[channel]}</Label>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[200px]">
                          <p className="text-xs">{channelTooltips[channel]}</p>
                        </TooltipContent>
                      </Tooltip>
                      <span className="font-mono text-sm">{value}%</span>
                    </div>
                    <Slider
                      value={[value]}
                      onValueChange={([v]) => handleChannelChange(channel, v)}
                      min={0}
                      max={100}
                      step={5}
                      data-testid={`slider-channel-${channel}`}
                    />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button
            size="lg"
            className="flex-1"
            onClick={handleRun}
            disabled={isRunning || !isValidAllocation || !scenarioName}
            data-testid="button-run-simulation"
          >
            {isRunning ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Running Simulation...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Run Simulation
              </>
            )}
          </Button>
          <Button variant="outline" size="lg" onClick={resetForm} data-testid="button-reset-scenario">
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart2 className="h-5 w-5 text-primary" />
              Predicted Outcomes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {result ? (
              <div className="space-y-4">
                {/* Headline metric - leads with the key insight */}
                <div className="rounded-lg bg-gradient-to-br from-chart-1/10 to-chart-2/10 border border-chart-1/20 p-4 text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <TrendingUp className="h-5 w-5 text-chart-1" />
                    <span className="text-sm font-medium text-muted-foreground">Projected Impact</span>
                  </div>
                  <div className="text-3xl font-bold text-chart-1" data-testid="text-headline-lift">
                    +{result.predictedRxLift.toFixed(1)}% Rx Lift
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    vs. no campaign baseline
                  </p>
                </div>

                {/* Key metrics grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-md bg-muted p-3 text-center">
                    <span className="block text-lg font-bold" data-testid="text-pred-engagement">
                      {result.predictedEngagementRate.toFixed(1)}%
                    </span>
                    <span className="text-xs text-muted-foreground">Engagement</span>
                  </div>
                  <div className="rounded-md bg-muted p-3 text-center">
                    <span className="block text-lg font-bold" data-testid="text-pred-response">
                      {result.predictedResponseRate.toFixed(1)}%
                    </span>
                    <span className="text-xs text-muted-foreground">Response</span>
                  </div>
                  <div className="rounded-md bg-muted p-3 text-center">
                    <span className="block text-lg font-bold" data-testid="text-pred-reach">
                      {result.predictedReach.toLocaleString()}
                    </span>
                    <span className="text-xs text-muted-foreground">HCPs Reached</span>
                  </div>
                  <div className="rounded-md bg-muted p-3 text-center">
                    <span className="block text-lg font-bold" data-testid="text-efficiency">
                      {result.efficiencyScore}
                    </span>
                    <span className="text-xs text-muted-foreground">Efficiency</span>
                  </div>
                </div>

                {/* vs. Baseline comparison */}
                <div className="border-t pt-4">
                  <h4 className="mb-3 text-sm font-medium flex items-center gap-2">
                    <Info className="h-3.5 w-3.5 text-muted-foreground" />
                    Compared to Baseline
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Engagement</span>
                      <Badge variant={result.vsBaseline.engagementDelta >= 0 ? "default" : "destructive"}>
                        {result.vsBaseline.engagementDelta >= 0 ? "+" : ""}
                        {result.vsBaseline.engagementDelta.toFixed(1)}%
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Response</span>
                      <Badge variant={result.vsBaseline.responseDelta >= 0 ? "default" : "destructive"}>
                        {result.vsBaseline.responseDelta >= 0 ? "+" : ""}
                        {result.vsBaseline.responseDelta.toFixed(1)}%
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Rx Lift</span>
                      <Badge variant={result.vsBaseline.rxLiftDelta >= 0 ? "default" : "destructive"}>
                        {result.vsBaseline.rxLiftDelta >= 0 ? "+" : ""}
                        {result.vsBaseline.rxLiftDelta.toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Action CTAs */}
                <div className="border-t pt-4 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={resetForm}
                    data-testid="button-run-another"
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                    Run Another
                  </Button>
                  {onSaveResult && (
                    <Button
                      variant="default"
                      size="sm"
                      className="flex-1"
                      onClick={() => onSaveResult(result, scenarioName)}
                      data-testid="button-save-results"
                    >
                      <Save className="h-3.5 w-3.5 mr-1.5" />
                      Save Results
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="mb-4 rounded-full bg-muted p-4">
                  <BarChart2 className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Configure your scenario and run a simulation to see predicted outcomes
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Hover over parameter labels for help
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Target Audience</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between rounded-md bg-muted p-3">
              <span className="text-sm text-muted-foreground">Total HCPs</span>
              <span className="font-mono font-semibold" data-testid="text-selected-count">
                {audienceCount.toLocaleString()}
              </span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {selectedHcpCount > 0
                ? `${selectedHcpCount} selected + ${includeLookalikes ? similarHcps.length + ' lookalikes' : 'no lookalikes'}`
                : "Simulation will run on all HCPs in the database"}
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-audience-expansion-builder">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Sparkles className="h-4 w-4 text-chart-1" />
              Audience Expansion
            </CardTitle>
            <CardDescription className="text-xs">
              Expand your reach with lookalike HCPs
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {seedHcp ? (
              <>
                <div className="rounded-md border p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">
                        Dr. {seedHcp.firstName} {seedHcp.lastName}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {seedHcp.specialty} • {seedHcp.tier}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">Seed</Badge>
                  </div>
                </div>

                {loadingSimilar ? (
                  <div className="space-y-2">
                    <Skeleton className="h-12" />
                    <Skeleton className="h-12" />
                  </div>
                ) : similarHcps.length > 0 ? (
                  <Collapsible open={expandedAudience} onOpenChange={setExpandedAudience}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <UserSearch className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{similarHcps.length} similar HCPs found</span>
                      </div>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7" data-testid="button-expand-lookalikes">
                          {expandedAudience ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                    </div>

                    <CollapsibleContent>
                      <div className="mt-2 max-h-40 space-y-2 overflow-y-auto">
                        {similarHcps.slice(0, 5).map((hcp) => (
                          <div
                            key={hcp.id}
                            className="flex items-center justify-between rounded border p-2 text-xs"
                            data-testid={`lookalike-hcp-${hcp.id}`}
                          >
                            <span className="truncate">
                              Dr. {hcp.firstName} {hcp.lastName}
                            </span>
                            <span className="font-mono text-muted-foreground">
                              {hcp.overallEngagementScore}
                            </span>
                          </div>
                        ))}
                        {similarHcps.length > 5 && (
                          <div className="text-center text-xs text-muted-foreground">
                            +{similarHcps.length - 5} more
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>

                    <div className="mt-3 flex items-center justify-between rounded-md bg-muted/50 p-2">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs">Include lookalikes</span>
                      </div>
                      <Button
                        size="sm"
                        variant={includeLookalikes ? "default" : "outline"}
                        className="h-7 text-xs"
                        onClick={() => setIncludeLookalikes(!includeLookalikes)}
                        data-testid="button-toggle-lookalikes"
                      >
                        {includeLookalikes ? "Included" : "Add to Simulation"}
                      </Button>
                    </div>
                  </Collapsible>
                ) : (
                  <div className="text-center text-xs text-muted-foreground py-2">
                    No similar HCPs found for this profile
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="text-center text-xs text-muted-foreground py-2">
                  Select an HCP from Explorer to find lookalikes
                </div>
                
                {topPerformers.length > 0 && (
                  <div className="border-t pt-3">
                    <div className="mb-2 text-xs font-medium text-muted-foreground">
                      Suggested seed HCPs (top performers)
                    </div>
                    <div className="space-y-2">
                      {topPerformers.slice(0, 3).map((hcp) => (
                        <div
                          key={hcp.id}
                          className="flex items-center justify-between rounded border p-2 text-xs"
                          data-testid={`suggested-seed-${hcp.id}`}
                        >
                          <div className="truncate">
                            <span className="font-medium">Dr. {hcp.firstName} {hcp.lastName}</span>
                            <span className="text-muted-foreground ml-1">• {hcp.specialty}</span>
                          </div>
                          <Badge variant="secondary" className="text-xs shrink-0">
                            {hcp.overallEngagementScore}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
