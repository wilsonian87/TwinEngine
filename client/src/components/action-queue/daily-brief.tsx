/**
 * Daily Brief — Wordle-inspired bounded decision session.
 *
 * "5 critical decisions today. ~3 minutes."
 * Focus Mode: one recommendation at a time, full context.
 * Post-session debrief with stats.
 */

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Zap,
  Clock,
  Target,
  CheckCircle,
  ArrowLeft,
  Mail,
  Video,
  Phone,
  Monitor,
  Users as UsersIcon,
  Megaphone,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { EngagementGrade } from "@/components/shared/engagement-grade";
import { BehavioralBadgeRow, deriveBadges } from "@/components/shared/behavioral-badges";
import { CompletionCheckbox } from "@/components/shared/completion-animation";
import { MOTION_DURATION, MOTION_EASING } from "@/lib/motion-config";
import type { NBORecommendation } from "@/hooks/use-action-queue-data";

// ============================================================================
// TYPES
// ============================================================================

interface DailyBriefProps {
  recommendations: NBORecommendation[];
  onExit: () => void;
  onOpenProfile: (hcpId: string) => void;
}

interface DecisionRecord {
  hcpId: string;
  decision: "approve" | "defer" | "reject";
}

type BriefPhase = "intro" | "focus" | "debrief";

// ============================================================================
// CONSTANTS
// ============================================================================

const DAILY_BRIEF_MAX = 5;

const channelIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  email: Mail,
  webinar: Video,
  phone: Phone,
  digital_ad: Monitor,
  rep_visit: UsersIcon,
  conference: Megaphone,
};

const channelLabels: Record<string, string> = {
  email: "Email",
  webinar: "Webinar",
  phone: "Phone",
  digital_ad: "Digital Ad",
  rep_visit: "Rep Visit",
  conference: "Conference",
};

const actionColors: Record<string, string> = {
  defend: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800",
  engage: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800",
  nurture: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800",
  expand: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800",
  reactivate: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  pause: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800",
};

// ============================================================================
// INTRO SCREEN
// ============================================================================

