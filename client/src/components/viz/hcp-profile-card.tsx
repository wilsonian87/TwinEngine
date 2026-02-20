/**
 * HCP Dossier Card — FIFA-inspired profile card.
 *
 * Composite score + radar shape + status strip encodes 5+ dimensions in card-sized space.
 * Used in cohort grids, comparison views, and HCP exploration panels.
 *
 * @see OMNIVOR-VIZ-ROADMAP.md
 */

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";
import { Mail, User, Users, Monitor, Mic } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatedNumber } from "@/components/shared/animated-number";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HCPRadarAxes {
  engagement: number;
  recency: number;
  channelDiversity: number;
  contentAffinity: number;
  peerInfluence: number;
  adoptionProgress: number;
}

export type HCPTier = "platinum" | "gold" | "silver" | "bronze";
export type AdoptionStage = "early" | "growing" | "mature" | "advocate";
export type RiskLevel = "low" | "medium" | "high";
export type ChannelPreference = string;

export interface HCPDossier {
  name: string;
  specialty: string;
  engagementScore: number;
  tier: HCPTier;
  adoptionStage: AdoptionStage;
  riskLevel: RiskLevel;
  channelPreference: ChannelPreference;
  radarAxes: HCPRadarAxes;
}

export interface HCPProfileCardProps {
  hcp: HCPDossier;
  onClick?: () => void;
  className?: string;
}

// ---------------------------------------------------------------------------
// Constants & Maps
// ---------------------------------------------------------------------------

const ADOPTION_COLORS: Record<AdoptionStage, string> = {
  early: "#C4B5FD",
  growing: "#8B5CF6",
  mature: "#7C3AED",
  advocate: "#5B21B6",
};

const TIER_STYLES: Record<HCPTier, { color: string; label: string }> = {
  platinum: { color: "#FFFFFF", label: "Platinum" },
  gold: { color: "#F59E0B", label: "Gold" },
  silver: { color: "#94A3B8", label: "Silver" },
  bronze: { color: "#D97706", label: "Bronze" },
};

const RISK_DOT_COLORS: Record<RiskLevel, string> = {
  low: "#10B981",
  medium: "#F59E0B",
  high: "#EF4444",
};

const CHANNEL_META: Record<string, { label: string; Icon: typeof Mail }> = {
  email: { label: "Email", Icon: Mail },
  rep: { label: "Rep", Icon: User },
  rep_visit: { label: "Rep", Icon: User },
  peer: { label: "Peer", Icon: Users },
  congress: { label: "Congress", Icon: Mic },
  conference: { label: "Congress", Icon: Mic },
  digital: { label: "Digital", Icon: Monitor },
  digital_ad: { label: "Digital", Icon: Monitor },
  webinar: { label: "Digital", Icon: Monitor },
  phone: { label: "Rep", Icon: User },
};

const DEFAULT_CHANNEL = { label: "Digital", Icon: Monitor };

const ADOPTION_LABELS: Record<AdoptionStage, string> = {
  early: "Early",
  growing: "Growing",
  mature: "Mature",
  advocate: "Advocate",
};

const RADAR_AXIS_LABELS: Record<keyof HCPRadarAxes, string> = {
  engagement: "Engagement",
  recency: "Recency",
  channelDiversity: "Channel Div.",
  contentAffinity: "Content Aff.",
  peerInfluence: "Peer Infl.",
  adoptionProgress: "Adoption",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildRadarData(axes: HCPRadarAxes) {
  return (Object.keys(RADAR_AXIS_LABELS) as (keyof HCPRadarAxes)[]).map(
    (key) => ({
      axis: RADAR_AXIS_LABELS[key],
      value: axes[key],
      fullMark: 1,
    }),
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Pulsing red dot for high-risk HCPs */
function RiskDot({ level }: { level: RiskLevel }) {
  const color = RISK_DOT_COLORS[level];

  if (level === "high") {
    return (
      <span className="relative flex h-2.5 w-2.5">
        <span
          className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
          style={{ backgroundColor: color }}
        />
        <span
          className="relative inline-flex h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }}
        />
      </span>
    );
  }

  return (
    <span
      className="inline-flex h-2 w-2 rounded-full"
      style={{ backgroundColor: color }}
    />
  );
}

/** Tier badge with optional shimmer for platinum */
function TierBadge({ tier }: { tier: HCPTier }) {
  const { color, label } = TIER_STYLES[tier];
  const isShimmer = tier === "platinum";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
        isShimmer &&
          "bg-gradient-to-r from-white/20 via-white/40 to-white/20 bg-[length:200%_100%] animate-[shimmer_3s_infinite]",
      )}
      style={{
        color,
        border: `1px solid ${color}33`,
        backgroundColor: isShimmer ? undefined : `${color}15`,
      }}
    >
      {label}
    </span>
  );
}

