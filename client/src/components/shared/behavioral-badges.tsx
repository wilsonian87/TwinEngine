/**
 * Behavioral Badges — Visual differentiators for HCP cards.
 *
 * Used across: Explorer, Audience Builder preview, Action Queue cards.
 * Derived from engagement trend, CPI, adoption stage, and territory status.
 */

import { cn } from "@/lib/utils";

export type BadgeType = "rising" | "at-risk" | "high-converter" | "new-to-territory" | "dormant" | "defend";

interface BehavioralBadgeProps {
  type: BadgeType;
  compact?: boolean;
  className?: string;
}

const badgeConfig: Record<BadgeType, { icon: string; label: string; colors: string }> = {
  rising: {
    icon: "\u{1F525}",
    label: "Rising Engagement",
    colors: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
  "at-risk": {
    icon: "\u26A0\uFE0F",
    label: "At Risk",
    colors: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
  "high-converter": {
    icon: "\u{1F3AF}",
    label: "High Converter",
    colors: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
  },
  "new-to-territory": {
    icon: "\u{1F195}",
    label: "New to Territory",
    colors: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  },
  dormant: {
    icon: "\u{1F4A4}",
    label: "Dormant",
    colors: "bg-gray-500/10 text-gray-500 dark:text-gray-400 border-gray-500/20",
  },
  defend: {
    icon: "\u{1F6E1}\uFE0F",
    label: "Defend",
    colors: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  },
};

export function BehavioralBadge({ type, compact = false, className }: BehavioralBadgeProps) {
  const config = badgeConfig[type];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-medium",
        compact ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs",
        config.colors,
        className
      )}
    >
      <span className={compact ? "text-[10px]" : "text-xs"}>{config.icon}</span>
      {!compact && <span>{config.label}</span>}
    </span>
  );
}

/**
 * Derive badges from HCP data.
 * Returns applicable badges sorted by priority.
 */
export function deriveBadges(hcp: {
  overallEngagementScore?: number;
  engagementTrend?: string;
  competitivePressureIndex?: number;
  segment?: string;
  daysSinceLastTouch?: number;
}): BadgeType[] {
  const badges: BadgeType[] = [];

  // Rising engagement
  if (hcp.engagementTrend === "improving" || (hcp.overallEngagementScore && hcp.overallEngagementScore > 70)) {
    badges.push("rising");
  }

  // At risk
  if (hcp.engagementTrend === "declining" || (hcp.overallEngagementScore && hcp.overallEngagementScore < 30)) {
    badges.push("at-risk");
  }

  // High converter
  if (hcp.segment === "High Prescriber") {
    badges.push("high-converter");
  }

  // Defend (high competitive pressure)
  if (hcp.competitivePressureIndex && hcp.competitivePressureIndex > 70) {
    badges.push("defend");
  }

  // Dormant
  if (hcp.daysSinceLastTouch && hcp.daysSinceLastTouch > 60) {
    badges.push("dormant");
  }

  return badges;
}

/**
 * Render a row of badges for an HCP.
 */
export function BehavioralBadgeRow({
  badges,
  maxVisible = 3,
  compact = false,
}: {
  badges: BadgeType[];
  maxVisible?: number;
  compact?: boolean;
}) {
  const visible = badges.slice(0, maxVisible);
  const overflow = badges.length - maxVisible;

  return (
    <div className="flex flex-wrap gap-1">
      {visible.map((badge) => (
        <BehavioralBadge key={badge} type={badge} compact={compact} />
      ))}
      {overflow > 0 && (
        <span className="text-xs text-muted-foreground">+{overflow}</span>
      )}
    </div>
  );
}