function BriefIntro({
  count,
  onStart,
  onExit,
}: {
  count: number;
  onStart: () => void;
  onExit: () => void;
}) {
  const estimatedMinutes = Math.max(1, Math.ceil(count * 0.6));

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="flex flex-col items-center justify-center h-full text-center px-6"
    >
      <div className="max-w-md space-y-6">
        <div
          className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #6b21a8 0%, #d97706 100%)" }}
        >
          <Target className="h-8 w-8 text-white" />
        </div>

        <div>
          <h2 className="text-2xl font-bold">Daily Brief</h2>
          <p className="text-muted-foreground mt-2">
            {count} critical decision{count !== 1 ? "s" : ""} today
          </p>
        </div>

        <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Zap className="h-4 w-4" />
            <span>{count} recommendation{count !== 1 ? "s" : ""}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            <span>~{estimatedMinutes} min</span>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <Button size="lg" className="w-full" onClick={onStart}>
            Start Review
          </Button>
          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={onExit}>
            Back to Queue
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// FOCUS CARD — Full-context single recommendation
// ============================================================================

function FocusCard({
  recommendation: rec,
  index,
  total,
  onDecide,
  onOpenProfile,
}: {
  recommendation: NBORecommendation;
  index: number;
  total: number;
  onDecide: (decision: "approve" | "defer" | "reject") => void;
  onOpenProfile: () => void;
}) {
  const ChannelIcon = channelIcons[rec.channel || "email"] || Mail;
  const badges = deriveBadges({
    overallEngagementScore: rec.factors?.engagement ? rec.factors.engagement * 100 : 50,
    competitivePressureIndex: rec.factors?.competitive ? rec.factors.competitive * 100 : 0,
  });

  return (
    <motion.div
      key={rec.hcpId}
      initial={{ opacity: 0, x: 80 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -80 }}
      transition={{ duration: MOTION_DURATION.data, ease: MOTION_EASING.out }}
      className="max-w-2xl mx-auto w-full"
    >
      {/* Progress dots */}
      <div className="flex items-center justify-center gap-1.5 mb-6">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-2 rounded-full transition-all",
              i < index ? "w-2 bg-primary" : i === index ? "w-6 bg-primary" : "w-2 bg-muted"
            )}
          />
        ))}
      </div>

      <Card className="border-2">
        <CardContent className="p-6 space-y-5">
          {/* Header: HCP + Grade */}
          <div className="flex items-start justify-between">
            <div>
              <button
                className="text-xl font-bold hover:underline text-left"
                onClick={onOpenProfile}
              >
                {rec.hcpName}
              </button>
              <p className="text-sm text-muted-foreground mt-0.5">
                {rec.specialty} · {rec.tier} · {rec.segment}
              </p>
            </div>
            <EngagementGrade score={rec.compositeScore} size="md" />
          </div>

          {/* Badges */}
          {badges.length > 0 && (
            <BehavioralBadgeRow badges={badges} maxVisible={4} />
          )}

          {/* Recommendation */}
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={cn("capitalize", actionColors[rec.action] || "")}
              >
                {rec.action}
              </Badge>
              <span className="text-sm text-muted-foreground">via</span>
              <div className="flex items-center gap-1 text-sm">
                <ChannelIcon className="h-3.5 w-3.5" />
                <span>{channelLabels[rec.channel] || rec.channel}</span>
              </div>
              <span className="ml-auto text-sm tabular-nums text-muted-foreground">
                {Math.round(rec.confidence * 100)}% confidence
              </span>
            </div>
            <p className="text-sm leading-relaxed">{rec.rationale}</p>
          </div>

          {/* Signal breakdown */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Engagement", value: rec.factors.engagement },
              { label: "Channel Fit", value: rec.factors.channelAffinity },
              { label: "Competitive", value: rec.factors.competitive },
              { label: "Saturation", value: rec.factors.saturation },
              { label: "Adoption", value: rec.factors.adoption },
              { label: "Recency", value: rec.factors.recency },
            ].map((f) => (
              <div key={f.label} className="text-center p-2 rounded-md bg-muted/50">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{f.label}</p>
                <p className={cn(
                  "text-sm font-semibold tabular-nums",
                  f.value >= 0.6 ? "text-green-600 dark:text-green-400" :
                  f.value <= 0.3 ? "text-red-600 dark:text-red-400" :
                  "text-foreground"
                )}>
                  {(f.value * 100).toFixed(0)}
                </p>
              </div>
            ))}
          </div>

          {/* Decision buttons */}
          <div className="flex gap-3 pt-2">
            <Button className="flex-1 h-11" onClick={() => onDecide("approve")}>
              Approve
            </Button>
            <Button variant="outline" className="flex-1 h-11" onClick={() => onDecide("defer")}>
              Defer
            </Button>
            <Button
              variant="ghost"
              className="flex-1 h-11 text-destructive hover:text-destructive"
              onClick={() => onDecide("reject")}
            >
              Reject
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Keyboard hint */}
      <p className="text-center text-[10px] text-muted-foreground mt-3">
        A approve · D defer · R reject · Enter open profile
      </p>
    </motion.div>
  );
}

// ============================================================================
// DEBRIEF SCREEN
// ============================================================================

