import { Mail, Phone, Video, Globe, Calendar, Users, ArrowRight, UserSearch, Sparkles, Zap, Activity } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { StimuliPrediction } from "./stimuli-prediction";
import { ChannelHealthRadial } from "./channel-health-radial";
import type { HCPProfile, Channel } from "@shared/schema";
import type { ChannelHealth } from "../../../server/services/channel-health";

const channelIcons: Record<Channel, typeof Mail> = {
  email: Mail,
  rep_visit: Users,
  webinar: Video,
  conference: Calendar,
  digital_ad: Globe,
  phone: Phone,
};

const channelLabels: Record<Channel, string> = {
  email: "Email",
  rep_visit: "Rep Visit",
  webinar: "Webinar",
  conference: "Conference",
  digital_ad: "Digital",
  phone: "Phone",
};

const tierColors: Record<string, string> = {
  "Tier 1": "bg-chart-1 text-primary-foreground",
  "Tier 2": "bg-chart-2 text-primary-foreground",
  "Tier 3": "bg-chart-3 text-primary-foreground",
};

interface HCPDetailPanelProps {
  hcp: HCPProfile | null;
  open: boolean;
  onClose: () => void;
  onSimulate?: (hcp: HCPProfile) => void;
  onSelectHcp?: (hcp: HCPProfile) => void;
}

// Response type for channel health API
interface ChannelHealthResponse {
  hcpId: string;
  hcpName: string;
  channelHealth: ChannelHealth[];
  summary: {
    healthyChannels: number;
    issueChannels: number;
    opportunityChannels: number;
    primaryRecommendation: string;
  };
}

