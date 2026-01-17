/**
 * HCP Profile Card - OmniVor Signal Index
 *
 * Premium card design with:
 * - Specialty icon and color coding
 * - Channel engagement mini-bars
 * - Hover glow and lift effects
 * - Selection state styling
 */

import React from "react";
import { Mail, Phone, Video, Globe, Calendar, Users, Heart, Brain, Bone, Pill, Stethoscope, Activity, Eye, Syringe, Microscope, Sparkles, ArrowRight } from "lucide-react";
import { SignalCard, SignalCardContent, SignalCardHeader } from "@/components/ui/signal-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { HCPProfile, Channel, Specialty } from "@shared/schema";

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
  rep_visit: "Rep",
  webinar: "Webinar",
  conference: "Events",
  digital_ad: "Digital",
  phone: "Phone",
};

// Tier styling with brand colors
const tierStyles: Record<string, { bg: string; text: string }> = {
  "Tier 1": {
    bg: "bg-purple-500/20",
    text: "text-purple-400",
  },
  "Tier 2": {
    bg: "bg-blue-500/20",
    text: "text-blue-400",
  },
  "Tier 3": {
    bg: "bg-slate-500/20",
    text: "text-slate-400",
  },
};

// Specialty icons and colors
const specialtyConfig: Record<Specialty, { icon: typeof Heart; color: string; bgColor: string }> = {
  "Oncology": { icon: Activity, color: "text-rose-400", bgColor: "bg-rose-500/15" },
  "Cardiology": { icon: Heart, color: "text-red-400", bgColor: "bg-red-500/15" },
  "Neurology": { icon: Brain, color: "text-purple-400", bgColor: "bg-purple-500/15" },
  "Endocrinology": { icon: Pill, color: "text-amber-400", bgColor: "bg-amber-500/15" },
  "Rheumatology": { icon: Bone, color: "text-orange-400", bgColor: "bg-orange-500/15" },
  "Pulmonology": { icon: Stethoscope, color: "text-sky-400", bgColor: "bg-sky-500/15" },
  "Gastroenterology": { icon: Microscope, color: "text-emerald-400", bgColor: "bg-emerald-500/15" },
  "Nephrology": { icon: Syringe, color: "text-blue-400", bgColor: "bg-blue-500/15" },
  "Dermatology": { icon: Sparkles, color: "text-pink-400", bgColor: "bg-pink-500/15" },
  "Psychiatry": { icon: Eye, color: "text-indigo-400", bgColor: "bg-indigo-500/15" },
};

// ============================================================================
// COMPONENT
// ============================================================================

interface HCPProfileCardProps {
  hcp: HCPProfile;
  onSelect?: (hcp: HCPProfile) => void;
  isSelected?: boolean;
  isMultiSelected?: boolean;
  onMultiSelectClick?: (hcp: HCPProfile, event: React.MouseEvent) => void;
  compact?: boolean;
  /** Whether this card is focused via keyboard navigation */
  isKeyboardFocused?: boolean;
}