/** Status chip used in the bottom strip */
function StatusChip({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] bg-zinc-600 text-white dark:bg-zinc-700",
        className,
      )}
    >
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function HCPProfileCard({ hcp, onClick, className }: HCPProfileCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const prefersReduced = useReducedMotion();

  const adoptionColor = ADOPTION_COLORS[hcp.adoptionStage];
  const radarData = buildRadarData(hcp.radarAxes);
  const channel = CHANNEL_META[hcp.channelPreference] ?? DEFAULT_CHANNEL;
  const ChannelIcon = channel.Icon;

  return (
    <motion.div
      className={cn(
        "relative w-[280px] cursor-pointer select-none overflow-hidden rounded-xl border bg-card backdrop-blur-sm",
        className,
      )}
      style={{ borderLeftWidth: 4, borderLeftColor: adoptionColor }}
      initial={prefersReduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      whileHover={
        prefersReduced
          ? undefined
          : { y: -4, boxShadow: "0 12px 32px rgba(0,0,0,0.45)" }
      }
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      {/* ---- Top Zone: Identity + Tier ---- */}
      <div className="flex items-start justify-between px-4 pt-4 pb-2">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-foreground">
            {hcp.name}
          </h3>
          <p className="truncate text-xs text-muted-foreground">{hcp.specialty}</p>
        </div>
        <TierBadge tier={hcp.tier} />
      </div>

      {/* ---- Middle Zone: Hero Score + Radar ---- */}
      <div className="flex flex-col items-center px-4 pb-2">
        <span
          className="text-5xl font-bold leading-none"
          style={{ color: "#A855F7", textShadow: "0 0 16px rgba(168,85,247,0.4)" }}
        >
          <AnimatedNumber
            value={hcp.engagementScore}
            variant="hero"
            duration={0.8}
          />
        </span>
        <span className="mt-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">
          Engagement Score
        </span>

        {/* Mini Radar */}
        <div className="mt-2 h-[120px] w-[120px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart
              cx="50%"
              cy="50%"
              outerRadius="80%"
              data={radarData}
            >
              <PolarGrid stroke="currentColor" strokeOpacity={0.12} />
              <PolarAngleAxis
                dataKey="axis"
                tick={
                  isHovered
                    ? { fontSize: 8, fill: "#94A3B8" }
                    : false
                }
              />
              <Radar
                dataKey="value"
                stroke="rgba(124,58,237,0.8)"
                fill="rgba(124,58,237,0.3)"
                fillOpacity={1}
              />
              {isHovered && (
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: "#18181b",
                    border: "1px solid #3f3f46",
                    borderRadius: 8,
                    fontSize: 11,
                    color: "#e2e8f0",
                  }}
                  formatter={(val: number) => [
                    `${(val * 100).toFixed(0)}%`,
                    "",
                  ]}
                />
              )}
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ---- Bottom Zone: Status Strip ---- */}
      <div className="flex flex-wrap items-center gap-1.5 border-t px-4 py-3">
        <StatusChip>
          <ChannelIcon className="h-3 w-3" />
          {channel.label}
        </StatusChip>

        <StatusChip>
          <RiskDot level={hcp.riskLevel} />
          {hcp.riskLevel.charAt(0).toUpperCase() + hcp.riskLevel.slice(1)}
        </StatusChip>

        <StatusChip>{ADOPTION_LABELS[hcp.adoptionStage]}</StatusChip>
      </div>

      {/* Shimmer keyframes for platinum badge (injected once via style tag) */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </motion.div>
  );
}

export default HCPProfileCard;
