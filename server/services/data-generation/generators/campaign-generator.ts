/**
 * Campaign Generator
 * Generates historical campaign definitions
 */

import { getRng } from "../rng";
import { CAMPAIGN_TYPES, PRODUCTS, CHANNEL_BY_SEGMENT } from "../config";
import { channels, segments, tiers, specialties } from "@shared/schema";
import type { InsertCampaign, InsertCampaignParticipation, Channel } from "@shared/schema";

interface GeneratedCampaign extends InsertCampaign {
  generatedId: string; // Temporary ID before DB insertion
}

interface HCPWithDetails {
  hcpId: string;
  specialty: string;
  tier: string;
  segment: string;
}

/**
 * Generate campaigns over a time period
 * Target: 40-50 campaigns over 12 months with max 3 concurrent
 */
export function generateCampaigns(
  startDate: Date,
  months: number
): GeneratedCampaign[] {
  const rng = getRng();
  const campaigns: GeneratedCampaign[] = [];

  // Target 4-5 campaigns per month, with some overlap
  const targetCampaigns = Math.round(months * 4.2); // ~50 for 12 months

  // Track active campaigns to avoid too much overlap
  const activePeriods: { start: Date; end: Date }[] = [];

  for (let i = 0; i < targetCampaigns; i++) {
    const campaign = generateSingleCampaign(rng, startDate, months, activePeriods, i);
    campaigns.push(campaign);
    activePeriods.push({ start: campaign.startDate!, end: campaign.endDate || campaign.startDate! });
  }

  return campaigns;
}

/**
 * Generate a single campaign
 */
function generateSingleCampaign(
  rng: ReturnType<typeof getRng>,
  periodStart: Date,
  months: number,
  activePeriods: { start: Date; end: Date }[],
  index: number
): GeneratedCampaign {
  const periodEnd = new Date(periodStart);
  periodEnd.setMonth(periodEnd.getMonth() + months);

  // Campaign type
  const campaignType = rng.weightedPick(
    CAMPAIGN_TYPES.map((t) => ({ item: t.item, weight: t.weight }))
  );

  // Duration based on campaign type
  const durationWeeks = getDurationByType(rng, campaignType);
  const durationMs = durationWeeks * 7 * 24 * 60 * 60 * 1000;

  // Find a start date that doesn't create more than 3 concurrent campaigns
  let startDate: Date;
  let attempts = 0;
  do {
    startDate = rng.dateBetween(periodStart, new Date(periodEnd.getTime() - durationMs));
    attempts++;
  } while (countConcurrentAt(activePeriods, startDate) >= 3 && attempts < 50);

  const endDate = new Date(startDate.getTime() + durationMs);

  // Product and therapeutic area
  const product = rng.pick(PRODUCTS);

  // Campaign name
  const campaignCode = `CAMP-${new Date().getFullYear()}-${String(index + 1).padStart(3, "0")}`;
  const name = generateCampaignName(rng, campaignType, product.name);

  // Channel mix
  const primaryChannel = rng.pick([...channels]);
  const channelMix = generateChannelMix(rng, primaryChannel);

  // Targeting
  const targetSegments = rng.pickMany([...segments], rng.int(1, 3));
  const targetSpecialties = rng.pickMany([...specialties], rng.int(1, 4));
  const targetTiers = rng.pickMany([...tiers], rng.int(1, 2));

  // Goals
  const goalType = rng.pick(["engagement", "conversion", "awareness", "rx_lift"]);
  const goalValue = getGoalValueByType(rng, goalType);

  // Budget
  const budget = rng.int(50000, 500000);

  // Status (based on dates)
  const now = new Date();
  let status: "draft" | "active" | "paused" | "completed" | "cancelled";
  if (endDate < now) {
    status = rng.boolean(0.95) ? "completed" : "cancelled";
  } else if (startDate <= now) {
    status = rng.boolean(0.9) ? "active" : "paused";
  } else {
    status = "draft";
  }

  return {
    generatedId: rng.uuid(),
    name,
    description: generateCampaignDescription(campaignType, product.name, targetSegments),
    campaignCode,
    campaignType,
    therapeuticArea: product.therapeuticArea,
    product: product.name,
    startDate,
    endDate,
    primaryChannel,
    channelMix,
    targetSegments,
    targetSpecialties,
    targetTiers,
    goalType,
    goalValue,
    budget,
    spentToDate: status === "completed" ? budget * rng.float(0.85, 1.0) : budget * rng.float(0, 0.7),
    totalReach: 0, // Will be updated during stimuli generation
    totalEngagements: 0,
    responseRate: null,
    status,
  };
}

/**
 * Get campaign duration based on type
 */
function getDurationByType(rng: ReturnType<typeof getRng>, type: string): number {
  const durations: Record<string, { min: number; max: number }> = {
    launch: { min: 8, max: 16 },
    maintenance: { min: 12, max: 26 },
    awareness: { min: 4, max: 8 },
    retention: { min: 8, max: 16 },
  };
  const { min, max } = durations[type] || { min: 6, max: 12 };
  return rng.int(min, max);
}

/**
 * Count concurrent campaigns at a given date
 */
function countConcurrentAt(periods: { start: Date; end: Date }[], date: Date): number {
  return periods.filter((p) => p.start <= date && p.end >= date).length;
}

