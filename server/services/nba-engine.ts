import type { HCPProfile, Channel } from "@shared/schema";
import { classifyChannelHealth, type ChannelHealth, type HealthStatus } from "./channel-health";

/**
 * Next Best Action (NBA) Engine
 *
 * Generates personalized engagement recommendations for HCPs
 * based on their channel health status and engagement patterns.
 */

// Action types
export const actionTypes = [
  "reach_out",        // Initiate contact
  "follow_up",        // Continue conversation
  "re_engage",        // Win back declining engagement
  "expand",           // Leverage opportunity channel
  "maintain",         // Keep healthy relationship
  "reduce_frequency", // Scale back blocked channel
] as const;

export type ActionType = (typeof actionTypes)[number];

// Action type metadata
export const actionTypeConfig: Record<ActionType, {
  label: string;
  description: string;
  priority: number; // 1 = highest
}> = {
  reach_out: {
    label: "Reach Out",
    description: "Initiate contact through preferred channel",
    priority: 3,
  },
  follow_up: {
    label: "Follow Up",
    description: "Continue recent conversation or engagement",
    priority: 2,
  },
  re_engage: {
    label: "Re-engage",
    description: "Win back HCP through strategic outreach",
    priority: 1,
  },
  expand: {
    label: "Expand",
    description: "Leverage high-affinity channel with growth potential",
    priority: 2,
  },
  maintain: {
    label: "Maintain",
    description: "Continue successful engagement pattern",
    priority: 4,
  },
  reduce_frequency: {
    label: "Reduce Frequency",
    description: "Scale back on overused channel",
    priority: 3,
  },
};

// Next Best Action result
export interface NextBestAction {
  hcpId: string;
  hcpName: string;
  recommendedChannel: Channel;
  actionType: ActionType;
  confidence: number; // 0-100
  reasoning: string;
  urgency: "high" | "medium" | "low";
  suggestedTiming: string;
  channelHealth: HealthStatus;
  metrics: {
    channelScore: number;
    responseRate: number;
    lastContactDays: number | null;
  };
}

// NBA generation configuration
export interface NBAConfig {
  prioritizeOpportunities: boolean;
  addressBlocked: boolean;
  reEngageThresholdDays: number;
  minConfidenceThreshold: number;
}

const defaultConfig: NBAConfig = {
  prioritizeOpportunities: true,
  addressBlocked: true,
  reEngageThresholdDays: 60,
  minConfidenceThreshold: 40,
};

/**
 * Generate Next Best Action for a single HCP
 */
