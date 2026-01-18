/**
 * Persona Generator
 * Generates HCP profiles with realistic behavioral DNA
 */

import { getRng } from "../rng";
import {
  SPECIALTY_WEIGHTS,
  TIER_BY_SPECIALTY,
  SEGMENT_BY_TIER,
  CHANNEL_BY_SEGMENT,
  FIRST_NAMES,
  LAST_NAMES,
  CHANNEL_RESPONSE_RATES,
} from "../config";
import type { InsertHCPProfile, ChannelEngagement, PrescribingTrend, Channel } from "@shared/schema";
import { channels } from "@shared/schema";
import organizations from "../seed-data/organizations.json";
import cities from "../seed-data/cities.json";

interface GeneratedHCP extends InsertHCPProfile {
  // Additional fields populated during generation
}

/**
 * Generate a single HCP profile
 */
export function generateHCP(): GeneratedHCP {
  const rng = getRng();

  // Determine specialty
  const specialty = rng.weightedPick(SPECIALTY_WEIGHTS);

  // Determine tier based on specialty
  const tier = rng.weightedPick(TIER_BY_SPECIALTY[specialty]);

  // Determine segment based on tier
  const segment = rng.weightedPick(SEGMENT_BY_TIER[tier]);

  // Determine channel preference based on segment
  const channelPreference = rng.weightedPick(CHANNEL_BY_SEGMENT[segment]);

  // Generate location
  const cityData = rng.weightedPick(
    cities.cities.map((c) => ({ item: c, weight: c.weight }))
  );

  // Generate organization name
  const organization = generateOrganizationName(rng, cityData.city);

  // Generate name
  const firstName = rng.pick(FIRST_NAMES);
  const lastName = rng.pick(LAST_NAMES);

  // Generate NPI
  const npi = rng.npi();

  // Generate engagement metrics based on tier and segment
  const { overallEngagementScore, channelEngagements } = generateEngagementMetrics(
    rng,
    tier,
    segment,
    channelPreference
  );

  // Generate prescribing data based on tier
  const { monthlyRxVolume, yearlyRxVolume, marketSharePct, prescribingTrend } =
    generatePrescribingData(rng, tier, specialty);

  // Generate prediction scores
  const { conversionLikelihood, churnRisk } = generatePredictionScores(
    rng,
    tier,
    segment,
    overallEngagementScore
  );

  return {
    npi,
    firstName,
    lastName,
    specialty,
    tier,
    segment,
    organization,
    city: cityData.city,
    state: cityData.state,
    overallEngagementScore,
    channelPreference,
    channelEngagements,
    monthlyRxVolume,
    yearlyRxVolume,
    marketSharePct,
    prescribingTrend,
    conversionLikelihood,
    churnRisk,
  };
}

/**
 * Generate a batch of HCP profiles
 */
export function generateHCPBatch(count: number): GeneratedHCP[] {
  const hcps: GeneratedHCP[] = [];
  const usedNpis = new Set<string>();

  while (hcps.length < count) {
    const hcp = generateHCP();

    // Ensure unique NPI
    if (!usedNpis.has(hcp.npi)) {
      usedNpis.add(hcp.npi);
      hcps.push(hcp);
    }
  }

  return hcps;
}

/**
 * Generate organization name
 */
function generateOrganizationName(rng: ReturnType<typeof getRng>, city: string): string {
  const type = rng.int(0, 2);

  if (type === 0) {
    // Use a hospital name
    return rng.pick(organizations.hospitals);
  } else if (type === 1) {
    // Use a clinic name
    return rng.pick(organizations.clinics);
  } else {
    // Generate a composite name
    const prefix = rng.boolean(0.5) ? rng.pick(organizations.prefixes) + " " : city + " ";
    const suffix = rng.pick(organizations.suffixes);
    return `${prefix}${suffix}`;
  }
}

/**
 * Generate engagement metrics
 */
