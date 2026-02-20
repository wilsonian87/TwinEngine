/**
 * Action Queue — Direct Mode
 *
 * Things 3-style temporal bucketing: Act Now / This Week / Backlog
 * Keyboard triage: A(pprove), D(efer), R(eject), ↑↓ Navigate
 * Visual feedback: decision icons, gray-out, collapsible "Reviewed" section, undo
 * Progress counter with purple→gold gradient at 100%
 *
 * DO NOT MODIFY action-queue.tsx — that is Discover Mode.
 */

import { useState, useCallback, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronRight,
  Mail,
  Video,
  Phone,
  Monitor,
  Users as UsersIcon,
  Megaphone,
  Target,
  Check,
  Clock,
  X,
  Undo2,
  FlaskConical,
  ArrowLeft,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HCPProfileDrawer } from "@/components/hcp-profile-drawer";
import type { HCPDrawerAction } from "@/components/hcp-profile-drawer";
import { BehavioralBadgeRow, deriveBadges } from "@/components/shared/behavioral-badges";
import { EngagementGrade } from "@/components/shared/engagement-grade";
import { ProgressCounter } from "@/components/shared/progress-counter";
import { KeyboardHintBar, ACTION_QUEUE_HINTS } from "@/components/shared/keyboard-hint-bar";
import { AddToAudienceButton } from "@/components/shared/add-to-audience-button";
import { CelebrationOverlay } from "@/components/viz/celebration-overlay";
import {
  useAudiences,
  useAllHcps,
  useNBOPriorityQueue,
  bucketRecommendations,
  type NBORecommendation,
} from "@/hooks/use-action-queue-data";
import {
  staggerContainer,
  staggerChild,
  MOTION_DURATION,
  MOTION_EASING,
} from "@/lib/motion-config";
import { cn } from "@/lib/utils";
import { DailyBrief } from "@/components/action-queue/daily-brief";
import type { SimulationResult } from "@shared/schema";

// ============================================================================
// TYPES
// ============================================================================

type DecisionType = "approve" | "defer" | "reject";

// ============================================================================
// CHANNEL ICONS
// ============================================================================

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

// ============================================================================
// DECISION INDICATOR
// ============================================================================

function DecisionIcon({ decision, size = 16 }: { decision: DecisionType; size?: number }) {
  const config = {
    approve: { icon: Check, color: "text-green-500", bg: "bg-green-500/15" },
    defer: { icon: Clock, color: "text-amber-500", bg: "bg-amber-500/15" },
    reject: { icon: X, color: "text-red-500", bg: "bg-red-500/15" },
  }[decision];
  const Icon = config.icon;

  return (
    <div className={cn("rounded-full flex items-center justify-center", config.bg)}
      style={{ width: size + 8, height: size + 8 }}
    >
      <Icon className={cn(config.color)} style={{ width: size, height: size }} />
    </div>
  );
}

// ============================================================================
// ACTION CARD (Act Now bucket — full context)
// ============================================================================

interface ActionCardProps {
  recommendation: NBORecommendation;
  isSelected: boolean;
  decision?: DecisionType;
  onSelect: () => void;
  onApprove: () => void;
  onDefer: () => void;
  onReject: () => void;
  onUndo?: () => void;
  onOpenProfile: () => void;
}