export function HCPProfileCard({
  hcp,
  onSelect,
  isSelected = false,
  isMultiSelected = false,
  onMultiSelectClick,
  compact = false,
  isKeyboardFocused = false,
}: HCPProfileCardProps) {
  const cardRef = React.useRef<HTMLDivElement>(null);

  // Scroll into view when keyboard focused
  React.useEffect(() => {
    if (isKeyboardFocused && cardRef.current) {
      cardRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [isKeyboardFocused]);
  const PreferredIcon = channelIcons[hcp.channelPreference];
  const specialtyStyle = specialtyConfig[hcp.specialty as Specialty] || specialtyConfig["Oncology"];
  const SpecialtyIcon = specialtyStyle.icon;
  const tierStyle = tierStyles[hcp.tier] || tierStyles["Tier 3"];

  const getEngagementColor = (score: number) => {
    if (score >= 70) return "text-emerald-400";
    if (score >= 40) return "text-amber-400";
    return "text-slate-400";
  };

  const handleClick = (e: React.MouseEvent) => {
    if (onMultiSelectClick && (e.shiftKey || e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      onMultiSelectClick(hcp, e);
    } else {
      onSelect?.(hcp);
    }
  };

  // Compact view
  if (compact) {
    return (
      <div ref={cardRef}>
        <SignalCard
          variant="default"
          glowOnHover
          liftOnHover
          clickable
          selected={isMultiSelected || isSelected}
          className={cn(
            "p-4",
            isKeyboardFocused && "ring-2 ring-consumption-purple ring-offset-2 ring-offset-void-black shadow-[0_0_12px_rgba(107,33,168,0.3)]"
          )}
          onClick={handleClick}
          data-testid={`card-hcp-${hcp.npi}`}
        >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-sm font-medium text-foreground" data-testid={`text-hcp-name-${hcp.npi}`}>
                {hcp.firstName} {hcp.lastName}
              </h3>
              <Badge
                variant="secondary"
                className={cn("shrink-0 text-xs border-0", tierStyle.bg, tierStyle.text)}
              >
                {hcp.tier}
              </Badge>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {hcp.specialty} • NPI: {hcp.npi}
            </p>
          </div>
          <div className="text-right">
            <span className={cn("font-mono text-lg font-semibold", getEngagementColor(hcp.overallEngagementScore))}>
              {hcp.overallEngagementScore}
            </span>
            <p className="text-xs text-muted-foreground">Signal</p>
          </div>
        </div>
        </SignalCard>
      </div>
    );
  }

  // Full card view
  return (
    <div ref={cardRef}>
      <SignalCard
        variant="default"
        glowOnHover
        liftOnHover
        clickable
        selected={isMultiSelected || isSelected}
        className={cn(
          "overflow-hidden",
          isKeyboardFocused && "ring-2 ring-consumption-purple ring-offset-2 ring-offset-void-black shadow-[0_0_12px_rgba(107,33,168,0.3)]"
        )}
        onClick={handleClick}
        data-testid={`card-hcp-${hcp.npi}`}
      >
      {/* Specialty accent corner */}
      <div className={cn("absolute top-0 right-0 p-2.5 rounded-bl-2xl", specialtyStyle.bgColor)}>
        <Tooltip>
          <TooltipTrigger asChild>
            <SpecialtyIcon className={cn("h-5 w-5", specialtyStyle.color)} />
          </TooltipTrigger>
          <TooltipContent>
            <p>{hcp.specialty}</p>
          </TooltipContent>
        </Tooltip>
      </div>

      <SignalCardHeader>
        <div className="flex items-start justify-between gap-3 pr-12">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-foreground" data-testid={`text-hcp-name-${hcp.npi}`}>
                Dr. {hcp.firstName} {hcp.lastName}
              </h3>
              <Badge
                variant="secondary"
                className={cn("text-xs border-0", tierStyle.bg, tierStyle.text)}
              >
                {hcp.tier}
              </Badge>
            </div>
            <p className={cn("mt-1 text-sm font-medium", specialtyStyle.color)}>
              {hcp.specialty}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {hcp.organization} • {hcp.city}, {hcp.state}
            </p>
          </div>
        </div>
      </SignalCardHeader>

      <SignalCardContent>
        {/* Metrics row */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center">
            <span
              className={cn("block font-mono text-xl font-bold", getEngagementColor(hcp.overallEngagementScore))}
              data-testid={`text-engagement-${hcp.npi}`}
            >
              {hcp.overallEngagementScore}
            </span>
            <span className="text-xs text-muted-foreground">Signal</span>
          </div>
          <div className="text-center">
            <span
              className="block font-mono text-xl font-bold text-foreground"
              data-testid={`text-rxvolume-${hcp.npi}`}
            >
              {hcp.monthlyRxVolume}
            </span>
            <span className="text-xs text-muted-foreground">Rx/mo</span>
          </div>
          <div className="text-center">
            <span
              className="block font-mono text-xl font-bold text-foreground"
              data-testid={`text-marketshare-${hcp.npi}`}
            >
              {hcp.marketSharePct}%
            </span>
            <span className="text-xs text-muted-foreground">Share</span>
          </div>
        </div>

        {/* Channel engagement bars */}
        <div className="mb-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Channel Signals</span>
            <div className="flex items-center gap-1.5">
              <PreferredIcon
                className="h-3.5 w-3.5"
                style={{ color: "var(--catalyst-gold, #d97706)" }}
              />
              <span className="text-xs font-medium">{channelLabels[hcp.channelPreference]}</span>
            </div>
          </div>
          <div className="grid grid-cols-6 gap-1">
            {hcp.channelEngagements.map((engagement) => {
              const Icon = channelIcons[engagement.channel];
              const isPreferred = engagement.channel === hcp.channelPreference;
              const barHeight = Math.max(8, Math.min(32, (engagement.score / 100) * 32));

              return (
                <Tooltip key={engagement.channel}>
                  <TooltipTrigger asChild>
                    <div className="flex flex-col items-center gap-1">
                      <div
                        className="w-full rounded-sm transition-all duration-200"
                        style={{
                          height: `${barHeight}px`,
                          backgroundColor: isPreferred
                            ? "var(--catalyst-gold, #d97706)"
                            : engagement.score >= 60
                            ? "var(--process-violet, #a855f7)"
                            : "var(--muted-gray, #52525b)",
                          opacity: engagement.score > 0 ? 1 : 0.3,
                        }}
                      />
                      <Icon
                        className={cn(
                          "h-3 w-3",
                          isPreferred ? "text-amber-400" : "text-muted-foreground"
                        )}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-medium">{channelLabels[engagement.channel]}</p>
                    <p className="text-xs text-muted-foreground">
                      Score: {engagement.score} • Response: {engagement.responseRate}%
                    </p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </div>

        {/* Conversion likelihood */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-muted-foreground">Conversion Potential</span>
            <span
              className="font-mono font-medium"
              style={{ color: "var(--catalyst-gold, #d97706)" }}
            >
              {hcp.conversionLikelihood}%
            </span>
          </div>
          <Progress
            value={hcp.conversionLikelihood}
            className="h-1.5"
            style={{
              // @ts-ignore - CSS custom property
              "--progress-indicator": "var(--catalyst-gold, #d97706)",
            }}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-border/50">
          <Badge
            variant="outline"
            className="text-xs"
            data-testid={`badge-segment-${hcp.npi}`}
          >
            {hcp.segment}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-7 px-2 hover:text-purple-400"
            onClick={(e) => {
              e.stopPropagation();
              onSelect?.(hcp);
            }}
            data-testid={`button-view-profile-${hcp.npi}`}
          >
            View Profile
            <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </div>
      </SignalCardContent>
      </SignalCard>
    </div>
  );
}