function BriefDebrief({
  decisions,
  recommendations,
  onExit,
}: {
  decisions: DecisionRecord[];
  recommendations: NBORecommendation[];
  onExit: () => void;
}) {
  const approved = decisions.filter((d) => d.decision === "approve").length;
  const deferred = decisions.filter((d) => d.decision === "defer").length;
  const rejected = decisions.filter((d) => d.decision === "reject").length;

  // Count unique tiers and channels
  const decidedHcpIds = new Set(decisions.filter((d) => d.decision === "approve").map((d) => d.hcpId));
  const approvedRecs = recommendations.filter((r) => decidedHcpIds.has(r.hcpId));
  const uniqueChannels = new Set(approvedRecs.map((r) => r.channel)).size;
  const tier1Count = approvedRecs.filter((r) => r.tier === "Tier 1").length;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center h-full text-center px-6"
    >
      <div className="max-w-md space-y-6">
        <div
          className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #6b21a8 0%, #d97706 100%)" }}
        >
          <CheckCircle className="h-8 w-8 text-white" />
        </div>

        <div>
          <h2 className="text-2xl font-bold">Brief Complete</h2>
          <p className="text-muted-foreground mt-2">
            {decisions.length} decision{decisions.length !== 1 ? "s" : ""} made
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg bg-green-500/10 p-3">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{approved}</p>
            <p className="text-xs text-muted-foreground">Approved</p>
          </div>
          <div className="rounded-lg bg-amber-500/10 p-3">
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{deferred}</p>
            <p className="text-xs text-muted-foreground">Deferred</p>
          </div>
          <div className="rounded-lg bg-red-500/10 p-3">
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{rejected}</p>
            <p className="text-xs text-muted-foreground">Rejected</p>
          </div>
        </div>

        {/* Impact summary */}
        {approved > 0 && (
          <p className="text-sm text-muted-foreground">
            Targets {tier1Count > 0 ? `${tier1Count} Tier 1 HCP${tier1Count !== 1 ? "s" : ""} ` : ""}
            across {uniqueChannels} channel{uniqueChannels !== 1 ? "s" : ""}.
          </p>
        )}

        <Button size="lg" className="w-full" onClick={onExit}>
          Back to Queue
        </Button>
      </div>
    </motion.div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function DailyBrief({ recommendations, onExit, onOpenProfile }: DailyBriefProps) {
  const [phase, setPhase] = useState<BriefPhase>("intro");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [decisions, setDecisions] = useState<DecisionRecord[]>([]);

  const briefItems = recommendations.slice(0, DAILY_BRIEF_MAX);
  const currentRec = briefItems[currentIndex];

  const handleDecide = useCallback((decision: "approve" | "defer" | "reject") => {
    if (!currentRec) return;
    setDecisions((prev) => [...prev, { hcpId: currentRec.hcpId, decision }]);

    if (currentIndex < briefItems.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      setPhase("debrief");
    }
  }, [currentRec, currentIndex, briefItems.length]);

  // Keyboard shortcuts in focus mode
  useEffect(() => {
    if (phase !== "focus") return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key) {
        case "a":
        case "A":
          e.preventDefault();
          handleDecide("approve");
          break;
        case "d":
        case "D":
          e.preventDefault();
          handleDecide("defer");
          break;
        case "r":
        case "R":
          e.preventDefault();
          handleDecide("reject");
          break;
        case "Enter":
          e.preventDefault();
          if (currentRec) onOpenProfile(currentRec.hcpId);
          break;
        case "Escape":
          e.preventDefault();
          onExit();
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [phase, handleDecide, currentRec, onOpenProfile, onExit]);

  return (
    <div className="h-full flex flex-col">
      {/* Top bar */}
      <div className="shrink-0 border-b px-4 py-3 flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onExit}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Queue
        </Button>
        <span className="text-sm font-medium">Daily Brief</span>
        {phase === "focus" && (
          <span className="text-xs text-muted-foreground tabular-nums">
            {currentIndex + 1} / {briefItems.length}
          </span>
        )}
        {phase !== "focus" && <div className="w-16" />}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto py-8 px-4">
        <AnimatePresence mode="wait">
          {phase === "intro" && (
            <BriefIntro
              key="intro"
              count={briefItems.length}
              onStart={() => setPhase("focus")}
              onExit={onExit}
            />
          )}
          {phase === "focus" && currentRec && (
            <FocusCard
              key={currentRec.hcpId}
              recommendation={currentRec}
              index={currentIndex}
              total={briefItems.length}
              onDecide={handleDecide}
              onOpenProfile={() => onOpenProfile(currentRec.hcpId)}
            />
          )}
          {phase === "debrief" && (
            <BriefDebrief
              key="debrief"
              decisions={decisions}
              recommendations={briefItems}
              onExit={onExit}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