export function generateNBA(
  hcp: HCPProfile,
  channelHealth?: ChannelHealth[],
  config: NBAConfig = defaultConfig
): NextBestAction {
  // Get channel health if not provided
  const health = channelHealth || classifyChannelHealth(hcp);

  // Check if the HCP's preferred channel is blocked - handle this special case first
  const preferredChannelHealth = health.find((h) => h.channel === hcp.channelPreference);
  if (config.addressBlocked && preferredChannelHealth?.status === "blocked") {
    // Find an alternative channel that isn't blocked or dark
    const alternative = health.find(
      (c) => c.status !== "blocked" && c.status !== "dark" && c.channel !== hcp.channelPreference
    );
    if (alternative) {
      let confidence = Math.min(70, alternative.score);
      let reasoning = `Preferred channel (${hcp.channelPreference}) is blocked. Shifting to ${alternative.channel} which shows ${alternative.status} status.`;

      // Boost confidence if the alternative happens to be the new preferred channel
      if (alternative.channel === hcp.channelPreference) {
        confidence = Math.min(100, confidence + 10);
        reasoning += ` (Aligned with stated channel preference)`;
      }

      return {
        hcpId: hcp.id,
        hcpName: `${hcp.firstName} ${hcp.lastName}`,
        recommendedChannel: alternative.channel,
        actionType: "reach_out",
        confidence,
        reasoning,
        urgency: "medium",
        suggestedTiming: "Within 2 weeks - test alternative channel receptivity",
        channelHealth: alternative.status,
        metrics: {
          channelScore: alternative.score,
          responseRate: alternative.responseRate,
          lastContactDays: alternative.lastContactDays,
        },
      };
    }
  }

  // Sort channels by priority for action selection
  const sortedChannels = [...health].sort((a, b) => {
    // Opportunity channels first if prioritized
    if (config.prioritizeOpportunities) {
      if (a.status === "opportunity" && b.status !== "opportunity") return -1;
      if (b.status === "opportunity" && a.status !== "opportunity") return 1;
    }

    // Then declining channels (need attention)
    if (a.status === "declining" && b.status !== "declining") return -1;
    if (b.status === "declining" && a.status !== "declining") return 1;

    // Then by score (higher is better)
    return b.score - a.score;
  });

  // Select the best channel for action
  let selectedChannel = sortedChannels[0];
  let actionType: ActionType;
  let confidence: number;
  let reasoning: string;
  let urgency: "high" | "medium" | "low";
  let suggestedTiming: string;

  // Determine action based on channel health status
  switch (selectedChannel.status) {
    case "opportunity":
      actionType = "expand";
      confidence = Math.min(90, selectedChannel.score + 15);
      reasoning = `High affinity (score: ${selectedChannel.score}) with limited engagement (${selectedChannel.totalTouches} touches). Significant growth potential.`;
      urgency = "high";
      suggestedTiming = "Within the next week - capitalize on affinity while engagement is fresh";
      break;

    case "declining":
      actionType = "re_engage";
      confidence = 75;
      reasoning = selectedChannel.lastContactDays !== null && selectedChannel.lastContactDays > config.reEngageThresholdDays
        ? `No contact in ${selectedChannel.lastContactDays} days. Re-engagement is critical to prevent relationship loss.`
        : `Response rate dropped to ${selectedChannel.responseRate}%. Proactive outreach recommended.`;
      urgency = "high";
      suggestedTiming = "ASAP - declining engagement requires immediate attention";
      break;

    case "blocked":
      if (config.addressBlocked) {
        // Try to find an alternative channel
        const alternative = sortedChannels.find(
          (c) => c.status !== "blocked" && c.status !== "dark" && c.channel !== selectedChannel.channel
        );
        if (alternative) {
          selectedChannel = alternative;
          actionType = "reach_out";
          confidence = Math.min(70, alternative.score);
          reasoning = `Primary channel blocked (${sortedChannels[0].channel}). Shifting to ${alternative.channel} which shows ${alternative.status} status.`;
          urgency = "medium";
          suggestedTiming = "Within 2 weeks - test alternative channel receptivity";
        } else {
          actionType = "reduce_frequency";
          confidence = 60;
          reasoning = `All channels showing low engagement. Recommend reducing frequency and refreshing content strategy.`;
          urgency = "low";
          suggestedTiming = "Next quarter - allow cooling period before re-approaching";
        }
      } else {
        actionType = "reduce_frequency";
        confidence = 50;
        reasoning = `Channel shows signs of fatigue (${selectedChannel.responseRate}% response rate). Consider messaging refresh.`;
        urgency = "medium";
        suggestedTiming = "Within 1 month - develop new content before next outreach";
      }
      break;

    case "active":
      actionType = "maintain";
      confidence = Math.min(95, selectedChannel.score + 20);
      reasoning = `Strong engagement (${selectedChannel.responseRate}% response rate). Continue current cadence.`;
      urgency = "low";
      suggestedTiming = "Regular cadence - maintain successful engagement pattern";

      // Check if follow-up is more appropriate
      if (selectedChannel.lastContactDays !== null && selectedChannel.lastContactDays < 14) {
        actionType = "follow_up";
        reasoning = `Recent engagement (${selectedChannel.lastContactDays} days ago) with strong response. Follow up recommended.`;
        suggestedTiming = "Within 3-5 days - capitalize on recent interaction";
      }
      break;

    case "dark":
    default:
      // Find an alternative active or opportunity channel
      const betterChannel = sortedChannels.find(
        (c) => c.status === "active" || c.status === "opportunity"
      );
      if (betterChannel) {
        selectedChannel = betterChannel;
        actionType = betterChannel.status === "opportunity" ? "expand" : "reach_out";
        confidence = Math.min(75, betterChannel.score);
        reasoning = `Using ${betterChannel.channel} (${betterChannel.status}) instead of underutilized channels.`;
        urgency = "medium";
        suggestedTiming = "Within 2 weeks - establish presence on responsive channel";
      } else {
        // All channels are dark - use preferred channel
        const preferredHealth = health.find((h) => h.channel === hcp.channelPreference);
        selectedChannel = preferredHealth || health[0];
        actionType = "reach_out";
        confidence = 45;
        reasoning = `Limited engagement history. Starting with stated preference (${hcp.channelPreference}).`;
        urgency = "low";
        suggestedTiming = "Flexible - test engagement receptivity with low-pressure outreach";
      }
  }

  // Boost confidence for preferred channel
  if (selectedChannel.channel === hcp.channelPreference) {
    confidence = Math.min(100, confidence + 10);
    reasoning += ` (Aligned with stated channel preference)`;
  }

  return {
    hcpId: hcp.id,
    hcpName: `${hcp.firstName} ${hcp.lastName}`,
    recommendedChannel: selectedChannel.channel,
    actionType,
    confidence,
    reasoning,
    urgency,
    suggestedTiming,
    channelHealth: selectedChannel.status,
    metrics: {
      channelScore: selectedChannel.score,
      responseRate: selectedChannel.responseRate,
      lastContactDays: selectedChannel.lastContactDays,
    },
  };
}

/**
 * Generate Next Best Actions for multiple HCPs
 */
export function generateNBAs(
  hcps: HCPProfile[],
  config: NBAConfig = defaultConfig
): NextBestAction[] {
  return hcps.map((hcp) => generateNBA(hcp, undefined, config));
}

/**
 * Filter and sort NBAs by urgency and confidence
 */
export function prioritizeNBAs(
  nbas: NextBestAction[],
  limit?: number
): NextBestAction[] {
  const urgencyOrder = { high: 0, medium: 1, low: 2 };

  const sorted = [...nbas].sort((a, b) => {
    // First by urgency
    const urgencyDiff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    if (urgencyDiff !== 0) return urgencyDiff;

    // Then by confidence
    return b.confidence - a.confidence;
  });

  return limit ? sorted.slice(0, limit) : sorted;
}

/**
 * Get summary statistics for a set of NBAs
 */
export function getNBASummary(nbas: NextBestAction[]): {
  totalActions: number;
  byUrgency: Record<string, number>;
  byActionType: Record<string, number>;
  byChannel: Record<string, number>;
  avgConfidence: number;
} {
  const byUrgency: Record<string, number> = { high: 0, medium: 0, low: 0 };
  const byActionType: Record<string, number> = {};
  const byChannel: Record<string, number> = {};
  let totalConfidence = 0;

  for (const nba of nbas) {
    byUrgency[nba.urgency]++;

    byActionType[nba.actionType] = (byActionType[nba.actionType] || 0) + 1;
    byChannel[nba.recommendedChannel] = (byChannel[nba.recommendedChannel] || 0) + 1;
    totalConfidence += nba.confidence;
  }

  return {
    totalActions: nbas.length,
    byUrgency,
    byActionType,
    byChannel,
    avgConfidence: nbas.length > 0 ? Math.round(totalConfidence / nbas.length) : 0,
  };
}
