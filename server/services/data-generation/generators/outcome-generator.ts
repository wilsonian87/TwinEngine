/**
 * Outcome Generator
 * Generates response/outcome events with attribution to stimuli
 * Target: ~16,000 outcomes (~20% response rate)
 */

import { getRng } from "../rng";
import { OUTCOME_MAPPING, CHANNEL_RESPONSE_RATES } from "../config";
import { outcomeTypes } from "@shared/schema";
import type { InsertOutcomeEvent, Channel } from "@shared/schema";

interface StimulusEvent {
  stimulusId: string;
  hcpId: string;
  stimulusType: string;
  channel: Channel;
  campaignId: string | null;
  eventDate: Date;
  tier: string;
  segment: string;
}

/**
 * Generate outcome events based on stimuli
 * Response rate varies by channel, tier, and segment
 */
export function generateOutcomeEvents(
  stimuli: StimulusEvent[]
): InsertOutcomeEvent[] {
  const rng = getRng();
  const outcomes: InsertOutcomeEvent[] = [];

  // Group stimuli by HCP to track cumulative touches
  const hcpTouches = new Map<string, number>();

  for (const stimulus of stimuli) {
    // Track touches for attribution
    const touchCount = (hcpTouches.get(stimulus.hcpId) || 0) + 1;
    hcpTouches.set(stimulus.hcpId, touchCount);

    // Calculate response probability
    const responseProb = calculateResponseProbability(
      rng,
      stimulus.channel,
      stimulus.tier,
      stimulus.segment,
      touchCount
    );

    // Determine if this stimulus generates an outcome
    if (!rng.boolean(responseProb)) {
      continue;
    }

    // Get possible outcome types for this stimulus
    const possibleOutcomes = OUTCOME_MAPPING[stimulus.stimulusType] || [];
    if (possibleOutcomes.length === 0) {
      continue;
    }

    // Pick an outcome type (weighted towards lighter responses)
    const outcomeType = pickOutcomeType(rng, possibleOutcomes);

    // Generate outcome date (after stimulus, within reasonable window)
    const outcomeDate = generateOutcomeDate(rng, stimulus.eventDate, outcomeType);

    // Attribution metadata
    const attributionType = determineAttributionType(rng, touchCount);
    const daysSinceLastTouch = Math.floor(
      (outcomeDate.getTime() - stimulus.eventDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Outcome value and quality
    const { outcomeValue, qualityScore } = generateOutcomeMetrics(rng, outcomeType);

    // Content info
    const { contentId, contentName } = generateContentInfo(rng, outcomeType);

    outcomes.push({
      hcpId: stimulus.hcpId,
      stimulusId: stimulus.stimulusId,
      campaignId: stimulus.campaignId,
      outcomeType,
      channel: stimulus.channel,
      outcomeValue,
      qualityScore,
      contentId,
      contentName,
      attributionType,
      attributionWeight: calculateAttributionWeight(attributionType, touchCount),
      touchesInWindow: touchCount,
      daysSinceLastTouch,
      eventDate: outcomeDate,
    });
  }

  return outcomes;
}

/**
 * Calculate response probability based on multiple factors
 */
function calculateResponseProbability(
  rng: ReturnType<typeof getRng>,
  channel: Channel,
  tier: string,
  segment: string,
  touchCount: number
): number {
  // Base rate by channel
  let prob = CHANNEL_RESPONSE_RATES[channel] || 0.15;

  // Tier modifier
  const tierModifier: Record<string, number> = {
    "Tier 1": 1.3,
    "Tier 2": 1.0,
    "Tier 3": 0.7,
  };
  prob *= tierModifier[tier] || 1.0;

  // Segment modifier
  const segmentModifier: Record<string, number> = {
    "High Prescriber": 1.2,
    "Engaged Digital": 1.4,
    "Academic Leader": 1.1,
    "Growth Potential": 1.0,
    "Traditional Preference": 0.9,
    "New Target": 0.7,
  };
  prob *= segmentModifier[segment] || 1.0;

  // Touch count effect (diminishing returns after 5 touches)
  if (touchCount <= 3) {
    prob *= 1.0;
  } else if (touchCount <= 5) {
    prob *= 0.9;
  } else if (touchCount <= 10) {
    prob *= 0.8;
  } else {
    prob *= 0.6;
  }

  // Add some randomness
  prob *= rng.float(0.8, 1.2);

  // Cap at reasonable bounds
  return Math.min(0.6, Math.max(0.02, prob));
}

/**
 * Pick outcome type with weighted probability
 */
function pickOutcomeType(
  rng: ReturnType<typeof getRng>,
  possibleOutcomes: string[]
): string {
  // Weight outcomes by "effort" (lighter outcomes more common)
  const weights: Record<string, number> = {
    email_open: 10,
    email_click: 6,
    content_download: 4,
    form_submit: 3,
    webinar_register: 5,
    webinar_attend: 3,
    sample_request: 4,
    meeting_scheduled: 2,
    meeting_completed: 1.5,
    call_completed: 3,
    rx_written: 0.5,
    referral: 0.3,
  };

  const weightedOutcomes = possibleOutcomes.map((o) => ({
    item: o,
    weight: weights[o] || 1,
  }));

  return rng.weightedPick(weightedOutcomes);
}

/**
 * Generate outcome date based on stimulus date and outcome type
 */
function generateOutcomeDate(
  rng: ReturnType<typeof getRng>,
  stimulusDate: Date,
  outcomeType: string
): Date {
  // Different outcomes have different typical response windows
  const windowsByType: Record<string, { min: number; max: number }> = {
    email_open: { min: 0, max: 3 }, // Same day to 3 days
    email_click: { min: 0, max: 2 },
    content_download: { min: 0, max: 5 },
    form_submit: { min: 0, max: 7 },
    webinar_register: { min: 0, max: 14 },
    webinar_attend: { min: 1, max: 30 }, // Webinar happens later
    sample_request: { min: 0, max: 7 },
    meeting_scheduled: { min: 1, max: 14 },
    meeting_completed: { min: 3, max: 21 },
    call_completed: { min: 0, max: 3 },
    rx_written: { min: 1, max: 45 }, // Takes longer
    referral: { min: 7, max: 60 },
  };

  const window = windowsByType[outcomeType] || { min: 0, max: 7 };
  const daysToAdd = rng.int(window.min, window.max);

  const outcomeDate = new Date(stimulusDate);
  outcomeDate.setDate(outcomeDate.getDate() + daysToAdd);

  // Add some hours for realism
  // If same day as stimulus, ensure outcome is after stimulus
  if (daysToAdd === 0) {
    const stimulusHour = stimulusDate.getHours();
    const stimulusMinute = stimulusDate.getMinutes();
    // Set outcome to at least 1 minute after stimulus, up to end of day
    const minHour = stimulusHour;
    const outcomeHour = rng.int(minHour, 20);
    const outcomeMinute = outcomeHour === stimulusHour
      ? rng.int(stimulusMinute + 1, 59)
      : rng.int(0, 59);
    outcomeDate.setHours(outcomeHour, Math.min(outcomeMinute, 59), 0, 0);
  } else {
    outcomeDate.setHours(rng.int(7, 20), rng.int(0, 59), 0, 0);
  }

  return outcomeDate;
}

/**
 * Determine attribution type based on touch count
 */
function determineAttributionType(
  rng: ReturnType<typeof getRng>,
  touchCount: number
): "direct" | "assisted" | "organic" {
  if (touchCount === 1) {
    return rng.boolean(0.85) ? "direct" : "organic";
  } else if (touchCount <= 3) {
    const roll = rng.random();
    if (roll < 0.6) return "direct";
    if (roll < 0.9) return "assisted";
    return "organic";
  } else {
    const roll = rng.random();
    if (roll < 0.4) return "direct";
    if (roll < 0.85) return "assisted";
    return "organic";
  }
}

/**
 * Calculate attribution weight based on type and touch count
 */
function calculateAttributionWeight(
  attributionType: "direct" | "assisted" | "organic",
  touchCount: number
): number {
  if (attributionType === "direct") {
    return 1.0;
  } else if (attributionType === "assisted") {
    // More touches = lower individual attribution
    return Math.max(0.3, 1.0 / touchCount);
  } else {
    return 0.1;
  }
}

/**
 * Generate outcome value and quality score
 */
function generateOutcomeMetrics(
  rng: ReturnType<typeof getRng>,
  outcomeType: string
): {
  outcomeValue: number | null;
  qualityScore: number | null;
} {
  // Some outcomes have quantifiable value
  const valueRanges: Record<string, { min: number; max: number } | null> = {
    rx_written: { min: 100, max: 2000 },
    sample_request: { min: 50, max: 200 },
    meeting_completed: { min: 200, max: 500 },
    referral: { min: 500, max: 2500 },
    content_download: null,
    email_open: null,
    email_click: null,
    form_submit: null,
    webinar_register: null,
    webinar_attend: { min: 100, max: 300 },
    meeting_scheduled: null,
    call_completed: null,
  };

  const range = valueRanges[outcomeType];
  const outcomeValue = range ? rng.int(range.min, range.max) : null;

  // Quality score for interactions (1-10)
  const qualityScore = ["meeting_completed", "call_completed", "webinar_attend", "referral"].includes(
    outcomeType
  )
    ? rng.int(5, 10)
    : null;

  return { outcomeValue, qualityScore };
}

/**
 * Generate content info for outcome
 */
function generateContentInfo(
  rng: ReturnType<typeof getRng>,
  outcomeType: string
): {
  contentId: string | null;
  contentName: string | null;
} {
  const contentTypes = ["content_download", "email_click", "webinar_attend", "form_submit"];

  if (!contentTypes.includes(outcomeType)) {
    return { contentId: null, contentName: null };
  }

  const contentNames: Record<string, string[]> = {
    content_download: [
      "Clinical Study Summary",
      "Dosing Guide",
      "Patient Case Studies",
      "Product Monograph",
      "Safety Information",
      "Formulary Comparison",
    ],
    email_click: [
      "Product Overview",
      "Latest Research",
      "Upcoming Events",
      "Clinical Update",
    ],
    webinar_attend: [
      "Q1 Clinical Update Webinar",
      "Expert Panel Discussion",
      "New Data Presentation",
      "Best Practices Workshop",
    ],
    form_submit: [
      "Sample Request Form",
      "Contact Request",
      "Meeting Request",
      "Information Request",
    ],
  };

  const names = contentNames[outcomeType] || ["General Content"];
  const contentName = rng.pick(names);
  const contentId = `CNT-${rng.int(1000, 9999)}`;

  return { contentId, contentName };
}

export type { StimulusEvent };
