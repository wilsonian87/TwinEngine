/**
 * Rx Generator
 * Generates monthly prescribing history records
 * Target: ~24,000 records (2,000 HCPs x 12 months)
 */

import { getRng } from "../rng";
import { PRODUCTS } from "../config";
import type { InsertPrescribingHistory } from "@shared/schema";

interface HCPPrescribingProfile {
  hcpId: string;
  specialty: string;
  tier: string;
  segment: string;
  monthlyRxVolume: number;
  marketSharePct: number;
}

interface OutcomeSummary {
  hcpId: string;
  month: string;
  rxWrittenCount: number;
}

/**
 * Generate prescribing history for all HCPs
 */
export function generatePrescribingHistory(
  hcps: HCPPrescribingProfile[],
  outcomes: OutcomeSummary[],
  startDate: Date,
  months: number
): InsertPrescribingHistory[] {
  const rng = getRng();
  const records: InsertPrescribingHistory[] = [];

  // Create outcome lookup by HCP and month
  const outcomeLookup = new Map<string, number>();
  for (const outcome of outcomes) {
    const key = `${outcome.hcpId}-${outcome.month}`;
    outcomeLookup.set(key, (outcomeLookup.get(key) || 0) + outcome.rxWrittenCount);
  }

  for (const hcp of hcps) {
    const hcpRecords = generateHCPPrescribingHistory(
      rng,
      hcp,
      outcomeLookup,
      startDate,
      months
    );
    records.push(...hcpRecords);
  }

  return records;
}

/**
 * Generate prescribing history for a single HCP
 */
function generateHCPPrescribingHistory(
  rng: ReturnType<typeof getRng>,
  hcp: HCPPrescribingProfile,
  outcomeLookup: Map<string, number>,
  startDate: Date,
  months: number
): InsertPrescribingHistory[] {
  const records: InsertPrescribingHistory[] = [];

  // Get relevant products for this specialty
  const relevantProducts = PRODUCTS.filter(
    (p) => p.therapeuticArea === hcp.specialty
  );
  const product =
    relevantProducts.length > 0 ? relevantProducts[0] : PRODUCTS[0];

  // Determine base prescribing parameters
  const baseTotalRx = hcp.monthlyRxVolume;
  const baseMarketShare = hcp.marketSharePct;

  // Trend parameters (slight growth or decline over time)
  const trendDirection = rng.float(-0.02, 0.04); // -2% to +4% monthly trend

  // Generate each month
  let previousTotalRx = baseTotalRx;
  let previousMarketShare = baseMarketShare;

  for (let i = 0; i < months; i++) {
    const monthDate = new Date(startDate);
    monthDate.setMonth(monthDate.getMonth() + i);
    const month = monthDate.toISOString().slice(0, 7);

    // Check for outcome-driven Rx
    const outcomeKey = `${hcp.hcpId}-${month}`;
    const outcomeRx = outcomeLookup.get(outcomeKey) || 0;

    // Calculate this month's prescribing
    const { totalRx, newRx, refillRx, marketShare, competitorShare, productBreakdown } =
      calculateMonthlyPrescribing(
        rng,
        hcp,
        previousTotalRx,
        previousMarketShare,
        trendDirection,
        outcomeRx,
        product.name
      );

    // Calculate MoM change
    const momChange =
      previousTotalRx > 0
        ? Math.round(((totalRx - previousTotalRx) / previousTotalRx) * 100 * 10) / 10
        : null;

    // Calculate YoY change (if we have enough history)
    let yoyChange: number | null = null;
    if (i >= 12) {
      const yearAgoRecord = records[records.length - 12];
      const yearAgoRx = yearAgoRecord?.totalRx ?? 0;
      if (yearAgoRecord && yearAgoRx > 0) {
        yoyChange =
          Math.round(
            ((totalRx - yearAgoRx) / yearAgoRx) * 100 * 10
          ) / 10;
      }
    }

    records.push({
      hcpId: hcp.hcpId,
      month,
      totalRx,
      newRx,
      refillRx,
      marketShare,
      competitorShare,
      productBreakdown,
      momChange,
      yoyChange,
    });

    // Update for next iteration
    previousTotalRx = totalRx;
    previousMarketShare = marketShare;
  }

  return records;
}

/**
 * Calculate monthly prescribing metrics
 */
function calculateMonthlyPrescribing(
  rng: ReturnType<typeof getRng>,
  hcp: HCPPrescribingProfile,
  previousTotalRx: number,
  previousMarketShare: number,
  trendDirection: number,
  outcomeRxBoost: number,
  productName: string
): {
  totalRx: number;
  newRx: number;
  refillRx: number;
  marketShare: number;
  competitorShare: number;
  productBreakdown: Record<string, number>;
} {
  // Apply trend and random variance
  const variance = rng.float(0.85, 1.15);
  const trendMultiplier = 1 + trendDirection;

  let totalRx = Math.round(previousTotalRx * trendMultiplier * variance);

  // Add outcome-driven Rx (with multiplier for realistic impact)
  totalRx += outcomeRxBoost * rng.int(1, 3);

  // Ensure minimum
  totalRx = Math.max(1, totalRx);

  // Split into new vs refill (typically 20-40% new)
  const newRxRatio = rng.float(0.2, 0.4);
  const newRx = Math.round(totalRx * newRxRatio);
  const refillRx = totalRx - newRx;

  // Market share with variance
  let marketShare = previousMarketShare * (1 + trendDirection * 0.5 + rng.float(-0.03, 0.03));
  marketShare = Math.max(1, Math.min(80, marketShare));

  // Competitor share is inverse-ish
  const competitorShare = Math.max(5, Math.min(60, 100 - marketShare - rng.float(20, 40)));

  // Product breakdown
  const productBreakdown: Record<string, number> = {
    [productName]: Math.round(totalRx * (marketShare / 100)),
  };

  // Add competitor products
  const competitorRx = totalRx - productBreakdown[productName];
  productBreakdown["Competitor A"] = Math.round(competitorRx * 0.4);
  productBreakdown["Competitor B"] = Math.round(competitorRx * 0.35);
  productBreakdown["Other"] = competitorRx - productBreakdown["Competitor A"] - productBreakdown["Competitor B"];

  return {
    totalRx,
    newRx,
    refillRx,
    marketShare: Math.round(marketShare * 10) / 10,
    competitorShare: Math.round(competitorShare * 10) / 10,
    productBreakdown,
  };
}

/**
 * Aggregate outcomes by HCP and month for Rx correlation
 */
export function aggregateOutcomesForRx(
  outcomes: { hcpId: string; eventDate: Date; outcomeType: string }[]
): OutcomeSummary[] {
  const aggregated = new Map<string, OutcomeSummary>();

  for (const outcome of outcomes) {
    if (outcome.outcomeType !== "rx_written") {
      continue;
    }

    const month = outcome.eventDate.toISOString().slice(0, 7);
    const key = `${outcome.hcpId}-${month}`;

    const existing = aggregated.get(key);
    if (existing) {
      existing.rxWrittenCount++;
    } else {
      aggregated.set(key, {
        hcpId: outcome.hcpId,
        month,
        rxWrittenCount: 1,
      });
    }
  }

  return Array.from(aggregated.values());
}

export type { HCPPrescribingProfile, OutcomeSummary };