function generateEngagementMetrics(
  rng: ReturnType<typeof getRng>,
  tier: string,
  segment: string,
  preferredChannel: Channel
): {
  overallEngagementScore: number;
  channelEngagements: ChannelEngagement[];
} {
  // Base engagement score by tier
  const baseScoreByTier: Record<string, { mean: number; stdDev: number }> = {
    "Tier 1": { mean: 70, stdDev: 15 },
    "Tier 2": { mean: 50, stdDev: 18 },
    "Tier 3": { mean: 30, stdDev: 20 },
  };

  // Segment modifiers
  const segmentModifier: Record<string, number> = {
    "High Prescriber": 10,
    "Engaged Digital": 15,
    "Academic Leader": 5,
    "Growth Potential": 0,
    "Traditional Preference": -5,
    "New Target": -10,
  };

  const { mean, stdDev } = baseScoreByTier[tier] || { mean: 50, stdDev: 20 };
  const modifier = segmentModifier[segment] || 0;

  const overallEngagementScore = Math.max(
    0,
    Math.min(100, Math.round(rng.normal(mean + modifier, stdDev)))
  );

  // Generate channel-specific engagements
  const channelEngagements: ChannelEngagement[] = channels.map((channel) => {
    const isPreferred = channel === preferredChannel;
    const baseResponseRate = CHANNEL_RESPONSE_RATES[channel] * 100;

    // Boost preferred channel
    const responseRateModifier = isPreferred ? 1.5 : rng.float(0.5, 1.2);
    const responseRate = Math.min(
      100,
      Math.max(0, baseResponseRate * responseRateModifier * (1 + (overallEngagementScore - 50) / 100))
    );

    // Channel score correlates with overall engagement
    const channelScore = Math.max(
      0,
      Math.min(
        100,
        Math.round(
          overallEngagementScore * rng.float(0.7, 1.3) + (isPreferred ? 15 : 0)
        )
      )
    );

    // Total touches based on tier and channel preference
    const baseTouches = tier === "Tier 1" ? 20 : tier === "Tier 2" ? 12 : 6;
    const totalTouches = rng.int(
      Math.floor(baseTouches * 0.5),
      Math.floor(baseTouches * (isPreferred ? 2 : 1))
    );

    // Last contact (within last 90 days, or null if no touches)
    const lastContact =
      totalTouches > 0
        ? new Date(
            Date.now() - rng.int(1, 90) * 24 * 60 * 60 * 1000
          ).toISOString()
        : null;

    return {
      channel,
      score: channelScore,
      lastContact,
      totalTouches,
      responseRate: Math.round(responseRate * 10) / 10,
    };
  });

  return { overallEngagementScore, channelEngagements };
}

/**
 * Generate prescribing data
 */
function generatePrescribingData(
  rng: ReturnType<typeof getRng>,
  tier: string,
  _specialty: string
): {
  monthlyRxVolume: number;
  yearlyRxVolume: number;
  marketSharePct: number;
  prescribingTrend: PrescribingTrend[];
} {
  // Base volumes by tier
  const baseVolumeByTier: Record<string, { mean: number; stdDev: number }> = {
    "Tier 1": { mean: 150, stdDev: 50 },
    "Tier 2": { mean: 80, stdDev: 30 },
    "Tier 3": { mean: 30, stdDev: 15 },
  };

  const { mean, stdDev } = baseVolumeByTier[tier] || { mean: 50, stdDev: 25 };
  const monthlyRxVolume = Math.max(1, Math.round(rng.normal(mean, stdDev)));
  const yearlyRxVolume = monthlyRxVolume * 12 + rng.int(-monthlyRxVolume, monthlyRxVolume);

  // Market share correlates with tier
  const baseMarketShare = tier === "Tier 1" ? 35 : tier === "Tier 2" ? 20 : 10;
  const marketSharePct = Math.max(
    1,
    Math.min(80, rng.normal(baseMarketShare, 10))
  );

  // Generate 12-month trend
  const prescribingTrend: PrescribingTrend[] = [];
  let currentRx = monthlyRxVolume;
  const trendDirection = rng.float(-0.05, 0.08); // Monthly trend

  for (let i = 11; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const month = date.toISOString().slice(0, 7);

    // Add some variance
    const variance = rng.float(0.85, 1.15);
    const rxCount = Math.max(1, Math.round(currentRx * variance));

    prescribingTrend.push({
      month,
      rxCount,
      marketShare: Math.round((marketSharePct + rng.float(-3, 3)) * 10) / 10,
    });

    // Apply trend for next month
    currentRx = currentRx * (1 + trendDirection + rng.float(-0.02, 0.02));
  }

  return { monthlyRxVolume, yearlyRxVolume, marketSharePct, prescribingTrend };
}

/**
 * Generate prediction scores
 */
function generatePredictionScores(
  rng: ReturnType<typeof getRng>,
  tier: string,
  segment: string,
  engagementScore: number
): {
  conversionLikelihood: number;
  churnRisk: number;
} {
  // Conversion likelihood correlates with engagement and segment
  const baseConversion =
    segment === "High Prescriber"
      ? 60
      : segment === "Growth Potential"
      ? 50
      : segment === "Engaged Digital"
      ? 55
      : segment === "Academic Leader"
      ? 45
      : segment === "Traditional Preference"
      ? 40
      : 35;

  const conversionLikelihood = Math.max(
    5,
    Math.min(
      95,
      Math.round(
        baseConversion + (engagementScore - 50) * 0.5 + rng.normal(0, 10)
      )
    )
  );

  // Churn risk inversely correlates with engagement
  const baseChurnByTier: Record<string, number> = {
    "Tier 1": 15,
    "Tier 2": 25,
    "Tier 3": 40,
  };

  const churnRisk = Math.max(
    5,
    Math.min(
      90,
      Math.round(
        (baseChurnByTier[tier] || 30) - (engagementScore - 50) * 0.3 + rng.normal(0, 10)
      )
    )
  );

  return { conversionLikelihood, churnRisk };
}

export type { GeneratedHCP };