function ActionCard({
  recommendation: rec,
  isSelected,
  decision,
  onSelect,
  onApprove,
  onDefer,
  onReject,
  onUndo,
  onOpenProfile,
}: ActionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const ChannelIcon = channelIcons[rec.channel || "email"] || Mail;
  const badges = deriveBadges({
    overallEngagementScore: rec.factors?.engagement ? rec.factors.engagement * 100 : 50,
    competitivePressureIndex: rec.factors?.competitive ? rec.factors.competitive * 100 : 0,
  });
  const isReviewed = !!decision;

  return (
    <motion.div layout variants={staggerChild}>
          <Card
            className={cn(
              "cursor-pointer transition-all duration-200 group",
              isSelected && !isReviewed && "ring-2 ring-primary",
              isReviewed && "opacity-50"
            )}
            onClick={isReviewed ? undefined : onSelect}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                {/* Decision indicator */}
                <div className="pt-0.5 shrink-0">
                  {isReviewed ? (
                    <DecisionIcon decision={decision!} size={16} />
                  ) : (
                    <div className="w-6 h-6 rounded-full border-2 border-muted-foreground/30" />
                  )}
                </div>

                {/* Main content */}
                <div className="flex-1 min-w-0">
                  {/* Header row */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <button
                        className="font-medium text-sm hover:underline truncate text-left"
                        onClick={(e) => { e.stopPropagation(); onOpenProfile(); }}
                      >
                        {rec.hcpName}
                      </button>
                      {rec.specialty && (
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          {rec.specialty}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <EngagementGrade score={rec.compositeScore} size="sm" />
                      {!isReviewed && (
                        <AddToAudienceButton hcpId={rec.hcpId} hcpName={rec.hcpName} compact />
                      )}
                      {isReviewed && onUndo && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={(e) => { e.stopPropagation(); onUndo(); }}
                        >
                          <Undo2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Badges */}
                  {!isReviewed && badges.length > 0 && (
                    <div className="mt-1.5">
                      <BehavioralBadgeRow badges={badges} compact maxVisible={2} />
                    </div>
                  )}

                  {/* Recommendation */}
                  <div className="mt-2 flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className={cn(
                        "text-[10px] capitalize",
                        rec.action === "defend" && "bg-red-500/10 text-red-600 dark:text-red-400",
                        rec.action === "engage" && "bg-blue-500/10 text-blue-600 dark:text-blue-400",
                        rec.action === "nurture" && "bg-purple-500/10 text-purple-600 dark:text-purple-400",
                        rec.action === "expand" && "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
                        rec.action === "reactivate" && "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                        rec.action === "pause" && "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                      )}
                    >
                      {rec.action}
                    </Badge>
                    <ChannelIcon className="h-3 w-3 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground truncate">{rec.rationale}</p>
                  </div>

                  {/* Expandable evidence */}
                  {expanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      className="mt-3 pt-3 border-t text-xs text-muted-foreground space-y-1.5"
                    >
                      <p>{rec.rationale}</p>
                      <div className="flex items-center gap-4">
                        <span>Confidence: {Math.round(rec.confidence * 100)}%</span>
                        {rec.tier && <span>Tier: {rec.tier}</span>}
                        {rec.segment && <span>Segment: {rec.segment}</span>}
                      </div>
                    </motion.div>
                  )}

                  {/* Action buttons (visible on hover/select, hidden when reviewed) */}
                  {!isReviewed && (
                    <div className={cn(
                      "mt-3 flex items-center gap-2 transition-opacity",
                      isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    )}>
                      <Button size="sm" variant="default" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); onApprove(); }}>
                        Approve
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); onDefer(); }}>
                        Defer
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={(e) => { e.stopPropagation(); onReject(); }}>
                        Reject
                      </Button>
                      <button
                        className="ml-auto text-xs text-muted-foreground hover:text-foreground"
                        onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
                      >
                        {expanded ? "Less" : "Evidence"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
    </motion.div>
  );
}

// ============================================================================
// COMPACT ROW (This Week / Backlog buckets)
// ============================================================================

function CompactRow({
  recommendation: rec,
  isSelected,
  decision,
  onSelect,
  onApprove,
  onDefer,
  onReject,
  onUndo,
  onOpenProfile,
}: {
  recommendation: NBORecommendation;
  isSelected: boolean;
  decision?: DecisionType;
  onSelect: () => void;
  onApprove: () => void;
  onDefer: () => void;
  onReject: () => void;
  onUndo?: () => void;
  onOpenProfile: () => void;
}) {
  const isReviewed = !!decision;

  return (
        <motion.div
          layout
          variants={staggerChild}
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors group",
            isSelected && !isReviewed ? "bg-accent" : "hover:bg-accent/50",
            isReviewed && "opacity-40"
          )}
          onClick={isReviewed ? undefined : onSelect}
        >
          {/* Decision indicator */}
          {isReviewed ? (
            <DecisionIcon decision={decision!} size={12} />
          ) : (
            <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/20 shrink-0" />
          )}

          <button
            className="text-sm font-medium hover:underline min-w-[120px] text-left truncate"
            onClick={(e) => { e.stopPropagation(); onOpenProfile(); }}
          >
            {rec.hcpName}
          </button>
          <Badge variant="outline" className="text-[10px] capitalize shrink-0">{rec.action}</Badge>
          <p className="text-xs text-muted-foreground flex-1 truncate">{rec.rationale}</p>
          <span className="text-xs tabular-nums text-muted-foreground w-10 text-right shrink-0">
            {Math.round(rec.confidence * 100)}%
          </span>

          {/* Inline action buttons on hover (when not reviewed) */}
          {!isReviewed && (
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-green-600" onClick={(e) => { e.stopPropagation(); onApprove(); }}>
                <Check className="h-3 w-3" />
              </Button>
              <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-amber-600" onClick={(e) => { e.stopPropagation(); onDefer(); }}>
                <Clock className="h-3 w-3" />
              </Button>
              <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-red-600" onClick={(e) => { e.stopPropagation(); onReject(); }}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}

          {/* Undo button for reviewed items */}
          {isReviewed && onUndo && (
            <Button
              size="sm"
              variant="ghost"
              className="h-5 w-5 p-0 shrink-0 opacity-0 hover:opacity-100"
              onClick={(e) => { e.stopPropagation(); onUndo(); }}
            >
              <Undo2 className="h-3 w-3" />
            </Button>
          )}
        </motion.div>
  );
}

