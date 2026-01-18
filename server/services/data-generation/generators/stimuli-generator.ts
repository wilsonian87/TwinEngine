/**
 * Stimuli Generator
 * Generates engagement events with temporal patterns
 */

import { getRng } from "../rng";
import {
  STIMULUS_TYPES_BY_CHANNEL,
  CONTENT_CATEGORIES,
  DELIVERY_STATUS_WEIGHTS,
  CHANNEL_BY_SEGMENT,
} from "../config";
import { channels } from "@shared/schema";
import type { InsertStimuliEvent, Channel } from "@shared/schema";

interface HCPProfile {
  hcpId: string;
  tier: string;
  segment: string;
  channelPreference: Channel;
}

interface CampaignInfo {
  campaignId: string;
  startDate: Date;
  endDate: Date | null;
  primaryChannel: string | null;
  targetSegments: string[] | null;
}

interface TerritoryAssignment {
  hcpId: string;
  repId: string;
}

/**
 * Generate stimuli events for all HCPs
 * Target: ~80,000 events over 12 months
 */
export function generateStimuliEvents(
  hcps: HCPProfile[],
  campaigns: CampaignInfo[],
  assignments: TerritoryAssignment[],
  startDate: Date,
  months: number
): InsertStimuliEvent[] {
  const rng = getRng();
  const events: InsertStimuliEvent[] = [];

  // Create lookup for rep assignments
  const hcpToRep = new Map<string, string>();
  for (const a of assignments) {
    if (!hcpToRep.has(a.hcpId)) {
      hcpToRep.set(a.hcpId, a.repId);
    }
  }

  // Create lookup for campaign eligibility
  const hcpToCampaigns = new Map<string, CampaignInfo[]>();
  for (const hcp of hcps) {
    const eligible = campaigns.filter((c) => {
      if (!c.targetSegments) return true;
      return c.targetSegments.includes(hcp.segment);
    });
    hcpToCampaigns.set(hcp.hcpId, eligible);
  }

  // Target events per HCP based on tier
  const eventsPerTier: Record<string, { min: number; max: number }> = {
    "Tier 1": { min: 50, max: 80 },
    "Tier 2": { min: 30, max: 50 },
    "Tier 3": { min: 15, max: 30 },
  };

  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + months);

  for (const hcp of hcps) {
    const { min, max } = eventsPerTier[hcp.tier] || { min: 20, max: 40 };
    const eventCount = rng.int(min, max);
    const repId = hcpToRep.get(hcp.hcpId);
    const eligibleCampaigns = hcpToCampaigns.get(hcp.hcpId) || [];

    // Generate events distributed over time
    const hcpEvents = generateHCPEvents(
      rng,
      hcp,
      eventCount,
      startDate,
      endDate,
      eligibleCampaigns,
      repId
    );

    events.push(...hcpEvents);
  }

  return events;
}

/**
 * Generate events for a single HCP
 */
function generateHCPEvents(
  rng: ReturnType<typeof getRng>,
  hcp: HCPProfile,
  count: number,
  startDate: Date,
  endDate: Date,
  campaigns: CampaignInfo[],
  repId: string | undefined
): InsertStimuliEvent[] {
  const events: InsertStimuliEvent[] = [];

  // Get channel weights for this HCP's segment
  const channelWeights = CHANNEL_BY_SEGMENT[hcp.segment as keyof typeof CHANNEL_BY_SEGMENT] || [];

  for (let i = 0; i < count; i++) {
    // Pick channel based on segment preference
    const channel = rng.weightedPick(channelWeights) as Channel;

    // Get stimulus type for this channel
    const stimulusTypes = STIMULUS_TYPES_BY_CHANNEL[channel] || ["email_send"];
    const stimulusType = rng.pick(stimulusTypes);

    // Generate event date with realistic distribution
    // More events during weekdays and business hours
    const eventDate = generateEventDate(rng, startDate, endDate);

    // Find an active campaign for this date (if any)
    const activeCampaign = campaigns.find((c) => {
      const cStart = new Date(c.startDate);
      const cEnd = c.endDate ? new Date(c.endDate) : endDate;
      return eventDate >= cStart && eventDate <= cEnd;
    });

    // Content metadata
    const contentCategory = rng.pick([...CONTENT_CATEGORIES]);
    const contentType = generateContentType(rng, channel);
    const messageVariant = `V${rng.int(1, 5)}`;
    const callToAction = generateCTA(rng, stimulusType);

    // Delivery status (mostly delivered)
    const deliveryStatus = rng.weightedPick(
      DELIVERY_STATUS_WEIGHTS.map((d) => ({ item: d.item, weight: d.weight }))
    );

    // Predicted impact (will be computed by the prediction engine normally)
    const { predictedEngagementDelta, predictedConversionDelta, confidenceLower, confidenceUpper } =
      generatePredictedImpact(rng, hcp.tier, channel);

    events.push({
      hcpId: hcp.hcpId,
      stimulusType,
      channel,
      contentType,
      messageVariant,
      callToAction,
      campaignId: activeCampaign?.campaignId || null,
      repId: channel === "rep_visit" || channel === "phone" ? repId || null : null,
      contentCategory,
      deliveryStatus,
      predictedEngagementDelta,
      predictedConversionDelta,
      confidenceLower,
      confidenceUpper,
      actualEngagementDelta: null,
      actualConversionDelta: null,
      outcomeRecordedAt: null,
      status: "predicted",
      eventDate,
    });
  }

  return events;
}

