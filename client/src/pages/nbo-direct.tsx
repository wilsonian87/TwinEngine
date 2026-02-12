/**
 * Next Best Orbit Direct Mode — Waze routing pattern.
 *
 * Design analogues:
 * - Waze: top recommendation + rationale as first-class content, 2–3 alternatives with tradeoffs
 * - Confidence as context, not just a number
 *
 * Lead with the "because." The rationale is as prominent as the recommendation.
 */

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  Target,
  Shield,
  Zap,
  Users,
  Heart,
  Pause,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Mail,
  Video,
  Phone,
  Monitor,
  Megaphone,
  Calendar,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  staggerContainer,
  staggerChild,
  MOTION_DURATION,
  MOTION_EASING,
} from "@/lib/motion-config";
import { EngagementGrade } from "@/components/shared/engagement-grade";
import { AINarrativeBlock } from "@/components/shared/ai-narrative-block";
import type { NBORecommendation as SharedNBORec } from "@shared/schema";

// ============================================================================
// TYPES
// ============================================================================

interface NBOPriorityResponse {
  recommendations: SharedNBORec[];
  totalAnalyzed: number;
  returned: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const actionConfig: Record<string, {
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  label: string;
  verb: string;
}> = {
  engage: { icon: Zap, color: "bg-blue-500", label: "Engage", verb: "Increase engagement with" },
  reinforce: { icon: RefreshCw, color: "bg-green-500", label: "Reinforce", verb: "Reinforce momentum with" },
  defend: { icon: Shield, color: "bg-red-500", label: "Defend", verb: "Counter competitive pressure on" },
  nurture: { icon: Heart, color: "bg-purple-500", label: "Nurture", verb: "Maintain relationship with" },
  expand: { icon: Users, color: "bg-cyan-500", label: "Expand", verb: "Explore new channels for" },
  pause: { icon: Pause, color: "bg-orange-500", label: "Pause", verb: "Reduce messaging to" },
  reactivate: { icon: Target, color: "bg-amber-500", label: "Reactivate", verb: "Re-establish contact with" },
};

const channelIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  email: Mail,
  webinar: Video,
  phone: Phone,
  digital_ad: Monitor,
  rep_visit: Users,
  conference: Calendar,
};

const channelLabels: Record<string, string> = {
  email: "Email",
  webinar: "Webinar",
  phone: "Phone",
  digital_ad: "Digital Ad",
  rep_visit: "Rep Visit",
  conference: "Conference",
};

// ============================================================================
// HELPERS
// ============================================================================

function getTradeoffText(primary: SharedNBORec, alt: SharedNBORec): string {
  const confDiff = Math.round((primary.confidence - alt.confidence) * 100);
  const actionLabel = actionConfig[alt.actionType]?.label || alt.actionType;
  const channelLabel = channelLabels[alt.recommendedChannel] || alt.recommendedChannel;

  if (alt.actionType === "defend") {
    return `${actionLabel} via ${channelLabel} — more defensive, addresses competitive pressure directly${confDiff > 10 ? `, ${confDiff}% lower confidence` : ""}`;
  }
  if (alt.actionType === "pause") {
    return `${actionLabel} — reduces saturation risk, but may cede ground to competitors`;
  }
  if (confDiff > 15) {
    return `${actionLabel} via ${channelLabel} — ${confDiff}% lower confidence, but may suit different campaign timing`;
  }
  return `${actionLabel} via ${channelLabel} — different approach with ${Math.round(alt.confidence * 100)}% confidence`;
}

function generateNarrative(recs: SharedNBORec[]): string {
  if (recs.length === 0) return "No recommendations available.";

  const highUrgency = recs.filter((r) => r.urgency === "high").length;
  const defendCount = recs.filter((r) => r.actionType === "defend").length;
  const topAction = recs[0];
  const config = actionConfig[topAction.actionType];

  let narrative = `${recs.length} HCPs analyzed.`;
  if (highUrgency > 0) {
    narrative += ` ${highUrgency} require immediate attention.`;
  }
  if (defendCount > 0) {
    narrative += ` ${defendCount} defensive action${defendCount > 1 ? "s" : ""} recommended against competitive pressure.`;
  }
  narrative += ` Top priority: ${config?.verb || topAction.actionType} ${topAction.hcpName} via ${channelLabels[topAction.recommendedChannel] || topAction.recommendedChannel}.`;

  return narrative;
}

// ============================================================================
// PRIMARY RECOMMENDATION CARD — The "Waze top route"
// ============================================================================