// ============================================================================
// BUCKET SECTION
// ============================================================================

function BucketSection({
  title,
  count,
  defaultOpen = true,
  variant,
  children,
}: {
  title: string;
  count: number;
  defaultOpen?: boolean;
  variant: "critical" | "default" | "muted";
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="mb-6">
      <button
        className="flex items-center gap-2 mb-3 text-sm font-semibold text-foreground hover:text-foreground/80"
        onClick={() => setOpen(!open)}
      >
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        <span>{title}</span>
        <Badge
          variant={variant === "critical" ? "destructive" : "secondary"}
          className="text-[10px]"
        >
          {count}
        </Badge>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: MOTION_DURATION.ui, ease: MOTION_EASING.out }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// REVIEWED SECTION — collapsible sub-menu for reviewed items
// ============================================================================

function ReviewedSection({
  items,
  decisions,
  onUndo,
  onOpenProfile,
}: {
  items: NBORecommendation[];
  decisions: Map<string, DecisionType>;
  onUndo: (id: string) => void;
  onOpenProfile: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const reviewed = items.filter((r) => decisions.has(r.hcpId));
  if (reviewed.length === 0) return null;

  const approvedCount = reviewed.filter((r) => decisions.get(r.hcpId) === "approve").length;
  const deferredCount = reviewed.filter((r) => decisions.get(r.hcpId) === "defer").length;
  const rejectedCount = reviewed.filter((r) => decisions.get(r.hcpId) === "reject").length;

  return (
    <div className="mt-4 pt-4 border-t border-dashed">
      <button
        className="flex items-center gap-2 mb-2 text-xs text-muted-foreground hover:text-foreground"
        onClick={() => setOpen(!open)}
      >
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        <span>Reviewed ({reviewed.length})</span>
        <span className="text-green-600">{approvedCount}A</span>
        <span className="text-amber-600">{deferredCount}D</span>
        <span className="text-red-600">{rejectedCount}R</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="space-y-0.5"
          >
            {reviewed.map((rec) => (
              <div
                key={rec.hcpId}
                className="flex items-center gap-3 px-3 py-1.5 rounded-md opacity-50 text-xs"
              >
                <DecisionIcon decision={decisions.get(rec.hcpId)!} size={10} />
                <button
                  className="font-medium hover:underline truncate text-left min-w-[100px]"
                  onClick={() => onOpenProfile(rec.hcpId)}
                >
                  {rec.hcpName}
                </button>
                <Badge variant="outline" className="text-[9px] capitalize">{rec.action}</Badge>
                <span className="flex-1 truncate text-muted-foreground">{rec.rationale}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-5 px-1.5 text-[10px]"
                  onClick={() => onUndo(rec.hcpId)}
                >
                  <Undo2 className="h-2.5 w-2.5 mr-0.5" />
                  Undo
                </Button>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function ActionQueueDirect() {
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const simulationId = new URLSearchParams(searchString).get("simulation");

  const [showDailyBrief, setShowDailyBrief] = useState(false);
  const [selectedAudienceId, setSelectedAudienceId] = useState<string>("all");
  const [selectedHcpId, setSelectedHcpId] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  // Track decisions per item (not just completion)
  const [decisions, setDecisions] = useState<Map<string, DecisionType>>(new Map());
  const [showCelebration, setShowCelebration] = useState(false);

  // Fetch simulation context if navigated from Simulation Studio
  const { data: simulationContext } = useQuery<SimulationResult>({
    queryKey: ["/api/simulations/history", simulationId],
    queryFn: async () => {
      const res = await fetch("/api/simulations/history", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch simulations");
      const history: SimulationResult[] = await res.json();
      const match = history.find((s) => s.id === simulationId);
      if (!match) throw new Error("Simulation not found");
      return match;
    },
    enabled: !!simulationId,
    retry: false,
  });

  const { data: audiences = [] } = useAudiences();
  const { data: allHcps = [] } = useAllHcps();
  const { data: nboData, isLoading } = useNBOPriorityQueue(100);

  const recommendations = nboData?.recommendations || [];
  const { actNow, thisWeek, backlog } = useMemo(
    () => bucketRecommendations(recommendations),
    [recommendations]
  );

  // Derive counts from decisions map
  const actionCounts = useMemo(() => {
    let approved = 0, deferred = 0, rejected = 0;
    for (const d of Array.from(decisions.values())) {
      if (d === "approve") approved++;
      else if (d === "defer") deferred++;
      else if (d === "reject") rejected++;
    }
    return { approved, deferred, rejected };
  }, [decisions]);

  // Flat list for keyboard navigation (unreviewd only)
  const allItems = useMemo(
    () => [...actNow, ...thisWeek, ...backlog].filter((r) => !decisions.has(r.hcpId)),
    [actNow, thisWeek, backlog, decisions]
  );

  const reviewedCount = decisions.size;
  const totalActNow = actNow.length;
  const isQueueClear = reviewedCount >= totalActNow && totalActNow > 0;

  // Trigger celebration when Act Now queue is fully reviewed
  useEffect(() => {
    if (isQueueClear) setShowCelebration(true);
  }, [isQueueClear]);

  // Action handlers
  const handleAction = useCallback((id: string, action: DecisionType) => {
    setDecisions((prev) => {
      const next = new Map(prev);
      next.set(id, action);
      return next;
    });
  }, []);

  const handleUndo = useCallback((id: string) => {
    setDecisions((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const handleHcpDrawerAction = useCallback((action: HCPDrawerAction, hcpId: string) => {
    setSelectedHcpId(null);
    switch (action) {
      case "view": navigate(`/?hcp=${hcpId}`); break;
      case "ecosystem": navigate(`/ecosystem-map?hcp=${hcpId}`); break;
      case "audience": navigate(`/audience-builder?addHcp=${hcpId}`); break;
    }
  }, [navigate]);

  // Keyboard navigation
  useEffect(() => {
    if (showDailyBrief) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const currentItem = allItems[selectedIndex];
      if (!currentItem) return;

      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((i) => Math.max(0, i - 1));
          break;
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((i) => Math.min(allItems.length - 1, i + 1));
          break;
        case "a":
        case "A":
          e.preventDefault();
          handleAction(currentItem.hcpId, "approve");
          break;
        case "d":
        case "D":
          e.preventDefault();
          handleAction(currentItem.hcpId, "defer");
          break;
        case "r":
        case "R":
          e.preventDefault();
          handleAction(currentItem.hcpId, "reject");
          break;
        case "z":
        case "Z":
          // Undo last decision
          e.preventDefault();
          const lastKey = Array.from(decisions.keys()).pop();
          if (lastKey) handleUndo(lastKey);
          break;
        case "Enter":
          e.preventDefault();
          setSelectedHcpId(currentItem.hcpId);
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [allItems, selectedIndex, handleAction, handleUndo, decisions, showDailyBrief]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground text-sm">Loading action queue...</div>
      </div>
    );
  }

  // Daily Brief view
  if (showDailyBrief) {
    return (
      <DailyBrief
        recommendations={actNow}
        onExit={() => setShowDailyBrief(false)}
        onOpenProfile={(hcpId) => setSelectedHcpId(hcpId)}
      />
    );
  }

  // Helper to render a bucket's items (unreviewed first, reviewed in collapsible)
  const renderBucketItems = (
    items: NBORecommendation[],
    indexOffset: number,
    useCards: boolean
  ) => {
    const unreviewed = items.filter((r) => !decisions.has(r.hcpId));
    const CardOrRow = useCards ? ActionCard : CompactRow;

    return (
      <>
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="enter"
          className={useCards ? "space-y-3" : "space-y-0.5"}
        >
          {unreviewed.map((rec, i) => {
            const globalIdx = allItems.findIndex((a) => a.hcpId === rec.hcpId);
            return (
              <CardOrRow
                key={rec.hcpId}
                recommendation={rec}
                isSelected={globalIdx === selectedIndex}
                decision={decisions.get(rec.hcpId)}
                onSelect={() => setSelectedIndex(globalIdx >= 0 ? globalIdx : 0)}
                onApprove={() => handleAction(rec.hcpId, "approve")}
                onDefer={() => handleAction(rec.hcpId, "defer")}
                onReject={() => handleAction(rec.hcpId, "reject")}
                onUndo={() => handleUndo(rec.hcpId)}
                onOpenProfile={() => setSelectedHcpId(rec.hcpId)}
              />
            );
          })}
        </motion.div>
        <ReviewedSection
          items={items}
          decisions={decisions}
          onUndo={handleUndo}
          onOpenProfile={(id) => setSelectedHcpId(id)}
        />
      </>
    );
  };

  return (
    <div className="h-full overflow-auto pb-12">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b bg-background px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold" data-testid="text-page-title">
              Action Queue
            </h1>
            <p className="text-sm text-muted-foreground">
              {actNow.filter((r) => !decisions.has(r.hcpId)).length} critical
              {" "}&middot; {thisWeek.filter((r) => !decisions.has(r.hcpId)).length} this week
              {" "}&middot; {backlog.filter((r) => !decisions.has(r.hcpId)).length} backlog
              {reviewedCount > 0 && (
                <span className="ml-2 text-green-600 dark:text-green-400">
                  ({reviewedCount} reviewed)
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {actNow.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDailyBrief(true)}
              >
                <Target className="h-3.5 w-3.5 mr-1.5" />
                Daily Brief
              </Button>
            )}
            <Select value={selectedAudienceId} onValueChange={setSelectedAudienceId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All HCPs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All HCPs</SelectItem>
                {audiences.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3">
          <ProgressCounter
            reviewed={reviewedCount}
            total={totalActNow}
            approved={actionCounts.approved}
            deferred={actionCounts.deferred}
            rejected={actionCounts.rejected}
          />
        </div>
      </div>

      {/* Simulation Context Banner */}
      {simulationContext && (
        <div className="mx-6 mt-4 rounded-lg border border-purple-500/20 bg-purple-500/5 p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <div className="rounded-full bg-purple-500/15 p-2 shrink-0">
                <FlaskConical className="h-4 w-4 text-purple-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Actions from Simulation
                </p>
                <p className="text-sm font-semibold mt-0.5 truncate">
                  {simulationContext.scenarioName}
                </p>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    {simulationContext.predictedRxLift > 0 ? "+" : ""}
                    {simulationContext.predictedRxLift.toFixed(1)}% Rx Lift
                  </span>
                  <span>{simulationContext.predictedReach.toLocaleString()} HCPs reached</span>
                  <span>Efficiency: {simulationContext.efficiencyScore}/100</span>
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 text-xs"
              onClick={() => navigate("/simulations")}
            >
              <ArrowLeft className="h-3 w-3 mr-1" />
              Back to Simulation
            </Button>
          </div>
        </div>
      )}

      {/* Celebration overlay when Act Now queue is cleared */}
      {showCelebration && (
        <div className="mx-6 mt-4 flex justify-center">
          <CelebrationOverlay
            tier={reviewedCount >= 10 ? "triumph" : "accomplish"}
            message={`${reviewedCount} actions processed`}
            count={reviewedCount}
            onComplete={() => {/* keep visible */}}
          />
        </div>
      )}

      {/* Content */}
      <div className="px-6 py-4">
        {/* Act Now — Cards with breathing room */}
        {actNow.length > 0 && (
          <BucketSection
            title="Act Now"
            count={actNow.filter((r) => !decisions.has(r.hcpId)).length}
            variant="critical"
          >
            {renderBucketItems(actNow, 0, true)}
          </BucketSection>
        )}

        {/* This Week — Compact rows */}
        {thisWeek.length > 0 && (
          <BucketSection
            title="This Week"
            count={thisWeek.filter((r) => !decisions.has(r.hcpId)).length}
            variant="default"
            defaultOpen={actNow.length === 0}
          >
            {renderBucketItems(thisWeek, actNow.length, false)}
          </BucketSection>
        )}

        {/* Backlog — Collapsed by default */}
        {backlog.length > 0 && (
          <BucketSection
            title="Backlog"
            count={backlog.filter((r) => !decisions.has(r.hcpId)).length}
            variant="muted"
            defaultOpen={false}
          >
            {renderBucketItems(backlog.slice(0, 25), actNow.length + thisWeek.length, false)}
            {backlog.length > 25 && (
              <p className="text-xs text-muted-foreground text-center py-2">
                +{backlog.length - 25} more in backlog
              </p>
            )}
          </BucketSection>
        )}
      </div>

      {/* Keyboard hint bar */}
      <KeyboardHintBar hints={[...ACTION_QUEUE_HINTS, { key: "Z", label: "Undo" }]} />

      {/* HCP Profile Drawer */}
      <HCPProfileDrawer
        hcpId={selectedHcpId}
        isOpen={!!selectedHcpId}
        onClose={() => setSelectedHcpId(null)}
        onAction={handleHcpDrawerAction}
      />
    </div>
  );
}
