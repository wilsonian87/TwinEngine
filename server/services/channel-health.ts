import type { HCPProfile, Channel, ChannelEngagement } from "@shared/schema";

/**
 * Channel Health Classification Service
 *
 * Classifies the health status of each engagement channel for HCPs
 * to identify opportunities, issues, and recommended actions.
 */

// Health status types
export const healthStatuses = [
  "active",       // Recent engagement, positive response rate
  "declining",    // Engagement trending down, or stale (no touch in 60+ days)
  "dark",         // Low historical engagement, underutilized channel
  "blocked",      // High touch frequency + low response (being ignored)
  "opportunity",  // High affinity score but underutilized (gap)
] as const;

export type HealthStatus = (typeof healthStatuses)[number];

// Health status display configuration
export const healthStatusConfig: Record<HealthStatus, {
  label: string;
  description: string;
  color: string;
  emoji: string;
}> = {
  active: {
    label: "Active",
    description: "Recent engagement with positive response rate",
    color: "green",
    emoji: "🟢",
  },
  declining: {
    label: "Declining",
    description: "Engagement trending down or stale (60+ days)",
    color: "yellow",
    emoji: "🟡",
  },
  dark: {
    label: "Dark",
    description: "Low historical engagement, underutilized",
    color: "gray",
    emoji: "⚫",
  },
  blocked: {
    label: "Blocked",
    description: "High touch frequency but low response",
    color: "red",
    emoji: "🔴",
  },
  opportunity: {
    label: "Opportunity",
    description: "High affinity but underutilized",
    color: "purple",
    emoji: "✨",
  },
};

// Classification result for a single channel
export interface ChannelHealth {
  channel: Channel;
  status: HealthStatus;
  score: number;
  lastContactDays: number | null;
  totalTouches: number;
  responseRate: number;
  reasoning: string;
}

// Aggregate health distribution for a cohort
export interface CohortChannelHealth {
  channel: Channel;
  distribution: Record<HealthStatus, number>;
  totalHcps: number;
  primaryIssue: HealthStatus | null;
  recommendation: string;
}

// Configurable thresholds for classification
export interface HealthThresholds {
  staleThresholdDays: number;      // Days without contact to be considered stale
  blockedResponseRate: number;      // Response rate below this + high touches = blocked
  blockedMinTouches: number;        // Min touches to consider blocked
  opportunityMinScore: number;      // Min score for opportunity
  opportunityMaxTouches: number;    // Max touches for opportunity (underutilized)
  activeMinResponseRate: number;    // Min response rate for active
  activeMaxDaysSinceContact: number; // Max days since contact for active
}

// Default thresholds (can be overridden)
export const defaultThresholds: HealthThresholds = {
  staleThresholdDays: 60,
  blockedResponseRate: 10,
  blockedMinTouches: 5,
  opportunityMinScore: 70,
  opportunityMaxTouches: 3,
  activeMinResponseRate: 30,
  activeMaxDaysSinceContact: 30,
};

/**
 * Calculate days since last contact
 */
