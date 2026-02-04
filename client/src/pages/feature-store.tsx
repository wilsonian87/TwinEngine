import { Database, CheckCircle, Clock, AlertCircle, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

const dataSources = [
  {
    name: "PLD / Prescribing Data",
    description: "IQVIA prescription-level data",
    status: "healthy",
    lastSync: "2 hours ago",
    records: 10247,
    coverage: 98,
  },
  {
    name: "Promotional Response",
    description: "Marketing touch responses",
    status: "healthy",
    lastSync: "1 hour ago",
    records: 45832,
    coverage: 95,
  },
  {
    name: "Omnichannel Engagement",
    description: "Email, web, event interactions",
    status: "syncing",
    lastSync: "In progress",
    records: 128456,
    coverage: 92,
  },
  {
    name: "Market Access Data",
    description: "Payer & formulary context",
    status: "healthy",
    lastSync: "6 hours ago",
    records: 8934,
    coverage: 88,
  },
  {
    name: "Medical/Scientific",
    description: "KOL & congress engagement",
    status: "warning",
    lastSync: "3 days ago",
    records: 2145,
    coverage: 76,
  },
];

const featureGroups = [
  { name: "Prescribing Features", count: 24, description: "Rx volume, trends, market share" },
  { name: "Engagement Features", count: 18, description: "Channel scores, response rates" },
  { name: "Behavioral Features", count: 12, description: "Preferences, segments, patterns" },
  { name: "Prediction Features", count: 8, description: "Conversion, churn, uplift scores" },
  { name: "Context Features", count: 6, description: "Geography, organization, tier" },
];

const statusIcons: Record<string, typeof CheckCircle> = {
  healthy: CheckCircle,
  syncing: RefreshCw,
  warning: AlertCircle,
};

const statusColors: Record<string, string> = {
  healthy: "text-chart-1",
  syncing: "text-chart-3 animate-spin",
  warning: "text-destructive",
};

const statusBadgeVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  healthy: "default",
  syncing: "secondary",
  warning: "destructive",
};

export default function FeatureStore() {
  return (
    <div className="h-full overflow-auto">
      <div className="sticky top-0 z-10 border-b bg-background px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold" data-testid="text-page-title">Feature Store</h1>
            <p className="text-sm text-muted-foreground">
              HCP Twin data pipeline status and feature catalog
            </p>
          </div>
          <Button variant="outline" data-testid="button-sync-all">
            <RefreshCw className="mr-2 h-4 w-4" />
            Sync All Sources
          </Button>
        </div>
      </div>

      <div className="space-y-6 p-6">
        <div>
          <h2 className="mb-4 text-base font-semibold">Data Sources</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {dataSources.map((source) => {
              const StatusIcon = statusIcons[source.status];
              return (
                <Card
                  key={source.name}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  data-testid={`card-source-${source.name.toLowerCase().replace(/[/\s]+/g, "-")}`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Database className="h-4 w-4 text-muted-foreground" />
                        <CardTitle className="text-sm">{source.name}</CardTitle>
                      </div>
                      <StatusIcon className={`h-4 w-4 ${statusColors[source.status]}`} />
                    </div>
                    <CardDescription className="text-xs">
                      {source.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Last sync</span>
                      <Badge variant={statusBadgeVariants[source.status]}>
                        {source.lastSync}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Records</span>
                      <span className="font-mono">{source.records.toLocaleString()}</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Coverage</span>
                        <span className="font-mono">{source.coverage}%</span>
                      </div>
                      <Progress value={source.coverage} className="h-1.5" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        <Separator />

        <div>
          <h2 className="mb-4 text-base font-semibold">Feature Catalog</h2>
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {featureGroups.map((group, index) => (
                  <div
                    key={group.name}
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                    data-testid={`row-feature-${group.name.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <div>
                      <h3 className="font-medium">{group.name}</h3>
                      <p className="text-sm text-muted-foreground">{group.description}</p>
                    </div>
                    <Badge variant="secondary" className="font-mono">
                      {group.count} features
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Features</CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-3xl font-bold font-mono" data-testid="text-total-features">
                {featureGroups.reduce((sum, g) => sum + g.count, 0)}
              </span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">HCPs Covered</CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-3xl font-bold font-mono" data-testid="text-hcps-covered">
                10,247
              </span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Model Freshness</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-bold font-mono">24h</span>
                <Badge>Current</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
