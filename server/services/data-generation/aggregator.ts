/**
 * Aggregator
 * Recalculates HCP engagement metrics based on generated data
 */

import { db } from "../../db";
import { hcpProfiles, stimuliEvents, outcomeEvents } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import type { ChannelEngagement, Channel } from "@shared/schema";
import { channels } from "@shared/schema";

interface HCPEngagementUpdate {
  hcpId: string;
  overallEngagementScore: number;
  channelEngagements: ChannelEngagement[];
  lastUpdated: Date;
}

/**
 * Recalculate engagement metrics for all HCPs based on stimuli and outcome data
 */
export async function recalculateEngagementMetrics(): Promise<{
  updated: number;
  errors: number;
}> {
  let updated = 0;
  let errors = 0;

  // Get all HCP IDs
  const hcps = await db.select({ id: hcpProfiles.id }).from(hcpProfiles);

  console.log(`Recalculating engagement for ${hcps.length} HCPs...`);

  // Process in batches
  const batchSize = 100;
  for (let i = 0; i < hcps.length; i += batchSize) {
    const batch = hcps.slice(i, i + batchSize);

    for (const hcp of batch) {
      try {
        const update = await calculateHCPEngagement(hcp.id);
        await applyEngagementUpdate(update);
        updated++;
      } catch (error) {
        console.error(`Error updating HCP ${hcp.id}:`, error);
        errors++;
      }
    }

    // Progress
    if ((i + batchSize) % 500 === 0) {
      console.log(`  Processed ${Math.min(i + batchSize, hcps.length)}/${hcps.length} HCPs`);
    }
  }

  return { updated, errors };
}

/**
 * Calculate engagement metrics for a single HCP
 */
async function calculateHCPEngagement(hcpId: string): Promise<HCPEngagementUpdate> {
  // Get stimuli for this HCP
  const stimuli = await db
    .select({
      channel: stimuliEvents.channel,
      eventDate: stimuliEvents.eventDate,
    })
    .from(stimuliEvents)
    .where(eq(stimuliEvents.hcpId, hcpId));

  // Get outcomes for this HCP
  const outcomes = await db
    .select({
      channel: outcomeEvents.channel,
      eventDate: outcomeEvents.eventDate,
    })
    .from(outcomeEvents)
    .where(eq(outcomeEvents.hcpId, hcpId));

  // Group stimuli by channel
  const stimuliByChannel = new Map<Channel, { count: number; lastDate: Date | null }>();
  for (const channel of channels) {
    stimuliByChannel.set(channel, { count: 0, lastDate: null });
  }

  for (const s of stimuli) {
    const channel = s.channel as Channel;
    const current = stimuliByChannel.get(channel)!;
    current.count++;
    if (!current.lastDate || new Date(s.eventDate) > current.lastDate) {
      current.lastDate = new Date(s.eventDate);
    }
  }

  // Group outcomes by channel
  const outcomesByChannel = new Map<Channel, number>();
  for (const channel of channels) {
    outcomesByChannel.set(channel, 0);
  }

  for (const o of outcomes) {
    const channel = o.channel as Channel;
    outcomesByChannel.set(channel, (outcomesByChannel.get(channel) || 0) + 1);
  }

  // Calculate channel engagements
  const channelEngagements: ChannelEngagement[] = channels.map((channel) => {
    const stimuliData = stimuliByChannel.get(channel)!;
    const outcomeCount = outcomesByChannel.get(channel) || 0;

    const totalTouches = stimuliData.count;
    const responseRate =
      totalTouches > 0 ? Math.round((outcomeCount / totalTouches) * 100 * 10) / 10 : 0;

    // Calculate score based on response rate and recency
    let score = 0;
    if (totalTouches > 0) {
      // Base score from response rate (0-50 points)
      score += Math.min(50, responseRate);

      // Recency bonus (0-30 points)
      if (stimuliData.lastDate) {
        const daysSinceLastContact = Math.floor(
          (Date.now() - stimuliData.lastDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        const recencyScore = Math.max(0, 30 - daysSinceLastContact);
        score += recencyScore;
      }

      // Engagement depth bonus (0-20 points)
      const depthScore = Math.min(20, totalTouches * 2);
      score += depthScore;
    }

    return {
      channel,
      score: Math.round(Math.min(100, score)),
      lastContact: stimuliData.lastDate?.toISOString() || null,
      totalTouches,
      responseRate,
    };
  });

  // Calculate overall engagement score (weighted average)
  const totalScore = channelEngagements.reduce((sum, ce) => sum + ce.score * ce.totalTouches, 0);
  const totalTouches = channelEngagements.reduce((sum, ce) => sum + ce.totalTouches, 0);
  const overallEngagementScore =
    totalTouches > 0 ? Math.round(totalScore / totalTouches) : 0;

  return {
    hcpId,
    overallEngagementScore,
    channelEngagements,
    lastUpdated: new Date(),
  };
}

/**
 * Apply engagement update to database
 */
async function applyEngagementUpdate(update: HCPEngagementUpdate): Promise<void> {
  await db
    .update(hcpProfiles)
    .set({
      overallEngagementScore: update.overallEngagementScore,
      channelEngagements: update.channelEngagements,
      lastUpdated: update.lastUpdated,
    })
    .where(eq(hcpProfiles.id, update.hcpId));
}

/**
 * Update campaign performance metrics based on generated data
 */
export async function updateCampaignMetrics(): Promise<{ updated: number }> {
  const result = await db.execute(sql`
    UPDATE campaigns c
    SET
      total_reach = COALESCE(s.reach, 0),
      total_engagements = COALESCE(s.engagements, 0),
      response_rate = CASE
        WHEN s.reach > 0 THEN ROUND((s.engagements::numeric / s.reach) * 100, 2)
        ELSE 0
      END
    FROM (
      SELECT
        campaign_id,
        COUNT(DISTINCT hcp_id) as reach,
        COUNT(*) as engagements
      FROM stimuli_events
      WHERE campaign_id IS NOT NULL
      GROUP BY campaign_id
    ) s
    WHERE c.id = s.campaign_id
  `);

  return { updated: result.rowCount || 0 };
}

/**
 * Update campaign participation touch counts
 */
export async function updateCampaignParticipation(): Promise<{ updated: number }> {
  const result = await db.execute(sql`
    UPDATE campaign_participation cp
    SET
      touch_count = COALESCE(s.touches, 0),
      response_count = COALESCE(o.responses, 0),
      last_touch_at = s.last_touch,
      last_response_at = o.last_response
    FROM (
      SELECT
        campaign_id,
        hcp_id,
        COUNT(*) as touches,
        MAX(event_date) as last_touch
      FROM stimuli_events
      WHERE campaign_id IS NOT NULL
      GROUP BY campaign_id, hcp_id
    ) s
    LEFT JOIN (
      SELECT
        campaign_id,
        hcp_id,
        COUNT(*) as responses,
        MAX(event_date) as last_response
      FROM outcome_events
      WHERE campaign_id IS NOT NULL
      GROUP BY campaign_id, hcp_id
    ) o ON s.campaign_id = o.campaign_id AND s.hcp_id = o.hcp_id
    WHERE cp.campaign_id = s.campaign_id AND cp.hcp_id = s.hcp_id
  `);

  return { updated: result.rowCount || 0 };
}