/**
 * Generate an event date with realistic distribution
 */
function generateEventDate(
  rng: ReturnType<typeof getRng>,
  start: Date,
  end: Date
): Date {
  // Generate a random date
  let date = rng.dateBetween(start, end);

  // Bias towards weekdays (80% chance of weekday)
  const dayOfWeek = date.getDay();
  if ((dayOfWeek === 0 || dayOfWeek === 6) && rng.boolean(0.8)) {
    // Move to a weekday
    const daysToAdd = dayOfWeek === 0 ? 1 : 2;
    date = new Date(date.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
  }

  // Set to business hours (8am - 6pm) with some variation
  const hour = rng.normalInt(12, 3, 7, 19);
  const minute = rng.int(0, 59);
  date.setHours(hour, minute, 0, 0);

  return date;
}

/**
 * Generate content type based on channel
 */
function generateContentType(rng: ReturnType<typeof getRng>, channel: Channel): string {
  const contentByChannel: Record<Channel, string[]> = {
    email: ["newsletter", "product_update", "clinical_study", "invitation"],
    rep_visit: ["detail_aid", "leave_behind", "product_sample", "discussion"],
    webinar: ["live_presentation", "on_demand", "panel_discussion"],
    conference: ["booth_visit", "symposium", "poster_session", "kol_meeting"],
    digital_ad: ["banner", "video", "native", "sponsored_content"],
    phone: ["follow_up", "appointment_confirm", "product_info", "survey"],
  };
  return rng.pick(contentByChannel[channel] || ["general"]);
}

/**
 * Generate call to action based on stimulus type
 */
function generateCTA(rng: ReturnType<typeof getRng>, stimulusType: string): string {
  const ctaByType: Record<string, string[]> = {
    email_send: ["Learn More", "Download Guide", "Register Now", "Contact Rep", "Request Sample"],
    email_open: ["Read Full Article", "View Details", "Get Started"],
    email_click: ["Download Now", "Schedule Meeting", "View Product Info"],
    rep_visit: ["Schedule Follow-up", "Request Samples", "Review Data"],
    webinar_invite: ["Register Now", "Add to Calendar", "Learn More"],
    webinar_attend: ["Download Materials", "Ask a Question", "Connect with Speaker"],
    conference_meeting: ["Schedule Booth Visit", "View Poster", "Connect"],
    digital_ad_impression: ["Click to Learn More", "Visit Site"],
    digital_ad_click: ["Get Started", "Request Demo", "Download"],
    phone_call: ["Confirm Appointment", "Request Information", "Schedule Visit"],
    sample_delivery: ["Provide Feedback", "Reorder", "Contact Support"],
    content_download: ["View Related Content", "Share", "Contact"],
  };
  return rng.pick(ctaByType[stimulusType] || ["Learn More"]);
}

/**
 * Generate predicted impact scores
 */
function generatePredictedImpact(
  rng: ReturnType<typeof getRng>,
  tier: string,
  channel: Channel
): {
  predictedEngagementDelta: number;
  predictedConversionDelta: number;
  confidenceLower: number;
  confidenceUpper: number;
} {
  // Base impact by tier
  const baseImpactByTier: Record<string, number> = {
    "Tier 1": 2.5,
    "Tier 2": 1.8,
    "Tier 3": 1.2,
  };

  // Channel multipliers
  const channelMultiplier: Record<Channel, number> = {
    rep_visit: 1.5,
    conference: 1.4,
    webinar: 1.2,
    phone: 1.1,
    email: 1.0,
    digital_ad: 0.7,
  };

  const baseImpact = baseImpactByTier[tier] || 1.5;
  const multiplier = channelMultiplier[channel] || 1.0;

  const predictedEngagementDelta = Math.round(
    (baseImpact * multiplier + rng.normal(0, 0.5)) * 100
  ) / 100;

  const predictedConversionDelta = Math.round(
    (baseImpact * multiplier * 0.3 + rng.normal(0, 0.2)) * 100
  ) / 100;

  // Confidence interval (wider for smaller effects)
  const width = Math.abs(predictedEngagementDelta) * rng.float(0.3, 0.6);
  const confidenceLower = Math.round((predictedEngagementDelta - width) * 100) / 100;
  const confidenceUpper = Math.round((predictedEngagementDelta + width) * 100) / 100;

  return {
    predictedEngagementDelta,
    predictedConversionDelta,
    confidenceLower,
    confidenceUpper,
  };
}

export type { HCPProfile, CampaignInfo, TerritoryAssignment };