function daysSinceContact(lastContact: string | null): number | null {
  if (!lastContact) return null;

  const lastDate = new Date(lastContact);
  const now = new Date();
  const diffMs = now.getTime() - lastDate.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Classify a single channel's health status
 */
function classifySingleChannel(
  engagement: ChannelEngagement,
  thresholds: HealthThresholds = defaultThresholds
): ChannelHealth {
  const lastContactDays = daysSinceContact(engagement.lastContact);
  const { score, totalTouches, responseRate, channel } = engagement;

  let status: HealthStatus;
  let reasoning: string;

  // Check for blocked status first (high priority issue)
  if (
    responseRate < thresholds.blockedResponseRate &&
    totalTouches >= thresholds.blockedMinTouches
  ) {
    status = "blocked";
    reasoning = `Low response rate (${responseRate}%) despite ${totalTouches} touches. HCP may be ignoring this channel.`;
  }
  // Check for opportunity (high score but underutilized)
  else if (
    score >= thresholds.opportunityMinScore &&
    totalTouches < thresholds.opportunityMaxTouches
  ) {
    status = "opportunity";
    reasoning = `High affinity score (${score}) but only ${totalTouches} touches. Potential for increased engagement.`;
  }
  // Check for active (good recent engagement)
  else if (
    responseRate >= thresholds.activeMinResponseRate &&
    lastContactDays !== null &&
    lastContactDays <= thresholds.activeMaxDaysSinceContact
  ) {
    status = "active";
    reasoning = `Healthy engagement with ${responseRate}% response rate. Last contact ${lastContactDays} days ago.`;
  }
  // Check for declining/stale
  else if (
    lastContactDays !== null &&
    lastContactDays > thresholds.staleThresholdDays
  ) {
    status = "declining";
    reasoning = `No contact in ${lastContactDays} days. Channel may be going dormant.`;
  }
  // Check for declining (low response but some engagement)
  else if (responseRate < thresholds.activeMinResponseRate && totalTouches > 0) {
    status = "declining";
    reasoning = `Response rate dropped to ${responseRate}%. Engagement trending down.`;
  }
  // Default to dark (minimal/no engagement)
  else {
    status = "dark";
    reasoning = totalTouches === 0
      ? "No historical engagement on this channel."
      : `Minimal engagement: ${totalTouches} touches with ${responseRate}% response.`;
  }

  return {
    channel,
    status,
    score,
    lastContactDays,
    totalTouches,
    responseRate,
    reasoning,
  };
}

/**
 * Classify channel health for a single HCP
 * Returns health status for each of their 6 channels
 */
export function classifyChannelHealth(
  hcp: HCPProfile,
  thresholds: HealthThresholds = defaultThresholds
): ChannelHealth[] {
  return hcp.channelEngagements.map((engagement) =>
    classifySingleChannel(engagement, thresholds)
  );
}

/**
 * Classify channel health for a cohort of HCPs
 * Returns aggregate distribution of health statuses per channel
 */
export function classifyCohortChannelHealth(
  hcps: HCPProfile[],
  thresholds: HealthThresholds = defaultThresholds
): CohortChannelHealth[] {
  if (hcps.length === 0) {
    return [];
  }

  // Collect all channel health classifications
  const allChannelHealth: ChannelHealth[] = hcps.flatMap((hcp) =>
    classifyChannelHealth(hcp, thresholds)
  );

  // Group by channel
  const channelGroups = new Map<Channel, ChannelHealth[]>();
  for (const health of allChannelHealth) {
    const group = channelGroups.get(health.channel) || [];
    group.push(health);
    channelGroups.set(health.channel, group);
  }

  // Calculate distribution for each channel
  const results: CohortChannelHealth[] = [];
  const channelEntries = Array.from(channelGroups.entries());

  for (const [channel, healthList] of channelEntries) {
    // Initialize distribution counts
    const distribution: Record<HealthStatus, number> = {
      active: 0,
      declining: 0,
      dark: 0,
      blocked: 0,
      opportunity: 0,
    };

    // Count each status
    for (const health of healthList) {
      const status = health.status as HealthStatus;
      distribution[status]++;
    }

    // Convert to percentages
    const totalHcps = healthList.length;
    const distributionPct: Record<HealthStatus, number> = {
      active: Math.round((distribution.active / totalHcps) * 100),
      declining: Math.round((distribution.declining / totalHcps) * 100),
      dark: Math.round((distribution.dark / totalHcps) * 100),
      blocked: Math.round((distribution.blocked / totalHcps) * 100),
      opportunity: Math.round((distribution.opportunity / totalHcps) * 100),
    };

    // Determine primary issue (most common non-active status)
    const issueStatuses: HealthStatus[] = ["blocked", "declining", "dark"];
    let primaryIssue: HealthStatus | null = null;
    let maxIssueCount = 0;

    for (const status of issueStatuses) {
      if (distribution[status] > maxIssueCount) {
        maxIssueCount = distribution[status];
        primaryIssue = status;
      }
    }

    // Generate recommendation based on primary issue
    let recommendation: string;
    if (distributionPct.opportunity > 30) {
      recommendation = `${distributionPct.opportunity}% of cohort shows opportunity for increased ${channel.replace("_", " ")} engagement.`;
    } else if (primaryIssue === "blocked") {
      recommendation = `${distributionPct.blocked}% blocked - consider reducing frequency or changing messaging approach.`;
    } else if (primaryIssue === "declining") {
      recommendation = `${distributionPct.declining}% declining - re-engagement campaign recommended.`;
    } else if (primaryIssue === "dark") {
      recommendation = `${distributionPct.dark}% dark - channel may be underutilized for this segment.`;
    } else if (distributionPct.active > 50) {
      recommendation = `Channel healthy with ${distributionPct.active}% active engagement.`;
    } else {
      recommendation = "Mixed health - review individual HCP needs.";
    }

    results.push({
      channel,
      distribution: distributionPct,
      totalHcps,
      primaryIssue: maxIssueCount > 0 ? primaryIssue : null,
      recommendation,
    });
  }

  return results;
}

/**
 * Get a summary of channel health for an HCP
 * Returns the overall health assessment
 */
export function getHealthSummary(channelHealth: ChannelHealth[]): {
  healthyChannels: number;
  issueChannels: number;
  opportunityChannels: number;
  primaryRecommendation: string;
} {
  const healthyChannels = channelHealth.filter((h) => h.status === "active").length;
  const issueChannels = channelHealth.filter((h) =>
    ["blocked", "declining"].includes(h.status)
  ).length;
  const opportunityChannels = channelHealth.filter((h) => h.status === "opportunity").length;

  let primaryRecommendation: string;

  if (opportunityChannels > 0) {
    const opportunities = channelHealth.filter((h) => h.status === "opportunity");
    primaryRecommendation = `Expand engagement on ${opportunities.map((o) => o.channel.replace("_", " ")).join(", ")}.`;
  } else if (issueChannels > healthyChannels) {
    primaryRecommendation = "Multiple channels need attention. Consider re-engagement strategy.";
  } else if (healthyChannels >= 4) {
    primaryRecommendation = "Strong multi-channel engagement. Maintain current strategy.";
  } else {
    primaryRecommendation = "Focus on strengthening top-performing channels.";
  }

  return {
    healthyChannels,
    issueChannels,
    opportunityChannels,
    primaryRecommendation,
  };
}
