import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Target,
  TrendingUp,
  Shield,
  Users,
  AlertTriangle,
  RefreshCw,
  Filter,
  Download,
  Zap,
  BarChart3,
  PieChart,
} from "lucide-react";
import { NBORecommendationCard } from "@/components/nbo/NBORecommendationCard";
import type { NBORecommendation } from "@shared/schema";

interface NBOBatchResponse {
  recommendations: NBORecommendation[];
  summary: {
    total: number;
    generated: number;
    actionDistribution: Record<string, number>;
    confidenceDistribution: { high: number; medium: number; low: number };
    urgencyDistribution: { high: number; medium: number; low: number };
    avgConfidence: number;
  };
}

interface NBOSummaryResponse {
  totalHcps: number;
  sampled: number;
  actionDistribution: Record<string, number>;
  urgencyDistribution: { high: number; medium: number; low: number };
  avgConfidence: number;
  topActions: Array<{ action: string; estimatedCount: number }>;
}

const actionColors: Record<string, string> = {
  engage: "bg-blue-500",
  reinforce: "bg-green-500",
  defend: "bg-red-500",
  nurture: "bg-purple-500",
  expand: "bg-cyan-500",
  pause: "bg-orange-500",
  reactivate: "bg-amber-500",
};

export default function NBODashboard() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("priority");
  const [limit, setLimit] = useState(20);
  const [urgencyFilter, setUrgencyFilter] = useState<string>("all");

  // Fetch priority queue
  const { data: priorityData, isLoading: priorityLoading, refetch: refetchPriority } = useQuery<{
    recommendations: NBORecommendation[];
    totalAnalyzed: number;
    returned: number;
  }>({
    queryKey: ["/api/nbo/priority-queue", limit],
    queryFn: async () => {
      const res = await fetch(`/api/nbo/priority-queue?limit=${limit}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch priority queue");
      return res.json();
    },
  });

  // Filtered recommendations
  const filteredRecommendations = priorityData?.recommendations?.filter((rec) =>
    urgencyFilter === "all" ? true : rec.urgency === urgencyFilter
  ) || [];

  // Calculate distribution from priority data
  const actionDistribution = priorityData?.recommendations?.reduce((acc, rec) => {
    acc[rec.actionType] = (acc[rec.actionType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const urgencyDistribution = priorityData?.recommendations?.reduce(
    (acc, rec) => {
      acc[rec.urgency]++;
      return acc;
    },
    { high: 0, medium: 0, low: 0 }
  ) || { high: 0, medium: 0, low: 0 };

  // Handle recommendation actions
  const handleAccept = (recommendation: NBORecommendation) => {
    console.log("Accepted recommendation:", recommendation.id);
    // TODO: Implement accept logic (update status, create task, etc.)
  };

  const handleDismiss = (recommendation: NBORecommendation) => {
    console.log("Dismissed recommendation:", recommendation.id);
    // TODO: Implement dismiss logic
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Target className="h-6 w-6 text-blue-600" />
            Next Best Orbit
          </h1>
          <p className="text-gray-500 mt-1">
            AI-powered engagement recommendations combining engagement, saturation, and competitive signals
          </p>
        </div>
        <Button onClick={() => refetchPriority()} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Analyzed</CardDescription>
            <CardTitle className="text-2xl">
              {priorityLoading ? <Skeleton className="h-8 w-16" /> : priorityData?.totalAnalyzed || 0}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500">HCPs in portfolio</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              High Priority
            </CardDescription>
            <CardTitle className="text-2xl text-red-600">
              {priorityLoading ? <Skeleton className="h-8 w-16" /> : urgencyDistribution.high}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500">Immediate action needed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Shield className="h-4 w-4 text-red-500" />
              Defend Actions
            </CardDescription>
            <CardTitle className="text-2xl text-red-600">
              {priorityLoading ? <Skeleton className="h-8 w-16" /> : actionDistribution.defend || 0}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500">Counter competitive pressure</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Zap className="h-4 w-4 text-blue-500" />
              Engage/Expand
            </CardDescription>
            <CardTitle className="text-2xl text-blue-600">
              {priorityLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                (actionDistribution.engage || 0) + (actionDistribution.expand || 0)
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500">Growth opportunities</p>
          </CardContent>
        </Card>
      </div>

      {/* Action Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            Action Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {Object.entries(actionDistribution).map(([action, count]) => (
              <div key={action} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${actionColors[action] || "bg-gray-400"}`} />
                <span className="text-sm capitalize">{action}</span>
                <Badge variant="secondary">{count}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filters and Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="priority">Priority Queue</TabsTrigger>
            <TabsTrigger value="all">All Recommendations</TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="urgency-filter" className="text-sm">
                Urgency:
              </Label>
              <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
                <SelectTrigger id="urgency-filter" className="w-32">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Label htmlFor="limit" className="text-sm">
                Show:
              </Label>
              <Select value={String(limit)} onValueChange={(v) => setLimit(Number(v))}>
                <SelectTrigger id="limit" className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <TabsContent value="priority" className="mt-6">
          {priorityLoading ? (
            <div className="grid gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-32 mt-2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-16 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredRecommendations.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Target className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">No recommendations match your filters</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredRecommendations.map((rec) => (
                <NBORecommendationCard
                  key={rec.id}
                  recommendation={rec}
                  onAccept={handleAccept}
                  onDismiss={handleDismiss}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="all" className="mt-6">
          <Card>
            <CardContent className="py-12 text-center">
              <BarChart3 className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500 mb-4">
                Generate recommendations for a specific cohort
              </p>
              <Button variant="outline">Select Cohort</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