/**
 * Generate campaign name
 */
function generateCampaignName(rng: ReturnType<typeof getRng>, type: string, product: string): string {
  const prefixes: Record<string, string[]> = {
    launch: ["Introducing", "Announcing", "Launch of", "Meet"],
    maintenance: ["Continued Success with", "Growing with", "Advancing with"],
    awareness: ["Discover", "Learn About", "Explore", "Understanding"],
    retention: ["Stay Connected with", "Continuing Care with", "Your Partner:"],
  };
  const prefix = rng.pick(prefixes[type] || ["Campaign for"]);
  const quarter = `Q${Math.ceil((new Date().getMonth() + 1) / 3)}`;
  return `${prefix} ${product} ${quarter} ${new Date().getFullYear()}`;
}

/**
 * Generate campaign description
 */
function generateCampaignDescription(type: string, product: string, segments: string[]): string {
  const templates: Record<string, string> = {
    launch: `New product launch campaign for ${product} targeting ${segments.join(", ")} physicians to drive initial adoption and awareness.`,
    maintenance: `Ongoing engagement campaign for ${product} focused on maintaining relationships with ${segments.join(", ")} physicians.`,
    awareness: `Educational awareness campaign highlighting the clinical benefits of ${product} for ${segments.join(", ")} practices.`,
    retention: `Patient retention focused campaign supporting ${segments.join(", ")} physicians in their continued use of ${product}.`,
  };
  return templates[type] || `Marketing campaign for ${product}.`;
}

/**
 * Generate channel mix (percentages summing to 100)
 */
function generateChannelMix(rng: ReturnType<typeof getRng>, primary: Channel): Record<Channel, number> {
  const mix: Record<string, number> = {};
  let remaining = 100;

  // Primary channel gets 30-50%
  const primaryPct = rng.int(30, 50);
  mix[primary] = primaryPct;
  remaining -= primaryPct;

  // Distribute remaining across other channels
  const otherChannels = channels.filter((c) => c !== primary);
  const shuffled = rng.shuffle([...otherChannels]);

  for (let i = 0; i < shuffled.length; i++) {
    if (i === shuffled.length - 1) {
      mix[shuffled[i]] = remaining;
    } else {
      const pct = rng.int(5, Math.min(25, remaining - (shuffled.length - i - 1) * 5));
      mix[shuffled[i]] = pct;
      remaining -= pct;
    }
  }

  return mix as Record<Channel, number>;
}

/**
 * Get goal value based on type
 */
function getGoalValueByType(rng: ReturnType<typeof getRng>, type: string): number {
  const ranges: Record<string, { min: number; max: number }> = {
    engagement: { min: 20, max: 50 }, // Engagement rate %
    conversion: { min: 5, max: 20 }, // Conversion rate %
    awareness: { min: 30, max: 60 }, // Awareness %
    rx_lift: { min: 5, max: 15 }, // Rx lift %
  };
  const { min, max } = ranges[type] || { min: 10, max: 30 };
  return rng.int(min, max);
}

/**
 * Generate campaign participation records
 */
export function generateCampaignParticipation(
  campaigns: { id: string; campaignId: string; targetSegments: string[] | null; targetSpecialties: string[] | null; targetTiers: string[] | null; startDate: Date }[],
  hcps: HCPWithDetails[]
): InsertCampaignParticipation[] {
  const rng = getRng();
  const participations: InsertCampaignParticipation[] = [];

  for (const campaign of campaigns) {
    // Filter HCPs that match campaign targeting
    const eligibleHcps = hcps.filter((hcp) => {
      const segmentMatch =
        !campaign.targetSegments || campaign.targetSegments.includes(hcp.segment);
      const specialtyMatch =
        !campaign.targetSpecialties || campaign.targetSpecialties.includes(hcp.specialty);
      const tierMatch = !campaign.targetTiers || campaign.targetTiers.includes(hcp.tier);
      return segmentMatch && specialtyMatch && tierMatch;
    });

    // Enroll a portion of eligible HCPs (60-90%)
    const enrollmentRate = rng.float(0.6, 0.9);
    const enrolledCount = Math.floor(eligibleHcps.length * enrollmentRate);
    const enrolled = rng.pickMany(eligibleHcps, enrolledCount);

    for (const hcp of enrolled) {
      const enrolledAt = new Date(campaign.startDate);
      enrolledAt.setDate(enrolledAt.getDate() + rng.int(0, 7));

      // Most are active or completed, few opt out
      const statusRoll = rng.random();
      const status =
        statusRoll < 0.05
          ? "opted_out"
          : statusRoll < 0.3
          ? "completed"
          : statusRoll < 0.7
          ? "active"
          : "enrolled";

      participations.push({
        campaignId: campaign.id,
        hcpId: hcp.hcpId,
        enrolledAt,
        enrollmentSource: rng.pick(["auto", "manual", "import"]),
        status,
        optOutReason: status === "opted_out" ? rng.pick(["too_frequent", "not_relevant", "request"]) : null,
        optOutAt: status === "opted_out" ? rng.dateBetween(enrolledAt, new Date()) : null,
        touchCount: 0, // Will be updated during stimuli generation
        responseCount: 0,
        lastTouchAt: null,
        lastResponseAt: null,
      });
    }
  }

  return participations;
}

export type { GeneratedCampaign, HCPWithDetails };