function PrimaryRecommendation({
  rec,
  onAccept,
  onDismiss,
  onHcpClick,
}: {
  rec: SharedNBORec;
  onAccept: () => void;
  onDismiss: () => void;
  onHcpClick: () => void;
}) {
  const config = actionConfig[rec.actionType] || actionConfig.engage;
  const ActionIcon = config.icon;
  const ChannelIcon = channelIcons[rec.recommendedChannel] || Mail;

  return (
    <motion.div variants={staggerChild}>
      <Card className="border-2 border-primary/30">
        <CardContent className="p-6 space-y-4">
          {/* Top label */}
          <div className="flex items-center justify-between">
            <Badge className="bg-primary/10 text-primary border-primary/30 text-xs">
              Top Recommendation
            </Badge>
            <span className="text-xs text-muted-foreground tabular-nums">
              {Math.round(rec.confidence * 100)}% confidence
            </span>
          </div>

          {/* HCP + Score */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <button
                className="text-lg font-bold hover:underline text-left"
                onClick={onHcpClick}
              >
                {rec.hcpName}
              </button>
              <p className="text-sm text-muted-foreground">
                Score {rec.compositeScore} · {rec.urgency} priority
              </p>
            </div>
            <EngagementGrade score={rec.compositeScore} size="md" />
          </div>

          {/* Action + Channel */}
          <div className="flex items-center gap-3">
            <div className={cn("rounded-lg p-2 text-white", config.color)}>
              <ActionIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">{config.label}</p>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span>via</span>
                <ChannelIcon className="h-3 w-3" />
                <span>{channelLabels[rec.recommendedChannel] || rec.recommendedChannel}</span>
              </div>
            </div>
          </div>

          {/* Rationale — FIRST CLASS CONTENT (Waze pattern) */}
          <div className="rounded-lg bg-muted/50 p-4">
            <p className="text-sm font-medium mb-1">Because:</p>
            <p className="text-sm leading-relaxed text-muted-foreground">{rec.rationale}</p>
          </div>

          {/* Key Factors */}
          {rec.keyFactors && rec.keyFactors.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {rec.keyFactors.map((factor, i) => (
                <Badge key={i} variant="secondary" className="text-[10px]">
                  {factor}
                </Badge>
              ))}
            </div>
          )}

          {/* Expected Impact */}
          {rec.expectedImpact?.description && (
            <div className="rounded-lg border border-green-200 dark:border-green-800 bg-green-500/5 p-3">
              <p className="text-xs text-muted-foreground mb-0.5">Expected Impact</p>
              <p className="text-sm font-medium text-green-700 dark:text-green-300">
                {rec.expectedImpact.description}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <Button className="flex-1" onClick={onAccept}>
              <ThumbsUp className="h-4 w-4 mr-1.5" />
              Accept
            </Button>
            <Button variant="outline" className="flex-1" onClick={onDismiss}>
              <ThumbsDown className="h-4 w-4 mr-1.5" />
              Dismiss
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ============================================================================
// ALTERNATIVE CARD — The "other routes"
// ============================================================================

function AlternativeCard({
  rec,
  primary,
  index,
  onAccept,
  onHcpClick,
}: {
  rec: SharedNBORec;
  primary: SharedNBORec;
  index: number;
  onAccept: () => void;
  onHcpClick: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const config = actionConfig[rec.actionType] || actionConfig.engage;
  const ActionIcon = config.icon;
  const ChannelIcon = channelIcons[rec.recommendedChannel] || Mail;
  const tradeoff = getTradeoffText(primary, rec);

  return (
    <motion.div variants={staggerChild}>
      <Card className="hover:border-primary/20 transition-colors">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className={cn("rounded-lg p-1.5 text-white shrink-0", config.color)}>
              <ActionIcon className="h-4 w-4" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <button
                    className="text-sm font-semibold hover:underline truncate block text-left"
                    onClick={onHcpClick}
                  >
                    {rec.hcpName}
                  </button>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                    <span className="font-medium">{config.label}</span>
                    <span>via</span>
                    <ChannelIcon className="h-3 w-3" />
                    <span>{channelLabels[rec.recommendedChannel] || rec.recommendedChannel}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {Math.round(rec.confidence * 100)}%
                  </span>
                </div>
              </div>

              {/* Tradeoff — the key Waze differentiator */}
              <p className="text-xs text-muted-foreground mt-2 italic">{tradeoff}</p>

              {/* Expandable rationale */}
              {expanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  className="mt-2 pt-2 border-t text-xs text-muted-foreground"
                >
                  <p>{rec.rationale}</p>
                </motion.div>
              )}

              <div className="flex items-center gap-2 mt-2">
                <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={onAccept}>
                  Accept Instead
                </Button>
                <button
                  className="text-[10px] text-muted-foreground hover:text-foreground"
                  onClick={() => setExpanded(!expanded)}
                >
                  {expanded ? "Less" : "Details"}
                </button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function NBODirect() {
  const [, navigate] = useLocation();
  const [urgencyFilter, setUrgencyFilter] = useState("all");
  const [currentHcpIndex, setCurrentHcpIndex] = useState(0);

  const { data, isLoading, refetch } = useQuery<NBOPriorityResponse>({
    queryKey: ["/api/nbo/priority-queue", 50, urgencyFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "50" });
      if (urgencyFilter !== "all") params.set("urgency", urgencyFilter);
      const res = await fetch(`/api/nbo/priority-queue?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch NBO priority queue");
      return res.json();
    },
    refetchInterval: 120000,
  });

  const recommendations = data?.recommendations || [];

  // Group by HCP — show top rec + alternatives for same HCP, or next best HCPs
  const grouped = useMemo(() => {
    if (recommendations.length === 0) return [];

    // Group into "recommendation sets" — each HCP gets their top rec
    // plus we show 2 alternative HCPs with different strategies
    const sorted = [...recommendations].sort((a, b) => b.compositeScore - a.compositeScore);
    return sorted;
  }, [recommendations]);

  const primary = grouped[currentHcpIndex];
  const alternatives = grouped.slice(currentHcpIndex + 1, currentHcpIndex + 3);
  const narrative = useMemo(() => generateNarrative(grouped), [grouped]);

  const highCount = recommendations.filter((r) => r.urgency === "high").length;
  const totalCount = recommendations.length;

  const handleNext = () => {
    if (currentHcpIndex + 3 < grouped.length) {
      setCurrentHcpIndex((i) => i + 3);
    }
  };

  const handlePrev = () => {
    setCurrentHcpIndex((i) => Math.max(0, i - 3));
  };

  return (
    <div className="h-full overflow-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur-sm px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold" data-testid="text-page-title">
              Next Best Orbit
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {highCount} high priority · {totalCount} total recommendations
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
              <SelectTrigger className="w-[120px] h-8 text-xs">
                <SelectValue placeholder="All urgency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Urgency</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-2xl mx-auto space-y-6">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-64" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        ) : !primary ? (
          <div className="text-center py-16 text-muted-foreground">
            <Target className="h-8 w-8 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No recommendations match your filters</p>
          </div>
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="enter"
            className="space-y-6"
          >
            {/* AI Narrative */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: MOTION_DURATION.data, ease: MOTION_EASING.out }}
            >
              <AINarrativeBlock narrative={narrative} variant="verdict" />
            </motion.div>

            {/* Primary Recommendation */}
            <PrimaryRecommendation
              rec={primary}
              onAccept={() => handleNext()}
              onDismiss={() => handleNext()}
              onHcpClick={() => navigate(`/?hcp=${primary.hcpId}`)}
            />

            {/* Alternatives */}
            {alternatives.length > 0 && (
              <div>
                <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                  Alternatives
                </h2>
                <motion.div
                  variants={staggerContainer}
                  initial="initial"
                  animate="enter"
                  className="space-y-2"
                >
                  {alternatives.map((alt, i) => (
                    <AlternativeCard
                      key={alt.id || `${alt.hcpId}-${i}`}
                      rec={alt}
                      primary={primary}
                      index={i}
                      onAccept={() => handleNext()}
                      onHcpClick={() => navigate(`/?hcp=${alt.hcpId}`)}
                    />
                  ))}
                </motion.div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between pt-4 border-t">
              <Button
                variant="ghost"
                size="sm"
                disabled={currentHcpIndex === 0}
                onClick={handlePrev}
              >
                <ChevronUp className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <span className="text-xs text-muted-foreground tabular-nums">
                {currentHcpIndex + 1}–{Math.min(currentHcpIndex + 3, grouped.length)} of {grouped.length}
              </span>
              <Button
                variant="ghost"
                size="sm"
                disabled={currentHcpIndex + 3 >= grouped.length}
                onClick={handleNext}
              >
                Next
                <ChevronDown className="h-4 w-4 ml-1" />
              </Button>
            </div>

            {/* Was this helpful? — Simple feedback (Waze pattern) */}
            <div className="rounded-lg border border-dashed p-4 text-center">
              <p className="text-xs text-muted-foreground mb-2">Was this recommendation helpful?</p>
              <div className="flex justify-center gap-2">
                <Button variant="outline" size="sm" className="h-7 text-xs">
                  <ThumbsUp className="h-3 w-3 mr-1" />
                  Yes
                </Button>
                <Button variant="outline" size="sm" className="h-7 text-xs">
                  <ThumbsDown className="h-3 w-3 mr-1" />
                  No
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