export function HCPDetailPanel({ hcp, open, onClose, onSimulate, onSelectHcp }: HCPDetailPanelProps) {
  const [, setLocation] = useLocation();
  const { data: similarHcps = [], isLoading: isLoadingSimilar } = useQuery<HCPProfile[]>({
    queryKey: [`/api/hcps/${hcp?.id}/similar`],
    enabled: !!hcp?.id && open,
  });

  // Fetch channel health data
  const { data: channelHealthData, isLoading: isLoadingHealth } = useQuery<ChannelHealthResponse>({
    queryKey: [`/api/hcps/${hcp?.id}/channel-health`],
    enabled: !!hcp?.id && open,
  });

  const navigateToSimulation = () => {
    if (hcp) {
      setLocation(`/simulations?seedHcp=${hcp.id}`);
      onClose();
    }
  };

  if (!hcp) return null;

  const channelData = hcp.channelEngagements.map((ce) => ({
    name: channelLabels[ce.channel],
    score: ce.score,
    response: ce.responseRate,
    touches: ce.totalTouches,
  }));

  return (
    <Sheet open={open} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto" data-testid="panel-hcp-detail">
        <SheetHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div>
              <SheetTitle className="text-xl" data-testid="text-detail-name">
                Dr. {hcp.firstName} {hcp.lastName}
              </SheetTitle>
              <p className="mt-1 text-sm text-muted-foreground">{hcp.specialty}</p>
            </div>
            <Badge className={tierColors[hcp.tier]}>{hcp.tier}</Badge>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="outline">{hcp.segment}</Badge>
            <Badge variant="outline">NPI: {hcp.npi}</Badge>
          </div>
        </SheetHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="text-center">
                  <span className="block font-mono text-3xl font-bold text-chart-1" data-testid="text-detail-engagement">
                    {hcp.overallEngagementScore}
                  </span>
                  <span className="text-sm text-muted-foreground">Engagement Score</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-center">
                  <span className="block font-mono text-3xl font-bold" data-testid="text-detail-rx">
                    {hcp.monthlyRxVolume}
                  </span>
                  <span className="text-sm text-muted-foreground">Monthly Rx</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
              <TabsTrigger value="health" data-testid="tab-health">
                <Activity className="mr-1 h-3 w-3" />
                Health
              </TabsTrigger>
              <TabsTrigger value="channels" data-testid="tab-channels">Channels</TabsTrigger>
              <TabsTrigger value="trends" data-testid="tab-trends">Trends</TabsTrigger>
              <TabsTrigger value="stimuli" data-testid="tab-stimuli">
                <Zap className="mr-1 h-3 w-3" />
                Predict
              </TabsTrigger>
              <TabsTrigger value="similar" data-testid="tab-similar">
                <UserSearch className="mr-1 h-3 w-3" />
                Similar
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4 space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Organization</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{hcp.organization}</p>
                  <p className="text-sm text-muted-foreground">
                    {hcp.city}, {hcp.state}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Prescribing Activity</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Yearly Rx Volume</span>
                    <span className="font-mono font-medium" data-testid="text-detail-yearly-rx">{hcp.yearlyRxVolume}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Market Share</span>
                    <span className="font-mono font-medium" data-testid="text-detail-market-share">{hcp.marketSharePct}%</span>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Conversion Likelihood</span>
                      <span className="font-medium" data-testid="text-detail-conversion">{hcp.conversionLikelihood}%</span>
                    </div>
                    <Progress value={hcp.conversionLikelihood} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Churn Risk</span>
                      <span className="font-medium" data-testid="text-detail-churn">{hcp.churnRisk}%</span>
                    </div>
                    <Progress value={hcp.churnRisk} className="h-2 [&>div]:bg-destructive" />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="health" className="mt-4 space-y-4" data-testid="tab-content-health">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <Activity className="h-4 w-4 text-chart-1" />
                    Channel Health Diagnostic
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Visual assessment of engagement health across all channels
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingHealth ? (
                    <div className="flex justify-center py-8">
                      <Skeleton className="h-64 w-64 rounded-full" />
                    </div>
                  ) : channelHealthData ? (
                    <div className="flex justify-center py-4">
                      <ChannelHealthRadial
                        channelHealth={channelHealthData.channelHealth}
                        hcpName={`Dr. ${hcp.lastName}`}
                        size="md"
                      />
                    </div>
                  ) : (
                    <div className="py-8 text-center text-sm text-muted-foreground">
                      Unable to load channel health data
                    </div>
                  )}
                </CardContent>
              </Card>

              {channelHealthData && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Health Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="rounded-md bg-green-500/10 p-3 text-center">
                        <span className="block text-2xl font-bold text-green-500">
                          {channelHealthData.summary.healthyChannels}
                        </span>
                        <span className="text-xs text-muted-foreground">Active</span>
                      </div>
                      <div className="rounded-md bg-yellow-500/10 p-3 text-center">
                        <span className="block text-2xl font-bold text-yellow-500">
                          {channelHealthData.summary.issueChannels}
                        </span>
                        <span className="text-xs text-muted-foreground">Issues</span>
                      </div>
                      <div className="rounded-md bg-purple-500/10 p-3 text-center">
                        <span className="block text-2xl font-bold text-purple-500">
                          {channelHealthData.summary.opportunityChannels}
                        </span>
                        <span className="text-xs text-muted-foreground">Opportunity</span>
                      </div>
                    </div>
                    <div className="rounded-md bg-muted p-3">
                      <p className="text-sm font-medium">Recommendation</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {channelHealthData.summary.primaryRecommendation}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="channels" className="mt-4 space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between text-sm font-medium">
                    <span>Preferred Channel</span>
                    <Badge variant="secondary">{channelLabels[hcp.channelPreference]}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={channelData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                        <XAxis type="number" domain={[0, 100]} fontSize={11} />
                        <YAxis type="category" dataKey="name" width={60} fontSize={11} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--popover))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "6px",
                            fontSize: "12px",
                          }}
                        />
                        <Bar dataKey="score" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Channel Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {hcp.channelEngagements.map((ce) => {
                      const Icon = channelIcons[ce.channel];
                      return (
                        <div key={ce.channel} className="flex items-center gap-3" data-testid={`channel-detail-${ce.channel}`}>
                          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">{channelLabels[ce.channel]}</span>
                              <span className="font-mono text-sm" data-testid={`text-channel-score-${ce.channel}`}>{ce.score}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>{ce.totalTouches} touches</span>
                              <span>{ce.responseRate}% response</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="trends" className="mt-4 space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Prescribing Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={hcp.prescribingTrend}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" fontSize={11} />
                        <YAxis fontSize={11} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--popover))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "6px",
                            fontSize: "12px",
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="rxCount"
                          stroke="hsl(var(--chart-1))"
                          strokeWidth={2}
                          dot={{ fill: "hsl(var(--chart-1))" }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Market Share Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={hcp.prescribingTrend}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" fontSize={11} />
                        <YAxis fontSize={11} domain={[0, 100]} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--popover))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "6px",
                            fontSize: "12px",
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="marketShare"
                          stroke="hsl(var(--chart-2))"
                          strokeWidth={2}
                          dot={{ fill: "hsl(var(--chart-2))" }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="stimuli" className="mt-4" data-testid="tab-content-stimuli">
              <StimuliPrediction hcp={hcp} />
            </TabsContent>

            <TabsContent value="similar" className="mt-4 space-y-4" data-testid="tab-content-similar">
              <Card data-testid="card-lookalike-hcps">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <Sparkles className="h-4 w-4 text-chart-1" />
                    Lookalike HCPs
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    HCPs with similar profiles based on specialty, tier, segment, and engagement patterns
                  </p>
                </CardHeader>
                <CardContent>
                  {isLoadingSimilar ? (
                    <div className="space-y-3">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-16" />
                      ))}
                    </div>
                  ) : similarHcps.length === 0 ? (
                    <div className="py-6 text-center text-sm text-muted-foreground">
                      No similar HCPs found
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {similarHcps.map((similarHcp) => (
                        <div
                          key={similarHcp.id}
                          className="flex items-center justify-between rounded-lg border p-3 hover-elevate cursor-pointer"
                          onClick={() => onSelectHcp?.(similarHcp)}
                          data-testid={`similar-hcp-${similarHcp.id}`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm truncate">
                                Dr. {similarHcp.firstName} {similarHcp.lastName}
                              </span>
                              <Badge variant="outline" className="text-xs shrink-0">
                                {similarHcp.tier}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                              <span>{similarHcp.specialty}</span>
                              <span>•</span>
                              <span>{similarHcp.segment}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 shrink-0 ml-3">
                            <div className="text-right">
                              <div className="font-mono text-sm font-semibold text-chart-1">
                                {similarHcp.overallEngagementScore}
                              </div>
                              <div className="text-xs text-muted-foreground">Score</div>
                            </div>
                            <div className="text-right">
                              <div className="font-mono text-sm font-semibold">
                                {similarHcp.monthlyRxVolume}
                              </div>
                              <div className="text-xs text-muted-foreground">Rx/mo</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card data-testid="card-audience-expansion">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Audience Expansion</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Use similar HCPs to expand your target audience for simulations
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between rounded-lg bg-muted/50 p-4">
                    <div>
                      <div className="font-medium text-sm" data-testid="text-similar-count">
                        {similarHcps.length} similar HCPs identified
                      </div>
                      <div className="text-xs text-muted-foreground mt-1" data-testid="text-combined-rx">
                        Combined potential reach of {similarHcps.reduce((sum, h) => sum + h.monthlyRxVolume, 0)} Rx/mo
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={navigateToSimulation}
                      data-testid="button-simulate-with-lookalikes"
                    >
                      <Users className="mr-2 h-3 w-3" />
                      Include in Simulation
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex gap-3 pt-4">
            <Button
              className="flex-1"
              onClick={() => onSimulate?.(hcp)}
              data-testid="button-simulate-hcp"
            >
              <ArrowRight className="mr-2 h-4 w-4" />
              Run Simulation
            </Button>
            <Button variant="outline" onClick={onClose} data-testid="button-close-detail">
              Close
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
